<?php
/**
 * api/webshop_admin.php
 * Admin Webshop Management API - Simplified Schema
 * PHP 5.3+ / MySQL 5.1+ compatible
 * 
 * Products: id, name, item_id, item_quantity
 * Orders: id, user_id, product_id, quantity, total_real, status, stripe_*, delivered_at, created_at, updated_at
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
if (ob_get_level() === 0) { ob_start(); }

// ---------- PHP 5.3 random_bytes fallback ----------
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

// ---------- Helpers ----------
function json_response($data) {
    global $RID;
    while (ob_get_level()) { ob_end_clean(); }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array_merge($data, array('rid' => $RID)));
    exit;
}

function json_fail($code, $msg) {
    global $RID;
    error_log("RID={$RID} code={$code} msg={$msg}");
    while (ob_get_level()) { ob_end_clean(); }
    if (function_exists('http_response_code')) http_response_code($code);
    else header("HTTP/1.1 {$code} Error");
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('success' => false, 'message' => $msg, 'rid' => $RID));
    exit;
}

function sanitize($input, $maxLen = 255) {
    $s = trim((string)$input);
    $s = strip_tags($s);
    $s = htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    if (function_exists('mb_substr')) return mb_substr($s, 0, $maxLen, 'UTF-8');
    return substr($s, 0, $maxLen);
}

// ---------- Security headers ----------
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Cache-Control: no-store');

// ---------- CORS ----------
$allowedOrigins = array(
    'https://woiendgame.online',
    'https://www.woiendgame.online',
    'https://woiendgame.lovable.app',
    'http://localhost:5173',
    'http://localhost:3000',
);
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$isLovableOrigin = is_string($origin) &&
    preg_match('/^https:\/\/[a-z0-9-]+\.(lovableproject\.com|lovable\.app)$/i', $origin);

if ($origin && (in_array($origin, $allowedOrigins, true) || $isLovableOrigin)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header("Vary: Origin");
    header("Access-Control-Allow-Credentials: true");
}
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Session-Token, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (function_exists('http_response_code')) http_response_code(204);
    else header("HTTP/1.1 204 No Content");
    exit;
}

// ---------- DB ----------
$DBHost     = getenv('DB_HOST') ? getenv('DB_HOST') : '192.168.1.88';
$DBUser     = getenv('DB_USER') ? getenv('DB_USER') : 'root';
$DBPassword = getenv('DB_PASS') ? getenv('DB_PASS') : 'root';
$DBName     = getenv('DB_NAME') ? getenv('DB_NAME') : 'shengui';

try {
    $pdo = new PDO("mysql:host={$DBHost};dbname={$DBName};charset=utf8", $DBUser, $DBPassword, array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
    ));
} catch (Exception $e) {
    json_fail(503, 'Service temporarily unavailable');
}

// ---------- Auth ----------
function getSessionToken() {
    $auth = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (stripos($auth, 'Bearer ') === 0) return trim(substr($auth, 7));
    return isset($_SERVER['HTTP_X_SESSION_TOKEN']) ? trim($_SERVER['HTTP_X_SESSION_TOKEN']) : '';
}

function requireAdmin($pdo) {
    $token = getSessionToken();
    if ($token === '') json_fail(401, 'Authentication required');

    $stmt = $pdo->prepare("SELECT user_id FROM user_sessions WHERE session_token = ? AND expires_at > NOW() LIMIT 1");
    $stmt->execute(array($token));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) json_fail(401, 'Session expired or invalid');

    $userId = (int)$row['user_id'];
    $stmt = $pdo->prepare("SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1");
    $stmt->execute(array($userId));
    if (!$stmt->fetch()) json_fail(403, 'Admin access required');

    return $userId;
}

// Skip auth if sessions system not installed
$skipAuth = false;
try { $pdo->query("SELECT 1 FROM user_sessions LIMIT 1"); }
catch (Exception $e) { $skipAuth = true; }
if (!$skipAuth) { requireAdmin($pdo); }

// ---------- Tables (Simplified Schema) ----------
function ensureTables($pdo) {
    // Simplified products table: id, name, item_id, item_quantity
    $pdo->exec("CREATE TABLE IF NOT EXISTS webshop_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        item_id INT NOT NULL DEFAULT 0,
        item_quantity INT NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

    // Simplified orders table
    $pdo->exec("CREATE TABLE IF NOT EXISTS webshop_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        total_real DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        status ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
        stripe_session_id VARCHAR(255) DEFAULT NULL,
        stripe_payment_intent VARCHAR(255) DEFAULT NULL,
        delivered_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_session (stripe_session_id),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

    // Rate limiting table
    $pdo->exec("CREATE TABLE IF NOT EXISTS payment_rate_limit (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip_address VARCHAR(64) NOT NULL,
        endpoint VARCHAR(32) NOT NULL,
        request_time DATETIME NOT NULL,
        KEY idx_ip_endpoint_time (ip_address, endpoint, request_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}
ensureTables($pdo);

// ---------- Input ----------
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
$action = isset($_GET['action']) ? $_GET['action'] : '';
$input = array();

if ($method === 'POST' || $method === 'DELETE') {
    $raw = file_get_contents('php://input');
    if ($raw) {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) $input = $decoded;
    }
}

// ---------- Router ----------
switch ($action) {

    // ========== PRODUCTS ==========
    case 'list_products': {
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        if ($page < 1) $page = 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        if ($limit < 10) $limit = 10;
        if ($limit > 100) $limit = 100;
        $offset = ($page - 1) * $limit;

        $where = "";
        $params = array();
        if ($search !== '') {
            $where = "WHERE name LIKE ?";
            $params[] = "%{$search}%";
        }

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM webshop_products {$where}");
        $stmt->execute($params);
        $total = (int)$stmt->fetchColumn();

        $sql = "SELECT * FROM webshop_products {$where} ORDER BY id DESC LIMIT {$offset}, {$limit}";
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

    case 'get_product': {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) json_fail(400, 'Invalid product ID');

        $stmt = $pdo->prepare("SELECT * FROM webshop_products WHERE id = ? LIMIT 1");
        $stmt->execute(array($id));
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$product) json_fail(404, 'Product not found');

        json_response(array('success' => true, 'product' => $product));
    }

    case 'add_product': {
        if ($method !== 'POST') json_fail(405, 'Method not allowed');

        $name = sanitize(isset($input['name']) ? $input['name'] : '', 200);
        if ($name === '') json_fail(400, 'Product name required');

        $itemId = isset($input['item_id']) ? (int)$input['item_id'] : 0;
        $itemQty = isset($input['item_quantity']) ? (int)$input['item_quantity'] : 1;
        if ($itemQty < 1) $itemQty = 1;

        $stmt = $pdo->prepare("INSERT INTO webshop_products (name, item_id, item_quantity) VALUES (?, ?, ?)");
        $stmt->execute(array($name, $itemId, $itemQty));

        json_response(array('success' => true, 'id' => (int)$pdo->lastInsertId(), 'message' => 'Product created'));
    }

    case 'update_product': {
        if ($method !== 'POST') json_fail(405, 'Method not allowed');

        $id = isset($input['id']) ? (int)$input['id'] : 0;
        if ($id <= 0) json_fail(400, 'Invalid product ID');

        $updates = array();
        $params = array();

        if (array_key_exists('name', $input)) {
            $updates[] = "name = ?";
            $params[] = sanitize($input['name'], 200);
        }
        if (array_key_exists('item_id', $input)) {
            $updates[] = "item_id = ?";
            $params[] = (int)$input['item_id'];
        }
        if (array_key_exists('item_quantity', $input)) {
            $qty = (int)$input['item_quantity'];
            if ($qty < 1) $qty = 1;
            $updates[] = "item_quantity = ?";
            $params[] = $qty;
        }

        if (!count($updates)) json_fail(400, 'No fields to update');

        $params[] = $id;
        $sql = "UPDATE webshop_products SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        json_response(array('success' => true, 'message' => 'Product updated'));
    }

    case 'delete_product': {
        if ($method !== 'POST' && $method !== 'DELETE') json_fail(405, 'Method not allowed');

        $id = 0;
        if (isset($input['id'])) $id = (int)$input['id'];
        elseif (isset($_GET['id'])) $id = (int)$_GET['id'];
        if ($id <= 0) json_fail(400, 'Invalid product ID');

        $stmt = $pdo->prepare("DELETE FROM webshop_products WHERE id = ?");
        $stmt->execute(array($id));

        json_response(array('success' => true, 'message' => 'Product deleted'));
    }

    // ========== ORDERS ==========
    case 'list_orders': {
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        if ($page < 1) $page = 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        if ($limit < 10) $limit = 10;
        if ($limit > 100) $limit = 100;
        $offset = ($page - 1) * $limit;

        $status = isset($_GET['status']) ? trim($_GET['status']) : '';
        $validStatuses = array('pending', 'completed', 'failed', 'refunded');

        $where = "";
        $params = array();
        if ($status !== '' && in_array($status, $validStatuses, true)) {
            $where = "WHERE o.status = ?";
            $params[] = $status;
        }

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM webshop_orders o {$where}");
        $stmt->execute($params);
        $total = (int)$stmt->fetchColumn();

        // Join with users and products for display names
        $sql = "
            SELECT o.*,
                   u.name as username,
                   p.name as product_name
            FROM webshop_orders o
            LEFT JOIN users u ON u.ID = o.user_id
            LEFT JOIN webshop_products p ON p.id = o.product_id
            {$where}
            ORDER BY o.created_at DESC
            LIMIT {$offset}, {$limit}
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

    case 'update_order': {
        if ($method !== 'POST') json_fail(405, 'Method not allowed');

        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $status = isset($input['status']) ? trim($input['status']) : '';

        if ($id <= 0) json_fail(400, 'Invalid order ID');

        $validStatuses = array('pending', 'completed', 'failed', 'refunded');
        if (!in_array($status, $validStatuses, true)) json_fail(400, 'Invalid status');

        $now = date('Y-m-d H:i:s');

        if ($status === 'completed') {
            $stmt = $pdo->prepare("UPDATE webshop_orders SET status = ?, delivered_at = ?, updated_at = ? WHERE id = ?");
            $stmt->execute(array($status, $now, $now, $id));
        } else {
            $stmt = $pdo->prepare("UPDATE webshop_orders SET status = ?, updated_at = ? WHERE id = ?");
            $stmt->execute(array($status, $now, $id));
        }

        if ($stmt->rowCount() === 0) json_fail(404, 'Order not found');

        json_response(array('success' => true, 'message' => 'Order status updated'));
    }

    case 'get_order': {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) json_fail(400, 'Invalid order ID');

        $stmt = $pdo->prepare("
            SELECT o.*,
                   u.name as username,
                   p.name as product_name
            FROM webshop_orders o
            LEFT JOIN users u ON u.ID = o.user_id
            LEFT JOIN webshop_products p ON p.id = o.product_id
            WHERE o.id = ?
            LIMIT 1
        ");
        $stmt->execute(array($id));
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$order) json_fail(404, 'Order not found');

        json_response(array('success' => true, 'order' => $order));
    }

    default:
        json_fail(400, 'Invalid action');
}
