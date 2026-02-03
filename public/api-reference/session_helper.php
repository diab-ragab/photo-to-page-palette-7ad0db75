<?php
/**
 * session_helper.php - Unified session token verification
 * PHP 5.x compatible
 * 
 * Include this file in any API that needs authentication:
 *   require_once __DIR__ . '/session_helper.php';
 * 
 * Available functions:
 *   getSessionToken()      - Get token from headers/cookies
 *   getCurrentUser()       - Get authenticated user or null
 *   requireAuth()          - Require authentication (exits with 401 if not)
 *   requireAdmin()         - Require admin role (exits with 403 if not)
 *   getUserZenBalance()    - Get user's Zen from goldtab_sg
 *   deductUserZen()        - Deduct Zen from user's account
 */

// Prevent direct access
if (!function_exists('getDB')) {
    http_response_code(500);
    die('session_helper.php must be included after bootstrap.php');
}

/**
 * Generate unique Request ID
 */
if (!function_exists('generateRID')) {
    function generateRID() {
        if (function_exists('random_bytes')) {
            return bin2hex(random_bytes(6));
        }
        return substr(md5(uniqid(mt_rand(), true)), 0, 12);
    }
}

/**
 * Send JSON response and exit
 */
if (!function_exists('jsonResponse')) {
    function jsonResponse($data, $rid = null) {
        while (ob_get_level()) { ob_end_clean(); }
        header('Content-Type: application/json; charset=utf-8');
        if ($rid) $data['rid'] = $rid;
        echo json_encode($data);
        exit;
    }
}

/**
 * Send JSON error and exit
 */
if (!function_exists('jsonFail')) {
    function jsonFail($code, $msg, $rid = null) {
        while (ob_get_level()) { ob_end_clean(); }
        if (function_exists('http_response_code')) {
            http_response_code($code);
        } else {
            header("HTTP/1.1 {$code} Error");
        }
        header('Content-Type: application/json; charset=utf-8');
        $data = array('success' => false, 'error' => $msg);
        if ($rid) $data['rid'] = $rid;
        echo json_encode($data);
        exit;
    }
}

/**
 * Extract session token from various sources
 * Priority: Authorization header > X-Session-Token header > query param > cookie
 */
if (!function_exists('getSessionToken')) {
    function getSessionToken() {
        // Authorization: Bearer <token>
        $auth = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
        if (stripos($auth, 'Bearer ') === 0) {
            return trim(substr($auth, 7));
        }

        // X-Session-Token header
        $hdr = isset($_SERVER['HTTP_X_SESSION_TOKEN']) ? $_SERVER['HTTP_X_SESSION_TOKEN'] : '';
        if ($hdr !== '') {
            return trim($hdr);
        }

        // Query parameter (fallback)
        if (!empty($_GET['sessionToken'])) {
            return trim((string)$_GET['sessionToken']);
        }

        // Cookie (fallback)
        if (!empty($_COOKIE['sessionToken'])) {
            return trim((string)$_COOKIE['sessionToken']);
        }

        return '';
    }
}

/**
 * Resolve session from database
 * Tries raw token first, then SHA-256 hash
 * Returns associative array with user_id, name, expires_at or null
 */
