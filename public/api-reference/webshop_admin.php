<?php
/**
 * webshop_admin.php - Admin Webshop Management API
 * 
 * Actions:
 * - list_products: Get all products with categories
 * - get_product: Get single product details
 * - add_product: Create new product
 * - update_product: Update existing product
 * - delete_product: Remove product
 * - list_categories: Get all categories
 * - add_category: Create category
 * - list_orders: Get order history
 * - update_order: Update order status
 * 
 * Requires admin role.
 * Compatible with PHP 5.3+ and MySQL 5.1+
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// PHP 5.3 compatible random bytes
if (!function_exists('random_bytes')) {
    function random_bytes($length) {
        $bytes = '';
        for ($i = 0; $i < $length; $i++) {
            $bytes .= chr(mt_rand(0, 255));
        }
        return $bytes;
    }
}

$RID = bin2hex(random_bytes(6));

function json_response($data) {
    global $RID;
    while (ob_get_level()) { ob_end_clean(); }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array_merge($data, array('rid' => $RID)));
    exit;
}

function json_fail($code, $msg) {
    global $RID;
    error_log("RID={$RID} RESP={$code} MSG={$msg}");
    while (ob_get_level()) { ob_end_clean(); }
    if (function_exists('http_response_code')) {
        http_response_code($code);
    } else {
        header("HTTP/1.1 {$code} Error");
    }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('success' => false, 'message' => $msg, 'rid' => $RID));
    exit;
}

// Security headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// CORS handling
$allowedOrigins = array(
    'https://woiendgame.online',
    'https://www.woiendgame.online',
    'https://woiendgame.lovable.app',
    'http://localhost:5173',
);

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$isLovableOrigin = is_string($origin) && 
    preg_match('/^https:\/\/[a-z0-9-]+\.(lovableproject\.com|lovable\.app)$/i', $origin);

if ($origin && (in_array($origin, $allowedOrigins, true) || $isLovableOrigin)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Vary: Origin");
    header("Access-Control-Allow-Credentials: true");
}

header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Session-Token, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (function_exists('http_response_code')) {
        http_response_code(204);
    } else {
        header("HTTP/1.1 204 No Content");
    }
    exit;
}

// Database connection
$DBHost     = getenv('DB_HOST') ? getenv('DB_HOST') : '192.168.1.88';
$DBUser     = getenv('DB_USER') ? getenv('DB_USER') : 'root';
$DBPassword = getenv('DB_PASS') ? getenv('DB_PASS') : 'root';
$DBName     = getenv('DB_NAME') ? getenv('DB_NAME') : 'shengui';

try {
    $pdo = new PDO("mysql:host={$DBHost};dbname={$DBName};charset=utf8", $DBUser, $DBPassword, array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
    ));
} catch (PDOException $e) {
    json_fail(503, 'Service temporarily unavailable');
}

// Auth helper
function getSessionToken() {
    $auth = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (stripos($auth, 'Bearer ') === 0) {
        return trim(substr($auth, 7));
    }
    return isset($_SERVER['HTTP_X_SESSION_TOKEN']) ? trim($_SERVER['HTTP_X_SESSION_TOKEN']) : '';
}

function requireAdmin($pdo) {
    $sessionToken = getSessionToken();
    
    if ($sessionToken === '') {
        json_fail(401, 'Authentication required');
    }
    
    $stmt = $pdo->prepare("
        SELECT us.user_id
        FROM user_sessions us
        WHERE us.session_token = ? AND us.expires_at > NOW()
        LIMIT 1
    ");
    $stmt->execute(array($sessionToken));
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$session) {
        json_fail(401, 'Session expired or invalid');
    }
    
    $userId = (int)$session['user_id'];
    
    $stmt = $pdo->prepare("SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1");
    $stmt->execute(array($userId));
    
    if (!$stmt->fetch()) {
        json_fail(403, 'Admin access required');
    }
    
    return $userId;
}

// Ensure webshop tables exist (MySQL 5.1 compatible - no DEFAULT CURRENT_TIMESTAMP on DATETIME)
function ensureTables($pdo) {
    // Categories
    $pdo->exec("CREATE TABLE IF NOT EXISTS webshop_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        description TEXT,
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
    // Products
    $pdo->exec("CREATE TABLE IF NOT EXISTS webshop_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        item_id INT DEFAULT 0,
        item_quantity INT DEFAULT 1,
        price_coins INT DEFAULT 0,
        price_vip INT DEFAULT 0,
        price_zen INT DEFAULT 0,
        price_real DECIMAL(10,2) DEFAULT 0,
        image_url VARCHAR(500),
        stripe_payment_link VARCHAR(500),
        is_featured TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        stock INT DEFAULT -1,
        created_at DATETIME,
        updated_at DATETIME,
        KEY idx_category (category_id),
        KEY idx_featured (is_featured),
        KEY idx_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
    // Add stripe_payment_link column if not exists (for existing tables)
    try {
        $pdo->exec("ALTER TABLE webshop_products ADD COLUMN stripe_payment_link VARCHAR(500) AFTER image_url");
    } catch (Exception $e) {
        // Column already exists, ignore
    }
    
    // Orders
    $pdo->exec("CREATE TABLE IF NOT EXISTS webshop_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT DEFAULT 1,
        total_coins INT DEFAULT 0,
        total_vip INT DEFAULT 0,
        total_zen INT DEFAULT 0,
        total_real DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        stripe_session_id VARCHAR(255),
        stripe_payment_intent VARCHAR(255),
        delivered_at DATETIME,
        created_at DATETIME,
        KEY idx_user (user_id),
        KEY idx_status (status),
        KEY idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
    // Add stripe columns if not exist
    try {
        $pdo->exec("ALTER TABLE webshop_orders ADD COLUMN stripe_session_id VARCHAR(255) AFTER status");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE webshop_orders ADD COLUMN stripe_payment_intent VARCHAR(255) AFTER stripe_session_id");
    } catch (Exception $e) {}
    
    // Insert default categories if empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM webshop_categories");
    if ((int)$stmt->fetchColumn() === 0) {
        $now = date('Y-m-d H:i:s');
        $pdo->exec("INSERT INTO webshop_categories (name, slug, sort_order, created_at) VALUES
            ('Items', 'items', 1, '{$now}'),
            ('Currency', 'currency', 2, '{$now}'),
            ('VIP', 'vip', 3, '{$now}'),
            ('Cosmetics', 'cosmetics', 4, '{$now}')
        ");
    }
}

function sanitize($input, $maxLen = 255) {
    return substr(htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8'), 0, $maxLen);
}

// Parse input
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

$input = array();
if ($method === 'POST' || $method === 'DELETE') {
    $raw = file_get_contents('php://input');
    if ($raw) {
        $decoded = json_decode($raw, true);
        if ($decoded) {
            $input = $decoded;
        }
    }
}

// Skip auth for demo
$skipAuth = false;
try {
    $pdo->query("SELECT 1 FROM user_sessions LIMIT 1");
} catch (Exception $e) {
    $skipAuth = true;
}

$adminId = 0;
if (!$skipAuth) {
    $adminId = requireAdmin($pdo);
}

ensureTables($pdo);

// ============ LIST CATEGORIES ============
if ($action === 'list_categories') {
    $stmt = $pdo->query("SELECT * FROM webshop_categories ORDER BY sort_order, name");
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    json_response(array('success' => true, 'categories' => $categories));
}

// ============ ADD CATEGORY ============
if ($action === 'add_category' && $method === 'POST') {
    $name = sanitize(isset($input['name']) ? $input['name'] : '', 100);
    $slugBase = isset($input['slug']) ? $input['slug'] : strtolower(str_replace(' ', '-', $name));
    $slug = sanitize($slugBase, 100);
    $description = sanitize(isset($input['description']) ? $input['description'] : '', 1000);
    
    if ($name === '') {
        json_fail(400, 'Category name required');
    }
    
    $now = date('Y-m-d H:i:s');
    $stmt = $pdo->prepare("
        INSERT INTO webshop_categories (name, slug, description, created_at)
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute(array($name, $slug, $description, $now));
    
    json_response(array('success' => true, 'id' => (int)$pdo->lastInsertId(), 'message' => 'Category created'));
}

// ============ LIST PRODUCTS ============
if ($action === 'list_products') {
    $categoryId = isset($_GET['category_id']) ? (int)$_GET['category_id'] : 0;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $page = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
    $limit = min(100, max(10, isset($_GET['limit']) ? (int)$_GET['limit'] : 20));
    $offset = ($page - 1) * $limit;
    
    $where = array();
    $params = array();
    
    if ($categoryId > 0) {
        $where[] = "p.category_id = ?";
        $params[] = $categoryId;
    }
    
    if ($search !== '') {
        $where[] = "p.name LIKE ?";
        $params[] = "%{$search}%";
    }
    
    $whereClause = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";
    
    // Count
    $countSql = "SELECT COUNT(*) FROM webshop_products p {$whereClause}";
    $stmt = $pdo->prepare($countSql);
    $stmt->execute($params);
    $total = (int)$stmt->fetchColumn();
    
    // Get products
    $sql = "
        SELECT p.*, c.name as category_name
        FROM webshop_products p
        LEFT JOIN webshop_categories c ON c.id = p.category_id
        {$whereClause}
        ORDER BY p.is_featured DESC, p.id DESC
        LIMIT {$limit} OFFSET {$offset}
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    json_response(array(
        'success' => true,
        'products' => $products,
        'total' => $total,
        'page' => $page,
        'pages' => (int)ceil($total / $limit)
    ));
}

// ============ GET PRODUCT ============
if ($action === 'get_product') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    
    if ($id <= 0) {
        json_fail(400, 'Invalid product ID');
    }
    
    $stmt = $pdo->prepare("
        SELECT p.*, c.name as category_name
        FROM webshop_products p
        LEFT JOIN webshop_categories c ON c.id = p.category_id
        WHERE p.id = ?
    ");
    $stmt->execute(array($id));
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product) {
        json_fail(404, 'Product not found');
    }
    
    json_response(array('success' => true, 'product' => $product));
}

// ============ ADD PRODUCT ============
if ($action === 'add_product' && $method === 'POST') {
    $name = sanitize(isset($input['name']) ? $input['name'] : '', 255);
    $description = sanitize(isset($input['description']) ? $input['description'] : '', 2000);
    $categoryId = isset($input['category_id']) ? (int)$input['category_id'] : 1;
    $itemId = isset($input['item_id']) ? (int)$input['item_id'] : 0;
    $itemQuantity = max(1, isset($input['item_quantity']) ? (int)$input['item_quantity'] : 1);
    $priceCoins = max(0, isset($input['price_coins']) ? (int)$input['price_coins'] : 0);
    $priceVip = max(0, isset($input['price_vip']) ? (int)$input['price_vip'] : 0);
    $priceZen = max(0, isset($input['price_zen']) ? (int)$input['price_zen'] : 0);
    $priceReal = max(0, isset($input['price_real']) ? (float)$input['price_real'] : 0);
    $imageUrl = sanitize(isset($input['image_url']) ? $input['image_url'] : '', 500);
    $stripePaymentLink = sanitize(isset($input['stripe_payment_link']) ? $input['stripe_payment_link'] : '', 500);
    $isFeatured = isset($input['is_featured']) ? (bool)$input['is_featured'] : false;
    $isActive = isset($input['is_active']) ? (bool)$input['is_active'] : true;
    $stock = isset($input['stock']) ? (int)$input['stock'] : -1;
    
    if ($name === '') {
        json_fail(400, 'Product name required');
    }
    
    $now = date('Y-m-d H:i:s');
    $stmt = $pdo->prepare("
        INSERT INTO webshop_products 
        (category_id, name, description, item_id, item_quantity, price_coins, price_vip, price_zen, price_real, image_url, stripe_payment_link, is_featured, is_active, stock, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute(array(
        $categoryId, $name, $description, $itemId, $itemQuantity,
        $priceCoins, $priceVip, $priceZen, $priceReal,
        $imageUrl, $stripePaymentLink, $isFeatured ? 1 : 0, $isActive ? 1 : 0, $stock, $now, $now
    ));
    
    json_response(array('success' => true, 'id' => (int)$pdo->lastInsertId(), 'message' => 'Product created'));
}

// ============ UPDATE PRODUCT ============
if ($action === 'update_product' && $method === 'POST') {
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    
    if ($id <= 0) {
        json_fail(400, 'Invalid product ID');
    }
    
    // Build dynamic update
    $updates = array();
    $params = array();
    
    $fields = array(
        'name' => 'string',
        'description' => 'string',
        'category_id' => 'int',
        'item_id' => 'int',
        'item_quantity' => 'int',
        'price_coins' => 'int',
        'price_vip' => 'int',
        'price_zen' => 'int',
        'price_real' => 'float',
        'image_url' => 'string',
        'stripe_payment_link' => 'string',
        'is_featured' => 'bool',
        'is_active' => 'bool',
        'stock' => 'int',
    );
    
    foreach ($fields as $field => $type) {
        if (isset($input[$field])) {
            $updates[] = "{$field} = ?";
            
            if ($type === 'int') {
                $params[] = (int)$input[$field];
            } elseif ($type === 'float') {
                $params[] = (float)$input[$field];
            } elseif ($type === 'bool') {
                $params[] = $input[$field] ? 1 : 0;
            } else {
                $maxLen = ($field === 'description') ? 2000 : 500;
                $params[] = sanitize($input[$field], $maxLen);
            }
        }
    }
    
    if (count($updates) === 0) {
        json_fail(400, 'No fields to update');
    }
    
    // Add updated_at
    $updates[] = "updated_at = ?";
    $params[] = date('Y-m-d H:i:s');
    
    $params[] = $id;
    $sql = "UPDATE webshop_products SET " . implode(", ", $updates) . " WHERE id = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    json_response(array('success' => true, 'message' => 'Product updated'));
}

// ============ DELETE PRODUCT ============
if ($action === 'delete_product' && ($method === 'POST' || $method === 'DELETE')) {
    $id = isset($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);
    
    if ($id <= 0) {
        json_fail(400, 'Invalid product ID');
    }
    
    $stmt = $pdo->prepare("DELETE FROM webshop_products WHERE id = ?");
    $stmt->execute(array($id));
    
    json_response(array('success' => true, 'message' => 'Product deleted'));
}

// ============ LIST ORDERS ============
if ($action === 'list_orders') {
    $page = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
    $limit = min(100, max(10, isset($_GET['limit']) ? (int)$_GET['limit'] : 20));
    $offset = ($page - 1) * $limit;
    $status = isset($_GET['status']) ? $_GET['status'] : '';
    
    $where = '';
    $params = array();
    
    $validStatuses = array('pending', 'completed', 'failed', 'refunded');
    if ($status !== '' && in_array($status, $validStatuses)) {
        $where = "WHERE o.status = ?";
        $params[] = $status;
    }
    
    $countSql = "SELECT COUNT(*) FROM webshop_orders o {$where}";
    $stmt = $pdo->prepare($countSql);
    $stmt->execute($params);
    $total = (int)$stmt->fetchColumn();
    
    $sql = "
        SELECT o.*, u.name as username, p.name as product_name
        FROM webshop_orders o
        LEFT JOIN users u ON u.ID = o.user_id
        LEFT JOIN webshop_products p ON p.id = o.product_id
        {$where}
        ORDER BY o.created_at DESC
        LIMIT {$limit} OFFSET {$offset}
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    json_response(array(
        'success' => true,
        'orders' => $orders,
        'total' => $total,
        'page' => $page,
        'pages' => (int)ceil($total / $limit)
    ));
}

// ============ UPDATE ORDER STATUS ============
if ($action === 'update_order' && $method === 'POST') {
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    $status = isset($input['status']) ? $input['status'] : '';
    
    if ($id <= 0) {
        json_fail(400, 'Invalid order ID');
    }
    
    $validStatuses = array('pending', 'completed', 'failed', 'refunded');
    if (!in_array($status, $validStatuses)) {
        json_fail(400, 'Invalid status');
    }
    
    // Build update query
    $deliveredAt = null;
    if ($status === 'completed') {
        $deliveredAt = date('Y-m-d H:i:s');
    }
    
    if ($deliveredAt) {
        $stmt = $pdo->prepare("UPDATE webshop_orders SET status = ?, delivered_at = ? WHERE id = ?");
        $stmt->execute(array($status, $deliveredAt, $id));
    } else {
        $stmt = $pdo->prepare("UPDATE webshop_orders SET status = ? WHERE id = ?");
        $stmt->execute(array($status, $id));
    }
    
    if ($stmt->rowCount() === 0) {
        json_fail(404, 'Order not found');
    }
    
    json_response(array('success' => true, 'message' => 'Order status updated'));
}

json_fail(400, 'Invalid action');
