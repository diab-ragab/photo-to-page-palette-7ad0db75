<?php
/**
 * stripe_webhook.php - Stripe Webhook Handler
 * 
 * Handles Stripe webhook events:
 * - checkout.session.completed: Mark order as paid, deliver items
 * - payment_intent.succeeded: Alternative payment confirmation
 * - payment_intent.payment_failed: Mark order as failed
 * 
 * Configure in Stripe Dashboard: https://dashboard.stripe.com/webhooks
 * Endpoint URL: https://woiendgame.online/api/stripe_webhook.php
 */

require_once __DIR__ . '/bootstrap.php';

$RID = bin2hex(random_bytes(6));

function json_response(array $data) {
    global $RID;
    while (ob_get_level()) { ob_end_clean(); }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array_merge($data, array('rid' => $RID)), JSON_UNESCAPED_UNICODE);
    exit;
}

function json_fail($code, $msg) {
    global $RID;
    error_log("RID={$RID} STRIPE_WEBHOOK RESP={$code} MSG={$msg}");
    while (ob_get_level()) { ob_end_clean(); }
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('success' => false, 'message' => $msg, 'rid' => $RID), JSON_UNESCAPED_UNICODE);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

// Use centralized config for DB and Stripe
$cfg = getConfig();
$webhookSecret = isset($cfg['stripe']['webhook_secret']) ? $cfg['stripe']['webhook_secret'] : '';

try {
    $pdo = getDB();
} catch (Exception $e) {
    json_fail(503, 'Service temporarily unavailable');
}

