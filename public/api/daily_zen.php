<?php
/**
 * Daily Zen Reward API - 24h Cooldown from last claim
 * PHP 5.x compatible
 */

require_once __DIR__ . '/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

define('DAILY_ZEN_REWARD', 100000);
define('COOLDOWN_SECONDS', 24 * 60 * 60); // 24 hours

define('SERVER_SECRET_SALT', 'wOi3ndG4m3_z3N_s4Lt_X9kP2mQ7vL5nR8tY1wZ6');

// Cookie
define('DEVICE_TOKEN_NAME', 'woi_device_token');
define('DEVICE_TOKEN_EXPIRY', 180 * 24 * 60 * 60);

// Limits
define('MAX_FAILED_ATTEMPTS_PER_IP_PER_HOUR', 10);
define('MAX_RISK_SCORE_BLOCK', 60);

// Allowed origins
$ALLOWED_ORIGINS = array(
  'https://woiendgame.online',
  'https://www.woiendgame.online',
  'https://woiendgame.lovable.app'
);

if (session_id() === '') { @session_start(); }

function jsonOut($arr, $code = 200) {
  http_response_code($code);
  echo json_encode($arr);
  exit;
}

function requireCloudflare() {
  if (empty($_SERVER['HTTP_CF_RAY'])) {
    jsonOut(array('success' => false, 'error' => 'Direct access blocked'), 403);
  }
}

function getClientIP() {
  if (!empty($_SERVER['HTTP_CF_CONNECTING_IP']) && filter_var($_SERVER['HTTP_CF_CONNECTING_IP'], FILTER_VALIDATE_IP)) {
    return $_SERVER['HTTP_CF_CONNECTING_IP'];
  }
  if (!empty($_SERVER['REMOTE_ADDR']) && filter_var($_SERVER['REMOTE_ADDR'], FILTER_VALIDATE_IP)) {
    return $_SERVER['REMOTE_ADDR'];
  }
  return '0.0.0.0';
}

function getIPSubnet($ip) {
  $parts = explode('.', $ip);
  if (count($parts) === 4) return $parts[0].'.'.$parts[1].'.'.$parts[2].'.0/24';
  return $ip;
}

function sha256($s) { return hash('sha256', $s); }

function generateDeviceToken() {
  if (function_exists('random_bytes')) return bin2hex(random_bytes(32));
  if (function_exists('openssl_random_pseudo_bytes')) return bin2hex(openssl_random_pseudo_bytes(32));
  $t = '';
  for ($i=0;$i<64;$i++) $t .= dechex(mt_rand(0,15));
  return $t;
}

function setDeviceCookie($token) {
  $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
  $maxAge = DEVICE_TOKEN_EXPIRY;
  $expires = time() + $maxAge;

  $cookie = DEVICE_TOKEN_NAME . '=' . rawurlencode($token)
    . '; Path=/'
    . '; Max-Age=' . $maxAge
    . '; Expires=' . gmdate('D, d M Y H:i:s', $expires) . ' GMT'
    . '; SameSite=Strict'
    . ($secure ? '; Secure' : '')
    . '; HttpOnly';

  header('Set-Cookie: ' . $cookie, false);
  $_COOKIE[DEVICE_TOKEN_NAME] = $token;
}

function getOrCreateDeviceToken() {
  $t = isset($_COOKIE[DEVICE_TOKEN_NAME]) ? $_COOKIE[DEVICE_TOKEN_NAME] : '';
  if (!$t) {
    $t = generateDeviceToken();
    setDeviceCookie($t);
  }
  return $t;
}

function hashDeviceToken($token) { return sha256($token . '|' . SERVER_SECRET_SALT); }
function hashFingerprint($fingerprint) { return sha256($fingerprint . '|' . SERVER_SECRET_SALT); }

function getCsrfToken() {
  if (empty($_SESSION['csrf_token'])) {
    $b = function_exists('random_bytes') ? random_bytes(16) : openssl_random_pseudo_bytes(16);
    $_SESSION['csrf_token'] = bin2hex($b);
  }
  return $_SESSION['csrf_token'];
}

function verifyCsrf() {
  $sent = !empty($_SERVER['HTTP_X_CSRF_TOKEN']) ? $_SERVER['HTTP_X_CSRF_TOKEN'] : '';
  if (!$sent || empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $sent)) {
    jsonOut(array('success'=>false,'error'=>'CSRF failed'), 403);
  }
}

function checkOrigin($allowedOrigins) {
  $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
  if ($origin && !in_array($origin, $allowedOrigins, true)) {
    jsonOut(array('success'=>false,'error'=>'Invalid origin'), 403);
  }
}

