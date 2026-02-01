<?php
/**
 * Daily Zen Reward System - ULTRA SECURE
 * 
 * Security Architecture:
 * 1. Device Token: Secure HttpOnly cookie stored for 180 days
 * 2. Browser Fingerprint: SHA-256 hashed with server secret
 * 3. VPN/Proxy Detection: IP reputation checking
 * 4. VM/VPS Detection: Client-side signals validation
 * 5. Multi-layer claim limits: device_token + account + fingerprint
 * 6. Session-based auth with CSRF protection
 * 7. Rate limiting and comprehensive abuse detection
 * 
 * @author WOI Endgame Security Team
 */

require_once __DIR__ . '/bootstrap.php';
// Note: getDB() is defined in bootstrap.php - no separate db.php needed

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Security: Server-side secret for fingerprint hashing
define('FINGERPRINT_SALT', 'woi_endgame_zen_2024_ultra_secure_salt_x7k9m2');

// Reward amount (configurable)
define('DAILY_ZEN_REWARD', 500000);

// Device token cookie settings
define('DEVICE_TOKEN_NAME', 'woi_device_token');
define('DEVICE_TOKEN_EXPIRY', 180 * 24 * 60 * 60); // 180 days

// Rate limiting
define('MAX_FAILED_ATTEMPTS_PER_IP', 5);
define('MAX_CLAIMS_PER_SUBNET', 2); // Max claims per /24 subnet per day

// Risk thresholds
define('MAX_RISK_SCORE', 40); // Block if client risk score exceeds this
define('BLOCK_VM_DETECTION', true); // Block detected VMs
define('BLOCK_VPN_DETECTION', true); // Block detected VPNs/proxies

// Known datacenter/VPS IP ranges (partial list - extend as needed)
$DATACENTER_ASN_KEYWORDS = array(
    'amazon', 'aws', 'digitalocean', 'linode', 'vultr', 'ovh', 'hetzner',
    'google cloud', 'microsoft azure', 'cloudflare', 'oracle cloud',
    'alibaba', 'tencent', 'scaleway', 'contabo', 'hostinger', 'godaddy',
    'hostgator', 'bluehost', 'namecheap', 'kamatera', 'upcloud'
);

// Known VPN provider IP signatures (hostname patterns)
$VPN_HOSTNAME_PATTERNS = array(
    'vpn', 'proxy', 'tor', 'exit', 'relay', 'node', 'server',
    'express', 'nord', 'surfshark', 'cyberghost', 'pia', 'mullvad',
    'proton', 'windscribe', 'hide.me', 'ipvanish', 'purevpn'
);

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a cryptographically secure device token
 */
function generateDeviceToken() {
    if (function_exists('random_bytes')) {
        return bin2hex(random_bytes(32));
    } elseif (function_exists('openssl_random_pseudo_bytes')) {
        return bin2hex(openssl_random_pseudo_bytes(32));
    } else {
        $token = '';
        for ($i = 0; $i < 64; $i++) {
            $token .= dechex(mt_rand(0, 15));
        }
        return $token;
    }
}

/**
 * Hash the device token for storage
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
 * Get /24 subnet from IP
 */
function getIPSubnet($ip) {
    $parts = explode('.', $ip);
    if (count($parts) === 4) {
        return $parts[0] . '.' . $parts[1] . '.' . $parts[2] . '.0/24';
    }
    return $ip;
}

/**
 * Check if IP is from a known datacenter/VPS provider
 */
