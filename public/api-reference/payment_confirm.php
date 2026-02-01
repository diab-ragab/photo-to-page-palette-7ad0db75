<?php
/**
 * payment_confirm.php - Confirm Stripe Payment and fulfill order
 * 
 * POST /api/payment_confirm.php
 * Body: { paymentIntentId: string, sessionId?: string, orderId?: number }
 * Returns: { success: true, status: string }
 * 
 * Item ID rules for fulfillment:
 *   item_id > 0  => real game item
 *   item_id = -1 => Zen (currency)
 *   item_id = -2 => Coins (currency)
 *   item_id = -3 => EXP (experience)
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/mail_delivery.php';
handleCors(array('POST', 'OPTIONS'));

$RID = bin2hex(random_bytes(6));
$cfg = getConfig();

function json_response($data) {
    global $RID;
    while (ob_get_level()) { ob_end_clean(); }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array_merge($data, array('rid' => $RID)), JSON_UNESCAPED_UNICODE);
    exit;
}

function json_fail($code, $msg) {
    global $RID;
    error_log("RID={$RID} PAYMENT_CONFIRM RESP={$code} MSG={$msg}");
    while (ob_get_level()) { ob_end_clean(); }
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('success' => false, 'message' => $msg, 'rid' => $RID), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_fail(405, 'Method not allowed');
}

// Get database connection
$pdo = getDB();

// Rate limiting check
$clientIP = isset($_SERVER['HTTP_X_FORWARDED_FOR']) 
    ? explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0] 
    : (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown');
$clientIP = trim($clientIP);

$stmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM payment_rate_limit WHERE ip_address = ? AND endpoint = 'confirm' AND request_time > DATE_SUB(NOW(), INTERVAL 1 MINUTE)");
$stmt->execute(array($clientIP));
$rateCheck = $stmt->fetch(PDO::FETCH_ASSOC);

if ($rateCheck && (int)$rateCheck['cnt'] >= 20) {
    json_fail(429, 'Too many requests. Please wait a moment.');
}

// Log this request for rate limiting
$stmt = $pdo->prepare("INSERT INTO payment_rate_limit (ip_address, endpoint, request_time) VALUES (?, 'confirm', NOW())");
$stmt->execute(array($clientIP));

// Parse request body
$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true);

if (!$body) {
    json_fail(400, 'Invalid JSON body');
}

$paymentIntentId = isset($body['paymentIntentId']) ? trim($body['paymentIntentId']) : '';
$sessionId = isset($body['sessionId']) ? trim($body['sessionId']) : '';
$orderId = isset($body['orderId']) ? (int)$body['orderId'] : 0;

// Get Stripe secret key from config
$stripeSecretKey = isset($cfg['stripe']['secret_key']) ? $cfg['stripe']['secret_key'] : '';

if (empty($stripeSecretKey)) {
    error_log("RID={$RID} STRIPE_SECRET_KEY not configured");
    json_fail(500, 'Payment system not configured');
}

// If we have a sessionId (from Stripe Checkout), retrieve the session to get payment_intent
if (!empty($sessionId) && strpos($sessionId, 'cs_') === 0) {
    $sessionUrl = 'https://api.stripe.com/v1/checkout/sessions/' . urlencode($sessionId);
    
    $opts = array(
        'http' => array(
            'method' => 'GET',
            'header' => 'Authorization: Bearer ' . $stripeSecretKey,
            'timeout' => 30,
            'ignore_errors' => true,
        ),
        'ssl' => array(
            'verify_peer' => true,
            'verify_peer_name' => true,
        ),
    );
    $context = stream_context_create($opts);
    $sessionResp = @file_get_contents($sessionUrl, false, $context);
    
    if ($sessionResp) {
        $sessionData = json_decode($sessionResp, true);
        if (isset($sessionData['payment_intent'])) {
            $paymentIntentId = $sessionData['payment_intent'];
            error_log("RID={$RID} SESSION_TO_PI session={$sessionId} pi={$paymentIntentId}");
        }
        // Try to find order(s) by session_id in webshop_orders
        if ($orderId <= 0) {
            $stmt = $pdo->prepare("SELECT id FROM webshop_orders WHERE stripe_session_id = ? AND status = 'pending' ORDER BY id ASC LIMIT 1");
            $stmt->execute(array($sessionId));
            $webshopOrder = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($webshopOrder) {
                $orderId = (int)$webshopOrder['id'];
                error_log("RID={$RID} FOUND_ORDER_BY_SESSION session={$sessionId} order={$orderId}");
            }
        }
    }
}

if (empty($paymentIntentId)) {
    json_fail(400, 'Payment intent ID required');
}

// Validate payment intent ID format
if (strpos($paymentIntentId, 'pi_') !== 0) {
    json_fail(400, 'Invalid payment intent ID format');
}

// Retrieve PaymentIntent from Stripe
$stripeUrl = 'https://api.stripe.com/v1/payment_intents/' . urlencode($paymentIntentId);

$opts = array(
    'http' => array(
        'method' => 'GET',
        'header' => 'Authorization: Bearer ' . $stripeSecretKey,
        'timeout' => 30,
        'ignore_errors' => true,
    ),
    'ssl' => array(
        'verify_peer' => true,
        'verify_peer_name' => true,
    ),
);
$context = stream_context_create($opts);
$response = @file_get_contents($stripeUrl, false, $context);

// Parse HTTP response code from headers
$httpCode = 0;
if (isset($http_response_header) && is_array($http_response_header) && count($http_response_header) > 0) {
    if (preg_match('/HTTP\/\d+\.?\d*\s+(\d+)/', $http_response_header[0], $m)) {
        $httpCode = (int)$m[1];
    }
}

if ($response === false) {
    error_log("RID={$RID} STRIPE_REQUEST_FAILED");
    json_fail(502, 'Payment service unavailable');
}

$paymentIntent = json_decode($response, true);

if ($httpCode >= 400 || !$paymentIntent) {
    $errorMsg = isset($paymentIntent['error']['message']) ? $paymentIntent['error']['message'] : 'Failed to verify payment';
    error_log("RID={$RID} STRIPE_RETRIEVE_ERROR: {$errorMsg} HTTP={$httpCode}");
    json_fail(400, $errorMsg);
}

$status = isset($paymentIntent['status']) ? $paymentIntent['status'] : '';
$amount = isset($paymentIntent['amount']) ? (int)$paymentIntent['amount'] : 0;
$currency = isset($paymentIntent['currency']) ? strtoupper($paymentIntent['currency']) : 'EUR';
$metadata = isset($paymentIntent['metadata']) ? $paymentIntent['metadata'] : array();

error_log("RID={$RID} PAYMENT_INTENT_STATUS pi={$paymentIntentId} status={$status} amount={$amount}");

// Check if payment succeeded
if ($status !== 'succeeded') {
    json_response(array(
        'success' => false,
        'status' => $status,
        'message' => 'Payment not completed. Status: ' . $status,
    ));
}

// Get order ID from metadata if not provided
if ($orderId <= 0 && isset($metadata['order_id'])) {
    $orderId = (int)$metadata['order_id'];
}

// Get user ID from metadata
$userId = isset($metadata['user_id']) ? (int)$metadata['user_id'] : 0;

// Try to find all orders by session_id if no specific order found
$ordersToProcess = array();

if ($orderId > 0) {
    $ordersToProcess[] = $orderId;
} else if (!empty($sessionId)) {
    // Find all pending orders for this session
    $stmt = $pdo->prepare("SELECT id FROM webshop_orders WHERE stripe_session_id = ? AND status = 'pending'");
    $stmt->execute(array($sessionId));
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $ordersToProcess[] = (int)$row['id'];
    }
}

if (count($ordersToProcess) > 0) {
    foreach ($ordersToProcess as $oid) {
        // Get order details
        $stmt = $pdo->prepare("SELECT id, status, user_id, product_id, quantity FROM webshop_orders WHERE id = ? LIMIT 1");
        $stmt->execute(array($oid));
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) continue;
        
        if ($order['status'] === 'completed') {
            // Already processed
            continue;
        }
        
        // Mark order as completed
        $stmt = $pdo->prepare("
            UPDATE webshop_orders 
            SET status = 'completed', 
                stripe_payment_intent = ?,
                delivered_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute(array($paymentIntentId, $oid));
        
        // Get user ID from order if not in metadata
        if ($userId <= 0 && isset($order['user_id'])) {
            $userId = (int)$order['user_id'];
        }
        
        // Fulfill order - grant digital items
        $productId = isset($order['product_id']) ? (int)$order['product_id'] : 0;
        $quantity = isset($order['quantity']) ? (int)$order['quantity'] : 1;
        
        if ($productId > 0 && $userId > 0) {
            fulfillOrder($pdo, $userId, $productId, $quantity, $oid, $RID);
        }
        
        error_log("RID={$RID} ORDER_COMPLETED order={$oid} user={$userId} product={$productId}");
        $orderId = $oid; // Keep last processed order ID for response
    }
} else {
    // No orders found - create a fallback order record
    $totalReal = $amount / 100; // Convert cents to currency
    
    $stmt = $pdo->prepare("
        INSERT INTO webshop_orders 
        (user_id, product_id, quantity, total_real, status, stripe_session_id, stripe_payment_intent, delivered_at, created_at)
        VALUES (?, 0, 1, ?, 'completed', ?, ?, NOW(), NOW())
    ");
    $stmt->execute(array($userId, $totalReal, $sessionId, $paymentIntentId));
    $orderId = $pdo->lastInsertId();
    
    error_log("RID={$RID} FALLBACK_ORDER_CREATED order={$orderId} amount={$totalReal} pi={$paymentIntentId}");
}

json_response(array(
    'success' => true,
    'status' => 'succeeded',
    'message' => 'Payment confirmed and order fulfilled',
    'order_id' => $orderId,
));

// ============ FULFILLMENT FUNCTIONS ============

/**
 * Fulfill order based on item_id rules:
 *   item_id > 0  => real game item (send via mail with itemId)
 *   item_id = -1 => Zen (send via zen field, no item)
 *   item_id = -2 => Coins (send via coins field, no item)
 *   item_id = -3 => EXP (send via exp field, no item)
 */
