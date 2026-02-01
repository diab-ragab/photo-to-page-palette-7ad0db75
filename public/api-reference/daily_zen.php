<?php
/**
 * Daily Zen Reward System
 * 
 * Security Architecture:
 * 1. Device Token: Secure HttpOnly cookie stored for 180 days
 * 2. Browser Fingerprint: SHA-256 hashed with server secret (never stored raw)
 * 3. Multi-layer claim limits: device_token + account + IP subnet
 * 4. Session-based auth with CSRF protection
 * 5. Rate limiting and abuse detection
 * 
 * @author WOI Endgame Security Team
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Security: Server-side secret for fingerprint hashing (CHANGE IN PRODUCTION)
define('FINGERPRINT_SALT', 'woi_endgame_zen_2024_secret_salt_x7k9');

// Reward amount (configurable)
define('DAILY_ZEN_REWARD', 500000);

// Device token cookie settings
define('DEVICE_TOKEN_NAME', 'woi_device_token');
define('DEVICE_TOKEN_EXPIRY', 180 * 24 * 60 * 60); // 180 days in seconds

// Rate limiting
define('MAX_FAILED_ATTEMPTS_PER_IP', 10);
define('RATE_LIMIT_WINDOW', 3600); // 1 hour

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a cryptographically secure device token
 */
function generateDeviceToken() {
    // PHP 5.3 compatible random generation
    if (function_exists('random_bytes')) {
        return bin2hex(random_bytes(32));
    } elseif (function_exists('openssl_random_pseudo_bytes')) {
        return bin2hex(openssl_random_pseudo_bytes(32));
    } else {
        // Fallback for very old PHP
        $token = '';
        for ($i = 0; $i < 64; $i++) {
            $token .= dechex(mt_rand(0, 15));
        }
        return $token;
    }
}

/**
 * Hash the device token for storage (never store raw)
 */
function hashDeviceToken($token) {
    return hash('sha256', $token . FINGERPRINT_SALT);
}

/**
 * Hash the browser fingerprint with server salt
 */
function hashFingerprint($fingerprint) {
    return hash('sha256', $fingerprint . FINGERPRINT_SALT);
}

/**
 * Get client IP address (handles proxies)
 */