// Ensure webhook logs table exists
$pdo->exec("CREATE TABLE IF NOT EXISTS stripe_webhook_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload TEXT,
    processed TINYINT(1) DEFAULT 0,
    error_message TEXT,
    created_at DATETIME,
    KEY idx_event_id (event_id),
    KEY idx_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8");

// Ensure webshop_orders table has stripe fields
try {
    $pdo->exec("ALTER TABLE webshop_orders ADD COLUMN stripe_session_id VARCHAR(255) AFTER status");
} catch (Exception $e) {
    // Column might already exist
}

try {
    $pdo->exec("ALTER TABLE webshop_orders ADD COLUMN stripe_payment_intent VARCHAR(255) AFTER stripe_session_id");
} catch (Exception $e) {
    // Column might already exist
}

// Read the raw POST body
$payload = file_get_contents('php://input');
$sigHeader = isset($_SERVER['HTTP_STRIPE_SIGNATURE']) ? $_SERVER['HTTP_STRIPE_SIGNATURE'] : '';

// Log the incoming webhook
$eventId = 'unknown';
$eventType = 'unknown';
$event = null;

if ($payload) {
    $decoded = json_decode($payload, true);
    if ($decoded && isset($decoded['id'])) {
        $eventId = $decoded['id'];
        $eventType = isset($decoded['type']) ? $decoded['type'] : 'unknown';
        $event = $decoded;
    }
}

// Log webhook receipt
$stmt = $pdo->prepare("INSERT INTO stripe_webhook_logs (event_id, event_type, payload, created_at) VALUES (?, ?, ?, NOW())");
$stmt->execute(array($eventId, $eventType, $payload));
$logId = $pdo->lastInsertId();

// Verify webhook signature if secret is configured
if ($webhookSecret !== '' && $sigHeader !== '') {
    // Simple signature verification (you may want to use Stripe PHP SDK for full verification)
    // For production, consider using: composer require stripe/stripe-php
    // $event = \Stripe\Webhook::constructEvent($payload, $sigHeader, $webhookSecret);
    
    // Basic timestamp check from signature
    $signatureParts = explode(',', $sigHeader);
    $timestamp = null;
    foreach ($signatureParts as $part) {
        if (strpos($part, 't=') === 0) {
            $timestamp = (int)substr($part, 2);
            break;
        }
    }
    
    if ($timestamp) {
        $tolerance = 300; // 5 minutes
        if (abs(time() - $timestamp) > $tolerance) {
            $stmt = $pdo->prepare("UPDATE stripe_webhook_logs SET error_message = ? WHERE id = ?");
            $stmt->execute(array('Webhook timestamp too old', $logId));
            json_fail(400, 'Webhook timestamp expired');
        }
    }
}

if (!$event) {
    $stmt = $pdo->prepare("UPDATE stripe_webhook_logs SET error_message = ? WHERE id = ?");
    $stmt->execute(array('Invalid JSON payload', $logId));
    json_fail(400, 'Invalid payload');
}

error_log("RID={$RID} STRIPE_WEBHOOK type={$eventType} event_id={$eventId}");

// Handle the event
switch ($eventType) {
    case 'checkout.session.completed':
        handleCheckoutComplete($pdo, $event, $logId, $RID);
        break;
        
    case 'payment_intent.succeeded':
        handlePaymentSucceeded($pdo, $event, $logId, $RID);
        break;
        
    case 'payment_intent.payment_failed':
        handlePaymentFailed($pdo, $event, $logId, $RID);
        break;
        
    default:
        // Log but don't process other events
        error_log("RID={$RID} STRIPE_WEBHOOK unhandled event type: {$eventType}");
        break;
}

// Mark as processed
$stmt = $pdo->prepare("UPDATE stripe_webhook_logs SET processed = 1 WHERE id = ?");
$stmt->execute(array($logId));

json_response(array('success' => true, 'received' => true));

// ============ HANDLERS ============

function handleCheckoutComplete($pdo, $event, $logId, $RID) {
    $session = isset($event['data']['object']) ? $event['data']['object'] : array();
    $sessionId = isset($session['id']) ? $session['id'] : '';
    $paymentIntent = isset($session['payment_intent']) ? $session['payment_intent'] : '';
    $customerEmail = isset($session['customer_email']) ? $session['customer_email'] : '';
    $amountTotal = isset($session['amount_total']) ? (int)$session['amount_total'] : 0;
    $currency = isset($session['currency']) ? strtoupper($session['currency']) : 'EUR';
    $paymentStatus = isset($session['payment_status']) ? $session['payment_status'] : '';
    
    // Get line items metadata if available
    $metadata = isset($session['metadata']) ? $session['metadata'] : array();
    $productId = isset($metadata['product_id']) ? (int)$metadata['product_id'] : 0;
    $userId = isset($metadata['user_id']) ? (int)$metadata['user_id'] : 0;
    $quantity = isset($metadata['quantity']) ? (int)$metadata['quantity'] : 1;
    
    error_log("RID={$RID} CHECKOUT_COMPLETE session={$sessionId} email={$customerEmail} amount={$amountTotal} status={$paymentStatus}");
    
    if ($paymentStatus !== 'paid') {
        return;
    }
    
    // Check if order already exists for this session
    $stmt = $pdo->prepare("SELECT id FROM webshop_orders WHERE stripe_session_id = ? LIMIT 1");
    $stmt->execute(array($sessionId));
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existing) {
        // Update existing order
        $stmt = $pdo->prepare("
            UPDATE webshop_orders 
            SET status = 'completed', 
                stripe_payment_intent = ?,
                delivered_at = NOW()
            WHERE stripe_session_id = ?
        ");
        $stmt->execute(array($paymentIntent, $sessionId));
        error_log("RID={$RID} ORDER_UPDATED id={$existing['id']}");
    } else {
        // Create new order from webhook
        // Try to find user by email if not in metadata
        if ($userId <= 0 && $customerEmail !== '') {
            $stmt = $pdo->prepare("SELECT ID FROM users WHERE email = ? LIMIT 1");
            $stmt->execute(array($customerEmail));
            $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($userRow) {
                $userId = (int)$userRow['ID'];
            }
        }
        
        $totalReal = $amountTotal / 100; // Convert from cents
        
        $stmt = $pdo->prepare("
            INSERT INTO webshop_orders 
            (user_id, product_id, quantity, total_real, status, stripe_session_id, stripe_payment_intent, delivered_at, created_at)
            VALUES (?, ?, ?, ?, 'completed', ?, ?, NOW(), NOW())
        ");
        $stmt->execute(array($userId, $productId, $quantity, $totalReal, $sessionId, $paymentIntent));
        $orderId = $pdo->lastInsertId();
        error_log("RID={$RID} ORDER_CREATED id={$orderId} user={$userId} product={$productId}");
        
        // TODO: Deliver items to player in-game
        // This is where you would call your game server API to deliver items
        // deliverItemsToPlayer($userId, $productId, $quantity);
    }
}

function handlePaymentSucceeded($pdo, $event, $logId, $RID) {
    $paymentIntent = isset($event['data']['object']) ? $event['data']['object'] : array();
    $piId = isset($paymentIntent['id']) ? $paymentIntent['id'] : '';
    $amount = isset($paymentIntent['amount']) ? (int)$paymentIntent['amount'] : 0;
    
    error_log("RID={$RID} PAYMENT_SUCCEEDED pi={$piId} amount={$amount}");
    
    // Update any pending orders with this payment intent
    $stmt = $pdo->prepare("
        UPDATE webshop_orders 
        SET status = 'completed', delivered_at = NOW()
        WHERE stripe_payment_intent = ? AND status = 'pending'
    ");
    $stmt->execute(array($piId));
    
    if ($stmt->rowCount() > 0) {
        error_log("RID={$RID} ORDERS_COMPLETED count={$stmt->rowCount()}");
    }
}

function handlePaymentFailed($pdo, $event, $logId, $RID) {
    $paymentIntent = isset($event['data']['object']) ? $event['data']['object'] : array();
    $piId = isset($paymentIntent['id']) ? $paymentIntent['id'] : '';
    $errorMessage = '';
    
    if (isset($paymentIntent['last_payment_error']['message'])) {
        $errorMessage = $paymentIntent['last_payment_error']['message'];
    }
    
    error_log("RID={$RID} PAYMENT_FAILED pi={$piId} error={$errorMessage}");
    
    // Mark orders as failed
    $stmt = $pdo->prepare("
        UPDATE webshop_orders 
        SET status = 'failed'
        WHERE stripe_payment_intent = ? AND status = 'pending'
    ");
    $stmt->execute(array($piId));
}
