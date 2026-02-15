<?php
/**
 * POST /api/admin_retry_delivery.php
 * Retries failed deliveries for an order without duplicates.
 * Admin-only. PHP 5.3+ compatible.
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/mail_delivery.php';

handleCors(array('POST','OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();
$user = requireAdmin(true, 60);

$pdo = getDB();
$body = getJsonInput();
$orderId = isset($body['order_id']) ? intval($body['order_id']) : 0;
if ($orderId <= 0) jsonFail(400, 'order_id required', $RID);

// Fetch order
$stmt = $pdo->prepare("SELECT * FROM shop_orders WHERE id = ? LIMIT 1");
$stmt->execute(array($orderId));
$order = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$order) jsonFail(404, 'Order not found', $RID);

if ($order['status'] !== 'completed' && $order['status'] !== 'failed') {
    jsonFail(400, 'Order must be completed or failed to retry delivery', $RID);
}

// Resolve character
$charStmt = $pdo->prepare("SELECT RoleID FROM basetab_sg WHERE Name = ? AND IsDel = 0 LIMIT 1");
$charStmt->execute(array($order['character_name']));
$charRow = $charStmt->fetch(PDO::FETCH_ASSOC);
$roleId = $charRow ? intval($charRow['RoleID']) : 0;

if ($roleId <= 0) jsonFail(400, 'Character not found: ' . $order['character_name'], $RID);

// Fetch order items
$itemsStmt = $pdo->prepare("
    SELECT oi.id as oi_id, oi.product_id, oi.qty, p.name, p.type, p.payload_json
    FROM shop_order_items oi
    JOIN shop_products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
");
$itemsStmt->execute(array($orderId));
$orderItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

$mailer = new GameMailer(getMySQLi());
$processedCount = 0;
$failedCount = 0;
$skippedCount = 0;
$dlInsert = $pdo->prepare("INSERT INTO shop_delivery_log (order_id, item_type, item_ref, qty, result, message, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");

foreach ($orderItems as $oi) {
    // Skip already delivered
    $checkDl = $pdo->prepare("SELECT id FROM shop_delivery_log WHERE order_id = ? AND item_ref = ? AND result = 'ok' LIMIT 1");
    $checkDl->execute(array($orderId, 'oi_' . $oi['oi_id']));
    if ($checkDl->fetch()) {
        $skippedCount++;
        continue;
    }

    $payload = array();
    if ($oi['payload_json'] !== '' && $oi['payload_json'] !== null) {
        $decoded = json_decode($oi['payload_json'], true);
        if (is_array($decoded)) $payload = $decoded;
    }

    $zen   = isset($payload['zen'])   ? intval($payload['zen'])   * intval($oi['qty']) : 0;
    $coins = isset($payload['coins']) ? intval($payload['coins']) * intval($oi['qty']) : 0;
    $exp   = isset($payload['exp'])   ? intval($payload['exp'])   * intval($oi['qty']) : 0;
    $itemId = isset($payload['item_id']) ? intval($payload['item_id']) : 0;
    $itemQty = isset($payload['qty'])    ? intval($payload['qty']) * intval($oi['qty']) : intval($oi['qty']);

    $result = $mailer->sendOrderReward($roleId, $oi['name'], $itemId, ($itemId > 0 ? $itemQty : 0), $coins, $zen, $exp);

    if ($result['success']) {
        $dlInsert->execute(array($orderId, $oi['type'], 'oi_' . $oi['oi_id'], $oi['qty'], 'ok', 'Retry delivered'));
        $processedCount++;
    } else {
        $msg = isset($result['message']) ? $result['message'] : 'Unknown error';
        $dlInsert->execute(array($orderId, $oi['type'], 'oi_' . $oi['oi_id'], $oi['qty'], 'fail', 'Retry: ' . $msg));
        $failedCount++;
    }
}

// Update status
$finalStatus = ($failedCount > 0) ? 'failed' : 'completed';
$pdo->prepare("UPDATE shop_orders SET status=?, updated_at=NOW() WHERE id=?")->execute(array($finalStatus, $orderId));

error_log("RID={$RID} RETRY_DELIVERY order_id={$orderId} processed={$processedCount} skipped={$skippedCount} failed={$failedCount}");

echo json_encode(array(
    'success'         => true,
    'order_id'        => $orderId,
    'status'          => $finalStatus,
    'processed_count' => $processedCount,
    'skipped_count'   => $skippedCount,
    'failed_count'    => $failedCount,
    'rid'             => $RID,
));
