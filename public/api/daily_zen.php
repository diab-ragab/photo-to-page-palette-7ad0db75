<?php
/**
 * Daily Zen Reward API - Cloudflare Safe + CSRF + Device Token
 * PHP 5.x compatible (avoid array cookie options)
 */

require_once __DIR__ . '/bootstrap.php';
// Note: getDB() is defined in bootstrap.php

header('Content-Type: application/json; charset=utf-8');

define('DAILY_ZEN_REWARD', 500000);

// IMPORTANT: move this to config/env if possible
define('SERVER_SECRET_SALT', 'CHANGE_ME_to_long_random_secret');

// Cookie
define('DEVICE_TOKEN_NAME', 'woi_device_token');
define('DEVICE_TOKEN_EXPIRY', 180 * 24 * 60 * 60); // 180 days

// Limits
define('MAX_FAILED_ATTEMPTS_PER_IP_PER_HOUR', 10);
define('MAX_RISK_SCORE_BLOCK', 60);

// Allowed origins
$ALLOWED_ORIGINS = array(
  'https://woiendgame.online',
  'https://www.woiendgame.online',
  'https://woiendgame.lovable.app'
);

if (session_id() === '') {
  @session_start();
}

function jsonOut($arr, $code = 200) {
  http_response_code($code);
  echo json_encode($arr);
  exit;
}

/**
 * Require Cloudflare-proxied request (basic)
 * Prevent direct-to-origin bypass (not perfect, but helpful).
 */
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
  if (count($parts) === 4) {
    return $parts[0].'.'.$parts[1].'.'.$parts[2].'.0/24';
  }
  return $ip;
}

function sha256($s) {
  return hash('sha256', $s);
}

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

  // Reliable Set-Cookie header with SameSite for old PHP
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

function hashDeviceToken($token) {
  return sha256($token . '|' . SERVER_SECRET_SALT);
}

function hashFingerprint($fingerprint) {
  return sha256($fingerprint . '|' . SERVER_SECRET_SALT);
}

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

if (isset($_GET['debug']) && $_GET['debug'] === '1') {
  echo json_encode(array(
    'has_x_session' => !empty($_SERVER['HTTP_X_SESSION_TOKEN']),
    'has_auth'      => !empty($_SERVER['HTTP_AUTHORIZATION']),
    'x_session_len' => !empty($_SERVER['HTTP_X_SESSION_TOKEN']) ? strlen($_SERVER['HTTP_X_SESSION_TOKEN']) : 0,
    'auth_prefix'   => !empty($_SERVER['HTTP_AUTHORIZATION']) ? substr($_SERVER['HTTP_AUTHORIZATION'], 0, 20) : '',
    'cf_ray'        => !empty($_SERVER['HTTP_CF_RAY']),
  ));
  exit;
}

/**
 * Your existing token session validation (as you wrote)
 * Returns: array(account_id, username) or null
 */
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
  } catch (Exception $e) {
    // ignore logging failures
  }
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

