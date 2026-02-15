<?php
/**
 * GET /api/shop_order_status.php?order_id=N
 * Returns order status + items delivered.
 * PHP 5.3+ compatible.
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';

handleCors(array('GET','OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();

$orderId = isset($_GET['order_id']) ? intval($_GET['order_id']) : 0;
if ($orderId <= 0) jsonFail(400, 'order_id required', $RID);

$pdo = getDB();

$stmt = $pdo->prepare("SELECT id, rid, account_name, character_name, total_cents, currency, status, paypal_order_id, capture_id, payer_email, created_at, updated_at FROM shop_orders WHERE id = ? LIMIT 1");
$stmt->execute(array($orderId));
$order = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$order) jsonFail(404, 'Order not found', $RID);

// Items
$iStmt = $pdo->prepare("
    SELECT oi.product_id, p.name, p.type, oi.qty, oi.unit_price_cents, oi.line_total_cents
    FROM shop_order_items oi
    JOIN shop_products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
");
$iStmt->execute(array($orderId));
$items = $iStmt->fetchAll(PDO::FETCH_ASSOC);

// Delivery log
$dlStmt = $pdo->prepare("SELECT item_type, item_ref, qty, result, message, created_at FROM shop_delivery_log WHERE order_id = ? ORDER BY id ASC");
$dlStmt->execute(array($orderId));
$deliveries = $dlStmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(array(
    'success'    => true,
    'order'      => array(
        'id'              => intval($order['id']),
        'status'          => $order['status'],
        'account_name'    => $order['account_name'],
        'character_name'  => $order['character_name'],
        'total_cents'     => intval($order['total_cents']),
        'currency'        => $order['currency'],
        'paypal_order_id' => $order['paypal_order_id'],
        'created_at'      => $order['created_at'],
    ),
    'items'      => $items,
    'deliveries' => $deliveries,
    'rid'        => $RID,
));
