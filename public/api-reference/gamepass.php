<?php
/**
 * gamepass.php - Game Pass status and reward claiming API
 *
 * GET  ?action=status
 * GET  ?action=rewards
 * POST ?action=claim
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mail_delivery.php';

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
  error_log("GAMEPASS EX: ".$e->getMessage());
  json_fail(500, "Server error");
});
set_error_handler(function($severity, $message, $file, $line){
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

function getSessionToken() {
  $auth = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
  if (stripos($auth, 'Bearer ') === 0) return trim(substr($auth, 7));

  $hdr = isset($_SERVER['HTTP_X_SESSION_TOKEN']) ? $_SERVER['HTTP_X_SESSION_TOKEN'] : '';
  if ($hdr) return trim($hdr);

  if (!empty($_GET['sessionToken'])) return trim((string)$_GET['sessionToken']);
  if (!empty($_COOKIE['sessionToken'])) return trim((string)$_COOKIE['sessionToken']);

  return '';
}

function resolveSessionRow($token) {
  global $pdo;

  if ($token === '') return null;

  $hash = hash('sha256', $token);

  $queries = array(
    array("sql" => "
      SELECT us.user_id, u.name, us.expires_at
      FROM user_sessions us
      JOIN users u ON u.ID = us.user_id
      WHERE us.session_token = ?
      LIMIT 1
    ", "param" => $token),

    array("sql" => "
      SELECT us.user_id, u.name, us.expires_at
      FROM user_sessions us
      JOIN users u ON u.ID = us.user_id
      WHERE us.session_token = ?
      LIMIT 1
    ", "param" => $hash),
  );

  foreach (array('token_hash','session_token_hash') as $col) {
    $queries[] = array("sql" => "
      SELECT us.user_id, u.name, us.expires_at
      FROM user_sessions us
      JOIN users u ON u.ID = us.user_id
      WHERE us.$col = ?
      LIMIT 1
    ", "param" => $hash);
  }

  foreach ($queries as $q) {
    try {
      $stmt = $pdo->prepare($q["sql"]);
      $stmt->execute(array($q["param"]));
      $row = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($row) return $row;
    } catch (Exception $e) {
      // ignore (unknown column etc.)
    }
  }

  return null;
}

function getCurrentUser() {
  $token = getSessionToken();
  if ($token === '') return null;

  $sess = resolveSessionRow($token);
  if (!$sess) return null;

  if (!isset($sess['expires_at']) || strtotime($sess['expires_at']) <= time()) {
    return null;
  }

  // touch last_activity best-effort
  try {
    global $pdo;
    $pdo->prepare("UPDATE user_sessions SET last_activity = NOW() WHERE session_token = ?")->execute(array($token));
  } catch (Exception $e) {}

  return $sess;
}

function getUserZen($userId) {
  global $pdo;
  try {
    $stmt = $pdo->prepare("SELECT Gold FROM goldtab_sg WHERE AccountID = ? LIMIT 1");
    $stmt->execute(array($userId));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? (int)$row['Gold'] : 0;
  } catch (Exception $e) {
    error_log("GET_ZEN_ERROR: ".$e->getMessage());
    return 0;
  }
}

function deductUserZen($userId, $amount) {
  global $pdo;
  try {
    $currentZen = getUserZen($userId);
    if ($currentZen < $amount) return array('success'=>false, 'message'=>'Insufficient Zen balance');

    $stmt = $pdo->prepare("UPDATE goldtab_sg SET Gold = Gold - ? WHERE AccountID = ? AND Gold >= ?");
    $stmt->execute(array($amount, $userId, $amount));

    if ($stmt->rowCount() > 0) return array('success'=>true);
    return array('success'=>false, 'message'=>'Failed to deduct Zen');
  } catch (Exception $e) {
    error_log("DEDUCT_ZEN_ERROR: ".$e->getMessage());
    return array('success'=>false, 'message'=>'Database error');
  }
}

// Ensure tables exist
try {
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS user_gamepass (
      user_id INT PRIMARY KEY,
      is_premium TINYINT(1) NOT NULL DEFAULT 0,
      started_at DATETIME,
      expires_at DATETIME,
      KEY idx_premium (is_premium)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  ");

  $pdo->exec("
    CREATE TABLE IF NOT EXISTS user_gamepass_claims (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      day INT NOT NULL,
      tier VARCHAR(10) NOT NULL,
      claimed_at DATETIME,
      cycle_start DATE NOT NULL,
      zen_cost INT NOT NULL DEFAULT 0,
      UNIQUE KEY unique_claim (user_id, day, tier, cycle_start),
      KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  ");

  $pdo->exec("
    CREATE TABLE IF NOT EXISTS gamepass_rewards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      day INT NOT NULL,
      tier VARCHAR(10) NOT NULL DEFAULT 'free',
      item_id INT NOT NULL DEFAULT 0,
      item_name VARCHAR(100) NOT NULL DEFAULT '',
      quantity INT NOT NULL DEFAULT 1,
      coins INT NOT NULL DEFAULT 0,
      zen BIGINT NOT NULL DEFAULT 0,
      exp INT NOT NULL DEFAULT 0,
      rarity VARCHAR(20) NOT NULL DEFAULT 'common',
      icon VARCHAR(10) NOT NULL DEFAULT 'GIFT',
      created_at DATETIME,
      updated_at DATETIME,
      UNIQUE KEY unique_reward (day, tier),
      KEY idx_day (day)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  ");
} catch (Exception $e) {
  error_log("GAMEPASS_TABLES_ERROR: ".$e->getMessage());
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
    'current_day' => $dayInCycle,
    'cycle_start' => $cycleStartDate,
    'days_remaining' => $cycleLength - $dayInCycle
  );
}

try {
  switch ($action) {

    case 'rewards':
      $cycle = getCycleInfo();
      $rewards = array();

      try {
        $stmt = $pdo->query("SELECT * FROM gamepass_rewards ORDER BY day ASC, tier ASC");
        if ($stmt) $rewards = $stmt->fetchAll(PDO::FETCH_ASSOC);
      } catch (Exception $e) {
        error_log("GAMEPASS_REWARDS_ERROR: ".$e->getMessage());
      }

      foreach ($rewards as &$r) {
        $r['id'] = (int)$r['id'];
        $r['day'] = (int)$r['day'];
        $r['item_id'] = (int)$r['item_id'];
        $r['quantity'] = (int)$r['quantity'];
        $r['coins'] = (int)$r['coins'];
        $r['zen'] = (int)$r['zen'];
        $r['exp'] = (int)$r['exp'];
        if (!isset($r['rarity']) || $r['rarity'] === '') $r['rarity'] = 'common';
        if (!isset($r['icon']) || $r['icon'] === '') $r['icon'] = 'GIFT';
      }

      json_out(200, array(
        'success' => true,
        'current_day' => $cycle['current_day'],
        'cycle_start' => $cycle['cycle_start'],
        'days_remaining' => $cycle['days_remaining'],
        'zen_cost_per_day' => getZenSkipCost(),
        'rewards' => $rewards
      ));
      break;

    case 'status':
      $user = getCurrentUser();
      if (!$user) json_out(401, array('success'=>false, 'error'=>'Not authenticated'));

      $userId = (int)$user['user_id'];
      $cycle = getCycleInfo();

      // premium status
      $stmt = $pdo->prepare("SELECT is_premium, expires_at FROM user_gamepass WHERE user_id = ?");
      $stmt->execute(array($userId));
      $gp = $stmt->fetch(PDO::FETCH_ASSOC);

      $isPremium = false;
      if ($gp) {
        $expiresAt = isset($gp['expires_at']) ? $gp['expires_at'] : null;
        $isPremium = ((int)$gp['is_premium'] === 1) && ($expiresAt === null || strtotime($expiresAt) > time());
      }

      $userZen = getUserZen($userId);

      // claims
      $stmt = $pdo->prepare("SELECT day, tier FROM user_gamepass_claims WHERE user_id = ? AND cycle_start = ?");
      $stmt->execute(array($userId, $cycle['cycle_start']));
      $claims = $stmt->fetchAll(PDO::FETCH_ASSOC);

      $claimedDays = array('free'=>array(), 'elite'=>array());
      foreach ($claims as $c) {
        $t = isset($c['tier']) ? $c['tier'] : 'free';
        if (isset($claimedDays[$t])) $claimedDays[$t][] = (int)$c['day'];
      }

      // rewards
      $rewards = array();
      try {
        $stmt = $pdo->query("SELECT * FROM gamepass_rewards ORDER BY day ASC, tier ASC");
        if ($stmt) $rewards = $stmt->fetchAll(PDO::FETCH_ASSOC);
      } catch (Exception $e) {
        error_log("GAMEPASS_STATUS_REWARDS_ERROR: ".$e->getMessage());
      }

      foreach ($rewards as &$r) {
        $r['id'] = (int)$r['id'];
        $r['day'] = (int)$r['day'];
        $r['item_id'] = (int)$r['item_id'];
        $r['quantity'] = (int)$r['quantity'];
        $r['coins'] = (int)$r['coins'];
        $r['zen'] = (int)$r['zen'];
        $r['exp'] = (int)$r['exp'];
        if (!isset($r['rarity']) || $r['rarity'] === '') $r['rarity'] = 'common';
        if (!isset($r['icon']) || $r['icon'] === '') $r['icon'] = 'GIFT';
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
        'rewards' => $rewards
      ));
      break;

    case 'claim':
      if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_fail(405, 'Method not allowed');

      $user = getCurrentUser();
      if (!$user) json_out(401, array('success'=>false, 'error'=>'Not authenticated'));

      $userId = (int)$user['user_id'];
      $input = json_decode(file_get_contents('php://input'), true);
      if (!is_array($input)) $input = array();

      $day = isset($input['day']) ? (int)$input['day'] : 0;
      $tier = (isset($input['tier']) && in_array($input['tier'], array('free','elite'))) ? $input['tier'] : 'free';
      $roleId = isset($input['roleId']) ? (int)$input['roleId'] : 0;
      $payWithZen = (isset($input['payWithZen']) && $input['payWithZen'] === true);

      if ($day < 1 || $day > 30) json_fail(400, 'Invalid day');
      if ($roleId <= 0) json_fail(400, 'Please select a character to receive the reward');

      // verify character belongs to account
      $stmt = $pdo->prepare("SELECT RoleID, Name FROM basetab_sg WHERE RoleID = ? AND AccountID = ? AND IsDel = 0 LIMIT 1");
      $stmt->execute(array($roleId, $userId));
      $character = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$character) json_fail(400, 'Invalid character selected. Please choose a valid character.');

      $cycle = getCycleInfo();
      $zenCost = 0;

      $zenSkipCost = getZenSkipCost();
      if ($day > $cycle['current_day']) {
        if ($tier === 'free') {
          $daysAhead = $day - $cycle['current_day'];
          $zenCost = $daysAhead * $zenSkipCost;

          if (!$payWithZen) {
            json_out(400, array(
              'success'=>false,
              'error'=>'This day is locked. Pay Zen to unlock early.',
              'requires_zen'=>true,
              'zen_cost'=>$zenCost,
              'days_ahead'=>$daysAhead
            ));
          }

          $deductResult = deductUserZen($userId, $zenCost);
          if (!$deductResult['success']) {
            json_out(400, array(
              'success'=>false,
              'error'=>$deductResult['message'],
              'zen_cost'=>$zenCost,
              'user_zen'=>getUserZen($userId)
            ));
          }

        } else {
          json_fail(400, 'Cannot claim future Elite rewards');
        }
      }

      // elite eligibility
      if ($tier === 'elite') {
        $stmt = $pdo->prepare("SELECT is_premium, expires_at FROM user_gamepass WHERE user_id = ?");
        $stmt->execute(array($userId));
        $gp = $stmt->fetch(PDO::FETCH_ASSOC);

        $isPremium = false;
        if ($gp) {
          $expiresAt = isset($gp['expires_at']) ? $gp['expires_at'] : null;
          $isPremium = ((int)$gp['is_premium'] === 1) && ($expiresAt === null || strtotime($expiresAt) > time());
        }

        if (!$isPremium) json_out(403, array('success'=>false, 'error'=>'Elite tier requires premium Game Pass'));
      }

      // already claimed?
      $stmt = $pdo->prepare("SELECT id FROM user_gamepass_claims WHERE user_id = ? AND day = ? AND tier = ? AND cycle_start = ?");
      $stmt->execute(array($userId, $day, $tier, $cycle['cycle_start']));
      if ($stmt->fetch()) json_fail(400, 'Already claimed this reward');

      // reward config
      $stmt = $pdo->prepare("SELECT * FROM gamepass_rewards WHERE day = ? AND tier = ?");
      $stmt->execute(array($day, $tier));
      $reward = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$reward) json_fail(404, 'No reward configured for this day');

      // deliver
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

        // refund zen if charged
        if ($zenCost > 0) {
          try {
            $stmt = $pdo->prepare("UPDATE goldtab_sg SET Gold = Gold + ? WHERE AccountID = ?");
            $stmt->execute(array($zenCost, $userId));
          } catch (Exception $e) {
            error_log("GAMEPASS_REFUND_FAIL: ".$e->getMessage());
          }
        }

        json_fail(500, 'Failed to deliver reward. Please try again.');
      }

      // record claim
      $stmt = $pdo->prepare("
        INSERT INTO user_gamepass_claims (user_id, day, tier, claimed_at, cycle_start, zen_cost)
        VALUES (?, ?, ?, NOW(), ?, ?)
      ");
      $stmt->execute(array($userId, $day, $tier, $cycle['cycle_start'], $zenCost));

      $resp = array(
        'success'=>true,
        'message'=>'Reward claimed! Check your in-game mailbox.',
        'reward'=>array(
          'name'=>$reward['item_name'],
          'quantity'=>(int)$reward['quantity'],
          'coins'=>(int)$reward['coins'],
          'zen'=>(int)$reward['zen'],
          'exp'=>(int)$reward['exp'],
        )
      );

      if ($zenCost > 0) {
        $resp['zen_spent'] = $zenCost;
        $resp['user_zen'] = getUserZen($userId);
      }

      json_out(200, $resp);
      break;

    default:
      json_fail(400, 'Invalid action');
  }

} catch (Exception $e) {
  error_log("GAMEPASS_FATAL: ".$e->getMessage());
  json_fail(500, 'Server error');
}
