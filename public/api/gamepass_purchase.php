<?php
/**
 * gamepass_purchase.php - Create PayPal Checkout for Game Pass purchase
 * PHP 5.x compatible
 *
 * POST { tier: "free" | "elite" | "gold" }
 * Returns:
 *   free  => { success: true, message: "Free Pass activated" }
 *   elite/gold => { success: true, url: "https://...", paypal_order_id: "..." }
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
$tierInput = isset($input['tier']) ? strtolower(trim($input['tier'])) : '';
if (!in_array($tierInput, array('free', 'elite', 'gold'))) {
  json_fail_gp(400, 'Invalid tier. Must be free, elite, or gold.');
}

$pdo = getDB();
ensureGamePassTables($pdo);

// ── Free Pass: activate immediately, no payment ──
if ($tierInput === 'free') {
  $result = autoActivateFreePass($pdo, $userId, $RID);
  json_out_gp(200, array(
    'success' => true,
    'message' => $result['new'] ? 'Free Pass activated!' : 'Free Pass already active.',
    'tier' => 'free',
    'rid' => $RID
  ));
}

// ── Paid Pass (elite / gold) ──

// Check current active pass
$existingTier = 'free';
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

// Block duplicate or same-tier purchase
if ($existingTier === $tierInput) {
  $label = ($tierInput === 'elite') ? 'Elite' : 'Gold';
  json_fail_gp(400, 'You already have an active ' . $label . ' Game Pass.');
}

// Block downgrade (gold -> elite not allowed as paid purchase)
if ($existingTier === 'gold' && $tierInput === 'elite') {
  json_fail_gp(400, 'You already have an active Gold Game Pass. Cannot purchase Elite.');
}

// PayPal config
$ppCfg = getPayPalConfig();
if ($ppCfg['client_id'] === '' || $ppCfg['secret'] === '') {
  json_fail_gp(500, 'Payment not configured');
}

// Prices - read from DB settings, fallback to defaults
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
  'elite' => 'Elite Pass',
  'gold'  => 'Gold Pass',
);

$unitAmountCents = $tierPrices[$tierInput];
$productName = $tierNames[$tierInput];
$priceEur = round($unitAmountCents / 100, 2);

// Convert cents to decimal for PayPal
$unitAmountDecimal = number_format($unitAmountCents / 100, 2, '.', '');

// Insert pending purchase record FIRST
$stmt = $pdo->prepare("INSERT INTO gamepass_purchases (user_id, tier, price_eur, status, created_at) VALUES (?, ?, ?, 'pending', NOW())");
$stmt->execute(array($userId, $tierInput, $priceEur));
$purchaseId = $pdo->lastInsertId();

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
  // Mark purchase as failed
  try {
    $stmt = $pdo->prepare("UPDATE gamepass_purchases SET status = 'failed' WHERE id = ?");
    $stmt->execute(array($purchaseId));
  } catch (Exception $e) {}
  json_fail_gp(502, 'Payment provider error');
}

// Update purchase record with paypal order ID
try {
  $stmt = $pdo->prepare("UPDATE gamepass_purchases SET paypal_order_id = ? WHERE id = ?");
  $stmt->execute(array($orderResult['id'], $purchaseId));
} catch (Exception $e) {
  error_log("RID={$RID} GAMEPASS_PURCHASE_UPDATE_ERR: " . $e->getMessage());
}

error_log("RID={$RID} GAMEPASS_PURCHASE user={$userId} tier={$tierInput} price={$unitAmountDecimal} paypal_order={$orderResult['id']}");

json_out_gp(200, array(
  'success' => true,
  'url' => $orderResult['approve_url'],
  'paypal_order_id' => $orderResult['id'],
  'rid' => $RID
));
