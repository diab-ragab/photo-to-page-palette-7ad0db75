<?php
require_once __DIR__ . '/config.php';
handleCors(['GET', 'POST', 'OPTIONS']);

$pdo = getDB();
$action = $_GET['action'] ?? '';
$input = getJsonInput();
if (!empty($input['action'])) $action = $input['action'];

// PUBLIC: List active sites
if ($action === 'list') {
    $stmt = $pdo->query("SELECT * FROM vote_sites WHERE is_active = 1 ORDER BY sort_order ASC");
    echo json_encode(['success' => true, 'sites' => $stmt->fetchAll()]);
    exit;
}

// PUBLIC: List all sites (for GM display)
if ($action === 'list_all') {
    $stmt = $pdo->query("SELECT * FROM vote_sites ORDER BY sort_order ASC");
    echo json_encode(['success' => true, 'sites' => $stmt->fetchAll()]);
    exit;
}

// GM ONLY: All write operations
requireGM();

if ($action === 'add') {
    $name = sanitizeInput($input['name'] ?? '', 100);
    $url = filter_var($input['url'] ?? '', FILTER_VALIDATE_URL) ? $input['url'] : '';
    $image_url = filter_var($input['image_url'] ?? '', FILTER_VALIDATE_URL) ? $input['image_url'] : null;
    $coins_reward = max(0, (int)($input['coins_reward'] ?? 50));
    $vip_reward = max(0, (int)($input['vip_reward'] ?? 25));
    $cooldown_hours = max(1, (int)($input['cooldown_hours'] ?? 12));
    $is_active = isset($input['is_active']) ? (bool)$input['is_active'] : true;
    $sort_order = (int)($input['sort_order'] ?? 0);
    
    if (empty($name) || empty($url)) {
        echo json_encode(['success' => false, 'message' => 'Name and URL are required']);
        exit;
    }
    
    $stmt = $pdo->prepare("INSERT INTO vote_sites (name, url, image_url, coins_reward, vip_reward, cooldown_hours, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $success = $stmt->execute([$name, $url, $image_url, $coins_reward, $vip_reward, $cooldown_hours, $is_active ? 1 : 0, $sort_order]);
    echo json_encode(['success' => $success, 'id' => (int)$pdo->lastInsertId()]);
    exit;
}

if ($action === 'update') {
    $id = (int)($input['id'] ?? 0);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Site ID required']);
        exit;
    }
    
    $updates = [];
    $params = [];
    
    if (isset($input['name'])) { $updates[] = "name = ?"; $params[] = sanitizeInput($input['name'], 100); }
    if (isset($input['url'])) { $updates[] = "url = ?"; $params[] = $input['url']; }
    if (array_key_exists('image_url', $input)) { $updates[] = "image_url = ?"; $params[] = $input['image_url'] ?: null; }
    if (isset($input['coins_reward'])) { $updates[] = "coins_reward = ?"; $params[] = max(0, (int)$input['coins_reward']); }
    if (isset($input['vip_reward'])) { $updates[] = "vip_reward = ?"; $params[] = max(0, (int)$input['vip_reward']); }
    if (isset($input['cooldown_hours'])) { $updates[] = "cooldown_hours = ?"; $params[] = max(1, (int)$input['cooldown_hours']); }
    if (isset($input['is_active'])) { $updates[] = "is_active = ?"; $params[] = (bool)$input['is_active'] ? 1 : 0; }
    if (isset($input['sort_order'])) { $updates[] = "sort_order = ?"; $params[] = (int)$input['sort_order']; }
    
    if (empty($updates)) {
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit;
    }
    
    $params[] = $id;
    $stmt = $pdo->prepare("UPDATE vote_sites SET " . implode(", ", $updates) . " WHERE id = ?");
    echo json_encode(['success' => $stmt->execute($params)]);
    exit;
}

if ($action === 'delete') {
    $id = (int)($input['id'] ?? 0);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Site ID required']);
        exit;
    }
    $stmt = $pdo->prepare("DELETE FROM vote_sites WHERE id = ?");
    echo json_encode(['success' => $stmt->execute([$id])]);
    exit;
}

jsonFail(400, 'Invalid action');
