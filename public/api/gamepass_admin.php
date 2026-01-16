<?php
/**
 * Game Pass Admin API - CRUD for rewards + Mail Integration
 * MySQL 5.1 Compatible
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
date_default_timezone_set('Africa/Cairo');

/* ========= CORS ========= */
$allowedOrigins = [
    'https://woiendgame.online',
    'https://www.woiendgame.online',
    'http://localhost:5173',
    'http://localhost:3000',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$isLovableOrigin = is_string($origin) &&
    preg_match('/^https:\\/\\/[a-z0-9-]+\\.(lovableproject\\.com|lovable\\.app)$/i', $origin);

if ($origin && (in_array($origin, $allowedOrigins, true) || $isLovableOrigin)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Vary: Origin");
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/* ========= CONFIG ========= */
$dbHost = "192.168.1.88";
$dbUser = "root";
$dbPass = "";
$dbName = "shengui";

/* Game Pass Season Config */
define('PASS_START_DATE', '2026-01-01');
define('PASS_TOTAL_DAYS', 30);

/* ========= DB CONNECTION ========= */
$conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB connection failed']);
    exit;
}
$conn->set_charset("utf8");

/* ========= ENSURE TABLE EXISTS ========= */
$conn->query("
    CREATE TABLE IF NOT EXISTS gamepass_rewards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        day INT NOT NULL DEFAULT 1,
        tier ENUM('free', 'elite') NOT NULL DEFAULT 'free',
        item_id INT NOT NULL DEFAULT 0,
        item_name VARCHAR(100) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        coins INT NOT NULL DEFAULT 0,
        zen INT NOT NULL DEFAULT 0,
        exp INT NOT NULL DEFAULT 0,
        rarity ENUM('common', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
        icon VARCHAR(10) NOT NULL DEFAULT '🎁',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(50) DEFAULT NULL,
        INDEX idx_day_tier (day, tier)
    ) ENGINE=MyISAM DEFAULT CHARSET=utf8
");

/* ========= HELPERS ========= */
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getPassDayInfo(): array {
    $start = DateTime::createFromFormat('Y-m-d', PASS_START_DATE);
    if (!$start) return [1, 'active', PASS_START_DATE, PASS_START_DATE];
    
    $today = new DateTime('today');
    $startDay = new DateTime($start->format('Y-m-d'));
    $diffDays = (int)$startDay->diff($today)->format('%r%a');
    
    $end = new DateTime($start->format('Y-m-d'));
    $end->modify('+' . (PASS_TOTAL_DAYS - 1) . ' days');
    
    if ($diffDays < 0) return [1, 'not_started', $startDay->format('Y-m-d'), $end->format('Y-m-d')];
    
    $dayNumber = $diffDays + 1;
    if ($dayNumber > PASS_TOTAL_DAYS) return [PASS_TOTAL_DAYS, 'ended', $startDay->format('Y-m-d'), $end->format('Y-m-d')];
    
    return [$dayNumber, 'active', $startDay->format('Y-m-d'), $end->format('Y-m-d')];
}

/* ========= MAIL HELPERS (from send-mail.php) ========= */
function strToHex($string) { return strtoupper(bin2hex($string)); }
function padHex($value, $length) { return str_pad(dechex((int)$value), $length, '0', STR_PAD_LEFT); }
function reorderHex32($hex8) { return substr($hex8,6,2).substr($hex8,4,2).substr($hex8,2,2).substr($hex8,0,2); }
function reorderHex16($hex4) { return substr($hex4,2,2).substr($hex4,0,2); }

function sendMailToPlayer($conn, $roleId, $reward, $dayNumber) {
    $title = "Game Pass Day {$dayNumber} Reward";
    $tierLabel = $reward['tier'] === 'elite' ? 'Elite' : 'Free';
    
    $text = "{$tierLabel} Game Pass Reward\n\n" .
            "Day {$dayNumber} / " . PASS_TOTAL_DAYS . "\n" .
            "Reward: {$reward['item_name']}\n\n" .
            "Enjoy your reward!";
    
    $coins = (int)$reward['coins'];
    $zen = (int)$reward['zen'];
    $exp = (int)$reward['exp'];
    $itemId = (int)$reward['item_id'];
    $qty = (int)$reward['quantity'];
    
    // Build mail blob
    $t_len = padHex(strlen($title) + 1, 2);
    $txt_len = padHex(strlen($text) + 1, 2);
    $titleHex = strToHex($title);
    $textHex = strToHex($text);
    $coinsHex = reorderHex32(padHex($coins, 8));
    $zenHex = reorderHex32(padHex($zen, 8));
    $expHex = reorderHex32(padHex($exp, 8));
    
    $blobHex = "6600010000{$t_len}00{$titleHex}00{$txt_len}00{$textHex}" .
               "0001{$coinsHex}{$zenHex}{$expHex}";
    
    if ($itemId === 0) {
        $blobHex .= "000000000000000000";
    } else {
        $qtyHex = padHex($qty, 2);
        $itemHex = reorderHex16(padHex($itemId, 4));
        $uniqueHex = substr(uniqid(), 6, 4);
        $itemBlob = "64464f70d314e0297a9dffff{$itemHex}0000{$qtyHex}{$uniqueHex}959a2919e029" .
                    str_repeat("00", 200);
        $blobHex .= $itemBlob;
    }
    
    $stmt = $conn->prepare(
        "INSERT INTO mailtab_sg (SenderID, TargerID, MailInfo, CreateTime)
         VALUES (0, ?, UNHEX(?), NOW())"
    );
    
    if (!$stmt) {
        return ['success' => false, 'error' => $conn->error];
    }
    
    $stmt->bind_param("is", $roleId, $blobHex);
    $result = $stmt->execute();
    $stmt->close();
    
    return ['success' => $result];
}

/* ========= INPUT ========= */
$action = $_GET['action'] ?? '';
$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: [];

/* ========= ACTIONS ========= */

// GET ALL REWARDS
if ($action === 'get_rewards') {
    $result = $conn->query("SELECT * FROM gamepass_rewards ORDER BY day ASC, tier ASC");
    $rewards = [];
    while ($row = $result->fetch_assoc()) {
        $rewards[] = [
            'id' => (int)$row['id'],
            'day' => (int)$row['day'],
            'tier' => $row['tier'],
            'item_id' => (int)$row['item_id'],
            'item_name' => $row['item_name'],
            'quantity' => (int)$row['quantity'],
            'coins' => (int)$row['coins'],
            'zen' => (int)$row['zen'],
            'exp' => (int)$row['exp'],
            'rarity' => $row['rarity'],
            'icon' => $row['icon'],
        ];
    }
    jsonResponse(['success' => true, 'rewards' => $rewards]);
}

// GET REWARDS FOR PUBLIC (used by GamePass component)
if ($action === 'get_public_rewards') {
    [$dayNumber, $status, $startDate, $endDate] = getPassDayInfo();
    
    $result = $conn->query("SELECT * FROM gamepass_rewards ORDER BY day ASC, tier ASC");
    $rewards = [];
    while ($row = $result->fetch_assoc()) {
        $rewards[] = [
            'id' => (int)$row['id'],
            'day' => (int)$row['day'],
            'tier' => $row['tier'],
            'item_id' => (int)$row['item_id'],
            'item_name' => $row['item_name'],
            'quantity' => (int)$row['quantity'],
            'coins' => (int)$row['coins'],
            'zen' => (int)$row['zen'],
            'exp' => (int)$row['exp'],
            'rarity' => $row['rarity'],
            'icon' => $row['icon'],
        ];
    }
    
    jsonResponse([
        'success' => true,
        'rewards' => $rewards,
        'pass' => [
            'status' => $status,
            'currentDay' => $dayNumber,
            'totalDays' => PASS_TOTAL_DAYS,
            'startDate' => $startDate,
            'endDate' => $endDate,
        ]
    ]);
}

// ADD REWARD
if ($action === 'add_reward') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'POST required'], 405);
    }
    
    $day = (int)($data['day'] ?? 1);
    $tier = in_array($data['tier'] ?? '', ['free', 'elite']) ? $data['tier'] : 'free';
    $item_id = (int)($data['item_id'] ?? 0);
    $item_name = trim($data['item_name'] ?? '');
    $quantity = max(1, (int)($data['quantity'] ?? 1));
    $coins = (int)($data['coins'] ?? 0);
    $zen = (int)($data['zen'] ?? 0);
    $exp = (int)($data['exp'] ?? 0);
    $rarity = in_array($data['rarity'] ?? '', ['common', 'rare', 'epic', 'legendary']) ? $data['rarity'] : 'common';
    $icon = mb_substr($data['icon'] ?? '🎁', 0, 10);
    $updated_by = trim($data['updated_by'] ?? 'GM');
    
    if ($item_name === '') {
        jsonResponse(['success' => false, 'error' => 'Item name required'], 400);
    }
    
    if ($day < 1 || $day > 30) {
        jsonResponse(['success' => false, 'error' => 'Day must be 1-30'], 400);
    }
    
    $stmt = $conn->prepare(
        "INSERT INTO gamepass_rewards (day, tier, item_id, item_name, quantity, coins, zen, exp, rarity, icon, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param("ississiiiss", $day, $tier, $item_id, $item_name, $quantity, $coins, $zen, $exp, $rarity, $icon, $updated_by);
    
    if ($stmt->execute()) {
        $newId = $stmt->insert_id;
        $stmt->close();
        jsonResponse([
            'success' => true,
            'message' => 'Reward added',
            'id' => $newId
        ]);
    } else {
        jsonResponse(['success' => false, 'error' => $stmt->error], 500);
    }
}

