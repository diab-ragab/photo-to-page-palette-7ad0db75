<?php
/**
 * Admin Shop Products CRUD
 * GET    — list all products (active + inactive)
 * POST   — create / update / delete a product
 * PHP 5.3+ compatible — NO closures, NO short arrays, NO ??
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';
handleCors(array('GET','POST','OPTIONS'));

header('Content-Type: application/json; charset=utf-8');

function jsonOut($arr, $code = 200) {
    http_response_code($code);
    echo json_encode($arr);
    exit;
}

$pdo    = getDB();
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

$user = requireAdmin(false);
if (!$user) jsonOut(array('success' => false, 'error' => 'Admin required'), 403);

/* ── GET: list ALL products (active + inactive) ── */
if ($method === 'GET') {
    $stmt = $pdo->query("SELECT id, sku, name, description, type, price_cents, currency, payload_json, image_url, is_active, sort_order FROM shop_products ORDER BY sort_order ASC, id DESC");
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
            'is_active'    => intval($r['is_active']),
            'sort_order'   => intval($r['sort_order']),
        );
    }
    jsonOut(array('success' => true, 'products' => $products));
}

/* ── POST: create / update / delete ── */
if ($method === 'POST') {
    $raw   = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input) || empty($input['action'])) {
        jsonOut(array('success' => false, 'error' => 'Invalid request'), 400);
    }

    $action = $input['action'];

    /* ── DELETE ── */
    if ($action === 'delete') {
        $id = isset($input['id']) ? intval($input['id']) : 0;
        if ($id < 1) jsonOut(array('success' => false, 'error' => 'Invalid product ID'), 400);
        $stmt = $pdo->prepare("DELETE FROM shop_products WHERE id = ?");
        $stmt->execute(array($id));
        jsonOut(array('success' => true, 'message' => 'Product deleted'));
    }

    /* ── CREATE / UPDATE ── */
    $id          = isset($input['id']) ? intval($input['id']) : 0;
    $sku         = isset($input['sku']) ? trim($input['sku']) : '';
    $name        = isset($input['name']) ? trim($input['name']) : '';
    $description = isset($input['description']) ? trim($input['description']) : '';
    $type        = isset($input['type']) ? trim($input['type']) : 'item';
    $price_cents = isset($input['price_cents']) ? intval($input['price_cents']) : 0;
    $currency    = isset($input['currency']) ? trim($input['currency']) : 'EUR';
    $payload     = isset($input['payload_json']) ? trim($input['payload_json']) : '{}';
    $image_url   = isset($input['image_url']) ? trim($input['image_url']) : '';
    $is_active   = isset($input['is_active']) ? intval($input['is_active']) : 1;
    $sort_order  = isset($input['sort_order']) ? intval($input['sort_order']) : 0;

    if ($name === '') jsonOut(array('success' => false, 'error' => 'Name is required'), 400);
    if ($price_cents < 0) jsonOut(array('success' => false, 'error' => 'Price must be >= 0'), 400);

    $allowedTypes = array('zen','coins','exp','item','bundle');
    if (!in_array($type, $allowedTypes)) {
        jsonOut(array('success' => false, 'error' => 'Invalid type. Allowed: ' . implode(', ', $allowedTypes)), 400);
    }

    if ($action === 'create') {
        $stmt = $pdo->prepare("INSERT INTO shop_products (sku, name, description, type, price_cents, currency, payload_json, image_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute(array($sku, $name, $description, $type, $price_cents, $currency, $payload, $image_url, $is_active, $sort_order));
        jsonOut(array('success' => true, 'message' => 'Product created', 'id' => intval($pdo->lastInsertId())));
    }

    if ($action === 'update') {
        if ($id < 1) jsonOut(array('success' => false, 'error' => 'Invalid product ID'), 400);
        $stmt = $pdo->prepare("UPDATE shop_products SET sku = ?, name = ?, description = ?, type = ?, price_cents = ?, currency = ?, payload_json = ?, image_url = ?, is_active = ?, sort_order = ? WHERE id = ?");
        $stmt->execute(array($sku, $name, $description, $type, $price_cents, $currency, $payload, $image_url, $is_active, $sort_order, $id));
        jsonOut(array('success' => true, 'message' => 'Product updated'));
    }

    jsonOut(array('success' => false, 'error' => 'Unknown action'), 400);
}

jsonOut(array('success' => false, 'error' => 'Method not allowed'), 405);
