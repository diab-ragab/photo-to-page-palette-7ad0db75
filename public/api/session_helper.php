<?php
/**
 * session_helper.php - Unified session token verification
 * PHP 5.x compatible
 *
 * FIXES:
 * - Reads Authorization from multiple server vars (HTTP_AUTHORIZATION, REDIRECT_HTTP_AUTHORIZATION)
 * - Reads headers using getallheaders() when available (some servers drop HTTP_AUTHORIZATION)
 * - Supports X-Session-Token reliably (recommended)
 * - Reads JSON body only once (cached)
 */

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
        while (ob_get_level()) { @ob_end_clean(); }
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
        while (ob_get_level()) { @ob_end_clean(); }
        if (function_exists('http_response_code')) {
            http_response_code((int)$code);
        } else {
            header("HTTP/1.1 " . (int)$code . " Error");
        }
        header('Content-Type: application/json; charset=utf-8');
        $data = array('success' => false, 'error' => (string)$msg);
        if ($rid) $data['rid'] = $rid;
        echo json_encode($data);
        exit;
    }
}

/**
 * Read JSON body safely (cached)
 * IMPORTANT: reads php://input only once per request
 */
if (!function_exists('_readJsonBodyOnce')) {
    function _readJsonBodyOnce() {
        static $cached = null;
        if ($cached !== null) return $cached;

        // If bootstrap already parsed it
        if (isset($GLOBALS['__jsonInput']) && is_array($GLOBALS['__jsonInput'])) {
            $cached = $GLOBALS['__jsonInput'];
            return $cached;
        }

        $raw = file_get_contents('php://input');
        $cached = array();
        if (is_string($raw) && $raw !== '') {
            $j = json_decode($raw, true);
            if (is_array($j)) $cached = $j;
        }
        return $cached;
    }
}

/**
 * Header getter (works across server configs)
 */
if (!function_exists('_getHeaderValue')) {
    function _getHeaderValue($name) {
        $nameLower = strtolower($name);

        // 1) Direct $_SERVER style: HTTP_*
        $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        if (isset($_SERVER[$serverKey]) && $_SERVER[$serverKey] !== '') {
            return (string)$_SERVER[$serverKey];
        }

        // 2) Special case for Authorization
        if ($nameLower === 'authorization') {
            if (!empty($_SERVER['HTTP_AUTHORIZATION'])) return (string)$_SERVER['HTTP_AUTHORIZATION'];
            if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) return (string)$_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        // 3) getallheaders() fallback (Apache/NGINX/FPM differences)
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (is_array($headers)) {
                foreach ($headers as $k => $v) {
                    if (strtolower($k) === $nameLower) return (string)$v;
                }
            }
        }

        return '';
    }
}

/**
 * Extract session token from various sources
 * Priority:
 * Authorization Bearer > X-Session-Token > query param > JSON body > cookie > POST form
 */
if (!function_exists('getSessionToken')) {
    function getSessionToken() {
        // Authorization: Bearer <token>
        $auth = _getHeaderValue('Authorization');
        if ($auth !== '') {
            if (stripos($auth, 'Bearer ') === 0) {
                $t = trim(substr($auth, 7));
                if ($t !== '') return $t;
            } else {
                $t = trim($auth);
                if ($t !== '') return $t;
            }
        }

        // X-Session-Token header (recommended)
        $hdr = _getHeaderValue('X-Session-Token');
        if ($hdr !== '') return trim($hdr);

        // Query parameter (fallback)
        if (!empty($_GET['sessionToken'])) return trim((string)$_GET['sessionToken']);

        // JSON body (fallback)
        $body = _readJsonBodyOnce();
        if (is_array($body)) {
            if (!empty($body['sessionToken'])) return trim((string)$body['sessionToken']);
            if (!empty($body['token'])) return trim((string)$body['token']); // optional alias
        }

        // Cookie (fallback)
        if (!empty($_COOKIE['sessionToken'])) return trim((string)$_COOKIE['sessionToken']);
        if (!empty($_COOKIE['session_token'])) return trim((string)$_COOKIE['session_token']);

        // Form POST (fallback)
        if (!empty($_POST['sessionToken'])) return trim((string)$_POST['sessionToken']);

        return '';
    }
}

/**
 * Resolve session from database
 * Tries raw token first, then SHA-256 hash
 */
