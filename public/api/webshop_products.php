<?php
/**
 * Public Webshop Products API
 * Returns active products for all users (no auth required)
 * PHP 5.3+ compatible
 */

require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET', 'OPTIONS'));

header('Content-Type: application/json');

try {
    $pdo = getDbConnection();
    
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 50;
    $offset = ($page - 1) * $limit;
    
    // Build query for active products only
    $where = "WHERE is_active = 1";
    $params = array();
    
    if ($search !== '') {
        $where .= " AND name LIKE :search";
        $params[':search'] = "%" . $search . "%";
    }
    
    // Get total count
    $countSql = "SELECT COUNT(*) FROM webshop_products " . $where;
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();
    
    // Get products
    $sql = "SELECT id, name, item_id, item_quantity, price_real, description, image_url, is_active 
            FROM webshop_products 
            " . $where . " 
            ORDER BY id DESC 
            LIMIT " . intval($limit) . " OFFSET " . intval($offset);
    
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Cast numeric fields
    $result = array();
    foreach ($products as $p) {
        $result[] = array(
            'id' => (int) $p['id'],
            'name' => $p['name'],
            'item_id' => (int) $p['item_id'],
            'item_quantity' => (int) $p['item_quantity'],
            'price_real' => (float) $p['price_real'],
            'description' => $p['description'],
            'image_url' => $p['image_url'],
            'is_active' => $p['is_active'] ? true : false
        );
    }
    
    $pages = $total > 0 ? ceil($total / $limit) : 0;
    
    echo json_encode(array(
        'success' => true,
        'products' => $result,
        'total' => $total,
        'page' => $page,
        'pages' => $pages
    ));
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array(
        'success' => false,
        'message' => 'Failed to fetch products'
    ));
}
