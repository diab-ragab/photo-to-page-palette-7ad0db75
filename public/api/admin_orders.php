<?php
/**
 * GET /api/admin_orders.php?status=&q=&limit=&page=
 * Admin-only: search/list shop orders.
 * PHP 5.3+ compatible.
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';

handleCors(array('GET','OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();
$user = requireAdmin(true, 60);

$pdo = getDB();

$status = isset($_GET['status']) ? trim((string)$_GET['status']) : '';
$q      = isset($_GET['q'])      ? trim((string)$_GET['q'])      : '';
$page   = isset($_GET['page'])   ? max(1, intval($_GET['page']))  : 1;
$limit  = isset($_GET['limit'])  ? min(100, max(1, intval($_GET['limit']))) : 20;
$offset = ($page - 1) * $limit;

$where  = '1=1';
$params = array();

$validStatuses = array('pending','processing','completed','failed');
if ($status !== '' && in_array($status, $validStatuses, true)) {
    $where .= ' AND o.status = ?';
    $params[] = $status;
}

if ($q !== '') {
    $like = '%' . $q . '%';
    $where .= ' AND (o.id LIKE ? OR o.paypal_order_id LIKE ? OR o.account_name LIKE ? OR o.character_name LIKE ? OR o.rid LIKE ?)';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

$countSql = "SELECT COUNT(*) FROM shop_orders o WHERE {$where}";
$stmt = $pdo->prepare($countSql);
$stmt->execute($params);
$total = intval($stmt->fetchColumn());

$sql = "SELECT o.* FROM shop_orders o WHERE {$where} ORDER BY o.id DESC LIMIT {$limit} OFFSET {$offset}";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(array(
    'success' => true,
    'orders'  => $orders,
    'total'   => $total,
    'page'    => $page,
    'pages'   => ($limit > 0) ? intval(ceil($total / $limit)) : 0,
    'rid'     => $RID,
));
