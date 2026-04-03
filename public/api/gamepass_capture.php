<?php
/**
 * gamepass_capture.php - Capture PayPal order and activate Game Pass
 * POST { paypal_order_id: "..." }
 * Returns { success: true, tier: "premium", expires_at: "..." }
 * PHP 5.3+ compatible - Global 30-Day Season Model (Free + Premium)
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/paypal_helper.php';
require_once __DIR__ . '/gamepass_helpers.php';
require_once __DIR__ . '/mail_delivery.php';
handleCors(array('POST', 'OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();

function gpc_ok($data) {
  global $RID;
  while (ob_get_level()) { @ob_end_clean(); }
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array_merge(array('success' => true, 'rid' => $RID), $data), JSON_UNESCAPED_UNICODE);
  exit;
}

function gpc_fail($code, $msg) {
  global $RID;
  error_log("RID={$RID} GP_CAPTURE_FAIL code={$code} msg={$msg}");
  while (ob_get_level()) { @ob_end_clean(); }
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array('success' => false, 'message' => $msg, 'rid' => $RID), JSON_UNESCAPED_UNICODE);
  exit;
}

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'POST') gpc_fail(405, 'Method not allowed');

// Auth
$user = getCurrentUser();
if (!$user) gpc_fail(401, 'Not authenticated');
$userId = (int)$user['user_id'];

// Input
$input = getJsonInput();
$ppOrderId = isset($input['paypal_order_id']) ? trim((string)$input['paypal_order_id']) : '';
if ($ppOrderId === '') gpc_fail(400, 'paypal_order_id required');

$pdo = getDB();
ensureGamePassTables($pdo);

// Find the pending purchase
$stmt = $pdo->prepare("SELECT * FROM gamepass_purchases WHERE paypal_order_id = ? LIMIT 1");
$stmt->execute(array($ppOrderId));
$purchase = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$purchase) gpc_fail(404, 'Purchase not found');

$purchaseId = (int)$purchase['id'];
$tier = $purchase['tier'];
$characterName = isset($purchase['character_name']) ? $purchase['character_name'] : '';

// Ownership check
if ((int)$purchase['user_id'] !== $userId) {
  gpc_fail(403, 'Not allowed');
}

// Idempotent: already completed
if ($purchase['status'] === 'completed') {
  // Fetch current pass info
  $gpStmt = $pdo->prepare("SELECT tier, activated_at, days_total, expires_at FROM user_gamepass WHERE user_id = ?");
  $gpStmt->execute(array($userId));
  $gpRow = $gpStmt->fetch(PDO::FETCH_ASSOC);
  $remDays = 0;
  if ($gpRow && isset($gpRow['activated_at']) && isset($gpRow['days_total'])) {
    $remDays = getGamePassRemainingDays($gpRow['activated_at'], $gpRow['days_total']);
  }
  gpc_ok(array(
    'tier' => $tier,
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
  error_log("RID={$RID} GP_CAP_TOKEN_ERR: " . $tokenResult['error']);
  gpc_fail(502, 'Payment provider error');
}

// Check PayPal order status first
$orderCheck = paypalGetOrder($tokenResult['token'], $ppOrderId, $ppCfg['sandbox']);
if ($orderCheck['error'] !== '') {
  error_log("RID={$RID} GP_CAP_ORDER_CHECK_ERR: " . $orderCheck['error']);
  gpc_fail(502, 'Could not verify payment');
}

$ppStatus = isset($orderCheck['data']['status']) ? $orderCheck['data']['status'] : '';

// If already captured, skip capture step
if ($ppStatus === 'COMPLETED') {
  error_log("RID={$RID} GP_CAP already COMPLETED, activating pass");
} else if ($ppStatus === 'APPROVED') {
  // Capture
  $capResult = paypalCaptureOrder($tokenResult['token'], $ppOrderId, $ppCfg['sandbox']);
  if ($capResult['error'] !== '') {
    error_log("RID={$RID} GP_CAP_ERR: " . $capResult['error']);
    $pdo->prepare("UPDATE gamepass_purchases SET status = 'failed' WHERE id = ?")->execute(array($purchaseId));
    gpc_fail(502, 'Payment capture failed');
  }
  if ($capResult['status'] !== 'COMPLETED') {
    error_log("RID={$RID} GP_CAP_NOT_COMPLETED status=" . $capResult['status']);
    gpc_fail(400, 'Payment not completed');
  }
} else {
  error_log("RID={$RID} GP_CAP unexpected status={$ppStatus}");
  gpc_fail(400, 'Payment not ready for capture (status: ' . $ppStatus . ')');
}

// Activate game pass
$captureId = '';
if (isset($capResult) && isset($capResult['capture_id'])) {
  $captureId = $capResult['capture_id'];
}

$activated = activatePaidGamePass($pdo, $userId, $tier, $ppOrderId, $captureId, $RID);

// Update purchase status
$pdo->prepare("UPDATE gamepass_purchases SET status = 'completed' WHERE id = ?")->execute(array($purchaseId));

// Send activation mail if character exists
if ($characterName !== '') {
  $charStmt = $pdo->prepare("SELECT RoleID FROM basetab_sg WHERE Name = ? AND IsDel = 0 LIMIT 1");
  $charStmt->execute(array($characterName));
  $charRow = $charStmt->fetch(PDO::FETCH_ASSOC);
  if ($charRow) {
    try {
      $mailer = new GameMailer(getMySQLi());
      $mailer->sendGamePassActivationMail((int)$charRow['RoleID'], $tier);
    } catch (Exception $e) {
      error_log("RID={$RID} GP_CAP_MAIL_ERR: " . $e->getMessage());
    }
  }
}

// Get updated pass info
$gpStmt = $pdo->prepare("SELECT tier, activated_at, days_total, expires_at FROM user_gamepass WHERE user_id = ?");
$gpStmt->execute(array($userId));
$gpRow = $gpStmt->fetch(PDO::FETCH_ASSOC);
$remDays = 0;
if ($gpRow && isset($gpRow['activated_at']) && isset($gpRow['days_total'])) {
  $remDays = getGamePassRemainingDays($gpRow['activated_at'], $gpRow['days_total']);
}

error_log("RID={$RID} GP_CAPTURE_OK user={$userId} tier={$tier} purchase_id={$purchaseId}");

gpc_ok(array(
  'tier' => $tier,
  'activated_at' => $gpRow ? $gpRow['activated_at'] : '',
  'days_total' => $gpRow ? (int)$gpRow['days_total'] : 0,
  'remaining_days' => $remDays,
  'expires_at' => $gpRow ? getGamePassExpiryDate($gpRow['activated_at'], $gpRow['days_total']) : '',
  'purchase_id' => $purchaseId,
));
