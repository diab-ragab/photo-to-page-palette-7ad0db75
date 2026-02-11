<?php
/**
 * order_status.php - Fetch Stripe order details by Checkout Session ID
 * PHP 5.1+ compatible
 *
 * GET /api/order_status.php?session_id=cs_...
 * Requires user session token (Bearer or X-Session-Token)
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

define('VERSION', '2026-02-01-A');

require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET', 'OPTIONS'));

if (ob_get_level() === 0) { ob_start(); }
header('Content-Type: application/json; charset=utf-8');

function _rid_os() {
  if (function_exists('random_bytes')) return bin2hex(random_bytes(6));
  if (function_exists('openssl_random_pseudo_bytes')) return bin2hex(openssl_random_pseudo_bytes(6));
  return substr(md5(uniqid('', true)), 0, 12);
}

$rid = _rid_os();

function os_out($code, $arr) {
  if (ob_get_length()) { @ob_clean(); }
  http_response_code($code);
  $flags = 0;
  if (defined('JSON_UNESCAPED_UNICODE')) $flags = JSON_UNESCAPED_UNICODE;
  echo json_encode(array_merge($arr, array('_version' => VERSION)), $flags);
  exit;
}

function os_fail($code, $msg) {
  global $rid;
  os_out($code, array('success' => false, 'message' => $msg, 'rid' => $rid));
}

function os_token() {
  $auth = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
  if (stripos($auth, 'Bearer ') === 0) return trim(substr($auth, 7));
  $hdr = isset($_SERVER['HTTP_X_SESSION_TOKEN']) ? $_SERVER['HTTP_X_SESSION_TOKEN'] : '';
  if ($hdr) return trim($hdr);
  return '';
}

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'GET') os_fail(405, 'Method not allowed');

$sessionId = isset($_GET['session_id']) ? trim((string)$_GET['session_id']) : '';
if ($sessionId === '') os_fail(400, 'Missing session_id');

$token = os_token();
if ($token === '') os_fail(401, 'Missing session token');

try {
  $pdo = getDB();
} catch (Exception $e) {
  error_log("RID={$rid} DB_CONNECT_FAIL=" . $e->getMessage());
  os_fail(503, 'Service temporarily unavailable');
}

// Validate user session
try {
  $tokenHash = hash('sha256', $token);
  $stmt = $pdo->prepare("SELECT user_id, expires_at FROM user_sessions WHERE session_token = ? LIMIT 1");
  $stmt->execute(array($tokenHash));
  $sess = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$sess) os_fail(401, 'Invalid session');
  if (strtotime($sess['expires_at']) <= time()) os_fail(401, 'Session expired');
  $userId = (int)$sess['user_id'];
} catch (Exception $e) {
  error_log("RID={$rid} SESSION_LOOKUP_FAIL=" . $e->getMessage());
  os_fail(500, 'Server error');
}

// Ensure table exists (safe)
try {
  $pdo->exec("CREATE TABLE IF NOT EXISTS stripe_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    payment_intent VARCHAR(255) NULL,
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
} catch (Exception $e) {
  // ignore
}

// Load order (must belong to user)
try {
  $stmt = $pdo->prepare("SELECT user_id, session_id, payment_intent, status, currency, amount_total, raw_items, created_at, updated_at
                         FROM stripe_orders WHERE session_id = ? LIMIT 1");
  $stmt->execute(array($sessionId));
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$row) os_fail(404, 'Order not found');
  if ((int)$row['user_id'] !== $userId) os_fail(403, 'Forbidden');

  $items = array();
  if (!empty($row['raw_items'])) {
    $decoded = json_decode((string)$row['raw_items'], true);
    if (is_array($decoded)) $items = $decoded;
  }

  os_out(200, array(
    'success' => true,
    'order' => array(
      'session_id' => (string)$row['session_id'],
      'payment_intent' => (string)($row['payment_intent'] ? $row['payment_intent'] : ''),
      'status' => (string)$row['status'],
      'currency' => (string)$row['currency'],
      'amount_total' => (int)$row['amount_total'],
      'items' => $items,
      'created_at' => (string)($row['created_at'] ? $row['created_at'] : ''),
      'updated_at' => (string)($row['updated_at'] ? $row['updated_at'] : ''),
    )
  ));

} catch (Exception $e) {
  error_log("RID={$rid} ORDER_LOOKUP_FAIL=" . $e->getMessage());
  os_fail(500, 'Server error');
}
