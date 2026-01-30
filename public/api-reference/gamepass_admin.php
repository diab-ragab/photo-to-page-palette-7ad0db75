<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$pdo = getDB();
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Token-based auth helper (same as check_admin.php)
function getSessionToken(): string {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (stripos($auth, 'Bearer ') === 0) return trim(substr($auth, 7));
    
    $hdr = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? '';
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
        echo json_encode(['success' => false, 'error' => 'Not authenticated']);
        exit;
    }
    
    // Get user from session token
    $stmt = $pdo->prepare("
        SELECT us.user_id, u.name
        FROM user_sessions us
        JOIN users u ON u.ID = us.user_id
        WHERE us.session_token = ? AND us.expires_at > NOW()
        LIMIT 1
    ");
    $stmt->execute([$sessionToken]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$session) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Session expired or invalid']);
        exit;
    }
    
    $userId = (int)$session['user_id'];
    $username = (string)$session['name'];
    
    // Check admin role
    $stmt = $pdo->prepare("SELECT role FROM user_roles WHERE user_id = ?");
    $stmt->execute([$userId]);
    $roles = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
    
    $isAdmin = in_array('admin', $roles, true) || in_array('gm', $roles, true);
    
    // Also check bootstrap admin from config
    if (!$isAdmin) {
        $cfg = function_exists('getConfig') ? (array)getConfig() : [];
        $sec = $cfg['security'] ?? [];
        $adminIds = is_array($sec['admin_user_ids'] ?? null) ? $sec['admin_user_ids'] : (is_array($cfg['admin_user_ids'] ?? null) ? $cfg['admin_user_ids'] : []);
        $adminNames = is_array($sec['admin_usernames'] ?? null) ? $sec['admin_usernames'] : (is_array($cfg['admin_usernames'] ?? null) ? $cfg['admin_usernames'] : []);
        $isAdmin = in_array($userId, $adminIds, true) || in_array($username, $adminNames, true);
    }
    
    if (!$isAdmin) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Admin access required']);
        exit;
    }
    
    return $userId;
}

// Ensure gamepass_rewards table exists
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS gamepass_rewards (
            id INT AUTO_INCREMENT PRIMARY KEY,
            day INT NOT NULL,
            tier ENUM('free', 'elite') NOT NULL DEFAULT 'free',
            item_id INT NOT NULL DEFAULT 0,
            item_name VARCHAR(100) NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            coins INT NOT NULL DEFAULT 0,
            zen INT NOT NULL DEFAULT 0,
            exp INT NOT NULL DEFAULT 0,
            rarity ENUM('common', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
            icon VARCHAR(10) NOT NULL DEFAULT '🎁',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_day_tier (day, tier)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
} catch (Exception $e) {
    // Table may already exist
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
        
        echo json_encode(['success' => true, 'rewards' => $rewards]);
        break;

    case 'add_reward':
        requireAdminForWrite();
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        $day = (int)($input['day'] ?? 1);
        $tier = in_array($input['tier'] ?? '', ['free', 'elite']) ? $input['tier'] : 'free';
        $item_id = (int)($input['item_id'] ?? 0);
        $item_name = trim($input['item_name'] ?? '');
        $quantity = max(1, (int)($input['quantity'] ?? 1));
        $coins = (int)($input['coins'] ?? 0);
        $zen = (int)($input['zen'] ?? 0);
        $exp = (int)($input['exp'] ?? 0);
        $rarity = in_array($input['rarity'] ?? '', ['common', 'rare', 'epic', 'legendary']) ? $input['rarity'] : 'common';
        $icon = trim($input['icon'] ?? '🎁') ?: '🎁';
        
        if (empty($item_name)) {
            echo json_encode(['success' => false, 'error' => 'Item name is required']);
            exit;
        }
        
        if ($day < 1 || $day > 30) {
            echo json_encode(['success' => false, 'error' => 'Day must be between 1 and 30']);
            exit;
        }
        
        // Check for duplicate day+tier
        $stmt = $pdo->prepare("SELECT id FROM gamepass_rewards WHERE day = ? AND tier = ?");
        $stmt->execute([$day, $tier]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'error' => "Reward for day $day ($tier) already exists. Edit or delete it first."]);
            exit;
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO gamepass_rewards (day, tier, item_id, item_name, quantity, coins, zen, exp, rarity, icon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$day, $tier, $item_id, $item_name, $quantity, $coins, $zen, $exp, $rarity, $icon]);
        
        echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
        break;

    case 'update_reward':
        requireAdminForWrite();
        
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);
        
        if (!$id) {
            echo json_encode(['success' => false, 'error' => 'ID is required']);
            exit;
        }
        
        $day = (int)($input['day'] ?? 1);
        $tier = in_array($input['tier'] ?? '', ['free', 'elite']) ? $input['tier'] : 'free';
        $item_id = (int)($input['item_id'] ?? 0);
        $item_name = trim($input['item_name'] ?? '');
        $quantity = max(1, (int)($input['quantity'] ?? 1));
        $coins = (int)($input['coins'] ?? 0);
        $zen = (int)($input['zen'] ?? 0);
        $exp = (int)($input['exp'] ?? 0);
        $rarity = in_array($input['rarity'] ?? '', ['common', 'rare', 'epic', 'legendary']) ? $input['rarity'] : 'common';
        $icon = trim($input['icon'] ?? '🎁') ?: '🎁';
        
        if (empty($item_name)) {
            echo json_encode(['success' => false, 'error' => 'Item name is required']);
            exit;
        }
        
        // Check for duplicate day+tier (excluding current record)
        $stmt = $pdo->prepare("SELECT id FROM gamepass_rewards WHERE day = ? AND tier = ? AND id != ?");
        $stmt->execute([$day, $tier, $id]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'error' => "Another reward for day $day ($tier) already exists."]);
            exit;
        }
        
        $stmt = $pdo->prepare("
            UPDATE gamepass_rewards 
            SET day = ?, tier = ?, item_id = ?, item_name = ?, quantity = ?, coins = ?, zen = ?, exp = ?, rarity = ?, icon = ?
            WHERE id = ?
        ");
        $stmt->execute([$day, $tier, $item_id, $item_name, $quantity, $coins, $zen, $exp, $rarity, $icon, $id]);
        
        echo json_encode(['success' => true]);
        break;

    case 'delete_reward':
        requireAdminForWrite();
        
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);
        
        if (!$id) {
            echo json_encode(['success' => false, 'error' => 'ID is required']);
            exit;
        }
        
        $stmt = $pdo->prepare("DELETE FROM gamepass_rewards WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true]);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
}
