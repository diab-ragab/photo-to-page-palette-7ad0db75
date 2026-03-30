<?php
/**
 * gamepass.php - Game Pass status and reward claiming API
 * PHP 5.x compatible
 * INDIVIDUAL 30-DAY MODEL: each user has their own 30-day cycle
 * 2 Tiers: free, premium
 *
 * GET  ?action=status
 * GET  ?action=rewards
 * POST ?action=claim
 */

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

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

function _gp_exception_handler($e) {
  error_log("GAMEPASS EX: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
  json_fail(500, "Server error");
}
set_exception_handler('_gp_exception_handler');

function _gp_error_handler($severity, $message, $file, $line) {
  if (!($severity & (E_ERROR | E_USER_ERROR | E_RECOVERABLE_ERROR))) {
    error_log("GAMEPASS WARN: $message in $file:$line");
    return true;
  }
  error_log("GAMEPASS ERR: $message in $file:$line");
  throw new ErrorException($message, 0, $severity, $file, $line);
}
set_error_handler('_gp_error_handler');

function _gp_shutdown_handler() {
  $err = error_get_last();
  if (!$err) return;
  $fatalTypes = array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR);
  if (in_array($err['type'], $fatalTypes, true)) {
    error_log("GAMEPASS FATAL: {$err['message']} in {$err['file']}:{$err['line']}");
    json_fail(500, 'Server error');
  }
}
register_shutdown_function('_gp_shutdown_handler');

require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET', 'POST', 'OPTIONS'));
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/mail_delivery.php';
require_once __DIR__ . '/gamepass_helpers.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDB();
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

function getZenSkipCost() {
  global $pdo;
  try {
    $stmt = $pdo->query("SELECT setting_value FROM gamepass_settings WHERE setting_key = 'zen_skip_cost'");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? (int)$row['setting_value'] : 100000;
  } catch (Exception $e) {
    return 100000;
  }
}

// Detect reward table columns dynamically
function getRewardColumns() {
  global $pdo;
  try {
    $cols = $pdo->query("SHOW COLUMNS FROM gamepass_rewards")->fetchAll(PDO::FETCH_COLUMN);
    return $cols;
  } catch (Exception $e) {
    return array();
  }
}

function fetchRewards($whereClause = '', $params = array()) {
  global $pdo;
  
  $cols = getRewardColumns();
  
  $nameCol = in_array('reward_name', $cols) ? 'reward_name' : (in_array('item_name', $cols) ? 'item_name' : 'name');
  
  $selectParts = array('id', 'day', 'tier', 'item_id', 'quantity', 'rarity', 'icon');
  $selectParts[] = "$nameCol as item_name";
  
  $hasCoins = in_array('coins', $cols);
  $hasZen = in_array('zen', $cols);
  $hasExp = in_array('exp', $cols);
  
  if ($hasCoins) $selectParts[] = 'coins';
  if ($hasZen) $selectParts[] = 'zen';
  if ($hasExp) $selectParts[] = 'exp';
  
  $sql = "SELECT " . implode(', ', $selectParts) . " FROM gamepass_rewards";
  if ($whereClause) $sql .= " WHERE $whereClause";
  $sql .= " ORDER BY day ASC, tier ASC";
  
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  $rewards = array();
  foreach ($rows as $r) {
    $reward = array(
      'id' => (int)$r['id'],
      'day' => (int)$r['day'],
      'tier' => $r['tier'],
      'item_id' => (int)$r['item_id'],
      'item_name' => $r['item_name'],
      'quantity' => (int)$r['quantity'],
      'coins' => isset($r['coins']) ? (int)$r['coins'] : 0,
      'zen' => isset($r['zen']) ? (int)$r['zen'] : 0,
      'exp' => isset($r['exp']) ? (int)$r['exp'] : 0,
      'rarity' => isset($r['rarity']) && $r['rarity'] !== '' ? $r['rarity'] : 'common',
      'icon' => isset($r['icon']) && $r['icon'] !== '' ? $r['icon'] : 'GIFT'
    );
    
    if ($reward['item_id'] === -1) {
      if ($reward['zen'] <= 0) $reward['zen'] = $reward['quantity'];
      $reward['quantity'] = 0;
    } elseif ($reward['item_id'] === -2) {
      if ($reward['coins'] <= 0) $reward['coins'] = $reward['quantity'];
      $reward['quantity'] = 0;
    } elseif ($reward['item_id'] === -3) {
      if ($reward['exp'] <= 0) $reward['exp'] = $reward['quantity'];
      $reward['quantity'] = 0;
    }
    
    $rewards[] = $reward;
  }
  
  return $rewards;
}

