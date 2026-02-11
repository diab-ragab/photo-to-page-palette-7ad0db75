<?php
/**
 * payment_confirm.php - Confirm Stripe Payment and fulfill order
 * 
 * POST /api/payment_confirm.php
 * Body: { paymentIntentId: string, sessionId?: string, orderId?: number }
 * Returns: { success: true, status: string }
 * 
 * Handles both webshop orders and bundle orders.
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

$pdo = getDB();

// Parse request body (use cached input from bootstrap)
$body = getJsonInput();
$rawBody = isset($GLOBALS['__rawInput']) ? $GLOBALS['__rawInput'] : '';

error_log("RID={$RID} PAYMENT_CONFIRM_START body=" . substr($rawBody, 0, 200));

if (empty($body)) {
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

// Get session metadata to determine order type
$orderType = 'product'; // Default
$metadata = array();

// If we have a sessionId (from Stripe Checkout), retrieve the session
if (!empty($sessionId) && strpos($sessionId, 'cs_') === 0) {
    error_log("RID={$RID} FETCHING_SESSION session={$sessionId}");
    
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
        if (isset($sessionData['metadata'])) {
            $metadata = $sessionData['metadata'];
            if (isset($metadata['type']) && $metadata['type'] === 'bundle') {
                $orderType = 'bundle';
            }
        }
        if (isset($sessionData['payment_status'])) {
            error_log("RID={$RID} SESSION_PAYMENT_STATUS status={$sessionData['payment_status']}");
        }
    }
}

if (empty($paymentIntentId)) {
    if (!empty($sessionId)) {
        error_log("RID={$RID} NO_PI_BUT_HAS_SESSION - checking orders directly");
    } else {
        json_fail(400, 'Payment intent ID required');
    }
}

// Validate payment intent ID format if we have one
if (!empty($paymentIntentId) && strpos($paymentIntentId, 'pi_') !== 0) {
    json_fail(400, 'Invalid payment intent ID format');
}

// Verify payment with Stripe
$status = 'succeeded';
if (!empty($paymentIntentId)) {
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
    if (isset($paymentIntent['metadata'])) {
        $metadata = array_merge($metadata, $paymentIntent['metadata']);
        if (isset($metadata['type']) && $metadata['type'] === 'bundle') {
            $orderType = 'bundle';
        }
    }
    
    error_log("RID={$RID} PAYMENT_INTENT_STATUS pi={$paymentIntentId} status={$status} type={$orderType}");
    
    if ($status !== 'succeeded') {
        json_response(array(
            'success' => false,
            'status' => $status,
            'message' => 'Payment not completed. Status: ' . $status,
        ));
    }
}

$userId = 0;
$processedCount = 0;

// ============ PROCESS BUNDLE ORDERS ============
if ($orderType === 'bundle') {
    error_log("RID={$RID} PROCESSING_BUNDLE_ORDER session={$sessionId}");
    
    // Find pending bundle orders for this session
    $stmt = $pdo->prepare("
        SELECT id, user_id, bundle_id, character_id, character_name, status 
        FROM bundle_orders 
        WHERE stripe_session_id = ? AND status = 'pending'
    ");
    $stmt->execute(array($sessionId));
    $bundleOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Check if already processed
    $stmt = $pdo->prepare("SELECT id FROM bundle_orders WHERE stripe_payment_intent = ? AND status = 'completed' LIMIT 1");
    $stmt->execute(array($paymentIntentId));
    $existingCompleted = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingCompleted) {
        error_log("RID={$RID} BUNDLE_ALREADY_PROCESSED pi={$paymentIntentId}");
        json_response(array(
            'success' => true,
            'status' => 'succeeded',
            'message' => 'Bundle order already confirmed',
            'order_id' => (int)$existingCompleted['id'],
        ));
    }
    
    foreach ($bundleOrders as $bundleOrder) {
        $boId = (int)$bundleOrder['id'];
        $bundleId = (int)$bundleOrder['bundle_id'];
        $characterId = (int)$bundleOrder['character_id'];
        $characterName = isset($bundleOrder['character_name']) ? $bundleOrder['character_name'] : '';
        $userId = (int)$bundleOrder['user_id'];
        
        // Mark order as completed
        $stmt = $pdo->prepare("
            UPDATE bundle_orders 
            SET status = 'completed', 
                stripe_payment_intent = ?,
                delivered_at = NOW()
            WHERE id = ? AND status = 'pending'
        ");
        $stmt->execute(array($paymentIntentId, $boId));
        
        if ($stmt->rowCount() > 0) {
            // Fulfill bundle items
            fulfillBundleOrder($pdo, $userId, $bundleId, $characterId, $characterName, $boId, $RID);
            $orderId = $boId;
            $processedCount++;
            error_log("RID={$RID} BUNDLE_ORDER_COMPLETED order={$boId} user={$userId} bundle={$bundleId}");
        }
    }
} else {
    // ============ PROCESS WEBSHOP ORDERS ============
    $ordersToProcess = array();
    
    if ($orderId > 0) {
        $ordersToProcess[] = $orderId;
    } else if (!empty($sessionId)) {
        $stmt = $pdo->prepare("SELECT id FROM webshop_orders WHERE stripe_session_id = ? AND status = 'pending'");
        $stmt->execute(array($sessionId));
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $ordersToProcess[] = (int)$row['id'];
        }
    }
    
    // Check for already processed
    if (!empty($paymentIntentId)) {
        $stmt = $pdo->prepare("SELECT id FROM webshop_orders WHERE stripe_payment_intent = ? AND status = 'completed' LIMIT 1");
        $stmt->execute(array($paymentIntentId));
        $existingCompleted = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingCompleted) {
            error_log("RID={$RID} WEBSHOP_ALREADY_PROCESSED pi={$paymentIntentId}");
            json_response(array(
                'success' => true,
                'status' => 'succeeded',
                'message' => 'Order already confirmed',
                'order_id' => (int)$existingCompleted['id'],
            ));
        }
    }
    
    foreach ($ordersToProcess as $oid) {
        $stmt = $pdo->prepare("SELECT id, status, user_id, product_id, quantity, character_id, character_name FROM webshop_orders WHERE id = ? LIMIT 1");
        $stmt->execute(array($oid));
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order || $order['status'] === 'completed') {
            continue;
        }
        
        // Mark order as completed
        $stmt = $pdo->prepare("
            UPDATE webshop_orders 
            SET status = 'completed', 
                stripe_payment_intent = ?,
                delivered_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute(array($paymentIntentId, $oid));
        
        $userId = (int)$order['user_id'];
        $productId = (int)$order['product_id'];
        $quantity = (int)$order['quantity'];
        $characterId = isset($order['character_id']) ? (int)$order['character_id'] : 0;
        $characterName = isset($order['character_name']) ? $order['character_name'] : '';
        
        if ($productId > 0 && $characterId > 0) {
            fulfillWebshopOrder($pdo, $userId, $productId, $quantity, $oid, $characterId, $characterName, $RID);
        }
        
        error_log("RID={$RID} WEBSHOP_ORDER_COMPLETED order={$oid} user={$userId} product={$productId}");
        $orderId = $oid;
        $processedCount++;
    }
}

json_response(array(
    'success' => true,
    'status' => 'succeeded',
    'message' => 'Payment confirmed',
    'order_id' => $orderId,
    'processed_count' => $processedCount,
    'order_type' => $orderType,
));

// ============ FULFILLMENT FUNCTIONS ============

/**
 * Fulfill webshop order - single product
 */
