<?php
/**
 * auth_middleware.php - Authentication & Authorization Middleware
 * 
 * Place this file at: woiendgame.online/api/auth_middleware.php
 * Handles session management and role-based access control.
 */

// Session configuration
define('SESSION_LIFETIME', 1800);        // 30 minutes default
define('SESSION_LIFETIME_REMEMBER', 604800); // 7 days with "remember me"
define('SESSION_REGENERATE_INTERVAL', 300);  // 5 minutes

/**
 * Initialize secure session
 */
function initSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'domain' => '',
            'secure' => isset($_SERVER['HTTPS']),
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        session_start();
    }
    
    // Session expiration check
    $lifetime = ($_SESSION['remember_me'] ?? false) ? SESSION_LIFETIME_REMEMBER : SESSION_LIFETIME;
    
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > $lifetime) {
        session_unset();
        session_destroy();
        session_start();
        return;
    }
    
    $_SESSION['last_activity'] = time();
    
    // Session ID regeneration for security
    if (!isset($_SESSION['last_regeneration']) || 
        (time() - $_SESSION['last_regeneration']) > SESSION_REGENERATE_INTERVAL) {
        session_regenerate_id(true);
        $_SESSION['last_regeneration'] = time();
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
}

/**
 * Validate CSRF token for state-changing requests
 */
function validateCsrf(): bool {
    if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'DELETE', 'PATCH'])) {
        return true;
    }
    
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    
    return !empty($token) && hash_equals($sessionToken, $token);
}

/**
 * Require authenticated user
 */
function requireAuth(): void {
    initSession();
    
    if (empty($_SESSION['username'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }
}

/**
 * Require GM/Admin privileges
 * Uses 'admin' role from user_roles table
 */
function requireGM(): bool {
    initSession();
    
    $username = $_SESSION['username'] ?? null;
    
    if (!$username) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }
    
    // Validate CSRF token
    if (!validateCsrf()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Invalid CSRF token']);
        exit;
    }
    
    try {
        $db = getDB();
        
        // Get user ID from users table
        $stmt = $db->prepare("SELECT ID FROM users WHERE name = ? LIMIT 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'User not found']);
            exit;
        }
        
        // Check for 'admin' role in user_roles table
        $stmt = $db->prepare("SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1");
        $stmt->execute([$user['ID']]);
        
        if (!$stmt->fetchColumn()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Admin privileges required']);
            exit;
        }
        
        return true;
        
    } catch (Throwable $e) {
        error_log("requireGM error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Authorization check failed']);
        exit;
    }
}

/**
 * Generate legacy password hash (MD5 of username + password)
 * Only use this for compatibility with existing user table
 */
function legacy_hash(string $username, string $password): string {
    return md5($username . $password);
}
