<?php
/**
 * gamepass_purchase.php - Create Stripe Checkout for Game Pass purchase
 * PHP 5.x compatible
 *
 * POST { tier: "elite" | "gold" }
 * Returns { success: true, url: "https://checkout.stripe.com/..." }
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';
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
// Allow elite -> gold upgrade
if ($existingTier === 'elite' && $tierInput === 'gold') {
  $isUpgrade = true;
}

// Stripe config
$cfg = getConfig();
$stripeCfg = isset($cfg['stripe']) ? $cfg['stripe'] : array();
$secretKey = isset($stripeCfg['secret_key']) ? $stripeCfg['secret_key'] : '';
if ($secretKey === '') json_fail_gp(500, 'Stripe not configured');
$currency = isset($stripeCfg['currency']) ? $stripeCfg['currency'] : 'eur';

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

// If upgrading from elite to gold, charge the difference
$unitAmount = $tierPrices[$tierInput];
$productName = $tierNames[$tierInput];
if ($isUpgrade && $existingTier === 'elite' && $tierInput === 'gold') {
  $unitAmount = $tierPrices['gold'] - $tierPrices['elite']; // 1000 cents = 10.00 EUR
  $productName = 'Gold Game Pass (Upgrade from Elite)';
}

// Success/cancel URLs
$baseUrl = 'https://woiendgame.online';
$successUrl = $baseUrl . '/dashboard?gamepass_purchased=' . $tierInput . '&session_id={CHECKOUT_SESSION_ID}';
$cancelUrl  = $baseUrl . '/dashboard';

// Build Stripe Checkout session
$fields = array(
  'mode' => 'payment',
  'success_url' => $successUrl,
  'cancel_url' => $cancelUrl,
  'client_reference_id' => (string)$userId,
  'metadata[user_id]' => (string)$userId,
  'metadata[type]' => 'gamepass',
  'metadata[tier]' => $tierInput,
  'metadata[rid]' => $RID,
  'metadata[upgrade]' => $isUpgrade ? '1' : '0',
  'line_items[0][price_data][currency]' => $currency,
  'line_items[0][price_data][unit_amount]' => $unitAmount,
  'line_items[0][price_data][product_data][name]' => $productName,
  'line_items[0][price_data][product_data][metadata][type]' => 'gamepass',
  'line_items[0][price_data][product_data][metadata][tier]' => $tierInput,
  'line_items[0][quantity]' => 1,
);

$body = http_build_query($fields);

// Use stripeRequest from stripe_checkout.php pattern
$headers = array(
  'Authorization: Bearer ' . $secretKey,
  'Content-Type: application/x-www-form-urlencoded',
);

$opts = array(
  'http' => array(
    'method' => 'POST',
    'header' => implode("\r\n", $headers),
    'content' => $body,
    'ignore_errors' => true,
    'timeout' => 30,
  ),
  'ssl' => array(
    'verify_peer' => false,
    'verify_peer_name' => false,
  ),
);

$context = stream_context_create($opts);
$resp = @file_get_contents('https://api.stripe.com/v1/checkout/sessions', false, $context);

$code = 0;
if (isset($http_response_header) && is_array($http_response_header) && count($http_response_header) > 0) {
  if (preg_match('/HTTP\/\d+\.?\d*\s+(\d+)/', $http_response_header[0], $m)) {
    $code = (int)$m[1];
  }
}

if ($resp === false) {
  error_log("RID={$RID} GAMEPASS_STRIPE_ERR file_get_contents failed");
  json_fail_gp(502, 'Payment provider error');
}

$data = json_decode($resp, true);
if ($code < 200 || $code >= 300 || !is_array($data) || !isset($data['url'])) {
  error_log("RID={$RID} GAMEPASS_STRIPE_BAD code={$code} resp=" . substr($resp, 0, 500));
  json_fail_gp(502, 'Payment provider error');
}

// Save pending purchase record
try {
  $pdo = getDB();
  
  // Ensure user_gamepass table has tier column
  try {
    $pdo->exec("ALTER TABLE user_gamepass ADD COLUMN tier VARCHAR(10) DEFAULT 'free'");
  } catch (Exception $e) { /* column exists */ }
  try {
    $pdo->exec("ALTER TABLE user_gamepass ADD COLUMN stripe_session_id VARCHAR(255) DEFAULT NULL");
  } catch (Exception $e) { /* column exists */ }
  
  // Create gamepass_purchases log table
  $pdo->exec("CREATE TABLE IF NOT EXISTS gamepass_purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tier VARCHAR(10) NOT NULL,
    stripe_session_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at DATETIME NOT NULL,
    completed_at DATETIME DEFAULT NULL,
    INDEX idx_user (user_id),
    INDEX idx_session (stripe_session_id),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
  
  $stmt = $pdo->prepare("INSERT INTO gamepass_purchases (user_id, tier, stripe_session_id, status, created_at) VALUES (?, ?, ?, 'pending', NOW())");
  $stmt->execute(array($userId, $tierInput, $data['id']));
  
  error_log("RID={$RID} GAMEPASS_PURCHASE user={$userId} tier={$tierInput} session={$data['id']}");
} catch (Exception $e) {
  error_log("RID={$RID} GAMEPASS_PURCHASE_DB_ERR: " . $e->getMessage());
}

json_out_gp(200, array('success' => true, 'url' => (string)$data['url'], 'session_id' => (string)$data['id']));
