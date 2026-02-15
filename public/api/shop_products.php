<?php
/**
 * GET /api/shop_products.php
 * Returns active products. Public endpoint (no auth required).
 * PHP 5.3+ compatible — NO closures, NO short arrays, NO ??
 */
require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET','OPTIONS'));

header('Content-Type: application/json; charset=utf-8');

$pdo = getDB();

$search = isset($_GET['search']) ? trim((string)$_GET['search']) : '';
$page   = isset($_GET['page'])   ? max(1, intval($_GET['page']))  : 1;
$limit  = isset($_GET['limit'])  ? min(100, max(1, intval($_GET['limit']))) : 50;
$offset = ($page - 1) * $limit;

$where  = 'is_active = 1';
$params = array();

if ($search !== '') {
    $where .= ' AND (name LIKE ? OR sku LIKE ? OR description LIKE ?)';
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

// Count
$countSql = "SELECT COUNT(*) FROM shop_products WHERE {$where}";
$stmt = $pdo->prepare($countSql);
$stmt->execute($params);
$total = intval($stmt->fetchColumn());

// Fetch
$sql = "SELECT id, sku, name, description, type, price_cents, currency, payload_json, image_url
        FROM shop_products WHERE {$where}
        ORDER BY id DESC LIMIT {$limit} OFFSET {$offset}";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$products = array();
foreach ($rows as $r) {
    $products[] = array(
        'id'           => intval($r['id']),
        'sku'          => $r['sku'],
        'name'         => $r['name'],
        'description'  => isset($r['description']) ? $r['description'] : '',
        'type'         => $r['type'],
        'price_cents'  => intval($r['price_cents']),
        'currency'     => $r['currency'],
        'payload_json' => $r['payload_json'],
        'image_url'    => isset($r['image_url']) ? $r['image_url'] : '',
    );
}

echo json_encode(array(
    'success'  => true,
    'products' => $products,
    'total'    => $total,
    'page'     => $page,
    'pages'    => ($limit > 0) ? intval(ceil($total / $limit)) : 0,
));
