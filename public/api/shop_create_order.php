<?php
/**
 * POST /api/shop_create_order.php
 * Creates internal order + PayPal order, returns approveUrl.
 * Requires auth. PHP 5.3+ compatible.
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/paypal_helper.php';

handleCors(array('POST','OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();

// --- Auth ---
$user = requireAuth();
$userId = intval($user['user_id']);

// --- Rate limit (10 orders / 5 min / IP) ---
$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
$pdo = getDB();

// Clean old entries
try {
    $pdo->exec("DELETE FROM shop_rate_limit WHERE created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)");
} catch (Exception $e) {}

$rlStmt = $pdo->prepare("SELECT COUNT(*) FROM shop_rate_limit WHERE ip = ? AND action_key = 'create' AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
$rlStmt->execute(array($ip));
if (intval($rlStmt->fetchColumn()) >= 10) {
    error_log("RID={$RID} RATE_LIMIT ip={$ip}");
    jsonFail(429, 'Too many requests. Try again shortly.', $RID);
}
$pdo->prepare("INSERT INTO shop_rate_limit (ip, action_key, created_at) VALUES (?, 'create', NOW())")->execute(array($ip));

// --- Input ---
$body = getJsonInput();
$cart           = isset($body['cart']) && is_array($body['cart']) ? $body['cart'] : array();
$accountName    = isset($body['account_name'])   ? trim((string)$body['account_name'])   : '';
$characterName  = isset($body['character_name']) ? trim((string)$body['character_name']) : '';

if (count($cart) === 0) jsonFail(400, 'Cart is empty', $RID);
if ($accountName === '') jsonFail(400, 'account_name required', $RID);
if ($characterName === '') jsonFail(400, 'character_name required', $RID);
if (strlen($accountName) > 64 || strlen($characterName) > 64) jsonFail(400, 'Name too long', $RID);

// Validate character exists
$charStmt = $pdo->prepare("SELECT RoleID, Name FROM basetab_sg WHERE Name = ? AND IsDel = 0 LIMIT 1");
$charStmt->execute(array($characterName));
$charRow = $charStmt->fetch(PDO::FETCH_ASSOC);
if (!$charRow) jsonFail(400, 'Character not found: ' . $characterName, $RID);

// --- Build order items from DB prices ---
$productIds = array();
$cartMap = array(); // product_id => qty
foreach ($cart as $item) {
    $pid = isset($item['product_id']) ? intval($item['product_id']) : 0;
    $qty = isset($item['qty']) ? intval($item['qty']) : 1;
    if ($pid <= 0 || $qty <= 0 || $qty > 100) jsonFail(400, 'Invalid cart item', $RID);
    $productIds[] = $pid;
    $cartMap[$pid] = $qty;
}

// Fetch products
$placeholders = implode(',', array_fill(0, count($productIds), '?'));
$stmt = $pdo->prepare("SELECT id, name, price_cents, currency, is_active FROM shop_products WHERE id IN ({$placeholders})");
$stmt->execute($productIds);
$dbProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($dbProducts) !== count($productIds)) {
    jsonFail(400, 'One or more products not found', $RID);
}

$ppCfg = getPayPalConfig();
$currency = $ppCfg['currency'];
$totalCents = 0;
$orderItems = array();
$ppItems = array();

foreach ($dbProducts as $p) {
    $pid = intval($p['id']);
    if (intval($p['is_active']) !== 1) jsonFail(400, 'Product ' . $p['name'] . ' is no longer available', $RID);
    if (strtoupper($p['currency']) !== $currency) jsonFail(400, 'Currency mismatch for ' . $p['name'], $RID);

    $qty       = $cartMap[$pid];
    $unitCents = intval($p['price_cents']);
    $lineCents = $unitCents * $qty;
    $totalCents += $lineCents;

    $orderItems[] = array(
        'product_id'       => $pid,
        'qty'              => $qty,
        'unit_price_cents' => $unitCents,
        'line_total_cents' => $lineCents,
    );

    $ppItems[] = array(
        'name'        => substr($p['name'], 0, 127),
        'quantity'    => (string)$qty,
        'unit_amount' => array(
            'currency_code' => $currency,
            'value'         => number_format($unitCents / 100, 2, '.', ''),
        ),
    );
}

if ($totalCents <= 0) jsonFail(400, 'Order total must be > 0', $RID);

// --- Create internal order ---
$now = date('Y-m-d H:i:s');
$insOrder = $pdo->prepare("INSERT INTO shop_orders (rid, account_name, character_name, total_cents, currency, status, ip, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)");
$insOrder->execute(array($RID, $accountName, $characterName, $totalCents, $currency, $ip, $now, $now));
$orderId = intval($pdo->lastInsertId());

// Insert order items
$insItem = $pdo->prepare("INSERT INTO shop_order_items (order_id, product_id, qty, unit_price_cents, line_total_cents) VALUES (?, ?, ?, ?, ?)");
foreach ($orderItems as $oi) {
    $insItem->execute(array($orderId, $oi['product_id'], $oi['qty'], $oi['unit_price_cents'], $oi['line_total_cents']));
}

// --- Create PayPal order ---
$tokenRes = getPayPalAccessToken($ppCfg['client_id'], $ppCfg['secret'], false);
if ($tokenRes['error'] !== '') {
    error_log("RID={$RID} PAYPAL_TOKEN_FAIL: " . $tokenRes['error']);
    $pdo->prepare("UPDATE shop_orders SET status='failed', updated_at=NOW() WHERE id=?")->execute(array($orderId));
    jsonFail(502, 'Payment gateway error', $RID);
}

$totalStr = number_format($totalCents / 100, 2, '.', '');

$purchaseUnits = array(
    array(
        'reference_id' => (string)$orderId,
        'description'  => 'WOI Endgame Shop Order #' . $orderId,
        'amount'       => array(
            'currency_code' => $currency,
            'value'         => $totalStr,
            'breakdown'     => array(
                'item_total' => array(
                    'currency_code' => $currency,
                    'value'         => $totalStr,
                ),
            ),
        ),
        'items'    => $ppItems,
        'payee'    => array('merchant_id' => $ppCfg['merchant_id']),
    ),
);

$metadata = array('order_id' => $orderId, 'type' => 'shop');

$successUrl = $ppCfg['success_url'];
$cancelUrl  = $ppCfg['cancel_url'];
// Override to new shop URLs
$baseUrl = 'https://woiendgame.online';
$successUrl = $baseUrl . '/shop/success';
$cancelUrl  = $baseUrl . '/shop/cancel';

$ppResult = paypalCreateOrder($tokenRes['token'], $purchaseUnits, $successUrl, $cancelUrl, $metadata, false);

if ($ppResult['error'] !== '') {
    error_log("RID={$RID} PAYPAL_CREATE_FAIL: " . $ppResult['error']);
    $pdo->prepare("UPDATE shop_orders SET status='failed', updated_at=NOW() WHERE id=?")->execute(array($orderId));
    jsonFail(502, 'Failed to create payment: ' . $ppResult['error'], $RID);
}

// Store PayPal order ID
$pdo->prepare("UPDATE shop_orders SET paypal_order_id=?, updated_at=NOW() WHERE id=?")
    ->execute(array($ppResult['id'], $orderId));

// Log txn
$pdo->prepare("INSERT INTO shop_paypal_txn (order_id, paypal_order_id, status, raw_json, created_at) VALUES (?, ?, 'CREATED', ?, NOW())")
    ->execute(array($orderId, $ppResult['id'], json_encode(array('approve_url' => $ppResult['approve_url']))));

error_log("RID={$RID} ORDER_CREATED order_id={$orderId} paypal_order_id={$ppResult['id']} total={$totalStr}{$currency}");

echo json_encode(array(
    'success'       => true,
    'order_id'      => $orderId,
    'paypalOrderId' => $ppResult['id'],
    'approveUrl'    => $ppResult['approve_url'],
    'rid'           => $RID,
));
