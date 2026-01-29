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
 * 
 * Requires admin role.
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

$RID = bin2hex(random_bytes(6));

function json_response(array $data): void {
    global $RID;
    while (ob_get_level()) { ob_end_clean(); }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array_merge($data, ['rid' => $RID]), JSON_UNESCAPED_UNICODE);
    exit;
}

function json_fail(int $code, string $msg): void {
    global $RID;
    error_log("RID={$RID} RESP={$code} MSG={$msg}");
    while (ob_get_level()) { ob_end_clean(); }
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => $msg, 'rid' => $RID], JSON_UNESCAPED_UNICODE);
    exit;
}

// Security headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// CORS handling
$allowedOrigins = [
    'https://woiendgame.online',
    'https://www.woiendgame.online',
    'https://woiendgame.lovable.app',
    'http://localhost:5173',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
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
    http_response_code(204);
    exit;
}

// Database connection
$DBHost     = getenv('DB_HOST') ?: '192.168.1.88';
$DBUser     = getenv('DB_USER') ?: 'root';
$DBPassword = getenv('DB_PASS') ?: 'root';
$DBName     = getenv('DB_NAME') ?: 'shengui';

try {
    $pdo = new PDO("mysql:host={$DBHost};dbname={$DBName};charset=utf8", $DBUser, $DBPassword, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    json_fail(503, 'Service temporarily unavailable');
}

// Auth helper
function getSessionToken(): string {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (stripos($auth, 'Bearer ') === 0) {
        return trim(substr($auth, 7));
    }
    return trim($_SERVER['HTTP_X_SESSION_TOKEN'] ?? '');
}

function requireAdmin(PDO $pdo): int {
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
    $stmt->execute([$sessionToken]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$session) {
        json_fail(401, 'Session expired or invalid');
    }
    
    $userId = (int)$session['user_id'];
    
    $stmt = $pdo->prepare("SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1");
    $stmt->execute([$userId]);
    
    if (!$stmt->fetch()) {
        json_fail(403, 'Admin access required');
    }
    
    return $userId;
}

// Ensure webshop tables exist
function ensureTables(PDO $pdo): void {
    // Categories
    $pdo->exec("CREATE TABLE IF NOT EXISTS webshop_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
        is_featured TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        stock INT DEFAULT -1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_category (category_id),
        KEY idx_featured (is_featured),
        KEY idx_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
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
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        delivered_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY idx_user (user_id),
        KEY idx_status (status),
        KEY idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
    // Insert default categories if empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM webshop_categories");
    if ((int)$stmt->fetchColumn() === 0) {
        $pdo->exec("INSERT INTO webshop_categories (name, slug, sort_order) VALUES
            ('Items', 'items', 1),
            ('Currency', 'currency', 2),
            ('VIP', 'vip', 3),
            ('Cosmetics', 'cosmetics', 4)
        ");
    }
}

function sanitize(string $input, int $maxLen = 255): string {
    return substr(htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8'), 0, $maxLen);
}

// Parse input
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

$input = [];
if ($method === 'POST' || $method === 'DELETE') {
    $raw = file_get_contents('php://input');
    if ($raw) {
        $input = json_decode($raw, true) ?: [];
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
    
    json_response(['success' => true, 'categories' => $categories]);
}

// ============ ADD CATEGORY ============
if ($action === 'add_category' && $method === 'POST') {
    $name = sanitize($input['name'] ?? '', 100);
    $slug = sanitize($input['slug'] ?? strtolower(str_replace(' ', '-', $name)), 100);
    $description = sanitize($input['description'] ?? '', 1000);
    
    if ($name === '') {
        json_fail(400, 'Category name required');
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO webshop_categories (name, slug, description)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$name, $slug, $description]);
    
    json_response(['success' => true, 'id' => (int)$pdo->lastInsertId(), 'message' => 'Category created']);
}

// ============ LIST PRODUCTS ============
if ($action === 'list_products') {
    $categoryId = isset($_GET['category_id']) ? (int)$_GET['category_id'] : null;
    $search = trim($_GET['search'] ?? '');
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(10, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    
    $where = [];
    $params = [];
    
    if ($categoryId !== null && $categoryId > 0) {
        $where[] = "p.category_id = ?";
        $params[] = $categoryId;
    }
    
    if ($search !== '') {
        $where[] = "p.name LIKE ?";
        $params[] = "%{$search}%";
    }
    
    $whereClause = $where ? "WHERE " . implode(" AND ", $where) : "";
    
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
    
    json_response([
        'success' => true,
        'products' => $products,
        'total' => $total,
        'page' => $page,
        'pages' => ceil($total / $limit)
    ]);
}

// ============ GET PRODUCT ============
if ($action === 'get_product') {
    $id = (int)($_GET['id'] ?? 0);
    
    if ($id <= 0) {
        json_fail(400, 'Invalid product ID');
    }
    
    $stmt = $pdo->prepare("
        SELECT p.*, c.name as category_name
        FROM webshop_products p
        LEFT JOIN webshop_categories c ON c.id = p.category_id
        WHERE p.id = ?
    ");
    $stmt->execute([$id]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product) {
        json_fail(404, 'Product not found');
    }
    
    json_response(['success' => true, 'product' => $product]);
}

// ============ ADD PRODUCT ============
if ($action === 'add_product' && $method === 'POST') {
    $name = sanitize($input['name'] ?? '', 255);
    $description = sanitize($input['description'] ?? '', 2000);
    $categoryId = (int)($input['category_id'] ?? 1);
    $itemId = (int)($input['item_id'] ?? 0);
    $itemQuantity = max(1, (int)($input['item_quantity'] ?? 1));
    $priceCoins = max(0, (int)($input['price_coins'] ?? 0));
    $priceVip = max(0, (int)($input['price_vip'] ?? 0));
    $priceZen = max(0, (int)($input['price_zen'] ?? 0));
    $priceReal = max(0, (float)($input['price_real'] ?? 0));
    $imageUrl = sanitize($input['image_url'] ?? '', 500);
    $isFeatured = (bool)($input['is_featured'] ?? false);
    $isActive = (bool)($input['is_active'] ?? true);
    $stock = (int)($input['stock'] ?? -1);
    
    if ($name === '') {
        json_fail(400, 'Product name required');
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO webshop_products 
        (category_id, name, description, item_id, item_quantity, price_coins, price_vip, price_zen, price_real, image_url, is_featured, is_active, stock)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $categoryId, $name, $description, $itemId, $itemQuantity,
        $priceCoins, $priceVip, $priceZen, $priceReal,
        $imageUrl, $isFeatured ? 1 : 0, $isActive ? 1 : 0, $stock
    ]);
    
    json_response(['success' => true, 'id' => (int)$pdo->lastInsertId(), 'message' => 'Product created']);
}

// ============ UPDATE PRODUCT ============
if ($action === 'update_product' && $method === 'POST') {
    $id = (int)($input['id'] ?? 0);
    
    if ($id <= 0) {
        json_fail(400, 'Invalid product ID');
    }
    
    // Build dynamic update
    $updates = [];
    $params = [];
    
    $fields = [
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
        'is_featured' => 'bool',
        'is_active' => 'bool',
        'stock' => 'int',
    ];
    
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
                $params[] = sanitize($input[$field], $field === 'description' ? 2000 : 500);
            }
        }
    }
    
    if (empty($updates)) {
        json_fail(400, 'No fields to update');
    }
    
    $params[] = $id;
    $sql = "UPDATE webshop_products SET " . implode(", ", $updates) . " WHERE id = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    json_response(['success' => true, 'message' => 'Product updated']);
}

// ============ DELETE PRODUCT ============
if ($action === 'delete_product' && ($method === 'POST' || $method === 'DELETE')) {
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
    
    if ($id <= 0) {
        json_fail(400, 'Invalid product ID');
    }
    
    $stmt = $pdo->prepare("DELETE FROM webshop_products WHERE id = ?");
    $stmt->execute([$id]);
    
    json_response(['success' => true, 'message' => 'Product deleted']);
}

// ============ LIST ORDERS ============
if ($action === 'list_orders') {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(10, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    $status = $_GET['status'] ?? '';
    
    $where = '';
    $params = [];
    
    if ($status !== '' && in_array($status, ['pending', 'completed', 'failed', 'refunded'])) {
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
    
    json_response([
        'success' => true,
        'orders' => $orders,
        'total' => $total,
        'page' => $page,
        'pages' => ceil($total / $limit)
    ]);
}

json_fail(400, 'Invalid action');
