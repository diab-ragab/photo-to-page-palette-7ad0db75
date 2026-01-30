<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$pdo = getDB();

// Ensure vote_log table exists
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS vote_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            username VARCHAR(100) NOT NULL,
            site_id INT NOT NULL,
            fingerprint VARCHAR(255) DEFAULT NULL,
            ip_address VARCHAR(45) DEFAULT NULL,
            coins_earned INT NOT NULL DEFAULT 0,
            vip_earned INT NOT NULL DEFAULT 0,
            voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_site (user_id, site_id),
            INDEX idx_username_site (username, site_id),
            INDEX idx_voted_at (voted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
} catch (Exception $e) {
    // Table may already exist
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$username = trim($_POST['username'] ?? $_GET['username'] ?? '');

switch ($action) {
    case 'get_vote_status':
        if (empty($username)) {
            echo json_encode(['success' => false, 'error' => 'Username required']);
            exit;
        }

        // Get user info
        $stmt = $pdo->prepare("SELECT ID FROM users WHERE name = ? LIMIT 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            // Try memb_info table (legacy)
            $stmt = $pdo->prepare("SELECT memb___id as ID FROM memb_info WHERE memb___id = ? LIMIT 1");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        // Get user currency
        $coins = 0;
        $vipPoints = 0;
        $totalVotes = 0;

        if ($user) {
            // Get from user_currency table
            $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE username = ? LIMIT 1");
            $stmt->execute([$username]);
            $currency = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($currency) {
                $coins = (int)$currency['coins'];
                $vipPoints = (int)$currency['vip_points'];
            }

            // Get total votes count
            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM vote_log WHERE username = ?");
            $stmt->execute([$username]);
            $voteCount = $stmt->fetch(PDO::FETCH_ASSOC);
            $totalVotes = (int)($voteCount['total'] ?? 0);
        }

        // Get all active vote sites
        $stmt = $pdo->query("SELECT id, cooldown_hours FROM vote_sites WHERE is_active = 1");
        $sites = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Check vote status for each site
        $siteStatuses = [];
        foreach ($sites as $site) {
            $siteId = (int)$site['id'];
            $cooldownHours = (int)$site['cooldown_hours'];

            // Get last vote time for this site
            $stmt = $pdo->prepare("
                SELECT voted_at 
                FROM vote_log 
                WHERE username = ? AND site_id = ? 
                ORDER BY voted_at DESC 
                LIMIT 1
            ");
            $stmt->execute([$username, $siteId]);
            $lastVote = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($lastVote) {
                $lastVoteTime = strtotime($lastVote['voted_at']);
                $nextVoteTime = $lastVoteTime + ($cooldownHours * 3600);
                $now = time();

                if ($now < $nextVoteTime) {
                    // Still in cooldown
                    $siteStatuses[$siteId] = [
                        'can_vote' => false,
                        'last_vote_time' => date('c', $lastVoteTime),
                        'next_vote_time' => date('c', $nextVoteTime),
                        'time_remaining' => ($nextVoteTime - $now) * 1000 // milliseconds
                    ];
                } else {
                    // Cooldown expired, can vote
                    $siteStatuses[$siteId] = [
                        'can_vote' => true,
                        'last_vote_time' => date('c', $lastVoteTime),
                        'next_vote_time' => null,
                        'time_remaining' => null
                    ];
                }
            } else {
                // Never voted on this site
                $siteStatuses[$siteId] = [
                    'can_vote' => true,
                    'last_vote_time' => null,
                    'next_vote_time' => null,
                    'time_remaining' => null
                ];
            }
        }

        echo json_encode([
            'success' => true,
            'coins' => $coins,
            'vip_points' => $vipPoints,
            'total_votes' => $totalVotes,
            'site_statuses' => $siteStatuses
        ]);
        break;

    case 'submit_vote':
        if (empty($username)) {
            echo json_encode(['success' => false, 'message' => 'Username required']);
            exit;
        }

        $siteId = (int)($_POST['site_id'] ?? $_GET['site_id'] ?? 0);
        $fingerprint = trim($_POST['fingerprint'] ?? '');

        if (!$siteId) {
            echo json_encode(['success' => false, 'message' => 'Site ID required']);
            exit;
        }

        // Get site info
        $stmt = $pdo->prepare("SELECT * FROM vote_sites WHERE id = ? AND is_active = 1 LIMIT 1");
        $stmt->execute([$siteId]);
        $site = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$site) {
            echo json_encode(['success' => false, 'message' => 'Invalid vote site']);
            exit;
        }

        // Check cooldown
        $cooldownHours = (int)$site['cooldown_hours'];
        $stmt = $pdo->prepare("
            SELECT voted_at 
            FROM vote_log 
            WHERE username = ? AND site_id = ? 
            ORDER BY voted_at DESC 
            LIMIT 1
        ");
        $stmt->execute([$username, $siteId]);
        $lastVote = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($lastVote) {
            $lastVoteTime = strtotime($lastVote['voted_at']);
            $nextVoteTime = $lastVoteTime + ($cooldownHours * 3600);
            
            if (time() < $nextVoteTime) {
                $remaining = $nextVoteTime - time();
                $hours = floor($remaining / 3600);
                $minutes = floor(($remaining % 3600) / 60);
                
                echo json_encode([
                    'success' => false,
                    'message' => "You can vote again in {$hours}h {$minutes}m",
                    'next_vote_time' => date('c', $nextVoteTime)
                ]);
                exit;
            }
        }

        // Get user ID
        $stmt = $pdo->prepare("SELECT ID FROM users WHERE name = ? LIMIT 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        $userId = $user ? (int)$user['ID'] : 0;

        // Record the vote
        $coinsReward = (int)$site['coins_reward'];
        $vipReward = (int)$site['vip_reward'];
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';

        $stmt = $pdo->prepare("
            INSERT INTO vote_log (user_id, username, site_id, fingerprint, ip_address, coins_earned, vip_earned)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$userId, $username, $siteId, $fingerprint, $ipAddress, $coinsReward, $vipReward]);

        // Update user currency
        $stmt = $pdo->prepare("
            INSERT INTO user_currency (username, coins, vip_points)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                coins = coins + VALUES(coins),
                vip_points = vip_points + VALUES(vip_points)
        ");
        $stmt->execute([$username, $coinsReward, $vipReward]);

        // Get new totals
        $stmt = $pdo->prepare("SELECT coins, vip_points FROM user_currency WHERE username = ? LIMIT 1");
        $stmt->execute([$username]);
        $newCurrency = $stmt->fetch(PDO::FETCH_ASSOC);

        $nextVoteTime = time() + ($cooldownHours * 3600);

        echo json_encode([
            'success' => true,
            'message' => 'Vote recorded successfully!',
            'coins_earned' => $coinsReward,
            'vip_points_earned' => $vipReward,
            'new_coins_total' => (int)($newCurrency['coins'] ?? $coinsReward),
            'new_vip_total' => (int)($newCurrency['vip_points'] ?? $vipReward),
            'next_vote_time' => date('c', $nextVoteTime)
        ]);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
}
