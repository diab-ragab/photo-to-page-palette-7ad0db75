<?php
/**
 * spin_wheel.php - Lucky Spin Wheel API (Choose Character Reward)
 * PHP 5.x compatible
 */

require_once __DIR__ . '/bootstrap.php';
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

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS spin_settings (
            setting_key VARCHAR(50) PRIMARY KEY,
            setting_value VARCHAR(255) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");

    $defaults = array(
        'spins_per_day'  => '1',
        'cooldown_hours' => '24',
        'enabled'        => '1'
    );
    foreach ($defaults as $key => $value) {
        $stmt = $pdo->prepare("INSERT IGNORE INTO spin_settings (setting_key, setting_value) VALUES (?, ?)");
        $stmt->execute(array($key, $value));
    }

    $stmt = $pdo->query("SELECT COUNT(*) FROM spin_wheel_segments");
    if ((int)$stmt->fetchColumn() === 0) {
        $defaultSegments = array(
            array('50 Coins',  'coins',   50,  25.00, '#22c55e', 'coins', 1),
            array('100 Coins', 'coins',  100,  20.00, '#3b82f6', 'coins', 2),
            array('250 Coins', 'coins',  250,  15.00, '#8b5cf6', 'coins', 3),
            array('500 Coins', 'coins',  500,   8.00, '#f59e0b', 'coins', 4),
            array('10 VIP',    'vip',     10,  12.00, '#ec4899', 'crown', 5),
            array('50 VIP',    'vip',     50,   5.00, '#ef4444', 'crown', 6),
            array('1000 Zen',  'zen',   1000,  10.00, '#06b6d4', 'zap',   7),
            array('Try Again', 'nothing',   0,   5.00, '#64748b', 'x',     8)
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
if ($action === 'spin' || $action === 'status' || $action === 'history' || $action === 'characters') {
    $user = requireAuth();
    $userId = (int)$user['id'];
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

    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM user_spins
        WHERE user_id = ? AND spun_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
    ");
    $stmt->execute(array($userId, $cooldownHours));
    $spinsUsed = (int)$stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT spun_at FROM user_spins WHERE user_id = ? ORDER BY spun_at DESC LIMIT 1");
    $stmt->execute(array($userId));
    $lastSpin = $stmt->fetchColumn();

    $canSpin = $enabled && ($spinsUsed < $spinsPerDay);
    $nextSpinAt = null;
    if (!$canSpin && $lastSpin) {
        $nextSpinAt = date('Y-m-d H:i:s', strtotime($lastSpin) + ($cooldownHours * 3600));
    }

    jsonResponse(array(
        'success'         => true,
        'can_spin'        => $canSpin,
        'spins_used'      => $spinsUsed,
        'spins_per_day'   => $spinsPerDay,
        'spins_remaining' => max(0, $spinsPerDay - $spinsUsed),
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

        // cooldown check
        $stmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM user_spins
            WHERE user_id = ? AND spun_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
        ");
        $stmt->execute(array($userId, $cooldownHours));
        $spinsUsed = (int)$stmt->fetchColumn();

        if ($spinsUsed >= $spinsPerDay) {
            jsonResponse(array('success' => false, 'message' => 'No spins remaining today', 'rid' => $RID), 429);
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

        jsonResponse(array(
            'success'         => true,
            'winner'          => $winner,
            'winner_index'    => $winnerIndex,
            'segment_count'   => count($segments),
            'reward_given'    => $rewardGiven,
            'reward_mail'     => $rewardMail,
            'spins_remaining' => max(0, $spinsPerDay - $spinsUsed - 1),
            'rid'             => $RID
        ));

    } catch (Exception $e) {
        if (method_exists($pdo, 'rollBack')) {
            try { $pdo->rollBack(); } catch (Exception $x) {}
        }
        error_log("SPIN_WHEEL_ERROR rid=$RID msg=" . $e->getMessage());
        $msg = 'Server error';
        if ($e->getMessage() === 'MAIL_INSERT_FAILED') $msg = 'Mail delivery failed';
        jsonResponse(array('success' => false, 'message' => $msg, 'rid' => $RID), 500);
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

jsonResponse(array('success' => false, 'message' => 'Invalid action', 'rid' => $RID), 400);
