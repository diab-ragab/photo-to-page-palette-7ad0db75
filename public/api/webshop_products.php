<?php
/**
 * Public Webshop Products API
 * Returns active products for all users (no auth required)
 */

// IMPORTANT:
// Rely on centralized CORS + error handling in bootstrap.php.
// Do NOT set wildcard origin here (breaks when credentials are involved).
require_once __DIR__ . '/bootstrap.php';

header('Content-Type: application/json');

try {
    $pdo = getDbConnection();
    
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = min(100, max(1, intval($_GET['limit'] ?? 50)));
    $offset = ($page - 1) * $limit;
    
    // Build query for active products only
    $where = "WHERE is_active = 1";
    $params = [];
    
    if ($search !== '') {
        $where .= " AND name LIKE :search";
        $params[':search'] = "%{$search}%";
    }
    
    // Get total count
    $countSql = "SELECT COUNT(*) FROM webshop_products {$where}";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();
    
    // Get products
    $sql = "SELECT id, name, item_id, item_quantity, price_real, description, image_url, is_active 
            FROM webshop_products 
            {$where} 
            ORDER BY id DESC 
            LIMIT :limit OFFSET :offset";
    
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Cast numeric fields
    foreach ($products as &$p) {
        $p['id'] = (int) $p['id'];
        $p['item_id'] = (int) $p['item_id'];
        $p['item_quantity'] = (int) $p['item_quantity'];
        $p['price_real'] = (float) $p['price_real'];
        $p['is_active'] = (bool) $p['is_active'];
    }
    
    echo json_encode([
        'success' => true,
        'products' => $products,
        'total' => $total,
        'page' => $page,
        'pages' => ceil($total / $limit)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch products'
    ]);
}
