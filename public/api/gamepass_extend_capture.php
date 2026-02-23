<?php
/**
 * gamepass_extend_capture.php - Capture PayPal order and extend Game Pass
 * POST { paypal_order_id: "..." }
 * Returns { success: true, tier: "...", days_added: N, expires_at: "..." }
 * PHP 5.3+ compatible
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/paypal_helper.php';
require_once __DIR__ . '/gamepass_helpers.php';
handleCors(array('POST', 'OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();

function gec_ok($data) {
  global $RID;
  while (ob_get_level()) { @ob_end_clean(); }
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array_merge(array('success' => true, 'rid' => $RID), $data), JSON_UNESCAPED_UNICODE);
  exit;
}

function gec_fail($code, $msg) {
  global $RID;
  error_log("RID={$RID} GP_EXT_CAP_FAIL code={$code} msg={$msg}");
  while (ob_get_level()) { @ob_end_clean(); }
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array('success' => false, 'message' => $msg, 'rid' => $RID), JSON_UNESCAPED_UNICODE);
  exit;
}

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'POST') gec_fail(405, 'Method not allowed');

// Auth
$user = getCurrentUser();
if (!$user) gec_fail(401, 'Not authenticated');
$userId = (int)$user['user_id'];

// Input
$input = getJsonInput();
$ppOrderId = isset($input['paypal_order_id']) ? trim((string)$input['paypal_order_id']) : '';
if ($ppOrderId === '') gec_fail(400, 'paypal_order_id required');

$pdo = getDB();
ensureGamePassTables($pdo);
ensureExtensionTable($pdo);

// Find the pending extension
$stmt = $pdo->prepare("SELECT * FROM gamepass_extensions WHERE paypal_order_id = ? LIMIT 1");
$stmt->execute(array($ppOrderId));
$ext = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$ext) gec_fail(404, 'Extension order not found');

$extId = (int)$ext['id'];
$tier = $ext['tier'];
$daysAdded = (int)$ext['days_added'];

// Ownership check
if ((int)$ext['user_id'] !== $userId) {
  gec_fail(403, 'Not allowed');
}

// Idempotent: already completed
if ($ext['status'] === 'completed') {
  $gpStmt = $pdo->prepare("SELECT tier, activated_at, days_total, expires_at FROM user_gamepass WHERE user_id = ?");
  $gpStmt->execute(array($userId));
  $gpRow = $gpStmt->fetch(PDO::FETCH_ASSOC);
  $remDays = 0;
  if ($gpRow && isset($gpRow['activated_at']) && isset($gpRow['days_total'])) {
    $remDays = getGamePassRemainingDays($gpRow['activated_at'], $gpRow['days_total']);
  }
  gec_ok(array(
    'tier' => $tier,
    'days_added' => $daysAdded,
    'activated_at' => $gpRow ? $gpRow['activated_at'] : '',
    'days_total' => $gpRow ? (int)$gpRow['days_total'] : 0,
    'remaining_days' => $remDays,
    'expires_at' => $gpRow ? getGamePassExpiryDate($gpRow['activated_at'], $gpRow['days_total']) : '',
    'already_completed' => true,
  ));
}

// PayPal capture
$ppCfg = getPayPalConfig();
$tokenResult = getPayPalAccessToken($ppCfg['client_id'], $ppCfg['secret'], $ppCfg['sandbox']);
if ($tokenResult['error'] !== '') {
  error_log("RID={$RID} EXT_CAP_TOKEN_ERR: " . $tokenResult['error']);
  gec_fail(502, 'Payment provider error');
}

// Check PayPal order status
$orderCheck = paypalGetOrder($tokenResult['token'], $ppOrderId, $ppCfg['sandbox']);
if ($orderCheck['error'] !== '') {
  error_log("RID={$RID} EXT_CAP_ORDER_ERR: " . $orderCheck['error']);
  gec_fail(502, 'Could not verify payment');
}

$ppStatus = isset($orderCheck['data']['status']) ? $orderCheck['data']['status'] : '';
$captureId = '';

if ($ppStatus === 'COMPLETED') {
  error_log("RID={$RID} EXT_CAP already COMPLETED, extending pass");
} else if ($ppStatus === 'APPROVED') {
  $capResult = paypalCaptureOrder($tokenResult['token'], $ppOrderId, $ppCfg['sandbox']);
  if ($capResult['error'] !== '') {
    error_log("RID={$RID} EXT_CAP_ERR: " . $capResult['error']);
    $pdo->prepare("UPDATE gamepass_extensions SET status = 'failed' WHERE id = ?")->execute(array($extId));
    gec_fail(502, 'Payment capture failed');
  }
  if ($capResult['status'] !== 'COMPLETED') {
    error_log("RID={$RID} EXT_CAP_NOT_COMPLETED status=" . $capResult['status']);
    gec_fail(400, 'Payment not completed');
  }
  $captureId = isset($capResult['capture_id']) ? $capResult['capture_id'] : '';
} else {
  error_log("RID={$RID} EXT_CAP unexpected status={$ppStatus}");
  gec_fail(400, 'Payment not ready for capture (status: ' . $ppStatus . ')');
}

// Extend the game pass
$result = extendGamePass($pdo, $userId, $tier, $ppOrderId, $captureId, $extId, $RID);

if (!$result['success']) {
  error_log("RID={$RID} EXT_ACTIVATE_FAIL: " . (isset($result['message']) ? $result['message'] : 'unknown'));
  gec_fail(500, 'Extension activation failed');
}

// Update extension status
$pdo->prepare("UPDATE gamepass_extensions SET status = 'completed' WHERE id = ?")->execute(array($extId));

// Get updated pass info
$gpStmt = $pdo->prepare("SELECT tier, activated_at, days_total, expires_at FROM user_gamepass WHERE user_id = ?");
$gpStmt->execute(array($userId));
$gpRow = $gpStmt->fetch(PDO::FETCH_ASSOC);
$remDays = 0;
if ($gpRow && isset($gpRow['activated_at']) && isset($gpRow['days_total'])) {
  $remDays = getGamePassRemainingDays($gpRow['activated_at'], $gpRow['days_total']);
}

error_log("RID={$RID} EXT_CAPTURE_OK user={$userId} tier={$tier} days={$daysAdded} ext_id={$extId}");

gec_ok(array(
  'tier' => $tier,
  'days_added' => $daysAdded,
  'activated_at' => $gpRow ? $gpRow['activated_at'] : '',
  'days_total' => $gpRow ? (int)$gpRow['days_total'] : 0,
  'remaining_days' => $remDays,
  'expires_at' => $gpRow ? getGamePassExpiryDate($gpRow['activated_at'], $gpRow['days_total']) : '',
  'extension_id' => $extId,
));
