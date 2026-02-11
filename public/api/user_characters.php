<?php
/**
 * User Characters API
 * Fetches active characters from basetab_sg for the authenticated user
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';
handleCors(array('GET', 'OPTIONS'));

$rid = 'CHR' . substr(md5(uniqid()), 0, 8);

// Only GET allowed
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(array('success' => false, 'message' => 'Method not allowed'));
    exit;
}

// Get session token using centralized helper
$token = getSessionToken();

if (empty($token)) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(array('success' => false, 'message' => 'Authentication required'));
    exit;
}

try {
    $pdo = getDB();
    
    // Verify session using centralized helper
    $sess = resolveSessionRow($token);
    
    if (!$sess) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(array('success' => false, 'message' => 'Invalid session'));
        exit;
    }
    
    if (isset($sess['expires_at']) && isSessionExpired($sess['expires_at'])) {
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
    
    // Use user_id as AccountID for game linking
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
    
    // Map profession IDs to class names (based on game data)
    $professionNames = array(
        0 => 'Berzerker',
        1 => 'Magus',
        2 => 'Champion',
        3 => 'Heretic',
        4 => 'Slayer',
        5 => 'Duelist',
        6 => 'Ranger',
        7 => 'Enchantress',
        8 => 'Harbinger'
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
