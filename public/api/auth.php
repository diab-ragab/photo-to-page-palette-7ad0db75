<?php
// api/auth.php (HARDENED + CORS FIXED)

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

ob_start();
$RID = bin2hex(random_bytes(6));

function out_json(int $code, array $payload): void {
  while (ob_get_level()) { @ob_end_clean(); }
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

function fail(int $code, string $msg, string $rid): void {
  error_log("RID={$rid} RESP={$code} MSG={$msg}");
  out_json($code, ["success"=>false,"message"=>$msg,"rid"=>$rid]);
}

set_exception_handler(function($e) use (&$RID){
  error_log("RID={$RID} EXCEPTION: ".$e->getMessage());
  fail(500, "Server error", $RID);
});
set_error_handler(function($severity, $message, $file, $line){
  throw new ErrorException($message, 0, $severity, $file, $line);
});
register_shutdown_function(function() use (&$RID){
  $err = error_get_last();
  if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
    error_log("RID={$RID} FATAL: {$err['message']} in {$err['file']}:{$err['line']}");
    out_json(500, ["success"=>false,"message"=>"Server error","rid"=>$RID]);
  }
});

// Load bootstrap + enable CORS NOW (must be before any response)
require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET','POST','OPTIONS'));

// ----- METHOD ROUTING -----
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// NOTE: No need to handle OPTIONS here.
// bootstrap->handleCors() will exit(204) for OPTIONS automatically.

if ($method === 'GET') {
  out_json(200, ["success"=>true,"message"=>"auth ok","rid"=>$RID]);
}

if ($method !== 'POST') {
  fail(405, "Method not allowed", $RID);
}

// Parse JSON
$raw = file_get_contents('php://input');
if (is_string($raw) && $raw !== '') {
  $json = json_decode($raw, true);
  if (is_array($json)) $_POST = array_merge($_POST, $json);
}

// Helpers
function validateEmail(string $email): bool { return filter_var($email, FILTER_VALIDATE_EMAIL) !== false; }
function validateUsername(string $username): bool { return (bool)preg_match('/^[a-zA-Z0-9_]{4,10}$/', $username); }
function legacy_hash(string $user, string $pass): string { return md5($user.$pass, true); }
function csrf(): string { return bin2hex(random_bytes(32)); }
function tokenFromHeaders(): string {
  $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (stripos($auth, 'Bearer ') === 0) return trim(substr($auth, 7));
  $hdr = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? '';
  return $hdr ? trim($hdr) : '';
}

// DB
try { $pdo = getDB(); }
catch (Throwable $e) { fail(503, "Service temporarily unavailable", $RID); }

// ---- MySQL 5.1 safe tables ----
function ensureUserSessionsTable(PDO $pdo): void {
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
    KEY IX_user_sessions_expires (expires_at),
    KEY IX_user_sessions_last (last_activity)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
  try { $pdo->exec("ALTER TABLE user_sessions ADD COLUMN csrf_token VARCHAR(64) NULL AFTER session_token"); } catch (Throwable $e) {}
  try { $pdo->exec("ALTER TABLE user_sessions ADD COLUMN last_activity DATETIME NOT NULL"); } catch (Throwable $e) {}
}

