<?php
/**
 * paypal_webhook.php - PayPal Webhook Handler
 * PHP 5.x compatible
 *
 * Handles PayPal webhook events:
 * - PAYMENT.CAPTURE.COMPLETED: Mark order as paid, deliver items
 * - CHECKOUT.ORDER.APPROVED: Order approved (capture triggered by return URL)
 * - PAYMENT.CAPTURE.DENIED: Mark order as failed
 *
 * Configure in PayPal Dashboard > Webhooks
 * Endpoint URL: https://woiendgame.online/api/paypal_webhook.php
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/paypal_helper.php';
require_once __DIR__ . '/gamepass_helpers.php';

$RID = substr(md5(uniqid(mt_rand(), true)), 0, 12);

function json_response_wh($data) {
  global $RID;
  while (ob_get_level()) { @ob_end_clean(); }
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array_merge($data, array('rid' => $RID)));
  exit;
}

function json_fail_wh($code, $msg) {
  global $RID;
  error_log("RID={$RID} PAYPAL_WEBHOOK RESP={$code} MSG={$msg}");
  while (ob_get_level()) { @ob_end_clean(); }
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array('success' => false, 'message' => $msg, 'rid' => $RID));
  exit;
}

header('Content-Type: application/json; charset=utf-8');

try {
  $pdo = getDB();
} catch (Exception $e) {
  json_fail_wh(503, 'Service temporarily unavailable');
}

// Ensure webhook logs table
$pdo->exec("CREATE TABLE IF NOT EXISTS paypal_webhook_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload TEXT,
  processed TINYINT(1) DEFAULT 0,
  error_message TEXT,
  created_at DATETIME,
  KEY idx_event_id (event_id),
  KEY idx_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8");

// Read raw POST body
$payload = file_get_contents('php://input');
$event = null;
$eventId = 'unknown';
$eventType = 'unknown';

if ($payload) {
  $decoded = json_decode($payload, true);
  if ($decoded && isset($decoded['id'])) {
    $eventId = $decoded['id'];
    $eventType = isset($decoded['event_type']) ? $decoded['event_type'] : 'unknown';
    $event = $decoded;
  }
}

// Log webhook receipt
$stmt = $pdo->prepare("INSERT INTO paypal_webhook_logs (event_id, event_type, payload, created_at) VALUES (?, ?, ?, NOW())");
$stmt->execute(array($eventId, $eventType, $payload));
$logId = $pdo->lastInsertId();

if (!$event) {
  $stmt = $pdo->prepare("UPDATE paypal_webhook_logs SET error_message = ? WHERE id = ?");
  $stmt->execute(array('Invalid JSON payload', $logId));
  json_fail_wh(400, 'Invalid payload');
}

error_log("RID={$RID} PAYPAL_WEBHOOK type={$eventType} event_id={$eventId}");

// Handle events
$resource = isset($event['resource']) ? $event['resource'] : array();

switch ($eventType) {
  case 'PAYMENT.CAPTURE.COMPLETED':
    $captureId = isset($resource['id']) ? $resource['id'] : '';
    $amount = isset($resource['amount']['value']) ? $resource['amount']['value'] : '0';
    $currency = isset($resource['amount']['currency_code']) ? $resource['amount']['currency_code'] : '';
    $customId = isset($resource['custom_id']) ? $resource['custom_id'] : '';

    error_log("RID={$RID} PP_CAPTURE_COMPLETED capture={$captureId} amount={$amount} currency={$currency}");

    // Parse metadata
    $metadata = array();
    if ($customId !== '') {
      $parsed = json_decode($customId, true);
      if (is_array($parsed)) $metadata = $parsed;
    }

    $userId = isset($metadata['user_id']) ? (int)$metadata['user_id'] : 0;
    $purchaseType = isset($metadata['type']) ? $metadata['type'] : '';
    $purchaseTier = isset($metadata['tier']) ? $metadata['tier'] : '';

    // Get paypal order ID from supplementary_data
    $ppOrderId = '';
    if (isset($resource['supplementary_data']['related_ids']['order_id'])) {
      $ppOrderId = $resource['supplementary_data']['related_ids']['order_id'];
    }

    // ── Handle Game Pass (from metadata) ──
    if ($purchaseType === 'gamepass' && in_array($purchaseTier, array('elite', 'gold')) && $userId > 0) {
      ensureGamePassTables($pdo);
      activatePaidGamePass($pdo, $userId, $purchaseTier, $ppOrderId, $captureId, $RID);
      error_log("RID={$RID} GAMEPASS_WH_ACTIVATED_META user={$userId} tier={$purchaseTier}");
      break;
    }

    // ── Fallback: detect gamepass from DB if metadata missing ──
    if ($ppOrderId !== '' && $purchaseType !== 'gamepass') {
      try {
        $gpStmt = $pdo->prepare("SELECT user_id, tier, status FROM gamepass_purchases WHERE paypal_order_id = ? LIMIT 1");
        $gpStmt->execute(array($ppOrderId));
        $gpRow = $gpStmt->fetch(PDO::FETCH_ASSOC);
        if ($gpRow && $gpRow['status'] !== 'completed') {
          $gpUserId = (int)$gpRow['user_id'];
          $gpTier = $gpRow['tier'];
          if (in_array($gpTier, array('elite', 'gold')) && $gpUserId > 0) {
            ensureGamePassTables($pdo);
            activatePaidGamePass($pdo, $gpUserId, $gpTier, $ppOrderId, $captureId, $RID);
            error_log("RID={$RID} GAMEPASS_WH_ACTIVATED_DB user={$gpUserId} tier={$gpTier}");
            break;
          }
        }
      } catch (Exception $e) {
        error_log("RID={$RID} GAMEPASS_WH_FALLBACK_ERR: " . $e->getMessage());
      }
    }

    // ── Handle webshop orders ──
    if ($ppOrderId !== '') {
      $stmt = $pdo->prepare("UPDATE webshop_orders SET status = 'completed', paypal_capture_id = ?, delivered_at = NOW() WHERE paypal_order_id = ? AND status = 'pending'");
      $stmt->execute(array($captureId, $ppOrderId));
      
      if ($stmt->rowCount() > 0) {
        error_log("RID={$RID} PP_WH_ORDERS_COMPLETED paypal_order={$ppOrderId} count={$stmt->rowCount()}");
      }
    }
    break;

  case 'PAYMENT.CAPTURE.DENIED':
  case 'PAYMENT.CAPTURE.REFUNDED':
    $captureId = isset($resource['id']) ? $resource['id'] : '';
    $status = $eventType === 'PAYMENT.CAPTURE.DENIED' ? 'failed' : 'refunded';
    
    error_log("RID={$RID} PP_CAPTURE_{$status} capture={$captureId}");
    
    $stmt = $pdo->prepare("UPDATE webshop_orders SET status = ? WHERE paypal_capture_id = ? AND status IN ('pending', 'completed')");
    $stmt->execute(array($status, $captureId));

    // Also update gamepass_purchases if applicable
    try {
      $stmt = $pdo->prepare("UPDATE gamepass_purchases SET status = ? WHERE paypal_capture_id = ? AND status IN ('pending', 'completed')");
      $stmt->execute(array($status, $captureId));
    } catch (Exception $e) { /* table may not exist */ }
    break;

  default:
    error_log("RID={$RID} PP_WEBHOOK unhandled: {$eventType}");
    break;
}

// Mark processed
$stmt = $pdo->prepare("UPDATE paypal_webhook_logs SET processed = 1 WHERE id = ?");
$stmt->execute(array($logId));

json_response_wh(array('success' => true, 'received' => true));
