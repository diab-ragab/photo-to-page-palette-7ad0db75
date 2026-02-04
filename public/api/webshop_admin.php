<?php
/**
 * api/webshop_admin.php
 * Admin Webshop Management API - Simplified Schema
 * PHP 5.x compatible - Uses centralized session_helper.php
 * 
 * Products: id, name, item_id, item_quantity, price_real
 * Orders: id, user_id, product_id, quantity, total_real, status, stripe_*, delivered_at, created_at, updated_at
 */

// ---------- Bootstrap (CORS, DB, helpers) ----------
require_once __DIR__ . '/bootstrap.php';

// ---------- Session Helper (Auth) ----------
require_once __DIR__ . '/session_helper.php';

// ---------- Read input once ----------
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
$action = isset($_GET['action']) ? $_GET['action'] : '';
$rawInput = file_get_contents('php://input');
$input = array();
if ($rawInput) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) $input = $decoded;
}

// ---------- Require admin for all actions ----------
$adminUser = requireAdmin();

// ---------- Sanitize helper ----------
function sanitize($input, $maxLen = 255) {
    $s = trim((string)$input);
    $s = strip_tags($s);
    $s = htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    if (function_exists('mb_substr')) return mb_substr($s, 0, $maxLen, 'UTF-8');
    return substr($s, 0, $maxLen);
}