function validateSession($pdo) {
  $sessionToken = '';

  if (!empty($_SERVER['HTTP_X_SESSION_TOKEN'])) {
    $sessionToken = $_SERVER['HTTP_X_SESSION_TOKEN'];
  } elseif (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
    $auth = $_SERVER['HTTP_AUTHORIZATION'];
    if (strpos($auth, 'Bearer ') === 0) $sessionToken = substr($auth, 7);
  }

  if (!$sessionToken) return null;

  $stmt = $pdo->prepare("
    SELECT s.user_id, s.expires_at, u.name AS username, u.ID AS account_id
    FROM user_sessions s
    JOIN users u ON s.user_id = u.ID
    WHERE s.session_token = ?
    LIMIT 1
  ");
  $stmt->execute(array($sessionToken));
  $row = $stmt->fetch();
  if (!$row) return null;

  $expiresAt = strtotime($row['expires_at']);
  if ($expiresAt < time()) return null;

  return array(
    'account_id' => (int)$row['account_id'],
    'username'   => $row['username']
  );
}

function logSecurity($pdo, $accountId, $deviceHash, $ip, $type, $details) {
  try {
    $stmt = $pdo->prepare("
      INSERT INTO daily_zen_security_log (account_id, device_token_hash, ip_address, event_type, details, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute(array($accountId, $deviceHash, $ip, $type, $details));
  } catch (Exception $e) {}
}

function isRateLimited($pdo, $ip) {
  try {
    $stmt = $pdo->prepare("
      SELECT COUNT(*) AS c
      FROM daily_zen_security_log
      WHERE ip_address = ?
        AND event_type IN ('failed_claim','blocked')
        AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ");
    $stmt->execute(array($ip));
    $r = $stmt->fetch();
    return ((int)$r['c']) >= MAX_FAILED_ATTEMPTS_PER_IP_PER_HOUR;
  } catch (Exception $e) {
    return false;
  }
}

/**
 * Ensure tables exist with claimed_at DATETIME
 */
function ensureTablesExist($pdo) {
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS daily_zen_claims (
      id INT AUTO_INCREMENT PRIMARY KEY,
      account_id INT NOT NULL,
      device_token_hash VARCHAR(64) NOT NULL,
      fingerprint_hash VARCHAR(64) NOT NULL,
      ip_address VARCHAR(45) NOT NULL,
      ip_subnet VARCHAR(20) NOT NULL,
      reward_amount INT NOT NULL DEFAULT 0,
      risk_score INT DEFAULT 0,
      created_at DATETIME NOT NULL,
      claimed_at DATETIME NOT NULL,
      INDEX idx_account_time (account_id, claimed_at),
      INDEX idx_device_time (device_token_hash, claimed_at),
      INDEX idx_ip_time (ip_address, claimed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  ");

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
 * Get seconds until next claim based on LAST claimed_at for THIS account only
 * Returns 0 if can claim now
 */
function secondsUntilNextClaim($pdo, $accountId) {
  $stmt = $pdo->prepare("
    SELECT claimed_at
    FROM daily_zen_claims
    WHERE account_id = ?
    ORDER BY claimed_at DESC
    LIMIT 1
  ");
  $stmt->execute(array($accountId));
  $row = $stmt->fetch();

  if (!$row || empty($row['claimed_at'])) {
    return 0; // Never claimed, can claim now
  }

  $lastClaim = strtotime($row['claimed_at']);
  // Defensive: if DB/server timezone drift causes a future timestamp,
  // treat it as "just claimed now" so remaining never exceeds 24h.
  if ($lastClaim > time()) {
    $lastClaim = time();
  }
  $nextClaim = $lastClaim + COOLDOWN_SECONDS;
  $remaining = $nextClaim - time();

  return ($remaining > 0) ? $remaining : 0;
}

/**
 * Send Zen via procedure usecash
 */
function sendZenReward($mysqli, $username, $amount) {
  $stmt = $mysqli->prepare("SELECT ID FROM users WHERE name = ? LIMIT 1");
  $stmt->bind_param("s", $username);
  $stmt->execute();
  $stmt->bind_result($userid);
  $stmt->fetch();
  $stmt->close();

  if (!$userid) return array('success'=>false,'error'=>'Account not found');

  $zoneid = 1;
  $sn     = 0;
  $aid    = 1;
  $point  = 0;
  $cash   = (int)$amount;
  $status = 1;

  $stmt = $mysqli->prepare("CALL usecash(?, ?, ?, ?, ?, ?, ?, @p_error)");
  $stmt->bind_param("iiiiiii", $userid, $zoneid, $sn, $aid, $point, $cash, $status);
  $stmt->execute();
  $stmt->close();

  while ($mysqli->more_results() && $mysqli->next_result()) {
    $res = $mysqli->use_result();
    if ($res instanceof mysqli_result) $res->free();
  }

  $result = $mysqli->query("SELECT @p_error AS error");
  $row = $result->fetch_assoc();
  $error = (int)$row['error'];
  $result->free();

  if ($error === 0 || $error === -8) return array('success'=>true);
  return array('success'=>false,'error'=>'Zen delivery failed (code: '.$error.')');
}

/* ───────────────────────────────────────────── */

requireCloudflare();

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

try {
  $pdo = getDB();
  ensureTablesExist($pdo);

  $ip = getClientIP();
  $subnet = getIPSubnet($ip);

  if ($method === 'GET') {
    $user = validateSession($pdo);
    if (!$user) {
      jsonOut(array(
        'success'=>false,
        'error'=>'Not authenticated',
        'can_claim'=>false,
        'has_claimed'=>false,
        'reward_amount'=>0,
        'seconds_until_next_claim'=>0
      ), 401);
    }

    $deviceToken = getOrCreateDeviceToken();
    $deviceHash = hashDeviceToken($deviceToken);

    // Calculate remaining time from last claim for THIS account
    $remain = secondsUntilNextClaim($pdo, $user['account_id']);

    jsonOut(array(
      'success'=>true,
      'can_claim'=>($remain === 0),
      'has_claimed'=>($remain > 0),
      'reward_amount'=>DAILY_ZEN_REWARD,
      'seconds_until_next_claim'=>$remain,
      'csrf_token'=>getCsrfToken()
    ));
  }

  if ($method === 'POST') {
    if (isRateLimited($pdo, $ip)) {
      jsonOut(array('success'=>false,'error'=>'Too many attempts. Try later.'), 429);
    }

    checkOrigin($ALLOWED_ORIGINS);

    $user = validateSession($pdo);
    if (!$user) {
      logSecurity($pdo, null, null, $ip, 'blocked', 'not_authenticated');
      jsonOut(array('success'=>false,'error'=>'Not authenticated'), 401);
    }

    verifyCsrf();

    $deviceToken = getOrCreateDeviceToken();
    $deviceHash  = hashDeviceToken($deviceToken);

    // Check 24h cooldown for THIS account
    $remain = secondsUntilNextClaim($pdo, $user['account_id']);
    if ($remain > 0) {
      logSecurity($pdo, $user['account_id'], $deviceHash, $ip, 'failed_claim', 'cooldown_active');
      jsonOut(array(
        'success'=>false,
        'error'=>'You can claim again after 24 hours.',
        'seconds_until_next_claim'=>$remain
      ), 429);
    }

    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input)) {
      logSecurity($pdo, $user['account_id'], $deviceHash, $ip, 'failed_claim', 'bad_json');
      jsonOut(array('success'=>false,'error'=>'Invalid request'), 400);
    }

    $fingerprint = isset($input['fingerprint']) ? trim($input['fingerprint']) : '';
    if (!$fingerprint || strlen($fingerprint) < 32) {
      logSecurity($pdo, $user['account_id'], $deviceHash, $ip, 'failed_claim', 'missing_fingerprint');
      jsonOut(array('success'=>false,'error'=>'Invalid request'), 400);
    }
    $fingerprintHash = hashFingerprint($fingerprint);

    $signals = isset($input['signals']) && is_array($input['signals']) ? $input['signals'] : array();
    $risk = isset($signals['risk']) ? (int)$signals['risk'] : 0;

    $isHeadless = !empty($signals['headless']);
    if ($isHeadless && $risk >= MAX_RISK_SCORE_BLOCK) {
      logSecurity($pdo, $user['account_id'], $deviceHash, $ip, 'blocked', 'headless_high_risk');
      jsonOut(array('success'=>false,'error'=>'Automated browser detected. Use a normal browser.'), 403);
    }

    // Send Zen first
    $cfg = getConfig();
    $db  = $cfg['db'];

    $mysqli = new mysqli($db['host'], $db['user'], $db['pass'], $db['name']);
    if ($mysqli->connect_errno) {
      logSecurity($pdo, $user['account_id'], $deviceHash, $ip, 'failed_claim', 'mysqli_connect_failed');
      jsonOut(array('success'=>false,'error'=>'DB connection failed'), 500);
    }

    $res = sendZenReward($mysqli, $user['username'], DAILY_ZEN_REWARD);
    $mysqli->close();

    if (empty($res['success'])) {
      logSecurity($pdo, $user['account_id'], $deviceHash, $ip, 'failed_claim', 'send_failed');
      jsonOut(array('success'=>false,'error'=>$res['error']), 500);
    }

    // Log claim with claimed_at = NOW()
    try {
      $stmt = $pdo->prepare("
        INSERT INTO daily_zen_claims
          (account_id, device_token_hash, fingerprint_hash, ip_address, ip_subnet, reward_amount, risk_score, created_at, claimed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ");
      $stmt->execute(array(
        $user['account_id'],
        $deviceHash,
        $fingerprintHash,
        $ip,
        $subnet,
        DAILY_ZEN_REWARD,
        $risk
      ));
    } catch (Exception $e) {
      logSecurity($pdo, $user['account_id'], $deviceHash, $ip, 'failed_claim', 'log_after_send_failed');
    }

    logSecurity($pdo, $user['account_id'], $deviceHash, $ip, 'successful_claim', 'reward:'.DAILY_ZEN_REWARD);

    // Return actual remaining time (24h from now)
    jsonOut(array(
      'success'=>true,
      'message'=>'Daily Zen claimed successfully!',
      'reward_amount'=>DAILY_ZEN_REWARD,
      'seconds_until_next_claim'=>COOLDOWN_SECONDS
    ));
  }

  jsonOut(array('success'=>false,'error'=>'Method not allowed'), 405);

} catch (Exception $e) {
  error_log('[DailyZen] fatal: '.$e->getMessage());
  jsonOut(array('success'=>false,'error'=>'Internal server error'), 500);
}
