<?php
require_once __DIR__ . '/config.php';
handleCors(['GET', 'POST', 'OPTIONS']);

$pdo = getDB();
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// PUBLIC: Get rewards (for display)
if ($action === 'get_rewards') {
    try {
        $stmt = $pdo->query("SELECT * FROM gamepass_rewards ORDER BY day ASC, tier ASC");
        $rewards = $stmt->fetchAll();
        
        foreach ($rewards as &$reward) {
            $reward['id'] = (int)$reward['id'];
            $reward['day'] = (int)$reward['day'];
            $reward['item_id'] = (int)$reward['item_id'];
            $reward['quantity'] = (int)$reward['quantity'];
            $reward['coins'] = (int)$reward['coins'];
            $reward['zen'] = (int)$reward['zen'];
            $reward['exp'] = (int)$reward['exp'];
        }
        
        echo json_encode(['success' => true, 'rewards' => $rewards]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to fetch rewards']);
    }
    exit;
}

// GM ONLY: All write operations
requireGM();

$input = getJsonInput();

if ($action === 'add_reward') {
    if (empty($input['item_name'])) {
        echo json_encode(['success' => false, 'message' => 'Item name is required']);
        exit;
    }
    
    $day = (int)($input['day'] ?? 1);
    $tier = in_array($input['tier'] ?? '', ['free', 'elite']) ? $input['tier'] : 'free';
    $item_id = (int)($input['item_id'] ?? 0);
    $item_name = sanitizeInput($input['item_name'], 100);
    $quantity = max(1, (int)($input['quantity'] ?? 1));
    $coins = max(0, (int)($input['coins'] ?? 0));
    $zen = max(0, (int)($input['zen'] ?? 0));
    $exp = max(0, (int)($input['exp'] ?? 0));
    $rarity = in_array($input['rarity'] ?? '', ['common', 'rare', 'epic', 'legendary']) ? $input['rarity'] : 'common';
    $icon = sanitizeInput($input['icon'] ?? '🎁', 10);
    $updated_by = $_SESSION['username'];
    
    if ($day < 1 || $day > 30) {
        echo json_encode(['success' => false, 'message' => 'Day must be between 1 and 30']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO gamepass_rewards (day, tier, item_id, item_name, quantity, coins, zen, exp, rarity, icon, updated_by, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$day, $tier, $item_id, $item_name, $quantity, $coins, $zen, $exp, $rarity, $icon, $updated_by]);
        echo json_encode(['success' => true, 'message' => 'Reward added', 'id' => (int)$pdo->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to add reward']);
    }
    exit;
}

if ($action === 'update_reward') {
    if (empty($input['id']) || empty($input['item_name'])) {
        echo json_encode(['success' => false, 'message' => 'Reward ID and item name are required']);
        exit;
    }
    
    $id = (int)$input['id'];
    $day = (int)($input['day'] ?? 1);
    $tier = in_array($input['tier'] ?? '', ['free', 'elite']) ? $input['tier'] : 'free';
    $item_id = (int)($input['item_id'] ?? 0);
    $item_name = sanitizeInput($input['item_name'], 100);
    $quantity = max(1, (int)($input['quantity'] ?? 1));
    $coins = max(0, (int)($input['coins'] ?? 0));
    $zen = max(0, (int)($input['zen'] ?? 0));
    $exp = max(0, (int)($input['exp'] ?? 0));
    $rarity = in_array($input['rarity'] ?? '', ['common', 'rare', 'epic', 'legendary']) ? $input['rarity'] : 'common';
    $icon = sanitizeInput($input['icon'] ?? '🎁', 10);
    $updated_by = $_SESSION['username'];
    
    if ($day < 1 || $day > 30) {
        echo json_encode(['success' => false, 'message' => 'Day must be between 1 and 30']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("
            UPDATE gamepass_rewards 
            SET day = ?, tier = ?, item_id = ?, item_name = ?, quantity = ?, coins = ?, zen = ?, exp = ?, rarity = ?, icon = ?, updated_by = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$day, $tier, $item_id, $item_name, $quantity, $coins, $zen, $exp, $rarity, $icon, $updated_by, $id]);
        
        echo json_encode($stmt->rowCount() > 0 
            ? ['success' => true, 'message' => 'Reward updated'] 
            : ['success' => false, 'message' => 'Reward not found']
        );
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to update reward']);
    }
    exit;
}

if ($action === 'delete_reward') {
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Reward ID is required']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM gamepass_rewards WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode($stmt->rowCount() > 0 
            ? ['success' => true, 'message' => 'Reward deleted'] 
            : ['success' => false, 'message' => 'Reward not found']
        );
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to delete reward']);
    }
    exit;
}

jsonFail(400, 'Invalid action');
