<?php
// api/user_currency.php
// Get user's currency balances (coins, vip, zen)

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

$rid = substr(bin2hex(random_bytes(6)), 0, 12);

$username = trim($_GET['username'] ?? '');

if (empty($username)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Username required', 'rid' => $rid]);
    exit;
}

try {
    $pdo = getDB();

    // Get user ID
    $stmt = $pdo->prepare("SELECT ID FROM users WHERE login = ? LIMIT 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo json_encode([
            'success' => true,
            'coins' => 0,
            'vip_points' => 0,
            'zen' => 0,
            'total_votes' => 0,
            'rid' => $rid
        ]);
        exit;
    }
    
    $userId = (int)$user['ID'];
    
    // Get user_currency data
    $coins = 0;
    $vipPoints = 0;
    $totalVotes = 0;
    
    try {
        $stmt = $pdo->prepare("SELECT coins, vip_points, total_votes FROM user_currency WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $currency = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($currency) {
            $coins = (int)$currency['coins'];
            $vipPoints = (int)$currency['vip_points'];
            $totalVotes = (int)$currency['total_votes'];
        }
    } catch (Exception $e) {
        // Table might not exist
    }
    
    // Get Zen from goldtab_sg (Gold column)
    $zen = 0;
    try {
        // goldtab_sg uses AccountID, need to match with users.ID
        $stmt = $pdo->prepare("SELECT Gold FROM goldtab_sg WHERE AccountID = ? LIMIT 1");
        $stmt->execute([$userId]);
        $gold = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($gold) {
            $zen = (int)$gold['Gold'];
        }
    } catch (Exception $e) {
        // Table might not exist
    }

    echo json_encode([
        'success' => true,
        'coins' => $coins,
        'vip_points' => $vipPoints,
        'zen' => $zen,
        'total_votes' => $totalVotes,
        'rid' => $rid
    ]);

} catch (PDOException $e) {
    error_log("user_currency error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error',
        'rid' => $rid
    ]);
}
