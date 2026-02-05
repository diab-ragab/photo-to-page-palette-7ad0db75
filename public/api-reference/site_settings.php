<?php
/**
 * Site Settings API
 * Allows admins to manage configurable settings (Discord link, Download links, etc.)
 */

require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET', 'POST', 'OPTIONS'));

header('Content-Type: application/json; charset=utf-8');

function jsonOut($arr, $code = 200) {
  http_response_code($code);
  echo json_encode($arr);
  exit;
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

function isAdmin($pdo, $accountId) {
  $stmt = $pdo->prepare("SELECT role FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1");
  $stmt->execute(array($accountId));
  return (bool)$stmt->fetch();
}

function ensureSettingsTable($pdo) {
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at DATETIME NOT NULL,
      updated_by INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  ");
}

// Default settings
$defaultSettings = array(
  'discord_link' => 'https://discord.gg/vubqbv3U3y',
  'discord_members' => '15,403',
  'download_mega' => 'https://mega.nz/file/x3BCVb6B#2_nAOHbfXNzzAyEEpMg-Yn1wiPJRprs27jOm31_a9gA',
  'download_gdrive' => 'https://drive.google.com/file/d/1wYtPOZ5pWw4yVO4_R_wVlKxMvvkgJfJ3/view?usp=sharing',
  'download_filefm' => 'https://files.fm/u/czrengvywk',
);

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

try {
  $pdo = getDB();
  ensureSettingsTable($pdo);

  // GET - fetch all settings (public, no auth required)
  if ($method === 'GET') {
    $stmt = $pdo->query("SELECT setting_key, setting_value FROM site_settings");
    $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    // Merge with defaults (DB values override defaults)
    $settings = array_merge($defaultSettings, $rows);
    
    jsonOut(array(
      'success' => true,
      'settings' => $settings
    ));
  }

  // POST - update settings (admin only)
  if ($method === 'POST') {
    $user = validateSession($pdo);
    if (!$user) {
      jsonOut(array('success' => false, 'error' => 'Not authenticated'), 401);
    }

    if (!isAdmin($pdo, $user['account_id'])) {
      jsonOut(array('success' => false, 'error' => 'Admin access required'), 403);
    }

    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    
    if (!is_array($input) || empty($input['settings'])) {
      jsonOut(array('success' => false, 'error' => 'Invalid request'), 400);
    }

    $settings = $input['settings'];
    $allowedKeys = array_keys($defaultSettings);
    $updated = array();

    foreach ($settings as $key => $value) {
      // Only allow known setting keys
      if (!in_array($key, $allowedKeys, true)) continue;
      
      $value = trim($value);
      if (strlen($value) > 2000) {
        jsonOut(array('success' => false, 'error' => "Value for $key is too long"), 400);
      }

      // Upsert pattern for MySQL 5.x compatibility
      $stmt = $pdo->prepare("SELECT 1 FROM site_settings WHERE setting_key = ? LIMIT 1");
      $stmt->execute(array($key));
      
      if ($stmt->fetch()) {
        $stmt = $pdo->prepare("UPDATE site_settings SET setting_value = ?, updated_at = NOW(), updated_by = ? WHERE setting_key = ?");
        $stmt->execute(array($value, $user['account_id'], $key));
      } else {
        $stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value, updated_at, updated_by) VALUES (?, ?, NOW(), ?)");
        $stmt->execute(array($key, $value, $user['account_id']));
      }
      
      $updated[] = $key;
    }

    jsonOut(array(
      'success' => true,
      'message' => 'Settings updated successfully',
      'updated' => $updated
    ));
  }

  jsonOut(array('success' => false, 'error' => 'Method not allowed'), 405);

} catch (Exception $e) {
  error_log('[SiteSettings] Error: ' . $e->getMessage());
  jsonOut(array('success' => false, 'error' => 'Internal server error'), 500);
}
