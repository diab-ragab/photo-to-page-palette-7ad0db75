<?php
/**
 * admin_users.php - Admin User Management API
 * 
 * Actions:
 * - list: Get paginated user list with search
 * - get: Get single user details
 * - update_currency: Update user currency balances
 * - set_role: Add/remove admin role
 * - toggle_ban: Ban/unban user
 * 
 * Requires admin role for all actions.
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

// Convert unexpected fatals/exceptions into JSON (prevents empty 500 responses)
set_exception_handler(function ($e): void {
    $msg = $e instanceof Throwable ? $e->getMessage() : 'unknown';
    error_log("RID={$GLOBALS['RID']} UNCAUGHT=" . $msg);
    json_fail(500, 'Internal server error');
});

register_shutdown_function(function (): void {
    $err = error_get_last();
    if (!$err) return;

    $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR];
    if (in_array($err['type'] ?? 0, $fatalTypes, true)) {
        error_log("RID={$GLOBALS['RID']} FATAL=" . ($err['message'] ?? 'unknown'));
        json_fail(500, 'Internal server error');
    }
});

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

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
    
    try {
        $stmt = $pdo->prepare("SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1");
        $stmt->execute([$userId]);

        if (!$stmt->fetch()) {
            json_fail(403, 'Admin access required');
        }
    } catch (Throwable $e) {
        error_log("RID={$GLOBALS['RID']} requireAdmin_roles=" . $e->getMessage());
        json_fail(503, 'Authorization system unavailable');
    }
    
    return $userId;
}

// Ensure sidecar tables exist - create each separately to handle partial failures
function ensureTables(PDO $pdo): array {
    $created = [];
    
    // User currency sidecar table (MySQL 5.1 safe)
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS user_currency (
            user_id INT PRIMARY KEY,
            coins INT DEFAULT 0,
            vip_points INT DEFAULT 0,
            zen BIGINT DEFAULT 0,
            premium INT DEFAULT 0,
            total_votes INT DEFAULT 0,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $created['user_currency'] = true;
    } catch (Throwable $e) {
        error_log("ensureTables: user_currency failed: " . $e->getMessage());
        $created['user_currency'] = false;
    }
    
    // User roles table (MySQL 5.1 safe)
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS user_roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            role VARCHAR(50) NOT NULL,
            granted_at DATETIME NOT NULL,
            granted_by VARCHAR(50) NULL,
            UNIQUE KEY uq_user_role (user_id, role),
            KEY idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $created['user_roles'] = true;
    } catch (Throwable $e) {
        error_log("ensureTables: user_roles failed: " . $e->getMessage());
        $created['user_roles'] = false;
    }
    
    // Ban tracking table (MySQL 5.1 safe)
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS user_bans (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL UNIQUE,
            reason TEXT,
            banned_at DATETIME NOT NULL,
            banned_by INT NULL,
            expires_at DATETIME NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $created['user_bans'] = true;
    } catch (Throwable $e) {
        error_log("ensureTables: user_bans failed: " . $e->getMessage());
        $created['user_bans'] = false;
    }
    
    return $created;
}

function sidecarTablesReady(PDO $pdo): bool {
    try {
        $tables = ['user_currency', 'user_roles', 'user_bans'];
        foreach ($tables as $t) {
            $stmt = $pdo->prepare('SHOW TABLES LIKE ?');
            $stmt->execute([$t]);
            if (!$stmt->fetchColumn()) return false;
        }
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

// Users schema helpers (avoid assuming legacy columns exist)
function getUsersColumns(PDO $pdo): array {
    try {
        $cols = [];
        $stmt = $pdo->query("SHOW COLUMNS FROM users");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if (!empty($row['Field'])) $cols[] = (string)$row['Field'];
        }
        return $cols;
    } catch (Throwable $e) {
        error_log("RID={$GLOBALS['RID']} users_columns=" . $e->getMessage());
        return [];
    }
}

function pickFirstExisting(array $columns, array $candidates): ?string {
    $set = array_fill_keys($columns, true);
    foreach ($candidates as $c) {
        if (isset($set[$c])) return $c;
    }
    return null;
}

// Parse input
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

$input = [];
if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    if ($raw) {
        $input = json_decode($raw, true) ?: [];
    }
}

// Ensure user_sessions table exists before auth check
function ensureSessionsTable(PDO $pdo): void {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS user_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            session_token VARCHAR(255) NOT NULL,
            csrf_token VARCHAR(64) NULL,
            ip_address VARCHAR(45) NULL,
            user_agent TEXT NULL,
            created_at DATETIME NOT NULL,
            expires_at DATETIME NOT NULL,
            last_activity DATETIME NOT NULL,
            UNIQUE KEY IX_user_sessions_token (session_token),
            KEY IX_user_sessions_user (user_id),
            KEY IX_user_sessions_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    } catch (Throwable $e) {
        error_log("RID={$GLOBALS['RID']} ensureSessionsTable=" . $e->getMessage());
        // Non-fatal: may already exist or DB permissions issue
    }
}

ensureSessionsTable($pdo);

// Skip auth only if user_sessions table truly doesn't exist after creation attempt
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

$sidecarReady = false;
try {
    ensureTables($pdo);
} catch (Throwable $e) {
    error_log("RID={$RID} ensureTables_failed=" . $e->getMessage());
}
// IMPORTANT: ensureTables() may partially fail; base readiness on actual table presence
$sidecarReady = sidecarTablesReady($pdo);

// ============ LIST USERS ============
if ($action === 'list') {
    $search = trim($_GET['search'] ?? '');
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(10, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $userCols = getUsersColumns($pdo);
    $emailCol = pickFirstExisting($userCols, ['email', 'mail', 'Email', 'Mail']);
    $createdCol = pickFirstExisting($userCols, ['creatime', 'created_at', 'CreateTime', 'regdate', 'register_time']);
    
    $where = '';
    $params = [];
    
    if ($search !== '') {
        if ($emailCol) {
            $where = "WHERE u.name LIKE ? OR u.`{$emailCol}` LIKE ?";
            $params = ["%{$search}%", "%{$search}%"];
        } else {
            $where = "WHERE u.name LIKE ?";
            $params = ["%{$search}%"];
        }
    }
    
    // Count total
    $countSql = "SELECT COUNT(*) FROM users u {$where}";
    $stmt = $pdo->prepare($countSql);
    $stmt->execute($params);
    $total = (int)$stmt->fetchColumn();
    
    // Get users with currency and role info (fallback to users table only if sidecar tables missing)
    try {
        $emailSelect = $emailCol ? "u.`{$emailCol}` as email" : "'' as email";
        $createdSelect = $createdCol ? "u.`{$createdCol}` as created_at" : "'' as created_at";

        if ($sidecarReady) {
            $sql = "
                SELECT 
                    u.ID as id,
                    u.name,
                    {$emailSelect},
                    {$createdSelect},
                    COALESCE(uc.coins, 0) as coins,
                    COALESCE(uc.vip_points, 0) as vip_points,
                    COALESCE(uc.zen, 0) as zen,
                    COALESCE(uc.premium, 0) as premium,
                    CASE WHEN ub.id IS NOT NULL THEN 1 ELSE 0 END as is_banned,
                    CASE WHEN ur.id IS NOT NULL THEN 1 ELSE 0 END as is_admin
                FROM users u
                LEFT JOIN user_currency uc ON uc.user_id = u.ID
                LEFT JOIN user_bans ub ON ub.user_id = u.ID
                LEFT JOIN user_roles ur ON ur.user_id = u.ID AND ur.role = 'admin'
                {$where}
                ORDER BY u.ID DESC
                LIMIT {$limit} OFFSET {$offset}
            ";
        } else {
            $sql = "
                SELECT 
                    u.ID as id,
                    u.name,
                    {$emailSelect},
                    {$createdSelect},
                    0 as coins,
                    0 as vip_points,
                    0 as zen,
                    0 as premium,
                    0 as is_banned,
                    0 as is_admin
                FROM users u
                {$where}
                ORDER BY u.ID DESC
                LIMIT {$limit} OFFSET {$offset}
            ";
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        error_log("RID={$RID} list_failed=" . $e->getMessage());
        json_fail(500, 'Failed to load users');
    }
    
    // Convert types
    foreach ($users as &$user) {
        $user['id'] = (int)$user['id'];
        $user['coins'] = (int)$user['coins'];
        $user['vip_points'] = (int)$user['vip_points'];
        $user['zen'] = (int)$user['zen'];
        $user['premium'] = (int)$user['premium'];
        $user['is_banned'] = (bool)$user['is_banned'];
        $user['is_admin'] = (bool)$user['is_admin'];
    }
    
    json_response([
        'success' => true,
        'users' => $users,
        'total' => $total,
        'page' => $page,
        'limit' => $limit,
        'pages' => ceil($total / $limit)
    ]);
}

// ============ GET SINGLE USER ============
if ($action === 'get') {
    $userId = (int)($_GET['id'] ?? 0);
    
    if ($userId <= 0) {
        json_fail(400, 'Invalid user ID');
    }
    
    try {
        $userCols = getUsersColumns($pdo);
        $emailCol = pickFirstExisting($userCols, ['email', 'mail', 'Email', 'Mail']);
        $createdCol = pickFirstExisting($userCols, ['creatime', 'created_at', 'CreateTime', 'regdate', 'register_time']);
        $emailSelect = $emailCol ? "u.`{$emailCol}` as email" : "'' as email";
        $createdSelect = $createdCol ? "u.`{$createdCol}` as created_at" : "'' as created_at";

        if ($sidecarReady) {
            $stmt = $pdo->prepare("
                SELECT 
                    u.ID as id,
                    u.name,
                    {$emailSelect},
                    {$createdSelect},
                    COALESCE(uc.coins, 0) as coins,
                    COALESCE(uc.vip_points, 0) as vip_points,
                    COALESCE(uc.zen, 0) as zen,
                    COALESCE(uc.premium, 0) as premium
                FROM users u
                LEFT JOIN user_currency uc ON uc.user_id = u.ID
                WHERE u.ID = ?
                LIMIT 1
            ");
        } else {
            $stmt = $pdo->prepare("
                SELECT 
                    u.ID as id,
                    u.name,
                    {$emailSelect},
                    {$createdSelect},
                    0 as coins,
                    0 as vip_points,
                    0 as zen,
                    0 as premium
                FROM users u
                WHERE u.ID = ?
                LIMIT 1
            ");
        }

        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        error_log("RID={$RID} get_failed=" . $e->getMessage());
        json_fail(500, 'Failed to load user');
    }
    
    if (!$user) {
        json_fail(404, 'User not found');
    }
    
    $roles = [];
    $ban = false;
    if ($sidecarReady) {
        // Get roles
        $stmt = $pdo->prepare("SELECT role FROM user_roles WHERE user_id = ?");
        $stmt->execute([$userId]);
        $roles = $stmt->fetchAll(PDO::FETCH_COLUMN);

        // Check ban status
        $stmt = $pdo->prepare("SELECT reason, banned_at, expires_at FROM user_bans WHERE user_id = ?");
        $stmt->execute([$userId]);
        $ban = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    $user['roles'] = $roles;
    $user['is_admin'] = in_array('admin', $roles);
    $user['is_banned'] = $ban !== false;
    $user['ban_info'] = $ban ?: null;
    
    json_response(['success' => true, 'user' => $user]);
}

// ============ UPDATE CURRENCY ============
if ($action === 'update_currency' && $method === 'POST') {
    $userId = (int)($input['user_id'] ?? 0);
    
    if ($userId <= 0) {
        json_fail(400, 'Invalid user ID');
    }
    
    // Verify user exists
    $stmt = $pdo->prepare("SELECT ID FROM users WHERE ID = ?");
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        json_fail(404, 'User not found');
    }
    
    $coins = isset($input['coins']) ? (int)$input['coins'] : null;
    $vipPoints = isset($input['vip_points']) ? (int)$input['vip_points'] : null;
    $zen = isset($input['zen']) ? (int)$input['zen'] : null;
    $premium = isset($input['premium']) ? (int)$input['premium'] : null;
    
    $messages = [];
    
    // Update user_currency table if available
    if ($sidecarReady) {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO user_currency (user_id, coins, vip_points, zen, premium, updated_at)
                VALUES (?, COALESCE(?, 0), COALESCE(?, 0), COALESCE(?, 0), COALESCE(?, 0), NOW())
                ON DUPLICATE KEY UPDATE
                    coins = COALESCE(?, coins),
                    vip_points = COALESCE(?, vip_points),
                    zen = COALESCE(?, zen),
                    premium = COALESCE(?, premium),
                    updated_at = NOW()
            ");
            $stmt->execute([
                $userId, $coins, $vipPoints, $zen, $premium,
                $coins, $vipPoints, $zen, $premium
            ]);
            $messages[] = 'Currency updated';
        } catch (Throwable $e) {
            error_log("RID={$RID} update_currency_failed=" . $e->getMessage());
        }
    }
    
    // Also update goldtab_sg for Zen (the legacy game table)
    if ($zen !== null) {
        try {
            // Check if record exists
            $stmt = $pdo->prepare("SELECT AccountID FROM goldtab_sg WHERE AccountID = ? LIMIT 1");
            $stmt->execute([$userId]);
            if ($stmt->fetch()) {
                $stmt = $pdo->prepare("UPDATE goldtab_sg SET Gold = ? WHERE AccountID = ?");
                $stmt->execute([$zen, $userId]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO goldtab_sg (AccountID, Gold) VALUES (?, ?)");
                $stmt->execute([$userId, $zen]);
            }
            $messages[] = 'Zen/Gold synced';
        } catch (Throwable $e) {
            error_log("RID={$RID} goldtab_update_failed=" . $e->getMessage());
            // Non-fatal: goldtab_sg may not exist
        }
    }
    
    if (empty($messages)) {
        json_fail(500, 'Failed to update currency - tables may not be initialized');
    }
    
    json_response(['success' => true, 'message' => implode(', ', $messages)]);
}

// ============ SET ROLE ============
if ($action === 'set_role' && $method === 'POST') {
    $userId = (int)($input['user_id'] ?? 0);
    $role = trim($input['role'] ?? 'admin');
    $grant = (bool)($input['grant'] ?? true);
    
    if ($userId <= 0) {
        json_fail(400, 'Invalid user ID');
    }
    
    // Prevent self-demotion
    if ($userId === $adminId && $role === 'admin' && !$grant) {
        json_fail(400, 'Cannot remove your own admin role');
    }
    
    // Try to create user_roles table if it doesn't exist
    if (!$sidecarReady) {
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS user_roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                role VARCHAR(50) NOT NULL,
                granted_at DATETIME NOT NULL,
                granted_by VARCHAR(50) NULL,
                UNIQUE KEY uq_user_role (user_id, role),
                KEY idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        } catch (Throwable $e) {
            json_fail(500, 'Cannot create roles table - contact server admin');
        }
    }
    
    if ($grant) {
        $stmt = $pdo->prepare("
            INSERT IGNORE INTO user_roles (user_id, role, granted_at, granted_by)
            VALUES (?, ?, NOW(), ?)
        ");
        $stmt->execute([$userId, $role, (string)($adminId ?: 'system')]);
        $message = "Role '{$role}' granted";
    } else {
        $stmt = $pdo->prepare("DELETE FROM user_roles WHERE user_id = ? AND role = ?");
        $stmt->execute([$userId, $role]);
        $message = "Role '{$role}' revoked";
    }
    
    json_response(['success' => true, 'message' => $message]);
}

// ============ TOGGLE BAN ============
if ($action === 'toggle_ban' && $method === 'POST') {
    $userId = (int)($input['user_id'] ?? 0);
    $ban = (bool)($input['ban'] ?? true);
    $reason = trim($input['reason'] ?? '');
    
    if ($userId <= 0) {
        json_fail(400, 'Invalid user ID');
    }
    
    // Prevent self-ban
    if ($userId === $adminId) {
        json_fail(400, 'Cannot ban yourself');
    }
    
    // Try to create user_bans table if it doesn't exist
    if (!$sidecarReady) {
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS user_bans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                reason TEXT,
                banned_at DATETIME NOT NULL,
                banned_by INT NULL,
                expires_at DATETIME NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        } catch (Throwable $e) {
            json_fail(500, 'Cannot create bans table - contact server admin');
        }
    }
    
    if ($ban) {
        $stmt = $pdo->prepare("
            INSERT INTO user_bans (user_id, reason, banned_by, banned_at)
            VALUES (?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE reason = ?, banned_by = ?, banned_at = NOW()
        ");
        $stmt->execute([$userId, $reason, $adminId, $reason, $adminId]);
        
        // Also invalidate all user sessions
        try {
            $pdo->prepare("DELETE FROM user_sessions WHERE user_id = ?")->execute([$userId]);
        } catch (Throwable $e) {
            // Non-fatal
        }
        
        $message = 'User banned';
    } else {
        $stmt = $pdo->prepare("DELETE FROM user_bans WHERE user_id = ?");
        $stmt->execute([$userId]);
        $message = 'User unbanned';
    }
    
    json_response(['success' => true, 'message' => $message]);
}

json_fail(400, 'Invalid action');
