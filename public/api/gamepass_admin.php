<?php
/**
 * gamepass_admin.php - Game Pass Admin API
 * PHP 5.x compatible - 2 Tiers (Free + Premium)
 */

require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET', 'POST', 'OPTIONS'));
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/gamepass_helpers.php';

header('Content-Type: application/json; charset=utf-8');

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

$RID = substr(md5(uniqid(mt_rand(), true)), 0, 12);
ob_start();

function json_out($code, $payload) {
  while (ob_get_level()) { @ob_end_clean(); }
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($payload);
  exit;
}

function json_fail($code, $msg) {
  global $RID;
  json_out($code, array('success' => false, 'error' => $msg, 'rid' => $RID));
}

function _gpa_exception_handler($e) {
  error_log("GAMEPASS_ADMIN EX: " . $e->getMessage());
  json_fail(500, "Server error");
}
set_exception_handler('_gpa_exception_handler');

function _gpa_error_handler($severity, $message, $file, $line) {
  error_log("GAMEPASS_ADMIN ERR: $message in $file:$line");
  throw new ErrorException($message, 0, $severity, $file, $line);
}
set_error_handler('_gpa_error_handler');

$pdo = getDB();
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

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

// Ensure tables exist
try {
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
  error_log("GAMEPASS_ADMIN_TABLES: " . $e->getMessage());
}

