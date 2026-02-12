<?php
/**
 * gamepass_admin.php - Game Pass Admin API
 * PHP 5.x compatible
 */

require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET', 'POST', 'OPTIONS'));
require_once __DIR__ . '/session_helper.php';

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
    // Public - no auth required
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
    $elitePrice = (int)getGamepassSetting('elite_price_cents', '999');
    $goldPrice = (int)getGamepassSetting('gold_price_cents', '1999');
    $enabled = getGamepassSetting('gamepass_enabled', '1');
    json_out(200, array('success' => true, 'settings' => array(
      'zen_skip_cost' => $zenSkipCost,
      'elite_price_cents' => $elitePrice,
      'gold_price_cents' => $goldPrice,
      'gamepass_enabled' => ($enabled === '1' || $enabled === 1) ? true : false
    )));
    break;

  case 'update_settings':
    requireAdmin();
    
    $input = getJsonInput();
    $zenSkipCost = isset($input['zen_skip_cost']) ? (int)$input['zen_skip_cost'] : null;
    $elitePrice = isset($input['elite_price_cents']) ? (int)$input['elite_price_cents'] : null;
    $goldPrice = isset($input['gold_price_cents']) ? (int)$input['gold_price_cents'] : null;

    $upsertStmt = $pdo->prepare("
      INSERT INTO gamepass_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
    ");

    if ($zenSkipCost !== null) {
      if ($zenSkipCost < 0) json_fail(400, 'Zen cost cannot be negative');
      $upsertStmt->execute(array('zen_skip_cost', (string)$zenSkipCost));
    }
    if ($elitePrice !== null) {
      if ($elitePrice < 100) json_fail(400, 'Elite price must be at least 100 cents');
      $upsertStmt->execute(array('elite_price_cents', (string)$elitePrice));
    }
    if ($goldPrice !== null) {
      if ($goldPrice < 100) json_fail(400, 'Gold price must be at least 100 cents');
      $upsertStmt->execute(array('gold_price_cents', (string)$goldPrice));
    }

    $gamepassEnabled = isset($input['gamepass_enabled']) ? $input['gamepass_enabled'] : null;
    if ($gamepassEnabled !== null) {
      $upsertStmt->execute(array('gamepass_enabled', $gamepassEnabled ? '1' : '0'));
    }

    json_out(200, array('success' => true));
    break;

  case 'add_reward':
    requireAdmin();
    
    $input = getJsonInput();

    $day = isset($input['day']) ? (int)$input['day'] : 1;
    $tierInput = isset($input['tier']) ? $input['tier'] : '';
    $tier = in_array($tierInput, array('free', 'elite', 'gold')) ? $tierInput : 'free';

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
    $tier = in_array($tierInput, array('free', 'elite', 'gold')) ? $tierInput : 'free';

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
    if (!in_array($tierInput, array('elite', 'gold'))) {
      json_fail(400, 'Tier must be elite or gold');
    }

    // Delete existing rewards for this tier
    $stmt = $pdo->prepare("DELETE FROM gamepass_rewards WHERE tier = ?");
    $stmt->execute(array($tierInput));

    // Define 30 days of rewards
    // Gold: 9,000,000 Zen total | Elite: 5,000,000 Zen total
    if ($tierInput === 'gold') {
      // GOLD TIER - 9M Zen total, 3x coins vs elite, better spins & EXP
      // Zen distribution (9,000,000 total):
      // D2:100k D6:200k D7:150k D10:350k D13:450k D15:400k
      // D17:600k D20:750k D21:300k D24:1M D27:1.2M D28:900k D30:2.6M
      $seedRewards = array(
        // day, name, item_id, qty, coins, zen, exp, rarity, icon
        array(1,  'Gold Coins',         -2, 1, 3000000,  0,       0,      'common',    'COIN'),
        array(2,  'Zen Spark',          -1, 1, 0,        100000,  0,      'common',    'BOLT'),
        array(3,  'EXP Burst',          -3, 1, 0,        0,       80000,  'common',    'FIRE'),
        array(4,  'Coin Chest',         -2, 1, 5000000,  0,       0,      'uncommon',  'COIN'),
        array(5,  'Lucky Spin',         -4, 2, 0,        0,       0,      'uncommon',  'DICE'),
        array(6,  'Zen Flow',           -1, 1, 0,        200000,  0,      'uncommon',  'BOLT'),
        array(7,  'Weekly Jackpot',     -2, 1, 8000000,  150000,  100000, 'rare',      'TROPHY'),
        array(8,  'EXP Storm',          -3, 1, 0,        0,       150000, 'uncommon',  'FIRE'),
        array(9,  'Coin Rain',          -2, 1, 7000000,  0,       0,      'uncommon',  'COIN'),
        array(10, 'Zen Chest',          -1, 1, 0,        350000,  0,      'rare',      'GEM'),
        array(11, 'Lucky Spins x3',     -4, 3, 0,        0,       0,      'rare',      'DICE'),
        array(12, 'Mythic Coins',       -2, 1, 12000000, 0,       0,      'rare',      'GOLD'),
        array(13, 'Zen Surge',          -1, 1, 0,        450000,  0,      'rare',      'BOLT'),
        array(14, 'Bi-Weekly Bonus',    -2, 1, 15000000, 0,       200000, 'epic',      'TROPHY'),
        array(15, 'Zen Blessing',       -1, 1, 0,        400000,  0,      'rare',      'GEM'),
        array(16, 'Coin Vault',         -2, 1, 18000000, 0,       0,      'rare',      'COIN'),
        array(17, 'Zen Vault',          -1, 1, 0,        600000,  0,      'epic',      'GEM'),
        array(18, 'Lucky Spins x5',     -4, 5, 0,        0,       0,      'epic',      'DICE'),
        array(19, 'Mega Coins',         -2, 1, 25000000, 0,       0,      'epic',      'GOLD'),
        array(20, 'Zen Torrent',        -1, 1, 0,        750000,  0,      'epic',      'SPARKLE'),
        array(21, 'Triple Reward',      -2, 1, 20000000, 300000,  250000, 'epic',      'STAR'),
        array(22, 'EXP Legendary',      -3, 1, 0,        0,       500000, 'epic',      'FIRE'),
        array(23, 'Coin Jackpot',       -2, 1, 30000000, 0,       0,      'epic',      'TROPHY'),
        array(24, 'Zen Jackpot',        -1, 1, 0,        1000000, 0,      'legendary', 'ORB'),
        array(25, 'Lucky Spins x8',     -4, 8, 0,        0,       0,      'legendary', 'DICE'),
        array(26, 'Mythic Vault',       -2, 1, 40000000, 0,       0,      'legendary', 'GOLD'),
        array(27, 'Zen Fortune',        -1, 1, 0,        1200000, 0,      'legendary', 'GEM'),
        array(28, 'Grand Reward',       -2, 1, 50000000, 900000,  400000, 'legendary', 'CROWN'),
        array(29, 'Lucky Spins x10',    -4, 10, 0,       0,       0,      'legendary', 'DICE'),
        array(30, 'Ultimate Reward',    -2, 1, 75000000, 2600000, 600000, 'legendary', 'CROWN'),
      );
    } else {
      // ELITE TIER - 5M Zen total, base coins, standard spins & EXP
      // Zen distribution (5,000,000 total):
      // D2:50k D6:100k D7:80k D10:200k D13:250k D15:220k
      // D17:330k D20:420k D21:170k D24:550k D27:680k D28:500k D30:1.45M
      $seedRewards = array(
        array(1,  'Daily Coins',        -2, 1, 1000000,  0,       0,      'common',    'COIN'),
        array(2,  'Zen Spark',          -1, 1, 0,        50000,   0,      'common',    'BOLT'),
        array(3,  'EXP Boost',          -3, 1, 0,        0,       50000,  'common',    'FIRE'),
        array(4,  'Coin Chest',         -2, 1, 2000000,  0,       0,      'uncommon',  'COIN'),
        array(5,  'Lucky Spin',         -4, 1, 0,        0,       0,      'uncommon',  'DICE'),
        array(6,  'Zen Flow',           -1, 1, 0,        100000,  0,      'common',    'BOLT'),
        array(7,  'Weekly Bonus',       -2, 1, 3000000,  80000,   50000,  'rare',      'TROPHY'),
        array(8,  'EXP Surge',          -3, 1, 0,        0,       100000, 'uncommon',  'FIRE'),
        array(9,  'Coin Rain',          -2, 1, 2500000,  0,       0,      'uncommon',  'COIN'),
        array(10, 'Zen Chest',          -1, 1, 0,        200000,  0,      'rare',      'GEM'),
        array(11, 'Lucky Spins x2',     -4, 2, 0,        0,       0,      'rare',      'DICE'),
        array(12, 'Gold Coins',         -2, 1, 5000000,  0,       0,      'rare',      'GOLD'),
        array(13, 'Zen Surge',          -1, 1, 0,        250000,  0,      'uncommon',  'BOLT'),
        array(14, 'Bi-Weekly Bonus',    -2, 1, 7000000,  0,       100000, 'epic',      'TROPHY'),
        array(15, 'Zen Blessing',       -1, 1, 0,        220000,  0,      'rare',      'GEM'),
        array(16, 'Coin Vault',         -2, 1, 6000000,  0,       0,      'rare',      'COIN'),
        array(17, 'Zen Vault',          -1, 1, 0,        330000,  0,      'rare',      'GEM'),
        array(18, 'Lucky Spins x3',     -4, 3, 0,        0,       0,      'epic',      'DICE'),
        array(19, 'Mega Coins',         -2, 1, 8000000,  0,       0,      'epic',      'GOLD'),
        array(20, 'Zen Mega',           -1, 1, 0,        420000,  0,      'epic',      'SPARKLE'),
        array(21, 'Triple Reward',      -2, 1, 10000000, 170000,  150000, 'epic',      'STAR'),
        array(22, 'EXP Legendary',      -3, 1, 0,        0,       300000, 'epic',      'FIRE'),
        array(23, 'Coin Jackpot',       -2, 1, 12000000, 0,       0,      'epic',      'TROPHY'),
        array(24, 'Zen Jackpot',        -1, 1, 0,        550000,  0,      'epic',      'ORB'),
        array(25, 'Lucky Spins x5',     -4, 5, 0,        0,       0,      'legendary', 'DICE'),
        array(26, 'Mega Vault',         -2, 1, 15000000, 0,       0,      'legendary', 'GOLD'),
        array(27, 'Zen Fortune',        -1, 1, 0,        680000,  0,      'legendary', 'GEM'),
        array(28, 'Grand Reward',       -2, 1, 20000000, 500000,  200000, 'legendary', 'CROWN'),
        array(29, 'Lucky Spins x7',     -4, 7, 0,        0,       0,      'legendary', 'DICE'),
        array(30, 'Ultimate Reward',    -2, 1, 25000000, 1450000, 400000, 'legendary', 'CROWN'),
      );
    }

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

  default:
    json_fail(400, 'Invalid action');
}
