<?php
/**
 * GET /api/recent_purchases.php
 * Returns recent completed shop purchases for social proof display.
 * Uses new shop_orders + shop_order_items + shop_products tables.
 * PHP 5.3+ compatible.
 */
require_once __DIR__ . '/bootstrap.php';

handleCors(array('GET','OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();

try {
    $pdo = getDB();
    $purchases = array();

    try {
        $stmt = $pdo->query("
            SELECT
                o.account_name,
                p.name AS item_name,
                p.type AS item_type,
                o.total_cents,
                o.currency,
                o.created_at
            FROM shop_orders o
            JOIN shop_order_items oi ON oi.order_id = o.id
            JOIN shop_products p ON p.id = oi.product_id
            WHERE o.status = 'completed'
            ORDER BY o.created_at DESC
            LIMIT 20
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $iconMap = array(
            'zen'    => '💎',
            'coins'  => '🪙',
            'exp'    => '⚡',
            'item'   => '🎁',
            'bundle' => '🎉',
        );

        foreach ($rows as $row) {
            $createdAt = strtotime($row['created_at']);
            $diff = time() - $createdAt;

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

            $icon = isset($iconMap[$row['item_type']]) ? $iconMap[$row['item_type']] : '🎁';

            $purchases[] = array(
                'playerName' => $row['account_name'],
                'itemName'   => $row['item_name'],
                'itemIcon'   => $icon,
                'timeAgo'    => $timeAgo,
                'price'      => intval($row['total_cents']) / 100,
            );
        }
    } catch (Exception $e) {
        error_log("RID={$RID} recent_purchases query error: " . $e->getMessage());
    }

    echo json_encode(array(
        'success'   => true,
        'purchases' => $purchases,
        'rid'       => $RID,
    ));

} catch (Exception $e) {
    error_log("RID={$RID} recent_purchases fatal: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array(
        'success'   => false,
        'purchases' => array(),
        'rid'       => $RID,
    ));
}
