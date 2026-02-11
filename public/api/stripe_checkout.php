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
require_once __DIR__ . '/session_helper.php';
handleCors(array('POST', 'OPTIONS'));
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
  // Use session_helper's robust header reader if available
  if (function_exists('getSessionToken')) {
    $t = getSessionToken();
    if ($t !== '') return $t;
  }
  // Fallback: check multiple server vars
  $auth = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
  if ($auth === '' && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
  if ($auth !== '' && stripos($auth, 'Bearer ') === 0) {
    $t = trim(substr($auth, 7));
    if ($t !== '') return $t;
  }
  $hdr = isset($_SERVER['HTTP_X_SESSION_TOKEN']) ? $_SERVER['HTTP_X_SESSION_TOKEN'] : '';
  if ($hdr) return trim($hdr);
  // Query string fallback
  if (!empty($_GET['sessionToken'])) return trim((string)$_GET['sessionToken']);
  // JSON body fallback
  $body = getJsonInput();
  if (is_array($body) && !empty($body['sessionToken'])) return trim((string)$body['sessionToken']);
  return '';
}

function stripeRequest($method, $url, $secretKey, $body = null) {
  // Use file_get_contents instead of cURL for compatibility
  $headers = array(
    'Authorization: Bearer ' . $secretKey,
    'Content-Type: application/x-www-form-urlencoded',
  );
  
  $opts = array(
    'http' => array(
      'method' => $method,
      'header' => implode("\r\n", $headers),
      'ignore_errors' => true, // Get response even on 4xx/5xx
      'timeout' => 30,
    ),
    'ssl' => array(
      'verify_peer' => true,
      'verify_peer_name' => true,
    ),
  );
  
  if ($body !== null) {
    $opts['http']['content'] = $body;
  }
  
  $context = stream_context_create($opts);
  $resp = @file_get_contents($url, false, $context);
  
  // Parse HTTP response code from headers
  $code = 0;
  $err = '';
  if (isset($http_response_header) && is_array($http_response_header) && count($http_response_header) > 0) {
    // First line: "HTTP/1.1 200 OK"
    if (preg_match('/HTTP\/\d+\.?\d*\s+(\d+)/', $http_response_header[0], $m)) {
      $code = (int)$m[1];
    }
  }
  
  if ($resp === false) {
    $err = 'file_get_contents failed';
    $resp = '';
  }
  
  return array($code, $resp, $err);
}

// ---------- method ----------
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'POST') failSC(405, 'Method not allowed');

// ---------- parse JSON (use cached input from bootstrap) ----------
$payload = getJsonInput();

$items = isset($payload['items']) && is_array($payload['items']) ? $payload['items'] : array();
if (count($items) < 1) failSC(400, 'Cart items required');

// Get selected character for delivery
$characterId = isset($payload['character_id']) ? (int)$payload['character_id'] : 0;
$characterName = isset($payload['character_name']) ? trim((string)$payload['character_name']) : '';

if ($characterId <= 0) {
  failSC(400, 'Please select a character to receive the items');
}

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
  // Try resolveSessionRow from session_helper (raw + hash + optional columns)
  $sess = null;
  if (function_exists('resolveSessionRow')) {
    $sess = resolveSessionRow($token);
  }
  // Fallback: manual lookup with raw then hash
  if (!$sess) {
    $stmt = $pdo->prepare("SELECT user_id, expires_at FROM user_sessions WHERE session_token = ? LIMIT 1");
    $stmt->execute(array($token));
    $sess = $stmt->fetch(PDO::FETCH_ASSOC);
  }
  if (!$sess) {
    $tokenHash = hash('sha256', $token);
    $stmt = $pdo->prepare("SELECT user_id, expires_at FROM user_sessions WHERE session_token = ? LIMIT 1");
    $stmt->execute(array($tokenHash));
    $sess = $stmt->fetch(PDO::FETCH_ASSOC);
  }
  
  if (!$sess) {
    error_log("RID={$rid} SESSION_NOT_FOUND token=" . substr($token, 0, 20) . "...");
    failSC(401, 'Invalid session');
  }
  
  $userId = (int)$sess['user_id'];
  error_log("RID={$rid} SESSION_FOUND user_id={$userId} expires=" . (isset($sess['expires_at']) ? $sess['expires_at'] : 'N/A'));
  
  if ($userId <= 0) {
    error_log("RID={$rid} INVALID_USER_ID session has user_id=0");
    failSC(401, 'Invalid user session');
  }
  
  if (strtotime($sess['expires_at']) <= time()) {
    // extend session for checkout (24h)
    $pdo->prepare("UPDATE user_sessions SET expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE session_token = ?")
        ->execute(array($tokenHash));
    error_log("RID={$rid} SESSION_EXTENDED user={$userId}");
  }
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

// Create order records in webshop_orders for each item
try {
  // Ensure webshop_orders table has character_id column
  $pdo->exec("CREATE TABLE IF NOT EXISTS webshop_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    character_id INT NOT NULL DEFAULT 0,
    character_name VARCHAR(50) DEFAULT NULL,
    total_coins INT NOT NULL DEFAULT 0,
    total_vip INT NOT NULL DEFAULT 0,
    total_zen INT NOT NULL DEFAULT 0,
    total_real DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    stripe_session_id VARCHAR(255) DEFAULT NULL,
    stripe_payment_intent VARCHAR(255) DEFAULT NULL,
    delivered_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_session (stripe_session_id),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

  // Migration: add character_id column if missing
  try {
    $pdo->exec("ALTER TABLE webshop_orders ADD COLUMN character_id INT NOT NULL DEFAULT 0 AFTER quantity");
  } catch (Exception $e) {
    // Column already exists
  }
  try {
    $pdo->exec("ALTER TABLE webshop_orders ADD COLUMN character_name VARCHAR(50) DEFAULT NULL AFTER character_id");
  } catch (Exception $e) {
    // Column already exists
  }

  // Create order for each item in cart
  $sessionIdStr = (string)$data['id'];
  $ordersCreated = 0;
  
  foreach ($safeItems as $item) {
    $productId = isset($item['id']) ? (int)$item['id'] : 0;
    $qty = isset($item['quantity']) ? (int)$item['quantity'] : 1;
    $price = isset($item['price']) ? (float)$item['price'] : 0;
    $totalReal = $price * $qty;
    
    $ins = $pdo->prepare("
      INSERT INTO webshop_orders 
      (user_id, product_id, quantity, character_id, character_name, total_real, status, stripe_session_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW())
    ");
    $ins->execute(array($userId, $productId, $qty, $characterId, $characterName, $totalReal, $sessionIdStr));
    $newOrderId = $pdo->lastInsertId();
    $ordersCreated++;
    
    error_log("RID={$rid} ORDER_CREATED id={$newOrderId} user={$userId} product={$productId} qty={$qty} char={$characterId} ({$characterName}) total={$totalReal}");
    
    error_log("RID={$rid} ORDER_CREATED id={$newOrderId} user={$userId} product={$productId} qty={$qty} total={$totalReal}");
  }
  
  error_log("RID={$rid} CHECKOUT_COMPLETE session={$sessionIdStr} user={$userId} orders_created={$ordersCreated}");
} catch (Exception $e) {
  error_log("RID={$rid} ORDER_CREATE_ERR=" . $e->getMessage());
  // Don't fail - let webhook handle order creation as fallback
}

jsonOutSC(array('success' => true, 'url' => (string)$data['url'], 'session_id' => (string)$data['id']));