function fulfillWebshopOrder($pdo, $userId, $productId, $quantity, $orderId, $characterId, $characterName, $RID) {
    error_log("RID={$RID} FULFILL_WEBSHOP_START user={$userId} product={$productId} qty={$quantity} order={$orderId} char={$characterId}");
    
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
    
    // Use character_id from order (already validated)
    $roleId = $characterId;
    
    if ($roleId <= 0) {
        error_log("RID={$RID} FULFILL_ERROR no_character order={$orderId} user={$userId}");
        storePendingDelivery($pdo, $orderId, $userId, $itemId, $totalGrant, $RID);
        return false;
    }
    
    // Send reward via GameMailer
    return sendRewardMail($pdo, $roleId, $productName, $itemId, $totalGrant, $orderId, $userId, $RID);
}

/**
 * Fulfill bundle order - multiple items in bundle
 */
function fulfillBundleOrder($pdo, $userId, $bundleId, $characterId, $characterName, $orderId, $RID) {
    error_log("RID={$RID} FULFILL_BUNDLE_START user={$userId} bundle={$bundleId} order={$orderId} char={$characterId}");
    
    // Get bundle details
    $stmt = $pdo->prepare("SELECT * FROM flash_bundles WHERE id = ? LIMIT 1");
    $stmt->execute(array($bundleId));
    $bundle = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$bundle) {
        error_log("RID={$RID} FULFILL_BUNDLE_ERROR bundle_not_found id={$bundleId}");
        return false;
    }
    
    $bundleName = isset($bundle['name']) ? $bundle['name'] : 'Flash Sale Bundle';
    $roleId = $characterId;
    
    if ($roleId <= 0) {
        error_log("RID={$RID} FULFILL_BUNDLE_ERROR no_character order={$orderId} user={$userId}");
        storePendingBundleDelivery($pdo, $orderId, $userId, $bundleId, $RID);
        return false;
    }
    
    // Get bundle items
    $stmt = $pdo->prepare("SELECT * FROM flash_bundle_items WHERE bundle_id = ? ORDER BY sort_order ASC");
    $stmt->execute(array($bundleId));
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($items) === 0) {
        error_log("RID={$RID} FULFILL_BUNDLE_ERROR no_items bundle={$bundleId}");
        return false;
    }
    
    // Send bundle via in-game mail (all items as single mail)
    $mailer = new GameMailer($pdo);
    $result = $mailer->sendBundleReward($roleId, $bundleName, $items);
    
    if ($result['success']) {
        error_log("RID={$RID} BUNDLE_MAIL_SENT user={$userId} role={$roleId} bundle={$bundleName} mail_id={$result['insert_id']}");
        return true;
    } else {
        error_log("RID={$RID} BUNDLE_MAIL_FAILED user={$userId} role={$roleId} error={$result['message']}");
        storePendingBundleDelivery($pdo, $orderId, $userId, $bundleId, $RID);
        return false;
    }
}

