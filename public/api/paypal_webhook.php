<?php
/**
 * paypal_webhook.php - PayPal Webhook Handler
 * PHP 5.3+ compatible.
 *
 * Handles:
 * - PAYMENT.CAPTURE.COMPLETED: Mark shop_orders as completed
 * - PAYMENT.CAPTURE.DENIED/REFUNDED: Mark as failed/refunded
 * - CHECKOUT.ORDER.APPROVED: logged only (capture via return URL)
 *
 * Endpoint: https://woiendgame.online/api/paypal_webhook.php
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/paypal_helper.php';

$RID = generateRID();

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

$resource = isset($event['resource']) ? $event['resource'] : array();

switch ($eventType) {
  case 'PAYMENT.CAPTURE.COMPLETED':
    $captureId = isset($resource['id']) ? $resource['id'] : '';
    $amount = isset($resource['amount']['value']) ? $resource['amount']['value'] : '0';
    $currency = isset($resource['amount']['currency_code']) ? $resource['amount']['currency_code'] : '';

    error_log("RID={$RID} PP_CAPTURE_COMPLETED capture={$captureId} amount={$amount} currency={$currency}");

    // Get paypal order ID from supplementary_data
    $ppOrderId = '';
    if (isset($resource['supplementary_data']['related_ids']['order_id'])) {
      $ppOrderId = $resource['supplementary_data']['related_ids']['order_id'];
    }

    // Update shop_orders
    if ($ppOrderId !== '') {
      $stmt = $pdo->prepare("UPDATE shop_orders SET status = 'completed', capture_id = ?, updated_at = NOW() WHERE paypal_order_id = ? AND status IN ('pending','processing')");
      $stmt->execute(array($captureId, $ppOrderId));

      if ($stmt->rowCount() > 0) {
        error_log("RID={$RID} PP_WH_SHOP_ORDER_COMPLETED paypal_order={$ppOrderId}");
      }
    }
    break;

  case 'PAYMENT.CAPTURE.DENIED':
  case 'PAYMENT.CAPTURE.REFUNDED':
    $captureId = isset($resource['id']) ? $resource['id'] : '';
    $status = ($eventType === 'PAYMENT.CAPTURE.DENIED') ? 'failed' : 'failed';

    error_log("RID={$RID} PP_CAPTURE_{$eventType} capture={$captureId}");

    $stmt = $pdo->prepare("UPDATE shop_orders SET status = ?, updated_at = NOW() WHERE capture_id = ? AND status IN ('pending','processing','completed')");
    $stmt->execute(array($status, $captureId));
    break;

  default:
    error_log("RID={$RID} PP_WEBHOOK unhandled: {$eventType}");
    break;
}

// Mark processed
$stmt = $pdo->prepare("UPDATE paypal_webhook_logs SET processed = 1 WHERE id = ?");
$stmt->execute(array($logId));

json_response_wh(array('success' => true, 'received' => true));
