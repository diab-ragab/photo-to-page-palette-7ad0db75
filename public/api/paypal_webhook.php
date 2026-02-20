<?php
/**
 * paypal_webhook.php - PayPal Webhook Handler
 * PHP 5.3+ compatible.
 *
 * Handles:
 * - PAYMENT.CAPTURE.COMPLETED: Fulfill order + mark completed
 * - PAYMENT.CAPTURE.DENIED/REFUNDED: Mark as failed
 *
 * Endpoint: https://woiendgame.online/api/paypal_webhook.php
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/paypal_helper.php';
require_once __DIR__ . '/mail_delivery.php';

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

    if ($ppOrderId === '') {
      error_log("RID={$RID} PP_WH no paypal_order_id in resource, skipping");
      break;
    }

    // Fetch the internal order
    $orderStmt = $pdo->prepare("SELECT * FROM shop_orders WHERE paypal_order_id = ? LIMIT 1");
    $orderStmt->execute(array($ppOrderId));
    $order = $orderStmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
      error_log("RID={$RID} PP_WH order not found for paypal_order={$ppOrderId}");
      break;
    }

    $orderId = intval($order['id']);

    // If already completed with deliveries, skip (idempotent)
    if ($order['status'] === 'completed') {
      $dlCheck = $pdo->prepare("SELECT COUNT(*) FROM shop_delivery_log WHERE order_id = ? AND result = 'ok'");
      $dlCheck->execute(array($orderId));
      if (intval($dlCheck->fetchColumn()) > 0) {
        error_log("RID={$RID} PP_WH order_id={$orderId} already fulfilled, skipping");
        break;
      }
      // completed but no deliveries => fall through to fulfill
    }

    // Verify amount & currency
    $ppCfg = getPayPalConfig();
    $ppCents = intval(round(floatval($amount) * 100));
    $orderCents = intval($order['total_cents']);

    if (strtoupper($currency) !== strtoupper($ppCfg['currency'])) {
      error_log("RID={$RID} PP_WH CURRENCY_MISMATCH expected={$ppCfg['currency']} got={$currency}");
      $pdo->prepare("UPDATE shop_orders SET status='failed', updated_at=NOW() WHERE id=?")->execute(array($orderId));
      break;
    }

    if ($ppCents !== $orderCents) {
      error_log("RID={$RID} PP_WH AMOUNT_MISMATCH expected={$orderCents} got={$ppCents}");
      $pdo->prepare("UPDATE shop_orders SET status='failed', updated_at=NOW() WHERE id=?")->execute(array($orderId));
      break;
    }

    // Update capture info
    $pdo->prepare("UPDATE shop_orders SET status='processing', capture_id=?, updated_at=NOW() WHERE id=?")
        ->execute(array($captureId, $orderId));

    // --- FULFILLMENT ---
    error_log("RID={$RID} PP_WH_FULFILLMENT_START order_id={$orderId}");

    $itemsStmt = $pdo->prepare("
        SELECT oi.id as oi_id, oi.product_id, oi.qty, p.name, p.type, p.payload_json
        FROM shop_order_items oi
        JOIN shop_products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
    ");
    $itemsStmt->execute(array($orderId));
    $orderItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Resolve character RoleID
    $charStmt = $pdo->prepare("SELECT RoleID FROM basetab_sg WHERE Name = ? AND IsDel = 0 LIMIT 1");
    $charStmt->execute(array($order['character_name']));
    $charRow = $charStmt->fetch(PDO::FETCH_ASSOC);
    $roleId = $charRow ? intval($charRow['RoleID']) : 0;

    $mailer = new GameMailer(getMySQLi());
    $processedCount = 0;
    $failedCount = 0;
    $dlInsert = $pdo->prepare("INSERT INTO shop_delivery_log (order_id, item_type, item_ref, qty, result, message, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");

    foreach ($orderItems as $oi) {
      // Idempotency: skip already delivered
      $checkDl = $pdo->prepare("SELECT id FROM shop_delivery_log WHERE order_id = ? AND item_ref = ? AND result = 'ok' LIMIT 1");
      $checkDl->execute(array($orderId, 'oi_' . $oi['oi_id']));
      if ($checkDl->fetch()) {
        $processedCount++;
        continue;
      }

      if ($roleId <= 0) {
        $dlInsert->execute(array($orderId, $oi['type'], 'oi_' . $oi['oi_id'], $oi['qty'], 'fail', 'Character not found'));
        $failedCount++;
        continue;
      }

      $payload_data = array();
      if ($oi['payload_json'] !== '' && $oi['payload_json'] !== null) {
        $decoded_pl = json_decode($oi['payload_json'], true);
        if (is_array($decoded_pl)) $payload_data = $decoded_pl;
      }

      $zen   = isset($payload_data['zen'])   ? intval($payload_data['zen'])   * intval($oi['qty']) : 0;
      $coins = isset($payload_data['coins']) ? intval($payload_data['coins']) * intval($oi['qty']) : 0;
      $exp   = isset($payload_data['exp'])   ? intval($payload_data['exp'])   * intval($oi['qty']) : 0;
      $itemId = isset($payload_data['item_id']) ? intval($payload_data['item_id']) : 0;
      $itemQty = isset($payload_data['qty'])    ? intval($payload_data['qty']) * intval($oi['qty']) : intval($oi['qty']);

      $result = $mailer->sendOrderReward($roleId, $oi['name'], $itemId, ($itemId > 0 ? $itemQty : 0), $coins, $zen, $exp);

      if ($result['success']) {
        $dlInsert->execute(array($orderId, $oi['type'], 'oi_' . $oi['oi_id'], $oi['qty'], 'ok', 'Webhook delivered'));
        $processedCount++;
      } else {
        $msg = isset($result['message']) ? $result['message'] : 'Unknown error';
        $dlInsert->execute(array($orderId, $oi['type'], 'oi_' . $oi['oi_id'], $oi['qty'], 'fail', 'WH: ' . $msg));
        $failedCount++;
        error_log("RID={$RID} PP_WH_DELIVERY_FAIL order_id={$orderId} oi_id={$oi['oi_id']}: {$msg}");
      }
    }

    $finalStatus = ($failedCount > 0) ? 'failed' : 'completed';
    $pdo->prepare("UPDATE shop_orders SET status=?, updated_at=NOW() WHERE id=?")->execute(array($finalStatus, $orderId));

    error_log("RID={$RID} PP_WH_FULFILLMENT_DONE order_id={$orderId} processed={$processedCount} failed={$failedCount} status={$finalStatus}");
    break;

  case 'PAYMENT.CAPTURE.DENIED':
  case 'PAYMENT.CAPTURE.REFUNDED':
    $captureId = isset($resource['id']) ? $resource['id'] : '';

    error_log("RID={$RID} PP_CAPTURE_{$eventType} capture={$captureId}");

    $stmt = $pdo->prepare("UPDATE shop_orders SET status = 'failed', updated_at = NOW() WHERE capture_id = ? AND status IN ('pending','processing','completed')");
    $stmt->execute(array($captureId));
    break;

  default:
    error_log("RID={$RID} PP_WEBHOOK unhandled: {$eventType}");
    break;
}

// Mark processed
$stmt = $pdo->prepare("UPDATE paypal_webhook_logs SET processed = 1 WHERE id = ?");
$stmt->execute(array($logId));

json_response_wh(array('success' => true, 'received' => true));