function fulfillOrder($pdo, $userId, $productId, $quantity, $orderId, $RID) {
    // Get product details
    $stmt = $pdo->prepare("SELECT * FROM webshop_products WHERE id = ? LIMIT 1");
    $stmt->execute(array($productId));
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product) {
        error_log("RID={$RID} FULFILL_ERROR product_not_found id={$productId}");
        return false;
    }
    
    $productName = isset($product['name']) ? $product['name'] : 'Shop Item';
    $itemId = isset($product['item_id']) ? (int)$product['item_id'] : 0;
    $itemQuantity = isset($product['item_quantity']) ? (int)$product['item_quantity'] : 1;
    $totalGrant = $itemQuantity * $quantity;
    
    // Get user's character role ID
    $roleId = getUserRoleId($pdo, $userId);
    
    if ($roleId <= 0) {
        error_log("RID={$RID} FULFILL_ERROR no_character user={$userId}");
        storePendingDelivery($pdo, $orderId, $userId, $itemId, $totalGrant, $RID);
        return false;
    }
    
    // Create mailer instance
    $mailer = new GameMailer($pdo);
    
    // Determine reward type based on item_id rules
    $coins = 0;
    $zen = 0;
    $exp = 0;
    $mailItemId = 0;
    $mailQty = 0;
    
    if ($itemId > 0) {
        // Real game item
        $mailItemId = $itemId;
        $mailQty = $totalGrant;
        error_log("RID={$RID} FULFILL_ITEM user={$userId} itemId={$itemId} qty={$totalGrant}");
    } else if ($itemId == -1) {
        // Zen currency
        $zen = $totalGrant;
        error_log("RID={$RID} FULFILL_ZEN user={$userId} amount={$totalGrant}");
    } else if ($itemId == -2) {
        // Coins currency
        $coins = $totalGrant;
        error_log("RID={$RID} FULFILL_COINS user={$userId} amount={$totalGrant}");
    } else if ($itemId == -3) {
        // EXP
        $exp = $totalGrant;
        error_log("RID={$RID} FULFILL_EXP user={$userId} amount={$totalGrant}");
    } else {
        // item_id = 0 or unknown - no delivery
        error_log("RID={$RID} FULFILL_SKIP user={$userId} item_id={$itemId} (no action)");
        return true;
    }
    
    // Send via in-game mail
    $result = $mailer->sendOrderReward($roleId, $productName, $mailItemId, $mailQty, $coins, $zen, $exp);
    
    if ($result['success']) {
        error_log("RID={$RID} MAIL_SENT user={$userId} role={$roleId} product={$productName} mail_id={$result['insert_id']}");
    } else {
        error_log("RID={$RID} MAIL_FAILED user={$userId} role={$roleId} error={$result['message']}");
        storePendingDelivery($pdo, $orderId, $userId, $itemId, $totalGrant, $RID);
    }
    
    return $result['success'];
}

function storePendingDelivery($pdo, $orderId, $userId, $itemId, $quantity, $RID) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS pending_deliveries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        user_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity INT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at DATETIME,
        delivered_at DATETIME,
        KEY idx_user (user_id),
        KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
    $stmt = $pdo->prepare("INSERT INTO pending_deliveries (order_id, user_id, item_id, quantity, status, created_at) VALUES (?, ?, ?, ?, 'pending', NOW())");
    $stmt->execute(array($orderId, $userId, $itemId, $quantity));
    error_log("RID={$RID} PENDING_DELIVERY_CREATED user={$userId} item={$itemId} qty={$quantity}");
}
