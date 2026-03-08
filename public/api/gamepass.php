<?php
/**
 * gamepass.php - Game Pass status and reward claiming API
 * PHP 5.x compatible
 * SEASON-BASED MODEL: uses global season anchor date
 *
 * GET  ?action=status
 * GET  ?action=rewards
 * POST ?action=claim
 */

// IMPORTANT: initialize buffering + error handlers BEFORE including dependencies
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

set_exception_handler(function($e) {
  error_log("GAMEPASS EX: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
  json_fail(500, "Server error");
});

set_error_handler(function($severity, $message, $file, $line) {
  if (!($severity & (E_ERROR | E_USER_ERROR | E_RECOVERABLE_ERROR))) {
    error_log("GAMEPASS WARN: $message in $file:$line");
    return true;
  }
  error_log("GAMEPASS ERR: $message in $file:$line");
  throw new ErrorException($message, 0, $severity, $file, $line);
});

register_shutdown_function(function() {
  $err = error_get_last();
  if (!$err) return;
  $fatalTypes = array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR);
  if (in_array($err['type'], $fatalTypes, true)) {
    error_log("GAMEPASS FATAL: {$err['message']} in {$err['file']}:{$err['line']}");
    json_fail(500, 'Server error');
  }
});

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

/**
 * Get cycle info from global season (replaces old month-based logic)
 */