/**
 * Send reward mail using GameMailer
 */
function sendRewardMail($pdo, $roleId, $productName, $itemId, $totalGrant, $orderId, $userId, $RID) {
    $mailer = new GameMailer($pdo);
    
    // Determine reward type based on item_id rules
    $coins = 0;
    $zen = 0;
    $exp = 0;
    $mailItemId = 0;
    $mailQty = 0;
    
    if ($itemId > 0) {
        $mailItemId = $itemId;
        $mailQty = $totalGrant;
    } else if ($itemId == -1) {
        $zen = $totalGrant;
    } else if ($itemId == -2) {
        $coins = $totalGrant;
    } else if ($itemId == -3) {
        $exp = $totalGrant;
    } else {
        // item_id = 0 - no delivery
        error_log("RID={$RID} FULFILL_SKIP user={$userId} item_id={$itemId}");
        return true;
    }
    
    $result = $mailer->sendOrderReward($roleId, $productName, $mailItemId, $mailQty, $coins, $zen, $exp);
    
    if ($result['success']) {
        error_log("RID={$RID} MAIL_SENT user={$userId} role={$roleId} product={$productName} mail_id={$result['insert_id']}");
        return true;
    } else {
        error_log("RID={$RID} MAIL_FAILED user={$userId} role={$roleId} error={$result['message']}");
        storePendingDelivery($pdo, $orderId, $userId, $itemId, $totalGrant, $RID);
        return false;
    }
}

