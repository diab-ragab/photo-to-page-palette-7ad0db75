<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
ob_start();

$RID = bin2hex(function_exists('random_bytes') ? random_bytes(6) : openssl_random_pseudo_bytes(6));

function json_out($code, $payload) {
  while (ob_get_level()) { @ob_end_clean(); }
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

function json_fail($code, $msg) {
  global $RID;
  json_out($code, array('success'=>false, 'error'=>$msg, 'rid'=>$RID));
}

set_exception_handler(function($e){
  error_log("GAMEPASS_ADMIN EX: ".$e->getMessage());
  json_fail(500, "Server error");
});
set_error_handler(function($severity, $message, $file, $line){
  throw new ErrorException($message, 0, $severity, $file, $line);
});

$pdo = getDB();
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

function getSessionToken() {
  $auth = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
  if (stripos($auth, 'Bearer ') === 0) return trim(substr($auth, 7));

  $hdr = isset($_SERVER['HTTP_X_SESSION_TOKEN']) ? $_SERVER['HTTP_X_SESSION_TOKEN'] : '';
  if ($hdr) return trim($hdr);

  if (!empty($_GET['sessionToken'])) return trim((string)$_GET['sessionToken']);
  if (!empty($_COOKIE['sessionToken'])) return trim((string)$_COOKIE['sessionToken']);

  return '';
}

/**
 * Resolve session in a flexible way:
 * - Try raw token against session_token
 * - Try sha256(token) against session_token
 * - Try sha256(token) against token_hash / session_token_hash (if column exists)
 */
function resolveSession($token) {
  global $pdo;

  if ($token === '') return null;

  $try = array(
    array('sql' => "
      SELECT us.user_id, u.name, us.expires_at, us.session_token
      FROM user_sessions us
      JOIN users u ON u.ID = us.user_id
      WHERE us.session_token = ? LIMIT 1
    ", 'param' => $token),

    array('sql' => "
      SELECT us.user_id, u.name, us.expires_at, us.session_token
      FROM user_sessions us
      JOIN users u ON u.ID = us.user_id
      WHERE us.session_token = ? LIMIT 1
    ", 'param' => hash('sha256', $token)),
  );

  // Try optional columns safely (catch if column doesn't exist)
  $hash = hash('sha256', $token);
  $optional = array('token_hash', 'session_token_hash');
  foreach ($optional as $col) {
    $try[] = array('sql' => "
      SELECT us.user_id, u.name, us.expires_at, us.session_token
      FROM user_sessions us
      JOIN users u ON u.ID = us.user_id
      WHERE us.$col = ? LIMIT 1
    ", 'param' => $hash);
  }

  foreach ($try as $q) {
    try {
      $stmt = $pdo->prepare($q['sql']);
      $stmt->execute(array($q['param']));
      $row = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($row) return $row;
    } catch (Exception $e) {
      // ignore (e.g. unknown column) and continue
    }
  }

  return null;
}

function isSessionValid($expiresAt) {
  if (!$expiresAt) return false;
  return (strtotime($expiresAt) > time());
}

function touchSession($token) {
  global $pdo;

  // update last_activity if column exists
  try {
    $pdo->prepare("UPDATE user_sessions SET last_activity = NOW() WHERE session_token = ?")
        ->execute(array($token));
  } catch (Exception $e) {}

  // also try with sha(token) just in case the stored value is hash
  try {
    $pdo->prepare("UPDATE user_sessions SET last_activity = NOW() WHERE session_token = ?")
        ->execute(array(hash('sha256', $token)));
  } catch (Exception $e) {}
}

/**
 * Extend session for admin usage (optional but recommended).
 * If you don't want auto-extend, comment this function call in requireAdminForWrite()
 */
function extendSession($token, $minutes) {
  global $pdo;
  $newExpires = date('Y-m-d H:i:s', time() + ($minutes * 60));

  // try update by raw token
  try {
    $pdo->prepare("UPDATE user_sessions SET expires_at = ?, last_activity = NOW() WHERE session_token = ?")
        ->execute(array($newExpires, $token));
  } catch (Exception $e) {}

  // try update by sha(token)
  try {
    $pdo->prepare("UPDATE user_sessions SET expires_at = ?, last_activity = NOW() WHERE session_token = ?")
        ->execute(array($newExpires, hash('sha256', $token)));
  } catch (Exception $e) {}

  // try optional hash columns
  $hash = hash('sha256', $token);
  foreach (array('token_hash','session_token_hash') as $col) {
    try {
      $pdo->prepare("UPDATE user_sessions SET expires_at = ?, last_activity = NOW() WHERE $col = ?")
          ->execute(array($newExpires, $hash));
    } catch (Exception $e) {}
  }

  return $newExpires;
}

function requireAdminForWrite() {
  global $pdo;

  $sessionToken = getSessionToken();
  if ($sessionToken === '') json_fail(401, 'Not authenticated');

  $session = resolveSession($sessionToken);
  if (!$session) json_fail(401, 'Session expired or invalid');

  if (!isSessionValid($session['expires_at'])) {
    // cleanup best-effort
    try { $pdo->prepare("DELETE FROM user_sessions WHERE session_token = ?")->execute(array($sessionToken)); } catch (Exception $e) {}
    json_fail(401, 'Session expired or invalid');
  }

  // Touch + extend session
  touchSession($sessionToken);
  extendSession($sessionToken, 120); // extend to 2 hours for admin panel

  $userId = (int)$session['user_id'];
  $username = (string)$session['name'];

  // Check roles
  $roles = array();
  try {
    $stmt = $pdo->prepare("SELECT role FROM user_roles WHERE user_id = ?");
    $stmt->execute(array($userId));
    $roles = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (!$roles) $roles = array();
  } catch (Exception $e) {
    $roles = array();
  }

  $isAdmin = in_array('admin', $roles, true) || in_array('gm', $roles, true);

  // fallback config whitelist
  if (!$isAdmin) {
    $cfg = function_exists('getConfig') ? (array)getConfig() : array();
    $sec = isset($cfg['security']) ? $cfg['security'] : array();
    $adminIds = isset($sec['admin_user_ids']) && is_array($sec['admin_user_ids'])
      ? $sec['admin_user_ids']
      : (isset($cfg['admin_user_ids']) && is_array($cfg['admin_user_ids']) ? $cfg['admin_user_ids'] : array());
    $adminNames = isset($sec['admin_usernames']) && is_array($sec['admin_usernames'])
      ? $sec['admin_usernames']
      : (isset($cfg['admin_usernames']) && is_array($cfg['admin_usernames']) ? $cfg['admin_usernames'] : array());

    $isAdmin = in_array($userId, $adminIds, true) || in_array($username, $adminNames, true);
  }

  if (!$isAdmin) json_fail(403, 'Admin access required');

  return $userId;
}

// Ensure tables exist (utf8mb4 for admin table is OK if DB supports; if not, switch to utf8)
try {
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS gamepass_rewards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      day INT NOT NULL,
      tier VARCHAR(10) NOT NULL DEFAULT 'free',
      item_id INT NOT NULL DEFAULT 0,
      item_name VARCHAR(100) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      coins INT NOT NULL DEFAULT 0,
      zen BIGINT NOT NULL DEFAULT 0,
      exp INT NOT NULL DEFAULT 0,
      rarity VARCHAR(20) NOT NULL DEFAULT 'common',
      icon VARCHAR(10) NOT NULL DEFAULT 'GIFT',
      created_at DATETIME,
      updated_at DATETIME,
      UNIQUE KEY unique_day_tier (day, tier)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  ");

  $pdo->exec("
    CREATE TABLE IF NOT EXISTS gamepass_settings (
      setting_key VARCHAR(50) PRIMARY KEY,
      setting_value VARCHAR(255) NOT NULL,
      updated_at DATETIME
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  ");

  $stmt = $pdo->query("SELECT setting_value FROM gamepass_settings WHERE setting_key = 'zen_skip_cost'");
  if (!$stmt->fetch()) {
    $pdo->exec("INSERT INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('zen_skip_cost', '100000', NOW())");
  }
} catch (Exception $e) {
  error_log("GAMEPASS_ADMIN_TABLES: ".$e->getMessage());
}

function getGamepassSetting($key, $default = null) {
  global $pdo;
  try {
    $stmt = $pdo->prepare("SELECT setting_value FROM gamepass_settings WHERE setting_key = ?");
    $stmt->execute(array($key));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? $row['setting_value'] : $default;
  } catch (Exception $e) {
    return $default;
  }
}

switch ($action) {
  case 'get_rewards':
    try {
      $stmt = $pdo->query("SELECT * FROM gamepass_rewards ORDER BY day ASC, tier ASC");
      $rewards = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : array();
    } catch (Exception $e) {
      $rewards = array();
    }

    foreach ($rewards as &$r) {
      $r['id'] = (int)$r['id'];
      $r['day'] = (int)$r['day'];
      $r['item_id'] = (int)$r['item_id'];
      $r['quantity'] = (int)$r['quantity'];
      $r['coins'] = (int)$r['coins'];
      $r['zen'] = (int)$r['zen'];
      $r['exp'] = (int)$r['exp'];
      if (!isset($r['icon']) || $r['icon'] === '') $r['icon'] = 'GIFT';
      if (!isset($r['rarity']) || $r['rarity'] === '') $r['rarity'] = 'common';
    }

    $zenSkipCost = (int)getGamepassSetting('zen_skip_cost', '100000');
    json_out(200, array('success'=>true, 'rewards'=>$rewards, 'zen_skip_cost'=>$zenSkipCost));
    break;

  case 'get_settings':
    requireAdminForWrite();
    $zenSkipCost = (int)getGamepassSetting('zen_skip_cost', '100000');
    json_out(200, array('success'=>true, 'settings'=>array('zen_skip_cost'=>$zenSkipCost)));
    break;

  case 'update_settings':
    requireAdminForWrite();
    $input = json_decode(file_get_contents('php://input'), true);
    $zenSkipCost = isset($input['zen_skip_cost']) ? (int)$input['zen_skip_cost'] : null;

    if ($zenSkipCost !== null) {
      if ($zenSkipCost < 0) json_fail(400, 'Zen cost cannot be negative');

      $stmt = $pdo->prepare("
        INSERT INTO gamepass_settings (setting_key, setting_value, updated_at)
        VALUES ('zen_skip_cost', ?, NOW())
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
      ");
      $stmt->execute(array((string)$zenSkipCost));
    }

    json_out(200, array('success'=>true));
    break;

  case 'add_reward':
    requireAdminForWrite();
    $input = json_decode(file_get_contents('php://input'), true);

    $day = isset($input['day']) ? (int)$input['day'] : 1;
    $tierInput = isset($input['tier']) ? $input['tier'] : '';
    $tier = in_array($tierInput, array('free','elite')) ? $tierInput : 'free';

    $item_id = isset($input['item_id']) ? (int)$input['item_id'] : 0;
    $item_name = isset($input['item_name']) ? trim($input['item_name']) : '';
    $quantity = max(1, isset($input['quantity']) ? (int)$input['quantity'] : 1);
    $coins = isset($input['coins']) ? (int)$input['coins'] : 0;
    $zen = isset($input['zen']) ? (int)$input['zen'] : 0;
    $exp = isset($input['exp']) ? (int)$input['exp'] : 0;

    $rarityInput = isset($input['rarity']) ? $input['rarity'] : 'common';
    $rarity = in_array($rarityInput, array('common','uncommon','rare','epic','legendary')) ? $rarityInput : 'common';

    $iconInput = isset($input['icon']) ? trim($input['icon']) : 'GIFT';
    $icon = $iconInput ? $iconInput : 'GIFT';

    if ($item_name === '') json_fail(400, 'Item name is required');
    if ($day < 1 || $day > 30) json_fail(400, 'Day must be between 1 and 30');

    $stmt = $pdo->prepare("SELECT id FROM gamepass_rewards WHERE day = ? AND tier = ?");
    $stmt->execute(array($day, $tier));
    if ($stmt->fetch()) json_fail(400, "Reward for day $day ($tier) already exists. Edit or delete it first.");

    $stmt = $pdo->prepare("
      INSERT INTO gamepass_rewards (day, tier, item_id, item_name, quantity, coins, zen, exp, rarity, icon, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");
    $stmt->execute(array($day, $tier, $item_id, $item_name, $quantity, $coins, $zen, $exp, $rarity, $icon));

    json_out(200, array('success'=>true, 'id'=>(int)$pdo->lastInsertId()));
    break;

  case 'update_reward':
    requireAdminForWrite();
    $input = json_decode(file_get_contents('php://input'), true);
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    if (!$id) json_fail(400, 'ID is required');

    $day = isset($input['day']) ? (int)$input['day'] : 1;
    $tierInput = isset($input['tier']) ? $input['tier'] : '';
    $tier = in_array($tierInput, array('free','elite')) ? $tierInput : 'free';

    $item_id = isset($input['item_id']) ? (int)$input['item_id'] : 0;
    $item_name = isset($input['item_name']) ? trim($input['item_name']) : '';
    $quantity = max(1, isset($input['quantity']) ? (int)$input['quantity'] : 1);
    $coins = isset($input['coins']) ? (int)$input['coins'] : 0;
    $zen = isset($input['zen']) ? (int)$input['zen'] : 0;
    $exp = isset($input['exp']) ? (int)$input['exp'] : 0;

    $rarityInput = isset($input['rarity']) ? $input['rarity'] : 'common';
    $rarity = in_array($rarityInput, array('common','uncommon','rare','epic','legendary')) ? $rarityInput : 'common';

    $iconInput = isset($input['icon']) ? trim($input['icon']) : 'GIFT';
    $icon = $iconInput ? $iconInput : 'GIFT';

    if ($item_name === '') json_fail(400, 'Item name is required');

    $stmt = $pdo->prepare("SELECT id FROM gamepass_rewards WHERE day = ? AND tier = ? AND id != ?");
    $stmt->execute(array($day, $tier, $id));
    if ($stmt->fetch()) json_fail(400, "Another reward for day $day ($tier) already exists.");

    $stmt = $pdo->prepare("
      UPDATE gamepass_rewards
      SET day=?, tier=?, item_id=?, item_name=?, quantity=?, coins=?, zen=?, exp=?, rarity=?, icon=?, updated_at=NOW()
      WHERE id=?
    ");
    $stmt->execute(array($day, $tier, $item_id, $item_name, $quantity, $coins, $zen, $exp, $rarity, $icon, $id));

    json_out(200, array('success'=>true));
    break;

  case 'delete_reward':
    requireAdminForWrite();
    $input = json_decode(file_get_contents('php://input'), true);
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    if (!$id) json_fail(400, 'ID is required');

    $stmt = $pdo->prepare("DELETE FROM gamepass_rewards WHERE id = ?");
    $stmt->execute(array($id));

    json_out(200, array('success'=>true));
    break;

  default:
    json_fail(400, 'Invalid action');
}
