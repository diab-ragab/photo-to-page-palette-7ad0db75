<?php
// api/achievements.php
// Achievements System - PHP 5.x compatible

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';

header('Content-Type: application/json; charset=utf-8');

$rid = substr(bin2hex(random_bytes(6)), 0, 12);

// Get action from query or body
$action = '';
if (isset($_GET['action'])) {
    $action = $_GET['action'];
} elseif (isset($__jsonInput['action'])) {
    $action = (string)$__jsonInput['action'];
}

try {
    $pdo = getDB();
    ensureAchievementsTables($pdo);

    switch ($action) {
        case 'list':
            // Public: list all active achievements
            handleListAchievements($pdo, $rid);
            break;

        case 'user_progress':
            // Auth required: get user's achievement progress
            $user = requireAuth();
            handleUserProgress($pdo, $user, $rid);
            break;

        case 'claim':
            // Auth required: claim achievement reward
            $user = requireAuth();
            handleClaimReward($pdo, $user, $rid);
            break;

        case 'check_unlocks':
            // Auth required: check and unlock any new achievements
            $user = requireAuth();
            handleCheckUnlocks($pdo, $user, $rid);
            break;

        // Admin actions
        case 'list_all':
        case 'add':
        case 'update':
        case 'delete':
        case 'stats':
            requireAdmin();
            handleAdminAction($pdo, $action, $rid);
            break;

        default:
            echo json_encode(array(
                'success' => false,
                'error' => 'Invalid action',
                'rid' => $rid
            ));
    }

} catch (Exception $e) {
    error_log("achievements.php error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array(
        'success' => false,
        'error' => 'Server error',
        'rid' => $rid
    ));
}

