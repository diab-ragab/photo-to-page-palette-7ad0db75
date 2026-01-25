<?php
require_once __DIR__ . '/config.php';
handleCors(['POST', 'OPTIONS']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonFail(405, 'Method not allowed');
}

$pdo = getDB();

// Ensure tables exist
$pdo->exec("
    CREATE TABLE IF NOT EXISTS vote_sites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        url VARCHAR(500) NOT NULL,
        image_url VARCHAR(500) DEFAULT NULL,
        coins_reward INT DEFAULT 50,
        vip_reward INT DEFAULT 25,
        cooldown_hours INT DEFAULT 12,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$pdo->exec("
    CREATE TABLE IF NOT EXISTS vote_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        site_id INT DEFAULT NULL,
        fingerprint VARCHAR(128) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        coins_earned INT DEFAULT 0,
        vip_points_earned INT DEFAULT 0,
        streak_multiplier DECIMAL(3,2) DEFAULT 1.00,
        voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_site_vote (username, site_id, voted_at),
        INDEX idx_fingerprint (fingerprint),
        INDEX idx_voted_at (voted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$pdo->exec("
    CREATE TABLE IF NOT EXISTS user_currency (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        coins INT DEFAULT 0,
        vip_points INT DEFAULT 0,
        zen BIGINT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$pdo->exec("
    CREATE TABLE IF NOT EXISTS vote_streaks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        current_streak INT DEFAULT 0,
        longest_streak INT DEFAULT 0,
        last_streak_vote DATETIME DEFAULT NULL,
        streak_expires_at DATETIME DEFAULT NULL,
        INDEX idx_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$pdo->exec("
    CREATE TABLE IF NOT EXISTS vote_streak_rewards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        min_streak INT NOT NULL,
        max_streak INT DEFAULT NULL,
        multiplier DECIMAL(3,2) DEFAULT 1.00,
        bonus_coins INT DEFAULT 0,
        bonus_vip INT DEFAULT 0,
        badge_name VARCHAR(50) DEFAULT NULL,
        badge_icon VARCHAR(10) DEFAULT NULL,
        is_active BOOLEAN DEFAULT TRUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

// Insert default streak tiers if empty
$checkTiers = $pdo->query("SELECT COUNT(*) FROM vote_streak_rewards")->fetchColumn();
if ($checkTiers == 0) {
    $pdo->exec("
        INSERT INTO vote_streak_rewards (min_streak, max_streak, multiplier, bonus_coins, bonus_vip, badge_name, badge_icon) VALUES
        (1, 2, 1.00, 0, 0, NULL, NULL),
        (3, 6, 1.25, 10, 5, 'Dedicated Voter', '🔥'),
        (7, 13, 1.50, 25, 15, 'Week Warrior', '⭐'),
        (14, 29, 1.75, 50, 30, 'Fortnight Champion', '💎'),
        (30, NULL, 2.00, 100, 50, 'Monthly Legend', '👑')
    ");
}

function canVoteOnSite($pdo, $username, $fingerprint, $ip, $siteId, $cooldownHours) {
    $cooldownTime = date('Y-m-d H:i:s', strtotime("-{$cooldownHours} hours"));
    $stmt = $pdo->prepare("
        SELECT voted_at FROM vote_log 
        WHERE site_id = ? AND (username = ? OR fingerprint = ? OR ip_address = ?) 
        AND voted_at > ? 
        ORDER BY voted_at DESC LIMIT 1
    ");
    $stmt->execute([$siteId, $username, $fingerprint, $ip, $cooldownTime]);
    return $stmt->fetch();
}

function getStreakTier($pdo, $streak) {
    $stmt = $pdo->prepare("
        SELECT * FROM vote_streak_rewards 
        WHERE is_active = 1 AND min_streak <= ? AND (max_streak IS NULL OR max_streak >= ?) 
        ORDER BY min_streak DESC LIMIT 1
    ");
    $stmt->execute([$streak, $streak]);
    return $stmt->fetch();
}

function updateStreak($pdo, $username) {
    $now = new DateTime();
    
    $stmt = $pdo->prepare("SELECT * FROM vote_streaks WHERE username = ?");
    $stmt->execute([$username]);
    $streak = $stmt->fetch();
    
    if ($streak && $streak['streak_expires_at'] && new DateTime($streak['streak_expires_at']) > $now) {
        $newStreak = $streak['current_streak'] + 1;
        $longestStreak = max($newStreak, $streak['longest_streak']);
    } else {
        $newStreak = 1;
        $longestStreak = $streak ? max(1, $streak['longest_streak']) : 1;
    }
    
    $expiresAt = (clone $now)->modify('+36 hours')->format('Y-m-d H:i:s');
    $nowStr = $now->format('Y-m-d H:i:s');
    
    $stmt = $pdo->prepare("
        INSERT INTO vote_streaks (username, current_streak, longest_streak, last_streak_vote, streak_expires_at) 
        VALUES (?, ?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE 
            current_streak = VALUES(current_streak), 
            longest_streak = VALUES(longest_streak), 
            last_streak_vote = VALUES(last_streak_vote), 
            streak_expires_at = VALUES(streak_expires_at)
    ");
    $stmt->execute([$username, $newStreak, $longestStreak, $nowStr, $expiresAt]);
    
    return ['new_streak' => $newStreak, 'longest_streak' => $longestStreak, 'expires_at' => $expiresAt];
}

$input = getJsonInput();
$_POST = array_merge($_POST, $input);

$action = $_POST['action'] ?? '';
$username = preg_replace('/[^a-zA-Z0-9_-]/', '', trim($_POST['username'] ?? ''));
$fingerprint = sanitizeInput($_POST['fingerprint'] ?? '', 128);
$siteId = isset($_POST['site_id']) ? (int)$_POST['site_id'] : null;

if (empty($username) || strlen($username) < 3 || strlen($username) > 50) {
    echo json_encode(['success' => false, 'message' => 'Invalid username']);
    exit;
}

// Ensure user has currency record
$pdo->prepare("INSERT IGNORE INTO user_currency (username) VALUES (?)")->execute([$username]);

if ($action === 'get_vote_status') {
    $ip = getClientIP();
    
    $sites = $pdo->query("SELECT * FROM vote_sites WHERE is_active = 1 ORDER BY sort_order ASC")->fetchAll();
    
    $siteStatuses = [];
    foreach ($sites as $site) {
        $lastVote = canVoteOnSite($pdo, $username, $fingerprint, $ip, $site['id'], $site['cooldown_hours']);
        $canVote = !$lastVote;
        $nextVoteTime = $lastVote ? date('c', strtotime($lastVote['voted_at']) + ($site['cooldown_hours'] * 3600)) : null;
        $timeRemaining = $lastVote ? max(0, (strtotime($lastVote['voted_at']) + ($site['cooldown_hours'] * 3600) - time()) * 1000) : null;
        
        $siteStatuses[$site['id']] = [
            'can_vote' => $canVote,
            'last_vote_time' => $lastVote ? $lastVote['voted_at'] : null,
            'next_vote_time' => $nextVoteTime,
            'time_remaining' => $timeRemaining
        ];
    }
    
    $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE username = ?");
    $stmt->execute([$username]);
    $currency = $stmt->fetch() ?: ['coins' => 0, 'vip_points' => 0];
    
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM vote_log WHERE username = ?");
    $stmt->execute([$username]);
    $totalVotes = $stmt->fetch()['total'];
    
    $stmt = $pdo->prepare("SELECT * FROM vote_streaks WHERE username = ?");
    $stmt->execute([$username]);
    $streak = $stmt->fetch() ?: ['current_streak' => 0, 'longest_streak' => 0];
    
    $currentTier = getStreakTier($pdo, $streak['current_streak']);
    
    echo json_encode([
        'success' => true,
        'coins' => (int)$currency['coins'],
        'vip_points' => (int)$currency['vip_points'],
        'total_votes' => (int)$totalVotes,
        'site_statuses' => $siteStatuses,
        'current_streak' => (int)$streak['current_streak'],
        'longest_streak' => (int)$streak['longest_streak'],
        'streak_expires_at' => $streak['streak_expires_at'] ?? null,
        'current_multiplier' => $currentTier ? (float)$currentTier['multiplier'] : 1.0
    ]);
    exit;
}

if ($action === 'submit_vote') {
    if (!$siteId) {
        echo json_encode(['success' => false, 'message' => 'Site ID required']);
        exit;
    }
    
    $stmt = $pdo->prepare("SELECT * FROM vote_sites WHERE id = ? AND is_active = 1");
    $stmt->execute([$siteId]);
    $site = $stmt->fetch();
    
    if (!$site) {
        echo json_encode(['success' => false, 'message' => 'Invalid vote site']);
        exit;
    }
    
    $ip = getClientIP();
    $lastVote = canVoteOnSite($pdo, $username, $fingerprint, $ip, $siteId, $site['cooldown_hours']);
    
    if ($lastVote) {
        $nextVote = date('c', strtotime($lastVote['voted_at']) + ($site['cooldown_hours'] * 3600));
        echo json_encode(['success' => false, 'message' => 'Vote cooldown active', 'next_vote_time' => $nextVote]);
        exit;
    }
    
    $streakResult = updateStreak($pdo, $username);
    $newStreak = $streakResult['new_streak'];
    
    $tier = getStreakTier($pdo, $newStreak);
    $multiplier = $tier ? (float)$tier['multiplier'] : 1.0;
    $bonusCoins = $tier ? (int)$tier['bonus_coins'] : 0;
    $bonusVip = $tier ? (int)$tier['bonus_vip'] : 0;
    
    $baseCoins = $site['coins_reward'];
    $baseVip = $site['vip_reward'];
    
    $finalCoins = (int)round($baseCoins * $multiplier) + $bonusCoins;
    $finalVip = (int)round($baseVip * $multiplier) + $bonusVip;
    
    $stmt = $pdo->prepare("
        INSERT INTO vote_log (username, site_id, fingerprint, ip_address, coins_earned, vip_points_earned, streak_multiplier) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$username, $siteId, $fingerprint, $ip, $finalCoins, $finalVip, $multiplier]);
    
    $stmt = $pdo->prepare("UPDATE user_currency SET coins = coins + ?, vip_points = vip_points + ? WHERE username = ?");
    $stmt->execute([$finalCoins, $finalVip, $username]);
    
    $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE username = ?");
    $stmt->execute([$username]);
    $currency = $stmt->fetch();
    
    echo json_encode([
        'success' => true,
        'message' => 'Vote recorded!',
        'coins_earned' => $finalCoins,
        'vip_points_earned' => $finalVip,
        'base_coins' => $baseCoins,
        'base_vip' => $baseVip,
        'streak_bonus' => $multiplier > 1,
        'streak_multiplier' => $multiplier,
        'bonus_coins' => $bonusCoins,
        'bonus_vip' => $bonusVip,
        'new_streak' => $newStreak,
        'longest_streak' => $streakResult['longest_streak'],
        'streak_expires_at' => $streakResult['expires_at'],
        'new_coins_total' => (int)$currency['coins'],
        'new_vip_total' => (int)$currency['vip_points'],
        'next_vote_time' => date('c', time() + ($site['cooldown_hours'] * 3600))
    ]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid action']);
