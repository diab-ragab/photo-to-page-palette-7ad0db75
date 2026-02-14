<?php
// api/recent_purchases.php
// Get recent webshop purchases for display

require_once __DIR__ . '/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

$rid = substr(bin2hex(random_bytes(6)), 0, 12);

try {
    $pdo = getDB();

    $purchases = [];
    
    try {
        // Combined: webshop + bundle + gamepass orders
        $stmt = $pdo->query("
            SELECT * FROM (
                SELECT 
                    u.login as username,
                    wp.name as item_name,
                    wp.icon as item_icon,
                    wo.created_at,
                    wo.total_price as price
                FROM webshop_orders wo
                JOIN users u ON wo.user_id = u.ID
                JOIN webshop_products wp ON wo.product_id = wp.id
                WHERE wo.status = 'completed'
                
                UNION ALL
                
                SELECT 
                    u2.login as username,
                    fb.name as item_name,
                    '🎉' as item_icon,
                    bo.created_at,
                    bo.total_real as price
                FROM bundle_orders bo
                JOIN users u2 ON bo.user_id = u2.ID
                LEFT JOIN flash_bundles fb ON fb.id = bo.bundle_id
                WHERE bo.status = 'completed'
                
                UNION ALL
                
                SELECT 
                    u3.login as username,
                    CONCAT('Game Pass - ', UPPER(gp.tier)) as item_name,
                    '🎫' as item_icon,
                    gp.created_at,
                    gp.price as price
                FROM gamepass_purchases gp
                JOIN users u3 ON gp.user_id = u3.ID
                WHERE gp.status = 'completed'
            ) combined
            ORDER BY created_at DESC
            LIMIT 20
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($rows as $row) {
            $createdAt = strtotime($row['created_at']);
            $diff = time() - $createdAt;
            
            // Format time ago
            if ($diff < 60) {
                $timeAgo = 'just now';
            } elseif ($diff < 3600) {
                $mins = floor($diff / 60);
                $timeAgo = $mins . ' min ago';
            } elseif ($diff < 86400) {
                $hours = floor($diff / 3600);
                $timeAgo = $hours . ' hour' . ($hours > 1 ? 's' : '') . ' ago';
            } else {
                $days = floor($diff / 86400);
                $timeAgo = $days . ' day' . ($days > 1 ? 's' : '') . ' ago';
            }
            
            $purchases[] = [
                'playerName' => $row['username'],
                'itemName' => $row['item_name'],
                'itemIcon' => $row['item_icon'] ?: '🎁',
                'timeAgo' => $timeAgo,
                'price' => (float)$row['price']
            ];
        }
    } catch (Exception $e) {
        // Tables might not exist - return empty
        error_log("recent_purchases: " . $e->getMessage());
    }

    echo json_encode([
        'success' => true,
        'purchases' => $purchases,
        'rid' => $rid
    ]);

} catch (PDOException $e) {
    error_log("recent_purchases error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'purchases' => [],
        'rid' => $rid
    ]);
}