function getCycleInfo() {
  global $pdo;
  $season = getCurrentSeasonInfo($pdo);
  return array(
    'current_day' => $season['current_day'],
    'cycle_start' => $season['season_start_date'],
    'days_remaining' => $season['days_remaining'],
    'season_start' => $season['season_start'],
    'season_end' => $season['season_end'],
    'season_number' => $season['season_number'],
  );
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
  $typeCol = in_array('reward_type', $cols) ? 'reward_type' : (in_array('item_type', $cols) ? 'item_type' : null);
  
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
      $cycle = getCycleInfo();
      $rewards = fetchRewards();

      // Fetch prices and enabled status
      $elitePriceCents = 999;
      $goldPriceCents = 1999;
      $gamepassEnabled = true;
      $eliteEnabled = true;
      $goldEnabled = true;

      try {
        $ssStmt = $pdo->query("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('gamepass_elite_price','gamepass_gold_price')");
        if ($ssStmt) {
          $ssRows = $ssStmt->fetchAll(PDO::FETCH_KEY_PAIR);
          if (isset($ssRows['gamepass_elite_price'])) {
            $v = (int)$ssRows['gamepass_elite_price'];
            if ($v > 0) $elitePriceCents = $v;
          }
          if (isset($ssRows['gamepass_gold_price'])) {
            $v = (int)$ssRows['gamepass_gold_price'];
            if ($v > 0) $goldPriceCents = $v;
          }
        }
      } catch (Exception $e) {}

      try {
        $stmtS = $pdo->query("SELECT setting_key, setting_value FROM gamepass_settings WHERE setting_key IN ('gamepass_enabled','elite_enabled','gold_enabled')");
        if ($stmtS) {
          $settings = $stmtS->fetchAll(PDO::FETCH_KEY_PAIR);
          if (isset($settings['gamepass_enabled'])) $gamepassEnabled = ($settings['gamepass_enabled'] === '1' || $settings['gamepass_enabled'] === 1);
          if (isset($settings['elite_enabled'])) $eliteEnabled = ($settings['elite_enabled'] === '1' || $settings['elite_enabled'] === 1);
          if (isset($settings['gold_enabled'])) $goldEnabled = ($settings['gold_enabled'] === '1' || $settings['gold_enabled'] === 1);
        }
      } catch (Exception $e) {}

      json_out(200, array(
        'success' => true,
        'current_day' => $cycle['current_day'],
        'cycle_start' => $cycle['cycle_start'],
        'days_remaining' => $cycle['days_remaining'],
        'season_start' => $cycle['season_start'],
        'season_end' => $cycle['season_end'],
        'season_number' => $cycle['season_number'],
        'zen_cost_per_day' => getZenSkipCost(),
        'elite_price_cents' => $elitePriceCents,
        'gold_price_cents' => $goldPriceCents,
        'gamepass_enabled' => $gamepassEnabled,
        'elite_enabled' => $eliteEnabled,
        'gold_enabled' => $goldEnabled,
        'rewards' => formatRewards($rewards)
      ));
      break;

    case 'status':
      $user = getCurrentUser();
      if (!$user) {
        json_out(401, array('success' => false, 'error' => 'Not authenticated'));
      }

      $userId = (int)$user['user_id'];
      $cycle = getCycleInfo();

      // Premium status & tier - SEASON-BASED (use expires_at)
      $isPremium = false;
      $userTier = 'free';
      $expiresAt = null;
      $remainingDays = 0;
      try {
        $stmt = $pdo->prepare("SELECT is_premium, tier, activated_at, days_total, expires_at FROM user_gamepass WHERE user_id = ?");
        $stmt->execute(array($userId));
        $gp = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($gp) {
          $expiresAt = isset($gp['expires_at']) ? $gp['expires_at'] : null;

          if (isset($gp['tier']) && in_array($gp['tier'], array('elite', 'gold'))) {
            $userTier = $gp['tier'];
            // Season-based: check expires_at directly
            if ($expiresAt !== null) {
              $isPremium = isGamePassActiveByExpiry($expiresAt);
              $remainingDays = getGamePassRemainingDaysFromExpiry($expiresAt);
            } else {
              // Legacy fallback
              $activatedAt = isset($gp['activated_at']) ? $gp['activated_at'] : null;
              $daysTotal = isset($gp['days_total']) ? (int)$gp['days_total'] : null;
              if ($daysTotal !== null && $daysTotal > 0) {
                $isPremium = isGamePassActive($activatedAt, $daysTotal);
                $remainingDays = getGamePassRemainingDays($activatedAt, $daysTotal);
                // Compute expires_at for response
                $expiresAt = getGamePassExpiryDate($activatedAt, $daysTotal);
              }
            }
          } elseif ((int)$gp['is_premium'] === 1) {
            $userTier = 'elite';
            if ($expiresAt !== null) {
              $isPremium = isGamePassActiveByExpiry($expiresAt);
              $remainingDays = getGamePassRemainingDaysFromExpiry($expiresAt);
            }
          }
        }
      } catch (Exception $e) {
        error_log("GAMEPASS_PREMIUM_CHECK: " . $e->getMessage());
      }

      $userZen = getUserZenBalance($userId);

      // Claims - use season_start_date as cycle key
      $claimedDays = array('free' => array(), 'elite' => array(), 'gold' => array());
      try {
        $stmt = $pdo->prepare("SELECT day, tier FROM user_gamepass_claims WHERE user_id = ? AND cycle_start = ?");
        $stmt->execute(array($userId, $cycle['cycle_start']));
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

      // Fetch prices and enabled status
      $elitePriceCents = 999;
      $goldPriceCents = 1999;
      $gamepassEnabled = true;
      $eliteEnabled = true;
      $goldEnabled = true;
      try {
        $ssStmt = $pdo->query("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('gamepass_elite_price','gamepass_gold_price')");
        if ($ssStmt) {
          $ssRows = $ssStmt->fetchAll(PDO::FETCH_KEY_PAIR);
          if (isset($ssRows['gamepass_elite_price'])) { $v = (int)$ssRows['gamepass_elite_price']; if ($v > 0) $elitePriceCents = $v; }
          if (isset($ssRows['gamepass_gold_price'])) { $v = (int)$ssRows['gamepass_gold_price']; if ($v > 0) $goldPriceCents = $v; }
        }
      } catch (Exception $e) {}
      try {
        $stmtS = $pdo->query("SELECT setting_key, setting_value FROM gamepass_settings WHERE setting_key IN ('gamepass_enabled','elite_enabled','gold_enabled')");
        if ($stmtS) {
          $settings = $stmtS->fetchAll(PDO::FETCH_KEY_PAIR);
          if (isset($settings['gamepass_enabled'])) $gamepassEnabled = ($settings['gamepass_enabled'] === '1' || $settings['gamepass_enabled'] === 1);
          if (isset($settings['elite_enabled'])) $eliteEnabled = ($settings['elite_enabled'] === '1' || $settings['elite_enabled'] === 1);
          if (isset($settings['gold_enabled'])) $goldEnabled = ($settings['gold_enabled'] === '1' || $settings['gold_enabled'] === 1);
        }
      } catch (Exception $e) {}

      json_out(200, array(
        'success' => true,
        'is_premium' => $isPremium,
        'user_tier' => $userTier,
        'current_day' => $cycle['current_day'],
        'cycle_start' => $cycle['cycle_start'],
        'days_remaining' => $cycle['days_remaining'],
        'season_start' => $cycle['season_start'],
        'season_end' => $cycle['season_end'],
        'season_number' => $cycle['season_number'],
        'claimed_days' => $claimedDays,
        'user_zen' => $userZen,
        'zen_cost_per_day' => getZenSkipCost(),
        'elite_price_cents' => $elitePriceCents,
        'gold_price_cents' => $goldPriceCents,
        'gamepass_enabled' => $gamepassEnabled,
        'elite_enabled' => $eliteEnabled,
        'gold_enabled' => $goldEnabled,
        'rewards' => formatRewards($rewards),
        'expires_at' => $expiresAt,
        'remaining_days' => $remainingDays,
        'pass_active' => $isPremium
      ));
      break;

    case 'claim':
      $method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
      error_log("GAMEPASS_CLAIM method=$method");
      
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
      $tier = (isset($input['tier']) && in_array($input['tier'], array('free', 'elite', 'gold'))) ? $input['tier'] : 'free';
      $roleId = isset($input['roleId']) ? (int)$input['roleId'] : 0;
      $payWithZen = (isset($input['payWithZen']) && ($input['payWithZen'] === true || $input['payWithZen'] === 'true' || $input['payWithZen'] === '1'));

      error_log("GAMEPASS_CLAIM_INPUT user=$userId day=$day tier=$tier roleId=$roleId payWithZen=" . ($payWithZen ? 'true' : 'false'));

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

      $cycle = getCycleInfo();
      $zenCost = 0;

      $zenSkipCost = getZenSkipCost();
      
      // Check if day is in the future (locked)
      if ($day > $cycle['current_day']) {
        if ($tier === 'free') {
          $daysAhead = $day - $cycle['current_day'];
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
          json_fail(400, 'Cannot claim future Elite rewards');
        }
      }

      // Tier eligibility check - use expires_at (season-based)
      if ($tier === 'elite' || $tier === 'gold') {
        $stmt = $pdo->prepare("SELECT tier, expires_at, activated_at, days_total FROM user_gamepass WHERE user_id = ?");
        $stmt->execute(array($userId));
        $gpCheck = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$gpCheck) {
          json_fail(403, 'No Game Pass found. Purchase a pass first.');
        }
        
        $checkExpiry = isset($gpCheck['expires_at']) ? $gpCheck['expires_at'] : null;
        $passActive = false;
        if ($checkExpiry !== null) {
          $passActive = isGamePassActiveByExpiry($checkExpiry);
        } else {
          // Legacy fallback
          $checkActivated = isset($gpCheck['activated_at']) ? $gpCheck['activated_at'] : null;
          $checkDays = isset($gpCheck['days_total']) ? (int)$gpCheck['days_total'] : 0;
          $passActive = isGamePassActive($checkActivated, $checkDays);
        }
        
        if (!$passActive) {
          json_fail(403, 'Your Game Pass has expired. Please renew.');
        }
        
        $dbTier = isset($gpCheck['tier']) ? $gpCheck['tier'] : 'free';
        $tierRank = array('free' => 0, 'elite' => 1, 'gold' => 2);
        $dbRank = isset($tierRank[$dbTier]) ? $tierRank[$dbTier] : 0;
        $reqRank = isset($tierRank[$tier]) ? $tierRank[$tier] : 0;
        
        if ($dbRank < $reqRank) {
          json_fail(403, 'You need ' . ucfirst($tier) . ' Pass to claim this reward.');
        }
      }

      // Check already claimed
      $stmt = $pdo->prepare("SELECT id FROM user_gamepass_claims WHERE user_id = ? AND day = ? AND tier = ? AND cycle_start = ?");
      $stmt->execute(array($userId, $day, $tier, $cycle['cycle_start']));
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
        $stmt->execute(array($userId, $day, $tier, $cycle['cycle_start'], $reward['id'], $zenCost));
      } else {
        $stmt = $pdo->prepare("INSERT INTO user_gamepass_claims (user_id, day, tier, cycle_start, reward_id, claimed_at) VALUES (?, ?, ?, ?, ?, NOW())");
        $stmt->execute(array($userId, $day, $tier, $cycle['cycle_start'], $reward['id']));
      }

      // Deliver reward
      $deliveryResult = array('success' => true);
      
      if ($reward['item_id'] === -4) {
        // Bonus spins
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
          error_log("GAMEPASS_SPINS user={$userId} spins={$spinsToAdd} day={$day} tier={$tier}");
        } catch (Exception $e) {
          error_log("GAMEPASS_SPINS_ERR: " . $e->getMessage());
        }
      } elseif ($reward['item_id'] === -1) {
        // Zen reward
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
        // Coins reward
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
        // Physical item - send via game mail
        $mailer = new GameMailer($pdo);
        $qty = max(1, $reward['quantity']);
        $deliveryResult = $mailer->sendRewardMail($roleId, $reward['item_id'], $qty, "Game Pass Day {$day} ({$tier})");
        error_log("GAMEPASS_DELIVER user={$userId} role={$roleId} item={$reward['item_id']} qty={$qty} success=" . ($deliveryResult['success'] ? 'yes' : 'no'));
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
