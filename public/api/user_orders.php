<?php
/**
 * user_orders.php - User Order History API
 * 
 * Actions:
 * - list: Get user's order history (webshop + bundles combined)
 * 
 * Returns orders from both webshop_orders and bundle_orders tables.
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
    
    // Build status filter
    $statusFilter = "";
    $statusParams = array();
    if ($status !== '' && in_array($status, array('pending', 'completed', 'failed', 'refunded'))) {
        $statusFilter = "AND status = ?";
        $statusParams[] = $status;
    }
    
    // Count total from both tables
    $countSql = "
        SELECT (
            SELECT COUNT(*) FROM webshop_orders WHERE user_id = ? {$statusFilter}
        ) + (
            SELECT COUNT(*) FROM bundle_orders WHERE user_id = ? {$statusFilter}
        ) as total
    ";
    $countParams = array_merge(array($userId), $statusParams, array($userId), $statusParams);
    $stmt = $pdo->prepare($countSql);
    $stmt->execute($countParams);
    $total = (int)$stmt->fetchColumn();
    
    // Get orders from both tables using UNION
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
            p.item_id,
            'product' as order_type,
            NULL as bundle_id
        FROM webshop_orders o
        LEFT JOIN webshop_products p ON p.id = o.product_id
        WHERE o.user_id = ? {$statusFilter}
        
        UNION ALL
        
        SELECT 
            bo.id,
            NULL as product_id,
            1 as quantity,
            bo.total_real,
            bo.status,
            bo.delivered_at,
            bo.created_at,
            fb.name as product_name,
            0 as item_id,
            'bundle' as order_type,
            bo.bundle_id
        FROM bundle_orders bo
        LEFT JOIN flash_bundles fb ON fb.id = bo.bundle_id
        WHERE bo.user_id = ? {$statusFilter}
        
        ORDER BY created_at DESC
        LIMIT {$offset}, {$limit}
    ";
    
    $orderParams = array_merge(array($userId), $statusParams, array($userId), $statusParams);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($orderParams);
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