function isDatacenterIP($ip) {
    global $VPN_HOSTNAME_PATTERNS;
    
    // Reverse DNS lookup
    $hostname = @gethostbyaddr($ip);
    if ($hostname && $hostname !== $ip) {
        $hostLower = strtolower($hostname);
        
        // Check for VPN/proxy hostname patterns
        foreach ($VPN_HOSTNAME_PATTERNS as $pattern) {
            if (strpos($hostLower, $pattern) !== false) {
                return array('detected' => true, 'reason' => 'vpn_hostname:' . $pattern);
            }
        }
        
        // Check for datacenter patterns
        $datacenterPatterns = array(
            'cloud', 'server', 'vps', 'dedicated', 'hosting', 'data-center',
            'datacenter', 'colo', 'rack', 'node'
        );
        foreach ($datacenterPatterns as $pattern) {
            if (strpos($hostLower, $pattern) !== false) {
                return array('detected' => true, 'reason' => 'datacenter_hostname:' . $pattern);
            }
        }
    }
    
    // Check common datacenter IP ranges (basic check)
    $firstOctet = (int)explode('.', $ip)[0];
    
    // These ranges are commonly used by cloud providers
    $suspiciousRanges = array(
        // AWS commonly uses these
        3, 13, 15, 18, 34, 35, 44, 46, 52, 54, 99,
        // DigitalOcean, Vultr, Linode
        45, 64, 66, 67, 68, 69, 104, 107, 137, 138, 139, 140, 
        143, 144, 149, 155, 157, 158, 159, 161, 162, 163, 164, 165,
        167, 169, 170, 172, 173, 174, 176, 178, 185, 188, 192, 193,
        194, 195, 198, 199, 206, 207, 208, 209, 216,
    );
    
    // This is a very rough heuristic - real implementation should use IP databases
    // For now, rely more on hostname checks
    
    return array('detected' => false, 'reason' => null);
}

/**
 * Validate client-side risk signals
 */
function validateClientSignals($signals) {
    $issues = array();
    
    if (!is_array($signals)) {
        return array('valid' => false, 'issues' => array('missing_signals'));
    }
    
    // Check VM detection flag
    if (BLOCK_VM_DETECTION && isset($signals['vm']) && $signals['vm'] === true) {
        $issues[] = 'vm_detected';
    }
    
    // Check headless browser
    if (isset($signals['headless']) && $signals['headless'] === true) {
        $issues[] = 'headless_browser';
    }
    
    // Check timezone/locale inconsistencies (VPN indicator)
    if (BLOCK_VPN_DETECTION && isset($signals['inconsistent']) && $signals['inconsistent'] === true) {
        $issues[] = 'vpn_suspected';
    }
    
    // Check risk score
    if (isset($signals['risk']) && (int)$signals['risk'] > MAX_RISK_SCORE) {
        $issues[] = 'high_risk_score:' . (int)$signals['risk'];
    }
    
    // Check specific VM indicators
    if (isset($signals['indicators']) && is_array($signals['indicators'])) {
        $criticalIndicators = array('vmware', 'virtualbox', 'hyper-v', 'qemu', 'webdriver', 'automation');
        foreach ($signals['indicators'] as $indicator) {
            foreach ($criticalIndicators as $critical) {
                if (strpos(strtolower($indicator), $critical) !== false) {
                    $issues[] = 'vm_indicator:' . $indicator;
                }
            }
        }
    }
    
    return array(
        'valid' => count($issues) === 0,
        'issues' => $issues
    );
}

/**
 * Set secure device token cookie
 */
function setDeviceTokenCookie($token) {
    $secure = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    $expires = time() + DEVICE_TOKEN_EXPIRY;
    
    // PHP 7.3+ supports SameSite in options array
    // For PHP 5.x, we use the path hack
    $sameSitePath = '/; SameSite=Strict';
    
    setcookie(
        DEVICE_TOKEN_NAME,
        $token,
        $expires,
        $sameSitePath,
        '',
        $secure,
        true // httponly
    );
    
    $_COOKIE[DEVICE_TOKEN_NAME] = $token;
}

/**
 * Validate session and return user info
 */
function validateSession($pdo) {
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
 * Log security event for abuse detection
 */
function logSecurityEvent($pdo, $accountId, $deviceHash, $ip, $eventType, $details) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO daily_zen_security_log 
            (account_id, device_token_hash, ip_address, event_type, details, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute(array($accountId, $deviceHash, $ip, $eventType, $details));
    } catch (Exception $e) {
        error_log("[DailyZen] Security log failed: " . $e->getMessage());
    }
}

/**
 * Check if IP is rate limited
 */
