<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$pdo = getDB();
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

// Ensure vote_sites table exists
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS vote_sites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            url VARCHAR(500) NOT NULL,
            image_url VARCHAR(500) DEFAULT NULL,
            coins_reward INT NOT NULL DEFAULT 50,
            vip_reward INT NOT NULL DEFAULT 25,
            cooldown_hours INT NOT NULL DEFAULT 12,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
} catch (Exception $e) {
    // Table may already exist
}

switch ($action) {
    case 'list':
        // Get active sites only (public)
        $stmt = $pdo->query("SELECT * FROM vote_sites WHERE is_active = 1 ORDER BY sort_order ASC, id ASC");
        $sites = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'sites' => $sites]);
        break;

    case 'list_all':
        // Get all sites including inactive (admin)
        $stmt = $pdo->query("SELECT * FROM vote_sites ORDER BY sort_order ASC, id ASC");
        $sites = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'sites' => $sites]);
        break;

    case 'add':
        requireAdminForWrite();
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        $name = trim($input['name'] ?? '');
        $url = trim($input['url'] ?? '');
        $image_url = trim($input['image_url'] ?? '') ?: null;
        $coins_reward = (int)($input['coins_reward'] ?? 50);
        $vip_reward = (int)($input['vip_reward'] ?? 25);
        $cooldown_hours = (int)($input['cooldown_hours'] ?? 12);
        $is_active = isset($input['is_active']) ? ($input['is_active'] ? 1 : 0) : 1;
        $sort_order = (int)($input['sort_order'] ?? 0);
        
        if (empty($name) || empty($url)) {
            echo json_encode(['success' => false, 'error' => 'Name and URL are required']);
            exit;
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO vote_sites (name, url, image_url, coins_reward, vip_reward, cooldown_hours, is_active, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$name, $url, $image_url, $coins_reward, $vip_reward, $cooldown_hours, $is_active, $sort_order]);
        
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        break;

    case 'update':
        requireAdminForWrite();
        
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);
        
        if (!$id) {
            echo json_encode(['success' => false, 'error' => 'ID is required']);
            exit;
        }
        
        $updates = [];
        $params = [];
        
        if (isset($input['name'])) {
            $updates[] = "name = ?";
            $params[] = trim($input['name']);
        }
        if (isset($input['url'])) {
            $updates[] = "url = ?";
            $params[] = trim($input['url']);
        }
        if (array_key_exists('image_url', $input)) {
            $updates[] = "image_url = ?";
            $params[] = trim($input['image_url']) ?: null;
        }
        if (isset($input['coins_reward'])) {
            $updates[] = "coins_reward = ?";
            $params[] = (int)$input['coins_reward'];
        }
        if (isset($input['vip_reward'])) {
            $updates[] = "vip_reward = ?";
            $params[] = (int)$input['vip_reward'];
        }
        if (isset($input['cooldown_hours'])) {
            $updates[] = "cooldown_hours = ?";
            $params[] = (int)$input['cooldown_hours'];
        }
        if (isset($input['is_active'])) {
            $updates[] = "is_active = ?";
            $params[] = $input['is_active'] ? 1 : 0;
        }
        if (isset($input['sort_order'])) {
            $updates[] = "sort_order = ?";
            $params[] = (int)$input['sort_order'];
        }
        
        if (empty($updates)) {
            echo json_encode(['success' => false, 'error' => 'No fields to update']);
            exit;
        }
        
        $params[] = $id;
        $sql = "UPDATE vote_sites SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode(['success' => true]);
        break;

    case 'delete':
        requireAdminForWrite();
        
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);
        
        if (!$id) {
            echo json_encode(['success' => false, 'error' => 'ID is required']);
            exit;
        }
        
        $stmt = $pdo->prepare("DELETE FROM vote_sites WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true]);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
}
