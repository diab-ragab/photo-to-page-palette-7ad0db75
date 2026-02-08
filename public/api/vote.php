<?php
/**
 * vote.php - Voting system API
 * PHP 5.1/MySQL 5.1 compatible - NO short array syntax
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

define('VERSION', '2026-02-08-A');

require_once __DIR__ . '/bootstrap.php';

/**
 * Prevent any accidental output from breaking JSON
 */
if (ob_get_level() === 0) { ob_start(); }

// ---------- CORS / OPTIONS ----------
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

$allowedOrigins = array(
  'https://woiendgame.online',
  'https://www.woiendgame.online',
  'https://woiendgame.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000'
);

$isLovableOrigin = is_string($origin) &&
  preg_match('/^https:\/\/[a-z0-9-]+\.(lovableproject\.com|lovable\.app)$/i', $origin);

if ($origin && (in_array($origin, $allowedOrigins, true) || $isLovableOrigin)) {
  header("Access-Control-Allow-Origin: $origin");
  header("Vary: Origin");
  header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, X-Session-Token, Authorization, X-CSRF-Token");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  if (ob_get_length()) { ob_clean(); }
  exit;
}

header('Content-Type: application/json; charset=utf-8');

// ---------- Polyfill ----------
if (!function_exists('http_response_code')) {
  function http_response_code($code = null) {
    static $current = 200;
    if ($code !== null) {
      $current = (int)$code;
      header('X-PHP-Response-Code: ' . $current, true, $current);
    }
    return $current;
  }
}

// PHP 5.x safe RID generator
function _rid() {
  if (function_exists('random_bytes')) {
    return bin2hex(random_bytes(6));
  }
  if (function_exists('openssl_random_pseudo_bytes')) {
    return bin2hex(openssl_random_pseudo_bytes(6));
  }
  return substr(md5(uniqid('', true)), 0, 12);
}

$RID = _rid();

function jsonOut($data) {
  global $RID;

  // Clean any accidental output before returning JSON
  if (ob_get_length()) { ob_clean(); }

  $flags = 0;
  if (defined('JSON_UNESCAPED_UNICODE')) { $flags = JSON_UNESCAPED_UNICODE; }

  echo json_encode(array_merge($data, array('rid' => $RID, '_version' => VERSION)), $flags);
  exit;
}

function jsonFail($code, $msg, $extra = null) {
  if ($extra === null) { $extra = array(); }
  http_response_code($code);
  jsonOut(array_merge(array('success' => false, 'message' => $msg), $extra));
}

// ---------- DB ----------
try {
  $pdo = getDB();
} catch (Exception $e) {
  error_log("RID={$RID} DB_FAIL=" . $e->getMessage());
  jsonFail(503, 'Service temporarily unavailable');
}

// Detect username column in legacy schemas: prefer 'name', fallback to 'login'
$usernameColumn = 'name';
try {
  $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
  if (!in_array('name', $cols, true) && in_array('login', $cols, true)) {
    $usernameColumn = 'login';
  }
} catch (Exception $e) {
  // keep default
}

