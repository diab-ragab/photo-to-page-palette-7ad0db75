<?php
/**
 * vote_sites.php - Vote Sites Management API
 * PHP 5.x / MySQL 5.1+ compatible
 */
require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET', 'POST', 'OPTIONS'));
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session_helper.php';

header('Content-Type: application/json');

$pdo = getDB();

// Read JSON body once
$__rawBody = file_get_contents('php://input');
$__jsonInput = json_decode($__rawBody ? $__rawBody : '', true);
if (!is_array($__jsonInput)) $__jsonInput = array();

// Get action from query string or JSON body
$action = '';
if (isset($_GET['action'])) {
    $action = $_GET['action'];
} elseif (isset($_POST['action'])) {
    $action = $_POST['action'];
} elseif (isset($__jsonInput['action'])) {
    $action = (string)$__jsonInput['action'];
}

switch ($action) {
    case 'list':
        // Get active sites only (public - no auth required)
        $stmt = $pdo->query("SELECT * FROM vote_sites WHERE is_active = 1 ORDER BY sort_order ASC, id ASC");
        $sites = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(array('success' => true, 'sites' => $sites));
        break;

    case 'list_all':
        // Get all sites including inactive (admin only)
        requireAdmin();
        $stmt = $pdo->query("SELECT * FROM vote_sites ORDER BY sort_order ASC, id ASC");
        $sites = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(array('success' => true, 'sites' => $sites));
        break;

    case 'add':
        requireAdmin();
        $input = $__jsonInput;
        
        $name = isset($input['name']) ? trim($input['name']) : '';
        $url = isset($input['url']) ? trim($input['url']) : '';
        $image_url = isset($input['image_url']) && trim($input['image_url']) !== '' ? trim($input['image_url']) : null;
        $coins_reward = isset($input['coins_reward']) ? (int)$input['coins_reward'] : 50;
        $vip_reward = isset($input['vip_reward']) ? (int)$input['vip_reward'] : 25;
        $cooldown_hours = isset($input['cooldown_hours']) ? (int)$input['cooldown_hours'] : 12;
        $is_active = isset($input['is_active']) ? ($input['is_active'] ? 1 : 0) : 1;
        $sort_order = isset($input['sort_order']) ? (int)$input['sort_order'] : 0;
        
        if ($name === '' || $url === '') {
            echo json_encode(array('success' => false, 'error' => 'Name and URL are required'));
            exit;
        }
        
        $now = date('Y-m-d H:i:s');
        $stmt = $pdo->prepare("
            INSERT INTO vote_sites (name, url, image_url, coins_reward, vip_reward, cooldown_hours, is_active, sort_order, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute(array($name, $url, $image_url, $coins_reward, $vip_reward, $cooldown_hours, $is_active, $sort_order, $now));
        
        echo json_encode(array('success' => true, 'id' => $pdo->lastInsertId()));
        break;

    case 'update':
        requireAdmin();
        $input = $__jsonInput;
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        
        if ($id <= 0) {
            echo json_encode(array('success' => false, 'error' => 'ID is required'));
            exit;
        }
        
        $updates = array();
        $params = array();
        
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
            $val = isset($input['image_url']) ? trim($input['image_url']) : '';
            $params[] = $val !== '' ? $val : null;
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
        
        if (count($updates) === 0) {
            echo json_encode(array('success' => false, 'error' => 'No fields to update'));
            exit;
        }
        
        $params[] = $id;
        $sql = "UPDATE vote_sites SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode(array('success' => true));
        break;

    case 'delete':
        requireAdmin();
        $input = $__jsonInput;
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        
        if ($id <= 0) {
            echo json_encode(array('success' => false, 'error' => 'ID is required'));
            exit;
        }
        
        $stmt = $pdo->prepare("DELETE FROM vote_sites WHERE id = ?");
        $stmt->execute(array($id));
        
        echo json_encode(array('success' => true));
        break;

    default:
        echo json_encode(array('success' => false, 'error' => 'Invalid action'));
}
