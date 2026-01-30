<?php
require_once __DIR__ . '/bootstrap.php';

header('Content-Type: application/json');

$pdo = getDbConnection();
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Helper to check admin for write operations
function requireAdminForWrite() {
    session_start();
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Not authenticated']);
        exit;
    }
    
    global $pdo;
    $stmt = $pdo->prepare("SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1");
    $stmt->execute([$_SESSION['user_id']]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Admin access required']);
        exit;
    }
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
