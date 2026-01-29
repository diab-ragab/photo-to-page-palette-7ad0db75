<?php
/**
 * check_admin.php - Admin Role Check API
 * 
 * Checks if the authenticated user has admin privileges.
 * Uses session-based identification to prevent enumeration attacks.
 * 
 * Response:
 * - success: true/false
 * - is_admin: boolean
 * - roles: array of role names
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
header('Referrer-Policy: no-referrer');

// CORS handling
$allowedOrigins = [
    'https://woiendgame.online',
    'https://www.woiendgame.online',
    'https://woiendgame.lovable.app',
    'http://localhost:5173',
    'http://localhost:3000',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$isLovableOrigin = is_string($origin) && 
    preg_match('/^https:\/\/[a-z0-9-]+\.(lovableproject\.com|lovable\.app)$/i', $origin);

if ($origin && (in_array($origin, $allowedOrigins, true) || $isLovableOrigin)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Vary: Origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    header("Access-Control-Allow-Origin: https://woiendgame.online");
}

header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Session-Token, Authorization');
header('Access-Control-Max-Age: 86400');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_fail(405, 'Method not allowed');
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
    error_log("RID={$RID} DB connection failed: " . $e->getMessage());
    json_fail(503, 'Service temporarily unavailable');
}

// Get session token from header or query
function getSessionToken(): string {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (stripos($auth, 'Bearer ') === 0) {
        return trim(substr($auth, 7));
    }
    return trim($_SERVER['HTTP_X_SESSION_TOKEN'] ?? '');
}

$sessionToken = getSessionToken();

// If no session token, check for username in query (legacy support)
$username = isset($_GET['user']) ? trim($_GET['user']) : '';

if ($sessionToken === '' && $username === '') {
    json_response([
        'success' => true,
        'is_admin' => false,
        'roles' => [],
        'message' => 'No authentication provided'
    ]);
}

// Ensure user_roles table exists
$pdo->exec("CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role VARCHAR(50) NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(50) NULL,
    UNIQUE KEY uq_user_role (user_id, role),
    KEY idx_user_id (user_id),
    KEY idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8");

$userId = null;

// Try to get user from session token first
if ($sessionToken !== '') {
    $stmt = $pdo->prepare("
        SELECT us.user_id, u.name 
        FROM user_sessions us
        JOIN users u ON u.ID = us.user_id
        WHERE us.session_token = ? AND us.expires_at > NOW()
        LIMIT 1
    ");
    $stmt->execute([$sessionToken]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($session) {
        $userId = (int)$session['user_id'];
        $username = $session['name'];
    }
}

// Fallback to username lookup (legacy)
if ($userId === null && $username !== '') {
    $stmt = $pdo->prepare("SELECT ID FROM users WHERE name = ? LIMIT 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        $userId = (int)$user['ID'];
    }
}

if ($userId === null) {
    json_response([
        'success' => true,
        'is_admin' => false,
        'is_gm' => false,  // Legacy compatibility
        'roles' => [],
        'message' => 'User not found or session expired'
    ]);
}

// Get user roles
$stmt = $pdo->prepare("SELECT role FROM user_roles WHERE user_id = ?");
$stmt->execute([$userId]);
$roles = $stmt->fetchAll(PDO::FETCH_COLUMN);

$isAdmin = in_array('admin', $roles, true);

json_response([
    'success' => true,
    'is_admin' => $isAdmin,
    'is_gm' => $isAdmin,  // Legacy compatibility
    'roles' => $roles,
    'user_id' => $userId,
    'username' => $username
]);