function ensureRateLimitTable(PDO $pdo): void {
  $pdo->exec("CREATE TABLE IF NOT EXISTS rate_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    action VARCHAR(20) NOT NULL,
    attempt_time DATETIME NOT NULL,
    KEY idx_ip_action_time (ip_address, action, attempt_time)
  ) ENGINE=MyISAM DEFAULT CHARSET=utf8");
}
function recordAttempt(PDO $pdo, string $ip, string $action): void {
  ensureRateLimitTable($pdo);
  $pdo->prepare("INSERT INTO rate_limits (ip_address, action, attempt_time) VALUES (?, ?, NOW())")->execute([$ip,$action]);
}
function checkRateLimit(PDO $pdo, string $ip, string $action, int $max, int $winMin): array {
  ensureRateLimitTable($pdo);
  $windowStart = date('Y-m-d H:i:s', strtotime("-{$winMin} minutes"));
  $pdo->prepare("DELETE FROM rate_limits WHERE attempt_time < ?")->execute([$windowStart]);
  $stmt = $pdo->prepare("SELECT COUNT(*) AS attempts, MIN(attempt_time) AS first_attempt
                         FROM rate_limits
                         WHERE ip_address=? AND action=? AND attempt_time > ?");
  $stmt->execute([$ip,$action,$windowStart]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: ["attempts"=>0,"first_attempt"=>null];
  $attempts = (int)($row['attempts'] ?? 0);

  $retry = 0;
  if ($attempts >= $max && !empty($row['first_attempt'])) {
    $firstTs = strtotime($row['first_attempt']);
    $retry = max(0, ($firstTs + $winMin*60) - time());
  }
  return [$attempts < $max, $retry];
}
function getLimits(string $action): array {
  if ($action === 'register') return [3, 60];
  if ($action === 'reset') return [3, 60];
  if ($action === 'login') return [5, 15];
  if ($action === 'change_password') return [5, 15];
  return [5, 15];
}

// Input
$clientIP = function_exists('getClientIP') ? getClientIP() : ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
$action   = function_exists('sanitizeInput') ? sanitizeInput((string)($_POST['action'] ?? ''), 20) : substr(trim((string)($_POST['action'] ?? '')),0,20);
$login    = function_exists('sanitizeInput') ? sanitizeInput((string)($_POST['login'] ?? ''), 10) : substr(trim((string)($_POST['login'] ?? '')),0,10);
$email    = function_exists('sanitizeInput') ? sanitizeInput((string)($_POST['email'] ?? ''), 255) : substr(trim((string)($_POST['email'] ?? '')),0,255);

$passwd   = (string)($_POST['passwd'] ?? '');
$repasswd = (string)($_POST['repasswd'] ?? '');

$newpass  = (string)($_POST['newpass'] ?? '');
$renew    = (string)($_POST['renew'] ?? '');

$oldPasswd     = (string)($_POST['oldPasswd'] ?? '');
$newPasswd     = (string)($_POST['newPasswd'] ?? '');
$confirmPasswd = (string)($_POST['confirmPasswd'] ?? '');

$sessionTokenBody = (string)($_POST['sessionToken'] ?? '');
$rememberMe = (bool)($_POST['remember_me'] ?? false);

define('SESSION_MINUTES', 60);
define('SESSION_REMEMBER_MINUTES', 10080);

// ----- Actions -----
if ($action === 'login') {
  [$max,$win] = getLimits('login');
  [$ok,$retry] = checkRateLimit($pdo, $clientIP, 'login', $max, $win);
  if (!$ok) out_json(429, ["success"=>false,"message"=>"Too many login attempts. Please wait.","retry_after"=>$retry,"rid"=>$RID]);

  if ($login === '' || $passwd === '') fail(400, "Please enter username and password", $RID);

  $stmt = $pdo->prepare("SELECT ID, name, email, passwd FROM users WHERE name=? LIMIT 1");
  $stmt->execute([$login]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  $hash = legacy_hash($login, $passwd);
  if (!$user || !hash_equals((string)$user['passwd'], $hash)) {
    recordAttempt($pdo,$clientIP,'login');
    fail(401, "Invalid username or password", $RID);
  }

  ensureUserSessionsTable($pdo);
  $pdo->prepare("DELETE FROM user_sessions WHERE expires_at < NOW()")->execute();

  $sessionMinutes = $rememberMe ? SESSION_REMEMBER_MINUTES : SESSION_MINUTES;
  $sessionToken = bin2hex(random_bytes(32));
  $csrfToken = csrf();
  $ua = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 2000);

  $pdo->prepare("INSERT INTO user_sessions (user_id, session_token, csrf_token, ip_address, user_agent, created_at, expires_at, last_activity)
                 VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE), NOW())")
      ->execute([(int)$user['ID'], $sessionToken, $csrfToken, $clientIP, $ua, (int)$sessionMinutes]);

  $stmt = $pdo->prepare("SELECT expires_at FROM user_sessions WHERE session_token = ? LIMIT 1");
  $stmt->execute([$sessionToken]);
  $expiresAtRow = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
  $expiresAt = (string)($expiresAtRow['expires_at'] ?? '');

  out_json(200, [
    "success"=>true,
    "message"=>"Login successful",
    "user"=>["id"=>$user['ID'], "username"=>$user['name'], "email"=>$user['email'] ?? ""],
    "sessionToken"=>$sessionToken,
    "csrf_token"=>$csrfToken,
    "expiresAt"=>$expiresAt,
    "sessionMinutes"=>$sessionMinutes,
    "remember_me"=>$rememberMe,
    "rid"=>$RID
  ]);
}

if ($action === 'register') {
  [$max,$win] = getLimits('register');
  [$ok,$retry] = checkRateLimit($pdo, $clientIP, 'register', $max, $win);
  if (!$ok) out_json(429, ["success"=>false,"message"=>"Too many registration attempts. Please wait.","retry_after"=>$retry,"rid"=>$RID]);

  if ($login==='' || $passwd==='' || $repasswd==='' || $email==='') fail(400,"Please fill in all fields",$RID);
  if (!validateUsername($login)) fail(400,"Username must be 4–10 letters/numbers/_",$RID);
  if (!validateEmail($email)) fail(400,"Invalid email address",$RID);
  if (strlen($passwd)<3 || strlen($passwd)>16) fail(400,"Password must be 3–16 characters",$RID);
  if ($passwd !== $repasswd) fail(400,"Passwords did not match",$RID);

  $stmt = $pdo->prepare("SELECT ID FROM users WHERE name=? LIMIT 1");
  $stmt->execute([$login]);
  if ($stmt->fetch()) { recordAttempt($pdo,$clientIP,'register'); fail(409,"Username is not available",$RID); }

  $stmt = $pdo->prepare("SELECT ID FROM users WHERE email=? LIMIT 1");
  $stmt->execute([$email]);
  if ($stmt->fetch()) { recordAttempt($pdo,$clientIP,'register'); fail(409,"Email already registered",$RID); }

  $hash = legacy_hash($login, $passwd);
  $stmt = $pdo->prepare("INSERT INTO users (ID,name,passwd,Prompt,answer,truename,idnumber,email,mobilenumber,province,city,phonenumber,address,postalcode,gender,birthday,creatime,qq,passwd2)
                         VALUES (NULL, ?, ?, '', '', '', '', ?, '', '', '', '', '', '', 0, NULL, NOW(), '', ?)");
  $okIns = $stmt->execute([$login,$hash,$email,$hash]);
  if (!$okIns) fail(500,"Error creating account",$RID);

  out_json(200, ["success"=>true,"message"=>"Account created successfully","rid"=>$RID]);
}

if ($action === 'check_session') {
  ensureUserSessionsTable($pdo);
  $token = trim($sessionTokenBody);
  if ($token==='') $token = tokenFromHeaders();
  if ($token==='') fail(401,"No session token provided",$RID);

  $stmt = $pdo->prepare("SELECT s.*, u.name, u.email
                         FROM user_sessions s JOIN users u ON u.ID=s.user_id
                         WHERE s.session_token=? AND s.expires_at>NOW()
                         LIMIT 1");
  $stmt->execute([$token]);
  $s = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$s) fail(401,"Session expired or invalid",$RID);

  // Sliding expiration: extend TTL by SESSION_MINUTES using MySQL clock
  $pdo->prepare("UPDATE user_sessions SET last_activity=NOW(), expires_at=DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE session_token=?")->execute([SESSION_MINUTES, $token]);
  
  // Fetch the new expires_at from MySQL for the response
  $stmt2 = $pdo->prepare("SELECT expires_at FROM user_sessions WHERE session_token=? LIMIT 1");
  $stmt2->execute([$token]);
  $row2 = $stmt2->fetch(PDO::FETCH_ASSOC);
  $newExpires = $row2 ? $row2['expires_at'] : '';
  error_log("RID={$RID} SESSION_CHECK_EXTEND user_id={$s['user_id']} new_expires={$newExpires}");

  out_json(200, ["success"=>true,"valid"=>true,"user"=>["id"=>$s['user_id'],"username"=>$s['name'],"email"=>$s['email'] ?? ""],"csrf_token"=>$s['csrf_token'],"expiresAt"=>$newExpires,"rid"=>$RID]);
}

if ($action === 'refresh_session') {
  ensureUserSessionsTable($pdo);
  $token = trim($sessionTokenBody);
  if ($token==='') $token = tokenFromHeaders();
  if ($token==='') fail(401,"No session token provided",$RID);

  $stmt = $pdo->prepare("SELECT s.*, u.name, u.email FROM user_sessions s JOIN users u ON u.ID=s.user_id WHERE s.session_token=? AND s.expires_at>NOW() LIMIT 1");
  $stmt->execute([$token]);
  $s = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$s) fail(401,"Session expired or invalid",$RID);

  // Sliding expiration: extend TTL without rotating token (prevents race conditions)
  // Sliding expiration using MySQL clock for consistency
  $pdo->prepare("UPDATE user_sessions SET expires_at=DATE_ADD(NOW(), INTERVAL ? MINUTE), last_activity=NOW() WHERE session_token=?")
      ->execute([SESSION_MINUTES, $token]);
  
  $stmt2 = $pdo->prepare("SELECT expires_at FROM user_sessions WHERE session_token=? LIMIT 1");
  $stmt2->execute([$token]);
  $row2 = $stmt2->fetch(PDO::FETCH_ASSOC);
  $newExpires = $row2 ? $row2['expires_at'] : '';
  error_log("RID={$RID} SESSION_REFRESH_EXTEND user_id={$s['user_id']} new_expires={$newExpires}");

  out_json(200, ["success"=>true,"message"=>"Session refreshed","sessionToken"=>$token,"csrf_token"=>$s['csrf_token'],"expiresAt"=>$newExpires,"sessionMinutes"=>SESSION_MINUTES,"rid"=>$RID]);
}

if ($action === 'reset') {
  [$max,$win] = getLimits('reset');
  [$ok,$retry] = checkRateLimit($pdo, $clientIP, 'reset', $max, $win);
  if (!$ok) out_json(429, ["success"=>false,"message"=>"Too many reset attempts. Please wait.","retry_after"=>$retry,"rid"=>$RID]);

  if ($login==='' || $email==='' || $newpass==='' || $renew==='') fail(400,"Please fill in all fields",$RID);
  if (!validateEmail($email)) fail(400,"Invalid email address",$RID);
  if ($newpass !== $renew) fail(400,"Passwords did not match",$RID);
  if (strlen($newpass)<3 || strlen($newpass)>16) fail(400,"Password must be 3–16 characters",$RID);

  $stmt = $pdo->prepare("SELECT ID FROM users WHERE name=? AND email=? LIMIT 1");
  $stmt->execute([$login,$email]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$row) out_json(200, ["success"=>true,"message"=>"If this account exists, password has been reset","rid"=>$RID]);

  $hash = legacy_hash($login,$newpass);
  $pdo->prepare("UPDATE users SET passwd=?, passwd2=? WHERE ID=?")->execute([$hash,$hash,$row['ID']]);
  $pdo->prepare("DELETE FROM user_sessions WHERE user_id=?")->execute([$row['ID']]);

  out_json(200, ["success"=>true,"message"=>"Password reset successfully","rid"=>$RID]);
}

if ($action === 'change_password') {
  [$max,$win] = getLimits('change_password');
  [$ok,$retry] = checkRateLimit($pdo, $clientIP, 'change_password', $max, $win);
  if (!$ok) out_json(429, ["success"=>false,"message"=>"Too many attempts. Please wait.","retry_after"=>$retry,"rid"=>$RID]);

  if ($login==='' || $oldPasswd==='' || $newPasswd==='' || $confirmPasswd==='') fail(400,"Please fill in all fields",$RID);
  if (!validateUsername($login)) fail(400,"Username must be 4–10 letters/numbers/_",$RID);
  if ($newPasswd !== $confirmPasswd) fail(400,"New passwords did not match",$RID);
  if (strlen($newPasswd)<3 || strlen($newPasswd)>16) fail(400,"New password must be 3–16 characters",$RID);

  $stmt = $pdo->prepare("SELECT ID, passwd FROM users WHERE name=? LIMIT 1");
  $stmt->execute([$login]);
  $u = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$u) { recordAttempt($pdo,$clientIP,'change_password'); fail(404,"User not found",$RID); }

  $oldHash = legacy_hash($login,$oldPasswd);
  if (!hash_equals((string)$u['passwd'], $oldHash)) {
    recordAttempt($pdo,$clientIP,'change_password');
    fail(401,"Current password is incorrect",$RID);
  }

  $newHash = legacy_hash($login,$newPasswd);
  $pdo->prepare("UPDATE users SET passwd=?, passwd2=? WHERE ID=?")->execute([$newHash,$newHash,$u['ID']]);

  ensureUserSessionsTable($pdo);
  $currentToken = trim($sessionTokenBody);
  if ($currentToken==='') $currentToken = tokenFromHeaders();
  if ($currentToken!=='') {
    $pdo->prepare("DELETE FROM user_sessions WHERE user_id=? AND session_token != ?")->execute([(int)$u['ID'], $currentToken]);
  }

  out_json(200, ["success"=>true,"message"=>"Password changed successfully","rid"=>$RID]);
}

if ($action === 'logout') {
  ensureUserSessionsTable($pdo);
  $token = trim($sessionTokenBody);
  if ($token==='') $token = tokenFromHeaders();
  if ($token==='') fail(400,"Missing session token",$RID);

  $pdo->prepare("DELETE FROM user_sessions WHERE session_token=?")->execute([$token]);
  out_json(200, ["success"=>true,"message"=>"Logged out","rid"=>$RID]);
}

fail(400, "Invalid action", $RID);
