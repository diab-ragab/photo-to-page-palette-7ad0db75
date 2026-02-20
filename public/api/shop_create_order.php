<?php
/**
 * shop_create_order.php - Create internal order + PayPal order (approve URL)
 * Sync with NEW SHOP SCHEMA (no user_id in shop_orders)
 * PHP 5.3+ compatible
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/paypal_helper.php';

handleCors(array('POST','OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();

function j_ok($data) {
  global $RID;
  while (ob_get_level()) { @ob_end_clean(); }
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array_merge(array('success' => true, 'rid' => $RID), $data), JSON_UNESCAPED_UNICODE);
  exit;
}

function j_fail($code, $msg) {
  global $RID;
  error_log("RID={$RID} SHOP_CREATE_FAIL code={$code} msg={$msg}");
  while (ob_get_level()) { @ob_end_clean(); }
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array('success' => false, 'message' => $msg, 'rid' => $RID), JSON_UNESCAPED_UNICODE);
  exit;
}

// ----- AUTH -----
$user = requireAuth();
$userId = isset($user['user_id']) ? intval($user['user_id']) : 0;
$accountName = isset($user['name']) ? trim((string)$user['name']) : '';
if ($userId <= 0) j_fail(401, 'Unauthorized');
if ($accountName === '') j_fail(400, 'Account name not resolved');

// ----- INPUT -----
$body = getJsonInput();
$cart = (isset($body['cart']) && is_array($body['cart'])) ? $body['cart'] : array();
$characterName = isset($body['character_name']) ? trim((string)$body['character_name']) : '';

if (!$cart || count($cart) === 0) j_fail(400, 'Cart is empty');
if ($characterName === '') j_fail(400, 'character_name required');
if (strlen($characterName) > 64) j_fail(400, 'Name too long');

$pdo = getDB();

// Validate character exists
$charStmt = $pdo->prepare("SELECT RoleID, Name FROM basetab_sg WHERE Name = ? AND IsDel = 0 LIMIT 1");
$charStmt->execute(array($characterName));
$charRow = $charStmt->fetch(PDO::FETCH_ASSOC);
if (!$charRow) j_fail(400, 'Character not found');

// ----- Build product list from DB (never trust client price) -----
// IMPORTANT: sum quantities for duplicate product_ids (UI can send duplicates)
$qtyMap = array(); // pid => total qty
foreach ($cart as $it) {
  $pid = isset($it['product_id']) ? intval($it['product_id']) : 0;
  $qty = isset($it['qty']) ? intval($it['qty']) : 1;

  if ($pid <= 0) j_fail(400, 'Invalid product_id');
  if ($qty <= 0 || $qty > 100) j_fail(400, 'Invalid qty');

  if (!isset($qtyMap[$pid])) $qtyMap[$pid] = 0;
  $qtyMap[$pid] += $qty;
  if ($qtyMap[$pid] > 100) j_fail(400, 'Invalid qty (sum too large)');
}

$productIds = array_keys($qtyMap);
if (count($productIds) === 0) j_fail(400, 'Cart is empty');

$ppCfg = getPayPalConfig();
$currency = isset($ppCfg['currency']) ? strtoupper($ppCfg['currency']) : 'EUR';

$placeholders = implode(',', array_fill(0, count($productIds), '?'));
$sql = "SELECT id, name, price_cents, currency, is_active
        FROM shop_products
        WHERE id IN ($placeholders)";
$stmt = $pdo->prepare($sql);
$stmt->execute($productIds);
$products = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!is_array($products) || count($products) !== count($productIds)) {
  // return missing ids for easier debugging
  $found = array();
  if (is_array($products)) {
    foreach ($products as $p) $found[intval($p['id'])] = true;
  }
  $missing = array();
  foreach ($productIds as $pid) {
    $pid = intval($pid);
    if (!isset($found[$pid])) $missing[] = $pid;
  }
  j_fail(400, 'Products not found: ' . implode(',', $missing));
}

$totalCents = 0;
$orderItems = array();

foreach ($products as $p) {
  if (intval($p['is_active']) !== 1) j_fail(400, 'Product unavailable: ' . $p['name']);
  if (strtoupper((string)$p['currency']) !== $currency) j_fail(400, 'Currency mismatch');

  $pid = intval($p['id']);
  $qty = isset($qtyMap[$pid]) ? intval($qtyMap[$pid]) : 0;
  if ($qty <= 0) j_fail(400, 'Invalid qty');

  $unit = intval($p['price_cents']);
  $line = $unit * $qty;
  $totalCents += $line;

  $orderItems[] = array(
    'product_id' => $pid,
    'qty' => $qty,
    'unit_price_cents' => $unit,
    'line_total_cents' => $line
  );
}

if ($totalCents <= 0) j_fail(400, 'Invalid total');

// ----- Create internal order -----
$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';

try {
  $pdo->beginTransaction();

  // NEW SCHEMA: shop_orders has NO user_id
  $ins = $pdo->prepare("INSERT INTO shop_orders (rid, account_name, character_name, total_cents, currency, status, paypal_order_id, capture_id, payer_email, ip, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, '', ?, NOW(), NOW())");
  $ins->execute(array($RID, $accountName, $characterName, $totalCents, $currency, $ip));
  $orderId = intval($pdo->lastInsertId());

  $insItem = $pdo->prepare("INSERT INTO shop_order_items (order_id, product_id, qty, unit_price_cents, line_total_cents)
                            VALUES (?, ?, ?, ?, ?)");
  foreach ($orderItems as $oi) {
    $insItem->execute(array($orderId, $oi['product_id'], $oi['qty'], $oi['unit_price_cents'], $oi['line_total_cents']));
  }

  $pdo->commit();
} catch (Exception $e) {
  $pdo->rollBack();
  j_fail(500, 'DB error: ' . $e->getMessage());
}

// ----- Create PayPal order -----
$ppClient  = isset($ppCfg['client_id']) ? $ppCfg['client_id'] : '';
$ppSecret  = isset($ppCfg['secret']) ? $ppCfg['secret'] : '';
$ppSandbox = isset($ppCfg['sandbox']) ? (bool)$ppCfg['sandbox'] : false;
$successUrl = isset($ppCfg['success_url']) ? $ppCfg['success_url'] : '';
$cancelUrl  = isset($ppCfg['cancel_url']) ? $ppCfg['cancel_url'] : '';

if ($ppClient === '' || $ppSecret === '') j_fail(500, 'PayPal not configured');
if ($successUrl === '' || $cancelUrl === '') j_fail(500, 'PayPal return/cancel URLs not configured');

$t = getPayPalAccessToken($ppClient, $ppSecret, $ppSandbox);
if (!is_array($t) || $t['token'] === '') {
  $err = isset($t['error']) ? $t['error'] : 'unknown';
  j_fail(502, 'PayPal token error: ' . $err);
}

$amountValue = number_format($totalCents / 100, 2, '.', '');

$purchaseUnits = array(
  array(
    'reference_id' => 'WOI-' . $orderId,
    'amount' => array(
      'currency_code' => $currency,
      'value' => $amountValue
    )
  )
);

// Keep meta small; PayPal custom_id limit exists. This is for debugging only.
$meta = array('order_id' => $orderId, 'account' => $accountName);

$pp = paypalCreateOrder($t['token'], $purchaseUnits, $successUrl, $cancelUrl, $meta, $ppSandbox);

if (!is_array($pp) || $pp['id'] === '' || $pp['approve_url'] === '') {
  $err = is_array($pp) && isset($pp['error']) ? $pp['error'] : 'unknown';
  j_fail(502, 'PayPal create failed: ' . $err);
}

try {
  $upd = $pdo->prepare("UPDATE shop_orders SET paypal_order_id=?, updated_at=NOW() WHERE id=?");
  $upd->execute(array($pp['id'], $orderId));
} catch (Exception $e) {
  error_log("RID={$RID} WARN cannot save paypal_order_id: " . $e->getMessage());
}

j_ok(array(
  'order_id' => $orderId,
  'paypalOrderId' => $pp['id'],
  'approveUrl' => $pp['approve_url'],
  'currency' => $currency,
  'total_cents' => $totalCents
));