function formatRewards($rewards) {
  $formatted = array();
  foreach ($rewards as $r) {
    $formatted[] = array(
      'id' => (int)$r['id'],
      'day' => (int)$r['day'],
      'tier' => $r['tier'],
      'item_id' => (int)$r['item_id'],
      'item_name' => $r['item_name'],
      'quantity' => (int)$r['quantity'],
      'coins' => (int)$r['coins'],
      'zen' => (int)$r['zen'],
      'exp' => (int)$r['exp'],
      'rarity' => $r['rarity'],
      'icon' => $r['icon']
    );
  }
  return $formatted;
}

function hasZenCostColumn() {
  global $pdo;
  try {
    $stmt = $pdo->query("SHOW COLUMNS FROM user_gamepass_claims LIKE 'zen_cost'");
    return $stmt && $stmt->fetch();
  } catch (Exception $e) {
    return false;
  }
}

try {
  switch ($action) {

    case 'rewards':
      $rewards = fetchRewards();

      $premiumPriceCents = 999;
      $gamepassEnabled = true;
      $premiumEnabled = true;

      try {
        $ssStmt = $pdo->query("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('gamepass_premium_price')");
        if ($ssStmt) {
          $ssRows = $ssStmt->fetchAll(PDO::FETCH_KEY_PAIR);
          if (isset($ssRows['gamepass_premium_price'])) {
            $v = (int)$ssRows['gamepass_premium_price'];
            if ($v > 0) $premiumPriceCents = $v;
          }
        }
      } catch (Exception $e) {}

      try {
        $stmtS = $pdo->query("SELECT setting_key, setting_value FROM gamepass_settings WHERE setting_key IN ('gamepass_enabled','premium_enabled','premium_price_cents')");
        if ($stmtS) {
          $settings = $stmtS->fetchAll(PDO::FETCH_KEY_PAIR);
          if (isset($settings['gamepass_enabled'])) $gamepassEnabled = ($settings['gamepass_enabled'] === '1' || $settings['gamepass_enabled'] === 1);
          if (isset($settings['premium_enabled'])) $premiumEnabled = ($settings['premium_enabled'] === '1' || $settings['premium_enabled'] === 1);
          if (isset($settings['premium_price_cents'])) {
            $v = (int)$settings['premium_price_cents'];
            if ($v > 0) $premiumPriceCents = $v;
          }
        }
      } catch (Exception $e) {}

      json_out(200, array(
        'success' => true,
        'zen_cost_per_day' => getZenSkipCost(),
        'premium_price_cents' => $premiumPriceCents,
        'gamepass_enabled' => $gamepassEnabled,
        'premium_enabled' => $premiumEnabled,
        'rewards' => formatRewards($rewards)
      ));
      break;

    case 'status':
      $user = getCurrentUser();
      if (!$user) {
        json_out(401, array('success' => false, 'error' => 'Not authenticated'));
      }

      $userId = (int)$user['user_id'];

      // Get user's gamepass info
      $isPremium = false;
      $userTier = 'free';
      $expiresAt = null;
      $remainingDays = 0;
      $activatedAt = null;
      $currentDay = 1;
      $cycleStart = date('Y-m-d');

      try {
        $stmt = $pdo->prepare("SELECT is_premium, tier, activated_at, days_total, expires_at FROM user_gamepass WHERE user_id = ?");
        $stmt->execute(array($userId));
        $gp = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($gp) {
          $activatedAt = isset($gp['activated_at']) ? $gp['activated_at'] : null;
          $expiresAt = isset($gp['expires_at']) ? $gp['expires_at'] : null;
          $dbTier = isset($gp['tier']) ? $gp['tier'] : 'free';

          // Calculate current day from activated_at
          $currentDay = getUserCurrentDay($activatedAt);
          $cycleStart = getUserCycleStart($activatedAt);

          if ($dbTier === 'premium') {
            $userTier = 'premium';
            if ($expiresAt !== null) {
              $isPremium = isGamePassActiveByExpiry($expiresAt);
              $remainingDays = getGamePassRemainingDaysFromExpiry($expiresAt);
            }
            // If expired, reset display to free
            if (!$isPremium) {
              $userTier = 'free';
            }
          }
        }
      } catch (Exception $e) {
        error_log("GAMEPASS_PREMIUM_CHECK: " . $e->getMessage());
      }

      $userZen = getUserZenBalance($userId);

      // Claims for this user's cycle
      $claimedDays = array('free' => array(), 'premium' => array());
      try {
        $stmt = $pdo->prepare("SELECT day, tier FROM user_gamepass_claims WHERE user_id = ? AND cycle_start = ?");
        $stmt->execute(array($userId, $cycleStart));
        $claims = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($claims as $c) {
          $t = isset($c['tier']) ? $c['tier'] : 'free';
          if (isset($claimedDays[$t])) {
            $claimedDays[$t][] = (int)$c['day'];
          }
        }
      } catch (Exception $e) {
        error_log("GAMEPASS_CLAIMS_CHECK: " . $e->getMessage());
      }

      $rewards = fetchRewards();

      $premiumPriceCents = 999;
      $gamepassEnabled = true;
      $premiumEnabled = true;
      try {
        $ssStmt = $pdo->query("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('gamepass_premium_price')");
        if ($ssStmt) {
          $ssRows = $ssStmt->fetchAll(PDO::FETCH_KEY_PAIR);
          if (isset($ssRows['gamepass_premium_price'])) { $v = (int)$ssRows['gamepass_premium_price']; if ($v > 0) $premiumPriceCents = $v; }
        }
      } catch (Exception $e) {}
      try {
        $stmtS = $pdo->query("SELECT setting_key, setting_value FROM gamepass_settings WHERE setting_key IN ('gamepass_enabled','premium_enabled','premium_price_cents')");
        if ($stmtS) {
          $settings = $stmtS->fetchAll(PDO::FETCH_KEY_PAIR);
          if (isset($settings['gamepass_enabled'])) $gamepassEnabled = ($settings['gamepass_enabled'] === '1' || $settings['gamepass_enabled'] === 1);
          if (isset($settings['premium_enabled'])) $premiumEnabled = ($settings['premium_enabled'] === '1' || $settings['premium_enabled'] === 1);
          if (isset($settings['premium_price_cents'])) { $v = (int)$settings['premium_price_cents']; if ($v > 0) $premiumPriceCents = $v; }
        }
      } catch (Exception $e) {}

      json_out(200, array(
        'success' => true,
        'is_premium' => $isPremium,
        'user_tier' => $userTier,
        'current_day' => $currentDay,
        'cycle_start' => $cycleStart,
        'days_remaining' => $remainingDays,
        'claimed_days' => $claimedDays,
        'user_zen' => $userZen,
        'zen_cost_per_day' => getZenSkipCost(),
        'premium_price_cents' => $premiumPriceCents,
        'gamepass_enabled' => $gamepassEnabled,
        'premium_enabled' => $premiumEnabled,
        'rewards' => formatRewards($rewards),
        'expires_at' => $expiresAt,
        'remaining_days' => $remainingDays,
        'pass_active' => $isPremium,
        'activated_at' => $activatedAt
      ));
      break;

    case 'claim':
      $method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
      
      $input = getJsonInput();
      if (empty($input)) {
        if (isset($_REQUEST['day'])) $input['day'] = $_REQUEST['day'];
        if (isset($_REQUEST['tier'])) $input['tier'] = $_REQUEST['tier'];
        if (isset($_REQUEST['roleId'])) $input['roleId'] = $_REQUEST['roleId'];
        if (isset($_REQUEST['payWithZen'])) $input['payWithZen'] = $_REQUEST['payWithZen'];
        if (isset($_REQUEST['sessionToken'])) $input['sessionToken'] = $_REQUEST['sessionToken'];
      }

      $user = getCurrentUser();
      if (!$user) {
        json_out(401, array('success' => false, 'error' => 'Not authenticated'));
      }

      $userId = (int)$user['user_id'];

      $day = isset($input['day']) ? (int)$input['day'] : 0;
      $tier = (isset($input['tier']) && in_array($input['tier'], array('free', 'premium'))) ? $input['tier'] : 'free';
      $roleId = isset($input['roleId']) ? (int)$input['roleId'] : 0;
      $payWithZen = (isset($input['payWithZen']) && ($input['payWithZen'] === true || $input['payWithZen'] === 'true' || $input['payWithZen'] === '1'));

      if ($day < 1 || $day > 30) {
        json_fail(400, 'Invalid day');
      }
      if ($roleId <= 0) {
        json_fail(400, 'Please select a character to receive the reward');
      }

      $character = verifyCharacterOwnership($roleId, $userId);
      if (!$character) {
        json_fail(400, 'Invalid character selected. Please choose a valid character.');
      }

      // Get user's pass info for current_day calculation
      $stmt = $pdo->prepare("SELECT activated_at, tier AS db_tier, expires_at FROM user_gamepass WHERE user_id = ?");
      $stmt->execute(array($userId));
      $gpInfo = $stmt->fetch(PDO::FETCH_ASSOC);

      $userActivatedAt = ($gpInfo && isset($gpInfo['activated_at'])) ? $gpInfo['activated_at'] : null;
      $userCurrentDay = getUserCurrentDay($userActivatedAt);
      $cycleStart = getUserCycleStart($userActivatedAt);

      $zenCost = 0;
      $zenSkipCost = getZenSkipCost();
      
      // Check if day is in the future (locked)
      if ($day > $userCurrentDay) {
        if ($tier === 'free') {
          $daysAhead = $day - $userCurrentDay;
          $zenCost = $daysAhead * $zenSkipCost;

          if (!$payWithZen) {
            json_out(400, array(
              'success' => false,
              'error' => 'This day is locked. Pay Zen to unlock early.',
              'requires_zen' => true,
              'zen_cost' => $zenCost,
              'days_ahead' => $daysAhead
            ));
          }

          $deductResult = deductUserZen($userId, $zenCost);
          if (!$deductResult['success']) {
            json_out(400, array(
              'success' => false,
              'error' => $deductResult['message'],
              'zen_cost' => $zenCost,
              'user_zen' => getUserZenBalance($userId)
            ));
          }
        } else {
          json_fail(400, 'Cannot claim future Premium rewards');
        }
      }

      // Tier eligibility check
      if ($tier === 'premium') {
        if (!$gpInfo) {
          json_fail(403, 'No Game Pass found. Purchase a pass first.');
        }
        
        $checkExpiry = isset($gpInfo['expires_at']) ? $gpInfo['expires_at'] : null;
        $passActive = ($checkExpiry !== null) ? isGamePassActiveByExpiry($checkExpiry) : false;
        
        if (!$passActive) {
          json_fail(403, 'Your Premium Pass has expired. Please renew.');
        }
        
        $dbTier = isset($gpInfo['db_tier']) ? $gpInfo['db_tier'] : 'free';
        if ($dbTier !== 'premium') {
          json_fail(403, 'You need Premium Pass to claim this reward.');
        }
      }

      // Check already claimed
      $stmt = $pdo->prepare("SELECT id FROM user_gamepass_claims WHERE user_id = ? AND day = ? AND tier = ? AND cycle_start = ?");
      $stmt->execute(array($userId, $day, $tier, $cycleStart));
      if ($stmt->fetch()) {
        json_fail(400, 'Already claimed this reward today');
      }

      // Find reward
      $rewards = fetchRewards("day = ? AND tier = ?", array($day, $tier));
      if (empty($rewards)) {
        json_fail(404, 'Reward not found for this day/tier');
      }
      $reward = $rewards[0];

      // Insert claim
      $zenCostColExists = hasZenCostColumn();
      if ($zenCostColExists && $zenCost > 0) {
        $stmt = $pdo->prepare("INSERT INTO user_gamepass_claims (user_id, day, tier, cycle_start, reward_id, zen_cost, claimed_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
        $stmt->execute(array($userId, $day, $tier, $cycleStart, $reward['id'], $zenCost));
      } else {
        $stmt = $pdo->prepare("INSERT INTO user_gamepass_claims (user_id, day, tier, cycle_start, reward_id, claimed_at) VALUES (?, ?, ?, ?, ?, NOW())");
        $stmt->execute(array($userId, $day, $tier, $cycleStart, $reward['id']));
      }

      // Deliver reward
      if ($reward['item_id'] === -4) {
        $spinsToAdd = max(1, $reward['quantity']);
        try {
          $pdo->exec("CREATE TABLE IF NOT EXISTS user_bonus_spins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            spins INT DEFAULT 0,
            reason VARCHAR(100) DEFAULT 'gamepass',
            created_at DATETIME NOT NULL,
            KEY idx_user (user_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
          
          $stmt = $pdo->prepare("INSERT INTO user_bonus_spins (user_id, spins, reason, created_at) VALUES (?, ?, 'gamepass_reward', NOW())");
          $stmt->execute(array($userId, $spinsToAdd));
        } catch (Exception $e) {
          error_log("GAMEPASS_SPINS_ERR: " . $e->getMessage());
        }
      } elseif ($reward['item_id'] === -1) {
        $zenAmount = $reward['zen'] > 0 ? $reward['zen'] : $reward['quantity'];
        if ($zenAmount > 0) {
          try {
            $stmt = $pdo->prepare("UPDATE user_currency SET zen = zen + ? WHERE user_id = ?");
            $stmt->execute(array($zenAmount, $userId));
            if ($stmt->rowCount() === 0) {
              $stmt = $pdo->prepare("INSERT INTO user_currency (user_id, zen) VALUES (?, ?)");
              $stmt->execute(array($userId, $zenAmount));
            }
          } catch (Exception $e) {
            error_log("GAMEPASS_ZEN_ERR: " . $e->getMessage());
          }
        }
      } elseif ($reward['item_id'] === -2) {
        $coinsAmount = $reward['coins'] > 0 ? $reward['coins'] : $reward['quantity'];
        if ($coinsAmount > 0) {
          try {
            $stmt = $pdo->prepare("UPDATE user_currency SET coins = coins + ? WHERE user_id = ?");
            $stmt->execute(array($coinsAmount, $userId));
            if ($stmt->rowCount() === 0) {
              $stmt = $pdo->prepare("INSERT INTO user_currency (user_id, coins) VALUES (?, ?)");
              $stmt->execute(array($userId, $coinsAmount));
            }
          } catch (Exception $e) {
            error_log("GAMEPASS_COINS_ERR: " . $e->getMessage());
          }
        }
      } elseif ($reward['item_id'] > 0) {
        $mailer = new GameMailer($pdo);
        $qty = max(1, $reward['quantity']);
        $mailer->sendRewardMail($roleId, $reward['item_id'], $qty, "Game Pass Day {$day} ({$tier})");
      }

      $responseData = array(
        'success' => true,
        'day' => $day,
        'tier' => $tier,
        'reward' => $reward['item_name'],
        'user_zen' => getUserZenBalance($userId)
      );
      if ($zenCost > 0) {
        $responseData['zen_spent'] = $zenCost;
      }
      
      json_out(200, $responseData);
      break;

    default:
      json_fail(400, 'Invalid action. Use: rewards, status, or claim');
  }
} catch (Exception $e) {
  error_log("GAMEPASS_UNCAUGHT: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
  json_fail(500, 'Server error');
}
