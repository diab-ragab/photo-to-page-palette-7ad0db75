<?php
/**
 * admin_stats.php - Admin Statistics API
 * 
 * Returns server statistics for admin dashboard.
 * Requires admin role.
 */

require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET', 'OPTIONS'));
require_once __DIR__ . '/session_helper.php';

header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();

// Require admin access
$user = requireAdmin();

// Get database connection
$pdo = getDB();

// Gather statistics
$stats = array(
    'success' => true,
    'total_users' => 0,
    'total_characters' => 0,
    'online_players' => 0,
    'total_zen' => 0,
    'total_votes' => 0,
    'total_purchases' => 0,
    'last_order' => null,
    'recent_orders' => array(),
    'rid' => $RID,
);

// Total users
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM users");
    $stats['total_users'] = (int)$stmt->fetchColumn();
} catch (Exception $e) {}

// Total characters from basetab_sg (exclude deleted)
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM basetab_sg WHERE IsDel = 0");
    $stats['total_characters'] = (int)$stmt->fetchColumn();
} catch (Exception $e) {}

// Online players from memb_stat
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM memb_stat WHERE ConnectStat = 1");
    $stats['online_players'] = (int)$stmt->fetchColumn();
} catch (Exception $e) {
    // Fallback: recent activity in basetab_sg
    try {
        $stmt = $pdo->query("SELECT COUNT(*) FROM basetab_sg WHERE LastLogoutTime > DATE_SUB(NOW(), INTERVAL 5 MINUTE) AND IsDel = 0");
        $stats['online_players'] = (int)$stmt->fetchColumn();
    } catch (Exception $e2) {}
}

// Total Zen from goldtab_sg
try {
    $stmt = $pdo->query("SELECT COALESCE(SUM(Gold), 0) FROM goldtab_sg");
    $stats['total_zen'] = (int)$stmt->fetchColumn();
} catch (Exception $e) {}

// Total votes
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM vote_log");
    $stats['total_votes'] = (int)$stmt->fetchColumn();
} catch (Exception $e) {}

// Total webshop purchases
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM webshop_orders WHERE status = 'completed'");
    $stats['total_purchases'] = (int)$stmt->fetchColumn();
} catch (Exception $e) {}

// Detect username column
$usernameCol = 'name';
try {
    $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    if (in_array('login', $cols) && !in_array('name', $cols)) {
        $usernameCol = 'login';
    }
} catch (Exception $e) {}

// Recent orders (last 10) - includes webshop, bundles, and game passes
try {
    $stmt = $pdo->query("
        SELECT * FROM (
            SELECT 
                o.id,
                o.user_id,
                o.product_id,
                o.quantity,
                o.total_real,
                o.status,
                o.created_at,
                u.{$usernameCol} as username,
                p.name as product_name,
                'product' as order_type
            FROM webshop_orders o
            LEFT JOIN users u ON u.ID = o.user_id
            LEFT JOIN webshop_products p ON p.id = o.product_id
            
            UNION ALL
            
            SELECT 
                bo.id,
                bo.user_id,
                NULL as product_id,
                1 as quantity,
                bo.total_real,
                bo.status,
                bo.created_at,
                u2.{$usernameCol} as username,
                fb.name as product_name,
                'bundle' as order_type
            FROM bundle_orders bo
            LEFT JOIN users u2 ON u2.ID = bo.user_id
            LEFT JOIN flash_bundles fb ON fb.id = bo.bundle_id
            
            UNION ALL
            
            SELECT 
                gp.id,
                gp.user_id,
                NULL as product_id,
                1 as quantity,
                gp.price as total_real,
                gp.status,
                gp.created_at,
                u3.{$usernameCol} as username,
                CONCAT('Game Pass - ', UPPER(gp.tier)) as product_name,
                'gamepass' as order_type
            FROM gamepass_purchases gp
            LEFT JOIN users u3 ON u3.ID = gp.user_id
        ) combined
        ORDER BY created_at DESC
        LIMIT 10
    ");
    $recentOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($recentOrders as $order) {
        $stats['recent_orders'][] = array(
            'id' => (int)$order['id'],
            'user_id' => (int)$order['user_id'],
            'username' => $order['username'] ? $order['username'] : 'User #' . $order['user_id'],
            'product_id' => $order['product_id'] ? (int)$order['product_id'] : 0,
            'product_name' => $order['product_name'] ? $order['product_name'] : 'Product #' . $order['id'],
            'quantity' => (int)$order['quantity'],
            'total_real' => (float)$order['total_real'],
            'status' => $order['status'],
            'created_at' => $order['created_at'],
            'order_type' => $order['order_type'],
        );
    }
    
    if (count($stats['recent_orders']) > 0) {
        $stats['last_order'] = $stats['recent_orders'][0];
    }
} catch (Exception $e) {
    error_log("ADMIN_STATS_ORDERS_ERROR: " . $e->getMessage());
}

jsonResponse($stats);
