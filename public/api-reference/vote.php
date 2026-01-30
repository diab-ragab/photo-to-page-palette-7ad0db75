<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$pdo = getDB();

// Ensure vote_log table exists
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
            voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_site (user_id, site_id),
            INDEX idx_username_site (username, site_id),
            INDEX idx_voted_at (voted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // Ensure vote_streaks table exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS vote_streaks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            current_streak INT NOT NULL DEFAULT 0,
            longest_streak INT NOT NULL DEFAULT 0,
            last_vote_date DATE DEFAULT NULL,
            streak_expires_at DATETIME DEFAULT NULL,
            total_bonus_earned INT NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_username (username),
            INDEX idx_current_streak (current_streak DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
} catch (Exception $e) {
    // Tables may already exist
}

// Streak tier configuration
function getStreakTier(int $streak): array {
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

// Get next tier info
function getNextTier(int $streak): ?array {
    if ($streak < 3) {
        return ['days_needed' => 3 - $streak, 'tier' => 'rising', 'multiplier' => 1.25];
    } elseif ($streak < 7) {
        return ['days_needed' => 7 - $streak, 'tier' => 'warrior', 'multiplier' => 1.5];
    } elseif ($streak < 14) {
        return ['days_needed' => 14 - $streak, 'tier' => 'champion', 'multiplier' => 1.75];
    } elseif ($streak < 30) {
        return ['days_needed' => 30 - $streak, 'tier' => 'legend', 'multiplier' => 2.0];
    }
    return null; // Already at max tier
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$username = trim($_POST['username'] ?? $_GET['username'] ?? '');

switch ($action) {
    case 'get_vote_status':
        if (empty($username)) {
            echo json_encode(['success' => false, 'error' => 'Username required']);
            exit;
        }

        // Get user info
        $stmt = $pdo->prepare("SELECT ID FROM users WHERE name = ? LIMIT 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            // Try memb_info table (legacy)
            $stmt = $pdo->prepare("SELECT memb___id as ID FROM memb_info WHERE memb___id = ? LIMIT 1");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        // Get user currency
        $coins = 0;
        $vipPoints = 0;
        $totalVotes = 0;

        if ($user) {
            // Get from user_currency table
            $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE username = ? LIMIT 1");
            $stmt->execute([$username]);
            $currency = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($currency) {
                $coins = (int)$currency['coins'];
                $vipPoints = (int)$currency['vip_points'];
            }

            // Get total votes count
            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM vote_log WHERE username = ?");
            $stmt->execute([$username]);
            $voteCount = $stmt->fetch(PDO::FETCH_ASSOC);
            $totalVotes = (int)($voteCount['total'] ?? 0);
        }

        // Get streak data
        $stmt = $pdo->prepare("SELECT * FROM vote_streaks WHERE username = ? LIMIT 1");
        $stmt->execute([$username]);
        $streakData = $stmt->fetch(PDO::FETCH_ASSOC);

        $currentStreak = 0;
        $longestStreak = 0;
        $streakExpiresAt = null;
        $lastVoteDate = null;

        if ($streakData) {
            $currentStreak = (int)$streakData['current_streak'];
            $longestStreak = (int)$streakData['longest_streak'];
            $lastVoteDate = $streakData['last_vote_date'];
            $streakExpiresAt = $streakData['streak_expires_at'];

            // Check if streak has expired (36-hour window: 12h cooldown + 24h grace)
            if ($streakExpiresAt && strtotime($streakExpiresAt) < time()) {
                // Streak expired, reset it
                $currentStreak = 0;
                $stmt = $pdo->prepare("UPDATE vote_streaks SET current_streak = 0, streak_expires_at = NULL WHERE username = ?");
                $stmt->execute([$username]);
            }
        }

        $tierInfo = getStreakTier($currentStreak);
        $nextTier = getNextTier($currentStreak);

        // Get all active vote sites
        $stmt = $pdo->query("SELECT id, cooldown_hours FROM vote_sites WHERE is_active = 1");
        $sites = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Check vote status for each site
        $siteStatuses = [];
        foreach ($sites as $site) {
            $siteId = (int)$site['id'];
            $cooldownHours = (int)$site['cooldown_hours'];

            // Get last vote time for this site
            $stmt = $pdo->prepare("
                SELECT voted_at 
                FROM vote_log 
                WHERE username = ? AND site_id = ? 
                ORDER BY voted_at DESC 
                LIMIT 1
            ");
            $stmt->execute([$username, $siteId]);
            $lastVote = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($lastVote) {
                $lastVoteTime = strtotime($lastVote['voted_at']);
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
            } else {
                // Never voted on this site
                $siteStatuses[$siteId] = [
                    'can_vote' => true,
                    'last_vote_time' => null,
                    'next_vote_time' => null,
                    'time_remaining' => null
                ];
            }
        }

        echo json_encode([
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
        if (empty($username)) {
            echo json_encode(['success' => false, 'message' => 'Username required']);
            exit;
        }

        $siteId = (int)($_POST['site_id'] ?? $_GET['site_id'] ?? 0);
        $fingerprint = trim($_POST['fingerprint'] ?? '');

        if (!$siteId) {
            echo json_encode(['success' => false, 'message' => 'Site ID required']);
            exit;
        }

        // Get site info
        $stmt = $pdo->prepare("SELECT * FROM vote_sites WHERE id = ? AND is_active = 1 LIMIT 1");
        $stmt->execute([$siteId]);
        $site = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$site) {
            echo json_encode(['success' => false, 'message' => 'Invalid vote site']);
            exit;
        }

        // Check cooldown
        $cooldownHours = (int)$site['cooldown_hours'];
        $stmt = $pdo->prepare("
            SELECT voted_at 
            FROM vote_log 
            WHERE username = ? AND site_id = ? 
            ORDER BY voted_at DESC 
            LIMIT 1
        ");
        $stmt->execute([$username, $siteId]);
        $lastVote = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($lastVote) {
            $lastVoteTime = strtotime($lastVote['voted_at']);
            $nextVoteTime = $lastVoteTime + ($cooldownHours * 3600);
            
            if (time() < $nextVoteTime) {
                $remaining = $nextVoteTime - time();
                $hours = floor($remaining / 3600);
                $minutes = floor(($remaining % 3600) / 60);
                
                echo json_encode([
                    'success' => false,
                    'message' => "You can vote again in {$hours}h {$minutes}m",
                    'next_vote_time' => date('c', $nextVoteTime)
                ]);
                exit;
            }
        }

        // Get user ID
        $stmt = $pdo->prepare("SELECT ID FROM users WHERE name = ? LIMIT 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        $userId = $user ? (int)$user['ID'] : 0;

        // Handle streak logic
        $today = date('Y-m-d');
        $stmt = $pdo->prepare("SELECT * FROM vote_streaks WHERE username = ? LIMIT 1");
        $stmt->execute([$username]);
        $streakData = $stmt->fetch(PDO::FETCH_ASSOC);

        $currentStreak = 0;
        $longestStreak = 0;
        $streakIncreased = false;

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

        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';

        // Record the vote
        $stmt = $pdo->prepare("
            INSERT INTO vote_log (user_id, username, site_id, fingerprint, ip_address, coins_earned, vip_earned, streak_bonus)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$userId, $username, $siteId, $fingerprint, $ipAddress, $coinsReward, $vipReward, $multiplier]);

        // Update user currency
        $stmt = $pdo->prepare("
            INSERT INTO user_currency (username, coins, vip_points)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                coins = coins + VALUES(coins),
                vip_points = vip_points + VALUES(vip_points)
        ");
        $stmt->execute([$username, $coinsReward, $vipReward]);

        // Update streak data
        $stmt = $pdo->prepare("
            INSERT INTO vote_streaks (username, current_streak, longest_streak, last_vote_date, streak_expires_at, total_bonus_earned)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                current_streak = VALUES(current_streak),
                longest_streak = GREATEST(longest_streak, VALUES(longest_streak)),
                last_vote_date = VALUES(last_vote_date),
                streak_expires_at = VALUES(streak_expires_at),
                total_bonus_earned = total_bonus_earned + ?
        ");
        $stmt->execute([$username, $currentStreak, $longestStreak, $today, $streakExpiresAt, $bonusCoins + $bonusVip, $bonusCoins + $bonusVip]);

        // Get new totals
        $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE username = ? LIMIT 1");
        $stmt->execute([$username]);
        $newCurrency = $stmt->fetch(PDO::FETCH_ASSOC);

        $nextVoteTime = time() + ($cooldownHours * 3600);
        $nextTier = getNextTier($currentStreak);

        echo json_encode([
            'success' => true,
            'message' => 'Vote recorded successfully!',
            'coins_earned' => $coinsReward,
            'vip_points_earned' => $vipReward,
            'bonus_coins' => $bonusCoins,
            'bonus_vip' => $bonusVip,
            'new_coins_total' => (int)($newCurrency['coins'] ?? $coinsReward),
            'new_vip_total' => (int)($newCurrency['vip_points'] ?? $vipReward),
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
        $limit = min((int)($_GET['limit'] ?? 10), 50);
        
        $stmt = $pdo->prepare("
            SELECT username, current_streak, longest_streak, last_vote_date, total_bonus_earned
            FROM vote_streaks 
            WHERE current_streak > 0
            ORDER BY current_streak DESC, longest_streak DESC
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        $leaders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Add tier info to each leader
        foreach ($leaders as &$leader) {
            $leader['tier'] = getStreakTier((int)$leader['current_streak']);
        }

        echo json_encode([
            'success' => true,
            'leaderboard' => $leaders
        ]);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
}
