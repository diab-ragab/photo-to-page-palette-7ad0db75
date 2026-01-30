<?php
/**
 * vote.php - Voting system API
 * MySQL 5.1 compatible (no DEFAULT CURRENT_TIMESTAMP)
 * Uses vote_time column in vote_log
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

define('VERSION', '2026-01-30-C');

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

// Polyfill for older PHP versions
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
    // JSON_UNESCAPED_UNICODE exists since PHP 5.4; fall back safely.
    $flags = 0;
    if (defined('JSON_UNESCAPED_UNICODE')) {
        $flags = JSON_UNESCAPED_UNICODE;
    }
    echo json_encode(array_merge($data, array('rid' => $RID, '_version' => VERSION)), $flags);
    exit;
}

function jsonFail($code, $msg) {
    http_response_code($code);
    jsonOut(['success' => false, 'message' => $msg]);
}

try {
    $pdo = getDB();
} catch (Exception $e) {
    error_log("RID={$RID} DB_FAIL=" . $e->getMessage());
    jsonFail(503, 'Service temporarily unavailable');
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
    // Table may already exist
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
            INDEX idx_current_streak (current_streak DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
} catch (Exception $e) {
    // Table may already exist
}

// Streak tier configuration
function getStreakTier($streak) {
    if ($streak >= 30) {
        return ['tier' => 'legend', 'name' => 'Legend', 'multiplier' => 2.0, 'color' => '#FFD700'];
    } elseif ($streak >= 14) {
        return ['tier' => 'champion', 'name' => 'Champion', 'multiplier' => 1.75, 'color' => '#C0C0C0'];
    } elseif ($streak >= 7) {
        return ['tier' => 'warrior', 'name' => 'Warrior', 'multiplier' => 1.5, 'color' => '#CD7F32'];
    } elseif ($streak >= 3) {
        return ['tier' => 'rising', 'name' => 'Rising', 'multiplier' => 1.25, 'color' => '#10B981'];
    } else {
        return ['tier' => 'starter', 'name' => 'Starter', 'multiplier' => 1.0, 'color' => '#6B7280'];
    }
}

function getNextTier($streak) {
    if ($streak < 3) {
        return ['days_needed' => 3 - $streak, 'tier' => 'rising', 'multiplier' => 1.25];
    } elseif ($streak < 7) {
        return ['days_needed' => 7 - $streak, 'tier' => 'warrior', 'multiplier' => 1.5];
    } elseif ($streak < 14) {
        return ['days_needed' => 14 - $streak, 'tier' => 'champion', 'multiplier' => 1.75];
    } elseif ($streak < 30) {
        return ['days_needed' => 30 - $streak, 'tier' => 'legend', 'multiplier' => 2.0];
    }
    return null;
}

$action = '';
if (isset($_POST['action'])) {
    $action = $_POST['action'];
} elseif (isset($_GET['action'])) {
    $action = $_GET['action'];
}

$username = '';
if (isset($_POST['username'])) {
    $username = trim($_POST['username']);
} elseif (isset($_GET['username'])) {
    $username = trim($_GET['username']);
}

switch ($action) {
    case 'get_vote_status':
        if ($username === '') {
            jsonOut(['success' => false, 'error' => 'Username required']);
        }

        // Get user info
        $stmt = $pdo->prepare("SELECT ID FROM users WHERE name = ? LIMIT 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // Get user currency
        $coins = 0;
        $vipPoints = 0;
        $totalVotes = 0;

        if ($user) {
            // Get from user_currency table (try both user_id and username)
            try {
                $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE user_id = ? LIMIT 1");
                $stmt->execute([(int)$user['ID']]);
                $currency = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($currency) {
                    $coins = (int)$currency['coins'];
                    $vipPoints = (int)$currency['vip_points'];
                }
            } catch (Exception $e) {
                // Try username column
                try {
                    $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE username = ? LIMIT 1");
                    $stmt->execute([$username]);
                    $currency = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($currency) {
                        $coins = (int)$currency['coins'];
                        $vipPoints = (int)$currency['vip_points'];
                    }
                } catch (Exception $e2) {
                    // Continue with zeros
                }
            }

            // Get total votes count
            try {
                $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM vote_log WHERE username = ?");
                $stmt->execute([$username]);
                $voteCount = $stmt->fetch(PDO::FETCH_ASSOC);
                $totalVotes = (int)(isset($voteCount['total']) ? $voteCount['total'] : 0);
            } catch (Exception $e) {
                // Continue with zero
            }
        }

        // Get streak data
        $currentStreak = 0;
        $longestStreak = 0;
        $streakExpiresAt = null;
        $lastVoteDate = null;

        try {
            $stmt = $pdo->prepare("SELECT * FROM vote_streaks WHERE username = ? LIMIT 1");
            $stmt->execute([$username]);
            $streakData = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($streakData) {
                $currentStreak = (int)$streakData['current_streak'];
                $longestStreak = (int)$streakData['longest_streak'];
                $lastVoteDate = $streakData['last_vote_date'];
                $streakExpiresAt = $streakData['streak_expires_at'];

                // Check if streak has expired
                if ($streakExpiresAt && strtotime($streakExpiresAt) < time()) {
                    $currentStreak = 0;
                    $stmt = $pdo->prepare("UPDATE vote_streaks SET current_streak = 0, streak_expires_at = NULL, updated_at = NOW() WHERE username = ?");
                    $stmt->execute([$username]);
                }
            }
        } catch (Exception $e) {
            // Continue with defaults
        }

        $tierInfo = getStreakTier($currentStreak);
        $nextTier = getNextTier($currentStreak);

        // Get all active vote sites
        $sites = [];
        try {
            $stmt = $pdo->query("SELECT id, cooldown_hours FROM vote_sites WHERE is_active = 1");
            $sites = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            // No sites
        }

        // Check vote status for each site - KEY FIX: use vote_time column
        $siteStatuses = [];
        foreach ($sites as $site) {
            $siteId = (int)$site['id'];
            $cooldownHours = (int)$site['cooldown_hours'];

            // Get last vote time for this site (using vote_time column)
            try {
                $stmt = $pdo->prepare("
                    SELECT vote_time 
                    FROM vote_log 
                    WHERE username = ? AND site_id = ? 
                    ORDER BY vote_time DESC 
                    LIMIT 1
                ");
                $stmt->execute([$username, $siteId]);
                $lastVote = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($lastVote && $lastVote['vote_time']) {
                    $lastVoteTime = strtotime($lastVote['vote_time']);
                    $nextVoteTime = $lastVoteTime + ($cooldownHours * 3600);
                    $now = time();

                    if ($now < $nextVoteTime) {
                        // Still in cooldown
                        $siteStatuses[$siteId] = [
                            'can_vote' => false,
                            'last_vote_time' => date('c', $lastVoteTime),
                            'next_vote_time' => date('c', $nextVoteTime),
                            'time_remaining' => ($nextVoteTime - $now) * 1000
                        ];
                    } else {
                        // Cooldown expired, can vote
                        $siteStatuses[$siteId] = [
                            'can_vote' => true,
                            'last_vote_time' => date('c', $lastVoteTime),
                            'next_vote_time' => null,
                            'time_remaining' => null
                        ];
                    }
                }
                // If no lastVote, don't add to siteStatuses - frontend will treat as never voted
            } catch (Exception $e) {
                // Skip this site
            }
        }

        jsonOut([
            'success' => true,
            'coins' => $coins,
            'vip_points' => $vipPoints,
            'total_votes' => $totalVotes,
            'site_statuses' => $siteStatuses,
            'streak' => [
                'current' => $currentStreak,
                'longest' => $longestStreak,
                'last_vote_date' => $lastVoteDate,
                'expires_at' => $streakExpiresAt,
                'tier' => $tierInfo,
                'next_tier' => $nextTier,
                'multiplier' => $tierInfo['multiplier']
            ]
        ]);
        break;

    case 'submit_vote':
        if ($username === '') {
            jsonOut(['success' => false, 'message' => 'Username required']);
        }

        $siteId = 0;
        if (isset($_POST['site_id'])) {
            $siteId = (int)$_POST['site_id'];
        } elseif (isset($_GET['site_id'])) {
            $siteId = (int)$_GET['site_id'];
        }

        $fingerprint = '';
        if (isset($_POST['fingerprint'])) {
            $fingerprint = trim($_POST['fingerprint']);
        }

        if (!$siteId) {
            jsonOut(['success' => false, 'message' => 'Site ID required']);
        }

        // Get site info
        $stmt = $pdo->prepare("SELECT * FROM vote_sites WHERE id = ? AND is_active = 1 LIMIT 1");
        $stmt->execute([$siteId]);
        $site = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$site) {
            jsonOut(['success' => false, 'message' => 'Invalid vote site']);
        }

        // Check cooldown (using vote_time column)
        $cooldownHours = (int)$site['cooldown_hours'];
        $stmt = $pdo->prepare("
            SELECT vote_time 
            FROM vote_log 
            WHERE username = ? AND site_id = ? 
            ORDER BY vote_time DESC 
            LIMIT 1
        ");
        $stmt->execute([$username, $siteId]);
        $lastVote = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($lastVote && $lastVote['vote_time']) {
            $lastVoteTime = strtotime($lastVote['vote_time']);
            $nextVoteTime = $lastVoteTime + ($cooldownHours * 3600);
            
            if (time() < $nextVoteTime) {
                $remaining = $nextVoteTime - time();
                $hours = floor($remaining / 3600);
                $minutes = floor(($remaining % 3600) / 60);
                
                jsonOut([
                    'success' => false,
                    'message' => "You can vote again in {$hours}h {$minutes}m",
                    'next_vote_time' => date('c', $nextVoteTime)
                ]);
            }
        }

        // Get user ID
        $stmt = $pdo->prepare("SELECT ID FROM users WHERE name = ? LIMIT 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        $userId = $user ? (int)$user['ID'] : 0;

        // Handle streak logic
        $today = date('Y-m-d');
        $currentStreak = 0;
        $longestStreak = 0;
        $streakIncreased = false;

        try {
            $stmt = $pdo->prepare("SELECT * FROM vote_streaks WHERE username = ? LIMIT 1");
            $stmt->execute([$username]);
            $streakData = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($streakData) {
                $currentStreak = (int)$streakData['current_streak'];
                $longestStreak = (int)$streakData['longest_streak'];
                $lastVoteDate = $streakData['last_vote_date'];
                $streakExpiresAt = $streakData['streak_expires_at'];

                // Check if streak expired
                if ($streakExpiresAt && strtotime($streakExpiresAt) < time()) {
                    $currentStreak = 0;
                }

                // Check if this is a new day's vote
                if ($lastVoteDate !== $today) {
                    $currentStreak++;
                    $streakIncreased = true;
                    if ($currentStreak > $longestStreak) {
                        $longestStreak = $currentStreak;
                    }
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

        // Calculate streak expiration (36 hours from now)
        $streakExpiresAt = date('Y-m-d H:i:s', time() + (36 * 3600));

        // Get tier and multiplier
        $tierInfo = getStreakTier($currentStreak);
        $multiplier = $tierInfo['multiplier'];

        // Calculate rewards with multiplier
        $baseCoins = (int)$site['coins_reward'];
        $baseVip = (int)$site['vip_reward'];
        $coinsReward = (int)round($baseCoins * $multiplier);
        $vipReward = (int)round($baseVip * $multiplier);
        $bonusCoins = $coinsReward - $baseCoins;
        $bonusVip = $vipReward - $baseVip;

        $ipAddress = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';

        // Record the vote (using vote_time with NOW())
        $stmt = $pdo->prepare("
            INSERT INTO vote_log (user_id, username, site_id, fingerprint, ip_address, coins_earned, vip_earned, streak_bonus, vote_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$userId, $username, $siteId, $fingerprint, $ipAddress, $coinsReward, $vipReward, $multiplier]);

        // Update user currency - try user_id first, then username
        try {
            // First, check if table uses user_id or username
            $cols = $pdo->query("SHOW COLUMNS FROM user_currency")->fetchAll(PDO::FETCH_COLUMN);
            
            if (in_array('user_id', $cols, true) && $userId > 0) {
                $stmt = $pdo->prepare("
                    INSERT INTO user_currency (user_id, coins, vip_points)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        coins = coins + VALUES(coins),
                        vip_points = vip_points + VALUES(vip_points)
                ");
                $stmt->execute([$userId, $coinsReward, $vipReward]);
            } elseif (in_array('username', $cols, true)) {
                $stmt = $pdo->prepare("
                    INSERT INTO user_currency (username, coins, vip_points)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        coins = coins + VALUES(coins),
                        vip_points = vip_points + VALUES(vip_points)
                ");
                $stmt->execute([$username, $coinsReward, $vipReward]);
            }
        } catch (Exception $e) {
            error_log("RID={$RID} USER_CURRENCY_UPDATE=" . $e->getMessage());
        }

        // Update streak data
        try {
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
            $stmt->execute([$username, $currentStreak, $longestStreak, $today, $streakExpiresAt, $bonusCoins + $bonusVip, $bonusCoins + $bonusVip]);
        } catch (Exception $e) {
            error_log("RID={$RID} STREAK_UPDATE=" . $e->getMessage());
        }

        // Get new totals
        $newCoins = $coinsReward;
        $newVip = $vipReward;
        try {
            $cols = $pdo->query("SHOW COLUMNS FROM user_currency")->fetchAll(PDO::FETCH_COLUMN);
            if (in_array('user_id', $cols, true) && $userId > 0) {
                $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE user_id = ? LIMIT 1");
                $stmt->execute([$userId]);
            } else {
                $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE username = ? LIMIT 1");
                $stmt->execute([$username]);
            }
            $newCurrency = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($newCurrency) {
                $newCoins = (int)$newCurrency['coins'];
                $newVip = (int)$newCurrency['vip_points'];
            }
        } catch (Exception $e) {
            // Use reward values
        }

        $nextVoteTime = time() + ($cooldownHours * 3600);
        $nextTier = getNextTier($currentStreak);

        jsonOut([
            'success' => true,
            'message' => 'Vote recorded successfully!',
            'coins_earned' => $coinsReward,
            'vip_points_earned' => $vipReward,
            'bonus_coins' => $bonusCoins,
            'bonus_vip' => $bonusVip,
            'new_coins_total' => $newCoins,
            'new_vip_total' => $newVip,
            'next_vote_time' => date('c', $nextVoteTime),
            'streak' => [
                'current' => $currentStreak,
                'longest' => $longestStreak,
                'increased' => $streakIncreased,
                'tier' => $tierInfo,
                'next_tier' => $nextTier,
                'multiplier' => $multiplier,
                'expires_at' => $streakExpiresAt
            ]
        ]);
        break;

    case 'get_streak_leaderboard':
        $limit = 10;
        if (isset($_GET['limit'])) {
            $limit = (int)$_GET['limit'];
        }
        $limit = min($limit, 50);
        
        try {
            $stmt = $pdo->prepare("
                SELECT username, current_streak, longest_streak, last_vote_date, total_bonus_earned
                FROM vote_streaks 
                WHERE current_streak > 0
                ORDER BY current_streak DESC, longest_streak DESC
                LIMIT ?
            ");
            $stmt->execute([$limit]);
            $leaders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($leaders as &$leader) {
                $leader['tier'] = getStreakTier((int)$leader['current_streak']);
            }

            jsonOut([
                'success' => true,
                'leaderboard' => $leaders
            ]);
        } catch (Exception $e) {
            jsonOut([
                'success' => true,
                'leaderboard' => []
            ]);
        }
        break;

    default:
        jsonOut(['success' => false, 'error' => 'Invalid action']);
}
