<?php
/**
 * auth.php - Authentication Endpoints
 * 
 * Place this file at: woiendgame.online/api/auth.php
 * Handles login, logout, session check, and session refresh.
 */

require_once __DIR__ . '/config.php';
handleCors(['GET', 'POST', 'OPTIONS']);

header('Content-Type: application/json');

// Support action from query string OR form data
$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'check_session':
        handleCheckSession();
        break;
    case 'refresh_session':
        handleRefreshSession();
        break;
    default:
        jsonFail(400, 'Invalid action');
}

/**
 * Handle user login
 */
function handleLogin(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonFail(405, 'Method not allowed');
    }
    
    // Support both JSON body and FormData
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== false) {
        $input = getJsonInput();
        $username = sanitizeInput($input['username'] ?? $input['login'] ?? '', 50);
        $password = $input['password'] ?? $input['passwd'] ?? '';
        $rememberMe = (bool)($input['remember_me'] ?? false);
    } else {
        // FormData from frontend
        $username = sanitizeInput($_POST['login'] ?? '', 50);
        $password = $_POST['passwd'] ?? '';
        $rememberMe = (bool)($_POST['remember_me'] ?? false);
    }
    
    if (empty($username) || empty($password)) {
        jsonFail(400, 'Username and password required');
    }
    
    try {
        $db = getDB();
        
        // Check credentials using legacy hash
        $stmt = $db->prepare("SELECT ID, name, email FROM users WHERE name = ? AND password = ? LIMIT 1");
        $stmt->execute([$username, legacy_hash($username, $password)]);
        $user = $stmt->fetch();
        
        if (!$user) {
            // Security: Don't reveal whether username exists
            jsonFail(401, 'Invalid credentials');
        }
        
        // Initialize session
        initSession();
        session_regenerate_id(true);
        
        $_SESSION['username'] = $user['name'];
        $_SESSION['user_id'] = $user['ID'];
        $_SESSION['remember_me'] = $rememberMe;
        $_SESSION['last_activity'] = time();
        $_SESSION['last_regeneration'] = time();
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        
        echo json_encode([
            'success' => true,
            'user' => [
                'username' => $user['name'],
                'email' => $user['email'] ?? ''
            ],
            'csrf_token' => $_SESSION['csrf_token']
        ]);
        
    } catch (Throwable $e) {
        error_log("Login error: " . $e->getMessage());
        jsonFail(500, 'Login failed');
    }
}

/**
 * Handle user logout
 */
function handleLogout(): void {
    initSession();
    
    $_SESSION = [];
    
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    session_destroy();
    
    echo json_encode(['success' => true, 'message' => 'Logged out']);
}

/**
 * Check if session is valid
 */
function handleCheckSession(): void {
    initSession();
    
    $username = $_SESSION['username'] ?? null;
    
    if ($username) {
        echo json_encode([
            'authenticated' => true,
            'user' => [
                'username' => $username,
                'email' => '' // Fetch from DB if needed
            ],
            'csrf_token' => $_SESSION['csrf_token'] ?? null
        ]);
    } else {
        echo json_encode([
            'authenticated' => false,
            'user' => null
        ]);
    }
}

/**
 * Refresh session (extends expiry, rotates ID)
 */
function handleRefreshSession(): void {
    initSession();
    
    if (empty($_SESSION['username'])) {
        jsonFail(401, 'Not authenticated');
    }
    
    // Force session regeneration
    session_regenerate_id(true);
    $_SESSION['last_activity'] = time();
    $_SESSION['last_regeneration'] = time();
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    
    echo json_encode([
        'success' => true,
        'csrf_token' => $_SESSION['csrf_token']
    ]);
}
