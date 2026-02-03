<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$pdo = getDB();
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

// Token-based auth helper (same as check_admin.php) - PHP 5.x compatible
function getSessionToken() {
    $auth = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (stripos($auth, 'Bearer ') === 0) return trim(substr($auth, 7));
    
    $hdr = isset($_SERVER['HTTP_X_SESSION_TOKEN']) ? $_SERVER['HTTP_X_SESSION_TOKEN'] : '';
    if ($hdr) return trim($hdr);
    
    if (!empty($_GET['sessionToken'])) return trim((string)$_GET['sessionToken']);
    if (!empty($_COOKIE['sessionToken'])) return trim((string)$_COOKIE['sessionToken']);
    
    return '';
}

// Helper to check admin for write operations using token-based auth
function requireAdminForWrite() {
    global $pdo;
    
    $sessionToken = getSessionToken();
    if ($sessionToken === '') {
        http_response_code(401);
        echo json_encode(array('success' => false, 'error' => 'Not authenticated'));
        exit;
    }
    
    // Get user from session token.
    // Compatibility: some deployments store raw token, others store sha256(token).
    $stmt = $pdo->prepare("
        SELECT us.user_id, u.name
        FROM user_sessions us
        JOIN users u ON u.ID = us.user_id
        WHERE us.session_token = ? AND us.expires_at > NOW()
        LIMIT 1
    ");
    $stmt->execute(array($sessionToken));
    $session = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$session) {
        $sessionTokenHash = hash('sha256', $sessionToken);
        $stmt->execute(array($sessionTokenHash));
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    if (!$session) {
        http_response_code(401);
        echo json_encode(array('success' => false, 'error' => 'Session expired or invalid'));
        exit;
    }
    
    $userId = (int)$session['user_id'];
    $username = (string)$session['name'];
    
    // Check admin role
    $stmt = $pdo->prepare("SELECT role FROM user_roles WHERE user_id = ?");
    $stmt->execute(array($userId));
    $roles = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (!$roles) $roles = array();
    
    $isAdmin = in_array('admin', $roles, true) || in_array('gm', $roles, true);
    
    // Also check bootstrap admin from config
    if (!$isAdmin) {
        $cfg = function_exists('getConfig') ? (array)getConfig() : array();
        $sec = isset($cfg['security']) ? $cfg['security'] : array();
        $adminIds = isset($sec['admin_user_ids']) && is_array($sec['admin_user_ids']) ? $sec['admin_user_ids'] : (isset($cfg['admin_user_ids']) && is_array($cfg['admin_user_ids']) ? $cfg['admin_user_ids'] : array());
        $adminNames = isset($sec['admin_usernames']) && is_array($sec['admin_usernames']) ? $sec['admin_usernames'] : (isset($cfg['admin_usernames']) && is_array($cfg['admin_usernames']) ? $cfg['admin_usernames'] : array());
        $isAdmin = in_array($userId, $adminIds, true) || in_array($username, $adminNames, true);
    }
    
    if (!$isAdmin) {
        http_response_code(403);
        echo json_encode(array('success' => false, 'error' => 'Admin access required'));
        exit;
    }
    
    return $userId;
}

// Ensure gamepass_settings table exists (gamepass_rewards already created via SQL)
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS gamepass_settings (
            setting_key VARCHAR(50) PRIMARY KEY,
            setting_value VARCHAR(255) NOT NULL,
            updated_at DATETIME NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
    
    // Insert default zen_skip_cost if not exists
    $stmt = $pdo->query("SELECT setting_value FROM gamepass_settings WHERE setting_key = 'zen_skip_cost'");
    if (!$stmt->fetch()) {
        $pdo->exec("INSERT INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('zen_skip_cost', '100000', NOW())");
    }
} catch (Exception $e) {
    // Table may already exist
}

// Helper to get gamepass setting
function getGamepassSetting($key, $default = null) {
    global $pdo;
    $stmt = $pdo->prepare("SELECT setting_value FROM gamepass_settings WHERE setting_key = ?");
    $stmt->execute(array($key));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? $row['setting_value'] : $default;
}

switch ($action) {
    case 'get_rewards':
        // Get all rewards (public or admin)
        $stmt = $pdo->query("SELECT * FROM gamepass_rewards ORDER BY day ASC, tier ASC");
        $rewards = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert types
        foreach ($rewards as &$r) {
            $r['id'] = (int)$r['id'];
            $r['day'] = (int)$r['day'];
            $r['item_id'] = (int)$r['item_id'];
            $r['quantity'] = (int)$r['quantity'];
            $r['coins'] = (int)$r['coins'];
            $r['zen'] = (int)$r['zen'];
            $r['exp'] = (int)$r['exp'];
        }
        
        // Get zen skip cost setting
        $zenSkipCost = (int)getGamepassSetting('zen_skip_cost', '100000');
        
        echo json_encode(array('success' => true, 'rewards' => $rewards, 'zen_skip_cost' => $zenSkipCost));
        break;
    
    case 'get_settings':
        // Get gamepass settings (admin only)
        requireAdminForWrite();
        
        $zenSkipCost = (int)getGamepassSetting('zen_skip_cost', '100000');
        
        echo json_encode(array(
            'success' => true,
            'settings' => array(
                'zen_skip_cost' => $zenSkipCost,
            )
        ));
        break;
    
    case 'update_settings':
        // Update gamepass settings (admin only)
        requireAdminForWrite();
        
        $input = json_decode(file_get_contents('php://input'), true);
        $zenSkipCost = isset($input['zen_skip_cost']) ? (int)$input['zen_skip_cost'] : null;
        
        if ($zenSkipCost !== null) {
            if ($zenSkipCost < 0) {
                echo json_encode(array('success' => false, 'error' => 'Zen cost cannot be negative'));
                exit;
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO gamepass_settings (setting_key, setting_value) 
                VALUES ('zen_skip_cost', ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
            ");
            $stmt->execute(array((string)$zenSkipCost));
        }
        
        echo json_encode(array('success' => true));
        break;

    case 'add_reward':
        requireAdminForWrite();
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        $day = isset($input['day']) ? (int)$input['day'] : 1;
        $tierInput = isset($input['tier']) ? $input['tier'] : '';
        $tier = in_array($tierInput, array('free', 'elite')) ? $tierInput : 'free';
        $item_id = isset($input['item_id']) ? (int)$input['item_id'] : 0;
        $item_name = isset($input['item_name']) ? trim($input['item_name']) : '';
        $quantity = max(1, isset($input['quantity']) ? (int)$input['quantity'] : 1);
        $coins = isset($input['coins']) ? (int)$input['coins'] : 0;
        $zen = isset($input['zen']) ? (int)$input['zen'] : 0;
        $exp = isset($input['exp']) ? (int)$input['exp'] : 0;
        $rarityInput = isset($input['rarity']) ? $input['rarity'] : '';
        $rarity = in_array($rarityInput, array('common', 'uncommon', 'rare', 'epic', 'legendary')) ? $rarityInput : 'common';
        $iconInput = isset($input['icon']) ? trim($input['icon']) : 'GIFT';
        $icon = $iconInput ? $iconInput : 'GIFT';
        
        if (empty($item_name)) {
            echo json_encode(array('success' => false, 'error' => 'Item name is required'));
            exit;
        }
        
        if ($day < 1 || $day > 30) {
            echo json_encode(array('success' => false, 'error' => 'Day must be between 1 and 30'));
            exit;
        }
        
        // Check for duplicate day+tier
        $stmt = $pdo->prepare("SELECT id FROM gamepass_rewards WHERE day = ? AND tier = ?");
        $stmt->execute(array($day, $tier));
        if ($stmt->fetch()) {
            echo json_encode(array('success' => false, 'error' => "Reward for day $day ($tier) already exists. Edit or delete it first."));
            exit;
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO gamepass_rewards (day, tier, item_id, item_name, quantity, coins, zen, exp, rarity, icon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute(array($day, $tier, $item_id, $item_name, $quantity, $coins, $zen, $exp, $rarity, $icon));
        
        echo json_encode(array('success' => true, 'id' => (int)$pdo->lastInsertId()));
        break;

    case 'update_reward':
        requireAdminForWrite();
        
        $input = json_decode(file_get_contents('php://input'), true);
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        
        if (!$id) {
            echo json_encode(array('success' => false, 'error' => 'ID is required'));
            exit;
        }
        
        $day = isset($input['day']) ? (int)$input['day'] : 1;
        $tierInput = isset($input['tier']) ? $input['tier'] : '';
        $tier = in_array($tierInput, array('free', 'elite')) ? $tierInput : 'free';
        $item_id = isset($input['item_id']) ? (int)$input['item_id'] : 0;
        $item_name = isset($input['item_name']) ? trim($input['item_name']) : '';
        $quantity = max(1, isset($input['quantity']) ? (int)$input['quantity'] : 1);
        $coins = isset($input['coins']) ? (int)$input['coins'] : 0;
        $zen = isset($input['zen']) ? (int)$input['zen'] : 0;
        $exp = isset($input['exp']) ? (int)$input['exp'] : 0;
        $rarityInput = isset($input['rarity']) ? $input['rarity'] : '';
        $rarity = in_array($rarityInput, array('common', 'uncommon', 'rare', 'epic', 'legendary')) ? $rarityInput : 'common';
        $iconInput = isset($input['icon']) ? trim($input['icon']) : 'GIFT';
        $icon = $iconInput ? $iconInput : 'GIFT';
        
        if (empty($item_name)) {
            echo json_encode(array('success' => false, 'error' => 'Item name is required'));
            exit;
        }
        
        // Check for duplicate day+tier (excluding current record)
        $stmt = $pdo->prepare("SELECT id FROM gamepass_rewards WHERE day = ? AND tier = ? AND id != ?");
        $stmt->execute(array($day, $tier, $id));
        if ($stmt->fetch()) {
            echo json_encode(array('success' => false, 'error' => "Another reward for day $day ($tier) already exists."));
            exit;
        }
        
        $stmt = $pdo->prepare("
            UPDATE gamepass_rewards 
            SET day = ?, tier = ?, item_id = ?, item_name = ?, quantity = ?, coins = ?, zen = ?, exp = ?, rarity = ?, icon = ?
            WHERE id = ?
        ");
        $stmt->execute(array($day, $tier, $item_id, $item_name, $quantity, $coins, $zen, $exp, $rarity, $icon, $id));
        
        echo json_encode(array('success' => true));
        break;

    case 'delete_reward':
        requireAdminForWrite();
        
        $input = json_decode(file_get_contents('php://input'), true);
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        
        if (!$id) {
            echo json_encode(array('success' => false, 'error' => 'ID is required'));
            exit;
        }
        
        $stmt = $pdo->prepare("DELETE FROM gamepass_rewards WHERE id = ?");
        $stmt->execute(array($id));
        
        echo json_encode(array('success' => true));
        break;

    default:
        echo json_encode(array('success' => false, 'error' => 'Invalid action'));
}