if (!function_exists('resolveSessionRow')) {
    function resolveSessionRow($token) {
        if ($token === '') return null;

        $pdo = getDB();
        $hash = hash('sha256', $token);

        // Detect username column (name or login)
        $usernameCol = 'name';
        try {
            $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
            if (in_array('login', $cols) && !in_array('name', $cols)) {
                $usernameCol = 'login';
            }
        } catch (Exception $e) {}

        // Try raw token first
        try {
            $stmt = $pdo->prepare("
                SELECT us.user_id, u.{$usernameCol} as name, us.expires_at
                FROM user_sessions us
                JOIN users u ON u.ID = us.user_id
                WHERE us.session_token = ?
                LIMIT 1
            ");
            $stmt->execute(array($token));
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) return $row;
        } catch (Exception $e) {
            error_log("SESSION_RESOLVE_RAW_ERROR: " . $e->getMessage());
        }

        // Try SHA-256 hash
        try {
            $stmt = $pdo->prepare("
                SELECT us.user_id, u.{$usernameCol} as name, us.expires_at
                FROM user_sessions us
                JOIN users u ON u.ID = us.user_id
                WHERE us.session_token = ?
                LIMIT 1
            ");
            $stmt->execute(array($hash));
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) return $row;
        } catch (Exception $e) {
            error_log("SESSION_RESOLVE_HASH_ERROR: " . $e->getMessage());
        }

        // Try optional hash columns (for different DB schemas)
        $optionalColumns = array('token_hash', 'session_token_hash');
        foreach ($optionalColumns as $col) {
            try {
                $stmt = $pdo->prepare("
                    SELECT us.user_id, u.{$usernameCol} as name, us.expires_at
                    FROM user_sessions us
                    JOIN users u ON u.ID = us.user_id
                    WHERE us.$col = ?
                    LIMIT 1
                ");
                $stmt->execute(array($hash));
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($row) return $row;
            } catch (Exception $e) {
                // Column might not exist, continue
            }
        }

        return null;
    }
}

/**
 * Check if session is expired
 */
if (!function_exists('isSessionExpired')) {
    function isSessionExpired($expiresAt) {
        if (!$expiresAt) return true;
        $ts = strtotime($expiresAt);
        return ($ts === false || $ts <= time());
    }
}

/**
 * Touch session last_activity timestamp
 */
if (!function_exists('touchSession')) {
    function touchSession($token) {
        $pdo = getDB();
        $hash = hash('sha256', $token);

        // Try with raw token
        try {
            $pdo->prepare("UPDATE user_sessions SET last_activity = NOW() WHERE session_token = ?")
                ->execute(array($token));
        } catch (Exception $e) {}

        // Try with hash
        try {
            $pdo->prepare("UPDATE user_sessions SET last_activity = NOW() WHERE session_token = ?")
                ->execute(array($hash));
        } catch (Exception $e) {}
    }
}

/**
 * Extend session expiration
 */
if (!function_exists('extendSession')) {
    function extendSession($token, $minutes = 120) {
        $pdo = getDB();
        $hash = hash('sha256', $token);
        $newExpires = date('Y-m-d H:i:s', time() + ($minutes * 60));

        // Try with raw token
        try {
            $pdo->prepare("UPDATE user_sessions SET expires_at = ?, last_activity = NOW() WHERE session_token = ?")
                ->execute(array($newExpires, $token));
        } catch (Exception $e) {}

        // Try with hash
        try {
            $pdo->prepare("UPDATE user_sessions SET expires_at = ?, last_activity = NOW() WHERE session_token = ?")
                ->execute(array($newExpires, $hash));
        } catch (Exception $e) {}

        return $newExpires;
    }
}

/**
 * Get current authenticated user
 * Returns array with user_id, name, expires_at or null if not authenticated
 */
if (!function_exists('getCurrentUser')) {
    function getCurrentUser() {
        $token = getSessionToken();
        if ($token === '') return null;

        $sess = resolveSessionRow($token);
        if (!$sess) return null;

        // Check expiration
        if (!isset($sess['expires_at']) || isSessionExpired($sess['expires_at'])) {
            return null;
        }

        // Touch session (best effort)
        touchSession($token);

        return $sess;
    }
}

/**
 * Require authentication - exits with 401 if not authenticated
 * Returns user array if authenticated
 */
if (!function_exists('requireAuth')) {
    function requireAuth($jsonResponse = true) {
        $user = getCurrentUser();
        if (!$user) {
            if ($jsonResponse) {
                http_response_code(401);
                header('Content-Type: application/json');
                echo json_encode(array('success' => false, 'error' => 'Not authenticated'));
            }
            exit;
        }
        return $user;
    }
}

/**
 * Check if user has admin role
 */
if (!function_exists('isUserAdmin')) {
    function isUserAdmin($userId, $username = '') {
        $pdo = getDB();
        
        // Check user_roles table
        try {
            $stmt = $pdo->prepare("SELECT role FROM user_roles WHERE user_id = ?");
            $stmt->execute(array($userId));
            $roles = $stmt->fetchAll(PDO::FETCH_COLUMN);
            if (!$roles) $roles = array();

            if (in_array('admin', $roles, true) || in_array('gm', $roles, true)) {
                return true;
            }
        } catch (Exception $e) {
            // Table might not exist
        }

        // Check bootstrap config whitelist
        if (function_exists('getConfig')) {
            $cfg = (array)getConfig();
            $sec = isset($cfg['security']) ? $cfg['security'] : array();
            
            // Admin user IDs
            $adminIds = isset($sec['admin_user_ids']) && is_array($sec['admin_user_ids'])
                ? $sec['admin_user_ids']
                : (isset($cfg['admin_user_ids']) && is_array($cfg['admin_user_ids']) ? $cfg['admin_user_ids'] : array());
            
            // Admin usernames
            $adminNames = isset($sec['admin_usernames']) && is_array($sec['admin_usernames'])
                ? $sec['admin_usernames']
                : (isset($cfg['admin_usernames']) && is_array($cfg['admin_usernames']) ? $cfg['admin_usernames'] : array());

            if (in_array($userId, $adminIds, true)) {
                return true;
            }
            if ($username !== '' && in_array($username, $adminNames, true)) {
                return true;
            }
        }

        return false;
    }
}

/**
 * Require admin role - exits with 403 if not admin
 * Returns user array if admin
 */
if (!function_exists('requireAdmin')) {
    function requireAdmin($jsonResponse = true, $extendMinutes = 120) {
        $user = requireAuth($jsonResponse);
        
        $userId = (int)$user['user_id'];
        $username = isset($user['name']) ? (string)$user['name'] : '';

        if (!isUserAdmin($userId, $username)) {
            if ($jsonResponse) {
                http_response_code(403);
                header('Content-Type: application/json');
                echo json_encode(array('success' => false, 'error' => 'Admin access required'));
            }
            exit;
        }

        // Extend session for admin usage
        if ($extendMinutes > 0) {
            $token = getSessionToken();
            extendSession($token, $extendMinutes);
        }

        return $user;
    }
}

/**
 * Get user's Zen balance from goldtab_sg
 */
if (!function_exists('getUserZenBalance')) {
    function getUserZenBalance($userId) {
        $pdo = getDB();
        try {
            $stmt = $pdo->prepare("SELECT Gold FROM goldtab_sg WHERE AccountID = ? LIMIT 1");
            $stmt->execute(array($userId));
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row ? (int)$row['Gold'] : 0;
        } catch (Exception $e) {
            error_log("GET_ZEN_ERROR: " . $e->getMessage());
            return 0;
        }
    }
}

/**
 * Deduct Zen from user's account
 * Returns array('success' => bool, 'message' => string)
 */
if (!function_exists('deductUserZen')) {
    function deductUserZen($userId, $amount) {
        $pdo = getDB();
        try {
            $currentZen = getUserZenBalance($userId);
            if ($currentZen < $amount) {
                return array('success' => false, 'message' => 'Insufficient Zen balance');
            }

            // Use deductcash stored procedure for proper GoldInfo encryption sync
            $stmt = $pdo->prepare("CALL deductcash(?, ?)");
            $stmt->execute(array((int)$userId, (int)$amount));

            // Verify deduction happened
            $newZen = getUserZenBalance($userId);
            if ($newZen <= ($currentZen - $amount + 1)) {
                return array('success' => true, 'new_balance' => $newZen);
            }
            return array('success' => false, 'message' => 'Failed to deduct Zen');
        } catch (Exception $e) {
            error_log("DEDUCT_ZEN_ERROR: " . $e->getMessage());
            return array('success' => false, 'message' => 'Database error');
        }
    }
}

/**
 * Refund Zen to user's account
 */
if (!function_exists('refundUserZen')) {
    function refundUserZen($userId, $amount) {
        $pdo = getDB();
        try {
            $stmt = $pdo->prepare("UPDATE goldtab_sg SET Gold = Gold + ? WHERE AccountID = ?");
            $stmt->execute(array($amount, $userId));
            return array('success' => true);
        } catch (Exception $e) {
            error_log("REFUND_ZEN_ERROR: " . $e->getMessage());
            return array('success' => false, 'message' => 'Database error');
        }
    }
}

/**
 * Verify character belongs to user account
 */
if (!function_exists('verifyCharacterOwnership')) {
    function verifyCharacterOwnership($roleId, $userId) {
        $pdo = getDB();
        try {
            $stmt = $pdo->prepare("SELECT RoleID, Name FROM basetab_sg WHERE RoleID = ? AND AccountID = ? AND IsDel = 0 LIMIT 1");
            $stmt->execute(array($roleId, $userId));
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("VERIFY_CHAR_ERROR: " . $e->getMessage());
            return false;
        }
    }
}
