<?php
/**
 * spin_wheel.php - Lucky Spin Wheel API (Choose Character Reward)
 * PHP 5.x compatible
 */

require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET','POST','OPTIONS'));
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/mail_delivery.php';

header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();
$pdo = getDB();

if (!function_exists('jsonResponse')) {
    function jsonResponse($arr, $code = 200) {
        http_response_code((int)$code);
        echo json_encode($arr);
        exit;
    }
}

function safeBoolSetting($v, $default = true) {
    if ($v === null) return (bool)$default;
    $v = strtolower(trim((string)$v));
    return ($v === '1' || $v === 'true' || $v === 'yes' || $v === 'on');
}

/**
 * Get account name string from website users table
 * Tries common column names: name, login, username
 */
function getWebsiteAccountName($pdo, $userId) {
    $userId = (int)$userId;
    $candidates = array('name', 'login', 'username');
    foreach ($candidates as $col) {
        try {
            $stmt = $pdo->prepare("SELECT `$col` AS acct FROM users WHERE ID = ? OR id = ? LIMIT 1");
            $stmt->execute(array($userId, $userId));
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row && isset($row['acct']) && $row['acct'] !== '') {
                return (string)$row['acct'];
            }
        } catch (Exception $e) {
            // column might not exist, try next
        }
    }
    return '';
}

/**
 * Detect if AccountID column in basetab_sg is numeric or string
 */
function isAccountIdNumeric($pdo) {
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM basetab_sg LIKE 'AccountID'");
        $col = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($col && isset($col['Type'])) {
            $t = strtolower($col['Type']);
            if (strpos($t, 'int') !== false || strpos($t, 'bigint') !== false) {
                return true;
            }
        }
    } catch (Exception $e) {}
    return false;
}

/**
 * Resolve account key for basetab_sg queries
 * Returns numeric user_id if AccountID is numeric, else account name string
 */
function resolveAccountKey($pdo, $userId) {
    $userId = (int)$userId;
    if (isAccountIdNumeric($pdo)) {
        return $userId;
    }
    $name = getWebsiteAccountName($pdo, $userId);
    return ($name !== '') ? $name : $userId;
}

/**
 * Return user's characters list
 */