function secondsUntilReset() {
  $now = time();
  $midnight = strtotime('tomorrow midnight');
  return max(0, $midnight - $now);
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
 * Send Zen via procedure usecash (your existing logic)
 */
function sendZenReward($mysqli, $username, $amount) {
  $stmt = $mysqli->prepare("SELECT ID FROM users WHERE name = ? LIMIT 1");
  $stmt->bind_param("s", $username);
  $stmt->execute();
  $stmt->bind_result($userid);
  $stmt->fetch();
  $stmt->close();

  if (!$userid) return array('success'=>false,'error'=>'Account not found');

  $zoneid = 1; $sn = -1; $aid = 1; $point = 0; $cash = (int)$amount; $status = 0;

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
        'seconds_until_reset'=>0,
        'reset_time'=>''
      ), 401);
    }

    $deviceToken = getOrCreateDeviceToken();
    $deviceHash = hashDeviceToken($deviceToken);

    $stmt = $pdo->prepare("SELECT id FROM daily_zen_claims WHERE device_token_hash = ? AND claim_date = CURDATE() LIMIT 1");
    $stmt->execute(array($deviceHash));
    $deviceClaimed = (bool)$stmt->fetch();

    $stmt = $pdo->prepare("SELECT id FROM daily_zen_claims WHERE account_id = ? AND claim_date = CURDATE() LIMIT 1");
    $stmt->execute(array($user['account_id']));
    $accountClaimed = (bool)$stmt->fetch();

    $has = ($deviceClaimed || $accountClaimed);
    $midnight = strtotime('tomorrow midnight');

    jsonOut(array(
      'success'=>true,
      'can_claim'=>!$has,
      'has_claimed'=>$has,
      'reward_amount'=>DAILY_ZEN_REWARD,
      'seconds_until_reset'=>secondsUntilReset(),
      'reset_time'=>date('Y-m-d H:i:s', $midnight),
      'csrf_token'=>getCsrfToken()
    ));
  }

  if ($method === 'POST') {
    if (isRateLimited($pdo, $ip)) {
      jsonOut(array('success'=>false,'error'=>'Too many attempts. Try later.'), 429);
    }

    // Origin + Session + CSRF
    checkOrigin($ALLOWED_ORIGINS);

    $user = validateSession($pdo);
    if (!$user) {
      logSecurity($pdo, null, null, $ip, 'blocked', 'not_authenticated');
      jsonOut(array('success'=>false,'error'=>'Not authenticated'), 401);
    }

    verifyCsrf();

    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input)) {
      logSecurity($pdo, $user['account_id'], null, $ip, 'failed_claim', 'bad_json');
      jsonOut(array('success'=>false,'error'=>'Invalid request'), 400);
    }

    $fingerprint = isset($input['fingerprint']) ? trim($input['fingerprint']) : '';
    if (!$fingerprint || strlen($fingerprint) < 32) {
      logSecurity($pdo, $user['account_id'], null, $ip, 'failed_claim', 'missing_fingerprint');
      jsonOut(array('success'=>false,'error'=>'Invalid request'), 400);
    }
    $fingerprintHash = hashFingerprint($fingerprint);

    $signals = isset($input['signals']) && is_array($input['signals']) ? $input['signals'] : array();
    $risk = isset($signals['risk']) ? (int)$signals['risk'] : 0;

    // Hard block only if clearly automation/headless (reduce false positives)
    $isHeadless = !empty($signals['headless']);
    if ($isHeadless && $risk >= MAX_RISK_SCORE_BLOCK) {
      logSecurity($pdo, $user['account_id'], null, $ip, 'blocked', 'headless_high_risk');
      jsonOut(array('success'=>false,'error'=>'Automated browser detected. Use a normal browser.'), 403);
    }

    $deviceToken = getOrCreateDeviceToken();
    $deviceHash  = hashDeviceToken($deviceToken);

    // Quick deny if already claimed (rely on UNIQUE for race too)
    $stmt = $pdo->prepare("SELECT id FROM daily_zen_claims WHERE device_token_hash = ? AND claim_date = CURDATE() LIMIT 1");
    $stmt->execute(array($deviceHash));
    if ($stmt->fetch()) {
      logSecurity($pdo, $user['account_id'], $deviceHash, $ip, 'failed_claim', 'device_already_claimed');
      jsonOut(array('success'=>false,'error'=>'Already claimed today from this device.'), 409);
    }

    $stmt = $pdo->prepare("SELECT id FROM daily_zen_claims WHERE account_id = ? AND claim_date = CURDATE() LIMIT 1");
    $stmt->execute(array($user['account_id']));
    if ($stmt->fetch()) {
      logSecurity($pdo, $user['account_id'], $deviceHash, $ip, 'failed_claim', 'account_already_claimed');
      jsonOut(array('success'=>false,'error'=>'Already claimed today on this account.'), 409);
    }

    // Process atomic
    $pdo->beginTransaction();
    try {
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
        $subnet,
        DAILY_ZEN_REWARD,
        $risk
      ));

      // Send Zen
      $cfg = getConfig();
      $db  = $cfg['db'];

      $mysqli = new mysqli($db['host'], $db['user'], $db['pass'], $db['name']);
      if ($mysqli->connect_errno) throw new Exception('mysqli_connect_failed');

      $res = sendZenReward($mysqli, $user['username'], DAILY_ZEN_REWARD);
      $mysqli->close();

      if (empty($res['success'])) throw new Exception(isset($res['error']) ? $res['error'] : 'send_failed');

      $pdo->commit();

      logSecurity($pdo, $user['account_id'], $deviceHash, $ip, 'successful_claim', 'reward:'.DAILY_ZEN_REWARD);

      jsonOut(array(
        'success'=>true,
        'message'=>'Daily Zen claimed successfully!',
        'reward_amount'=>DAILY_ZEN_REWARD,
        'seconds_until_reset'=>secondsUntilReset()
      ));

    } catch (Exception $e) {
      $pdo->rollBack();

      // Duplicate unique => already claimed
      if (stripos($e->getMessage(), 'Duplicate') !== false) {
        logSecurity($pdo, $user['account_id'], $deviceHash, $ip, 'failed_claim', 'duplicate');
        jsonOut(array('success'=>false,'error'=>'Already claimed today.'), 409);
      }

      error_log('[DailyZen] claim_failed: '.$e->getMessage());
      logSecurity($pdo, $user['account_id'], $deviceHash, $ip, 'failed_claim', 'server_error');
      jsonOut(array('success'=>false,'error'=>'Failed to send Zen. Please try again.'), 500);
    }
  }

  jsonOut(array('success'=>false,'error'=>'Method not allowed'), 405);

} catch (Exception $e) {
  error_log('[DailyZen] fatal: '.$e->getMessage());
  jsonOut(array('success'=>false,'error'=>'Internal server error'), 500);
}
