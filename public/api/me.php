<?php
/**
 * me.php - Current user info + auto Free Pass activation
 * PHP 5.x compatible
 *
 * GET  - Returns user info + auto-activates free pass on first call
 * POST - Same behavior (for flexibility)
 *
 * Called by frontend after login to trigger one-time Free Pass activation
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/gamepass_helpers.php';
handleCors(array('GET', 'POST', 'OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = substr(md5(uniqid(mt_rand(), true)), 0, 12);

function json_out_me($code, $payload) {
  global $RID;
  while (ob_get_level()) { @ob_end_clean(); }
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  $payload['rid'] = $RID;
  echo json_encode($payload);
  exit;
}

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($method === 'OPTIONS') { http_response_code(204); exit; }

// Auth required
$user = getCurrentUser();
if (!$user) {
  json_out_me(401, array('success' => false, 'error' => 'Not authenticated'));
}

$userId = (int)$user['user_id'];
$username = isset($user['name']) ? $user['name'] : '';

$pdo = getDB();

// Auto-activate Free Pass (idempotent - only on first call)
$freePassResult = autoActivateFreePass($pdo, $userId, $RID);

// Get current gamepass info
$gamepass = array('tier' => 'free', 'is_premium' => false, 'expires_at' => null);
try {
  $stmt = $pdo->prepare("SELECT tier, is_premium, expires_at FROM user_gamepass WHERE user_id = ? LIMIT 1");
  $stmt->execute(array($userId));
  $gpRow = $stmt->fetch(PDO::FETCH_ASSOC);
  if ($gpRow) {
    $gamepass['tier'] = isset($gpRow['tier']) ? $gpRow['tier'] : 'free';
    $gamepass['is_premium'] = (int)$gpRow['is_premium'] === 1;
    $gamepass['expires_at'] = isset($gpRow['expires_at']) ? $gpRow['expires_at'] : null;
  }
} catch (Exception $e) {
  error_log("RID={$RID} ME_GAMEPASS_ERR: " . $e->getMessage());
}

// Check admin
$isAdmin = false;
if (function_exists('isUserAdmin')) {
  $isAdmin = isUserAdmin($userId, $username);
}

json_out_me(200, array(
  'success' => true,
  'user' => array(
    'id' => $userId,
    'username' => $username,
    'is_admin' => $isAdmin,
  ),
  'gamepass' => $gamepass,
  'free_pass_new' => isset($freePassResult['new']) ? $freePassResult['new'] : false,
));