function getUserRoleId($pdo, $userId) {
    // Get account name from users table
    $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ? LIMIT 1");
    $stmt->execute(array($userId));
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) return 0;
    
    $accountName = $user['name'];
    
    // Get first active character
    $stmt = $pdo->prepare("SELECT RoleID FROM basetab_sg WHERE AccountID = ? AND IsDel = 0 ORDER BY RoleID ASC LIMIT 1");
    $stmt->execute(array($accountName));
    $char = $stmt->fetch(PDO::FETCH_ASSOC);
    
    return $char ? intval($char['RoleID']) : 0;
}

function sendGameMail($pdo, $roleId, $title, $text, $coins, $zen, $exp, $itemId, $qty, $RID) {
    $roleId = intval($roleId);
    $coins = intval($coins);
    $zen = intval($zen);
    $exp = intval($exp);
    $itemId = intval($itemId);
    $qty = intval($qty);
    
    if ($roleId <= 0) {
        return array('success' => false, 'message' => 'Invalid role ID');
    }
    
    $title = substr(trim($title), 0, 100);
    $text = substr(trim($text), 0, 500);
    
    if ($itemId === 0) $qty = 0;
    if ($qty < 0) $qty = 0;
    
    // Build the mail blob
    $blob = buildMailBlob($title, $text, $coins, $zen, $exp, $itemId, $qty);
    
    // Validate blob format
    if (!preg_match('/^0x[0-9A-Fa-f]+$/', $blob)) {
        return array('success' => false, 'message' => 'Generated blob is invalid');
    }
    
    // Insert into mailtab_sg
    $sql = "INSERT INTO mailtab_sg (SenderID, TargerID, MailInfo, CreateTime)
            VALUES (0, {$roleId}, {$blob}, NOW())";
    
    try {
        $pdo->exec($sql);
        $insertId = $pdo->lastInsertId();
        error_log("RID={$RID} MAIL_INSERTED role={$roleId} id={$insertId}");
        return array('success' => true, 'message' => 'Mail sent', 'insert_id' => $insertId);
    } catch (PDOException $e) {
        error_log("RID={$RID} MAIL_INSERT_ERROR: " . $e->getMessage());
        return array('success' => false, 'message' => 'Insert failed', 'error' => $e->getMessage());
    }
}

function buildMailBlob($title, $text, $coins, $zen, $exp, $itemId, $qty) {
    $t_len = dechex(strlen($title) + 1);
    if (strlen($t_len) == 1) $t_len = '0' . $t_len;
    
    $txt_len = dechex(strlen($text) + 1);
    if (strlen($txt_len) == 1) $txt_len = '0' . $txt_len;
    
    $titleHex = strToHex($title);
    $textHex = strToHex($text);
    
    // Format coins (4 bytes, little-endian)
    $coinsHex = dechex($coins);
    if (strlen($coinsHex) == 1) $coinsHex = '0' . $coinsHex;
    for ($i = strlen($coinsHex); $i < 8; $i++) $coinsHex = '0' . $coinsHex;
    $coinsHex = substr($coinsHex, 6) . substr($coinsHex, 4, 2) . substr($coinsHex, 2, 2) . substr($coinsHex, 0, 2);
    
    // Format zen (4 bytes, little-endian)
    $zenHex = dechex($zen);
    if (strlen($zenHex) == 1) $zenHex = '0' . $zenHex;
    for ($i = strlen($zenHex); $i < 8; $i++) $zenHex = '0' . $zenHex;
    $zenHex = substr($zenHex, 6) . substr($zenHex, 4, 2) . substr($zenHex, 2, 2) . substr($zenHex, 0, 2);
    
    // Format exp (4 bytes, little-endian)
    $expHex = dechex($exp);
    if (strlen($expHex) == 1) $expHex = '0' . $expHex;
    for ($i = strlen($expHex); $i < 8; $i++) $expHex = '0' . $expHex;
    $expHex = substr($expHex, 6) . substr($expHex, 4, 2) . substr($expHex, 2, 2) . substr($expHex, 0, 2);
    
    // Build base blob
    $blob = '0x6600010000' . $t_len . '00' . $titleHex . '00' . $txt_len . '00' . $textHex . '0001' . $coinsHex . $zenHex . $expHex;
    
    // Add item data
    if ($itemId == 0) {
        $blob .= '000000000000000000';
    } else {
        $qtyHex = dechex($qty);
        if (strlen($qtyHex) == 1) $qtyHex = '0' . $qtyHex;
        
        $itemHex = dechex($itemId);
        if (strlen($itemHex) == 1) $itemHex = '0' . $itemHex;
        for ($i = strlen($itemHex); $i < 4; $i++) $itemHex = '0' . $itemHex;
        $itemHex = substr($itemHex, 2) . substr($itemHex, 0, 2);
        
        $unique = uniqid();
        $unique = substr($unique, 8, 2) . substr($unique, 6, 2);
        
        $itemBlob = '64464f70d314e0297a9dffff' . $itemHex . '0000' . $qtyHex . $unique . '959a2919e029';
        $itemBlob .= '0000000000000000000000000000000000000000000000000000000000000000';
        $itemBlob .= '0000000000000000000000000000000000000000000000000000000000000000';
        $itemBlob .= '0000000000000000000000000000000000000000000000000000000000000000';
        $itemBlob .= '0000000000000000000000000000000000000000000000000000000000000000';
        
        $blob .= $itemBlob;
    }
    
    return $blob;
}

