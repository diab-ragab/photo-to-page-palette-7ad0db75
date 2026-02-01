<?php
/**
 * stripe_checkout.php - Create Stripe Checkout session (no Stripe SDK)
 * PHP 5.1+ compatible
 *
 * Frontend flow:
 *  - POST { items: [{id,name,price,quantity}] }
 *  - Returns { success: true, url: "https://checkout.stripe.com/..." }
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

define('VERSION', '2026-02-01-A');

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

if (ob_get_level() === 0) { ob_start(); }
header('Content-Type: application/json; charset=utf-8');

// ---------- helpers ----------
function _rid_sc() {
  if (function_exists('random_bytes')) return bin2hex(random_bytes(6));
  if (function_exists('openssl_random_pseudo_bytes')) return bin2hex(openssl_random_pseudo_bytes(6));
  return substr(md5(uniqid('', true)), 0, 12);
}

$rid = _rid_sc();

function jsonOutSC($data) {
  if (ob_get_length()) { ob_clean(); }
  $flags = 0;
  if (defined('JSON_UNESCAPED_UNICODE')) { $flags = JSON_UNESCAPED_UNICODE; }
  echo json_encode(array_merge($data, array('_version' => VERSION)), $flags);
  exit;
}

function failSC($code, $msg) {
  global $rid;
  http_response_code($code);
  jsonOutSC(array('success' => false, 'message' => $msg, 'rid' => $rid));
}

function getBearerTokenSC() {
  $auth = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
  if (stripos($auth, 'Bearer ') === 0) return trim(substr($auth, 7));
  $hdr = isset($_SERVER['HTTP_X_SESSION_TOKEN']) ? $_SERVER['HTTP_X_SESSION_TOKEN'] : '';
  if ($hdr) return trim($hdr);
  return '';
}

function stripeRequest($method, $url, $secretKey, $body = null) {
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
  curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Authorization: Bearer ' . $secretKey,
    'Content-Type: application/x-www-form-urlencoded',
  ));
  if ($body !== null) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
  }
  $resp = curl_exec($ch);
  $err  = curl_error($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return array($code, $resp, $err);
}

// ---------- method ----------
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'POST') failSC(405, 'Method not allowed');

// ---------- parse JSON ----------
$raw = file_get_contents('php://input');
$payload = array();
if (is_string($raw) && $raw !== '') {
  $j = json_decode($raw, true);
  if (is_array($j)) $payload = $j;
}

$items = isset($payload['items']) && is_array($payload['items']) ? $payload['items'] : array();
if (count($items) < 1) failSC(400, 'Cart items required');

// ---------- auth user via session token ----------
$token = getBearerTokenSC();
if ($token === '') failSC(401, 'Missing session token');

try {
  $pdo = getDB();
} catch (Exception $e) {
  error_log("RID={$rid} DB_CONNECT_FAIL=" . $e->getMessage());
  failSC(503, 'Service temporarily unavailable');
}

try {
  $stmt = $pdo->prepare("SELECT user_id, expires_at FROM user_sessions WHERE session_token = ? LIMIT 1");
  $stmt->execute(array($token));
  $sess = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$sess) failSC(401, 'Invalid session');
if (strtotime($sess['expires_at']) <= time()) {
  // extend session for checkout (24h)
  $pdo->prepare("UPDATE user_sessions SET expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE session_token = ?")
      ->execute(array($token));
}
  $userId = (int)$sess['user_id'];
} catch (Exception $e) {
  error_log("RID={$rid} SESSION_LOOKUP_FAIL=" . $e->getMessage());
  failSC(500, 'Server error');
}

// ---------- stripe config ----------
$cfg = getConfig();
$stripeCfg = isset($cfg['stripe']) ? $cfg['stripe'] : array();
$secretKey = isset($stripeCfg['secret_key']) ? $stripeCfg['secret_key'] : '';
if ($secretKey === '') {
  error_log("RID={$rid} STRIPE_SECRET_MISSING");
  failSC(500, 'Stripe not configured');
}
$currency = isset($stripeCfg['currency']) ? $stripeCfg['currency'] : 'eur';
$successUrl = isset($stripeCfg['success_url']) ? $stripeCfg['success_url'] : '';
$cancelUrl  = isset($stripeCfg['cancel_url']) ? $stripeCfg['cancel_url'] : '';

if ($secretKey === '') failSC(500, 'Stripe not configured (missing secret key)');
if ($successUrl === '' || $cancelUrl === '') failSC(500, 'Stripe not configured (missing redirect URLs)');

// ---------- build line_items ----------
// Security: do not trust client for quantity/price blindly; basic validation.
$lineItems = array();
$safeItems = array();

foreach ($items as $it) {
  if (!is_array($it)) continue;
  $id = isset($it['id']) ? trim((string)$it['id']) : '';
  $name = isset($it['name']) ? trim((string)$it['name']) : '';
  $price = isset($it['price']) ? (float)$it['price'] : 0.0;
  $qty = isset($it['quantity']) ? (int)$it['quantity'] : 1;

  if ($id === '' || $name === '') continue;
  if ($qty < 1) $qty = 1;
  if ($qty > 99) $qty = 99;
  if ($price <= 0) continue;

  // Stripe amount is integer minor units
  $unitAmount = (int)round($price * 100);
  if ($unitAmount < 50) continue; // avoid ultra-small charges

  $safeItems[] = array('id' => $id, 'name' => $name, 'price' => $price, 'quantity' => $qty);

  // Build form fields for Stripe Checkout session
  $idx = count($lineItems);
  $lineItems[] = array(
    "line_items[{$idx}][price_data][currency]" => $currency,
    "line_items[{$idx}][price_data][unit_amount]" => $unitAmount,
    "line_items[{$idx}][price_data][product_data][name]" => $name,
    "line_items[{$idx}][price_data][product_data][metadata][sku]" => $id,
    "line_items[{$idx}][quantity]" => $qty,
  );
}

if (count($lineItems) < 1) failSC(400, 'No valid items');

// Flatten into query string
$fields = array(
  'mode' => 'payment',
  'success_url' => $successUrl,
  'cancel_url' => $cancelUrl,
  'client_reference_id' => (string)$userId,
  'metadata[user_id]' => (string)$userId,
  'metadata[rid]' => $rid,
);

// add items
foreach ($lineItems as $li) {
  foreach ($li as $k => $v) $fields[$k] = $v;
}

$body = http_build_query($fields);

list($code, $resp, $err) = stripeRequest('POST', 'https://api.stripe.com/v1/checkout/sessions', $secretKey, $body);
if ($err) {
  error_log("RID={$rid} STRIPE_CURL_ERR=" . $err);
  failSC(502, 'Payment provider error');
}

$data = json_decode($resp, true);
if ($code < 200 || $code >= 300 || !is_array($data) || !isset($data['url'])) {
  error_log("RID={$rid} STRIPE_BAD_RESP code={$code} resp=" . substr($resp, 0, 500));
  failSC(502, 'Payment provider error');
}

// Optional: store pending order record (best-effort; works even if table not created yet)
try {
  $pdo->exec("CREATE TABLE IF NOT EXISTS stripe_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    currency VARCHAR(10) NOT NULL,
    amount_total INT NOT NULL DEFAULT 0,
    raw_items TEXT NULL,
    created_at DATETIME NULL,
    updated_at DATETIME NULL,
    UNIQUE KEY uniq_session (session_id),
    KEY idx_user (user_id),
    KEY idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

  $ins = $pdo->prepare("INSERT IGNORE INTO stripe_orders (user_id, session_id, status, currency, amount_total, raw_items, created_at, updated_at)
                        VALUES (?, ?, 'pending', ?, 0, ?, NOW(), NOW())");
  $ins->execute(array($userId, (string)$data['id'], $currency, json_encode($safeItems)));
} catch (Exception $e) {
  // ignore
}

jsonOutSC(array('success' => true, 'url' => (string)$data['url'], 'session_id' => (string)$data['id']));