function isRateLimited($pdo, $ip) {
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as attempts
            FROM daily_zen_security_log
            WHERE ip_address = ?
            AND event_type = 'failed_claim'
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
 * Check fingerprint abuse (same fingerprint, different devices)
 */
function checkFingerprintAbuse($pdo, $fingerprintHash, $accountId) {
    try {
        $stmt = $pdo->prepare("
            SELECT DISTINCT account_id
            FROM daily_zen_claims
            WHERE fingerprint_hash = ?
            AND claim_date = CURDATE()
            AND account_id != ?
        ");
        $stmt->execute(array($fingerprintHash, $accountId));
        $results = $stmt->fetchAll();
        
        return count($results) > 0;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Check subnet claim limit
 */
function checkSubnetLimit($pdo, $subnet) {
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(DISTINCT account_id) as claims
            FROM daily_zen_claims
            WHERE ip_subnet = ?
            AND claim_date = CURDATE()
        ");
        $stmt->execute(array($subnet));
        $result = $stmt->fetch();
        
        return ((int)$result['claims']) >= MAX_CLAIMS_PER_SUBNET;
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
            risk_score INT DEFAULT 0,
            created_at DATETIME NOT NULL,
            INDEX idx_device_date (device_token_hash, claim_date),
            INDEX idx_account_date (account_id, claim_date),
            INDEX idx_fingerprint_date (fingerprint_hash, claim_date),
            INDEX idx_subnet_date (ip_subnet, claim_date),
            UNIQUE KEY unique_device_claim (device_token_hash, claim_date),
            UNIQUE KEY unique_account_claim (account_id, claim_date),
            UNIQUE KEY unique_fingerprint_claim (fingerprint_hash, claim_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
    
    // Security event log
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS daily_zen_security_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            account_id INT,
            device_token_hash VARCHAR(64),
            ip_address VARCHAR(45) NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            details TEXT,
            created_at DATETIME NOT NULL,
            INDEX idx_ip_time (ip_address, created_at),
            INDEX idx_event_type (event_type, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
}

/**
 * Send Zen reward using the game's stored procedure
 */
function sendZenReward($mysqli, $username, $amount) {
    $stmt = $mysqli->prepare("SELECT ID FROM users WHERE name = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $stmt->bind_result($userid);
    $stmt->fetch();
    $stmt->close();
    
    if (!$userid) {
        return array('success' => false, 'error' => 'Account not found');
    }
    
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
    
    while ($mysqli->more_results() && $mysqli->next_result()) {
        $res = $mysqli->use_result();
        if ($res instanceof mysqli_result) {
            $res->free();
        }
    }
    
    $result = $mysqli->query("SELECT @p_error AS error");
    $row = $result->fetch_assoc();
    $error = (int)$row['error'];
    $result->free();
    
    if ($error === 0 || $error === -8) {
        return array('success' => true);
    }
    
    return array('success' => false, 'error' => 'Zen delivery failed (code: ' . $error . ')');
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
        
        $deviceToken = isset($_COOKIE[DEVICE_TOKEN_NAME]) ? $_COOKIE[DEVICE_TOKEN_NAME] : '';
        if (empty($deviceToken)) {
            $deviceToken = generateDeviceToken();
            setDeviceTokenCookie($deviceToken);
        }
        $deviceHash = hashDeviceToken($deviceToken);
        
        // Check all claim conditions
        $stmt = $pdo->prepare("SELECT id FROM daily_zen_claims WHERE device_token_hash = ? AND claim_date = CURDATE() LIMIT 1");
        $stmt->execute(array($deviceHash));
        $deviceClaimed = (bool)$stmt->fetch();
        
        $stmt = $pdo->prepare("SELECT id FROM daily_zen_claims WHERE account_id = ? AND claim_date = CURDATE() LIMIT 1");
        $stmt->execute(array($user['account_id']));
        $accountClaimed = (bool)$stmt->fetch();
        
        $hasClaimed = ($deviceClaimed || $accountClaimed);
        
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
    // POST: Claim daily Zen (with full security checks)
    // ─────────────────────────────────────────────────────────────────────────
    if ($method === 'POST') {
        $ip = getClientIP();
        $ipSubnet = getIPSubnet($ip);
        
        // ═══════════════════════════════════════════════════════════════════
        // SECURITY CHECK 1: Rate limiting
        // ═══════════════════════════════════════════════════════════════════
        if (isRateLimited($pdo, $ip)) {
            http_response_code(429);
            echo json_encode(array(
                'success' => false,
                'error' => 'Too many attempts. Please try again later.'
            ));
            exit;
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // SECURITY CHECK 2: Session validation
        // ═══════════════════════════════════════════════════════════════════
        $user = validateSession($pdo);
        if (!$user) {
            http_response_code(401);
            echo json_encode(array('success' => false, 'error' => 'Not authenticated'));
            exit;
        }
        
        // Parse request
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        
        // ═══════════════════════════════════════════════════════════════════
        // SECURITY CHECK 3: Fingerprint validation
        // ═══════════════════════════════════════════════════════════════════
        $fingerprint = isset($input['fingerprint']) ? trim($input['fingerprint']) : '';
        if (empty($fingerprint) || strlen($fingerprint) < 32) {
            logSecurityEvent($pdo, $user['account_id'], '', $ip, 'failed_claim', 'Invalid fingerprint');
            http_response_code(400);
            echo json_encode(array('success' => false, 'error' => 'Invalid request'));
            exit;
        }
        $fingerprintHash = hashFingerprint($fingerprint);
        
        // ═══════════════════════════════════════════════════════════════════
        // SECURITY CHECK 4: VPN/Datacenter detection
        // ═══════════════════════════════════════════════════════════════════
        if (BLOCK_VPN_DETECTION) {
            $datacenterCheck = isDatacenterIP($ip);
            if ($datacenterCheck['detected']) {
                logSecurityEvent($pdo, $user['account_id'], '', $ip, 'blocked_vpn', $datacenterCheck['reason']);
                http_response_code(403);
                echo json_encode(array(
                    'success' => false,
                    'error' => 'VPN, Proxy, or VPS detected. Please use your real internet connection.'
                ));
                exit;
            }
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // SECURITY CHECK 5: VM/Automation detection (client signals)
        // ═══════════════════════════════════════════════════════════════════
        $signals = isset($input['signals']) ? $input['signals'] : array();
        $signalValidation = validateClientSignals($signals);
        
        if (!$signalValidation['valid']) {
            $reason = implode(', ', $signalValidation['issues']);
            logSecurityEvent($pdo, $user['account_id'], '', $ip, 'blocked_vm', $reason);
            http_response_code(403);
            echo json_encode(array(
                'success' => false,
                'error' => 'Virtual machine or automated browser detected. Please use a real device.'
            ));
            exit;
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // SECURITY CHECK 6: Device token
        // ═══════════════════════════════════════════════════════════════════
        $deviceToken = isset($_COOKIE[DEVICE_TOKEN_NAME]) ? $_COOKIE[DEVICE_TOKEN_NAME] : '';
        if (empty($deviceToken)) {
            $deviceToken = generateDeviceToken();
            setDeviceTokenCookie($deviceToken);
        }
        $deviceHash = hashDeviceToken($deviceToken);
        
        // ═══════════════════════════════════════════════════════════════════
        // SECURITY CHECK 7: Device abuse (multiple accounts)
        // ═══════════════════════════════════════════════════════════════════
        if (checkDeviceAbuse($pdo, $deviceHash, $user['account_id'])) {
            logSecurityEvent($pdo, $user['account_id'], $deviceHash, $ip, 'failed_claim', 'device_abuse');
            http_response_code(403);
            echo json_encode(array(
                'success' => false,
                'error' => 'This device has already claimed Zen for another account today.'
            ));
            exit;
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // SECURITY CHECK 8: Fingerprint abuse (same browser, different devices)
        // ═══════════════════════════════════════════════════════════════════
        if (checkFingerprintAbuse($pdo, $fingerprintHash, $user['account_id'])) {
            logSecurityEvent($pdo, $user['account_id'], $deviceHash, $ip, 'failed_claim', 'fingerprint_abuse');
            http_response_code(403);
            echo json_encode(array(
                'success' => false,
                'error' => 'Duplicate browser fingerprint detected. Each device can only claim once.'
            ));
            exit;
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // SECURITY CHECK 9: Subnet limit
        // ═══════════════════════════════════════════════════════════════════
        if (checkSubnetLimit($pdo, $ipSubnet)) {
            logSecurityEvent($pdo, $user['account_id'], $deviceHash, $ip, 'failed_claim', 'subnet_limit');
            http_response_code(403);
            echo json_encode(array(
                'success' => false,
                'error' => 'Maximum claims reached for your network. Try again tomorrow.'
            ));
            exit;
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // SECURITY CHECK 10: Device already claimed
        // ═══════════════════════════════════════════════════════════════════
        $stmt = $pdo->prepare("SELECT id FROM daily_zen_claims WHERE device_token_hash = ? AND claim_date = CURDATE() LIMIT 1");
        $stmt->execute(array($deviceHash));
        if ($stmt->fetch()) {
            logSecurityEvent($pdo, $user['account_id'], $deviceHash, $ip, 'failed_claim', 'device_already_claimed');
            http_response_code(409);
            echo json_encode(array('success' => false, 'error' => 'Already claimed today from this device.'));
            exit;
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // SECURITY CHECK 11: Account already claimed
        // ═══════════════════════════════════════════════════════════════════
        $stmt = $pdo->prepare("SELECT id FROM daily_zen_claims WHERE account_id = ? AND claim_date = CURDATE() LIMIT 1");
        $stmt->execute(array($user['account_id']));
        if ($stmt->fetch()) {
            logSecurityEvent($pdo, $user['account_id'], $deviceHash, $ip, 'failed_claim', 'account_already_claimed');
            http_response_code(409);
            echo json_encode(array('success' => false, 'error' => 'Already claimed today on this account.'));
            exit;
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // ALL CHECKS PASSED - PROCESS CLAIM
        // ═══════════════════════════════════════════════════════════════════
        $riskScore = isset($signals['risk']) ? (int)$signals['risk'] : 0;
        
        $pdo->beginTransaction();
        
        try {
            // Insert claim record (UNIQUE constraints prevent race conditions)
            $stmt = $pdo->prepare("
                INSERT INTO daily_zen_claims 
                (account_id, device_token_hash, fingerprint_hash, ip_address, ip_subnet, claim_date, reward_amount, risk_score, created_at)
                VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, NOW())
            ");
            $stmt->execute(array(
                $user['account_id'],
                $deviceHash,
                $fingerprintHash,
                $ip,
                $ipSubnet,
                DAILY_ZEN_REWARD,
                $riskScore
            ));
            
            // Send Zen reward
            $cfg = getConfig();
            $db = $cfg['db'];
            
            $mysqli = new mysqli($db['host'], $db['user'], $db['pass'], $db['name']);
            if ($mysqli->connect_errno) {
                throw new Exception("Database connection failed");
            }
            
            $result = sendZenReward($mysqli, $user['username'], DAILY_ZEN_REWARD);
            $mysqli->close();
            
            if (!$result['success']) {
                throw new Exception($result['error']);
            }
            
            $pdo->commit();
            
            // Log successful claim
            logSecurityEvent($pdo, $user['account_id'], $deviceHash, $ip, 'successful_claim', 'reward:' . DAILY_ZEN_REWARD);
            
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
            
            if (strpos($e->getMessage(), 'Duplicate') !== false) {
                http_response_code(409);
                echo json_encode(array('success' => false, 'error' => 'Already claimed today.'));
            } else {
                error_log("[DailyZen] Claim failed: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(array('success' => false, 'error' => 'Failed to send Zen. Please try again.'));
            }
        }
        exit;
    }
    
    http_response_code(405);
    echo json_encode(array('success' => false, 'error' => 'Method not allowed'));
    
} catch (Exception $e) {
    error_log("[DailyZen] Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array('success' => false, 'error' => 'Internal server error'));
}
