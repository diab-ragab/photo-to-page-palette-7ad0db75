<?php
/**
 * POST /api/shop_capture_order.php
 * Captures PayPal order, verifies amount/currency/merchant, fulfills items.
 * Requires auth. Idempotent. PHP 5.3+ compatible.
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/paypal_helper.php';
require_once __DIR__ . '/mail_delivery.php';

handleCors(array('POST','OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();

// --- Auth ---
$user = requireAuth();
$userId = isset($user['user_id']) ? intval($user['user_id']) : 0;
$accountName = isset($user['name']) ? trim((string)$user['name']) : '';
if ($userId <= 0) jsonFail(401, 'Unauthorized', $RID);
if ($accountName === '') jsonFail(400, 'Account name not resolved', $RID);

// --- Rate limit (20 captures / 5 min / IP) ---
$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
$pdo = getDB();
try { $pdo->exec("DELETE FROM shop_rate_limit WHERE created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)"); } catch (Exception $e) {}

$rlStmt = $pdo->prepare("SELECT COUNT(*) FROM shop_rate_limit WHERE ip = ? AND action_key = 'capture' AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
$rlStmt->execute(array($ip));
if (intval($rlStmt->fetchColumn()) >= 20) {
    jsonFail(429, 'Too many requests', $RID);
}
$pdo->prepare("INSERT INTO shop_rate_limit (ip, action_key, created_at) VALUES (?, 'capture', NOW())")->execute(array($ip));

// --- Input ---
$body = getJsonInput();
$ppOrderId = isset($body['paypalOrderId']) ? trim((string)$body['paypalOrderId']) : '';
if ($ppOrderId === '') {
    $ppOrderId = isset($_GET['token']) ? trim((string)$_GET['token']) : '';
}
if ($ppOrderId === '') jsonFail(400, 'paypalOrderId required', $RID);

// --- Find internal order ---
$stmt = $pdo->prepare("SELECT * FROM shop_orders WHERE paypal_order_id = ? LIMIT 1");
$stmt->execute(array($ppOrderId));
$order = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$order) jsonFail(404, 'Order not found', $RID);

$orderId = intval($order['id']);

// --- Ownership check (by account_name) ---
if ((string)$order['account_name'] !== $accountName) {
    error_log("RID={$RID} ORDER_OWNERSHIP_DENY order_id={$orderId} account={$accountName} expected={$order['account_name']}");
    jsonFail(403, 'Not allowed', $RID);
}

// Idempotent: if already completed, return success with delivery log
if ($order['status'] === 'completed') {
    $dlStmt = $pdo->prepare("SELECT item_type, item_ref, qty, result, message FROM shop_delivery_log WHERE order_id = ?");
    $dlStmt->execute(array($orderId));
    $deliveries = $dlStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(array(
        'success'          => true,
        'status'           => 'completed',
        'order_id'         => $orderId,
        'already_captured' => true,
        'processed_count'  => count($deliveries),
        'deliveries'       => $deliveries,
        'rid'              => $RID,
    ));
    exit;
}

if ($order['status'] === 'failed') {
    jsonFail(400, 'Order was previously marked as failed. Contact support.', $RID);
}

// --- Mark processing ---
$pdo->prepare("UPDATE shop_orders SET status='processing', updated_at=NOW() WHERE id=?")->execute(array($orderId));

// --- Capture PayPal ---
$ppCfg = getPayPalConfig();
$tokenRes = getPayPalAccessToken($ppCfg['client_id'], $ppCfg['secret'], $ppCfg['sandbox']);
if ($tokenRes['error'] !== '') {
    error_log("RID={$RID} CAPTURE_TOKEN_FAIL: " . $tokenRes['error']);
    $pdo->prepare("UPDATE shop_orders SET status='pending', updated_at=NOW() WHERE id=?")->execute(array($orderId));
    jsonFail(502, 'Payment gateway error', $RID);
}

// Get order details first to verify amount/currency/merchant
$ppOrderData = paypalGetOrder($tokenRes['token'], $ppOrderId, $ppCfg['sandbox']);
if ($ppOrderData['error'] !== '') {
    error_log("RID={$RID} PP_GET_ORDER_FAIL: " . $ppOrderData['error']);
    $pdo->prepare("UPDATE shop_orders SET status='pending', updated_at=NOW() WHERE id=?")->execute(array($orderId));
    jsonFail(502, 'Could not verify PayPal order', $RID);
}

// Verify from order details
$ppData = $ppOrderData['data'];
$puArr = isset($ppData['purchase_units'][0]) ? $ppData['purchase_units'][0] : array();
$ppAmountVal = isset($puArr['amount']['value']) ? $puArr['amount']['value'] : '0.00';
$ppCurrency  = isset($puArr['amount']['currency_code']) ? strtoupper($puArr['amount']['currency_code']) : '';
$ppPayeeId   = isset($puArr['payee']['merchant_id']) ? $puArr['payee']['merchant_id'] : '';

$ppCents    = intval(round(floatval($ppAmountVal) * 100));
$orderCents = intval($order['total_cents']);

if ($ppCurrency !== strtoupper($ppCfg['currency'])) {
    error_log("RID={$RID} CURRENCY_MISMATCH expected={$ppCfg['currency']} got={$ppCurrency}");
    $pdo->prepare("UPDATE shop_orders SET status='failed', updated_at=NOW() WHERE id=?")->execute(array($orderId));
    jsonFail(400, 'Currency mismatch', $RID);
}

if ($ppCents !== $orderCents) {
    error_log("RID={$RID} AMOUNT_MISMATCH expected={$orderCents} got={$ppCents}");
    $pdo->prepare("UPDATE shop_orders SET status='failed', updated_at=NOW() WHERE id=?")->execute(array($orderId));
    jsonFail(400, 'Amount mismatch', $RID);
}

if ($ppCfg['merchant_id'] !== '' && $ppPayeeId !== '' && $ppPayeeId !== $ppCfg['merchant_id']) {
    error_log("RID={$RID} MERCHANT_MISMATCH expected={$ppCfg['merchant_id']} got={$ppPayeeId}");
    $pdo->prepare("UPDATE shop_orders SET status='failed', updated_at=NOW() WHERE id=?")->execute(array($orderId));
    jsonFail(400, 'Merchant verification failed', $RID);
}

// Now capture
$capResult = paypalCaptureOrder($tokenRes['token'], $ppOrderId, $ppCfg['sandbox']);

// Log raw txn
$pdo->prepare("INSERT INTO shop_paypal_txn (order_id, paypal_order_id, capture_id, status, raw_json, created_at) VALUES (?, ?, ?, ?, ?, NOW())")
    ->execute(array($orderId, $ppOrderId, $capResult['capture_id'], $capResult['status'], json_encode($capResult['data'])));

if ($capResult['error'] !== '') {
    error_log("RID={$RID} CAPTURE_FAIL order_id={$orderId}: " . $capResult['error']);
    if ($capResult['status'] !== 'COMPLETED') {
        $pdo->prepare("UPDATE shop_orders SET status='failed', updated_at=NOW() WHERE id=?")->execute(array($orderId));
        jsonFail(400, 'Payment capture failed: ' . $capResult['error'], $RID);
    }
}

if ($capResult['status'] !== 'COMPLETED') {
    error_log("RID={$RID} CAPTURE_NOT_COMPLETED order_id={$orderId} status={$capResult['status']}");
    $pdo->prepare("UPDATE shop_orders SET status='failed', updated_at=NOW() WHERE id=?")->execute(array($orderId));
    jsonFail(400, 'Payment not completed (status: ' . $capResult['status'] . ')', $RID);
}

// Extract payer email
$payerEmail = '';
$capData = $capResult['data'];
if (isset($capData['payer']['email_address'])) $payerEmail = $capData['payer']['email_address'];

$pdo->prepare("UPDATE shop_orders SET capture_id=?, payer_email=?, updated_at=NOW() WHERE id=?")
    ->execute(array($capResult['capture_id'], $payerEmail, $orderId));

// --- Fulfillment ---
error_log("RID={$RID} FULFILLMENT_START order_id={$orderId}");

$itemsStmt = $pdo->prepare("
    SELECT oi.id as oi_id, oi.product_id, oi.qty, p.name, p.type, p.payload_json
    FROM shop_order_items oi
    JOIN shop_products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
");
$itemsStmt->execute(array($orderId));
$orderItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

// Resolve character RoleID
$charStmt = $pdo->prepare("SELECT RoleID FROM basetab_sg WHERE Name = ? AND IsDel = 0 LIMIT 1");
$charStmt->execute(array($order['character_name']));
$charRow = $charStmt->fetch(PDO::FETCH_ASSOC);
$roleId = $charRow ? intval($charRow['RoleID']) : 0;

$mailer = new GameMailer(getMySQLi());
$processedCount = 0;
$failedCount = 0;
$dlInsert = $pdo->prepare("INSERT INTO shop_delivery_log (order_id, item_type, item_ref, qty, result, message, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");

foreach ($orderItems as $oi) {
    // Idempotency: skip already delivered
    $checkDl = $pdo->prepare("SELECT id FROM shop_delivery_log WHERE order_id = ? AND item_ref = ? AND result = 'ok' LIMIT 1");
    $checkDl->execute(array($orderId, 'oi_' . $oi['oi_id']));
    if ($checkDl->fetch()) {
        $processedCount++;
        continue;
    }

    $payload = array();
    if ($oi['payload_json'] !== '' && $oi['payload_json'] !== null) {
        $decoded = json_decode($oi['payload_json'], true);
        if (is_array($decoded)) $payload = $decoded;
    }

    $zen   = isset($payload['zen'])   ? intval($payload['zen'])   * intval($oi['qty']) : 0;
    $coins = isset($payload['coins']) ? intval($payload['coins']) * intval($oi['qty']) : 0;
    $exp   = isset($payload['exp'])   ? intval($payload['exp'])   * intval($oi['qty']) : 0;
    $itemId = isset($payload['item_id']) ? intval($payload['item_id']) : 0;
    $itemQty = isset($payload['qty'])    ? intval($payload['qty']) * intval($oi['qty']) : intval($oi['qty']);

    if ($roleId <= 0) {
        $dlInsert->execute(array($orderId, $oi['type'], 'oi_' . $oi['oi_id'], $oi['qty'], 'fail', 'Character not found'));
        $failedCount++;
        continue;
    }

    $result = $mailer->sendOrderReward($roleId, $oi['name'], $itemId, ($itemId > 0 ? $itemQty : 0), $coins, $zen, $exp);

    if (isset($result['success']) && $result['success']) {
        $dlInsert->execute(array($orderId, $oi['type'], 'oi_' . $oi['oi_id'], $oi['qty'], 'ok', 'Delivered'));
        $processedCount++;
    } else {
        $msg = isset($result['message']) ? $result['message'] : 'Unknown error';
        $dlInsert->execute(array($orderId, $oi['type'], 'oi_' . $oi['oi_id'], $oi['qty'], 'fail', $msg));
        $failedCount++;
        error_log("RID={$RID} DELIVERY_FAIL order_id={$orderId} oi_id={$oi['oi_id']}: {$msg}");
    }
}

// Final status
$finalStatus = ($failedCount > 0) ? 'failed' : 'completed';
$pdo->prepare("UPDATE shop_orders SET status=?, updated_at=NOW() WHERE id=?")->execute(array($finalStatus, $orderId));

error_log("RID={$RID} FULFILLMENT_DONE order_id={$orderId} processed={$processedCount} failed={$failedCount} status={$finalStatus}");

echo json_encode(array(
    'success'         => ($finalStatus === 'completed'),
    'status'          => $finalStatus,
    'order_id'        => $orderId,
    'processed_count' => $processedCount,
    'failed_count'    => $failedCount,
    'rid'             => $RID,
));
exit;
