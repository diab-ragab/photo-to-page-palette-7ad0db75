<?php
require_once __DIR__ . '/config.php';
handleCors(['GET', 'POST', 'OPTIONS']);

$pdo = getDB();

// Ensure tables exist
$pdo->exec("
    CREATE TABLE IF NOT EXISTS user_gamepass (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        has_elite TINYINT(1) DEFAULT 0,
        purchase_date DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$pdo->exec("
    CREATE TABLE IF NOT EXISTS gamepass_claims (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        day INT NOT NULL,
        tier ENUM('free', 'elite') NOT NULL,
        claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_claim (username, day, tier)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

// Calculate current day based on month start
$monthStart = strtotime(date('Y-m-01'));
$currentDay = min(30, floor((time() - $monthStart) / 86400) + 1);

$action = $_GET['action'] ?? '';

// GET: Get user status
if ($action === 'get_status' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $userId = sanitizeInput($_GET['user_id'] ?? '', 50);
    
    if (empty($userId)) {
        echo json_encode(['success' => false, 'message' => 'User ID required']);
        exit;
    }
    
    // Ensure user record exists
    $pdo->prepare("INSERT IGNORE INTO user_gamepass (username) VALUES (?)")->execute([$userId]);
    
    // Get elite status
    $stmt = $pdo->prepare("SELECT has_elite FROM user_gamepass WHERE username = ?");
    $stmt->execute([$userId]);
    $pass = $stmt->fetch();
    
    // Get claimed days
    $stmt = $pdo->prepare("SELECT day FROM gamepass_claims WHERE username = ? AND MONTH(claimed_at) = MONTH(CURRENT_DATE())");
    $stmt->execute([$userId]);
    $claims = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo json_encode([
        'success' => true,
        'hasElitePass' => (bool)($pass['has_elite'] ?? false),
        'claimedDays' => array_map('intval', $claims),
        'currentDay' => $currentDay
    ]);
    exit;
}

// POST: Claim reward
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getJsonInput();
    $action = $input['action'] ?? '';
    
    if ($action === 'claim_reward') {
        $userId = sanitizeInput($input['user_id'] ?? '', 50);
        $day = (int)($input['day'] ?? 0);
        $isElite = (bool)($input['is_elite'] ?? false);
        
        if (empty($userId) || $day < 1 || $day > 30) {
            echo json_encode(['success' => false, 'message' => 'Invalid parameters']);
            exit;
        }
        
        if ($day > $currentDay) {
            echo json_encode(['success' => false, 'message' => 'Day not yet available']);
            exit;
        }
        
        // Check elite access
        if ($isElite) {
            $stmt = $pdo->prepare("SELECT has_elite FROM user_gamepass WHERE username = ?");
            $stmt->execute([$userId]);
            $pass = $stmt->fetch();
            if (!($pass['has_elite'] ?? false)) {
                echo json_encode(['success' => false, 'message' => 'Elite pass required']);
                exit;
            }
        }
        
        $tier = $isElite ? 'elite' : 'free';
        
        try {
            $stmt = $pdo->prepare("INSERT INTO gamepass_claims (username, day, tier) VALUES (?, ?, ?)");
            $stmt->execute([$userId, $day, $tier]);
            echo json_encode(['success' => true, 'message' => 'Reward claimed!']);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                echo json_encode(['success' => false, 'message' => 'Already claimed']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Claim failed']);
            }
        }
        exit;
    }
}

echo json_encode(['success' => false, 'message' => 'Invalid action']);