function getUserCharacters($pdo, $userId) {
    $accountKey = resolveAccountKey($pdo, $userId);
    
    // Detect level column
    $levelCol = 'Level';
    $levelCandidates = array('Level', 'level', 'Lev', 'lev', 'cLevel');
    foreach ($levelCandidates as $lc) {
        try {
            $stmt = $pdo->query("SHOW COLUMNS FROM basetab_sg LIKE '$lc'");
            if ($stmt->fetch()) {
                $levelCol = $lc;
                break;
            }
        } catch (Exception $e) {}
    }
    
    $stmt = $pdo->prepare("
        SELECT RoleID, Name, `$levelCol` AS Level
        FROM basetab_sg
        WHERE AccountID = ? AND IsDel = 0
        ORDER BY `$levelCol` DESC, RoleID ASC
    ");
    $stmt->execute(array($accountKey));
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Verify role belongs to user
 */
function roleBelongsToUser($pdo, $userId, $roleId) {
    $accountKey = resolveAccountKey($pdo, $userId);
    $roleId = (int)$roleId;
    
    $stmt = $pdo->prepare("
        SELECT RoleID
        FROM basetab_sg
        WHERE RoleID = ? AND AccountID = ? AND IsDel = 0
        LIMIT 1
    ");
    $stmt->execute(array($roleId, $accountKey));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? true : false;
}

/**
 * Create tables if missing + default data
 */
function ensureSpinTables($pdo) {
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

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_spins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            role_id INT NOT NULL DEFAULT 0,
            segment_id INT NOT NULL,
            reward_type VARCHAR(20) NOT NULL,
            reward_value INT NOT NULL,
            spun_at DATETIME NOT NULL,
            INDEX idx_user_spun (user_id, spun_at),
            INDEX idx_role_spun (role_id, spun_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");

    // Migration: add role_id column if missing
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM user_spins LIKE 'role_id'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE user_spins ADD COLUMN role_id INT NOT NULL DEFAULT 0 AFTER user_id");
            $pdo->exec("ALTER TABLE user_spins ADD INDEX idx_role_spun (role_id, spun_at)");
        }
    } catch (Exception $e) {}

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS spin_settings (
            setting_key VARCHAR(50) PRIMARY KEY,
            setting_value VARCHAR(255) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");

    // Bonus spins table (from Zen purchase or Game Pass rewards)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_bonus_spins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            spins_available INT NOT NULL DEFAULT 0,
            source VARCHAR(50) NOT NULL DEFAULT 'zen',
            granted_at DATETIME NOT NULL,
            INDEX idx_user_bonus (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");

    $defaults = array(
        'spins_per_day'  => '1',
        'cooldown_hours' => '24',
        'enabled'        => '1',
        'zen_per_spin'   => '50000'
    );
    foreach ($defaults as $key => $value) {
        $stmt = $pdo->prepare("INSERT IGNORE INTO spin_settings (setting_key, setting_value) VALUES (?, ?)");
        $stmt->execute(array($key, $value));
    }

    $stmt = $pdo->query("SELECT COUNT(*) FROM spin_wheel_segments");
    if ((int)$stmt->fetchColumn() === 0) {
        $defaultSegments = array(
            // --- COMMON: Coins (40% total) ---
            array('10 Coins',     'coins',      10,   6.00, '#4ade80', 'coins',  1),
            array('25 Coins',     'coins',      25,   6.00, '#22c55e', 'coins',  2),
            array('50 Coins',     'coins',      50,   5.50, '#16a34a', 'coins',  3),
            array('75 Coins',     'coins',      75,   4.50, '#15803d', 'coins',  4),
            array('100 Coins',    'coins',     100,   4.00, '#3b82f6', 'coins',  5),
            array('150 Coins',    'coins',     150,   3.50, '#2563eb', 'coins',  6),
            array('200 Coins',    'coins',     200,   3.00, '#1d4ed8', 'coins',  7),
            array('300 Coins',    'coins',     300,   2.50, '#6366f1', 'coins',  8),
            array('500 Coins',    'coins',     500,   2.00, '#8b5cf6', 'coins',  9),
            array('750 Coins',    'coins',     750,   1.50, '#7c3aed', 'coins', 10),
            array('1000 Coins',   'coins',    1000,   1.00, '#a855f7', 'coins', 11),
            // --- UNCOMMON: VIP Points (15% total) ---
            array('5 VIP',        'vip',         5,   3.50, '#f472b6', 'crown', 12),
            array('10 VIP',       'vip',        10,   3.00, '#ec4899', 'crown', 13),
            array('25 VIP',       'vip',        25,   2.50, '#db2777', 'crown', 14),
            array('50 VIP',       'vip',        50,   2.00, '#be185d', 'crown', 15),
            array('100 VIP',      'vip',       100,   1.50, '#9d174d', 'crown', 16),
            array('200 VIP',      'vip',       200,   1.00, '#831843', 'crown', 17),
            array('500 VIP',      'vip',       500,   0.80, '#701a75', 'crown', 18),
            array('1000 VIP',     'vip',      1000,   0.70, '#86198f', 'crown', 19),
            // --- RARE: Zen (10% total) ---
            array('500 Zen',      'zen',       500,   2.50, '#22d3ee', 'zap',   20),
            array('1000 Zen',     'zen',      1000,   2.00, '#06b6d4', 'zap',   21),
            array('2500 Zen',     'zen',      2500,   1.50, '#0891b2', 'zap',   22),
            array('5000 Zen',     'zen',      5000,   1.20, '#0e7490', 'zap',   23),
            array('10000 Zen',    'zen',     10000,   0.80, '#155e75', 'zap',   24),
            // --- SUPER RARE: Zen Jackpots (2% total) ---
            array('25000 Zen',    'zen',     25000,   0.60, '#f59e0b', 'zap',   25),
            array('50000 Zen',    'zen',     50000,   0.40, '#d97706', 'zap',   26),
            array('100000 Zen',   'zen',    100000,   0.25, '#b45309', 'zap',   27),
            array('500000 Zen',   'zen',    500000,   0.15, '#ef4444', 'zap',   28),
            // --- NOTHING (33% total) ---
            array('Try Again',    'nothing',     0,  18.00, '#64748b', 'x',     29),
            array('Better Luck',  'nothing',     0,  15.00, '#94a3b8', 'x',     30)
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

/**
 * Get user's total available bonus spins
 */
function getUserBonusSpins($pdo, $userId) {
    $userId = (int)$userId;
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(spins_available), 0) FROM user_bonus_spins WHERE user_id = ? AND spins_available > 0");
    $stmt->execute(array($userId));
    return (int)$stmt->fetchColumn();
}

/**
 * Consume one bonus spin (FIFO)
 */
function consumeBonusSpin($pdo, $userId) {
    $userId = (int)$userId;
    $stmt = $pdo->prepare("SELECT id, spins_available FROM user_bonus_spins WHERE user_id = ? AND spins_available > 0 ORDER BY granted_at ASC LIMIT 1");
    $stmt->execute(array($userId));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) return false;
    
    $newVal = (int)$row['spins_available'] - 1;
    if ($newVal <= 0) {
        $stmt = $pdo->prepare("DELETE FROM user_bonus_spins WHERE id = ?");
        $stmt->execute(array((int)$row['id']));
    } else {
        $stmt = $pdo->prepare("UPDATE user_bonus_spins SET spins_available = ? WHERE id = ?");
        $stmt->execute(array($newVal, (int)$row['id']));
    }
    return true;
}

/**
 * Grant bonus spins to a user
 */
function grantBonusSpins($pdo, $userId, $count, $source) {
    $userId = (int)$userId;
    $count = (int)$count;
    if ($count <= 0) return;
    $stmt = $pdo->prepare("INSERT INTO user_bonus_spins (user_id, spins_available, source, granted_at) VALUES (?, ?, ?, NOW())");
    $stmt->execute(array($userId, $count, (string)$source));
}

ensureSpinTables($pdo);

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Public: segments
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

// Auth required actions
if ($action === 'spin' || $action === 'status' || $action === 'history' || $action === 'characters' || $action === 'buy_spin') {
    $user = requireAuth();
    // session_helper returns 'user_id', not 'id'
    $userId = isset($user['user_id']) ? (int)$user['user_id'] : (int)$user['id'];
}

// GET characters list
if ($method === 'GET' && $action === 'characters') {
    $chars = getUserCharacters($pdo, $userId);
    jsonResponse(array('success' => true, 'characters' => $chars, 'rid' => $RID));
}

// Status
if ($method === 'GET' && $action === 'status') {
    $stmt = $pdo->query("SELECT setting_key, setting_value FROM spin_settings");
    $settings = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }

    $enabled       = safeBoolSetting(isset($settings['enabled']) ? $settings['enabled'] : '1', true);
    $spinsPerDay   = isset($settings['spins_per_day']) ? (int)$settings['spins_per_day'] : 1;
    $cooldownHours = isset($settings['cooldown_hours']) ? (int)$settings['cooldown_hours'] : 24;
    $zenPerSpin    = isset($settings['zen_per_spin']) ? (int)$settings['zen_per_spin'] : 50000;

    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM user_spins
        WHERE user_id = ? AND spun_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
    ");
    $stmt->execute(array($userId, $cooldownHours));
    $spinsUsed = (int)$stmt->fetchColumn();

    $bonusSpins = getUserBonusSpins($pdo, $userId);

    $stmt = $pdo->prepare("SELECT spun_at FROM user_spins WHERE user_id = ? ORDER BY spun_at DESC LIMIT 1");
    $stmt->execute(array($userId));
    $lastSpin = $stmt->fetchColumn();

    $dailyRemaining = max(0, $spinsPerDay - $spinsUsed);
    $totalRemaining = $dailyRemaining + $bonusSpins;
    $canSpin = $enabled && ($totalRemaining > 0);
    $nextSpinAt = null;
    if (!$canSpin && $lastSpin) {
        $nextSpinAt = date('Y-m-d H:i:s', strtotime($lastSpin) + ($cooldownHours * 3600));
    }

    jsonResponse(array(
        'success'         => true,
        'can_spin'        => $canSpin,
        'spins_used'      => $spinsUsed,
        'spins_per_day'   => $spinsPerDay,
        'spins_remaining' => $totalRemaining,
        'daily_remaining' => $dailyRemaining,
        'bonus_spins'     => $bonusSpins,
        'zen_per_spin'    => $zenPerSpin,
        'cooldown_hours'  => $cooldownHours,
        'last_spin'       => $lastSpin,
        'next_spin_at'    => $nextSpinAt,
        'enabled'         => $enabled,
        'rid'             => $RID
    ));
}

// History
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

// Perform spin (requires role_id)
if ($method === 'POST' && $action === 'spin') {
    $mailer = new GameMailer($pdo);

    try {
        // read role_id from JSON or form
        $roleId = 0;
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true);
        if (is_array($input) && isset($input['role_id'])) $roleId = (int)$input['role_id'];
        if ($roleId <= 0 && isset($_POST['role_id'])) $roleId = (int)$_POST['role_id'];

        if ($roleId <= 0) {
            jsonResponse(array('success' => false, 'message' => 'role_id is required', 'rid' => $RID), 400);
        }

        if (!roleBelongsToUser($pdo, $userId, $roleId)) {
            jsonResponse(array('success' => false, 'message' => 'Invalid character selection', 'rid' => $RID), 403);
        }

        // settings
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM spin_settings");
        $settings = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }

        $enabled       = safeBoolSetting(isset($settings['enabled']) ? $settings['enabled'] : '1', true);
        $spinsPerDay   = isset($settings['spins_per_day']) ? (int)$settings['spins_per_day'] : 1;
        $cooldownHours = isset($settings['cooldown_hours']) ? (int)$settings['cooldown_hours'] : 24;

        if (!$enabled) {
            jsonResponse(array('success' => false, 'message' => 'Spin wheel is currently disabled', 'rid' => $RID), 403);
        }

        // cooldown check - daily spins
        $stmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM user_spins
            WHERE user_id = ? AND spun_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
        ");
        $stmt->execute(array($userId, $cooldownHours));
        $spinsUsed = (int)$stmt->fetchColumn();

        $usedBonus = false;
        $dailyRemaining = max(0, $spinsPerDay - $spinsUsed);
        $bonusSpins = getUserBonusSpins($pdo, $userId);

        if ($dailyRemaining <= 0) {
            // Try to use a bonus spin
            if ($bonusSpins > 0) {
                $consumed = consumeBonusSpin($pdo, $userId);
                if (!$consumed) {
                    jsonResponse(array('success' => false, 'message' => 'No spins remaining', 'rid' => $RID), 429);
                }
                $usedBonus = true;
                $bonusSpins--;
            } else {
                jsonResponse(array('success' => false, 'message' => 'No spins remaining today. Buy extra spins with Zen!', 'rid' => $RID), 429);
            }
        }

        // segments
        $stmt = $pdo->query("
            SELECT id, label, reward_type, reward_value, probability, color, icon
            FROM spin_wheel_segments
            WHERE is_active = 1
            ORDER BY sort_order ASC
        ");
        $segments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$segments || count($segments) === 0) {
            jsonResponse(array('success' => false, 'message' => 'No wheel segments configured', 'rid' => $RID), 500);
        }

        // roll
        $totalWeight = 0.0;
        foreach ($segments as $seg) $totalWeight += (float)$seg['probability'];
        if ($totalWeight <= 0) $totalWeight = 1;

        $rand = (mt_rand() / mt_getrandmax()) * $totalWeight;
        $cumulative = 0.0;
        $winner = $segments[0];
        foreach ($segments as $seg) {
            $cumulative += (float)$seg['probability'];
            if ($rand <= $cumulative) { $winner = $seg; break; }
        }

        // UI index
        $winnerIndex = 0;
        foreach ($segments as $idx => $seg) {
            if ((int)$seg['id'] === (int)$winner['id']) { $winnerIndex = $idx; break; }
        }

        if (method_exists($pdo, 'beginTransaction')) $pdo->beginTransaction();

        // record spin
        $stmt = $pdo->prepare("
            INSERT INTO user_spins (user_id, role_id, segment_id, reward_type, reward_value, spun_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute(array($userId, $roleId, (int)$winner['id'], (string)$winner['reward_type'], (int)$winner['reward_value']));

        $rewardGiven = false;
        $rewardMail  = null;
        $type  = (string)$winner['reward_type'];
        $value = (int)$winner['reward_value'];

        if ($type !== 'nothing' && $value > 0) {
            if ($type === 'vip') {
                // VIP -> website currency
                $stmt = $pdo->prepare("
                    INSERT INTO user_currency (user_id, coins, zen, vip_points, vip_level, created_at, updated_at)
                    VALUES (?, 0, 0, ?, 0, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE
                        vip_points = vip_points + VALUES(vip_points),
                        updated_at = NOW()
                ");
                $stmt->execute(array($userId, $value));
                $rewardGiven = true;
            } else {
                $coins = 0; $zen = 0;
                if ($type === 'coins') $coins = $value;
                if ($type === 'zen')   $zen   = $value;

                $rewardMail = $mailer->sendMail(
                    $roleId,
                    'Lucky Wheel Reward',
                    'Congratulations! Your Lucky Wheel reward has arrived.',
                    $coins,
                    $zen,
                    0,
                    0,
                    0
                );
                if (!$rewardMail || !isset($rewardMail['success']) || !$rewardMail['success']) {
                    throw new Exception('MAIL_INSERT_FAILED');
                }
                $rewardGiven = true;
            }
        }

        if (method_exists($pdo, 'commit')) $pdo->commit();

        $newDailyRemaining = $usedBonus ? 0 : max(0, $spinsPerDay - $spinsUsed - 1);
        $totalRemaining = $newDailyRemaining + $bonusSpins;

        jsonResponse(array(
            'success'         => true,
            'winner'          => $winner,
            'winner_index'    => $winnerIndex,
            'segment_count'   => count($segments),
            'reward_given'    => $rewardGiven,
            'reward_mail'     => $rewardMail,
            'spins_remaining' => $totalRemaining,
            'daily_remaining' => $newDailyRemaining,
            'bonus_spins'     => $bonusSpins,
            'used_bonus'      => $usedBonus,
            'rid'             => $RID
        ));

    } catch (Exception $e) {
        if (method_exists($pdo, 'rollBack')) {
            try { $pdo->rollBack(); } catch (Exception $x) {}
        }
        $exMsg = $e->getMessage();
        error_log("SPIN_WHEEL_ERROR rid=$RID msg=$exMsg");

        $msg = 'Server error';
        if ($exMsg === 'MAIL_INSERT_FAILED') {
            $msg = 'Mail delivery failed';
        }

        // Include debug info so frontend/logs can show exactly what went wrong
        jsonResponse(array(
            'success' => false,
            'message' => $msg,
            '_debug'  => $exMsg,
            'rid'     => $RID
        ), 500);
    }
}

// Buy extra spins with Zen
if ($method === 'POST' && $action === 'buy_spin') {
    try {
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true);
        $count = isset($input['count']) ? (int)$input['count'] : 1;
        if ($count < 1 || $count > 10) {
            jsonResponse(array('success' => false, 'message' => 'You can buy 1-10 spins at a time', 'rid' => $RID), 400);
        }

        $stmt = $pdo->query("SELECT setting_key, setting_value FROM spin_settings");
        $settings = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        $zenPerSpin = isset($settings['zen_per_spin']) ? (int)$settings['zen_per_spin'] : 50000;
        $totalCost = $zenPerSpin * $count;

        // Check user has getUserZenBalance (from session_helper or gamepass)
        // Import zen helpers
        if (!function_exists('getUserZenBalance')) {
            // Fallback: read from user_currency
            function getUserZenBalance_local($pdo, $uid) {
                try {
                    $stmt = $pdo->prepare("SELECT zen FROM user_currency WHERE user_id = ?");
                    $stmt->execute(array((int)$uid));
                    $row = $stmt->fetch(PDO::FETCH_ASSOC);
                    return $row ? (int)$row['zen'] : 0;
                } catch (Exception $e) { return 0; }
            }
            $userZen = getUserZenBalance_local($pdo, $userId);
        } else {
            $userZen = getUserZenBalance($userId);
        }

        if ($userZen < $totalCost) {
            jsonResponse(array(
                'success' => false,
                'message' => "Not enough Zen. Need " . number_format($totalCost) . " Zen, you have " . number_format($userZen),
                'zen_cost' => $totalCost,
                'user_zen' => $userZen,
                'rid' => $RID
            ), 400);
        }

        // Deduct Zen
        if (function_exists('deductUserZen')) {
            $result = deductUserZen($userId, $totalCost);
            if (!$result['success']) {
                jsonResponse(array('success' => false, 'message' => $result['message'], 'rid' => $RID), 400);
            }
        } else {
            // Fallback deduction
            $stmt = $pdo->prepare("UPDATE user_currency SET zen = zen - ?, updated_at = NOW() WHERE user_id = ? AND zen >= ?");
            $stmt->execute(array($totalCost, $userId, $totalCost));
            if ($stmt->rowCount() === 0) {
                jsonResponse(array('success' => false, 'message' => 'Insufficient Zen', 'rid' => $RID), 400);
            }
        }

        // Grant bonus spins
        grantBonusSpins($pdo, $userId, $count, 'zen');

        $newZen = function_exists('getUserZenBalance') ? getUserZenBalance($userId) : 0;

        jsonResponse(array(
            'success' => true,
            'message' => "Purchased $count extra spin" . ($count > 1 ? 's' : '') . "!",
            'spins_purchased' => $count,
            'zen_spent' => $totalCost,
            'user_zen' => $newZen,
            'bonus_spins' => getUserBonusSpins($pdo, $userId),
            'rid' => $RID
        ));

    } catch (Exception $e) {
        error_log("BUY_SPIN_ERROR rid=$RID msg=" . $e->getMessage());
        jsonResponse(array('success' => false, 'message' => 'Failed to purchase spins', 'rid' => $RID), 500);
    }
}

// -------------------- ADMIN ENDPOINTS --------------------
if ($action === 'admin_segments' || $action === 'admin_settings' || $action === 'admin_stats') {
    $user = requireAdmin();
}

if ($method === 'GET' && $action === 'admin_segments') {
    $stmt = $pdo->query("SELECT * FROM spin_wheel_segments ORDER BY sort_order ASC");
    $segments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse(array('success' => true, 'segments' => $segments, 'rid' => $RID));
}

if ($method === 'POST' && $action === 'admin_segments') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
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

    // Seed 30 rewards (replaces all existing segments)
    if ($op === 'seed_rewards') {
        $pdo->exec("DELETE FROM spin_wheel_segments");

        $rewards = array(
            // COMMON: Coins (~40%)
            array('1M Coins',      'coins',    1000000,   6.00, '#4ade80', 'coins',  1),
            array('2M Coins',      'coins',    2000000,   6.00, '#22c55e', 'coins',  2),
            array('3M Coins',      'coins',    3000000,   5.50, '#16a34a', 'coins',  3),
            array('5M Coins',      'coins',    5000000,   4.50, '#15803d', 'coins',  4),
            array('7M Coins',      'coins',    7000000,   4.00, '#3b82f6', 'coins',  5),
            array('10M Coins',     'coins',   10000000,   3.50, '#2563eb', 'coins',  6),
            array('15M Coins',     'coins',   15000000,   3.00, '#1d4ed8', 'coins',  7),
            array('20M Coins',     'coins',   20000000,   2.50, '#6366f1', 'coins',  8),
            array('30M Coins',     'coins',   30000000,   2.00, '#8b5cf6', 'coins',  9),
            array('50M Coins',     'coins',   50000000,   1.50, '#7c3aed', 'coins', 10),
            array('100M Coins',    'coins',  100000000,   1.00, '#a855f7', 'coins', 11),
            // UNCOMMON: VIP (~15%)
            array('5 VIP',        'vip',         5,   3.50, '#f472b6', 'crown', 12),
            array('10 VIP',       'vip',        10,   3.00, '#ec4899', 'crown', 13),
            array('25 VIP',       'vip',        25,   2.50, '#db2777', 'crown', 14),
            array('50 VIP',       'vip',        50,   2.00, '#be185d', 'crown', 15),
            array('100 VIP',      'vip',       100,   1.50, '#9d174d', 'crown', 16),
            array('200 VIP',      'vip',       200,   1.00, '#831843', 'crown', 17),
            array('500 VIP',      'vip',       500,   0.80, '#701a75', 'crown', 18),
            array('1000 VIP',     'vip',      1000,   0.70, '#86198f', 'crown', 19),
            // RARE: Zen (~8%)
            array('500 Zen',      'zen',       500,   2.50, '#22d3ee', 'zap',   20),
            array('1000 Zen',     'zen',      1000,   2.00, '#06b6d4', 'zap',   21),
            array('2500 Zen',     'zen',      2500,   1.50, '#0891b2', 'zap',   22),
            array('5000 Zen',     'zen',      5000,   1.20, '#0e7490', 'zap',   23),
            array('10000 Zen',    'zen',     10000,   0.80, '#155e75', 'zap',   24),
            // SUPER RARE: Zen Jackpots (~1.4%)
            array('25000 Zen',    'zen',     25000,   0.60, '#f59e0b', 'zap',   25),
            array('50000 Zen',    'zen',     50000,   0.40, '#d97706', 'zap',   26),
            array('100000 Zen',   'zen',    100000,   0.25, '#b45309', 'zap',   27),
            array('500000 Zen',   'zen',    500000,   0.15, '#ef4444', 'zap',   28),
            // NOTHING (~33%)
            array('Try Again',    'nothing',     0,  18.00, '#64748b', 'x',     29),
            array('Better Luck',  'nothing',     0,  15.00, '#94a3b8', 'x',     30)
        );

        $stmt = $pdo->prepare("
            INSERT INTO spin_wheel_segments
            (label, reward_type, reward_value, probability, color, icon, sort_order, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())
        ");
        $count = 0;
        foreach ($rewards as $seg) {
            $stmt->execute($seg);
            $count++;
        }
        jsonResponse(array('success' => true, 'inserted' => $count, 'message' => $count . ' rewards seeded', 'rid' => $RID));
    }
}

if ($method === 'GET' && $action === 'admin_settings') {
    $stmt = $pdo->query("SELECT setting_key, setting_value FROM spin_settings");
    $settings = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    jsonResponse(array('success' => true, 'settings' => $settings, 'rid' => $RID));
}

if ($method === 'POST' && $action === 'admin_settings') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
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

if ($method === 'GET' && $action === 'admin_stats') {
    $stats = array(
        'total_spins'     => 0,
        'spins_today'     => 0,
        'unique_spinners' => 0,
        'rewards_given'   => array()
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

// Public leaderboard: recent winners with character names
if ($method === 'GET' && $action === 'leaderboard') {
    $limit = isset($_GET['limit']) ? min(20, max(1, (int)$_GET['limit'])) : 10;
    
    // Detect level column for ordering
    $levelCol = 'Level';
    $levelCandidates = array('Level', 'level', 'cLevel');
    foreach ($levelCandidates as $lc) {
        try {
            $stmt = $pdo->query("SHOW COLUMNS FROM basetab_sg LIKE '$lc'");
            if ($stmt->fetch()) {
                $levelCol = $lc;
                break;
            }
        } catch (Exception $e) {}
    }
    
    // Get recent winning spins with character names
    $stmt = $pdo->prepare("
        SELECT 
            us.role_id,
            us.reward_type,
            us.reward_value,
            us.spun_at,
            sws.label,
            sws.color,
            b.Name AS char_name
        FROM user_spins us
        LEFT JOIN spin_wheel_segments sws ON sws.id = us.segment_id
        LEFT JOIN basetab_sg b ON b.RoleID = us.role_id
        WHERE us.reward_type != 'nothing' AND us.reward_value > 0
        ORDER BY us.spun_at DESC
        LIMIT ?
    ");
    $stmt->execute(array($limit));
    $leaderboard = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Fallback if char_name is null
    foreach ($leaderboard as $idx => $entry) {
        if (!isset($entry['char_name']) || $entry['char_name'] === null || $entry['char_name'] === '') {
            $leaderboard[$idx]['char_name'] = 'Unknown';
        }
    }
    
    jsonResponse(array('success' => true, 'leaderboard' => $leaderboard, 'rid' => $RID));
}

// Public: Top Spinners (daily spin count leaderboard - exact counts)
if ($method === 'GET' && $action === 'top_spinners') {
    $limit = isset($_GET['limit']) ? min(20, max(1, (int)$_GET['limit'])) : 10;
    
    $stmt = $pdo->prepare("
        SELECT 
            us.user_id,
            us.role_id,
            COUNT(*) AS spin_count,
            b.Name AS char_name
        FROM user_spins us
        LEFT JOIN basetab_sg b ON b.RoleID = us.role_id
        WHERE DATE(us.spun_at) = CURDATE()
        GROUP BY us.user_id, us.role_id
        ORDER BY spin_count DESC
        LIMIT ?
    ");
    $stmt->execute(array($limit));
    $topSpinners = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($topSpinners as $idx => $entry) {
        if (!isset($entry['char_name']) || $entry['char_name'] === null || $entry['char_name'] === '') {
            $topSpinners[$idx]['char_name'] = 'Unknown';
        }
        $topSpinners[$idx]['spin_count'] = (int)$entry['spin_count'];
    }
    
    // Get top spinner reward settings
    $rewardSettings = array(
        'enabled' => '0',
        'reward_type' => 'zen',
        'reward_value' => '10000'
    );
    $rewardKeys = array('top_spinner_enabled', 'top_spinner_reward_type', 'top_spinner_reward_value');
    foreach ($rewardKeys as $rk) {
        try {
            $stmt = $pdo->prepare("SELECT setting_value FROM spin_settings WHERE setting_key = ?");
            $stmt->execute(array($rk));
            $val = $stmt->fetchColumn();
            if ($val !== false) {
                $shortKey = str_replace('top_spinner_', '', $rk);
                $rewardSettings[$shortKey] = $val;
            }
        } catch (Exception $e) {}
    }
    
    jsonResponse(array(
        'success' => true,
        'top_spinners' => $topSpinners,
        'reward' => $rewardSettings,
        'rid' => $RID
    ));
}

// Admin: Top Spinner Reward Settings
if ($action === 'admin_top_spinner') {
    $user = requireAdmin();
}

if ($method === 'GET' && $action === 'admin_top_spinner') {
    $rewardSettings = array(
        'enabled' => '0',
        'reward_type' => 'zen',
        'reward_value' => '10000'
    );
    $rewardKeys = array('top_spinner_enabled', 'top_spinner_reward_type', 'top_spinner_reward_value');
    foreach ($rewardKeys as $rk) {
        try {
            $stmt = $pdo->prepare("SELECT setting_value FROM spin_settings WHERE setting_key = ?");
            $stmt->execute(array($rk));
            $val = $stmt->fetchColumn();
            if ($val !== false) {
                $shortKey = str_replace('top_spinner_', '', $rk);
                $rewardSettings[$shortKey] = $val;
            }
        } catch (Exception $e) {}
    }
    jsonResponse(array('success' => true, 'settings' => $rewardSettings, 'rid' => $RID));
}

if ($method === 'POST' && $action === 'admin_top_spinner') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    
    $allowedKeys = array('enabled', 'reward_type', 'reward_value');
    foreach ($allowedKeys as $ak) {
        if (isset($input[$ak])) {
            $dbKey = 'top_spinner_' . $ak;
            $stmt = $pdo->prepare("
                INSERT INTO spin_settings (setting_key, setting_value)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE setting_value = ?
            ");
            $stmt->execute(array($dbKey, (string)$input[$ak], (string)$input[$ak]));
        }
    }
    jsonResponse(array('success' => true, 'rid' => $RID));
}

jsonResponse(array('success' => false, 'message' => 'Invalid action', 'rid' => $RID), 400);
