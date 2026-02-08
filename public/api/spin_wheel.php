<?php
/**
 * spin_wheel.php - Lucky Spin Wheel API
 * 
 * Handles wheel segments, spinning, and settings.
 * PHP 5.x compatible.
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';

header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();
$pdo = getDB();

// Create tables if they don't exist
function ensureSpinTables($pdo) {
    // Segments table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS spin_wheel_segments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            label VARCHAR(100) NOT NULL,
            reward_type ENUM('coins', 'vip', 'zen', 'nothing') NOT NULL DEFAULT 'coins',
            reward_value INT NOT NULL DEFAULT 0,
            probability DECIMAL(5,2) NOT NULL DEFAULT 10.00,
            color VARCHAR(20) NOT NULL DEFAULT '#06b6d4',
            icon VARCHAR(30) DEFAULT 'gift',
            is_active TINYINT(1) DEFAULT 1,
            sort_order INT DEFAULT 0,
            created_at DATETIME DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
    
    // User spins history
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_spins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            segment_id INT NOT NULL,
            reward_type VARCHAR(20) NOT NULL,
            reward_value INT NOT NULL,
            spun_at DATETIME NOT NULL,
            INDEX idx_user_spun (user_id, spun_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
    
    // Spin settings
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS spin_settings (
            setting_key VARCHAR(50) PRIMARY KEY,
            setting_value VARCHAR(255) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
    
    // Insert default settings if not exist
    $defaults = array(
        'spins_per_day' => '1',
        'cooldown_hours' => '24',
        'enabled' => '1'
    );
    
    foreach ($defaults as $key => $value) {
        $stmt = $pdo->prepare("INSERT IGNORE INTO spin_settings (setting_key, setting_value) VALUES (?, ?)");
        $stmt->execute(array($key, $value));
    }
    
    // Insert default segments if empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM spin_wheel_segments");
    if ((int)$stmt->fetchColumn() === 0) {
        $defaultSegments = array(
            array('50 Coins', 'coins', 50, 25.00, '#22c55e', 'coins', 1),
            array('100 Coins', 'coins', 100, 20.00, '#3b82f6', 'coins', 2),
            array('250 Coins', 'coins', 250, 15.00, '#8b5cf6', 'coins', 3),
            array('500 Coins', 'coins', 500, 8.00, '#f59e0b', 'coins', 4),
            array('10 VIP', 'vip', 10, 12.00, '#ec4899', 'crown', 5),
            array('50 VIP', 'vip', 50, 5.00, '#ef4444', 'crown', 6),
            array('1000 Zen', 'zen', 1000, 10.00, '#06b6d4', 'zap', 7),
            array('Try Again', 'nothing', 0, 5.00, '#64748b', 'x', 8)
        );
        
        $stmt = $pdo->prepare("
            INSERT INTO spin_wheel_segments 
            (label, reward_type, reward_value, probability, color, icon, sort_order, is_active, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())
        ");
        
        foreach ($defaultSegments as $seg) {
            $stmt->execute($seg);
        }
    }
}

ensureSpinTables($pdo);

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Public: Get active segments
if ($method === 'GET' && $action === 'segments') {
    $stmt = $pdo->query("
        SELECT id, label, reward_type, reward_value, color, icon, sort_order 
        FROM spin_wheel_segments 
        WHERE is_active = 1 
        ORDER BY sort_order ASC
    ");
    $segments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse(array('success' => true, 'segments' => $segments, 'rid' => $RID));
}

// Auth required for spinning
if ($action === 'spin' || $action === 'status' || $action === 'history') {
    $user = requireAuth();
    $userId = (int)$user['id'];
}

// Get spin status (can spin today?)
if ($method === 'GET' && $action === 'status') {
    // Get settings
    $stmt = $pdo->query("SELECT setting_key, setting_value FROM spin_settings");
    $settings = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    
    $enabled = isset($settings['enabled']) ? (bool)$settings['enabled'] : true;
    $spinsPerDay = isset($settings['spins_per_day']) ? (int)$settings['spins_per_day'] : 1;
    $cooldownHours = isset($settings['cooldown_hours']) ? (int)$settings['cooldown_hours'] : 24;
    
    // Count spins in last X hours
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM user_spins 
        WHERE user_id = ? AND spun_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
    ");
    $stmt->execute(array($userId, $cooldownHours));
    $spinsUsed = (int)$stmt->fetchColumn();
    
    // Get last spin time
    $stmt = $pdo->prepare("SELECT spun_at FROM user_spins WHERE user_id = ? ORDER BY spun_at DESC LIMIT 1");
    $stmt->execute(array($userId));
    $lastSpin = $stmt->fetchColumn();
    
    $canSpin = $enabled && ($spinsUsed < $spinsPerDay);
    $nextSpinAt = null;
    
    if (!$canSpin && $lastSpin) {
        $nextSpinAt = date('Y-m-d H:i:s', strtotime($lastSpin) + ($cooldownHours * 3600));
    }
    
    jsonResponse(array(
        'success' => true,
        'can_spin' => $canSpin,
        'spins_used' => $spinsUsed,
        'spins_per_day' => $spinsPerDay,
        'spins_remaining' => max(0, $spinsPerDay - $spinsUsed),
        'cooldown_hours' => $cooldownHours,
        'last_spin' => $lastSpin,
        'next_spin_at' => $nextSpinAt,
        'enabled' => $enabled,
        'rid' => $RID
    ));
}

// Perform spin
if ($method === 'POST' && $action === 'spin') {
    // Check if can spin
    $stmt = $pdo->query("SELECT setting_key, setting_value FROM spin_settings");
    $settings = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    
    $enabled = isset($settings['enabled']) ? (bool)$settings['enabled'] : true;
    if (!$enabled) {
        jsonResponse(array('success' => false, 'message' => 'Spin wheel is currently disabled'), 403);
    }
    
    $spinsPerDay = isset($settings['spins_per_day']) ? (int)$settings['spins_per_day'] : 1;
    $cooldownHours = isset($settings['cooldown_hours']) ? (int)$settings['cooldown_hours'] : 24;
    
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM user_spins 
        WHERE user_id = ? AND spun_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
    ");
    $stmt->execute(array($userId, $cooldownHours));
    $spinsUsed = (int)$stmt->fetchColumn();
    
    if ($spinsUsed >= $spinsPerDay) {
        jsonResponse(array('success' => false, 'message' => 'No spins remaining today'), 429);
    }
    
    // Get active segments with probabilities
    $stmt = $pdo->query("
        SELECT id, label, reward_type, reward_value, probability, color, icon 
        FROM spin_wheel_segments 
        WHERE is_active = 1 
        ORDER BY sort_order ASC
    ");
    $segments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($segments)) {
        jsonResponse(array('success' => false, 'message' => 'No wheel segments configured'), 500);
    }
    
    // Weighted random selection
    $totalWeight = 0;
    foreach ($segments as $seg) {
        $totalWeight += (float)$seg['probability'];
    }
    
    $rand = (mt_rand() / mt_getrandmax()) * $totalWeight;
    $cumulative = 0;
    $winner = $segments[0];
    
    foreach ($segments as $seg) {
        $cumulative += (float)$seg['probability'];
        if ($rand <= $cumulative) {
            $winner = $seg;
            break;
        }
    }
    
    // Record spin
    $stmt = $pdo->prepare("
        INSERT INTO user_spins (user_id, segment_id, reward_type, reward_value, spun_at) 
        VALUES (?, ?, ?, ?, NOW())
    ");
    $stmt->execute(array($userId, $winner['id'], $winner['reward_type'], $winner['reward_value']));
    
    // Award reward
    $rewardGiven = false;
    if ($winner['reward_type'] !== 'nothing' && $winner['reward_value'] > 0) {
        switch ($winner['reward_type']) {
            case 'coins':
                $stmt = $pdo->prepare("
                    INSERT INTO user_currency (user_id, coins, vip_points, total_votes) 
                    VALUES (?, ?, 0, 0) 
                    ON DUPLICATE KEY UPDATE coins = coins + ?
                ");
                $stmt->execute(array($userId, $winner['reward_value'], $winner['reward_value']));
                $rewardGiven = true;
                break;
                
            case 'vip':
                $stmt = $pdo->prepare("
                    INSERT INTO user_currency (user_id, coins, vip_points, total_votes) 
                    VALUES (?, 0, ?, 0) 
                    ON DUPLICATE KEY UPDATE vip_points = vip_points + ?
                ");
                $stmt->execute(array($userId, $winner['reward_value'], $winner['reward_value']));
                $rewardGiven = true;
                break;
                
            case 'zen':
                // Add to goldtab_sg
                try {
                    $stmt = $pdo->prepare("
                        INSERT INTO goldtab_sg (AccountID, Gold) 
                        VALUES (?, ?) 
                        ON DUPLICATE KEY UPDATE Gold = Gold + ?
                    ");
                    $stmt->execute(array($userId, $winner['reward_value'], $winner['reward_value']));
                    $rewardGiven = true;
                } catch (Exception $e) {
                    // Table might not exist
                    error_log("SPIN_ZEN_ERROR: " . $e->getMessage());
                }
                break;
        }
    }
    
    // Find winner index for animation
    $winnerIndex = 0;
    foreach ($segments as $idx => $seg) {
        if ((int)$seg['id'] === (int)$winner['id']) {
            $winnerIndex = $idx;
            break;
        }
    }
    
    jsonResponse(array(
        'success' => true,
        'winner' => $winner,
        'winner_index' => $winnerIndex,
        'segment_count' => count($segments),
        'reward_given' => $rewardGiven,
        'spins_remaining' => max(0, $spinsPerDay - $spinsUsed - 1),
        'rid' => $RID
    ));
}

// Get spin history
if ($method === 'GET' && $action === 'history') {
    $limit = isset($_GET['limit']) ? min(50, max(1, (int)$_GET['limit'])) : 10;
    
    $stmt = $pdo->prepare("
        SELECT us.*, sws.label, sws.color, sws.icon
        FROM user_spins us
        LEFT JOIN spin_wheel_segments sws ON sws.id = us.segment_id
        WHERE us.user_id = ?
        ORDER BY us.spun_at DESC
        LIMIT ?
    ");
    $stmt->execute(array($userId, $limit));
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse(array('success' => true, 'history' => $history, 'rid' => $RID));
}

// ============ ADMIN ENDPOINTS ============

if ($action === 'admin_segments' || $action === 'admin_settings' || $action === 'admin_stats') {
    $user = requireAdmin();
}

// Admin: Get all segments
if ($method === 'GET' && $action === 'admin_segments') {
    $stmt = $pdo->query("SELECT * FROM spin_wheel_segments ORDER BY sort_order ASC");
    $segments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse(array('success' => true, 'segments' => $segments, 'rid' => $RID));
}

// Admin: Create/Update/Delete segment
if ($method === 'POST' && $action === 'admin_segments') {
    $input = json_decode(file_get_contents('php://input'), true);
    $op = isset($input['operation']) ? $input['operation'] : 'create';
    
    if ($op === 'create') {
        $stmt = $pdo->prepare("
            INSERT INTO spin_wheel_segments 
            (label, reward_type, reward_value, probability, color, icon, is_active, sort_order, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute(array(
            $input['label'],
            $input['reward_type'],
            (int)$input['reward_value'],
            (float)$input['probability'],
            $input['color'],
            isset($input['icon']) ? $input['icon'] : 'gift',
            isset($input['is_active']) ? (int)$input['is_active'] : 1,
            isset($input['sort_order']) ? (int)$input['sort_order'] : 0
        ));
        
        jsonResponse(array('success' => true, 'id' => $pdo->lastInsertId(), 'rid' => $RID));
    }
    
    if ($op === 'update') {
        $stmt = $pdo->prepare("
            UPDATE spin_wheel_segments SET
                label = ?,
                reward_type = ?,
                reward_value = ?,
                probability = ?,
                color = ?,
                icon = ?,
                is_active = ?,
                sort_order = ?
            WHERE id = ?
        ");
        $stmt->execute(array(
            $input['label'],
            $input['reward_type'],
            (int)$input['reward_value'],
            (float)$input['probability'],
            $input['color'],
            isset($input['icon']) ? $input['icon'] : 'gift',
            isset($input['is_active']) ? (int)$input['is_active'] : 1,
            isset($input['sort_order']) ? (int)$input['sort_order'] : 0,
            (int)$input['id']
        ));
        
        jsonResponse(array('success' => true, 'rid' => $RID));
    }
    
    if ($op === 'delete') {
        $stmt = $pdo->prepare("DELETE FROM spin_wheel_segments WHERE id = ?");
        $stmt->execute(array((int)$input['id']));
        
        jsonResponse(array('success' => true, 'rid' => $RID));
    }
}

// Admin: Get/Update settings
if ($method === 'GET' && $action === 'admin_settings') {
    $stmt = $pdo->query("SELECT setting_key, setting_value FROM spin_settings");
    $settings = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    
    jsonResponse(array('success' => true, 'settings' => $settings, 'rid' => $RID));
}

if ($method === 'POST' && $action === 'admin_settings') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    foreach ($input as $key => $value) {
        $stmt = $pdo->prepare("
            INSERT INTO spin_settings (setting_key, setting_value) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE setting_value = ?
        ");
        $stmt->execute(array($key, $value, $value));
    }
    
    jsonResponse(array('success' => true, 'rid' => $RID));
}

// Admin: Get stats
if ($method === 'GET' && $action === 'admin_stats') {
    $stats = array(
        'total_spins' => 0,
        'spins_today' => 0,
        'unique_spinners' => 0,
        'rewards_given' => array()
    );
    
    $stmt = $pdo->query("SELECT COUNT(*) FROM user_spins");
    $stats['total_spins'] = (int)$stmt->fetchColumn();
    
    $stmt = $pdo->query("SELECT COUNT(*) FROM user_spins WHERE DATE(spun_at) = CURDATE()");
    $stats['spins_today'] = (int)$stmt->fetchColumn();
    
    $stmt = $pdo->query("SELECT COUNT(DISTINCT user_id) FROM user_spins");
    $stats['unique_spinners'] = (int)$stmt->fetchColumn();
    
    $stmt = $pdo->query("
        SELECT reward_type, SUM(reward_value) as total 
        FROM user_spins 
        WHERE reward_type != 'nothing'
        GROUP BY reward_type
    ");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $stats['rewards_given'][$row['reward_type']] = (int)$row['total'];
    }
    
    jsonResponse(array('success' => true, 'stats' => $stats, 'rid' => $RID));
}

jsonResponse(array('success' => false, 'message' => 'Invalid action'), 400);
