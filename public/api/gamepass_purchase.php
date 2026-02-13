<?php
/**
 * gamepass_purchase.php - Create PayPal Checkout for Game Pass purchase
 * PHP 5.x compatible
 *
 * POST { tier: "elite" | "gold" }
 * Returns { success: true, url: "https://www.paypal.com/checkoutnow?token=..." }
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/paypal_helper.php';
handleCors(array('POST', 'OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = substr(md5(uniqid(mt_rand(), true)), 0, 12);

function json_out_gp($code, $payload) {
  while (ob_get_level()) { @ob_end_clean(); }
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($payload);
  exit;
}

function json_fail_gp($code, $msg) {
  global $RID;
  json_out_gp($code, array('success' => false, 'error' => $msg, 'rid' => $RID));
}

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'POST') json_fail_gp(405, 'Method not allowed');

// Auth
$user = getCurrentUser();
if (!$user) json_fail_gp(401, 'Not authenticated');
$userId = (int)$user['user_id'];

// Parse input
$input = getJsonInput();
$tierInput = isset($input['tier']) ? $input['tier'] : '';
if (!in_array($tierInput, array('elite', 'gold'))) {
  json_fail_gp(400, 'Invalid tier. Must be elite or gold.');
}

$isUpgrade = isset($input['upgrade']) && ($input['upgrade'] === true || $input['upgrade'] === 'true' || $input['upgrade'] === '1');

// One tier per user - check if user already has an active pass
$pdo = getDB();
$existingTier = 'free';
try {
  $stmt = $pdo->prepare("SELECT tier, expires_at, is_premium FROM user_gamepass WHERE user_id = ?");
  $stmt->execute(array($userId));
  $existing = $stmt->fetch(PDO::FETCH_ASSOC);
  if ($existing) {
    $expiresAt = isset($existing['expires_at']) ? $existing['expires_at'] : null;
    $isActive = ($expiresAt === null || strtotime($expiresAt) > time());
    $et = isset($existing['tier']) ? $existing['tier'] : ((int)$existing['is_premium'] === 1 ? 'elite' : 'free');
    if ($isActive && in_array($et, array('elite', 'gold'))) {
      $existingTier = $et;
    }
  }
} catch (Exception $e) {
  error_log("RID={$RID} GAMEPASS_TIER_CHECK_ERR: " . $e->getMessage());
}

// Block duplicate or downgrade purchase
if ($existingTier === 'gold') {
  json_fail_gp(400, 'You already have an active Gold Game Pass.');
}
if ($existingTier === 'elite' && $tierInput === 'elite') {
  json_fail_gp(400, 'You already have an active Elite Game Pass.');
}
if ($existingTier === 'elite' && $tierInput === 'gold') {
  $isUpgrade = true;
}

// PayPal config
$ppCfg = getPayPalConfig();
if ($ppCfg['client_id'] === '' || $ppCfg['secret'] === '') {
  json_fail_gp(500, 'Payment not configured');
}

// Prices in cents - read from DB settings, fallback to defaults
$elitePriceCents = 999;
$goldPriceCents = 1999;
try {
  $priceStmt = $pdo->prepare("SELECT setting_key, setting_value FROM gamepass_settings WHERE setting_key IN ('elite_price_cents', 'gold_price_cents')");
  $priceStmt->execute();
  $priceRows = $priceStmt->fetchAll(PDO::FETCH_ASSOC);
  foreach ($priceRows as $pr) {
    if ($pr['setting_key'] === 'elite_price_cents') $elitePriceCents = (int)$pr['setting_value'];
    if ($pr['setting_key'] === 'gold_price_cents') $goldPriceCents = (int)$pr['setting_value'];
  }
} catch (Exception $e) {
  error_log("RID={$RID} GAMEPASS_PRICE_READ_ERR: " . $e->getMessage());
}

$tierPrices = array(
  'elite' => $elitePriceCents,
  'gold'  => $goldPriceCents,
);
$tierNames = array(
  'elite' => 'Elite Game Pass',
  'gold'  => 'Gold Game Pass',
);

$unitAmountCents = $tierPrices[$tierInput];
$productName = $tierNames[$tierInput];
if ($isUpgrade && $existingTier === 'elite' && $tierInput === 'gold') {
  $productName = 'Gold Game Pass (Upgrade from Elite)';
}

// Convert cents to decimal for PayPal
$unitAmountDecimal = number_format($unitAmountCents / 100, 2, '.', '');

// Get PayPal access token
$tokenResult = getPayPalAccessToken($ppCfg['client_id'], $ppCfg['secret'], $ppCfg['sandbox']);
if ($tokenResult['error'] !== '') {
  error_log("RID={$RID} GAMEPASS_PP_TOKEN_ERR: " . $tokenResult['error']);
  json_fail_gp(502, 'Payment provider error');
}

// Build purchase units
$purchaseUnits = array(
  array(
    'description' => $productName,
    'amount' => array(
      'currency_code' => $ppCfg['currency'],
      'value' => $unitAmountDecimal,
    ),
  ),
);

$metadata = array(
  'user_id' => $userId,
  'type' => 'gamepass',
  'tier' => $tierInput,
  'rid' => $RID,
  'upgrade' => $isUpgrade ? '1' : '0',
);

$successUrl = 'https://woiendgame.online/dashboard?gamepass_purchased=' . $tierInput . '&paypal=1';
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
  error_log("RID={$RID} GAMEPASS_PP_ORDER_ERR: " . $orderResult['error']);
  json_fail_gp(502, 'Payment provider error');
}

// Save pending purchase record
try {
  try { $pdo->exec("ALTER TABLE user_gamepass ADD COLUMN tier VARCHAR(10) DEFAULT 'free'"); } catch (Exception $e) {}
  try { $pdo->exec("ALTER TABLE user_gamepass ADD COLUMN paypal_order_id VARCHAR(255) DEFAULT NULL"); } catch (Exception $e) {}

  $pdo->exec("CREATE TABLE IF NOT EXISTS gamepass_purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tier VARCHAR(10) NOT NULL,
    paypal_order_id VARCHAR(255) DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at DATETIME NOT NULL,
    completed_at DATETIME DEFAULT NULL,
    INDEX idx_user (user_id),
    INDEX idx_paypal_order (paypal_order_id),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

  $stmt = $pdo->prepare("INSERT INTO gamepass_purchases (user_id, tier, paypal_order_id, status, created_at) VALUES (?, ?, ?, 'pending', NOW())");
  $stmt->execute(array($userId, $tierInput, $orderResult['id']));

  error_log("RID={$RID} GAMEPASS_PURCHASE user={$userId} tier={$tierInput} paypal_order={$orderResult['id']}");
} catch (Exception $e) {
  error_log("RID={$RID} GAMEPASS_PURCHASE_DB_ERR: " . $e->getMessage());
}

json_out_gp(200, array('success' => true, 'url' => $orderResult['approve_url'], 'paypal_order_id' => $orderResult['id']));
