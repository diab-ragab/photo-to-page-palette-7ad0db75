<?php
/**
 * user_currency.php - Get user's currency balances
 * MySQL 5.1 compatible
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET','OPTIONS'));

header('Content-Type: application/json; charset=utf-8');

// Polyfill for older PHP versions
if (!function_exists('http_response_code')) {
    function http_response_code($code = null) {
        static $current = 200;
        if ($code !== null) {
            $current = (int)$code;
            header('X-PHP-Response-Code: ' . $current, true, $current);
        }
        return $current;
    }
}

define('VERSION', '2026-01-30-B');

// PHP 5.x safe RID generator
function _rid() {
    if (function_exists('random_bytes')) {
        return bin2hex(random_bytes(6));
    }
    if (function_exists('openssl_random_pseudo_bytes')) {
        return bin2hex(openssl_random_pseudo_bytes(6));
    }
    return substr(md5(uniqid('', true)), 0, 12);
}

$rid = _rid();

function jsonOut($data) {
    global $rid;
    $flags = 0;
    if (defined('JSON_UNESCAPED_UNICODE')) { $flags = JSON_UNESCAPED_UNICODE; }
    echo json_encode(array_merge($data, array('rid' => $rid, '_version' => VERSION)), $flags);
    exit;
}

function jsonFail($code, $msg) {
    http_response_code($code);
    jsonOut(['success' => false, 'message' => $msg]);
}

$username = '';
if (isset($_GET['username'])) {
    $username = trim($_GET['username']);
}

if ($username === '') {
    jsonFail(400, 'Username required');
}

try {
    $pdo = getDB();
} catch (Exception $e) {
    error_log("RID={$rid} DB_CONNECT_FAIL=" . $e->getMessage());
    jsonFail(503, 'Service temporarily unavailable');
}

// Detect username column: try 'name' first, fallback to 'login'
$usernameColumn = 'name';
try {
    $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('name', $cols, true) && in_array('login', $cols, true)) {
        $usernameColumn = 'login';
    }
} catch (Exception $e) {
    // Fallback to 'name'
}

try {
    // Get user ID
    $stmt = $pdo->prepare("SELECT ID FROM users WHERE {$usernameColumn} = ? LIMIT 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        // User not found - return zeros (not an error)
        jsonOut([
            'success' => true,
            'coins' => 0,
            'vip_points' => 0,
            'zen' => 0,
            'total_votes' => 0
        ]);
    }
    
    $userId = (int)$user['ID'];
    
    // Get user_currency data
    $coins = 0;
    $vipPoints = 0;
    $totalVotes = 0;
    
    // Try user_currency with user_id
    try {
        $stmt = $pdo->prepare("SELECT coins, vip_points, total_votes FROM user_currency WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $currency = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($currency) {
            $coins = (int)(isset($currency['coins']) ? $currency['coins'] : 0);
            $vipPoints = (int)(isset($currency['vip_points']) ? $currency['vip_points'] : 0);
            $totalVotes = (int)(isset($currency['total_votes']) ? $currency['total_votes'] : 0);
        }
    } catch (Exception $e) {
        // Try with username column instead
        try {
            $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE username = ? LIMIT 1");
            $stmt->execute([$username]);
            $currency = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($currency) {
                $coins = (int)(isset($currency['coins']) ? $currency['coins'] : 0);
                $vipPoints = (int)(isset($currency['vip_points']) ? $currency['vip_points'] : 0);
            }
        } catch (Exception $e2) {
            // Table might not exist - continue with zeros
        }
    }
    
    // Get total votes from vote_log if not in user_currency
    if ($totalVotes === 0) {
        try {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM vote_log WHERE username = ?");
            $stmt->execute([$username]);
            $totalVotes = (int)$stmt->fetchColumn();
        } catch (Exception $e) {
            // Table might not exist
        }
    }
    
    // Get Zen from goldtab_sg (Gold column)
    $zen = 0;
    try {
        $stmt = $pdo->prepare("SELECT Gold FROM goldtab_sg WHERE AccountID = ? LIMIT 1");
        $stmt->execute([$userId]);
        $gold = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($gold) {
            $zen = (int)$gold['Gold'];
        }
    } catch (Exception $e) {
        // Table might not exist
    }

    jsonOut([
        'success' => true,
        'coins' => $coins,
        'vip_points' => $vipPoints,
        'zen' => $zen,
        'total_votes' => $totalVotes
    ]);

} catch (Exception $e) {
    error_log("RID={$rid} USER_CURRENCY_ERROR=" . $e->getMessage());
    jsonFail(500, 'Database error');
}
