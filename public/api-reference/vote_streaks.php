<?php
require_once __DIR__ . '/config.php';
handleCors(['GET', 'POST', 'OPTIONS']);

$pdo = getDB();

// Ensure tables exist
$pdo->exec("
    CREATE TABLE IF NOT EXISTS vote_streaks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        current_streak INT DEFAULT 0,
        longest_streak INT DEFAULT 0,
        last_streak_vote DATETIME DEFAULT NULL,
        streak_expires_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_current_streak (current_streak DESC)
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
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

// Insert default tiers if empty
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

function validateInt($val, $min = 0, $max = PHP_INT_MAX) {
    $val = filter_var($val, FILTER_VALIDATE_INT);
    return ($val !== false && $val >= $min && $val <= $max) ? $val : false;
}

function validateFloat($val, $min = 0, $max = PHP_FLOAT_MAX) {
    $val = filter_var($val, FILTER_VALIDATE_FLOAT);
    return ($val !== false && $val >= $min && $val <= $max) ? $val : false;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$jsonBody = getJsonInput();
if (!empty($jsonBody['action'])) $action = $jsonBody['action'];

switch ($action) {
    // PUBLIC: Get user's streak data
    case 'get_streak':
        $username = preg_replace('/[^a-zA-Z0-9_-]/', '', sanitizeInput($_GET['username'] ?? '', 50));
        if (empty($username)) {
            echo json_encode(['success' => false, 'message' => 'Username required']);
            exit;
        }
        
        $stmt = $pdo->prepare("SELECT * FROM vote_streaks WHERE username = ?");
        $stmt->execute([$username]);
        $streak = $stmt->fetch() ?: [
            'current_streak' => 0,
            'longest_streak' => 0,
            'last_streak_vote' => null,
            'streak_expires_at' => null
        ];
        
        $currentStreak = (int)$streak['current_streak'];
        
        $tierStmt = $pdo->prepare("
            SELECT * FROM vote_streak_rewards 
            WHERE is_active = 1 AND min_streak <= ? AND (max_streak IS NULL OR max_streak >= ?) 
            ORDER BY min_streak DESC LIMIT 1
        ");
        $tierStmt->execute([$currentStreak, $currentStreak]);
        $currentTier = $tierStmt->fetch();
        
        $nextStmt = $pdo->prepare("
            SELECT min_streak as days, multiplier, badge_name 
            FROM vote_streak_rewards 
            WHERE is_active = 1 AND min_streak > ? 
            ORDER BY min_streak ASC LIMIT 1
        ");
        $nextStmt->execute([$currentStreak]);
        $nextTier = $nextStmt->fetch();
        
        if ($currentTier) {
            $currentTier['id'] = (int)$currentTier['id'];
            $currentTier['min_streak'] = (int)$currentTier['min_streak'];
            $currentTier['max_streak'] = $currentTier['max_streak'] !== null ? (int)$currentTier['max_streak'] : null;
            $currentTier['multiplier'] = (float)$currentTier['multiplier'];
            $currentTier['bonus_coins'] = (int)$currentTier['bonus_coins'];
            $currentTier['bonus_vip'] = (int)$currentTier['bonus_vip'];
            $currentTier['is_active'] = (bool)$currentTier['is_active'];
        }
        
        if ($nextTier) {
            $nextTier['days'] = (int)$nextTier['days'];
            $nextTier['multiplier'] = (float)$nextTier['multiplier'];
        }
        
        echo json_encode([
            'success' => true,
            'current_streak' => $currentStreak,
            'longest_streak' => (int)$streak['longest_streak'],
            'last_streak_vote' => $streak['last_streak_vote'],
            'streak_expires_at' => $streak['streak_expires_at'],
            'current_multiplier' => $currentTier ? (float)$currentTier['multiplier'] : 1.0,
            'current_tier' => $currentTier,
            'next_tier' => $nextTier,
            'streak_badge' => $currentTier && $currentTier['badge_name'] 
                ? ['name' => $currentTier['badge_name'], 'icon' => $currentTier['badge_icon']] 
                : null
        ]);
        break;
    
    // PUBLIC: Get all active streak tiers
    case 'list_tiers':
        $stmt = $pdo->query("SELECT * FROM vote_streak_rewards ORDER BY min_streak ASC");
        $tiers = $stmt->fetchAll();
        
        foreach ($tiers as &$tier) {
            $tier['id'] = (int)$tier['id'];
            $tier['min_streak'] = (int)$tier['min_streak'];
            $tier['max_streak'] = $tier['max_streak'] !== null ? (int)$tier['max_streak'] : null;
            $tier['multiplier'] = (float)$tier['multiplier'];
            $tier['bonus_coins'] = (int)$tier['bonus_coins'];
            $tier['bonus_vip'] = (int)$tier['bonus_vip'];
            $tier['is_active'] = (bool)$tier['is_active'];
        }
        
        echo json_encode(['success' => true, 'tiers' => $tiers]);
        break;
    
    // GM ONLY: Add new streak tier
    case 'add_tier':
        requireGM();
        $data = $jsonBody ?: $_POST;
        
        $minStreak = validateInt($data['min_streak'] ?? 1, 1, 365);
        $maxStreak = isset($data['max_streak']) && $data['max_streak'] !== null && $data['max_streak'] !== '' 
            ? validateInt($data['max_streak'], 1, 365) : null;
        $multiplier = validateFloat($data['multiplier'] ?? 1.0, 1.0, 10.0);
        $bonusCoins = validateInt($data['bonus_coins'] ?? 0, 0, 100000);
        $bonusVip = validateInt($data['bonus_vip'] ?? 0, 0, 100000);
        $badgeName = sanitizeInput($data['badge_name'] ?? '', 50);
        $badgeIcon = sanitizeInput($data['badge_icon'] ?? '', 10);
        $isActive = isset($data['is_active']) ? (bool)$data['is_active'] : true;
        
        if ($minStreak === false) { echo json_encode(['success' => false, 'message' => 'Invalid min streak (1-365)']); exit; }
        if ($multiplier === false) { echo json_encode(['success' => false, 'message' => 'Invalid multiplier (1.0-10.0)']); exit; }
        if ($bonusCoins === false || $bonusVip === false) { echo json_encode(['success' => false, 'message' => 'Invalid bonus values']); exit; }
        if ($maxStreak !== null && $maxStreak !== false && $maxStreak < $minStreak) { echo json_encode(['success' => false, 'message' => 'Max streak must be >= min streak']); exit; }
        
        try {
            $stmt = $pdo->prepare("
                INSERT INTO vote_streak_rewards (min_streak, max_streak, multiplier, bonus_coins, bonus_vip, badge_name, badge_icon, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $minStreak,
                $maxStreak === false ? null : $maxStreak,
                $multiplier,
                $bonusCoins,
                $bonusVip,
                empty($badgeName) ? null : $badgeName,
                empty($badgeIcon) ? null : $badgeIcon,
                $isActive ? 1 : 0
            ]);
            echo json_encode(['success' => true, 'message' => 'Streak tier added', 'id' => (int)$pdo->lastInsertId()]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Failed to add streak tier']);
        }
        break;
    
    // GM ONLY: Update streak tier
    case 'update_tier':
        requireGM();
        $data = $jsonBody ?: $_POST;
        
        $id = validateInt($data['id'] ?? 0, 1);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'Valid tier ID is required']); exit; }
        
        $checkStmt = $pdo->prepare("SELECT id FROM vote_streak_rewards WHERE id = ?");
        $checkStmt->execute([$id]);
        if (!$checkStmt->fetch()) { echo json_encode(['success' => false, 'message' => 'Streak tier not found']); exit; }
        
        $updates = [];
        $params = [];
        
        if (isset($data['min_streak'])) {
            $minStreak = validateInt($data['min_streak'], 1, 365);
            if ($minStreak === false) { echo json_encode(['success' => false, 'message' => 'Invalid min streak']); exit; }
            $updates[] = "min_streak = ?"; $params[] = $minStreak;
        }
        if (array_key_exists('max_streak', $data)) {
            if ($data['max_streak'] === null || $data['max_streak'] === '' || $data['max_streak'] === 0) {
                $updates[] = "max_streak = NULL";
            } else {
                $maxStreak = validateInt($data['max_streak'], 1, 365);
                if ($maxStreak === false) { echo json_encode(['success' => false, 'message' => 'Invalid max streak']); exit; }
                $updates[] = "max_streak = ?"; $params[] = $maxStreak;
            }
        }
        if (isset($data['multiplier'])) {
            $multiplier = validateFloat($data['multiplier'], 1.0, 10.0);
            if ($multiplier === false) { echo json_encode(['success' => false, 'message' => 'Invalid multiplier']); exit; }
            $updates[] = "multiplier = ?"; $params[] = $multiplier;
        }
        if (isset($data['bonus_coins'])) {
            $bonusCoins = validateInt($data['bonus_coins'], 0, 100000);
            if ($bonusCoins === false) { echo json_encode(['success' => false, 'message' => 'Invalid bonus coins']); exit; }
            $updates[] = "bonus_coins = ?"; $params[] = $bonusCoins;
        }
        if (isset($data['bonus_vip'])) {
            $bonusVip = validateInt($data['bonus_vip'], 0, 100000);
            if ($bonusVip === false) { echo json_encode(['success' => false, 'message' => 'Invalid bonus VIP']); exit; }
            $updates[] = "bonus_vip = ?"; $params[] = $bonusVip;
        }
        if (array_key_exists('badge_name', $data)) {
            $updates[] = "badge_name = ?"; $params[] = empty($data['badge_name']) ? null : sanitizeInput($data['badge_name'], 50);
        }
        if (array_key_exists('badge_icon', $data)) {
            $updates[] = "badge_icon = ?"; $params[] = empty($data['badge_icon']) ? null : sanitizeInput($data['badge_icon'], 10);
        }
        if (isset($data['is_active'])) {
            $updates[] = "is_active = ?"; $params[] = (bool)$data['is_active'] ? 1 : 0;
        }
        
        if (empty($updates)) { echo json_encode(['success' => false, 'message' => 'No fields to update']); exit; }
        
        $params[] = $id;
        try {
            $stmt = $pdo->prepare("UPDATE vote_streak_rewards SET " . implode(", ", $updates) . " WHERE id = ?");
            $stmt->execute($params);
            echo json_encode(['success' => true, 'message' => 'Streak tier updated']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Failed to update streak tier']);
        }
        break;
    
    // GM ONLY: Delete streak tier
    case 'delete_tier':
        requireGM();
        $data = $jsonBody ?: $_POST;
        $id = validateInt($data['id'] ?? 0, 1);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'Valid tier ID is required']); exit; }
        
        try {
            $stmt = $pdo->prepare("DELETE FROM vote_streak_rewards WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode($stmt->rowCount() > 0 
                ? ['success' => true, 'message' => 'Streak tier deleted'] 
                : ['success' => false, 'message' => 'Streak tier not found']
            );
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Failed to delete streak tier']);
        }
        break;
    
    // PUBLIC: Get streak leaderboard
    case 'leaderboard':
        $limit = validateInt($_GET['limit'] ?? 10, 1, 100) ?: 10;
        $stmt = $pdo->prepare("
            SELECT username, current_streak, longest_streak 
            FROM vote_streaks WHERE current_streak > 0 
            ORDER BY current_streak DESC, longest_streak DESC LIMIT ?
        ");
        $stmt->execute([$limit]);
        $leaderboard = $stmt->fetchAll();
        foreach ($leaderboard as &$entry) {
            $entry['current_streak'] = (int)$entry['current_streak'];
            $entry['longest_streak'] = (int)$entry['longest_streak'];
        }
        echo json_encode(['success' => true, 'leaderboard' => $leaderboard]);
        break;
    
    // GM ONLY: Reset user streak
    case 'reset_streak':
        requireGM();
        $data = $jsonBody ?: $_POST;
        $username = preg_replace('/[^a-zA-Z0-9_-]/', '', sanitizeInput($data['username'] ?? '', 50));
        if (empty($username)) { echo json_encode(['success' => false, 'message' => 'Username required']); exit; }
        
        try {
            $stmt = $pdo->prepare("UPDATE vote_streaks SET current_streak = 0, streak_expires_at = NULL WHERE username = ?");
            $stmt->execute([$username]);
            echo json_encode($stmt->rowCount() > 0 
                ? ['success' => true, 'message' => "Streak reset for $username"] 
                : ['success' => false, 'message' => 'User streak not found']
            );
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Failed to reset streak']);
        }
        break;
    
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
