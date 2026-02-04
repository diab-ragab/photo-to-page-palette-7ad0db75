<?php
// api/leaderboards.php
// Leaderboard data - Top Voters & VIP Rankings

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

$rid = substr(bin2hex(random_bytes(6)), 0, 12);

try {
    $pdo = getDB();

    // Top Voters - from vote_log (use username column directly, no JOIN needed)
    $topVoters = [];
    try {
        // Get vote counts directly from vote_log.username
        $stmt = $pdo->query("
            SELECT 
                vl.username as username, 
                COUNT(vl.id) as value,
                COALESCE(uc.vip_points, 0) as vip_points
            FROM vote_log vl
            LEFT JOIN user_currency uc ON uc.user_id = vl.user_id
            GROUP BY vl.user_id, vl.username
            ORDER BY value DESC
            LIMIT 10
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $rank = 1;
        foreach ($rows as $row) {
            $vipLevel = 0;
            $vp = (int)$row['vip_points'];
            if ($vp >= 10000) $vipLevel = 3;
            elseif ($vp >= 5000) $vipLevel = 2;
            elseif ($vp >= 1000) $vipLevel = 1;
            
            $topVoters[] = [
                'rank' => $rank++,
                'username' => $row['username'],
                'value' => (int)$row['value'],
                'vipLevel' => $vipLevel
            ];
        }
    } catch (Exception $e) {
        // Fallback: try user_currency table with total_votes column
        try {
            $stmt = $pdo->query("
                SELECT 
                    u.login as username, 
                    uc.total_votes as value,
                    uc.vip_points
                FROM user_currency uc
                JOIN users u ON uc.user_id = u.ID
                WHERE uc.total_votes > 0
                ORDER BY uc.total_votes DESC
                LIMIT 10
            ");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $rank = 1;
            foreach ($rows as $row) {
                $vipLevel = 0;
                $vp = (int)$row['vip_points'];
                if ($vp >= 10000) $vipLevel = 3;
                elseif ($vp >= 5000) $vipLevel = 2;
                elseif ($vp >= 1000) $vipLevel = 1;
                
                $topVoters[] = [
                    'rank' => $rank++,
                    'username' => $row['username'],
                    'value' => (int)$row['value'],
                    'vipLevel' => $vipLevel
                ];
            }
        } catch (Exception $e2) {
            // No data available
        }
    }

    // VIP Rankings - from user_currency order by vip_points
    $vipRankings = [];
    try {
        $stmt = $pdo->query("
            SELECT 
                u.login as username, 
                uc.vip_points as value
            FROM user_currency uc
            JOIN users u ON uc.user_id = u.ID
            WHERE uc.vip_points > 0
            ORDER BY uc.vip_points DESC
            LIMIT 10
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $rank = 1;
        foreach ($rows as $row) {
            $vipLevel = 0;
            $vp = (int)$row['value'];
            if ($vp >= 10000) $vipLevel = 3;
            elseif ($vp >= 5000) $vipLevel = 2;
            elseif ($vp >= 1000) $vipLevel = 1;
            
            $vipRankings[] = [
                'rank' => $rank++,
                'username' => $row['username'],
                'value' => $vp,
                'vipLevel' => $vipLevel
            ];
        }
    } catch (Exception $e) {
        // Table doesn't exist
    }

    // Top Characters by Level - from basetab_sg
    $topCharacters = [];
    try {
        $stmt = $pdo->query("
            SELECT 
                Name as username,
                Level as value,
                Profession as class
            FROM basetab_sg
            WHERE IsDel = 0
            ORDER BY Level DESC, Exp DESC
            LIMIT 10
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $rank = 1;
        foreach ($rows as $row) {
            $topCharacters[] = [
                'rank' => $rank++,
                'username' => $row['username'],
                'value' => (int)$row['value'],
                'class' => (int)$row['class']
            ];
        }
    } catch (Exception $e) {
        // Table doesn't exist
    }

    echo json_encode([
        'success' => true,
        'topVoters' => $topVoters,
        'vipRankings' => $vipRankings,
        'topCharacters' => $topCharacters,
        'rid' => $rid
    ]);

} catch (PDOException $e) {
    error_log("leaderboards error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error',
        'topVoters' => [],
        'vipRankings' => [],
        'rid' => $rid
    ]);
}
