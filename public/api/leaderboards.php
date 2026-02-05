<?php
// api/leaderboards.php
// Leaderboard data - Top Voters, VIP Rankings, Top Characters
// PHP 5.x compatible

require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET', 'OPTIONS'));

header('Content-Type: application/json; charset=utf-8');

$rid = substr(md5(uniqid(mt_rand(), true)), 0, 12);

try {
    $pdo = getDB();

    // Top Voters - from vote_log aggregation
    $topVoters = array();
    try {
        $stmt = $pdo->query("
            SELECT 
                u.login as username, 
                COUNT(vl.id) as vote_count,
                COALESCE(uc.vip_points, 0) as vip_points
            FROM vote_log vl
            JOIN users u ON vl.user_id = u.ID
            LEFT JOIN user_currency uc ON uc.user_id = u.ID
            GROUP BY u.ID, u.login
            ORDER BY vote_count DESC
            LIMIT 10
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $rank = 1;
        foreach ($rows as $row) {
            $vp = (int)$row['vip_points'];
            $vipLevel = 0;
            if ($vp >= 10000) { $vipLevel = 3; }
            elseif ($vp >= 5000) { $vipLevel = 2; }
            elseif ($vp >= 1000) { $vipLevel = 1; }
            
            $topVoters[] = array(
                'rank' => $rank++,
                'username' => $row['username'],
                'value' => (int)$row['vote_count'],
                'vipLevel' => $vipLevel
            );
        }
    } catch (Exception $e) {
        // Fallback: try user_currency table
        try {
            $stmt = $pdo->query("
                SELECT 
                    u.login as username, 
                    uc.total_votes as vote_count,
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
                $vp = (int)$row['vip_points'];
                $vipLevel = 0;
                if ($vp >= 10000) { $vipLevel = 3; }
                elseif ($vp >= 5000) { $vipLevel = 2; }
                elseif ($vp >= 1000) { $vipLevel = 1; }
                
                $topVoters[] = array(
                    'rank' => $rank++,
                    'username' => $row['username'],
                    'value' => (int)$row['vote_count'],
                    'vipLevel' => $vipLevel
                );
            }
        } catch (Exception $e2) {
            // No vote data available
        }
    }

    // VIP Rankings - from user_currency
    $vipRankings = array();
    try {
        $stmt = $pdo->query("
            SELECT 
                u.login as username, 
                uc.vip_points
            FROM user_currency uc
            JOIN users u ON uc.user_id = u.ID
            WHERE uc.vip_points > 0
            ORDER BY uc.vip_points DESC
            LIMIT 10
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $rank = 1;
        foreach ($rows as $row) {
            $vp = (int)$row['vip_points'];
            $vipLevel = 0;
            if ($vp >= 10000) { $vipLevel = 3; }
            elseif ($vp >= 5000) { $vipLevel = 2; }
            elseif ($vp >= 1000) { $vipLevel = 1; }
            
            $vipRankings[] = array(
                'rank' => $rank++,
                'username' => $row['username'],
                'value' => $vp,
                'vipLevel' => $vipLevel
            );
        }
    } catch (Exception $e) {
        // Table doesn't exist
    }

    // Top Characters by Level - from basetab_sg
    $topCharacters = array();
    try {
        $stmt = $pdo->query("
            SELECT 
                Name as char_name,
                Level as char_level,
                Profession as char_class
            FROM basetab_sg
            WHERE IsDel = 0
            ORDER BY Level DESC, Exp DESC
            LIMIT 10
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $rank = 1;
        foreach ($rows as $row) {
            $topCharacters[] = array(
                'rank' => $rank++,
                'username' => $row['char_name'],
                'value' => (int)$row['char_level'],
                'class' => (int)$row['char_class']
            );
        }
    } catch (Exception $e) {
        // Table doesn't exist
    }

    echo json_encode(array(
        'success' => true,
        'topVoters' => $topVoters,
        'vipRankings' => $vipRankings,
        'topCharacters' => $topCharacters,
        'rid' => $rid
    ));

} catch (PDOException $e) {
    error_log("leaderboards error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array(
        'success' => false,
        'message' => 'Database error',
        'topVoters' => array(),
        'vipRankings' => array(),
        'topCharacters' => array(),
        'rid' => $rid
    ));
}