// Ensure tables exist
function ensureAchievementsTables($pdo) {
    try {
        // Achievements definitions table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS achievements (
                id INT(11) NOT NULL AUTO_INCREMENT,
                code VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                description VARCHAR(255) NOT NULL,
                icon VARCHAR(20) DEFAULT 'TROPHY',
                category VARCHAR(20) DEFAULT 'gameplay',
                requirement_type VARCHAR(20) NOT NULL,
                requirement_value INT(11) DEFAULT 1,
                reward_coins INT(11) DEFAULT 0,
                reward_vip INT(11) DEFAULT 0,
                rarity VARCHAR(20) DEFAULT 'common',
                is_hidden TINYINT(1) DEFAULT 0,
                is_active TINYINT(1) DEFAULT 1,
                sort_order INT(11) DEFAULT 0,
                created_at DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY unique_code (code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
        ");

        // User achievements table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS user_achievements (
                id INT(11) NOT NULL AUTO_INCREMENT,
                user_id INT(11) NOT NULL,
                achievement_id INT(11) NOT NULL,
                unlocked_at DATETIME NOT NULL,
                claimed TINYINT(1) DEFAULT 0,
                PRIMARY KEY (id),
                UNIQUE KEY unique_user_achievement (user_id, achievement_id),
                INDEX idx_user (user_id),
                INDEX idx_achievement (achievement_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
        ");

        // Insert default achievements if table is empty
        $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM achievements");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ((int)$row['cnt'] === 0) {
            insertDefaultAchievements($pdo);
        }

    } catch (Exception $e) {
        error_log("ensureAchievementsTables: " . $e->getMessage());
    }
}

function insertDefaultAchievements($pdo) {
    $now = date('Y-m-d H:i:s');
    $defaults = array(
        // Voting achievements
        array('first_vote', 'First Vote', 'Cast your first vote for the server', 'VOTE', 'voting', 'count', 1, 100, 50, 'common', 0, 1),
        array('voter_7', 'Weekly Warrior', 'Maintain a 7-day voting streak', 'FIRE', 'voting', 'streak', 7, 500, 100, 'uncommon', 0, 2),
        array('voter_30', 'Dedicated Voter', 'Maintain a 30-day voting streak', 'STAR', 'voting', 'streak', 30, 2000, 500, 'epic', 0, 3),
        array('voter_100', 'Vote Legend', 'Cast 100 total votes', 'CROWN', 'voting', 'count', 100, 5000, 1000, 'legendary', 0, 4),
        
        // Purchase achievements
        array('first_purchase', 'First Purchase', 'Make your first shop purchase', 'COIN', 'purchases', 'count', 1, 200, 100, 'common', 0, 5),
        array('big_spender', 'Big Spender', 'Spend 100,000 Zen in the shop', 'GEM', 'purchases', 'spend', 100000, 1000, 500, 'rare', 0, 6),
        
        // Gameplay achievements
        array('level_50', 'Rising Star', 'Reach level 50 on any character', 'BOLT', 'gameplay', 'level', 50, 500, 200, 'uncommon', 0, 7),
        array('level_100', 'Centurion', 'Reach level 100 on any character', 'TROPHY', 'gameplay', 'level', 100, 2000, 500, 'rare', 0, 8),
        array('level_150', 'Elite Warrior', 'Reach level 150 on any character', 'MEDAL', 'gameplay', 'level', 150, 5000, 1000, 'epic', 0, 9),
        
        // Event achievements  
        array('gamepass_complete', 'Pass Master', 'Complete all 30 days of Game Pass', 'GIFT', 'events', 'count', 30, 3000, 1000, 'epic', 0, 10),
        array('daily_zen_7', 'Zen Collector', 'Claim Daily Zen 7 days in a row', 'SPARKLE', 'events', 'streak', 7, 500, 100, 'uncommon', 0, 11),
        
        // Social achievements
        array('vip_1', 'VIP Member', 'Reach VIP Level 1', 'HEART', 'social', 'level', 1000, 0, 0, 'common', 0, 12),
        array('vip_2', 'VIP Elite', 'Reach VIP Level 2', 'SHIELD', 'social', 'level', 5000, 0, 0, 'rare', 0, 13),
        array('vip_3', 'VIP Legend', 'Reach VIP Level 3', 'SWORD', 'social', 'level', 10000, 0, 0, 'legendary', 0, 14)
    );

    $stmt = $pdo->prepare("
        INSERT INTO achievements (code, name, description, icon, category, requirement_type, requirement_value, reward_coins, reward_vip, rarity, is_hidden, sort_order, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    ");

    foreach ($defaults as $a) {
        try {
            $stmt->execute(array(
                $a[0], $a[1], $a[2], $a[3], $a[4], $a[5], $a[6], $a[7], $a[8], $a[9], $a[10], $a[11], $now
            ));
        } catch (Exception $e) {
            // Ignore duplicates
        }
    }
}

function handleListAchievements($pdo, $rid) {
    $showHidden = isset($_GET['show_hidden']) && $_GET['show_hidden'] === '1';
    
    $sql = "SELECT * FROM achievements WHERE is_active = 1";
    if (!$showHidden) {
        $sql .= " AND is_hidden = 0";
    }
    $sql .= " ORDER BY sort_order ASC, id ASC";
    
    $stmt = $pdo->query($sql);
    $achievements = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(array(
        'success' => true,
        'achievements' => $achievements,
        'rid' => $rid
    ));
}

function handleUserProgress($pdo, $user, $rid) {
    $userId = (int)$user['user_id'];

    // Get all active achievements
    $stmt = $pdo->query("SELECT * FROM achievements WHERE is_active = 1 ORDER BY sort_order ASC");
    $achievements = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get user's unlocked achievements
    $stmt = $pdo->prepare("SELECT achievement_id, unlocked_at, claimed FROM user_achievements WHERE user_id = ?");
    $stmt->execute(array($userId));
    $unlocked = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $unlocked[(int)$row['achievement_id']] = array(
            'unlocked_at' => $row['unlocked_at'],
            'claimed' => (int)$row['claimed']
        );
    }

    // Get user stats for progress calculation
    $stats = getUserStats($pdo, $userId);

    // Build progress array
    $progress = array();
    $totalUnlocked = 0;
    $totalClaimed = 0;

    foreach ($achievements as $ach) {
        $achId = (int)$ach['id'];
        $isUnlocked = isset($unlocked[$achId]);
        $isClaimed = $isUnlocked && $unlocked[$achId]['claimed'] == 1;
        
        if ($isUnlocked) $totalUnlocked++;
        if ($isClaimed) $totalClaimed++;

        // Calculate current progress
        $currentValue = calculateProgress($ach, $stats);
        $targetValue = (int)$ach['requirement_value'];
        $percent = $targetValue > 0 ? min(100, round(($currentValue / $targetValue) * 100)) : 0;

        $item = array(
            'id' => $achId,
            'code' => $ach['code'],
            'name' => $ach['name'],
            'description' => $ach['description'],
            'icon' => $ach['icon'],
            'category' => $ach['category'],
            'rarity' => $ach['rarity'],
            'requirement_type' => $ach['requirement_type'],
            'requirement_value' => $targetValue,
            'current_value' => $currentValue,
            'progress_percent' => $percent,
            'reward_coins' => (int)$ach['reward_coins'],
            'reward_vip' => (int)$ach['reward_vip'],
            'is_hidden' => (int)$ach['is_hidden'],
            'is_unlocked' => $isUnlocked,
            'is_claimed' => $isClaimed,
            'unlocked_at' => $isUnlocked ? $unlocked[$achId]['unlocked_at'] : null
        );

        // Hide details for hidden achievements that aren't unlocked
        if ($ach['is_hidden'] && !$isUnlocked) {
            $item['name'] = '???';
            $item['description'] = 'Hidden achievement';
            $item['current_value'] = 0;
            $item['progress_percent'] = 0;
        }

        $progress[] = $item;
    }

    echo json_encode(array(
        'success' => true,
        'achievements' => $progress,
        'stats' => array(
            'total' => count($achievements),
            'unlocked' => $totalUnlocked,
            'claimed' => $totalClaimed,
            'unclaimed' => $totalUnlocked - $totalClaimed
        ),
        'rid' => $rid
    ));
}

function getUserStats($pdo, $userId) {
    $stats = array(
        'total_votes' => 0,
        'vote_streak' => 0,
        'longest_streak' => 0,
        'total_purchases' => 0,
        'total_spent' => 0,
        'max_level' => 0,
        'vip_points' => 0,
        'gamepass_claims' => 0,
        'daily_zen_streak' => 0
    );

    // Get vote count
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM vote_log WHERE user_id = ?");
        $stmt->execute(array($userId));
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) $stats['total_votes'] = (int)$row['cnt'];
    } catch (Exception $e) {}

    // Get vote streak from vote_streaks table
    try {
        // Need to get username first
        $stmt = $pdo->prepare("SELECT login FROM users WHERE ID = ?");
        $stmt->execute(array($userId));
        $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($userRow) {
            $username = $userRow['login'];
            $stmt = $pdo->prepare("SELECT current_streak, longest_streak FROM vote_streaks WHERE username = ?");
            $stmt->execute(array($username));
            $streak = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($streak) {
                $stats['vote_streak'] = (int)$streak['current_streak'];
                $stats['longest_streak'] = (int)$streak['longest_streak'];
            }
        }
    } catch (Exception $e) {}

    // Get purchase stats
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as total FROM webshop_orders WHERE user_id = ? AND status = 'completed'");
        $stmt->execute(array($userId));
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $stats['total_purchases'] = (int)$row['cnt'];
            $stats['total_spent'] = (int)$row['total'];
        }
    } catch (Exception $e) {}

    // Get max character level from basetab_sg
    try {
        $stmt = $pdo->prepare("SELECT login FROM users WHERE ID = ?");
        $stmt->execute(array($userId));
        $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($userRow) {
            $accountName = $userRow['login'];
            $stmt = $pdo->prepare("SELECT MAX(Level) as max_level FROM basetab_sg WHERE AccountID = ? AND IsDel = 0");
            $stmt->execute(array($accountName));
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row && $row['max_level']) {
                $stats['max_level'] = (int)$row['max_level'];
            }
        }
    } catch (Exception $e) {}

    // Get VIP points
    try {
        $stmt = $pdo->prepare("SELECT vip_points FROM user_currency WHERE user_id = ?");
        $stmt->execute(array($userId));
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) $stats['vip_points'] = (int)$row['vip_points'];
    } catch (Exception $e) {}

    // Get gamepass claims count
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM user_gamepass_claims WHERE user_id = ?");
        $stmt->execute(array($userId));
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) $stats['gamepass_claims'] = (int)$row['cnt'];
    } catch (Exception $e) {}

    return $stats;
}

