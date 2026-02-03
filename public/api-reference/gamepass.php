<?php
/**
 * gamepass.php - Game Pass status and reward claiming API
 * 
 * GET  ?action=status - Get current game pass status for user
 * GET  ?action=rewards - Get rewards list (public, no auth required)
 * POST ?action=claim  - Claim a daily reward (free on current/past days, costs Zen for future days)
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mail_delivery.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDB();
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

// Get Zen skip cost from settings (fallback to 100k)
function getZenSkipCost() {
    global $pdo;
    try {
        $stmt = $pdo->query("SELECT setting_value FROM gamepass_settings WHERE setting_key = 'zen_skip_cost'");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? (int)$row['setting_value'] : 100000;
    } catch (Exception $e) {
        return 100000;
    }
}

// Token-based auth helper
function getSessionToken() {
    $auth = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (stripos($auth, 'Bearer ') === 0) return trim(substr($auth, 7));
    
    $hdr = isset($_SERVER['HTTP_X_SESSION_TOKEN']) ? $_SERVER['HTTP_X_SESSION_TOKEN'] : '';
    if ($hdr) return trim($hdr);
    
    if (!empty($_GET['sessionToken'])) return trim((string)$_GET['sessionToken']);
    if (!empty($_COOKIE['sessionToken'])) return trim((string)$_COOKIE['sessionToken']);
    
    return '';
}

function getCurrentUser() {
    global $pdo;
    
    $sessionToken = getSessionToken();
    if ($sessionToken === '') {
        return null;
    }
    
    // Try raw token first
    $stmt = $pdo->prepare("
        SELECT us.user_id, u.name
        FROM user_sessions us
        JOIN users u ON u.ID = us.user_id
        WHERE us.session_token = ? AND us.expires_at > NOW()
        LIMIT 1
    ");
    $stmt->execute(array($sessionToken));
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // If not found, try SHA-256 hash (some deployments store hashed tokens)
    if (!$session) {
        $sessionTokenHash = hash('sha256', $sessionToken);
        $stmt->execute(array($sessionTokenHash));
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    return $session;
}

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

// Get user's Zen balance from goldtab_sg
function getUserZen($userId) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("SELECT Gold FROM goldtab_sg WHERE AccountID = ? LIMIT 1");
        $stmt->execute(array($userId));
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? (int)$row['Gold'] : 0;
    } catch (Exception $e) {
        error_log("GET_ZEN_ERROR: " . $e->getMessage());
        return 0;
    }
}

// Deduct Zen from user's account
function deductUserZen($userId, $amount) {
    global $pdo;
    try {
        // Check balance first
        $currentZen = getUserZen($userId);
        if ($currentZen < $amount) {
            return array('success' => false, 'message' => 'Insufficient Zen balance');
        }
        
        $stmt = $pdo->prepare("UPDATE goldtab_sg SET Gold = Gold - ? WHERE AccountID = ? AND Gold >= ?");
        $stmt->execute(array($amount, $userId, $amount));
        
        if ($stmt->rowCount() > 0) {
            return array('success' => true);
        } else {
            return array('success' => false, 'message' => 'Failed to deduct Zen');
        }
    } catch (Exception $e) {
        error_log("DEDUCT_ZEN_ERROR: " . $e->getMessage());
        return array('success' => false, 'message' => 'Database error');
    }
}

// Ensure tables exist - using user's provided schema
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_gamepass (
            user_id INT PRIMARY KEY,
            is_premium TINYINT(1) NOT NULL DEFAULT 0,
            started_at DATETIME,
            expires_at DATETIME,
            KEY idx_premium (is_premium)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
    
    // User's gamepass_claims table structure
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_gamepass_claims (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            day INT NOT NULL,
            tier VARCHAR(10) NOT NULL,
            claimed_at DATETIME,
            cycle_start DATE NOT NULL,
            zen_cost INT NOT NULL DEFAULT 0,
            UNIQUE KEY unique_claim (user_id, day, tier, cycle_start),
            KEY idx_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
    
    // User's gamepass_rewards table structure (icon uses text code, not emoji for MySQL 5.1 utf8 compat)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS gamepass_rewards (
            id INT AUTO_INCREMENT PRIMARY KEY,
            day INT NOT NULL,
            tier VARCHAR(10) NOT NULL DEFAULT 'free',
            item_id INT NOT NULL DEFAULT 0,
            item_name VARCHAR(100) NOT NULL DEFAULT '',
            quantity INT NOT NULL DEFAULT 1,
            coins INT NOT NULL DEFAULT 0,
            zen BIGINT NOT NULL DEFAULT 0,
            exp INT NOT NULL DEFAULT 0,
            rarity VARCHAR(20) NOT NULL DEFAULT 'common',
            icon VARCHAR(10) NOT NULL DEFAULT 'GIFT',
            created_at DATETIME,
            updated_at DATETIME,
            UNIQUE KEY unique_reward (day, tier),
            KEY idx_day (day)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
} catch (Exception $e) {
    // Tables may exist
}

// Calculate current cycle (30-day cycles starting from a fixed date)
function getCycleInfo() {
    $cycleLength = 30;
    $epochStart = strtotime('2025-01-01'); // Fixed start date for cycles
    $now = time();
    
    $daysSinceEpoch = floor(($now - $epochStart) / 86400);
    $currentCycle = floor($daysSinceEpoch / $cycleLength);
    $dayInCycle = ($daysSinceEpoch % $cycleLength) + 1; // 1-30
    
    $cycleStartDate = date('Y-m-d', $epochStart + ($currentCycle * $cycleLength * 86400));
    
    return array(
        'current_day' => $dayInCycle,
        'cycle_start' => $cycleStartDate,
        'days_remaining' => $cycleLength - $dayInCycle
    );
}

switch ($action) {
    // Public rewards endpoint - no auth required
    case 'rewards':
        $cycle = getCycleInfo();
        $rewards = array();
        try {
            $stmt = $pdo->query("SELECT * FROM gamepass_rewards ORDER BY day ASC, tier ASC");
            if ($stmt) {
                $rewards = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
        } catch (Exception $e) {
            error_log("GAMEPASS_REWARDS_ERROR: " . $e->getMessage());
        }
        
        foreach ($rewards as &$r) {
            $r['id'] = (int)$r['id'];
            $r['day'] = (int)$r['day'];
            $r['item_id'] = (int)$r['item_id'];
            $r['quantity'] = (int)$r['quantity'];
            $r['coins'] = (int)$r['coins'];
            $r['zen'] = (int)$r['zen'];
            $r['exp'] = (int)$r['exp'];
            $r['rarity'] = isset($r['rarity']) ? $r['rarity'] : 'common';
            $r['icon'] = isset($r['icon']) ? $r['icon'] : '🎁';
        }
        
        jsonResponse(array(
            'success' => true,
            'current_day' => $cycle['current_day'],
            'cycle_start' => $cycle['cycle_start'],
            'days_remaining' => $cycle['days_remaining'],
            'zen_cost_per_day' => getZenSkipCost(),
            'rewards' => $rewards
        ));
        break;
        
    case 'status':
        $user = getCurrentUser();
        if (!$user) {
            jsonResponse(array('success' => false, 'error' => 'Not authenticated'), 401);
        }
        
        $userId = (int)$user['user_id'];
        $cycle = getCycleInfo();
        
        // Get premium status
        $stmt = $pdo->prepare("SELECT is_premium, expires_at FROM user_gamepass WHERE user_id = ?");
        $stmt->execute(array($userId));
        $gp = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $isPremium = false;
        if ($gp) {
            $expiresAt = isset($gp['expires_at']) ? $gp['expires_at'] : null;
            $isPremium = (int)$gp['is_premium'] === 1 && ($expiresAt === null || strtotime($expiresAt) > time());
        }
        
        // Get user's Zen balance
        $userZen = getUserZen($userId);
        
        // Get claimed days for this cycle - using user_gamepass_claims table
        $stmt = $pdo->prepare("
            SELECT day, tier FROM user_gamepass_claims 
            WHERE user_id = ? AND cycle_start = ?
        ");
        $stmt->execute(array($userId, $cycle['cycle_start']));
        $claims = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $claimedDays = array('free' => array(), 'elite' => array());
        foreach ($claims as $c) {
            $tier = $c['tier'];
            if (isset($claimedDays[$tier])) {
                $claimedDays[$tier][] = (int)$c['day'];
            }
        }
        
        // Get rewards config
        $rewards = array();
        try {
            $stmt = $pdo->query("SELECT * FROM gamepass_rewards ORDER BY day ASC, tier ASC");
            if ($stmt) {
                $rewards = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
        } catch (Exception $e) {
            error_log("GAMEPASS_STATUS_REWARDS_ERROR: " . $e->getMessage());
        }
        
        foreach ($rewards as &$r) {
            $r['id'] = (int)$r['id'];
            $r['day'] = (int)$r['day'];
            $r['item_id'] = (int)$r['item_id'];
            $r['quantity'] = (int)$r['quantity'];
            $r['coins'] = (int)$r['coins'];
            $r['zen'] = (int)$r['zen'];
            $r['exp'] = (int)$r['exp'];
            $r['rarity'] = isset($r['rarity']) ? $r['rarity'] : 'common';
            $r['icon'] = isset($r['icon']) ? $r['icon'] : '🎁';
        }
        
        jsonResponse(array(
            'success' => true,
            'is_premium' => $isPremium,
            'current_day' => $cycle['current_day'],
            'cycle_start' => $cycle['cycle_start'],
            'days_remaining' => $cycle['days_remaining'],
            'claimed_days' => $claimedDays,
            'user_zen' => $userZen,
            'zen_cost_per_day' => getZenSkipCost(),
            'rewards' => $rewards
        ));
        break;
        
    case 'claim':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(array('success' => false, 'error' => 'Method not allowed'), 405);
        }
        
        $user = getCurrentUser();
        if (!$user) {
            jsonResponse(array('success' => false, 'error' => 'Not authenticated'), 401);
        }
        
        $userId = (int)$user['user_id'];
        $input = json_decode(file_get_contents('php://input'), true);
        
        $day = isset($input['day']) ? (int)$input['day'] : 0;
        $tier = isset($input['tier']) && in_array($input['tier'], array('free', 'elite')) ? $input['tier'] : 'free';
        $roleId = isset($input['roleId']) ? (int)$input['roleId'] : 0;
        $payWithZen = isset($input['payWithZen']) && $input['payWithZen'] === true;
        
        if ($day < 1 || $day > 30) {
            jsonResponse(array('success' => false, 'error' => 'Invalid day'), 400);
        }
        
        // Validate roleId is provided and belongs to this user
        if ($roleId <= 0) {
            jsonResponse(array('success' => false, 'error' => 'Please select a character to receive the reward'), 400);
        }
        
        // Verify the character belongs to this account
        $stmt = $pdo->prepare("SELECT RoleID, Name FROM basetab_sg WHERE RoleID = ? AND AccountID = ? AND IsDel = 0 LIMIT 1");
        $stmt->execute(array($roleId, $userId));
        $character = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$character) {
            jsonResponse(array('success' => false, 'error' => 'Invalid character selected. Please choose a valid character.'), 400);
        }
        
        $cycle = getCycleInfo();
        $zenCost = 0;
        
        // Check if this is a future day (requires Zen payment for Free tier)
        $zenSkipCost = getZenSkipCost();
        if ($day > $cycle['current_day']) {
            if ($tier === 'free') {
                // Free tier: Can pay Zen to unlock future days
                if (!$payWithZen) {
                    $daysAhead = $day - $cycle['current_day'];
                    $zenCost = $daysAhead * $zenSkipCost;
                    jsonResponse(array(
                        'success' => false, 
                        'error' => 'This day is locked. Pay Zen to unlock early.',
                        'requires_zen' => true,
                        'zen_cost' => $zenCost,
                        'days_ahead' => $daysAhead
                    ), 400);
                }
                
                // Calculate Zen cost
                $daysAhead = $day - $cycle['current_day'];
                $zenCost = $daysAhead * $zenSkipCost;
                
                // Deduct Zen from user
                $deductResult = deductUserZen($userId, $zenCost);
                if (!$deductResult['success']) {
                    jsonResponse(array(
                        'success' => false, 
                        'error' => $deductResult['message'],
                        'zen_cost' => $zenCost,
                        'user_zen' => getUserZen($userId)
                    ), 400);
                }
            } else {
                // Elite tier: Cannot skip ahead (must wait for day)
                jsonResponse(array('success' => false, 'error' => 'Cannot claim future Elite rewards'), 400);
            }
        }
        
        // Check elite tier eligibility
        if ($tier === 'elite') {
            $stmt = $pdo->prepare("SELECT is_premium, expires_at FROM user_gamepass WHERE user_id = ?");
            $stmt->execute(array($userId));
            $gp = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $isPremium = false;
            if ($gp) {
                $expiresAt = isset($gp['expires_at']) ? $gp['expires_at'] : null;
                $isPremium = (int)$gp['is_premium'] === 1 && ($expiresAt === null || strtotime($expiresAt) > time());
            }
            
            if (!$isPremium) {
                jsonResponse(array('success' => false, 'error' => 'Elite tier requires premium Game Pass'), 403);
            }
        }
        
        // Check if already claimed - using user_gamepass_claims table
        $stmt = $pdo->prepare("
            SELECT id FROM user_gamepass_claims 
            WHERE user_id = ? AND day = ? AND tier = ? AND cycle_start = ?
        ");
        $stmt->execute(array($userId, $day, $tier, $cycle['cycle_start']));
        if ($stmt->fetch()) {
            jsonResponse(array('success' => false, 'error' => 'Already claimed this reward'), 400);
        }
        
        // Get reward config
        $stmt = $pdo->prepare("SELECT * FROM gamepass_rewards WHERE day = ? AND tier = ?");
        $stmt->execute(array($day, $tier));
        $reward = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$reward) {
            jsonResponse(array('success' => false, 'error' => 'No reward configured for this day'), 404);
        }
        
        // Send reward via in-game mail
        $mailer = new GameMailer($pdo);
        $result = $mailer->sendGamePassReward(
            $roleId,
            $day,
            $tier,
            (int)$reward['item_id'],
            (int)$reward['quantity'],
            (int)$reward['coins'],
            (int)$reward['zen'],
            (int)$reward['exp']
        );
        
        if (!$result['success']) {
            error_log("GAMEPASS_CLAIM_FAILED user={$userId} day={$day} tier={$tier} error={$result['message']}");
            // Refund Zen if claim failed and we charged
            if ($zenCost > 0) {
                try {
                    $stmt = $pdo->prepare("UPDATE goldtab_sg SET Gold = Gold + ? WHERE AccountID = ?");
                    $stmt->execute(array($zenCost, $userId));
                    error_log("GAMEPASS_ZEN_REFUND user={$userId} amount={$zenCost}");
                } catch (Exception $e) {
                    error_log("GAMEPASS_ZEN_REFUND_FAILED: " . $e->getMessage());
                }
            }
            jsonResponse(array('success' => false, 'error' => 'Failed to deliver reward. Please try again.'), 500);
        }
        
        // Record the claim - using user_gamepass_claims table
        $stmt = $pdo->prepare("
            INSERT INTO user_gamepass_claims (user_id, day, tier, claimed_at, cycle_start, zen_cost)
            VALUES (?, ?, ?, NOW(), ?, ?)
        ");
        $stmt->execute(array($userId, $day, $tier, $cycle['cycle_start'], $zenCost));
        
        error_log("GAMEPASS_CLAIMED user={$userId} role={$roleId} day={$day} tier={$tier} reward={$reward['item_name']} zen_cost={$zenCost}");
        
        $response = array(
            'success' => true,
            'message' => 'Reward claimed! Check your in-game mailbox.',
            'reward' => array(
                'name' => $reward['item_name'],
                'quantity' => (int)$reward['quantity'],
                'coins' => (int)$reward['coins'],
                'zen' => (int)$reward['zen'],
                'exp' => (int)$reward['exp']
            )
        );
        
        if ($zenCost > 0) {
            $response['zen_spent'] = $zenCost;
            $response['user_zen'] = getUserZen($userId);
        }
        
        jsonResponse($response);
        break;
        
    default:
        jsonResponse(array('success' => false, 'error' => 'Invalid action'), 400);
}
