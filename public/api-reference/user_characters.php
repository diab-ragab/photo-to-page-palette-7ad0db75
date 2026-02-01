<?php
/**
 * User Characters API
 * Fetches active characters from basetab_sg for the authenticated user
 */

require_once __DIR__ . '/bootstrap.php';

$rid = 'CHR' . substr(md5(uniqid()), 0, 8);

// Only GET allowed
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(array('success' => false, 'message' => 'Method not allowed'));
    exit;
}

// Get session token
$token = '';
if (isset($_SERVER['HTTP_X_SESSION_TOKEN'])) {
    $token = $_SERVER['HTTP_X_SESSION_TOKEN'];
} elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $auth = $_SERVER['HTTP_AUTHORIZATION'];
    if (strpos($auth, 'Bearer ') === 0) {
        $token = substr($auth, 7);
    }
}

if (empty($token)) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(array('success' => false, 'message' => 'Authentication required'));
    exit;
}

try {
    $pdo = getDbConnection();
    
    // Verify session and get user
    $stmt = $pdo->prepare("SELECT user_id, expires_at FROM user_sessions WHERE session_token = ? LIMIT 1");
    $stmt->execute(array($token));
    $sess = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$sess) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(array('success' => false, 'message' => 'Invalid session'));
        exit;
    }
    
    if (strtotime($sess['expires_at']) <= time()) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(array('success' => false, 'message' => 'Session expired'));
        exit;
    }
    
    $userId = (int)$sess['user_id'];
    
    // Get username from users table
    $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ? LIMIT 1");
    $stmt->execute(array($userId));
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        // Try 'login' column if 'name' doesn't exist
        $stmt = $pdo->prepare("SELECT login as name FROM users WHERE id = ? LIMIT 1");
        $stmt->execute(array($userId));
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    if (!$user) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(array('success' => false, 'message' => 'User not found'));
        exit;
    }
    
    $username = $user['name'];
    
    // Get AccountID from users table (the id is the AccountID for game linking)
    // First try to find characters by matching account
    
    // Check if there's a direct AccountID link or use user_id
    $accountId = $userId;
    
    // Fetch active characters from basetab_sg
    // IsDel = 0 means active character
    $stmt = $pdo->prepare("
        SELECT 
            RoleID,
            Name,
            Level,
            Profession,
            Sex
        FROM basetab_sg 
        WHERE AccountID = ? AND IsDel = 0
        ORDER BY Level DESC, Name ASC
    ");
    $stmt->execute(array($accountId));
    $characters = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Map profession IDs to names (adjust based on your game)
    $professionNames = array(
        0 => 'Warrior',
        1 => 'Mage',
        2 => 'Ranger',
        3 => 'Assassin',
        4 => 'Priest',
        5 => 'Paladin',
        6 => 'Warlock',
        7 => 'Berserker',
        8 => 'Monk'
    );
    
    $result = array();
    foreach ($characters as $char) {
        $profId = (int)$char['Profession'];
        $profName = isset($professionNames[$profId]) ? $professionNames[$profId] : 'Unknown';
        
        $result[] = array(
            'roleId' => (int)$char['RoleID'],
            'name' => $char['Name'],
            'level' => (int)$char['Level'],
            'profession' => $profName,
            'professionId' => $profId,
            'sex' => (int)$char['Sex']
        );
    }
    
    error_log("RID={$rid} CHARACTERS_FETCHED user={$userId} account={$accountId} count=" . count($result));
    
    header('Content-Type: application/json');
    echo json_encode(array(
        'success' => true,
        'characters' => $result
    ));
    
} catch (Exception $e) {
    error_log("RID={$rid} CHARACTERS_ERROR=" . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(array('success' => false, 'message' => 'Server error'));
}
