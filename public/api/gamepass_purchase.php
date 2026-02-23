<?php
/**
 * gamepass_purchase.php - Create PayPal order to purchase Elite or Gold Game Pass
 * POST { tier: "elite"|"gold", character_name: "..." }
 * Returns { success: true, url: "...", paypal_order_id: "..." }
 * PHP 5.3+ compatible
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/paypal_helper.php';
require_once __DIR__ . '/gamepass_helpers.php';
handleCors(array('POST', 'OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();

function gp_ok($data) {
  global $RID;
  while (ob_get_level()) { @ob_end_clean(); }
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array_merge(array('success' => true, 'rid' => $RID), $data), JSON_UNESCAPED_UNICODE);
  exit;
}

function gp_fail($code, $msg) {
  global $RID;
  error_log("RID={$RID} GP_PURCHASE_FAIL code={$code} msg={$msg}");
  while (ob_get_level()) { @ob_end_clean(); }
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array('success' => false, 'message' => $msg, 'rid' => $RID), JSON_UNESCAPED_UNICODE);
  exit;
}

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'POST') gp_fail(405, 'Method not allowed');

// Auth
$user = getCurrentUser();
if (!$user) gp_fail(401, 'Not authenticated');
$userId = (int)$user['user_id'];
$accountName = isset($user['name']) ? trim((string)$user['name']) : '';

// Input
$input = getJsonInput();
$tierInput = isset($input['tier']) ? strtolower(trim($input['tier'])) : '';
$characterName = isset($input['character_name']) ? trim((string)$input['character_name']) : '';

if (!in_array($tierInput, array('elite', 'gold'))) {
  gp_fail(400, 'Invalid tier. Must be elite or gold.');
}
if ($characterName === '') {
  gp_fail(400, 'character_name is required.');
}

$pdo = getDB();
ensureGamePassTables($pdo);

// Validate character
$charStmt = $pdo->prepare("SELECT RoleID, Name FROM basetab_sg WHERE Name = ? AND IsDel = 0 LIMIT 1");
$charStmt->execute(array($characterName));
$charRow = $charStmt->fetch(PDO::FETCH_ASSOC);
if (!$charRow) gp_fail(400, 'Character not found');

// Check if user already has a paid pass
$stmt = $pdo->prepare("SELECT tier, activated_at, days_total, expires_at, is_premium FROM user_gamepass WHERE user_id = ?");
$stmt->execute(array($userId));
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

$currentTier = 'free';
if ($existing) {
  $ct = isset($existing['tier']) ? $existing['tier'] : 'free';
  if (in_array($ct, array('elite', 'gold'))) {
    // Check if still active using new model
    $gpActivatedAt = isset($existing['activated_at']) ? $existing['activated_at'] : null;
    $gpDaysTotal = isset($existing['days_total']) ? (int)$existing['days_total'] : null;
    $isActive = false;
    if ($gpDaysTotal !== null && $gpDaysTotal > 0) {
      $isActive = isGamePassActive($gpActivatedAt, $gpDaysTotal);
    } else {
      // Legacy fallback
      $expiresAt = isset($existing['expires_at']) ? strtotime($existing['expires_at']) : 0;
      $isActive = ($expiresAt > time());
    }
    if ($isActive) {
      $currentTier = $ct;
    }
  }
}

// Prevent buying same or lower tier
$tierRank = array('free' => 0, 'elite' => 1, 'gold' => 2);
$userRank = isset($tierRank[$currentTier]) ? $tierRank[$currentTier] : 0;
$reqRank = isset($tierRank[$tierInput]) ? $tierRank[$tierInput] : 0;

if ($userRank >= $reqRank && $currentTier !== 'free') {
  gp_fail(400, 'You already have ' . ucfirst($currentTier) . ' Pass. Use extend instead.');
}

// Read prices from site_settings
$eliteCents = 999;
$goldCents = 1999;
try {
  $priceStmt = $pdo->prepare("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('gamepass_elite_price', 'gamepass_gold_price')");
  $priceStmt->execute();
  $priceRows = $priceStmt->fetchAll(PDO::FETCH_ASSOC);
  foreach ($priceRows as $pr) {
    if ($pr['setting_key'] === 'gamepass_elite_price') {
      $v = (int)$pr['setting_value'];
      if ($v > 0) $eliteCents = $v;
    }
    if ($pr['setting_key'] === 'gamepass_gold_price') {
      $v = (int)$pr['setting_value'];
      if ($v > 0) $goldCents = $v;
    }
  }
} catch (Exception $e) {
  error_log("RID={$RID} GP_PRICE_ERR: " . $e->getMessage());
}

$totalCents = ($tierInput === 'gold') ? $goldCents : $eliteCents;
if ($totalCents < 50) $totalCents = 50; // PayPal minimum

$totalFormatted = number_format($totalCents / 100, 2, '.', '');
$tierLabel = ($tierInput === 'gold') ? 'Gold' : 'Elite';
$productName = $tierLabel . ' Game Pass (30 days)';

// PayPal
$ppCfg = getPayPalConfig();
if ($ppCfg['client_id'] === '' || $ppCfg['secret'] === '') {
  gp_fail(500, 'Payment not configured');
}

// Insert pending purchase (always 30 days)
$days = 30;
$stmt = $pdo->prepare("INSERT INTO gamepass_purchases (user_id, tier, price_cents, price_eur, character_name, days, status, rid, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW())");
$stmt->execute(array($userId, $tierInput, $totalCents, number_format($totalCents / 100, 2, '.', ''), $characterName, $days, $RID));
$purchaseId = $pdo->lastInsertId();

// Get PayPal token
$tokenResult = getPayPalAccessToken($ppCfg['client_id'], $ppCfg['secret'], $ppCfg['sandbox']);
if ($tokenResult['error'] !== '') {
  error_log("RID={$RID} GP_PP_TOKEN_ERR: " . $tokenResult['error']);
  gp_fail(502, 'Payment provider error');
}

$purchaseUnits = array(
  array(
    'description' => $productName,
    'custom_id' => json_encode(array(
      'type' => 'gamepass_purchase',
      'user_id' => $userId,
      'tier' => $tierInput,
      'purchase_id' => (int)$purchaseId,
      'character_name' => $characterName,
      'rid' => $RID,
    )),
    'amount' => array(
      'currency_code' => $ppCfg['currency'],
      'value' => $totalFormatted,
    ),
  ),
);

$successUrl = 'https://woiendgame.online/dashboard?gamepass_purchased=' . $tierInput . '&paypal=1&purchase_id=' . $purchaseId;
$cancelUrl  = 'https://woiendgame.online/shop';

$orderResult = paypalCreateOrder(
  $tokenResult['token'],
  $purchaseUnits,
  $successUrl,
  $cancelUrl,
  array(),
  $ppCfg['sandbox']
);

if ($orderResult['error'] !== '') {
  error_log("RID={$RID} GP_PP_ORDER_ERR: " . $orderResult['error']);
  try {
    $pdo->prepare("UPDATE gamepass_purchases SET status = 'failed' WHERE id = ?")->execute(array($purchaseId));
  } catch (Exception $e) {}
  gp_fail(502, 'Payment provider error');
}

// Save PayPal order ID
try {
  $pdo->prepare("UPDATE gamepass_purchases SET paypal_order_id = ? WHERE id = ?")->execute(array($orderResult['id'], $purchaseId));
} catch (Exception $e) {
  error_log("RID={$RID} GP_UPDATE_ERR: " . $e->getMessage());
}

error_log("RID={$RID} GP_PURCHASE user={$userId} tier={$tierInput} price={$totalFormatted} paypal_order={$orderResult['id']}");

gp_ok(array(
  'url' => $orderResult['approve_url'],
  'paypal_order_id' => $orderResult['id'],
  'tier' => $tierInput,
  'total_cents' => $totalCents,
  'purchase_id' => (int)$purchaseId,
));