// ---------- Tables (Simplified Schema) ----------
function ensureTables() {
    $pdo = getDB();
    
    // Simplified products table: id, name, item_id, item_quantity, price_real
    $pdo->exec("CREATE TABLE IF NOT EXISTS webshop_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        item_id INT NOT NULL DEFAULT 0,
        item_quantity INT NOT NULL DEFAULT 1,
        price_real DECIMAL(10,2) NOT NULL DEFAULT 0.00
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

    // Add price_real column if table already exists without it
    try {
        $pdo->exec("ALTER TABLE webshop_products ADD COLUMN price_real DECIMAL(10,2) NOT NULL DEFAULT 0.00");
    } catch (Exception $e) {
        // Column already exists, ignore
    }

    // Simplified orders table
    $pdo->exec("CREATE TABLE IF NOT EXISTS webshop_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        total_real DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        status ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
        stripe_session_id VARCHAR(255) DEFAULT NULL,
        stripe_payment_intent VARCHAR(255) DEFAULT NULL,
        delivered_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_session (stripe_session_id),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

    // Rate limiting table
    $pdo->exec("CREATE TABLE IF NOT EXISTS payment_rate_limit (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip_address VARCHAR(64) NOT NULL,
        endpoint VARCHAR(32) NOT NULL,
        request_time DATETIME NOT NULL,
        KEY idx_ip_endpoint_time (ip_address, endpoint, request_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}
ensureTables();

// ---------- Get PDO instance ----------
$pdo = getDB();

// ---------- Router ----------
switch ($action) {

    // ========== PRODUCTS ==========
    case 'list_products': {
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        if ($page < 1) $page = 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        if ($limit < 10) $limit = 10;
        if ($limit > 100) $limit = 100;
        $offset = ($page - 1) * $limit;

        $where = "";
        $params = array();
        if ($search !== '') {
            $where = "WHERE name LIKE ?";
            $params[] = "%{$search}%";
        }

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM webshop_products {$where}");
        $stmt->execute($params);
        $total = (int)$stmt->fetchColumn();

        $sql = "SELECT * FROM webshop_products {$where} ORDER BY id DESC LIMIT {$offset}, {$limit}";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse(array(
            'success' => true,
            'products' => $products,
            'total' => $total,
            'page' => $page,
            'pages' => (int)ceil($total / $limit)
        ));
    }

    case 'get_product': {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) jsonFail(400, 'Invalid product ID');

        $stmt = $pdo->prepare("SELECT * FROM webshop_products WHERE id = ? LIMIT 1");
        $stmt->execute(array($id));
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$product) jsonFail(404, 'Product not found');

        jsonResponse(array('success' => true, 'product' => $product));
    }

    case 'add_product': {
        if ($method !== 'POST') jsonFail(405, 'Method not allowed');

        $name = sanitize(isset($input['name']) ? $input['name'] : '', 200);
        if ($name === '') jsonFail(400, 'Product name required');

        $itemId = isset($input['item_id']) ? (int)$input['item_id'] : 0;
        $itemQty = isset($input['item_quantity']) ? (int)$input['item_quantity'] : 1;
        if ($itemQty < 1) $itemQty = 1;
        $priceReal = isset($input['price_real']) ? (float)$input['price_real'] : 0;

        $stmt = $pdo->prepare("INSERT INTO webshop_products (name, item_id, item_quantity, price_real) VALUES (?, ?, ?, ?)");
        $stmt->execute(array($name, $itemId, $itemQty, $priceReal));

        jsonResponse(array('success' => true, 'id' => (int)$pdo->lastInsertId(), 'message' => 'Product created'));
    }

    case 'update_product': {
        if ($method !== 'POST') jsonFail(405, 'Method not allowed');

        $id = isset($input['id']) ? (int)$input['id'] : 0;
        if ($id <= 0) jsonFail(400, 'Invalid product ID');

        $updates = array();
        $params = array();

        if (array_key_exists('name', $input)) {
            $updates[] = "name = ?";
            $params[] = sanitize($input['name'], 200);
        }
        if (array_key_exists('item_id', $input)) {
            $updates[] = "item_id = ?";
            $params[] = (int)$input['item_id'];
        }
        if (array_key_exists('item_quantity', $input)) {
            $qty = (int)$input['item_quantity'];
            if ($qty < 1) $qty = 1;
            $updates[] = "item_quantity = ?";
            $params[] = $qty;
        }
        if (array_key_exists('price_real', $input)) {
            $updates[] = "price_real = ?";
            $params[] = (float)$input['price_real'];
        }

        if (!count($updates)) jsonFail(400, 'No fields to update');

        $params[] = $id;
        $sql = "UPDATE webshop_products SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        jsonResponse(array('success' => true, 'message' => 'Product updated'));
    }

    case 'delete_product': {
        if ($method !== 'POST' && $method !== 'DELETE') jsonFail(405, 'Method not allowed');

        $id = 0;
        if (isset($input['id'])) $id = (int)$input['id'];
        elseif (isset($_GET['id'])) $id = (int)$_GET['id'];
        if ($id <= 0) jsonFail(400, 'Invalid product ID');

        $stmt = $pdo->prepare("DELETE FROM webshop_products WHERE id = ?");
        $stmt->execute(array($id));

        jsonResponse(array('success' => true, 'message' => 'Product deleted'));
    }

    // ========== ORDERS ==========
    case 'list_orders': {
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        if ($page < 1) $page = 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        if ($limit < 10) $limit = 10;
        if ($limit > 100) $limit = 100;
        $offset = ($page - 1) * $limit;

        $status = isset($_GET['status']) ? trim($_GET['status']) : '';
        $validStatuses = array('pending', 'completed', 'failed', 'refunded');

        $where = "";
        $params = array();
        if ($status !== '' && in_array($status, $validStatuses, true)) {
            $where = "WHERE o.status = ?";
            $params[] = $status;
        }

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM webshop_orders o {$where}");
        $stmt->execute($params);
        $total = (int)$stmt->fetchColumn();

        // Detect username column (name or login)
        $usernameCol = 'name';
        try {
            $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
            if (in_array('login', $cols) && !in_array('name', $cols)) {
                $usernameCol = 'login';
            }
        } catch (Exception $e) {}

        // Join with users and products for display names
        $sql = "
            SELECT o.*,
                   u.{$usernameCol} as username,
                   p.name as product_name
            FROM webshop_orders o
            LEFT JOIN users u ON u.ID = o.user_id
            LEFT JOIN webshop_products p ON p.id = o.product_id
            {$where}
            ORDER BY o.created_at DESC
            LIMIT {$offset}, {$limit}
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse(array(
            'success' => true,
            'orders' => $orders,
            'total' => $total,
            'page' => $page,
            'pages' => (int)ceil($total / $limit)
        ));
    }

    case 'update_order': {
        if ($method !== 'POST') jsonFail(405, 'Method not allowed');

        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $status = isset($input['status']) ? trim($input['status']) : '';

        if ($id <= 0) jsonFail(400, 'Invalid order ID');

        $validStatuses = array('pending', 'completed', 'failed', 'refunded');
        if (!in_array($status, $validStatuses, true)) jsonFail(400, 'Invalid status');

        $now = date('Y-m-d H:i:s');

        if ($status === 'completed') {
            $stmt = $pdo->prepare("UPDATE webshop_orders SET status = ?, delivered_at = ?, updated_at = ? WHERE id = ?");
            $stmt->execute(array($status, $now, $now, $id));
        } else {
            $stmt = $pdo->prepare("UPDATE webshop_orders SET status = ?, updated_at = ? WHERE id = ?");
            $stmt->execute(array($status, $now, $id));
        }

        if ($stmt->rowCount() === 0) jsonFail(404, 'Order not found');

        jsonResponse(array('success' => true, 'message' => 'Order status updated'));
    }

    case 'get_order': {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) jsonFail(400, 'Invalid order ID');

        // Detect username column
        $usernameCol = 'name';
        try {
            $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
            if (in_array('login', $cols) && !in_array('name', $cols)) {
                $usernameCol = 'login';
            }
        } catch (Exception $e) {}

        $stmt = $pdo->prepare("
            SELECT o.*,
                   u.{$usernameCol} as username,
                   p.name as product_name
            FROM webshop_orders o
            LEFT JOIN users u ON u.ID = o.user_id
            LEFT JOIN webshop_products p ON p.id = o.product_id
            WHERE o.id = ?
            LIMIT 1
        ");
        $stmt->execute(array($id));
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$order) jsonFail(404, 'Order not found');

        jsonResponse(array('success' => true, 'order' => $order));
    }

    default:
        jsonFail(400, 'Invalid action');
}
