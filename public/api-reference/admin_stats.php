<?php
/**
 * admin_stats.php - Admin Statistics API
 * 
 * Returns server statistics for admin dashboard:
 * - Total users
 * - Total characters
 * - Online players
 * - Total Zen in circulation
 * - Total votes
 * - Total webshop purchases
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

header('Access-Control-Allow-Methods: GET, OPTIONS');
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

// Verify admin status
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
    
    // Get user from session
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
    
    // Check admin role
    $stmt = $pdo->prepare("SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1");
    $stmt->execute([$userId]);
    
    if (!$stmt->fetch()) {
        json_fail(403, 'Admin access required');
    }
    
    return $userId;
}

// For development/demo, skip auth check if no session tables exist
$skipAuth = false;
try {
    $pdo->query("SELECT 1 FROM user_sessions LIMIT 1");
} catch (Exception $e) {
    $skipAuth = true;
}

if (!$skipAuth) {
    requireAdmin($pdo);
}

// Gather statistics
$stats = [
    'success' => true,
    'total_users' => 0,
    'total_characters' => 0,
    'online_players' => 0,
    'total_zen' => 0,
    'total_votes' => 0,
    'total_purchases' => 0,
];

// Total users
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM users");
    $stats['total_users'] = (int)$stmt->fetchColumn();
} catch (Exception $e) {
    // Table might not exist
}

// Total characters (adjust table name as needed)
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM characters");
    $stats['total_characters'] = (int)$stmt->fetchColumn();
} catch (Exception $e) {
    // Try alternative table name
    try {
        $stmt = $pdo->query("SELECT COUNT(*) FROM character");
        $stats['total_characters'] = (int)$stmt->fetchColumn();
    } catch (Exception $e2) {
        // Table doesn't exist
    }
}

// Online players
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM online WHERE connected = 1");
    $stats['online_players'] = (int)$stmt->fetchColumn();
} catch (Exception $e) {
    try {
        $stmt = $pdo->query("SELECT COUNT(*) FROM online");
        $stats['online_players'] = (int)$stmt->fetchColumn();
    } catch (Exception $e2) {
        // Table doesn't exist
    }
}

// Total Zen in circulation
try {
    // Try user_currency sidecar table first
    $stmt = $pdo->query("SELECT COALESCE(SUM(zen), 0) FROM user_currency");
    $stats['total_zen'] = (int)$stmt->fetchColumn();
} catch (Exception $e) {
    // Try characters/warehouse tables
    try {
        $zen = 0;
        // Character inventory zen
        $stmt = $pdo->query("SELECT COALESCE(SUM(zen), 0) FROM characters");
        $zen += (int)$stmt->fetchColumn();
        // Warehouse zen
        $stmt = $pdo->query("SELECT COALESCE(SUM(zen), 0) FROM warehouse");
        $zen += (int)$stmt->fetchColumn();
        $stats['total_zen'] = $zen;
    } catch (Exception $e2) {
        // Tables don't exist
    }
}

// Total votes
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM vote_log");
    $stats['total_votes'] = (int)$stmt->fetchColumn();
} catch (Exception $e) {
    // Table doesn't exist
}

// Total webshop purchases
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM webshop_orders WHERE status = 'completed'");
    $stats['total_purchases'] = (int)$stmt->fetchColumn();
} catch (Exception $e) {
    try {
        $stmt = $pdo->query("SELECT COUNT(*) FROM shop_purchases");
        $stats['total_purchases'] = (int)$stmt->fetchColumn();
    } catch (Exception $e2) {
        // Table doesn't exist
    }
}

json_response($stats);