function calculateProgress($achievement, $stats) {
    $type = $achievement['requirement_type'];
    $category = $achievement['category'];
    $code = $achievement['code'];

    switch ($category) {
        case 'voting':
            if ($type === 'count') {
                return $stats['total_votes'];
            } elseif ($type === 'streak') {
                return max($stats['vote_streak'], $stats['longest_streak']);
            }
            break;

        case 'purchases':
            if ($type === 'count') {
                return $stats['total_purchases'];
            } elseif ($type === 'spend') {
                return $stats['total_spent'];
            }
            break;

        case 'gameplay':
            if ($type === 'level') {
                return $stats['max_level'];
            }
            break;

        case 'events':
            if (strpos($code, 'gamepass') !== false) {
                return $stats['gamepass_claims'];
            } elseif (strpos($code, 'daily_zen') !== false) {
                return $stats['daily_zen_streak'];
            }
            break;

        case 'social':
            if ($type === 'level') {
                return $stats['vip_points'];
            }
            break;
    }

    return 0;
}

function handleCheckUnlocks($pdo, $user, $rid) {
    $userId = (int)$user['user_id'];
    $stats = getUserStats($pdo, $userId);
    
    // Get all achievements not yet unlocked
    $stmt = $pdo->prepare("
        SELECT a.* FROM achievements a
        LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
        WHERE a.is_active = 1 AND ua.id IS NULL
    ");
    $stmt->execute(array($userId));
    $pending = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $newlyUnlocked = array();
    $now = date('Y-m-d H:i:s');

    foreach ($pending as $ach) {
        $current = calculateProgress($ach, $stats);
        $required = (int)$ach['requirement_value'];

        if ($current >= $required) {
            // Unlock this achievement
            try {
                $stmt = $pdo->prepare("INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, claimed) VALUES (?, ?, ?, 0)");
                $stmt->execute(array($userId, $ach['id'], $now));
                $newlyUnlocked[] = array(
                    'id' => (int)$ach['id'],
                    'code' => $ach['code'],
                    'name' => $ach['name'],
                    'icon' => $ach['icon'],
                    'rarity' => $ach['rarity'],
                    'reward_coins' => (int)$ach['reward_coins'],
                    'reward_vip' => (int)$ach['reward_vip']
                );
            } catch (Exception $e) {
                // Already unlocked
            }
        }
    }

    echo json_encode(array(
        'success' => true,
        'newly_unlocked' => $newlyUnlocked,
        'count' => count($newlyUnlocked),
        'rid' => $rid
    ));
}

function handleClaimReward($pdo, $user, $rid) {
    global $__jsonInput;
    
    $userId = (int)$user['user_id'];
    $achievementId = isset($__jsonInput['achievement_id']) ? (int)$__jsonInput['achievement_id'] : 0;

    if ($achievementId <= 0) {
        echo json_encode(array('success' => false, 'error' => 'Invalid achievement ID', 'rid' => $rid));
        return;
    }

    // Check if unlocked and not claimed
    $stmt = $pdo->prepare("
        SELECT ua.*, a.name, a.reward_coins, a.reward_vip 
        FROM user_achievements ua
        JOIN achievements a ON a.id = ua.achievement_id
        WHERE ua.user_id = ? AND ua.achievement_id = ?
    ");
    $stmt->execute(array($userId, $achievementId));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        echo json_encode(array('success' => false, 'error' => 'Achievement not unlocked', 'rid' => $rid));
        return;
    }

    if ((int)$row['claimed'] === 1) {
        echo json_encode(array('success' => false, 'error' => 'Already claimed', 'rid' => $rid));
        return;
    }

    $rewardCoins = (int)$row['reward_coins'];
    $rewardVip = (int)$row['reward_vip'];

    // Mark as claimed
    $stmt = $pdo->prepare("UPDATE user_achievements SET claimed = 1 WHERE user_id = ? AND achievement_id = ?");
    $stmt->execute(array($userId, $achievementId));

    // Award rewards
    if ($rewardCoins > 0 || $rewardVip > 0) {
        try {
            // Check if user_currency row exists
            $stmt = $pdo->prepare("SELECT id FROM user_currency WHERE user_id = ?");
            $stmt->execute(array($userId));
            $exists = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($exists) {
                $pdo->prepare("UPDATE user_currency SET coins = coins + ?, vip_points = vip_points + ? WHERE user_id = ?")
                    ->execute(array($rewardCoins, $rewardVip, $userId));
            } else {
                // Get username
                $stmt = $pdo->prepare("SELECT login FROM users WHERE ID = ?");
                $stmt->execute(array($userId));
                $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
                $username = $userRow ? $userRow['login'] : '';

                $pdo->prepare("INSERT INTO user_currency (user_id, username, coins, vip_points, total_votes) VALUES (?, ?, ?, ?, 0)")
                    ->execute(array($userId, $username, $rewardCoins, $rewardVip));
            }
        } catch (Exception $e) {
            error_log("Achievement reward error: " . $e->getMessage());
        }
    }

    echo json_encode(array(
        'success' => true,
        'message' => 'Reward claimed!',
        'achievement_name' => $row['name'],
        'coins_earned' => $rewardCoins,
        'vip_earned' => $rewardVip,
        'rid' => $rid
    ));
}

function handleAdminAction($pdo, $action, $rid) {
    global $__jsonInput;

    switch ($action) {
        case 'list_all':
            $stmt = $pdo->query("SELECT * FROM achievements ORDER BY sort_order ASC, id ASC");
            $achievements = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get unlock counts
            foreach ($achievements as &$ach) {
                $stmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM user_achievements WHERE achievement_id = ?");
                $stmt->execute(array($ach['id']));
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                $ach['unlock_count'] = (int)$row['cnt'];
            }

            echo json_encode(array(
                'success' => true,
                'achievements' => $achievements,
                'rid' => $rid
            ));
            break;

        case 'add':
            $code = isset($__jsonInput['code']) ? trim($__jsonInput['code']) : '';
            $name = isset($__jsonInput['name']) ? trim($__jsonInput['name']) : '';
            $description = isset($__jsonInput['description']) ? trim($__jsonInput['description']) : '';
            $icon = isset($__jsonInput['icon']) ? trim($__jsonInput['icon']) : 'TROPHY';
            $category = isset($__jsonInput['category']) ? $__jsonInput['category'] : 'gameplay';
            $requirementType = isset($__jsonInput['requirement_type']) ? $__jsonInput['requirement_type'] : 'count';
            $requirementValue = isset($__jsonInput['requirement_value']) ? (int)$__jsonInput['requirement_value'] : 1;
            $rewardCoins = isset($__jsonInput['reward_coins']) ? (int)$__jsonInput['reward_coins'] : 0;
            $rewardVip = isset($__jsonInput['reward_vip']) ? (int)$__jsonInput['reward_vip'] : 0;
            $rarity = isset($__jsonInput['rarity']) ? $__jsonInput['rarity'] : 'common';
            $isHidden = isset($__jsonInput['is_hidden']) ? (int)$__jsonInput['is_hidden'] : 0;
            $isActive = isset($__jsonInput['is_active']) ? (int)$__jsonInput['is_active'] : 1;
            $sortOrder = isset($__jsonInput['sort_order']) ? (int)$__jsonInput['sort_order'] : 0;

            if ($code === '' || $name === '') {
                echo json_encode(array('success' => false, 'error' => 'Code and name are required', 'rid' => $rid));
                return;
            }

            $now = date('Y-m-d H:i:s');
            $stmt = $pdo->prepare("
                INSERT INTO achievements (code, name, description, icon, category, requirement_type, requirement_value, reward_coins, reward_vip, rarity, is_hidden, is_active, sort_order, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute(array(
                $code, $name, $description, $icon, $category, $requirementType, $requirementValue,
                $rewardCoins, $rewardVip, $rarity, $isHidden, $isActive, $sortOrder, $now
            ));

            echo json_encode(array(
                'success' => true,
                'message' => 'Achievement created',
                'id' => (int)$pdo->lastInsertId(),
                'rid' => $rid
            ));
            break;

        case 'update':
            $id = isset($__jsonInput['id']) ? (int)$__jsonInput['id'] : 0;
            if ($id <= 0) {
                echo json_encode(array('success' => false, 'error' => 'Invalid ID', 'rid' => $rid));
                return;
            }

            $updates = array();
            $params = array();

            $fields = array('code', 'name', 'description', 'icon', 'category', 'requirement_type', 'rarity');
            foreach ($fields as $f) {
                if (isset($__jsonInput[$f])) {
                    $updates[] = "$f = ?";
                    $params[] = $__jsonInput[$f];
                }
            }

            $intFields = array('requirement_value', 'reward_coins', 'reward_vip', 'is_hidden', 'is_active', 'sort_order');
            foreach ($intFields as $f) {
                if (isset($__jsonInput[$f])) {
                    $updates[] = "$f = ?";
                    $params[] = (int)$__jsonInput[$f];
                }
            }

            if (count($updates) === 0) {
                echo json_encode(array('success' => false, 'error' => 'No fields to update', 'rid' => $rid));
                return;
            }

            $params[] = $id;
            $sql = "UPDATE achievements SET " . implode(', ', $updates) . " WHERE id = ?";
            $pdo->prepare($sql)->execute($params);

            echo json_encode(array('success' => true, 'message' => 'Achievement updated', 'rid' => $rid));
            break;

        case 'delete':
            $id = isset($__jsonInput['id']) ? (int)$__jsonInput['id'] : 0;
            if ($id <= 0) {
                echo json_encode(array('success' => false, 'error' => 'Invalid ID', 'rid' => $rid));
                return;
            }

            // Delete user achievements first
            $pdo->prepare("DELETE FROM user_achievements WHERE achievement_id = ?")->execute(array($id));
            $pdo->prepare("DELETE FROM achievements WHERE id = ?")->execute(array($id));

            echo json_encode(array('success' => true, 'message' => 'Achievement deleted', 'rid' => $rid));
            break;

        case 'stats':
            // Get overall stats
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM achievements WHERE is_active = 1");
            $total = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $stmt = $pdo->query("SELECT COUNT(DISTINCT user_id) as users FROM user_achievements");
            $usersWithAchievements = (int)$stmt->fetch(PDO::FETCH_ASSOC)['users'];

            $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM user_achievements");
            $totalUnlocks = (int)$stmt->fetch(PDO::FETCH_ASSOC)['cnt'];

            $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM user_achievements WHERE claimed = 1");
            $totalClaimed = (int)$stmt->fetch(PDO::FETCH_ASSOC)['cnt'];

            // Most popular achievements
            $stmt = $pdo->query("
                SELECT a.name, a.rarity, COUNT(ua.id) as unlock_count
                FROM achievements a
                LEFT JOIN user_achievements ua ON ua.achievement_id = a.id
                GROUP BY a.id
                ORDER BY unlock_count DESC
                LIMIT 5
            ");
            $popular = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(array(
                'success' => true,
                'stats' => array(
                    'total_achievements' => $total,
                    'users_with_achievements' => $usersWithAchievements,
                    'total_unlocks' => $totalUnlocks,
                    'total_claimed' => $totalClaimed,
                    'popular' => $popular
                ),
                'rid' => $rid
            ));
            break;
    }
}
