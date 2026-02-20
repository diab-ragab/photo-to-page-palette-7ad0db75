<?php
/**
 * paypal_webhook.php - PayPal webhook receiver
 * Handles PAYMENT.CAPTURE.COMPLETED for shop orders, game pass purchases, and extensions
 * PHP 5.3+ compatible
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/paypal_helper.php';
require_once __DIR__ . '/gamepass_helpers.php';
require_once __DIR__ . '/mail_delivery.php';

handleCors(array('POST','OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
  http_response_code(400);
  echo json_encode(array('success' => false, 'message' => 'Invalid JSON', 'rid' => $RID));
  exit;
}

$eventType = isset($data['event_type']) ? (string)$data['event_type'] : '';
$resource = isset($data['resource']) && is_array($data['resource']) ? $data['resource'] : array();

error_log("RID={$RID} PAYPAL_WEBHOOK event={$eventType}");

// Only handle capture completed
if ($eventType !== 'PAYMENT.CAPTURE.COMPLETED') {
  echo json_encode(array('success' => true, 'message' => 'Event ignored', 'rid' => $RID));
  exit;
}

// Extract order ID from the capture resource
$ppOrderId = '';
$captureId = isset($resource['id']) ? (string)$resource['id'] : '';

// Try to get order ID from supplementary_data
if (isset($resource['supplementary_data']['related_ids']['order_id'])) {
  $ppOrderId = (string)$resource['supplementary_data']['related_ids']['order_id'];
}

// Try custom_id for metadata
$customId = isset($resource['custom_id']) ? (string)$resource['custom_id'] : '';
$meta = array();
if ($customId !== '') {
  $decoded = json_decode($customId, true);
  if (is_array($decoded)) $meta = $decoded;
}

// Determine purchase type from custom_id
$purchaseType = isset($meta['type']) ? (string)$meta['type'] : '';

error_log("RID={$RID} WEBHOOK_DETAIL order_id={$ppOrderId} capture_id={$captureId} type={$purchaseType} custom_id={$customId}");

$pdo = getDB();

// If we don't have order ID from supplementary_data, try to find it via custom_id metadata or DB lookup
if ($ppOrderId === '' && isset($meta['purchase_id'])) {
  // Game pass purchase - look up by purchase_id
  $stmt = $pdo->prepare("SELECT paypal_order_id FROM gamepass_purchases WHERE id = ? LIMIT 1");
  $stmt->execute(array((int)$meta['purchase_id']));
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if ($row) $ppOrderId = $row['paypal_order_id'];
}

if ($ppOrderId === '' && isset($meta['extension_id'])) {
  $stmt = $pdo->prepare("SELECT paypal_order_id FROM gamepass_extensions WHERE id = ? LIMIT 1");
  $stmt->execute(array((int)$meta['extension_id']));
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if ($row) $ppOrderId = $row['paypal_order_id'];
}

// ─── STRATEGY 1: Game Pass Purchase ───
if ($purchaseType === 'gamepass_purchase' || $purchaseType === '') {
  // Try to find a gamepass_purchases row
  $gpStmt = null;
  if ($ppOrderId !== '') {
    $gpStmt = $pdo->prepare("SELECT * FROM gamepass_purchases WHERE paypal_order_id = ? LIMIT 1");
    $gpStmt->execute(array($ppOrderId));
  }
  $gpRow = $gpStmt ? $gpStmt->fetch(PDO::FETCH_ASSOC) : false;

  if ($gpRow && $gpRow['status'] !== 'completed') {
    error_log("RID={$RID} WEBHOOK_GP_PURCHASE id={$gpRow['id']} tier={$gpRow['tier']} user={$gpRow['user_id']}");
    
    ensureGamePassTables($pdo);
    $userId = (int)$gpRow['user_id'];
    $tier = $gpRow['tier'];
    $characterName = isset($gpRow['character_name']) ? $gpRow['character_name'] : '';

    // Activate pass
    activatePaidGamePass($pdo, $userId, $tier, $ppOrderId, $captureId, $RID);

    // Update purchase status
    $pdo->prepare("UPDATE gamepass_purchases SET status = 'completed' WHERE id = ?")->execute(array((int)$gpRow['id']));

    // Send activation mail
    if ($characterName !== '') {
      $charStmt = $pdo->prepare("SELECT RoleID FROM basetab_sg WHERE Name = ? AND IsDel = 0 LIMIT 1");
      $charStmt->execute(array($characterName));
      $charRow = $charStmt->fetch(PDO::FETCH_ASSOC);
      if ($charRow) {
        try {
          $mailer = new GameMailer(getMySQLi());
          $mailer->sendGamePassActivationMail((int)$charRow['RoleID'], $tier);
        } catch (Exception $e) {
          error_log("RID={$RID} WEBHOOK_GP_MAIL_ERR: " . $e->getMessage());
        }
      }
    }

    error_log("RID={$RID} WEBHOOK_GP_PURCHASE_OK user={$userId} tier={$tier}");
    echo json_encode(array('success' => true, 'action' => 'gamepass_activated', 'rid' => $RID));
    exit;
  }
}

// ─── STRATEGY 2: Game Pass Extension ───
if ($purchaseType === 'gamepass_extend' || $purchaseType === '') {
  $extStmt = null;
  if ($ppOrderId !== '') {
    $extStmt = $pdo->prepare("SELECT * FROM gamepass_extensions WHERE paypal_order_id = ? LIMIT 1");
    $extStmt->execute(array($ppOrderId));
  }
  $extRow = $extStmt ? $extStmt->fetch(PDO::FETCH_ASSOC) : false;

  if ($extRow && $extRow['status'] !== 'completed') {
    error_log("RID={$RID} WEBHOOK_GP_EXTEND id={$extRow['id']} tier={$extRow['tier']} days={$extRow['days_added']} user={$extRow['user_id']}");

    ensureGamePassTables($pdo);
    ensureExtensionTable($pdo);
    $userId = (int)$extRow['user_id'];
    $tier = $extRow['tier'];
    $daysAdded = (int)$extRow['days_added'];
    $extId = (int)$extRow['id'];

    // Extend pass
    $result = extendGamePass($pdo, $userId, $tier, $ppOrderId, $captureId, $extId, $RID);

    // Update extension status
    $pdo->prepare("UPDATE gamepass_extensions SET status = 'completed' WHERE id = ?")->execute(array($extId));

    error_log("RID={$RID} WEBHOOK_GP_EXTEND_OK user={$userId} tier={$tier} days={$daysAdded}");
    echo json_encode(array('success' => true, 'action' => 'gamepass_extended', 'rid' => $RID));
    exit;
  }
}

// ─── STRATEGY 3: Shop Order ───
if ($ppOrderId !== '') {
  $shopStmt = $pdo->prepare("SELECT * FROM shop_orders WHERE paypal_order_id = ? LIMIT 1");
  $shopStmt->execute(array($ppOrderId));
  $shopOrder = $shopStmt->fetch(PDO::FETCH_ASSOC);

  if ($shopOrder && $shopOrder['status'] !== 'completed') {
    error_log("RID={$RID} WEBHOOK_SHOP_ORDER id={$shopOrder['id']}");

    // Mark processing
    $pdo->prepare("UPDATE shop_orders SET status='processing', updated_at=NOW() WHERE id=?")->execute(array((int)$shopOrder['id']));

    // Fulfill items
    $itemsStmt = $pdo->prepare("
      SELECT oi.id as oi_id, oi.product_id, oi.qty, p.name, p.type, p.payload_json
      FROM shop_order_items oi
      JOIN shop_products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
    ");
    $itemsStmt->execute(array((int)$shopOrder['id']));
    $orderItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Resolve character
    $charName = isset($shopOrder['character_name']) ? $shopOrder['character_name'] : '';
    $roleId = 0;
    if ($charName !== '') {
      $charStmt = $pdo->prepare("SELECT RoleID FROM basetab_sg WHERE Name = ? AND IsDel = 0 LIMIT 1");
      $charStmt->execute(array($charName));
      $charRow = $charStmt->fetch(PDO::FETCH_ASSOC);
      if ($charRow) $roleId = (int)$charRow['RoleID'];
    }

    $mailer = new GameMailer(getMySQLi());
    $processedCount = 0;
    $failedCount = 0;

    // Ensure delivery log table
    try {
      $pdo->exec("CREATE TABLE IF NOT EXISTS shop_delivery_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        item_type VARCHAR(50),
        item_ref VARCHAR(100),
        qty INT DEFAULT 1,
        result VARCHAR(20),
        message TEXT,
        created_at DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    } catch (Exception $e) {}

    $dlInsert = $pdo->prepare("INSERT INTO shop_delivery_log (order_id, item_type, item_ref, qty, result, message, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");

    foreach ($orderItems as $oi) {
      // Idempotency check
      $checkDl = $pdo->prepare("SELECT id FROM shop_delivery_log WHERE order_id = ? AND item_ref = ? AND result = 'ok' LIMIT 1");
      $checkDl->execute(array((int)$shopOrder['id'], 'oi_' . $oi['oi_id']));
      if ($checkDl->fetch()) { $processedCount++; continue; }

      $payload = array();
      if ($oi['payload_json'] !== '' && $oi['payload_json'] !== null) {
        $decoded = json_decode($oi['payload_json'], true);
        if (is_array($decoded)) $payload = $decoded;
      }

      $zen    = isset($payload['zen'])   ? intval($payload['zen'])   * intval($oi['qty']) : 0;
      $coins  = isset($payload['coins']) ? intval($payload['coins']) * intval($oi['qty']) : 0;
      $exp    = isset($payload['exp'])   ? intval($payload['exp'])   * intval($oi['qty']) : 0;
      $itemId = isset($payload['item_id']) ? intval($payload['item_id']) : 0;
      $itemQty = isset($payload['qty']) ? intval($payload['qty']) * intval($oi['qty']) : intval($oi['qty']);

      if ($roleId <= 0) {
        $dlInsert->execute(array((int)$shopOrder['id'], $oi['type'], 'oi_' . $oi['oi_id'], $oi['qty'], 'fail', 'Character not found'));
        $failedCount++;
        continue;
      }

      $result = $mailer->sendOrderReward($roleId, $oi['name'], $itemId, ($itemId > 0 ? $itemQty : 0), $coins, $zen, $exp);
      if (isset($result['success']) && $result['success']) {
        $dlInsert->execute(array((int)$shopOrder['id'], $oi['type'], 'oi_' . $oi['oi_id'], $oi['qty'], 'ok', 'Delivered via webhook'));
        $processedCount++;
      } else {
        $msg = isset($result['message']) ? $result['message'] : 'Unknown error';
        $dlInsert->execute(array((int)$shopOrder['id'], $oi['type'], 'oi_' . $oi['oi_id'], $oi['qty'], 'fail', $msg));
        $failedCount++;
      }
    }

    $finalStatus = ($failedCount > 0) ? 'failed' : 'completed';
    $pdo->prepare("UPDATE shop_orders SET status=?, updated_at=NOW() WHERE id=?")->execute(array($finalStatus, (int)$shopOrder['id']));

    error_log("RID={$RID} WEBHOOK_SHOP_OK order_id={$shopOrder['id']} processed={$processedCount} failed={$failedCount}");
    echo json_encode(array('success' => true, 'action' => 'shop_fulfilled', 'rid' => $RID));
    exit;
  }
}

// Nothing matched
error_log("RID={$RID} WEBHOOK_NO_MATCH order_id={$ppOrderId}");
echo json_encode(array('success' => true, 'message' => 'No action needed', 'rid' => $RID));
exit;
