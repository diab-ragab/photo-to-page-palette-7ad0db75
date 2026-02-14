<?php
/**
 * gamepass_extend.php - Create PayPal order to extend Game Pass duration
 * PHP 5.x compatible
 *
 * POST { tier: "elite"|"gold", days: int }
 * Returns { success: true, url: "...", paypal_order_id: "..." }
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/paypal_helper.php';
require_once __DIR__ . '/gamepass_helpers.php';
handleCors(array('POST', 'OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = substr(md5(uniqid(mt_rand(), true)), 0, 12);

function json_out_ext($code, $payload) {
  while (ob_get_level()) { @ob_end_clean(); }
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($payload);
  exit;
}

function json_fail_ext($code, $msg) {
  global $RID;
  json_out_ext($code, array('success' => false, 'error' => $msg, 'rid' => $RID));
}

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'POST') json_fail_ext(405, 'Method not allowed');

// Auth
$user = getCurrentUser();
if (!$user) json_fail_ext(401, 'Not authenticated');
$userId = (int)$user['user_id'];

// Parse input
$input = getJsonInput();
$tierInput = isset($input['tier']) ? strtolower(trim($input['tier'])) : '';
$days = isset($input['days']) ? (int)$input['days'] : 0;

if (!in_array($tierInput, array('elite', 'gold'))) {
  json_fail_ext(400, 'Invalid tier. Must be elite or gold.');
}
if ($days < 1 || $days > 90) {
  json_fail_ext(400, 'Days must be between 1 and 90.');
}

$pdo = getDB();
ensureGamePassTables($pdo);
ensureExtensionTable($pdo);

// Must have an active pass of this tier (or gold covers elite)
$stmt = $pdo->prepare("SELECT tier, expires_at, is_premium FROM user_gamepass WHERE user_id = ?");
$stmt->execute(array($userId));
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

$currentTier = 'free';
if ($existing) {
  $ct = isset($existing['tier']) ? $existing['tier'] : 'free';
  if (in_array($ct, array('elite', 'gold'))) {
    $currentTier = $ct;
  }
}

// Allow extending if user has the same tier or higher
$tierRank = array('free' => 0, 'elite' => 1, 'gold' => 2);
$userRank = isset($tierRank[$currentTier]) ? $tierRank[$currentTier] : 0;
$reqRank = isset($tierRank[$tierInput]) ? $tierRank[$tierInput] : 0;

// User can extend their current tier, or buy extension for a tier they have access to
// Gold users can extend gold. Elite users can extend elite. Free users must buy a pass first.
if ($userRank < $reqRank) {
  json_fail_ext(400, 'You need an active ' . ucfirst($tierInput) . ' Pass to extend it. Purchase one first.');
}

// If user has gold but wants to extend elite, that doesn't make sense - extend gold instead
if ($currentTier === 'gold' && $tierInput === 'elite') {
  json_fail_ext(400, 'You have a Gold Pass. Please extend your Gold Pass instead.');
}

// Read per-day price from settings
$elitePerDayCents = 0;
$goldPerDayCents = 0;
try {
  $priceStmt = $pdo->prepare("SELECT setting_key, setting_value FROM gamepass_settings WHERE setting_key IN ('elite_price_cents', 'gold_price_cents', 'elite_extend_per_day_cents', 'gold_extend_per_day_cents')");
  $priceStmt->execute();
  $priceRows = $priceStmt->fetchAll(PDO::FETCH_ASSOC);
  $eliteBaseCents = 999;
  $goldBaseCents = 1999;
  foreach ($priceRows as $pr) {
    if ($pr['setting_key'] === 'elite_price_cents') $eliteBaseCents = (int)$pr['setting_value'];
    if ($pr['setting_key'] === 'gold_price_cents') $goldBaseCents = (int)$pr['setting_value'];
    if ($pr['setting_key'] === 'elite_extend_per_day_cents') $elitePerDayCents = (int)$pr['setting_value'];
    if ($pr['setting_key'] === 'gold_extend_per_day_cents') $goldPerDayCents = (int)$pr['setting_value'];
  }
  // Default per-day = base price / 30 (rounded up)
  if ($elitePerDayCents <= 0) $elitePerDayCents = (int)ceil($eliteBaseCents / 30);
  if ($goldPerDayCents <= 0) $goldPerDayCents = (int)ceil($goldBaseCents / 30);
} catch (Exception $e) {
  error_log("RID={$RID} EXTEND_PRICE_ERR: " . $e->getMessage());
  // Fallback
  $elitePerDayCents = 34; // ~999/30
  $goldPerDayCents = 67;  // ~1999/30
}

$perDayCents = ($tierInput === 'gold') ? $goldPerDayCents : $elitePerDayCents;
$totalCents = $perDayCents * $days;

if ($totalCents < 50) $totalCents = 50; // PayPal minimum

$priceEur = round($totalCents / 100, 2);
$totalFormatted = number_format($priceEur, 2, '.', '');
$tierLabel = ($tierInput === 'gold') ? 'Gold' : 'Elite';
$productName = $tierLabel . ' Pass Extension (' . $days . ' days)';

// PayPal config
$ppCfg = getPayPalConfig();
if ($ppCfg['client_id'] === '' || $ppCfg['secret'] === '') {
  json_fail_ext(500, 'Payment not configured');
}

// Insert pending extension record
$stmt = $pdo->prepare("INSERT INTO gamepass_extensions (user_id, tier, days_added, price_eur, status, created_at) VALUES (?, ?, ?, ?, 'pending', NOW())");
$stmt->execute(array($userId, $tierInput, $days, $priceEur));
$extensionId = $pdo->lastInsertId();

// Get PayPal token
$tokenResult = getPayPalAccessToken($ppCfg['client_id'], $ppCfg['secret'], $ppCfg['sandbox']);
if ($tokenResult['error'] !== '') {
  error_log("RID={$RID} EXTEND_PP_TOKEN_ERR: " . $tokenResult['error']);
  json_fail_ext(502, 'Payment provider error');
}

$purchaseUnits = array(
  array(
    'description' => $productName,
    'amount' => array(
      'currency_code' => $ppCfg['currency'],
      'value' => $totalFormatted,
    ),
  ),
);

$metadata = array(
  'user_id' => $userId,
  'type' => 'gamepass_extend',
  'tier' => $tierInput,
  'days' => $days,
  'extension_id' => (int)$extensionId,
  'rid' => $RID,
);

$successUrl = 'https://woiendgame.online/dashboard?gamepass_extended=' . $days . '&paypal=1';
$cancelUrl  = 'https://woiendgame.online/dashboard';

$orderResult = paypalCreateOrder(
  $tokenResult['token'],
  $purchaseUnits,
  $successUrl,
  $cancelUrl,
  $metadata,
  $ppCfg['sandbox']
);

if ($orderResult['error'] !== '') {
  error_log("RID={$RID} EXTEND_PP_ORDER_ERR: " . $orderResult['error']);
  try {
    $stmt = $pdo->prepare("UPDATE gamepass_extensions SET status = 'failed' WHERE id = ?");
    $stmt->execute(array($extensionId));
  } catch (Exception $e) {}
  json_fail_ext(502, 'Payment provider error');
}

// Update with paypal order ID
try {
  $stmt = $pdo->prepare("UPDATE gamepass_extensions SET paypal_order_id = ? WHERE id = ?");
  $stmt->execute(array($orderResult['id'], $extensionId));
} catch (Exception $e) {
  error_log("RID={$RID} EXTEND_UPDATE_ERR: " . $e->getMessage());
}

error_log("RID={$RID} EXTEND_PURCHASE user={$userId} tier={$tierInput} days={$days} price={$totalFormatted} paypal_order={$orderResult['id']}");

json_out_ext(200, array(
  'success' => true,
  'url' => $orderResult['approve_url'],
  'paypal_order_id' => $orderResult['id'],
  'days' => $days,
  'total_eur' => $priceEur,
  'per_day_cents' => $perDayCents,
  'rid' => $RID
));