// Ensure vote_log table exists (MySQL 5.1 safe - no DEFAULT CURRENT_TIMESTAMP)
try {
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS vote_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      username VARCHAR(100) NOT NULL,
      site_id INT NOT NULL,
      fingerprint VARCHAR(255) DEFAULT NULL,
      ip_address VARCHAR(45) DEFAULT NULL,
      coins_earned INT NOT NULL DEFAULT 0,
      vip_earned INT NOT NULL DEFAULT 0,
      streak_bonus DECIMAL(3,2) DEFAULT 1.00,
      vote_time DATETIME NOT NULL,
      INDEX idx_user_site (user_id, site_id),
      INDEX idx_username_site (username, site_id),
      INDEX idx_vote_time (vote_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  ");
} catch (Exception $e) {
  // ignore
}

// Ensure vote_streaks table exists
try {
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS vote_streaks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      current_streak INT NOT NULL DEFAULT 0,
      longest_streak INT NOT NULL DEFAULT 0,
      last_vote_date DATE DEFAULT NULL,
      streak_expires_at DATETIME DEFAULT NULL,
      total_bonus_earned INT NOT NULL DEFAULT 0,
      updated_at DATETIME NULL,
      INDEX idx_username (username),
      INDEX idx_current_streak (current_streak)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  ");
} catch (Exception $e) {
  // ignore
}

// Streak tier configuration
function getStreakTier($streak) {
  if ($streak >= 30) return array('tier' => 'legend', 'name' => 'Legend', 'multiplier' => 2.0, 'color' => '#FFD700');
  if ($streak >= 14) return array('tier' => 'champion', 'name' => 'Champion', 'multiplier' => 1.75, 'color' => '#C0C0C0');
  if ($streak >= 7)  return array('tier' => 'warrior', 'name' => 'Warrior', 'multiplier' => 1.5, 'color' => '#CD7F32');
  if ($streak >= 3)  return array('tier' => 'rising', 'name' => 'Rising', 'multiplier' => 1.25, 'color' => '#10B981');
  return array('tier' => 'starter', 'name' => 'Starter', 'multiplier' => 1.0, 'color' => '#6B7280');
}

function getNextTier($streak) {
  if ($streak < 3)  return array('days_needed' => 3 - $streak,  'tier' => 'rising',   'multiplier' => 1.25);
  if ($streak < 7)  return array('days_needed' => 7 - $streak,  'tier' => 'warrior',  'multiplier' => 1.5);
  if ($streak < 14) return array('days_needed' => 14 - $streak, 'tier' => 'champion', 'multiplier' => 1.75);
  if ($streak < 30) return array('days_needed' => 30 - $streak, 'tier' => 'legend',   'multiplier' => 2.0);
  return null;
}

// ---------- Input ----------
$action = '';
if (isset($_POST['action'])) $action = $_POST['action'];
elseif (isset($_GET['action'])) $action = $_GET['action'];

$username = '';
if (isset($_POST['username'])) $username = trim($_POST['username']);
elseif (isset($_GET['username'])) $username = trim($_GET['username']);

// ---------- Main ----------
try {
  switch ($action) {

    // Debug helper (optional)
    case 'debug_env': {
      $dbName = '';
      $dbHost = '';
      try { $dbName = $pdo->query("SELECT DATABASE()")->fetchColumn(); } catch (Exception $e) {}
      try { $dbHost = $pdo->query("SELECT @@hostname")->fetchColumn(); } catch (Exception $e) {}

      $voteSitesCount = null;
      $sample = array();
      try {
        $voteSitesCount = (int)$pdo->query("SELECT COUNT(*) FROM vote_sites")->fetchColumn();
        $stmt = $pdo->query("SELECT id,name,is_active,cooldown_hours,url FROM vote_sites ORDER BY id DESC LIMIT 10");
        $sample = $stmt->fetchAll(PDO::FETCH_ASSOC);
      } catch (Exception $e) {
        $sample = array('error' => $e->getMessage());
      }

      jsonOut(array(
        'success' => true,
        'db' => array('database' => $dbName, 'hostname' => $dbHost),
        'vote_sites_count' => $voteSitesCount,
        'vote_sites_sample' => $sample
      ));
    } break;

    case 'get_vote_status': {
      if ($username === '') jsonOut(array('success' => false, 'message' => 'Username required'));

      // lookup user
      $user = null;
      try {
        $stmt = $pdo->prepare("SELECT ID FROM users WHERE {$usernameColumn} = ? LIMIT 1");
        $stmt->execute(array($username));
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
      } catch (Exception $e) {
        error_log("RID={$RID} USERS_LOOKUP_FAIL=" . $e->getMessage());
      }

      $coins = 0; $vipPoints = 0; $totalVotes = 0;

      if ($user) {
        // currency
        try {
          $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE user_id = ? LIMIT 1");
          $stmt->execute(array((int)$user['ID']));
          $currency = $stmt->fetch(PDO::FETCH_ASSOC);
          if ($currency) {
            $coins = (int)$currency['coins'];
            $vipPoints = (int)$currency['vip_points'];
          }
        } catch (Exception $e) {
          try {
            $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE username = ? LIMIT 1");
            $stmt->execute(array($username));
            $currency = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($currency) {
              $coins = (int)$currency['coins'];
              $vipPoints = (int)$currency['vip_points'];
            }
          } catch (Exception $e2) {}
        }

        // total votes
        try {
          $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM vote_log WHERE username = ?");
          $stmt->execute(array($username));
          $voteCount = $stmt->fetch(PDO::FETCH_ASSOC);
          $totalVotes = (int)(isset($voteCount['total']) ? $voteCount['total'] : 0);
        } catch (Exception $e) {}
      }

      // streak
      $currentStreak = 0; $longestStreak = 0;
      $streakExpiresAt = null; $lastVoteDate = null;

      try {
        $stmt = $pdo->prepare("SELECT * FROM vote_streaks WHERE username = ? LIMIT 1");
        $stmt->execute(array($username));
        $streakData = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($streakData) {
          $currentStreak = (int)$streakData['current_streak'];
          $longestStreak = (int)$streakData['longest_streak'];
          $lastVoteDate = $streakData['last_vote_date'];
          $streakExpiresAt = $streakData['streak_expires_at'];

          if ($streakExpiresAt && strtotime($streakExpiresAt) < time()) {
            $currentStreak = 0;
            $stmt = $pdo->prepare("UPDATE vote_streaks SET current_streak = 0, streak_expires_at = NULL, updated_at = NOW() WHERE username = ?");
            $stmt->execute(array($username));
          }
        }
      } catch (Exception $e) {}

      $tierInfo = getStreakTier($currentStreak);
      $nextTier = getNextTier($currentStreak);

      // active sites
      $sites = array();
      try {
        $stmt = $pdo->query("SELECT id, cooldown_hours FROM vote_sites WHERE is_active = 1");
        $sites = $stmt->fetchAll(PDO::FETCH_ASSOC);
      } catch (Exception $e) {
        error_log("RID={$RID} VOTE_SITES_QUERY_FAIL=" . $e->getMessage());
        $sites = array();
      }

      // statuses (cooldown)
      $siteStatuses = array();
      foreach ($sites as $site) {
        $siteId = (int)$site['id'];
        $cooldownHours = (int)$site['cooldown_hours'];

        try {
          $stmt = $pdo->prepare("
            SELECT vote_time
            FROM vote_log
            WHERE username = ? AND site_id = ?
            ORDER BY vote_time DESC
            LIMIT 1
          ");
          $stmt->execute(array($username, $siteId));
          $lastVote = $stmt->fetch(PDO::FETCH_ASSOC);

          if ($lastVote && $lastVote['vote_time']) {
            $lastVoteTime = strtotime($lastVote['vote_time']);
            $nextVoteTime = $lastVoteTime + ($cooldownHours * 3600);
            $now = time();

            if ($now < $nextVoteTime) {
              $siteStatuses[$siteId] = array(
                'can_vote' => false,
                'last_vote_time' => date('c', $lastVoteTime),
                'next_vote_time' => date('c', $nextVoteTime),
                'time_remaining' => ($nextVoteTime - $now) * 1000
              );
            } else {
              $siteStatuses[$siteId] = array(
                'can_vote' => true,
                'last_vote_time' => date('c', $lastVoteTime),
                'next_vote_time' => null,
                'time_remaining' => null
              );
            }
          }
        } catch (Exception $e) {}
      }

      jsonOut(array(
        'success' => true,
        'coins' => $coins,
        'vip_points' => $vipPoints,
        'total_votes' => $totalVotes,
        'site_statuses' => $siteStatuses,
        'streak' => array(
          'current' => $currentStreak,
          'longest' => $longestStreak,
          'last_vote_date' => $lastVoteDate,
          'expires_at' => $streakExpiresAt,
          'tier' => $tierInfo,
          'next_tier' => $nextTier,
          'multiplier' => $tierInfo['multiplier']
        )
      ));
    } break;

    case 'submit_vote': {
      if ($username === '') jsonOut(array('success' => false, 'message' => 'Username required'));

      $siteId = 0;
      if (isset($_POST['site_id'])) $siteId = (int)$_POST['site_id'];
      elseif (isset($_GET['site_id'])) $siteId = (int)$_GET['site_id'];

      $fingerprint = '';
      if (isset($_POST['fingerprint'])) $fingerprint = trim($_POST['fingerprint']);

      if (!$siteId) jsonOut(array('success' => false, 'message' => 'Site ID required'));

      // site info
      $stmt = $pdo->prepare("SELECT * FROM vote_sites WHERE id = ? AND is_active = 1 LIMIT 1");
      $stmt->execute(array($siteId));
      $site = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$site) jsonOut(array('success' => false, 'message' => 'Invalid vote site'));

      // cooldown check
      $cooldownHours = (int)$site['cooldown_hours'];
      $stmt = $pdo->prepare("
        SELECT vote_time
        FROM vote_log
        WHERE username = ? AND site_id = ?
        ORDER BY vote_time DESC
        LIMIT 1
      ");
      $stmt->execute(array($username, $siteId));
      $lastVote = $stmt->fetch(PDO::FETCH_ASSOC);

      if ($lastVote && $lastVote['vote_time']) {
        $lastVoteTime = strtotime($lastVote['vote_time']);
        $nextVoteTime = $lastVoteTime + ($cooldownHours * 3600);
        if (time() < $nextVoteTime) {
          $remaining = $nextVoteTime - time();
          $hours = floor($remaining / 3600);
          $minutes = floor(($remaining % 3600) / 60);
          jsonOut(array(
            'success' => false,
            'message' => "You can vote again in {$hours}h {$minutes}m",
            'next_vote_time' => date('c', $nextVoteTime)
          ));
        }
      }

      // user id
      $userId = 0;
      try {
        $stmt = $pdo->prepare("SELECT ID FROM users WHERE {$usernameColumn} = ? LIMIT 1");
        $stmt->execute(array($username));
        $u = $stmt->fetch(PDO::FETCH_ASSOC);
        $userId = $u ? (int)$u['ID'] : 0;
      } catch (Exception $e) {
        error_log("RID={$RID} USERS_LOOKUP_FAIL=" . $e->getMessage());
      }

      // streak logic
      $today = date('Y-m-d');
      $yesterday = date('Y-m-d', strtotime('-1 day'));
      $currentStreak = 0; $longestStreak = 0; $streakIncreased = false;

      try {
        $stmt = $pdo->prepare("SELECT * FROM vote_streaks WHERE username = ? LIMIT 1");
        $stmt->execute(array($username));
        $streakData = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($streakData) {
          $currentStreak = (int)$streakData['current_streak'];
          $longestStreak = (int)$streakData['longest_streak'];
          $lastVoteDate = $streakData['last_vote_date'];
          $streakExpiresAt = $streakData['streak_expires_at'];

          // Check if streak expired (36h window passed)
          $streakExpired = $streakExpiresAt && strtotime($streakExpiresAt) < time();

          if ($lastVoteDate === $today) {
            // Already voted today - streak unchanged (don't increment again)
            $streakIncreased = false;
          } elseif ($lastVoteDate === $yesterday || !$streakExpired) {
            // Voted yesterday OR still within 36h window - continue streak
            $currentStreak++;
            $streakIncreased = true;
            if ($currentStreak > $longestStreak) $longestStreak = $currentStreak;
          } else {
            // Streak broken - start fresh
            $currentStreak = 1;
            $streakIncreased = true;
            // Keep longest streak as-is
          }
        } else {
          // First vote ever
          $currentStreak = 1;
          $longestStreak = 1;
          $streakIncreased = true;
        }
      } catch (Exception $e) {
        $currentStreak = 1;
        $longestStreak = 1;
        $streakIncreased = true;
      }

      // expiration 36h
      $streakExpiresAt = date('Y-m-d H:i:s', time() + (36 * 3600));

      $tierInfo = getStreakTier($currentStreak);
      $multiplier = $tierInfo['multiplier'];

      $baseCoins = (int)$site['coins_reward'];
      $baseVip   = (int)$site['vip_reward'];

      $coinsReward = (int)round($baseCoins * $multiplier);
      $vipReward   = (int)round($baseVip * $multiplier);

      $bonusCoins = $coinsReward - $baseCoins;
      $bonusVip   = $vipReward - $baseVip;

      $ipAddress = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';

      // ---------- INSERT vote_log (with error tracing) ----------
      try {
        $stmt = $pdo->prepare("
          INSERT INTO vote_log (
            user_id, username, site_id, fingerprint, ip_address,
            coins_earned, vip_earned, streak_bonus, vote_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute(array(
          $userId,
          $username,
          $siteId,
          $fingerprint,
          $ipAddress,
          $coinsReward,
          $vipReward,
          $multiplier
        ));
      } catch (Exception $e) {
        error_log("RID={$RID} VOTE_LOG_INSERT_FAIL=" . $e->getMessage());
        jsonFail(500, 'Failed to record vote', array('reason' => 'vote_log insert failed'));
      }

      // update currency (schema-safe)
      try {
        $cols = $pdo->query("SHOW COLUMNS FROM user_currency")->fetchAll(PDO::FETCH_COLUMN);

        if (in_array('user_id', $cols, true) && $userId > 0) {
          $stmt = $pdo->prepare("
            INSERT INTO user_currency (user_id, coins, vip_points)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
              coins = coins + VALUES(coins),
              vip_points = vip_points + VALUES(vip_points)
          ");
          $stmt->execute(array($userId, $coinsReward, $vipReward));
        } elseif (in_array('username', $cols, true)) {
          $stmt = $pdo->prepare("
            INSERT INTO user_currency (username, coins, vip_points)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
              coins = coins + VALUES(coins),
              vip_points = vip_points + VALUES(vip_points)
          ");
          $stmt->execute(array($username, $coinsReward, $vipReward));
        }
      } catch (Exception $e) {
        error_log("RID={$RID} USER_CURRENCY_UPDATE_FAIL=" . $e->getMessage());
      }

      // streak upsert
      try {
        $bonusTotal = (int)($bonusCoins + $bonusVip);

        $stmt = $pdo->prepare("
          INSERT INTO vote_streaks (username, current_streak, longest_streak, last_vote_date, streak_expires_at, total_bonus_earned, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
            current_streak = VALUES(current_streak),
            longest_streak = GREATEST(longest_streak, VALUES(longest_streak)),
            last_vote_date = VALUES(last_vote_date),
            streak_expires_at = VALUES(streak_expires_at),
            total_bonus_earned = total_bonus_earned + ?,
            updated_at = NOW()
        ");
        $stmt->execute(array($username, $currentStreak, $longestStreak, $today, $streakExpiresAt, $bonusTotal, $bonusTotal));
      } catch (Exception $e) {
        error_log("RID={$RID} STREAK_UPDATE_FAIL=" . $e->getMessage());
      }

      // fetch new totals
      $newCoins = $coinsReward;
      $newVip   = $vipReward;

      try {
        $cols = $pdo->query("SHOW COLUMNS FROM user_currency")->fetchAll(PDO::FETCH_COLUMN);

        if (in_array('user_id', $cols, true) && $userId > 0) {
          $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE user_id = ? LIMIT 1");
          $stmt->execute(array($userId));
        } else {
          $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE username = ? LIMIT 1");
          $stmt->execute(array($username));
        }

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
          $newCoins = (int)$row['coins'];
          $newVip   = (int)$row['vip_points'];
        }
      } catch (Exception $e) {}

      $nextVoteTime = time() + ($cooldownHours * 3600);
      $nextTier = getNextTier($currentStreak);

      jsonOut(array(
        'success' => true,
        'message' => 'Vote recorded successfully!',
        'coins_earned' => $coinsReward,
        'vip_points_earned' => $vipReward,
        'bonus_coins' => $bonusCoins,
        'bonus_vip' => $bonusVip,
        'new_coins_total' => $newCoins,
        'new_vip_total' => $newVip,
        'next_vote_time' => date('c', $nextVoteTime),
        'streak' => array(
          'current' => $currentStreak,
          'longest' => $longestStreak,
          'increased' => $streakIncreased,
          'tier' => $tierInfo,
          'next_tier' => $nextTier,
          'multiplier' => $multiplier,
          'expires_at' => $streakExpiresAt
        )
      ));
    } break;

    case 'get_streak_leaderboard': {
      $limit = 10;
      if (isset($_GET['limit'])) $limit = (int)$_GET['limit'];
      $limit = min($limit, 50);

      try {
        $stmt = $pdo->prepare("
          SELECT username, current_streak, longest_streak, last_vote_date, total_bonus_earned
          FROM vote_streaks
          WHERE current_streak > 0
          ORDER BY current_streak DESC, longest_streak DESC
          LIMIT ?
        ");
        $stmt->execute(array($limit));
        $leaders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($leaders as $k => $leader) {
          $leaders[$k]['tier'] = getStreakTier((int)$leader['current_streak']);
        }

        jsonOut(array('success' => true, 'leaderboard' => $leaders));
      } catch (Exception $e) {
        jsonOut(array('success' => true, 'leaderboard' => array()));
      }
    } break;

    default:
      jsonOut(array('success' => false, 'message' => 'Invalid action'));
  }
} catch (Exception $e) {
  error_log("RID={$RID} FATAL=" . $e->getMessage());
  jsonFail(500, 'Server error', array('reason' => 'unexpected exception'));
}
