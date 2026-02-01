<?php
/**
 * user_orders.php - User Order History API
 * 
 * Actions:
 * - list: Get user's order history
 * 
 * Requires authentication.
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

$RID = bin2hex(random_bytes(6));

function json_response(array $data) {
    global $RID;
    while (ob_get_level()) { ob_end_clean(); }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array_merge($data, array('rid' => $RID)), JSON_UNESCAPED_UNICODE);
    exit;
}

function json_fail($code, $msg) {
    global $RID;
    error_log("RID={$RID} RESP={$code} MSG={$msg}");
    while (ob_get_level()) { ob_end_clean(); }
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('success' => false, 'message' => $msg, 'rid' => $RID), JSON_UNESCAPED_UNICODE);
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

header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Session-Token, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
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

function requireAuth($pdo) {
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
    
    return (int)$session['user_id'];
}

// Parse input
$action = isset($_GET['action']) ? $_GET['action'] : 'list';

// Check if user_sessions table exists (for demo mode)
$skipAuth = false;
try {
    $pdo->query("SELECT 1 FROM user_sessions LIMIT 1");
} catch (Exception $e) {
    $skipAuth = true;
}

$userId = 0;
if (!$skipAuth) {
    $userId = requireAuth($pdo);
} else {
    // Demo mode - use provided user_id or default
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 1;
}

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
    
    // Get orders with product info
    $sql = "
        SELECT 
            o.id,
            o.product_id,
            o.quantity,
            o.total_coins,
            o.total_vip,
            o.total_zen,
            o.total_real,
            o.status,
            o.delivered_at,
            o.created_at,
            p.name as product_name,
            p.image_url as product_image,
            p.item_id
        FROM webshop_orders o
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

json_fail(400, 'Invalid action');
