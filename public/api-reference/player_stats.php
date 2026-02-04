<?php
/**
 * player_stats.php - Aggregate player statistics API
 * 
 * Returns comprehensive player stats for the stats card.
 * Requires authentication.
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';

header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();

// Require authentication
$user = requireAuth();
$userId = (int)$user['id'];
$username = $user['username'];

$pdo = getDB();

// Initialize stats array
$stats = array(
    'success' => true,
    'username' => $username,
    'total_votes' => 0,
    'vote_streak' => 0,
    'best_streak' => 0,
    'vip_level' => 0,
    'vip_points' => 0,
    'coins' => 0,
    'total_purchases' => 0,
    'total_spent' => 0.0,
    'character_count' => 0,
    'highest_level' => 0,
    'total_zen' => 0,
    'account_created' => null,
    'last_login' => null,
    'achievements_unlocked' => 0,
    'achievements_total' => 0,
    'rid' => $RID
);

// Get user currency data
try {
    $stmt = $pdo->prepare("SELECT coins, vip_points, total_votes FROM user_currency WHERE user_id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $currency = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($currency) {
        $stats['coins'] = (int)$currency['coins'];
        $stats['vip_points'] = (int)$currency['vip_points'];
        $stats['total_votes'] = (int)$currency['total_votes'];
    }
} catch (Exception $e) {
    // Try fallback with username
    try {
        $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE username = ? LIMIT 1");
        $stmt->execute([$username]);
        $currency = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($currency) {
            $stats['coins'] = (int)$currency['coins'];
            $stats['vip_points'] = (int)$currency['vip_points'];
        }
    } catch (Exception $e2) {}
}

// Calculate VIP level
$vipPoints = $stats['vip_points'];
if ($vipPoints >= 10000) {
    $stats['vip_level'] = 3;
} elseif ($vipPoints >= 5000) {
    $stats['vip_level'] = 2;
} elseif ($vipPoints >= 1000) {
    $stats['vip_level'] = 1;
}

// Get vote streak data
try {
    $stmt = $pdo->prepare("SELECT current_streak, best_streak FROM vote_streaks WHERE user_id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $streak = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($streak) {
        $stats['vote_streak'] = (int)$streak['current_streak'];
        $stats['best_streak'] = (int)$streak['best_streak'];
    }
} catch (Exception $e) {
    // Try with username
    try {
        $stmt = $pdo->prepare("SELECT current_streak, best_streak FROM vote_streaks WHERE username = ? LIMIT 1");
        $stmt->execute([$username]);
        $streak = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($streak) {
            $stats['vote_streak'] = (int)$streak['current_streak'];
            $stats['best_streak'] = (int)$streak['best_streak'];
        }
    } catch (Exception $e2) {}
}

// Get total votes from vote_log if not already set
if ($stats['total_votes'] === 0) {
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM vote_log WHERE username = ?");
        $stmt->execute([$username]);
        $stats['total_votes'] = (int)$stmt->fetchColumn();
    } catch (Exception $e) {}
}

// Get purchase stats
try {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count, COALESCE(SUM(total_real), 0) as total 
        FROM webshop_orders 
        WHERE user_id = ? AND status = 'completed'
    ");
    $stmt->execute([$userId]);
    $purchases = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($purchases) {
        $stats['total_purchases'] = (int)$purchases['count'];
        $stats['total_spent'] = (float)$purchases['total'];
    }
} catch (Exception $e) {}

// Get character stats from basetab_sg
try {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count, COALESCE(MAX(cLevel), 0) as max_level 
        FROM basetab_sg 
        WHERE AccountID = ? AND IsDel = 0
    ");
    $stmt->execute([$userId]);
    $chars = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($chars) {
        $stats['character_count'] = (int)$chars['count'];
        $stats['highest_level'] = (int)$chars['max_level'];
    }
} catch (Exception $e) {}

// Get total Zen from goldtab_sg
try {
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(Gold), 0) FROM goldtab_sg WHERE AccountID = ?");
    $stmt->execute([$userId]);
    $stats['total_zen'] = (int)$stmt->fetchColumn();
} catch (Exception $e) {}

// Get account creation date and last login
try {
    $stmt = $pdo->prepare("SELECT created_at, last_login FROM users WHERE ID = ? LIMIT 1");
    $stmt->execute([$userId]);
    $userInfo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($userInfo) {
        $stats['account_created'] = $userInfo['created_at'];
        $stats['last_login'] = $userInfo['last_login'];
    }
} catch (Exception $e) {}

// Get achievements stats
try {
    // Total active achievements
    $stmt = $pdo->query("SELECT COUNT(*) FROM achievements WHERE is_active = 1");
    $stats['achievements_total'] = (int)$stmt->fetchColumn();
    
    // User unlocked achievements
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM user_achievements WHERE user_id = ?");
    $stmt->execute([$userId]);
    $stats['achievements_unlocked'] = (int)$stmt->fetchColumn();
} catch (Exception $e) {}

jsonResponse($stats);
