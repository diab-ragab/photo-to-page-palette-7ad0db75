<?php
/**
 * gamepass.php - Game Pass status and reward claiming API
 * PHP 5.x compatible
 *
 * GET  ?action=status
 * GET  ?action=rewards
 * POST ?action=claim
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/mail_delivery.php';

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

set_exception_handler(function($e) {
  error_log("GAMEPASS EX: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
  json_fail(500, "Server error");
});

set_error_handler(function($severity, $message, $file, $line) {
  error_log("GAMEPASS ERR: $message in $file:$line");
  throw new ErrorException($message, 0, $severity, $file, $line);
});

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

function getCycleInfo() {
  $cycleLength = 30;
  $epochStart = strtotime('2025-01-01');
  $now = time();

  $daysSinceEpoch = floor(($now - $epochStart) / 86400);
  $currentCycle = floor($daysSinceEpoch / $cycleLength);
  $dayInCycle = ($daysSinceEpoch % $cycleLength) + 1;

  $cycleStartDate = date('Y-m-d', $epochStart + ($currentCycle * $cycleLength * 86400));

  return array(
    'current_day' => (int)$dayInCycle,
    'cycle_start' => $cycleStartDate,
    'days_remaining' => (int)($cycleLength - $dayInCycle)
  );
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
      'rarity' => isset($r['rarity']) && $r['rarity'] !== '' ? $r['rarity'] : 'common',
      'icon' => isset($r['icon']) && $r['icon'] !== '' ? $r['icon'] : 'GIFT'
    );
  }
  return $formatted;
}

// Check if zen_cost column exists in user_gamepass_claims
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
      $rewards = array();

      try {
        $stmt = $pdo->query("SELECT id, day, tier, item_id, item_name, quantity, coins, zen, exp, rarity, icon FROM gamepass_rewards ORDER BY day ASC, tier ASC");
        if ($stmt) $rewards = $stmt->fetchAll(PDO::FETCH_ASSOC);
      } catch (Exception $e) {
        error_log("GAMEPASS_REWARDS_ERROR: " . $e->getMessage());
      }

      json_out(200, array(
        'success' => true,
        'current_day' => $cycle['current_day'],
        'cycle_start' => $cycle['cycle_start'],
        'days_remaining' => $cycle['days_remaining'],
        'zen_cost_per_day' => getZenSkipCost(),
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

      // Premium status
      $isPremium = false;
      try {
        $stmt = $pdo->prepare("SELECT is_premium, expires_at FROM user_gamepass WHERE user_id = ?");
        $stmt->execute(array($userId));
        $gp = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($gp) {
          $expiresAt = isset($gp['expires_at']) ? $gp['expires_at'] : null;
          $isPremium = ((int)$gp['is_premium'] === 1) && ($expiresAt === null || strtotime($expiresAt) > time());
        }
      } catch (Exception $e) {
        error_log("GAMEPASS_PREMIUM_CHECK: " . $e->getMessage());
      }

      $userZen = getUserZenBalance($userId);

      // Claims
      $claimedDays = array('free' => array(), 'elite' => array());
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

      // Rewards
      $rewards = array();
      try {
        $stmt = $pdo->query("SELECT id, day, tier, item_id, item_name, quantity, coins, zen, exp, rarity, icon FROM gamepass_rewards ORDER BY day ASC, tier ASC");
        if ($stmt) $rewards = $stmt->fetchAll(PDO::FETCH_ASSOC);
      } catch (Exception $e) {
        error_log("GAMEPASS_STATUS_REWARDS_ERROR: " . $e->getMessage());
      }

      json_out(200, array(
        'success' => true,
        'is_premium' => $isPremium,
        'current_day' => $cycle['current_day'],
        'cycle_start' => $cycle['cycle_start'],
        'days_remaining' => $cycle['days_remaining'],
        'claimed_days' => $claimedDays,
        'user_zen' => $userZen,
        'zen_cost_per_day' => getZenSkipCost(),
        'rewards' => formatRewards($rewards)
      ));
      break;

    case 'claim':
      // Accept both POST and GET for claim (some servers redirect POST to GET)
      $method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
      error_log("GAMEPASS_CLAIM method=$method");
      
      // Read input from php://input for POST, or from $_GET for GET
      $rawInput = file_get_contents('php://input');
      $input = json_decode($rawInput, true);
      if (!is_array($input)) {
        // Fallback to GET/POST params
        $input = array();
        if (isset($_REQUEST['day'])) $input['day'] = $_REQUEST['day'];
        if (isset($_REQUEST['tier'])) $input['tier'] = $_REQUEST['tier'];
        if (isset($_REQUEST['roleId'])) $input['roleId'] = $_REQUEST['roleId'];
        if (isset($_REQUEST['payWithZen'])) $input['payWithZen'] = $_REQUEST['payWithZen'];
      }

      $user = getCurrentUser();
      if (!$user) {
        json_out(401, array('success' => false, 'error' => 'Not authenticated'));
      }

      $userId = (int)$user['user_id'];

      $day = isset($input['day']) ? (int)$input['day'] : 0;
      $tier = (isset($input['tier']) && in_array($input['tier'], array('free', 'elite'))) ? $input['tier'] : 'free';
      $roleId = isset($input['roleId']) ? (int)$input['roleId'] : 0;
      $payWithZen = (isset($input['payWithZen']) && ($input['payWithZen'] === true || $input['payWithZen'] === 'true' || $input['payWithZen'] === '1'));

      error_log("GAMEPASS_CLAIM_INPUT user=$userId day=$day tier=$tier roleId=$roleId payWithZen=" . ($payWithZen ? 'true' : 'false'));

      if ($day < 1 || $day > 30) {
        json_fail(400, 'Invalid day');
      }
      if ($roleId <= 0) {
        json_fail(400, 'Please select a character to receive the reward');
      }

      // Verify character belongs to account
      $character = verifyCharacterOwnership($roleId, $userId);
      if (!$character) {
        json_fail(400, 'Invalid character selected. Please choose a valid character.');
      }

      $cycle = getCycleInfo();
      $zenCost = 0;

      $zenSkipCost = getZenSkipCost();
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

      // Elite eligibility
      if ($tier === 'elite') {
        $stmt = $pdo->prepare("SELECT is_premium, expires_at FROM user_gamepass WHERE user_id = ?");
        $stmt->execute(array($userId));
        $gp = $stmt->fetch(PDO::FETCH_ASSOC);

        $isPremium = false;
        if ($gp) {
          $expiresAt = isset($gp['expires_at']) ? $gp['expires_at'] : null;
          $isPremium = ((int)$gp['is_premium'] === 1) && ($expiresAt === null || strtotime($expiresAt) > time());
        }

        if (!$isPremium) {
          json_out(403, array('success' => false, 'error' => 'Elite tier requires premium Game Pass'));
        }
      }

      // Already claimed?
      $stmt = $pdo->prepare("SELECT id FROM user_gamepass_claims WHERE user_id = ? AND day = ? AND tier = ? AND cycle_start = ?");
      $stmt->execute(array($userId, $day, $tier, $cycle['cycle_start']));
      if ($stmt->fetch()) {
        json_fail(400, 'Already claimed this reward');
      }

      // Reward config
      $stmt = $pdo->prepare("SELECT id, day, tier, item_id, item_name, quantity, coins, zen, exp, rarity, icon FROM gamepass_rewards WHERE day = ? AND tier = ?");
      $stmt->execute(array($day, $tier));
      $reward = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$reward) {
        json_fail(404, 'No reward configured for this day');
      }

      // Deliver
      $mailer = new GameMailer($pdo);
      $result = $mailer->sendGamePassReward(
        $roleId,
        $day,
        $tier,
        (int)$reward['item_id'],
        (int)$reward['quantity'],
        (int)$reward['coins'],
        (int)$reward['zen'],
        (int)$reward['exp']
      );

      if (!is_array($result) || empty($result['success'])) {
        error_log("GAMEPASS_CLAIM_FAILED user={$userId} day={$day} tier={$tier}");

        // Refund zen if charged
        if ($zenCost > 0) {
          refundUserZen($userId, $zenCost);
        }

        json_fail(500, 'Failed to deliver reward. Please try again.');
      }

      // Record claim - check if zen_cost column exists
      if (hasZenCostColumn()) {
        $stmt = $pdo->prepare("
          INSERT INTO user_gamepass_claims (user_id, day, tier, claimed_at, cycle_start, zen_cost)
          VALUES (?, ?, ?, NOW(), ?, ?)
        ");
        $stmt->execute(array($userId, $day, $tier, $cycle['cycle_start'], $zenCost));
      } else {
        // Table without zen_cost column
        $stmt = $pdo->prepare("
          INSERT INTO user_gamepass_claims (user_id, day, tier, claimed_at, cycle_start)
          VALUES (?, ?, ?, NOW(), ?)
        ");
        $stmt->execute(array($userId, $day, $tier, $cycle['cycle_start']));
      }

      error_log("GAMEPASS_CLAIMED user={$userId} role={$roleId} day={$day} tier={$tier}");

      $resp = array(
        'success' => true,
        'message' => 'Reward claimed! Check your in-game mailbox.',
        'reward' => array(
          'name' => $reward['item_name'],
          'quantity' => (int)$reward['quantity'],
          'coins' => (int)$reward['coins'],
          'zen' => (int)$reward['zen'],
          'exp' => (int)$reward['exp']
        )
      );

      if ($zenCost > 0) {
        $resp['zen_spent'] = $zenCost;
        $resp['user_zen'] = getUserZenBalance($userId);
      }

      json_out(200, $resp);
      break;

    default:
      json_fail(400, 'Invalid action');
  }

} catch (Exception $e) {
  error_log("GAMEPASS_FATAL: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
  json_fail(500, 'Server error');
}
