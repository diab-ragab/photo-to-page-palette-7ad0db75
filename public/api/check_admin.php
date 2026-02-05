<?php
// api/check_admin.php (FIXED - MySQL 5.1 safe)

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
  out_json($code, ["success"=>false, "message"=>$msg, "rid"=>$rid]);
}

set_exception_handler(function($e) use (&$RID){
  error_log("RID={$RID} EXCEPTION: ".$e->getMessage());
  fail(500, "Server error", $RID);
});
set_error_handler(function($severity,$message,$file,$line){
  throw new ErrorException($message, 0, $severity, $file, $line);
});
register_shutdown_function(function() use (&$RID){
  $err = error_get_last();
  if ($err && in_array($err['type'], [E_ERROR,E_PARSE,E_CORE_ERROR,E_COMPILE_ERROR], true)) {
    error_log("RID={$RID} FATAL: {$err['message']} in {$err['file']}:{$err['line']}");
    out_json(500, ["success"=>false,"message"=>"Server error","rid"=>$RID]);
  }
});

require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET', 'OPTIONS'));
require_once __DIR__ . '/db.php';

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
if ($method !== 'GET') fail(405, "Method not allowed", $RID);

try { $pdo = getDB(); }
catch (Throwable $e) { fail(503, "Service temporarily unavailable", $RID); }

// ---- ensure tables (MySQL 5.1 safe) ----
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

function ensureUserRolesTable(PDO $pdo): void {
  // MySQL 5.1: avoid DEFAULT CURRENT_TIMESTAMP to be safe
  $pdo->exec("CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role VARCHAR(50) NOT NULL,
    granted_at DATETIME NOT NULL,
    granted_by VARCHAR(50) NULL,
    UNIQUE KEY uq_user_role (user_id, role),
    KEY idx_user_id (user_id),
    KEY idx_role (role)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}

ensureUserSessionsTable($pdo);
ensureUserRolesTable($pdo);

// ---- token helpers ----
function getSessionToken(): string {
  $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (stripos($auth, 'Bearer ') === 0) return trim(substr($auth, 7));

  $hdr = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? '';
  if ($hdr) return trim($hdr);

  if (!empty($_GET['sessionToken'])) return trim((string)$_GET['sessionToken']);
  if (!empty($_COOKIE['sessionToken'])) return trim((string)$_COOKIE['sessionToken']);

  return '';
}

$sessionToken = getSessionToken();
$username = isset($_GET['user']) ? trim((string)$_GET['user']) : '';

if ($sessionToken === '' && $username === '') {
  out_json(200, [
    "success"=>true,
    "is_admin"=>false,
    "is_gm"=>false,
    "roles"=>[],
    "message"=>"No authentication provided",
    "rid"=>$RID
  ]);
}

$userId = null;

// Prefer session token
if ($sessionToken !== '') {
  $stmt = $pdo->prepare("
    SELECT us.user_id, u.name
    FROM user_sessions us
    JOIN users u ON u.ID = us.user_id
    WHERE us.session_token = ? AND us.expires_at > NOW()
    LIMIT 1
  ");
  $stmt->execute([$sessionToken]);
  $session = $stmt->fetch(PDO::FETCH_ASSOC);
  if ($session) {
    $userId = (int)$session['user_id'];
    $username = (string)$session['name'];
  }
}

// Fallback username lookup
if ($userId === null && $username !== '') {
  $stmt = $pdo->prepare("SELECT ID, name FROM users WHERE name = ? LIMIT 1");
  $stmt->execute([$username]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);
  if ($user) {
    $userId = (int)$user['ID'];
    $username = (string)$user['name'];
  }
}

if ($userId === null) {
  out_json(200, [
    "success"=>true,
    "is_admin"=>false,
    "is_gm"=>false,
    "roles"=>[],
    "message"=>"User not found or session expired",
    "rid"=>$RID
  ]);
}

// Roles from DB
$stmt = $pdo->prepare("SELECT role FROM user_roles WHERE user_id = ?");
$stmt->execute([$userId]);
$roles = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

$isAdmin = in_array('admin', $roles, true) || in_array('gm', $roles, true);

// Bootstrap admin from config
$cfg = function_exists('getConfig') ? (array)getConfig() : [];
$sec = $cfg['security'] ?? [];

$adminIds = is_array($sec['admin_user_ids'] ?? null) ? $sec['admin_user_ids'] : (is_array($cfg['admin_user_ids'] ?? null) ? $cfg['admin_user_ids'] : []);
$adminNames = is_array($sec['admin_usernames'] ?? null) ? $sec['admin_usernames'] : (is_array($cfg['admin_usernames'] ?? null) ? $cfg['admin_usernames'] : []);

$bootstrapAdmin = in_array($userId, $adminIds, true) || in_array($username, $adminNames, true);

if ($bootstrapAdmin) {
  $isAdmin = true;

  // Auto seed admin role
  if (!in_array('admin', $roles, true)) {
    try {
      $pdo->prepare("INSERT IGNORE INTO user_roles (user_id, role, granted_at, granted_by)
                     VALUES (?, 'admin', NOW(), 'bootstrap')")
          ->execute([$userId]);
      $roles[] = 'admin';
    } catch (Throwable $e) {
      // ignore
    }
  }
}

out_json(200, [
  "success"=>true,
  "is_admin"=>$isAdmin,
  "is_gm"=>$isAdmin,
  "roles"=>array_values(array_unique($roles)),
  "user_id"=>$userId,
  "username"=>$username,
  "rid"=>$RID
]);
