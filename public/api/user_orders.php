<?php
/**
 * GET /api/user_orders.php?action=list&page=&limit=&status=
 * Returns current user's shop order history from shop_orders table.
 * Requires authentication. PHP 5.3+ compatible.
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';

handleCors(array('GET','OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();
$user = requireAuth();
$accountName = isset($user['name']) ? $user['name'] : '';

if ($accountName === '') {
    jsonFail(400, 'Account name not resolved', $RID);
}

$pdo = getDB();

$page   = max(1, isset($_GET['page'])  ? intval($_GET['page'])  : 1);
$limit  = min(50, max(5, isset($_GET['limit']) ? intval($_GET['limit']) : 10));
$offset = ($page - 1) * $limit;
$status = isset($_GET['status']) ? trim((string)$_GET['status']) : '';

$where  = 'o.account_name = ?';
$params = array($accountName);

$validStatuses = array('pending','processing','completed','failed');
if ($status !== '' && in_array($status, $validStatuses, true)) {
    $where .= ' AND o.status = ?';
    $params[] = $status;
}

// Count
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM shop_orders o WHERE {$where}");
$countStmt->execute($params);
$total = intval($countStmt->fetchColumn());

// Fetch orders with items
$sql = "
    SELECT
        o.id,
        o.rid,
        o.character_name,
        o.total_cents,
        o.currency,
        o.status,
        o.created_at,
        GROUP_CONCAT(p.name SEPARATOR ', ') AS product_names,
        SUM(oi.qty) AS total_qty
    FROM shop_orders o
    LEFT JOIN shop_order_items oi ON oi.order_id = o.id
    LEFT JOIN shop_products p ON p.id = oi.product_id
    WHERE {$where}
    GROUP BY o.id
    ORDER BY o.id DESC
    LIMIT {$limit} OFFSET {$offset}
";

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