// UPDATE REWARD
if ($action === 'update_reward') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'POST required'], 405);
    }
    
    $id = (int)($data['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'Invalid ID'], 400);
    }
    
    $day = (int)($data['day'] ?? 1);
    $tier = in_array($data['tier'] ?? '', ['free', 'elite']) ? $data['tier'] : 'free';
    $item_id = (int)($data['item_id'] ?? 0);
    $item_name = trim($data['item_name'] ?? '');
    $quantity = max(1, (int)($data['quantity'] ?? 1));
    $coins = (int)($data['coins'] ?? 0);
    $zen = (int)($data['zen'] ?? 0);
    $exp = (int)($data['exp'] ?? 0);
    $rarity = in_array($data['rarity'] ?? '', ['common', 'rare', 'epic', 'legendary']) ? $data['rarity'] : 'common';
    $icon = mb_substr($data['icon'] ?? '🎁', 0, 10);
    $updated_by = trim($data['updated_by'] ?? 'GM');
    
    if ($item_name === '') {
        jsonResponse(['success' => false, 'error' => 'Item name required'], 400);
    }
    
    $stmt = $conn->prepare(
        "UPDATE gamepass_rewards SET day=?, tier=?, item_id=?, item_name=?, quantity=?, coins=?, zen=?, exp=?, rarity=?, icon=?, updated_by=?
         WHERE id=?"
    );
    $stmt->bind_param("ississiiissi", $day, $tier, $item_id, $item_name, $quantity, $coins, $zen, $exp, $rarity, $icon, $updated_by, $id);
    
    if ($stmt->execute()) {
        $stmt->close();
        jsonResponse(['success' => true, 'message' => 'Reward updated']);
    } else {
        jsonResponse(['success' => false, 'error' => $stmt->error], 500);
    }
}

