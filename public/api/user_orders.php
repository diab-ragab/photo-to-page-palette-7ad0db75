<?php
/**
 * user_orders.php - User Order History API
 * 
 * Actions:
 * - list: Get user's order history
 * 
 * Simplified schema: webshop_orders(id, user_id, product_id, quantity, total_real, status, ...)
 * Requires authentication.
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';

header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();

// Require authentication
$user = requireAuth();
$userId = $user['user_id'];

// Parse input
$action = isset($_GET['action']) ? $_GET['action'] : 'list';

// Get database connection
$pdo = getDB();

// ============ LIST ORDERS ============
if ($action === 'list') {
    $page = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
    $limit = min(50, max(5, isset($_GET['limit']) ? (int)$_GET['limit'] : 10));
    $offset = ($page - 1) * $limit;
    $status = isset($_GET['status']) ? $_GET['status'] : '';
    
    $where = "WHERE o.user_id = ?";
    $params = array($userId);
    
    if ($status !== '' && in_array($status, array('pending', 'completed', 'failed', 'refunded'))) {
        $where .= " AND o.status = ?";
        $params[] = $status;
    }
    
    // Count total
    $countSql = "SELECT COUNT(*) FROM webshop_orders o {$where}";
    $stmt = $pdo->prepare($countSql);
    $stmt->execute($params);
    $total = (int)$stmt->fetchColumn();
    
    // Get orders with product info (simplified schema)
    $sql = "
        SELECT 
            o.id,
            o.product_id,
            o.quantity,
            o.total_real,
            o.status,
            o.delivered_at,
            o.created_at,
            p.name as product_name,
            p.item_id
        FROM webshop_orders o
        LEFT JOIN webshop_products p ON p.id = o.product_id
        {$where}
        ORDER BY o.created_at DESC
        LIMIT {$offset}, {$limit}
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse(array(
        'success' => true,
        'orders' => $orders,
        'total' => $total,
        'page' => $page,
        'pages' => (int)ceil($total / $limit)
    ));
}

jsonFail(400, 'Invalid action');