switch ($action) {
  case 'get_rewards':
    try {
      $stmt = $pdo->query("SELECT id, day, tier, item_id, item_name, quantity, coins, zen, exp, rarity, icon FROM gamepass_rewards ORDER BY day ASC, tier ASC");
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
      $r['icon'] = isset($r['icon']) && $r['icon'] !== '' ? $r['icon'] : 'GIFT';
      $r['rarity'] = isset($r['rarity']) && $r['rarity'] !== '' ? $r['rarity'] : 'common';
    }
    unset($r);

    $zenSkipCost = (int)getGamepassSetting('zen_skip_cost', '100000');
    json_out(200, array('success' => true, 'rewards' => $rewards, 'zen_skip_cost' => $zenSkipCost));
    break;

  case 'get_settings':
    requireAdmin();
    
    $zenSkipCost = (int)getGamepassSetting('zen_skip_cost', '100000');
    $premiumPrice = (int)getGamepassSetting('premium_price_cents', '999');
    $enabled = getGamepassSetting('gamepass_enabled', '1');
    $premiumEnabled = getGamepassSetting('premium_enabled', '1');
    json_out(200, array('success' => true, 'settings' => array(
      'zen_skip_cost' => $zenSkipCost,
      'premium_price_cents' => $premiumPrice,
      'gamepass_enabled' => ($enabled === '1' || $enabled === 1) ? true : false,
      'premium_enabled' => ($premiumEnabled === '1' || $premiumEnabled === 1) ? true : false,
    )));
    break;

  case 'update_settings':
    requireAdmin();
    
    $input = getJsonInput();
    $zenSkipCost = isset($input['zen_skip_cost']) ? (int)$input['zen_skip_cost'] : null;
    $premiumPrice = isset($input['premium_price_cents']) ? (int)$input['premium_price_cents'] : null;

    $upsertStmt = $pdo->prepare("
      INSERT INTO gamepass_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
    ");

    if ($zenSkipCost !== null) {
      if ($zenSkipCost < 0) json_fail(400, 'Zen cost cannot be negative');
      $upsertStmt->execute(array('zen_skip_cost', (string)$zenSkipCost));
    }
    if ($premiumPrice !== null) {
      if ($premiumPrice < 100) json_fail(400, 'Premium price must be at least 100 cents');
      $upsertStmt->execute(array('premium_price_cents', (string)$premiumPrice));
      // Sync to site_settings
      $ssUpsert = $pdo->prepare("SELECT 1 FROM site_settings WHERE setting_key = 'gamepass_premium_price' LIMIT 1");
      $ssUpsert->execute();
      if ($ssUpsert->fetch()) {
        $pdo->prepare("UPDATE site_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = 'gamepass_premium_price'")->execute(array((string)$premiumPrice));
      } else {
        $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES ('gamepass_premium_price', ?, NOW())")->execute(array((string)$premiumPrice));
      }
    }

    $gamepassEnabled = isset($input['gamepass_enabled']) ? $input['gamepass_enabled'] : null;
    if ($gamepassEnabled !== null) {
      $upsertStmt->execute(array('gamepass_enabled', $gamepassEnabled ? '1' : '0'));
    }

    $premiumEnabled = isset($input['premium_enabled']) ? $input['premium_enabled'] : null;
    if ($premiumEnabled !== null) {
      $upsertStmt->execute(array('premium_enabled', $premiumEnabled ? '1' : '0'));
    }

    json_out(200, array('success' => true));
    break;

  case 'add_reward':
    requireAdmin();
    
    $input = getJsonInput();

    $day = isset($input['day']) ? (int)$input['day'] : 1;
    $tierInput = isset($input['tier']) ? $input['tier'] : '';
    $tier = in_array($tierInput, array('free', 'premium')) ? $tierInput : 'free';

    $item_id = isset($input['item_id']) ? (int)$input['item_id'] : 0;
    $item_name = isset($input['item_name']) ? trim($input['item_name']) : '';
    $quantity = max(1, isset($input['quantity']) ? (int)$input['quantity'] : 1);
    $coins = isset($input['coins']) ? (int)$input['coins'] : 0;
    $zen = isset($input['zen']) ? (int)$input['zen'] : 0;
    $exp = isset($input['exp']) ? (int)$input['exp'] : 0;

    $rarityInput = isset($input['rarity']) ? $input['rarity'] : 'common';
    $rarity = in_array($rarityInput, array('common', 'uncommon', 'rare', 'epic', 'legendary')) ? $rarityInput : 'common';

    $iconInput = isset($input['icon']) ? trim($input['icon']) : 'GIFT';
    $icon = $iconInput !== '' ? $iconInput : 'GIFT';

    if ($item_name === '') json_fail(400, 'Item name is required');
    if ($day < 1 || $day > 30) json_fail(400, 'Day must be between 1 and 30');

    $stmt = $pdo->prepare("SELECT id FROM gamepass_rewards WHERE day = ? AND tier = ?");
    $stmt->execute(array($day, $tier));
    if ($stmt->fetch()) {
      json_fail(400, "Reward for day $day ($tier) already exists. Edit or delete it first.");
    }

    $stmt = $pdo->prepare("
      INSERT INTO gamepass_rewards (day, tier, item_id, item_name, quantity, coins, zen, exp, rarity, icon, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute(array($day, $tier, $item_id, $item_name, $quantity, $coins, $zen, $exp, $rarity, $icon));

    json_out(200, array('success' => true, 'id' => (int)$pdo->lastInsertId()));
    break;

  case 'update_reward':
    requireAdmin();
    
    $input = getJsonInput();
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    if (!$id) json_fail(400, 'ID is required');

    $day = isset($input['day']) ? (int)$input['day'] : 1;
    $tierInput = isset($input['tier']) ? $input['tier'] : '';
    $tier = in_array($tierInput, array('free', 'premium')) ? $tierInput : 'free';

    $item_id = isset($input['item_id']) ? (int)$input['item_id'] : 0;
    $item_name = isset($input['item_name']) ? trim($input['item_name']) : '';
    $quantity = max(1, isset($input['quantity']) ? (int)$input['quantity'] : 1);
    $coins = isset($input['coins']) ? (int)$input['coins'] : 0;
    $zen = isset($input['zen']) ? (int)$input['zen'] : 0;
    $exp = isset($input['exp']) ? (int)$input['exp'] : 0;

    $rarityInput = isset($input['rarity']) ? $input['rarity'] : 'common';
    $rarity = in_array($rarityInput, array('common', 'uncommon', 'rare', 'epic', 'legendary')) ? $rarityInput : 'common';

    $iconInput = isset($input['icon']) ? trim($input['icon']) : 'GIFT';
    $icon = $iconInput !== '' ? $iconInput : 'GIFT';

    if ($item_name === '') json_fail(400, 'Item name is required');

    $stmt = $pdo->prepare("SELECT id FROM gamepass_rewards WHERE day = ? AND tier = ? AND id != ?");
    $stmt->execute(array($day, $tier, $id));
    if ($stmt->fetch()) {
      json_fail(400, "Another reward for day $day ($tier) already exists.");
    }

    $stmt = $pdo->prepare("
      UPDATE gamepass_rewards
      SET day=?, tier=?, item_id=?, item_name=?, quantity=?, coins=?, zen=?, exp=?, rarity=?, icon=?
      WHERE id=?
    ");
    $stmt->execute(array($day, $tier, $item_id, $item_name, $quantity, $coins, $zen, $exp, $rarity, $icon, $id));

    json_out(200, array('success' => true));
    break;

  case 'delete_reward':
    requireAdmin();
    
    $input = getJsonInput();
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    if (!$id) json_fail(400, 'ID is required');

    $stmt = $pdo->prepare("DELETE FROM gamepass_rewards WHERE id = ?");
    $stmt->execute(array($id));

    json_out(200, array('success' => true));
    break;

  case 'seed_rewards':
    requireAdmin();

    $input = getJsonInput();
    $tierInput = isset($input['tier']) ? $input['tier'] : '';
    if (!in_array($tierInput, array('free', 'premium'))) {
      json_fail(400, 'Tier must be free or premium');
    }

    // Delete existing rewards for selected tier
    $stmt = $pdo->prepare("DELETE FROM gamepass_rewards WHERE tier = ?");
    $stmt->execute(array($tierInput));

    // FREE TIER - 30 days of modest rewards
    $freeRewards = array(
      // day, name, item_id, qty, coins, zen, exp, rarity, icon
      array(1,  'Welcome Coins',      -2, 1, 100000,   0,      0,      'common',    'COIN'),
      array(2,  'Small Zen',          -1, 1, 0,        5000,   0,      'common',    'BOLT'),
      array(3,  'EXP Drop',           -3, 1, 0,        0,      5000,   'common',    'FIRE'),
      array(4,  'Coin Pouch',         -2, 1, 200000,   0,      0,      'common',    'COIN'),
      array(5,  'Zen Drop',           -1, 1, 0,        10000,  0,      'common',    'BOLT'),
      array(6,  'EXP Boost',          -3, 1, 0,        0,      10000,  'common',    'FIRE'),
      array(7,  'Weekly Free',        -2, 1, 500000,   10000,  10000,  'uncommon',  'TROPHY'),
      array(8,  'Coin Bag',           -2, 1, 300000,   0,      0,      'common',    'COIN'),
      array(9,  'Zen Trickle',        -1, 1, 0,        15000,  0,      'common',    'BOLT'),
      array(10, 'EXP Wave',           -3, 1, 0,        0,      15000,  'uncommon',  'FIRE'),
      array(11, 'Lucky Spin',         -4, 1, 0,        0,      0,      'uncommon',  'DICE'),
      array(12, 'Coin Stack',         -2, 1, 500000,   0,      0,      'uncommon',  'COIN'),
      array(13, 'Zen Flow',           -1, 1, 0,        20000,  0,      'common',    'BOLT'),
      array(14, 'Bi-Weekly Free',     -2, 1, 800000,   15000,  15000,  'uncommon',  'TROPHY'),
      array(15, 'Zen Gift',           -1, 1, 0,        25000,  0,      'uncommon',  'GEM'),
      array(16, 'Coin Bundle',        -2, 1, 600000,   0,      0,      'uncommon',  'COIN'),
      array(17, 'Zen Pulse',          -1, 1, 0,        30000,  0,      'uncommon',  'GEM'),
      array(18, 'Lucky Spins x2',     -4, 2, 0,        0,      0,      'rare',      'DICE'),
      array(19, 'Coin Chest',         -2, 1, 1000000,  0,      0,      'rare',      'GOLD'),
      array(20, 'Zen Spark',          -1, 1, 0,        40000,  0,      'rare',      'SPARKLE'),
      array(21, 'Triple Mini',        -2, 1, 1200000,  20000,  20000,  'rare',      'STAR'),
      array(22, 'EXP Boost+',         -3, 1, 0,        0,      50000,  'rare',      'FIRE'),
      array(23, 'Coin Haul',          -2, 1, 1500000,  0,      0,      'rare',      'TROPHY'),
      array(24, 'Zen Chest',          -1, 1, 0,        50000,  0,      'rare',      'ORB'),
      array(25, 'Lucky Spins x3',     -4, 3, 0,        0,      0,      'epic',      'DICE'),
      array(26, 'Coin Vault',         -2, 1, 2000000,  0,      0,      'epic',      'GOLD'),
      array(27, 'Zen Reserve',        -1, 1, 0,        60000,  0,      'epic',      'GEM'),
      array(28, 'Grand Free',         -2, 1, 2500000,  50000,  50000,  'epic',      'CROWN'),
      array(29, 'Lucky Spins x4',     -4, 4, 0,        0,      0,      'epic',      'DICE'),
      array(30, 'Season Free Reward', -2, 1, 3000000,  100000, 100000, 'epic',      'CROWN'),
    );

    // PREMIUM TIER - 30 days, Zen only (30M total, progressive)
    $premiumRewards = array(
      array(1,  '500K Zen',  -1, 1, 0, 500000,   0, 'common',    'BOLT'),
      array(2,  '500K Zen',  -1, 1, 0, 500000,   0, 'common',    'BOLT'),
      array(3,  '500K Zen',  -1, 1, 0, 500000,   0, 'common',    'BOLT'),
      array(4,  '500K Zen',  -1, 1, 0, 500000,   0, 'common',    'BOLT'),
      array(5,  '500K Zen',  -1, 1, 0, 500000,   0, 'common',    'BOLT'),
      array(6,  '700K Zen',  -1, 1, 0, 700000,   0, 'uncommon',  'GEM'),
      array(7,  '700K Zen',  -1, 1, 0, 700000,   0, 'uncommon',  'GEM'),
      array(8,  '700K Zen',  -1, 1, 0, 700000,   0, 'uncommon',  'GEM'),
      array(9,  '700K Zen',  -1, 1, 0, 700000,   0, 'uncommon',  'GEM'),
      array(10, '700K Zen',  -1, 1, 0, 700000,   0, 'uncommon',  'GEM'),
      array(11, '900K Zen',  -1, 1, 0, 900000,   0, 'rare',      'SPARKLE'),
      array(12, '900K Zen',  -1, 1, 0, 900000,   0, 'rare',      'SPARKLE'),
      array(13, '900K Zen',  -1, 1, 0, 900000,   0, 'rare',      'SPARKLE'),
      array(14, '900K Zen',  -1, 1, 0, 900000,   0, 'rare',      'SPARKLE'),
      array(15, '900K Zen',  -1, 1, 0, 900000,   0, 'rare',      'SPARKLE'),
      array(16, '1.1M Zen',  -1, 1, 0, 1100000,  0, 'epic',      'ORB'),
      array(17, '1.1M Zen',  -1, 1, 0, 1100000,  0, 'epic',      'ORB'),
      array(18, '1.1M Zen',  -1, 1, 0, 1100000,  0, 'epic',      'ORB'),
      array(19, '1.1M Zen',  -1, 1, 0, 1100000,  0, 'epic',      'ORB'),
      array(20, '1.1M Zen',  -1, 1, 0, 1100000,  0, 'epic',      'ORB'),
      array(21, '1.3M Zen',  -1, 1, 0, 1300000,  0, 'legendary', 'CROWN'),
      array(22, '1.3M Zen',  -1, 1, 0, 1300000,  0, 'legendary', 'CROWN'),
      array(23, '1.3M Zen',  -1, 1, 0, 1300000,  0, 'legendary', 'CROWN'),
      array(24, '1.3M Zen',  -1, 1, 0, 1300000,  0, 'legendary', 'CROWN'),
      array(25, '1.3M Zen',  -1, 1, 0, 1300000,  0, 'legendary', 'CROWN'),
      array(26, '1.5M Zen',  -1, 1, 0, 1500000,  0, 'legendary', 'CROWN'),
      array(27, '1.5M Zen',  -1, 1, 0, 1500000,  0, 'legendary', 'CROWN'),
      array(28, '1.5M Zen',  -1, 1, 0, 1500000,  0, 'legendary', 'CROWN'),
      array(29, '1.5M Zen',  -1, 1, 0, 1500000,  0, 'legendary', 'CROWN'),
      array(30, '1.5M Zen',  -1, 1, 0, 1500000,  0, 'legendary', 'CROWN'),
    );

    $seedRewards = ($tierInput === 'free') ? $freeRewards : $premiumRewards;

    $stmt = $pdo->prepare("
      INSERT INTO gamepass_rewards (day, tier, item_id, item_name, quantity, coins, zen, exp, rarity, icon, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");

    $inserted = 0;
    foreach ($seedRewards as $r) {
      $stmt->execute(array($r[0], $tierInput, $r[2], $r[1], $r[3], $r[4], $r[5], $r[6], $r[7], $r[8]));
      $inserted++;
    }

    json_out(200, array('success' => true, 'inserted' => $inserted, 'tier' => $tierInput));
    break;

  case 'search_users':
    requireAdmin();

    $q = isset($_GET['q']) ? trim($_GET['q']) : '';
    if (strlen($q) < 2) json_fail(400, 'Search query too short');

    // Detect username column
    $uCol = 'name';
    try {
      $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
      if (in_array('login', $cols) && !in_array('name', $cols)) $uCol = 'login';
    } catch (Exception $e) {}

    $stmt = $pdo->prepare("
      SELECT ID as id, `{$uCol}` AS username
      FROM users
      WHERE `{$uCol}` LIKE ?
      ORDER BY `{$uCol}` ASC
      LIMIT 20
    ");
    $stmt->execute(array('%' . $q . '%'));
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $results = array();
    foreach ($users as $u) {
      $gpStmt = $pdo->prepare("
        SELECT ug.is_premium, ug.expires_at, ug.tier
        FROM user_gamepass ug
        WHERE ug.user_id = ?
        LIMIT 1
      ");
      $gpStmt->execute(array((int)$u['id']));
      $gp = $gpStmt->fetch(PDO::FETCH_ASSOC);

      $tier = 'free';
      $expiresAt = null;
      if ($gp) {
        $expiresAt = isset($gp['expires_at']) ? $gp['expires_at'] : null;
        $isActive = ($expiresAt !== null) ? (strtotime($expiresAt) > time()) : false;
        if (isset($gp['tier']) && $gp['tier'] === 'premium' && $isActive) {
          $tier = 'premium';
        }
      }

      $results[] = array(
        'username' => $u['username'],
        'current_tier' => $tier,
        'expires_at' => $expiresAt
      );
    }

    json_out(200, array('success' => true, 'users' => $results));
    break;

  case 'assign_pass':
    requireAdmin();

    $input = getJsonInput();
    $username = isset($input['username']) ? trim($input['username']) : '';

    if ($username === '') json_fail(400, 'Username is required');

    // Detect username column
    $uCol = 'name';
    try {
      $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
      if (in_array('login', $cols) && !in_array('name', $cols)) $uCol = 'login';
    } catch (Exception $e) {}

    $stmt = $pdo->prepare("SELECT ID as id FROM users WHERE `{$uCol}` = ?");
    $stmt->execute(array($username));
    $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$userRow) json_fail(404, 'User not found: ' . $username);
    $targetUserId = (int)$userRow['id'];

    try {
      $pdo->exec("ALTER TABLE user_gamepass ADD COLUMN tier VARCHAR(10) DEFAULT 'free'");
    } catch (Exception $e) {}

    // Use global season dates: activated_at = season_start, expires_at = season_end
    $season = getGlobalSeasonInfo($pdo);
    $activatedAt = $season['season_start'];
    $expiresAt = $season['season_end'];
    $daysTotal = 30;

    $stmt = $pdo->prepare("SELECT id FROM user_gamepass WHERE user_id = ?");
    $stmt->execute(array($targetUserId));
    if ($stmt->fetch()) {
      $stmt = $pdo->prepare("UPDATE user_gamepass SET is_premium = 1, tier = 'premium', activated_at = ?, expires_at = ?, days_total = ?, updated_at = NOW() WHERE user_id = ?");
      $stmt->execute(array($activatedAt, $expiresAt, $daysTotal, $targetUserId));
    } else {
      $stmt = $pdo->prepare("INSERT INTO user_gamepass (user_id, is_premium, tier, activated_at, days_total, expires_at, created_at, updated_at) VALUES (?, 1, 'premium', ?, ?, ?, NOW(), NOW())");
      $stmt->execute(array($targetUserId, $activatedAt, $daysTotal, $expiresAt));
    }

    try {
      $pdo->exec("CREATE TABLE IF NOT EXISTS gamepass_purchases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        tier VARCHAR(10) NOT NULL,
        paypal_order_id VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at DATETIME NOT NULL,
        completed_at DATETIME DEFAULT NULL,
        INDEX idx_user (user_id),
        INDEX idx_paypal (paypal_order_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

      $stmt = $pdo->prepare("INSERT INTO gamepass_purchases (user_id, tier, paypal_order_id, status, created_at, completed_at) VALUES (?, 'premium', ?, 'completed', NOW(), NOW())");
      $stmt->execute(array($targetUserId, 'admin_grant_' . $RID));
    } catch (Exception $e) {
      error_log("GAMEPASS_ADMIN_LOG: " . $e->getMessage());
    }

    error_log("GAMEPASS_ADMIN_ASSIGN: user=$username tier=premium season expires=$expiresAt by admin");

    json_out(200, array(
      'success' => true,
      'message' => 'Premium Game Pass assigned to ' . $username . ' until season ends (' . substr($expiresAt, 0, 10) . ')',
      'expires_at' => $expiresAt
    ));
    break;

  case 'revoke_pass':
    requireAdmin();

    $input = getJsonInput();
    $username = isset($input['username']) ? trim($input['username']) : '';
    if ($username === '') json_fail(400, 'Username is required');

    // Detect username column
    $uCol = 'name';
    try {
      $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
      if (in_array('login', $cols) && !in_array('name', $cols)) $uCol = 'login';
    } catch (Exception $e) {}

    $stmt = $pdo->prepare("SELECT ID as id FROM users WHERE `{$uCol}` = ?");
    $stmt->execute(array($username));
    $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$userRow) json_fail(404, 'User not found: ' . $username);
    $targetUserId = (int)$userRow['id'];

    $stmt = $pdo->prepare("UPDATE user_gamepass SET is_premium = 0, tier = 'free' WHERE user_id = ?");
    $stmt->execute(array($targetUserId));

    json_out(200, array('success' => true, 'message' => 'Game Pass revoked from ' . $username));
    break;

  case 'reset_season':
    // Admin-only: reset season to start from today
    $user = getCurrentUser();
    if (!$user) json_fail(401, 'Not authenticated');
    $userId = (int)$user['user_id'];
    if (!isUserAdmin($userId, isset($user['username']) ? $user['username'] : '')) {
      json_fail(403, 'Admin access required');
    }

    $input = getJsonInput();
    if (empty($input['confirm'])) {
      json_fail(400, 'Confirmation required');
    }

    $newStart = date('Y-m-d 00:00:00');
    // Read current season number
    $seasonNumber = 1;
    try {
      $stmt = $pdo->prepare("SELECT setting_value FROM gamepass_settings WHERE setting_key = 'season_number'");
      $stmt->execute();
      $snRow = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($snRow) $seasonNumber = max(1, (int)$snRow['setting_value']) + 1;
    } catch (Exception $e) {}

    // Update season_start
    try {
      $stmt = $pdo->prepare("SELECT 1 FROM gamepass_settings WHERE setting_key = 'season_start' LIMIT 1");
      $stmt->execute();
      if ($stmt->fetch()) {
        $pdo->prepare("UPDATE gamepass_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = 'season_start'")->execute(array($newStart));
      } else {
        $pdo->prepare("INSERT INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('season_start', ?, NOW())")->execute(array($newStart));
      }
    } catch (Exception $e) {}

    // Update season_number
    try {
      $stmt = $pdo->prepare("SELECT 1 FROM gamepass_settings WHERE setting_key = 'season_number' LIMIT 1");
      $stmt->execute();
      if ($stmt->fetch()) {
        $pdo->prepare("UPDATE gamepass_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = 'season_number'")->execute(array($seasonNumber));
      } else {
        $pdo->prepare("INSERT INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('season_number', ?, NOW())")->execute(array($seasonNumber));
      }
    } catch (Exception $e) {}

    // Also sync to site_settings
    try {
      $dateOnly = date('Y-m-d');
      $stmt = $pdo->prepare("SELECT 1 FROM site_settings WHERE setting_key = 'gamepass_season_start' LIMIT 1");
      $stmt->execute();
      if ($stmt->fetch()) {
        $pdo->prepare("UPDATE site_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = 'gamepass_season_start'")->execute(array($dateOnly));
      } else {
        $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES ('gamepass_season_start', ?, NOW())")->execute(array($dateOnly));
      }
    } catch (Exception $e) {}

    error_log("SEASON_RESET by admin user={$userId} new_season={$seasonNumber} start={$newStart}");

    json_out(200, array('success' => true, 'message' => 'Season reset successfully', 'season_number' => $seasonNumber, 'season_start' => $newStart));
    break;

  default:
    json_fail(400, 'Invalid action');
}
