<?php
/**
 * create_payment_intent.php - Create Stripe PaymentIntent
 * 
 * POST /api/create_payment_intent.php
 * Body: { amount: number (in cents), currency: string, order_id?: number }
 * Returns: { success: true, clientSecret: string }
 */

require_once __DIR__ . '/bootstrap.php';
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
    error_log("RID={$RID} CREATE_PAYMENT_INTENT RESP={$code} MSG={$msg}");
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

// Rate limiting table
$pdo->exec("CREATE TABLE IF NOT EXISTS payment_rate_limit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    endpoint VARCHAR(50) NOT NULL,
    request_time DATETIME NOT NULL,
    KEY idx_ip_time (ip_address, endpoint, request_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8");

// Rate limiting check (10 requests per minute per IP)
$clientIP = isset($_SERVER['HTTP_X_FORWARDED_FOR']) 
    ? explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0] 
    : (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown');
$clientIP = trim($clientIP);

$stmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM payment_rate_limit WHERE ip_address = ? AND endpoint = 'create_intent' AND request_time > DATE_SUB(NOW(), INTERVAL 1 MINUTE)");
$stmt->execute(array($clientIP));
$rateCheck = $stmt->fetch(PDO::FETCH_ASSOC);

if ($rateCheck && (int)$rateCheck['cnt'] >= 10) {
    json_fail(429, 'Too many requests. Please wait a moment.');
}

// Log this request for rate limiting
$stmt = $pdo->prepare("INSERT INTO payment_rate_limit (ip_address, endpoint, request_time) VALUES (?, 'create_intent', NOW())");
$stmt->execute(array($clientIP));

// Clean old rate limit entries (older than 5 minutes)
$pdo->exec("DELETE FROM payment_rate_limit WHERE request_time < DATE_SUB(NOW(), INTERVAL 5 MINUTE)");

// Parse request body
$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true);

if (!$body) {
    json_fail(400, 'Invalid JSON body');
}

$amount = isset($body['amount']) ? (int)$body['amount'] : 0;
$currency = isset($body['currency']) ? strtolower(trim($body['currency'])) : ($cfg['stripe']['currency'] ? $cfg['stripe']['currency'] : 'eur');
$orderId = isset($body['order_id']) ? (int)$body['order_id'] : 0;
$userId = isset($body['user_id']) ? (int)$body['user_id'] : 0;

// Validate amount
if ($amount <= 0) {
    json_fail(400, 'Invalid amount');
}

// Minimum amount validation (Stripe requires minimum 50 cents for most currencies)
if ($amount < 50) {
    json_fail(400, 'Amount too low (minimum 50 cents)');
}

// Maximum amount validation (prevent abuse)
if ($amount > 99999999) { // 999,999.99 in cents
    json_fail(400, 'Amount exceeds maximum');
}

// Validate currency
$validCurrencies = array('eur', 'usd', 'gbp', 'pln', 'czk');
if (!in_array($currency, $validCurrencies)) {
    json_fail(400, 'Invalid currency');
}

// If order_id provided, validate against database
if ($orderId > 0) {
    $stmt = $pdo->prepare("SELECT id, total_real, status FROM webshop_orders WHERE id = ? LIMIT 1");
    $stmt->execute(array($orderId));
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        json_fail(404, 'Order not found');
    }
    
    if ($order['status'] === 'completed') {
        json_fail(400, 'Order already completed');
    }
    
    // Validate amount matches order (convert EUR to cents)
    $expectedAmount = (int)($order['total_real'] * 100);
    if ($amount !== $expectedAmount) {
        error_log("RID={$RID} AMOUNT_MISMATCH order={$orderId} expected={$expectedAmount} got={$amount}");
        json_fail(400, 'Amount mismatch');
    }
}

// Get Stripe secret key from config
$stripeSecretKey = isset($cfg['stripe']['secret_key']) ? $cfg['stripe']['secret_key'] : '';

if (empty($stripeSecretKey)) {
    error_log("RID={$RID} STRIPE_SECRET_KEY not configured");
    json_fail(500, 'Payment system not configured');
}

// Create PaymentIntent using Stripe API (cURL)
$stripeUrl = 'https://api.stripe.com/v1/payment_intents';

$postData = array(
    'amount' => $amount,
    'currency' => $currency,
    'automatic_payment_methods[enabled]' => 'true',
    'description' => 'Service Payment',
    'metadata[type]' => 'service_payment',
    'metadata[rid]' => $RID,
);

if ($orderId > 0) {
    $postData['metadata[order_id]'] = $orderId;
}
if ($userId > 0) {
    $postData['metadata[user_id]'] = $userId;
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $stripeUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Authorization: Basic ' . base64_encode($stripeSecretKey . ':'),
    'Content-Type: application/x-www-form-urlencoded',
));
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    error_log("RID={$RID} STRIPE_CURL_ERROR: {$curlError}");
    json_fail(502, 'Payment service unavailable');
}

$stripeResponse = json_decode($response, true);

if ($httpCode >= 400 || !$stripeResponse) {
    $errorMsg = isset($stripeResponse['error']['message']) ? $stripeResponse['error']['message'] : 'Payment creation failed';
    error_log("RID={$RID} STRIPE_ERROR: {$errorMsg} HTTP={$httpCode}");
    json_fail(400, $errorMsg);
}

$clientSecret = isset($stripeResponse['client_secret']) ? $stripeResponse['client_secret'] : '';
$paymentIntentId = isset($stripeResponse['id']) ? $stripeResponse['id'] : '';

if (empty($clientSecret)) {
    error_log("RID={$RID} STRIPE_NO_CLIENT_SECRET");
    json_fail(500, 'Payment initialization failed');
}

// If we have an order, update it with the payment intent ID
if ($orderId > 0) {
    $stmt = $pdo->prepare("UPDATE webshop_orders SET stripe_payment_intent = ?, status = 'pending' WHERE id = ?");
    $stmt->execute(array($paymentIntentId, $orderId));
}

error_log("RID={$RID} PAYMENT_INTENT_CREATED pi={$paymentIntentId} amount={$amount} currency={$currency}");

json_response(array(
    'success' => true,
    'clientSecret' => $clientSecret,
    'paymentIntentId' => $paymentIntentId,
));