// DELETE REWARD
if ($action === 'delete_reward') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'POST required'], 405);
    }
    
    $id = (int)($data['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'Invalid ID'], 400);
    }
    
    $stmt = $conn->prepare("DELETE FROM gamepass_rewards WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        $stmt->close();
        jsonResponse(['success' => true, 'message' => 'Reward deleted']);
    } else {
        jsonResponse(['success' => false, 'error' => $stmt->error], 500);
    }
}

// SEND REWARD TO PLAYER (integrates with mail system)
if ($action === 'send_reward') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'POST required'], 405);
    }
    
    $roleId = (int)($data['roleId'] ?? 0);
    $rewardId = (int)($data['rewardId'] ?? 0);
    
    if ($roleId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Invalid roleId'], 400);
    }
    
    [$dayNumber, $status, $startDate, $endDate] = getPassDayInfo();
    
    // If specific reward ID provided, send that reward
    if ($rewardId > 0) {
        $stmt = $conn->prepare("SELECT * FROM gamepass_rewards WHERE id = ?");
        $stmt->bind_param("i", $rewardId);
        $stmt->execute();
        $result = $stmt->get_result();
        $reward = $result->fetch_assoc();
        $stmt->close();
        
        if (!$reward) {
            jsonResponse(['success' => false, 'error' => 'Reward not found'], 404);
        }
        
        $mailResult = sendMailToPlayer($conn, $roleId, $reward, $reward['day']);
        jsonResponse([
            'success' => $mailResult['success'],
            'message' => $mailResult['success'] ? 'Reward sent' : 'Failed to send',
            'error' => $mailResult['error'] ?? null
        ]);
    }
    
    // Otherwise send today's rewards
    $tier = $data['tier'] ?? 'free';
    
    $stmt = $conn->prepare("SELECT * FROM gamepass_rewards WHERE day = ? AND tier = ?");
    $stmt->bind_param("is", $dayNumber, $tier);
    $stmt->execute();
    $result = $stmt->get_result();
    $reward = $result->fetch_assoc();
    $stmt->close();
    
    if (!$reward) {
        jsonResponse(['success' => false, 'error' => "No reward for Day {$dayNumber} ({$tier})"], 404);
    }
    
    $mailResult = sendMailToPlayer($conn, $roleId, $reward, $dayNumber);
    jsonResponse([
        'success' => $mailResult['success'],
        'message' => $mailResult['success'] ? "Day {$dayNumber} reward sent" : 'Failed to send',
        'pass' => [
            'status' => $status,
            'currentDay' => $dayNumber,
            'totalDays' => PASS_TOTAL_DAYS,
        ]
    ]);
}

// GET PASS STATUS
if ($action === 'get_status') {
    [$dayNumber, $status, $startDate, $endDate] = getPassDayInfo();
    jsonResponse([
        'success' => true,
        'pass' => [
            'status' => $status,
            'currentDay' => $dayNumber,
            'totalDays' => PASS_TOTAL_DAYS,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'today' => date('Y-m-d'),
        ]
    ]);
}

// UPDATE PASS CONFIG (start date)
if ($action === 'update_config') {
    // This would require writing to a config file or database
    // For now, return info about how to change it
    jsonResponse([
        'success' => true,
        'message' => 'Edit PASS_START_DATE in gamepass_admin.php to change season dates',
        'current' => [
            'startDate' => PASS_START_DATE,
            'totalDays' => PASS_TOTAL_DAYS,
        ]
    ]);
}

// Invalid action
jsonResponse(['success' => false, 'error' => 'Invalid action'], 400);

$conn->close();