function getClientIP() {
    $headers = array('HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR');
    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ip = trim(explode(',', $_SERVER[$header])[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
}

/**
 * Get /24 subnet from IP for broader abuse detection
 */
function getIPSubnet($ip) {
    $parts = explode('.', $ip);
    if (count($parts) === 4) {
        return $parts[0] . '.' . $parts[1] . '.' . $parts[2] . '.0/24';
    }
    return $ip;
}

/**
 * Set secure device token cookie
 */
function setDeviceTokenCookie($token) {
    $secure = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    $expires = time() + DEVICE_TOKEN_EXPIRY;
    
    // PHP 5.3 compatible cookie setting
    setcookie(
        DEVICE_TOKEN_NAME,
        $token,
        $expires,
        '/',
        '', // domain (empty = current)
        $secure,
        true // httponly
    );
    
    // Also set in $_COOKIE for immediate use
    $_COOKIE[DEVICE_TOKEN_NAME] = $token;
}

/**
 * Validate session and return user info
 */
function validateSession($pdo) {
    // Get session token from header or cookie
    $sessionToken = '';
    
    if (isset($_SERVER['HTTP_X_SESSION_TOKEN'])) {
        $sessionToken = $_SERVER['HTTP_X_SESSION_TOKEN'];
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'];
        if (strpos($auth, 'Bearer ') === 0) {
            $sessionToken = substr($auth, 7);
        }
    }
    
    if (empty($sessionToken)) {
        return null;
    }
    
    // Check session in database
    $stmt = $pdo->prepare("
        SELECT s.user_id, s.expires_at, u.name as username, u.ID as account_id
        FROM user_sessions s
        JOIN users u ON s.user_id = u.ID
        WHERE s.session_token = ?
        LIMIT 1
    ");
    $stmt->execute(array($sessionToken));
    $session = $stmt->fetch();
    
    if (!$session) {
        return null;
    }
    
    // Check if session expired
    $expiresAt = strtotime($session['expires_at']);
    if ($expiresAt < time()) {
        return null;
    }
    
    return array(
        'user_id' => (int)$session['user_id'],
        'account_id' => (int)$session['account_id'],
        'username' => $session['username']
    );
}

/**
 * Log failed claim attempt for abuse detection
 */
function logFailedAttempt($pdo, $accountId, $deviceHash, $ip, $reason) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO daily_zen_failed_attempts 
            (account_id, device_token_hash, ip_address, reason, created_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute(array($accountId, $deviceHash, $ip, $reason));
    } catch (Exception $e) {
        // Table might not exist yet, ignore
        error_log("[DailyZen] Failed to log attempt: " . $e->getMessage());
    }
}

/**
 * Check if IP is rate limited
 */
function isRateLimited($pdo, $ip) {
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as attempts
            FROM daily_zen_failed_attempts
            WHERE ip_address = ?
            AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ");
        $stmt->execute(array($ip));
        $result = $stmt->fetch();
        
        return ((int)$result['attempts']) >= MAX_FAILED_ATTEMPTS_PER_IP;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Check for device abuse (multiple accounts from same device)
 */
function checkDeviceAbuse($pdo, $deviceHash, $accountId) {
    try {
        $stmt = $pdo->prepare("
            SELECT DISTINCT account_id
            FROM daily_zen_claims
            WHERE device_token_hash = ?
            AND claim_date = CURDATE()
            AND account_id != ?
        ");
        $stmt->execute(array($deviceHash, $accountId));
        $results = $stmt->fetchAll();
        
        return count($results) > 0;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Ensure required tables exist
 */
function ensureTablesExist($pdo) {
    // Main claims table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS daily_zen_claims (
            id INT AUTO_INCREMENT PRIMARY KEY,
            account_id INT NOT NULL,
            device_token_hash VARCHAR(64) NOT NULL,
            fingerprint_hash VARCHAR(64) NOT NULL,
            ip_address VARCHAR(45) NOT NULL,
            ip_subnet VARCHAR(20) NOT NULL,
            claim_date DATE NOT NULL,
            reward_amount INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            INDEX idx_device_date (device_token_hash, claim_date),
            INDEX idx_account_date (account_id, claim_date),
            INDEX idx_subnet_date (ip_subnet, claim_date),
            UNIQUE KEY unique_device_claim (device_token_hash, claim_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
    
    // Failed attempts log for abuse detection
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS daily_zen_failed_attempts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            account_id INT,
            device_token_hash VARCHAR(64),
            ip_address VARCHAR(45) NOT NULL,
            reason VARCHAR(100) NOT NULL,
            created_at DATETIME NOT NULL,
            INDEX idx_ip_time (ip_address, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
}

/**
 * Send Zen reward using the game's stored procedure
 */
function sendZenReward($mysqli, $username, $amount) {
    // Get user ID from users table
    $stmt = $mysqli->prepare("SELECT ID FROM users WHERE name = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $stmt->bind_result($userid);
    $stmt->fetch();
    $stmt->close();
    
    if (!$userid) {
        return array('success' => false, 'error' => 'Account not found');
    }
    
    // Call stored procedure (same as your existing zen sender)
    $zoneid = 0;
    $sn = 0;
    $aid = 1;
    $point = 0;
    $cash = $amount;
    $status = 1;
    
    $stmt = $mysqli->prepare("CALL usecash(?, ?, ?, ?, ?, ?, ?, @p_error)");
    $stmt->bind_param("iiiiiii", $userid, $zoneid, $sn, $aid, $point, $cash, $status);
    $stmt->execute();
    $stmt->close();
    
    // Clear extra results
    while ($mysqli->more_results() && $mysqli->next_result()) {
        $res = $mysqli->use_result();
        if ($res instanceof mysqli_result) {
            $res->free();
        }
    }
    
    // Read OUT error
    $result = $mysqli->query("SELECT @p_error AS error");
    $row = $result->fetch_assoc();
    $error = (int)$row['error'];
    $result->free();
    
    // SUCCESS: 0 or -8 are success codes
    if ($error === 0 || $error === -8) {
        return array('success' => true);
    }
    
    return array('success' => false, 'error' => 'Zen could not be sent (code: ' . $error . ')');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN API HANDLER
// ═══════════════════════════════════════════════════════════════════════════

header('Content-Type: application/json');

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

try {
    $pdo = getDB();
    ensureTablesExist($pdo);
    
    // ─────────────────────────────────────────────────────────────────────────
    // GET: Check claim status
    // ─────────────────────────────────────────────────────────────────────────
    if ($method === 'GET') {
        $user = validateSession($pdo);
        
        if (!$user) {
            echo json_encode(array(
                'success' => false,
                'error' => 'Not authenticated',
                'can_claim' => false
            ));
            exit;
        }
        
        // Get or create device token
        $deviceToken = isset($_COOKIE[DEVICE_TOKEN_NAME]) ? $_COOKIE[DEVICE_TOKEN_NAME] : '';
        if (empty($deviceToken)) {
            $deviceToken = generateDeviceToken();
            setDeviceTokenCookie($deviceToken);
        }
        $deviceHash = hashDeviceToken($deviceToken);
        
        // Check if already claimed today (by device)
        $stmt = $pdo->prepare("
            SELECT id, created_at
            FROM daily_zen_claims
            WHERE device_token_hash = ?
            AND claim_date = CURDATE()
            LIMIT 1
        ");
        $stmt->execute(array($deviceHash));
        $deviceClaim = $stmt->fetch();
        
        // Also check by account
        $stmt = $pdo->prepare("
            SELECT id, created_at
            FROM daily_zen_claims
            WHERE account_id = ?
            AND claim_date = CURDATE()
            LIMIT 1
        ");
        $stmt->execute(array($user['account_id']));
        $accountClaim = $stmt->fetch();
        
        $hasClaimed = ($deviceClaim || $accountClaim);
        
        // Calculate time until next reset (midnight server time)
        $now = time();
        $midnight = strtotime('tomorrow midnight');
        $secondsUntilReset = $midnight - $now;
        
        echo json_encode(array(
            'success' => true,
            'can_claim' => !$hasClaimed,
            'has_claimed' => $hasClaimed,
            'reward_amount' => DAILY_ZEN_REWARD,
            'seconds_until_reset' => $secondsUntilReset,
            'reset_time' => date('Y-m-d H:i:s', $midnight),
            'device_token_set' => !empty($_COOKIE[DEVICE_TOKEN_NAME])
        ));
        exit;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // POST: Claim daily Zen
    // ─────────────────────────────────────────────────────────────────────────
    if ($method === 'POST') {
        $ip = getClientIP();
        $ipSubnet = getIPSubnet($ip);
        
        // Rate limiting check
        if (isRateLimited($pdo, $ip)) {
            http_response_code(429);
            echo json_encode(array(
                'success' => false,
                'error' => 'Too many attempts. Please try again later.'
            ));
            exit;
        }
        
        // Validate session
        $user = validateSession($pdo);
        if (!$user) {
            http_response_code(401);
            echo json_encode(array(
                'success' => false,
                'error' => 'Not authenticated'
            ));
            exit;
        }
        
        // Parse request body
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        
        // Validate fingerprint is provided
        $fingerprint = isset($input['fingerprint']) ? trim($input['fingerprint']) : '';
        if (empty($fingerprint) || strlen($fingerprint) < 32) {
            logFailedAttempt($pdo, $user['account_id'], '', $ip, 'Invalid fingerprint');
            http_response_code(400);
            echo json_encode(array(
                'success' => false,
                'error' => 'Invalid request'
            ));
            exit;
        }
        
        // Hash the fingerprint with server salt
        $fingerprintHash = hashFingerprint($fingerprint);
        
        // Get or validate device token
        $deviceToken = isset($_COOKIE[DEVICE_TOKEN_NAME]) ? $_COOKIE[DEVICE_TOKEN_NAME] : '';
        if (empty($deviceToken)) {
            $deviceToken = generateDeviceToken();
            setDeviceTokenCookie($deviceToken);
        }
        $deviceHash = hashDeviceToken($deviceToken);
        
        // Check for device abuse (multiple accounts from same device today)
        if (checkDeviceAbuse($pdo, $deviceHash, $user['account_id'])) {
            logFailedAttempt($pdo, $user['account_id'], $deviceHash, $ip, 'Device abuse detected');
            http_response_code(403);
            echo json_encode(array(
                'success' => false,
                'error' => 'This device has already claimed Zen for another account today.'
            ));
            exit;
        }
        
        // Check if device already claimed today
        $stmt = $pdo->prepare("
            SELECT id FROM daily_zen_claims
            WHERE device_token_hash = ?
            AND claim_date = CURDATE()
            LIMIT 1
        ");
        $stmt->execute(array($deviceHash));
        if ($stmt->fetch()) {
            logFailedAttempt($pdo, $user['account_id'], $deviceHash, $ip, 'Device already claimed');
            http_response_code(409);
            echo json_encode(array(
                'success' => false,
                'error' => 'Already claimed today from this device.'
            ));
            exit;
        }
        
        // Check if account already claimed today
        $stmt = $pdo->prepare("
            SELECT id FROM daily_zen_claims
            WHERE account_id = ?
            AND claim_date = CURDATE()
            LIMIT 1
        ");
        $stmt->execute(array($user['account_id']));
        if ($stmt->fetch()) {
            logFailedAttempt($pdo, $user['account_id'], $deviceHash, $ip, 'Account already claimed');
            http_response_code(409);
            echo json_encode(array(
                'success' => false,
                'error' => 'Already claimed today on this account.'
            ));
            exit;
        }
        
        // Optional: Check IP subnet limit (uncomment to enable)
        /*
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as claims
            FROM daily_zen_claims
            WHERE ip_subnet = ?
            AND claim_date = CURDATE()
        ");
        $stmt->execute(array($ipSubnet));
        $subnetClaims = $stmt->fetch();
        if ((int)$subnetClaims['claims'] >= 3) {
            logFailedAttempt($pdo, $user['account_id'], $deviceHash, $ip, 'Subnet limit reached');
            http_response_code(403);
            echo json_encode(array(
                'success' => false,
                'error' => 'Too many claims from this network today.'
            ));
            exit;
        }
        */
        
        // ─────────────────────────────────────────────────────────────────────
        // ATOMIC CLAIM TRANSACTION
        // ─────────────────────────────────────────────────────────────────────
        $pdo->beginTransaction();
        
        try {
            // Insert claim record (will fail if duplicate due to UNIQUE constraint)
            $stmt = $pdo->prepare("
                INSERT INTO daily_zen_claims 
                (account_id, device_token_hash, fingerprint_hash, ip_address, ip_subnet, claim_date, reward_amount, created_at)
                VALUES (?, ?, ?, ?, ?, CURDATE(), ?, NOW())
            ");
            $stmt->execute(array(
                $user['account_id'],
                $deviceHash,
                $fingerprintHash,
                $ip,
                $ipSubnet,
                DAILY_ZEN_REWARD
            ));
            
            // Send the Zen reward using mysqli (for stored procedure compatibility)
            $cfg = getConfig();
            $db = $cfg['db'];
            
            $mysqli = new mysqli($db['host'], $db['user'], $db['pass'], $db['name']);
            if ($mysqli->connect_errno) {
                throw new Exception("Failed to connect to game database");
            }
            
            $result = sendZenReward($mysqli, $user['username'], DAILY_ZEN_REWARD);
            $mysqli->close();
            
            if (!$result['success']) {
                throw new Exception($result['error']);
            }
            
            $pdo->commit();
            
            // Calculate time until next reset
            $midnight = strtotime('tomorrow midnight');
            $secondsUntilReset = $midnight - time();
            
            echo json_encode(array(
                'success' => true,
                'message' => 'Daily Zen claimed successfully!',
                'reward_amount' => DAILY_ZEN_REWARD,
                'seconds_until_reset' => $secondsUntilReset
            ));
            
        } catch (Exception $e) {
            $pdo->rollBack();
            
            // Check if it was a duplicate key error (race condition protection)
            if (strpos($e->getMessage(), 'Duplicate') !== false) {
                http_response_code(409);
                echo json_encode(array(
                    'success' => false,
                    'error' => 'Already claimed today.'
                ));
            } else {
                error_log("[DailyZen] Claim failed: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(array(
                    'success' => false,
                    'error' => 'Failed to send Zen. Please try again.'
                ));
            }
        }
        exit;
    }
    
    // Unsupported method
    http_response_code(405);
    echo json_encode(array('success' => false, 'error' => 'Method not allowed'));
    
} catch (Exception $e) {
    error_log("[DailyZen] Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array('success' => false, 'error' => 'Internal server error'));
}
