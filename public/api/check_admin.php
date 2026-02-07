<?php
// api/check_admin.php - Admin status check
// Uses centralized session_helper.php for consistent token resolution

require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET', 'OPTIONS'));
require_once __DIR__ . '/session_helper.php';

header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
if ($method !== 'GET') {
  jsonFail(405, 'Method not allowed', $RID);
}

// Ensure tables exist
try {
  $pdo = getDB();
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
    KEY IX_user_sessions_expires (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

  $pdo->exec("CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role VARCHAR(50) NOT NULL,
    granted_at DATETIME NOT NULL,
    granted_by VARCHAR(50) NULL,
    UNIQUE KEY uq_user_role (user_id, role),
    KEY idx_user_id (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
} catch (Exception $e) {
  error_log("RID={$RID} TABLE_SETUP_ERROR: " . $e->getMessage());
}

// Get session token using centralized helper
$sessionToken = getSessionToken();
$username = isset($_GET['user']) ? trim((string)$_GET['user']) : '';

if ($sessionToken === '' && $username === '') {
  echo json_encode(array(
    'success' => true,
    'is_admin' => false,
    'is_gm' => false,
    'roles' => array(),
    'message' => 'No authentication provided',
    'rid' => $RID
  ));
  exit;
}

$userId = null;

// Use centralized resolveSessionRow for consistent token lookup
if ($sessionToken !== '') {
  $sess = resolveSessionRow($sessionToken);
  if ($sess && !isSessionExpired(isset($sess['expires_at']) ? $sess['expires_at'] : null)) {
    $userId = (int)$sess['user_id'];
    $username = (string)$sess['name'];
  }
}

// Fallback username lookup
if ($userId === null && $username !== '') {
  $pdo = getDB();
  $stmt = $pdo->prepare("SELECT ID, name FROM users WHERE name = ? LIMIT 1");
  $stmt->execute(array($username));
  $user = $stmt->fetch(PDO::FETCH_ASSOC);
  if ($user) {
    $userId = (int)$user['ID'];
    $username = (string)$user['name'];
  }
}

if ($userId === null) {
  echo json_encode(array(
    'success' => true,
    'is_admin' => false,
    'is_gm' => false,
    'roles' => array(),
    'message' => 'User not found or session expired',
    'rid' => $RID
  ));
  exit;
}

// Check admin status using centralized helper
$isAdmin = isUserAdmin($userId, $username);

// Fetch roles for response
$pdo = getDB();
$stmt = $pdo->prepare("SELECT role FROM user_roles WHERE user_id = ?");
$stmt->execute(array($userId));
$roles = $stmt->fetchAll(PDO::FETCH_COLUMN);
if (!is_array($roles)) $roles = array();

// Auto-seed admin role from config if needed
if ($isAdmin && !in_array('admin', $roles, true)) {
  try {
    $pdo->prepare("INSERT IGNORE INTO user_roles (user_id, role, granted_at, granted_by) VALUES (?, 'admin', NOW(), 'bootstrap')")
        ->execute(array($userId));
    $roles[] = 'admin';
  } catch (Exception $e) {
    // ignore
  }
}

echo json_encode(array(
  'success' => true,
  'is_admin' => $isAdmin,
  'is_gm' => $isAdmin,
  'roles' => array_values(array_unique($roles)),
  'user_id' => $userId,
  'username' => $username,
  'rid' => $RID
));
exit;