function strToHex($string) {
    $hex = '';
    for ($i = 0; $i < strlen($string); $i++) {
        $hexCode = dechex(ord($string[$i]));
        $hex .= substr('0' . $hexCode, -2);
    }
    return strtoupper($hex);
}

function updateUserCurrency($pdo, $userId, $field, $amount, $RID) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS user_currency (
        user_id INT PRIMARY KEY,
        coins INT DEFAULT 0,
        zen INT DEFAULT 0,
        vip_points INT DEFAULT 0,
        updated_at DATETIME,
        KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
    $stmt = $pdo->prepare("INSERT IGNORE INTO user_currency (user_id, coins, zen, vip_points, updated_at) VALUES (?, 0, 0, 0, NOW())");
    $stmt->execute(array($userId));
    
    $allowedFields = array('coins', 'zen', 'vip_points');
    if (in_array($field, $allowedFields)) {
        $stmt = $pdo->prepare("UPDATE user_currency SET {$field} = {$field} + ?, updated_at = NOW() WHERE user_id = ?");
        $stmt->execute(array($amount, $userId));
        error_log("RID={$RID} CURRENCY_GRANTED user={$userId} {$field}={$amount}");
    }
}

function storePendingDelivery($pdo, $orderId, $userId, $itemId, $quantity, $RID) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS pending_deliveries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        user_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity INT NOT NULL,
        order_type VARCHAR(20) DEFAULT 'product',
        status VARCHAR(20) DEFAULT 'pending',
        created_at DATETIME,
        delivered_at DATETIME,
        KEY idx_user (user_id),
        KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
    $stmt = $pdo->prepare("INSERT INTO pending_deliveries (order_id, user_id, item_id, quantity, order_type, status, created_at) VALUES (?, ?, ?, ?, 'product', 'pending', NOW())");
    $stmt->execute(array($orderId, $userId, $itemId, $quantity));
    error_log("RID={$RID} PENDING_DELIVERY_CREATED user={$userId} item={$itemId} qty={$quantity}");
}

function storePendingBundleDelivery($pdo, $orderId, $userId, $bundleId, $RID) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS pending_deliveries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        user_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity INT NOT NULL,
        order_type VARCHAR(20) DEFAULT 'product',
        status VARCHAR(20) DEFAULT 'pending',
        created_at DATETIME,
        delivered_at DATETIME,
        KEY idx_user (user_id),
        KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
    $stmt = $pdo->prepare("INSERT INTO pending_deliveries (order_id, user_id, item_id, quantity, order_type, status, created_at) VALUES (?, ?, ?, 1, 'bundle', 'pending', NOW())");
    $stmt->execute(array($orderId, $userId, $bundleId));
    error_log("RID={$RID} PENDING_BUNDLE_DELIVERY_CREATED user={$userId} bundle={$bundleId}");
}