if (!function_exists('resolveSessionRow')) {
    function resolveSessionRow($token) {
        if ($token === '') return null;

        $pdo = getDB();
        $hash = hash('sha256', $token);

        // Detect username column (name or login)
        $usernameCol = 'name';
        try {
            $colsStmt = $pdo->query("SHOW COLUMNS FROM users");
            $cols = $colsStmt ? $colsStmt->fetchAll(PDO::FETCH_COLUMN) : array();
            if (is_array($cols) && in_array('login', $cols) && !in_array('name', $cols)) {
                $usernameCol = 'login';
            }
        } catch (Exception $e) {}

        // 1) Try raw token in session_token
        try {
            $stmt = $pdo->prepare("
                SELECT us.user_id, u.`{$usernameCol}` as name, us.expires_at
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

        // 2) Try sha256(token) stored in session_token
        try {
            $stmt = $pdo->prepare("
                SELECT us.user_id, u.`{$usernameCol}` as name, us.expires_at
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

        // 3) Optional hash columns
        $optionalColumns = array('token_hash', 'session_token_hash');
        foreach ($optionalColumns as $col) {
            try {
                $stmt = $pdo->prepare("
                    SELECT us.user_id, u.`{$usernameCol}` as name, us.expires_at
                    FROM user_sessions us
                    JOIN users u ON u.ID = us.user_id
                    WHERE us.`$col` = ?
                    LIMIT 1
                ");
                $stmt->execute(array($hash));
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($row) return $row;
            } catch (Exception $e) {
                // ignore missing columns
            }
        }

        return null;
    }
}

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
        if ($token === '') return;
        $pdo = getDB();
        $hash = hash('sha256', $token);

        // raw
        try {
            $pdo->prepare("UPDATE user_sessions SET last_activity = NOW() WHERE session_token = ?")
                ->execute(array($token));
        } catch (Exception $e) {}

        // hash-in-session_token
        try {
            $pdo->prepare("UPDATE user_sessions SET last_activity = NOW() WHERE session_token = ?")
                ->execute(array($hash));
        } catch (Exception $e) {}

        // optional hash columns
        $optionalColumns = array('token_hash', 'session_token_hash');
        foreach ($optionalColumns as $col) {
            try {
                $pdo->prepare("UPDATE user_sessions SET last_activity = NOW() WHERE `$col` = ?")
                    ->execute(array($hash));
            } catch (Exception $e) {}
        }
    }
}

if (!function_exists('extendSession')) {
    function extendSession($token, $minutes = 120) {
        if ($token === '') return null;

        $pdo = getDB();
        $hash = hash('sha256', $token);
        $newExpires = date('Y-m-d H:i:s', time() + ((int)$minutes * 60));

        // raw
        try {
            $pdo->prepare("UPDATE user_sessions SET expires_at = ?, last_activity = NOW() WHERE session_token = ?")
                ->execute(array($newExpires, $token));
        } catch (Exception $e) {}

        // hash-in-session_token
        try {
            $pdo->prepare("UPDATE user_sessions SET expires_at = ?, last_activity = NOW() WHERE session_token = ?")
                ->execute(array($newExpires, $hash));
        } catch (Exception $e) {}

        // optional hash columns
        $optionalColumns = array('token_hash', 'session_token_hash');
        foreach ($optionalColumns as $col) {
            try {
                $pdo->prepare("UPDATE user_sessions SET expires_at = ?, last_activity = NOW() WHERE `$col` = ?")
                    ->execute(array($newExpires, $hash));
            } catch (Exception $e) {}
        }

        return $newExpires;
    }
}

if (!function_exists('getCurrentUser')) {
    function getCurrentUser() {
        $token = getSessionToken();
        if ($token === '') return null;

        $sess = resolveSessionRow($token);
        if (!$sess) return null;

        if (!isset($sess['expires_at']) || isSessionExpired($sess['expires_at'])) {
            return null;
        }

        touchSession($token);
        return $sess;
    }
}

if (!function_exists('requireAuth')) {
    function requireAuth($jsonResponse = true) {
        $user = getCurrentUser();
        if (!$user) {
            if ($jsonResponse) {
                if (function_exists('http_response_code')) http_response_code(401);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode(array('success' => false, 'error' => 'Not authenticated'));
            }
            exit;
        }
        return $user;
    }
}

if (!function_exists('isUserAdmin')) {
    function isUserAdmin($userId, $username = '') {
        $pdo = getDB();

        // user_roles
        try {
            $stmt = $pdo->prepare("SELECT role FROM user_roles WHERE user_id = ?");
            $stmt->execute(array((int)$userId));
            $roles = $stmt->fetchAll(PDO::FETCH_COLUMN);
            if (!is_array($roles)) $roles = array();
            if (in_array('admin', $roles, true) || in_array('gm', $roles, true)) return true;
        } catch (Exception $e) {}

        // config whitelist
        if (function_exists('getConfig')) {
            $cfg = (array)getConfig();
            $sec = isset($cfg['security']) ? $cfg['security'] : array();

            $adminIds = (isset($sec['admin_user_ids']) && is_array($sec['admin_user_ids']))
                ? $sec['admin_user_ids']
                : ((isset($cfg['admin_user_ids']) && is_array($cfg['admin_user_ids'])) ? $cfg['admin_user_ids'] : array());

            $adminNames = (isset($sec['admin_usernames']) && is_array($sec['admin_usernames']))
                ? $sec['admin_usernames']
                : ((isset($cfg['admin_usernames']) && is_array($cfg['admin_usernames'])) ? $cfg['admin_usernames'] : array());

            if (in_array((int)$userId, $adminIds, true)) return true;
            if ($username !== '' && in_array((string)$username, $adminNames, true)) return true;
        }

        return false;
    }
}

if (!function_exists('requireAdmin')) {
    function requireAdmin($jsonResponse = true, $extendMinutes = 120) {
        $user = requireAuth($jsonResponse);

        $userId = (int)$user['user_id'];
        $username = isset($user['name']) ? (string)$user['name'] : '';

        if (!isUserAdmin($userId, $username)) {
            if ($jsonResponse) {
                if (function_exists('http_response_code')) http_response_code(403);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode(array('success' => false, 'error' => 'Admin access required'));
            }
            exit;
        }

        if ((int)$extendMinutes > 0) {
            $token = getSessionToken();
            extendSession($token, (int)$extendMinutes);
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
            $stmt->execute(array((int)$userId));
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row ? (int)$row['Gold'] : 0;
        } catch (Exception $e) {
            error_log("GET_ZEN_ERROR: " . $e->getMessage());
            return 0;
        }
    }
}

if (!function_exists('deductUserZen')) {
    function deductUserZen($userId, $amount) {
        $pdo = getDB();
        try {
            $currentZen = getUserZenBalance((int)$userId);
            if ($currentZen < (int)$amount) {
                return array('success' => false, 'message' => 'Insufficient Zen balance');
            }

            $stmt = $pdo->prepare("CALL deductcash(?, ?)");
            $stmt->execute(array((int)$userId, (int)$amount));

            $newZen = getUserZenBalance((int)$userId);
            if ($newZen <= ($currentZen - (int)$amount + 1)) {
                return array('success' => true, 'new_balance' => $newZen);
            }
            return array('success' => false, 'message' => 'Failed to deduct Zen');
        } catch (Exception $e) {
            error_log("DEDUCT_ZEN_ERROR: " . $e->getMessage());
            return array('success' => false, 'message' => 'Database error');
        }
    }
}

if (!function_exists('refundUserZen')) {
    function refundUserZen($userId, $amount) {
        $pdo = getDB();
        try {
            $stmt = $pdo->prepare("UPDATE goldtab_sg SET Gold = Gold + ? WHERE AccountID = ?");
            $stmt->execute(array((int)$amount, (int)$userId));
            return array('success' => true);
        } catch (Exception $e) {
            error_log("REFUND_ZEN_ERROR: " . $e->getMessage());
            return array('success' => false, 'message' => 'Database error');
        }
    }
}

if (!function_exists('verifyCharacterOwnership')) {
    function verifyCharacterOwnership($roleId, $userId) {
        $pdo = getDB();
        try {
            $stmt = $pdo->prepare("SELECT RoleID, Name FROM basetab_sg WHERE RoleID = ? AND AccountID = ? AND IsDel = 0 LIMIT 1");
            $stmt->execute(array((int)$roleId, (int)$userId));
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("VERIFY_CHAR_ERROR: " . $e->getMessage());
            return false;
        }
    }
}
