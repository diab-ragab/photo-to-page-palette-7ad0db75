<?php
/**
 * gamepass_purchase.php - Create PayPal order to purchase Premium Game Pass
 * POST { character_name: "..." }
 * Returns { success: true, url: "...", paypal_order_id: "..." }
 * PHP 5.3+ compatible - GLOBAL 30-DAY SEASON MODEL
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

// Input
$input = getJsonInput();
$characterName = isset($input['character_name']) ? trim((string)$input['character_name']) : '';

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

// Check if user already has an active premium pass
$stmt = $pdo->prepare("SELECT tier, expires_at FROM user_gamepass WHERE user_id = ?");
$stmt->execute(array($userId));
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existing) {
  $ct = isset($existing['tier']) ? $existing['tier'] : 'free';
  if ($ct === 'premium') {
    $expAt = isset($existing['expires_at']) ? $existing['expires_at'] : null;
    $isActive = ($expAt !== null) ? isGamePassActiveByExpiry($expAt) : false;
    if ($isActive) {
      gp_fail(400, 'You already have an active Premium Pass. Use extend to add more days.');
    }
  }
}

// Read price from settings
$premiumCents = 999;
try {
  $priceStmt = $pdo->prepare("SELECT setting_value FROM gamepass_settings WHERE setting_key = 'premium_price_cents' LIMIT 1");
  $priceStmt->execute();
  $priceRow = $priceStmt->fetch(PDO::FETCH_ASSOC);
  if ($priceRow) {
    $v = (int)$priceRow['setting_value'];
    if ($v > 0) $premiumCents = $v;
  }
} catch (Exception $e) {}

// Also check site_settings
try {
  $priceStmt = $pdo->prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'gamepass_premium_price' LIMIT 1");
  $priceStmt->execute();
  $priceRow = $priceStmt->fetch(PDO::FETCH_ASSOC);
  if ($priceRow) {
    $v = (int)$priceRow['setting_value'];
    if ($v > 0) $premiumCents = $v;
  }
} catch (Exception $e) {}

$totalCents = $premiumCents;
if ($totalCents < 50) $totalCents = 50;

$totalFormatted = number_format($totalCents / 100, 2, '.', '');
$productName = 'Premium Game Pass - Season ' . $seasonNumber;

// PayPal
$ppCfg = getPayPalConfig();
if ($ppCfg['client_id'] === '' || $ppCfg['secret'] === '') {
  gp_fail(500, 'Payment not configured');
}

// Insert pending purchase
$days = 30;
$stmt = $pdo->prepare("INSERT INTO gamepass_purchases (user_id, tier, price_cents, price_eur, character_name, days, status, rid, created_at) VALUES (?, 'premium', ?, ?, ?, ?, 'pending', ?, NOW())");
$stmt->execute(array($userId, $totalCents, number_format($totalCents / 100, 2, '.', ''), $characterName, $days, $RID));
$purchaseId = $pdo->lastInsertId();

// Get PayPal token
$tokenResult = getPayPalAccessToken($ppCfg['client_id'], $ppCfg['secret'], $ppCfg['sandbox']);
if ($tokenResult['error'] !== '') {
  gp_fail(502, 'Payment provider error');
}

$purchaseUnits = array(
  array(
    'description' => $productName,
    'custom_id' => json_encode(array(
      'type' => 'gamepass_purchase',
      'user_id' => $userId,
      'tier' => 'premium',
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

$successUrl = 'https://woiendgame.online/dashboard?gamepass_purchased=premium&paypal=1&purchase_id=' . $purchaseId;
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
  try {
    $pdo->prepare("UPDATE gamepass_purchases SET status = 'failed' WHERE id = ?")->execute(array($purchaseId));
  } catch (Exception $e) {}
  gp_fail(502, 'Payment provider error');
}

// Save PayPal order ID
try {
  $pdo->prepare("UPDATE gamepass_purchases SET paypal_order_id = ? WHERE id = ?")->execute(array($orderResult['id'], $purchaseId));
} catch (Exception $e) {}

error_log("RID={$RID} GP_PURCHASE user={$userId} tier=premium price={$totalFormatted} paypal_order={$orderResult['id']}");

gp_ok(array(
  'url' => $orderResult['approve_url'],
  'paypal_order_id' => $orderResult['id'],
  'tier' => 'premium',
  'total_cents' => $totalCents,
  'purchase_id' => (int)$purchaseId,
));
