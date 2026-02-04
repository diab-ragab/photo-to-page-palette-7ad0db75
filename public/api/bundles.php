<?php
/**
 * bundles.php - Flash Sale Bundles API
 * PHP 5.x compatible
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session_helper.php';

header('Content-Type: application/json; charset=utf-8');

// CORS
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowedOrigins = array(
  'https://woiendgame.online',
  'https://www.woiendgame.online',
  'https://woiendgame.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
);
$isLovable = is_string($origin) && preg_match('/^https:\/\/[a-z0-9-]+\.(lovableproject\.com|lovable\.app)$/i', $origin);
if ($origin && (in_array($origin, $allowedOrigins, true) || $isLovable)) {
  header("Access-Control-Allow-Origin: $origin");
  header("Vary: Origin");
  header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, X-Session-Token, Authorization, X-CSRF-Token");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

function jsonOut($data) {
  echo json_encode($data);
  exit;
}

function jsonFail($code, $msg) {
  http_response_code($code);
  jsonOut(array('success' => false, 'message' => $msg));
}

// DB connection
try {
  $pdo = getDB();
} catch (Exception $e) {
  jsonFail(503, 'Database unavailable');
}

// Create tables if needed
try {
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS flash_bundles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description VARCHAR(255) DEFAULT NULL,
      original_price DECIMAL(10,2) NOT NULL,
      sale_price DECIMAL(10,2) NOT NULL,
      discount_percent INT NOT NULL DEFAULT 0,
      ends_at DATETIME NOT NULL,
      is_featured TINYINT(1) DEFAULT 0,
      stock INT DEFAULT NULL,
      is_active TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT NULL,
      INDEX idx_active_ends (is_active, ends_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  ");
  
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS flash_bundle_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bundle_id INT NOT NULL,
      item_name VARCHAR(100) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      icon VARCHAR(50) DEFAULT 'GIFT',
      item_id INT DEFAULT 0,
      item_quantity INT DEFAULT 1,
      sort_order INT DEFAULT 0,
      INDEX idx_bundle (bundle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  ");
  
  // Add item_id and item_quantity columns if not exist (for upgrades)
  try {
    $pdo->exec("ALTER TABLE flash_bundle_items ADD COLUMN item_id INT DEFAULT 0 AFTER icon");
  } catch (Exception $e) {}
  try {
    $pdo->exec("ALTER TABLE flash_bundle_items ADD COLUMN item_quantity INT DEFAULT 1 AFTER item_id");
  } catch (Exception $e) {}
} catch (Exception $e) {
  // Tables may already exist
}

// Get action
$action = '';
if (isset($_GET['action'])) {
  $action = $_GET['action'];
} elseif (isset($_POST['action'])) {
  $action = $_POST['action'];
} else {
  $raw = file_get_contents('php://input');
  if ($raw) {
    $json = json_decode($raw, true);
    if (isset($json['action'])) {
      $action = $json['action'];
    }
  }
}

// Parse JSON body for POST
$input = array();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $raw = file_get_contents('php://input');
  if ($raw) {
    $input = json_decode($raw, true);
    if (!is_array($input)) {
      $input = array();
    }
  }
}

// Icon mapping for display
$iconMap = array(
  'GIFT' => '🎁',
  'GEM' => '💎',
  'SWORD' => '🗡️',
  'SHIELD' => '🛡️',
  'CROWN' => '👑',
  'STAR' => '⭐',
  'BOLT' => '⚡',
  'MOUNT' => '🐴',
  'PET' => '🐉',
  'COSTUME' => '👔',
  'COINS' => '🪙',
  'POTION' => '🧪',
);

switch ($action) {

  // PUBLIC: List active bundles (for shop)
  case 'list':
    try {
      $now = date('Y-m-d H:i:s');
      $stmt = $pdo->prepare("
        SELECT * FROM flash_bundles 
        WHERE is_active = 1 AND ends_at > ?
        ORDER BY is_featured DESC, sort_order ASC, ends_at ASC
      ");
      $stmt->execute(array($now));
      $bundles = $stmt->fetchAll(PDO::FETCH_ASSOC);
      
      // Get items for each bundle
      foreach ($bundles as $k => $bundle) {
      $stmt2 = $pdo->prepare("
        SELECT item_name, quantity, icon, item_id, item_quantity FROM flash_bundle_items
        WHERE bundle_id = ?
        ORDER BY sort_order ASC
      ");
      $stmt2->execute(array($bundle['id']));
      $items = $stmt2->fetchAll(PDO::FETCH_ASSOC);
        
        // Map icons
        foreach ($items as $i => $item) {
          $code = isset($item['icon']) ? $item['icon'] : 'GIFT';
          $items[$i]['icon_emoji'] = isset($iconMap[$code]) ? $iconMap[$code] : '🎁';
        }
        
        $bundles[$k]['items'] = $items;
        $bundles[$k]['ends_at_ts'] = strtotime($bundle['ends_at']);
      }
      
      jsonOut(array('success' => true, 'bundles' => $bundles, 'server_time' => time()));
    } catch (Exception $e) {
      jsonFail(500, 'Failed to fetch bundles');
    }
    break;

  // ADMIN: List all bundles including inactive
  case 'list_all':
    $auth = requireAdmin();
    if (!$auth['success']) {
      jsonFail(403, 'Admin access required');
    }
    
    try {
      $stmt = $pdo->query("
        SELECT * FROM flash_bundles 
        ORDER BY is_active DESC, ends_at DESC
      ");
      $bundles = $stmt->fetchAll(PDO::FETCH_ASSOC);
      
      foreach ($bundles as $k => $bundle) {
        $stmt2 = $pdo->prepare("
          SELECT * FROM flash_bundle_items
          WHERE bundle_id = ?
          ORDER BY sort_order ASC
        ");
        $stmt2->execute(array($bundle['id']));
        $bundles[$k]['items'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);
      }
      
      jsonOut(array('success' => true, 'bundles' => $bundles));
    } catch (Exception $e) {
      jsonFail(500, 'Failed to fetch bundles');
    }
    break;

  // ADMIN: Create bundle
  case 'create':
    $auth = requireAdmin();
    if (!$auth['success']) {
      jsonFail(403, 'Admin access required');
    }
    
    $name = isset($input['name']) ? trim($input['name']) : '';
    $description = isset($input['description']) ? trim($input['description']) : '';
    $originalPrice = isset($input['original_price']) ? floatval($input['original_price']) : 0;
    $salePrice = isset($input['sale_price']) ? floatval($input['sale_price']) : 0;
    $endsAt = isset($input['ends_at']) ? $input['ends_at'] : '';
    $isFeatured = isset($input['is_featured']) ? ($input['is_featured'] ? 1 : 0) : 0;
    $stock = isset($input['stock']) ? intval($input['stock']) : null;
    $isActive = isset($input['is_active']) ? ($input['is_active'] ? 1 : 0) : 1;
    $items = isset($input['items']) && is_array($input['items']) ? $input['items'] : array();
    
    if ($name === '' || $originalPrice <= 0 || $salePrice <= 0 || $endsAt === '') {
      jsonFail(400, 'Name, prices, and end date are required');
    }
    
    $discount = $originalPrice > 0 ? round((1 - $salePrice / $originalPrice) * 100) : 0;
    
    try {
      $pdo->beginTransaction();
      
      $stmt = $pdo->prepare("
        INSERT INTO flash_bundles (name, description, original_price, sale_price, discount_percent, ends_at, is_featured, stock, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ");
      $stmt->execute(array($name, $description, $originalPrice, $salePrice, $discount, $endsAt, $isFeatured, $stock, $isActive));
      $bundleId = $pdo->lastInsertId();
      
      // Insert items
    foreach ($items as $idx => $item) {
      $itemName = isset($item['item_name']) ? trim($item['item_name']) : '';
      $quantity = isset($item['quantity']) ? intval($item['quantity']) : 1;
      $icon = isset($item['icon']) ? strtoupper(trim($item['icon'])) : 'GIFT';
      $gameItemId = isset($item['item_id']) ? intval($item['item_id']) : 0;
      $gameItemQty = isset($item['item_quantity']) ? intval($item['item_quantity']) : 1;
      
      if ($itemName !== '') {
        $stmt2 = $pdo->prepare("
          INSERT INTO flash_bundle_items (bundle_id, item_name, quantity, icon, item_id, item_quantity, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt2->execute(array($bundleId, $itemName, $quantity, $icon, $gameItemId, $gameItemQty, $idx));
      }
    }
      
      $pdo->commit();
      jsonOut(array('success' => true, 'bundle_id' => $bundleId));
    } catch (Exception $e) {
      $pdo->rollBack();
      jsonFail(500, 'Failed to create bundle: ' . $e->getMessage());
    }
    break;

  // ADMIN: Update bundle
  case 'update':
    $auth = requireAdmin();
    if (!$auth['success']) {
      jsonFail(403, 'Admin access required');
    }
    
    $id = isset($input['id']) ? intval($input['id']) : 0;
    if (!$id) {
      jsonFail(400, 'Bundle ID required');
    }
    
    $name = isset($input['name']) ? trim($input['name']) : '';
    $description = isset($input['description']) ? trim($input['description']) : '';
    $originalPrice = isset($input['original_price']) ? floatval($input['original_price']) : 0;
    $salePrice = isset($input['sale_price']) ? floatval($input['sale_price']) : 0;
    $endsAt = isset($input['ends_at']) ? $input['ends_at'] : '';
    $isFeatured = isset($input['is_featured']) ? ($input['is_featured'] ? 1 : 0) : 0;
    $stock = isset($input['stock']) ? (strlen($input['stock']) ? intval($input['stock']) : null) : null;
    $isActive = isset($input['is_active']) ? ($input['is_active'] ? 1 : 0) : 1;
    $items = isset($input['items']) && is_array($input['items']) ? $input['items'] : array();
    
    $discount = $originalPrice > 0 ? round((1 - $salePrice / $originalPrice) * 100) : 0;
    
    try {
      $pdo->beginTransaction();
      
      $stmt = $pdo->prepare("
        UPDATE flash_bundles SET
          name = ?,
          description = ?,
          original_price = ?,
          sale_price = ?,
          discount_percent = ?,
          ends_at = ?,
          is_featured = ?,
          stock = ?,
          is_active = ?
        WHERE id = ?
      ");
      $stmt->execute(array($name, $description, $originalPrice, $salePrice, $discount, $endsAt, $isFeatured, $stock, $isActive, $id));
      
      // Delete old items and re-insert
      $pdo->prepare("DELETE FROM flash_bundle_items WHERE bundle_id = ?")->execute(array($id));
      
    foreach ($items as $idx => $item) {
      $itemName = isset($item['item_name']) ? trim($item['item_name']) : '';
      $quantity = isset($item['quantity']) ? intval($item['quantity']) : 1;
      $icon = isset($item['icon']) ? strtoupper(trim($item['icon'])) : 'GIFT';
      $gameItemId = isset($item['item_id']) ? intval($item['item_id']) : 0;
      $gameItemQty = isset($item['item_quantity']) ? intval($item['item_quantity']) : 1;
      
      if ($itemName !== '') {
        $stmt2 = $pdo->prepare("
          INSERT INTO flash_bundle_items (bundle_id, item_name, quantity, icon, item_id, item_quantity, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt2->execute(array($id, $itemName, $quantity, $icon, $gameItemId, $gameItemQty, $idx));
      }
    }
      
      $pdo->commit();
      jsonOut(array('success' => true));
    } catch (Exception $e) {
      $pdo->rollBack();
      jsonFail(500, 'Failed to update bundle');
    }
    break;

  // ADMIN: Delete bundle
  case 'delete':
    $auth = requireAdmin();
    if (!$auth['success']) {
      jsonFail(403, 'Admin access required');
    }
    
    $id = isset($input['id']) ? intval($input['id']) : 0;
    if (!$id) {
      jsonFail(400, 'Bundle ID required');
    }
    
    try {
      $pdo->beginTransaction();
      $pdo->prepare("DELETE FROM flash_bundle_items WHERE bundle_id = ?")->execute(array($id));
      $pdo->prepare("DELETE FROM flash_bundles WHERE id = ?")->execute(array($id));
      $pdo->commit();
      jsonOut(array('success' => true));
    } catch (Exception $e) {
      $pdo->rollBack();
      jsonFail(500, 'Failed to delete bundle');
    }
    break;

  // ADMIN: Toggle active status
  case 'toggle':
    $auth = requireAdmin();
    if (!$auth['success']) {
      jsonFail(403, 'Admin access required');
    }
    
    $id = isset($input['id']) ? intval($input['id']) : 0;
    $isActive = isset($input['is_active']) ? ($input['is_active'] ? 1 : 0) : 0;
    
    if (!$id) {
      jsonFail(400, 'Bundle ID required');
    }
    
    try {
      $stmt = $pdo->prepare("UPDATE flash_bundles SET is_active = ? WHERE id = ?");
      $stmt->execute(array($isActive, $id));
      jsonOut(array('success' => true));
    } catch (Exception $e) {
      jsonFail(500, 'Failed to toggle bundle');
    }
    break;

  // PUBLIC: Purchase bundle (creates order and redirects to Stripe)
  case 'purchase':
    // Require auth
    $token = '';
    $auth = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (stripos($auth, 'Bearer ') === 0) {
      $token = trim(substr($auth, 7));
    }
    if (!$token) {
      $token = isset($_SERVER['HTTP_X_SESSION_TOKEN']) ? $_SERVER['HTTP_X_SESSION_TOKEN'] : '';
    }
    if (!$token) {
      jsonFail(401, 'Please login to purchase');
    }
    
    // Validate session
    $stmt = $pdo->prepare("SELECT user_id, expires_at FROM user_sessions WHERE session_token = ? LIMIT 1");
    $stmt->execute(array($token));
    $sess = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$sess || (int)$sess['user_id'] <= 0) {
      jsonFail(401, 'Invalid session');
    }
    $userId = (int)$sess['user_id'];
    
    // Get bundle and character info
    $bundleId = isset($input['bundle_id']) ? (int)$input['bundle_id'] : 0;
    $characterId = isset($input['character_id']) ? (int)$input['character_id'] : 0;
    $characterName = isset($input['character_name']) ? trim($input['character_name']) : '';
    
    if (!$bundleId) {
      jsonFail(400, 'Bundle ID required');
    }
    if (!$characterId) {
      jsonFail(400, 'Please select a character');
    }
    
    // Get bundle
    $stmt = $pdo->prepare("SELECT * FROM flash_bundles WHERE id = ? AND is_active = 1 AND ends_at > NOW()");
    $stmt->execute(array($bundleId));
    $bundle = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$bundle) {
      jsonFail(404, 'Bundle not found or expired');
    }
    
    // Check stock
    if ($bundle['stock'] !== null && (int)$bundle['stock'] <= 0) {
      jsonFail(400, 'Bundle sold out');
    }
    
    // Get config for Stripe
    $cfg = getConfig();
    $stripeCfg = isset($cfg['stripe']) ? $cfg['stripe'] : array();
    $secretKey = isset($stripeCfg['secret_key']) ? $stripeCfg['secret_key'] : '';
    $currency = isset($stripeCfg['currency']) ? $stripeCfg['currency'] : 'eur';
    $successUrl = isset($stripeCfg['success_url']) ? $stripeCfg['success_url'] : '';
    $cancelUrl = isset($stripeCfg['cancel_url']) ? $stripeCfg['cancel_url'] : '';
    
    if (!$secretKey || !$successUrl || !$cancelUrl) {
      jsonFail(500, 'Payment not configured');
    }
    
    // Create Stripe checkout session
    $salePrice = (float)$bundle['sale_price'];
    $unitAmount = (int)round($salePrice * 100);
    
    $fields = array(
      'mode' => 'payment',
      'success_url' => $successUrl,
      'cancel_url' => $cancelUrl,
      'client_reference_id' => (string)$userId,
      'metadata[user_id]' => (string)$userId,
      'metadata[bundle_id]' => (string)$bundleId,
      'metadata[character_id]' => (string)$characterId,
      'metadata[character_name]' => $characterName,
      'metadata[type]' => 'bundle',
      'line_items[0][price_data][currency]' => $currency,
      'line_items[0][price_data][unit_amount]' => $unitAmount,
      'line_items[0][price_data][product_data][name]' => $bundle['name'],
      'line_items[0][price_data][product_data][description]' => $bundle['description'] ? $bundle['description'] : 'Flash Sale Bundle',
      'line_items[0][quantity]' => 1,
    );
    
    $body = http_build_query($fields);
    
    // Stripe request using file_get_contents
    $headers = array(
      'Authorization: Bearer ' . $secretKey,
      'Content-Type: application/x-www-form-urlencoded',
    );
    $opts = array(
      'http' => array(
        'method' => 'POST',
        'header' => implode("\r\n", $headers),
        'content' => $body,
        'ignore_errors' => true,
        'timeout' => 30,
      ),
      'ssl' => array(
        'verify_peer' => true,
        'verify_peer_name' => true,
      ),
    );
    $context = stream_context_create($opts);
    $resp = @file_get_contents('https://api.stripe.com/v1/checkout/sessions', false, $context);
    
    $code = 0;
    if (isset($http_response_header) && is_array($http_response_header) && count($http_response_header) > 0) {
      if (preg_match('/HTTP\/\d+\.?\d*\s+(\d+)/', $http_response_header[0], $m)) {
        $code = (int)$m[1];
      }
    }
    
    if ($resp === false || $code < 200 || $code >= 300) {
      error_log("BUNDLE_PURCHASE_STRIPE_ERR code={$code}");
      jsonFail(502, 'Payment service error');
    }
    
    $stripeData = json_decode($resp, true);
    if (!is_array($stripeData) || !isset($stripeData['url'])) {
      jsonFail(502, 'Invalid payment response');
    }
    
    // Create bundle_orders table if not exists
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS bundle_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        bundle_id INT NOT NULL,
        character_id INT NOT NULL,
        character_name VARCHAR(50) DEFAULT NULL,
        total_real DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
        stripe_session_id VARCHAR(255) DEFAULT NULL,
        stripe_payment_intent VARCHAR(255) DEFAULT NULL,
        delivered_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL,
        INDEX idx_user (user_id),
        INDEX idx_bundle (bundle_id),
        INDEX idx_status (status),
        INDEX idx_session (stripe_session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
    
    // Create pending order
    $stmt = $pdo->prepare("
      INSERT INTO bundle_orders (user_id, bundle_id, character_id, character_name, total_real, status, stripe_session_id, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW())
    ");
    $stmt->execute(array($userId, $bundleId, $characterId, $characterName, $salePrice, $stripeData['id']));
    $orderId = $pdo->lastInsertId();
    
    // Reserve stock (decrement now, will restore if payment fails)
    if ($bundle['stock'] !== null) {
      $pdo->prepare("UPDATE flash_bundles SET stock = stock - 1 WHERE id = ? AND stock > 0")->execute(array($bundleId));
    }
    
    error_log("BUNDLE_ORDER_CREATED order={$orderId} user={$userId} bundle={$bundleId} session=" . $stripeData['id']);
    
    jsonOut(array('success' => true, 'url' => $stripeData['url'], 'order_id' => $orderId));
    break;

  // ADMIN: List bundle orders
  case 'list_bundle_orders':
    $auth = requireAdmin();
    if (!$auth['success']) {
      jsonFail(403, 'Admin access required');
    }
    
    $page = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
    $limit = min(50, max(5, isset($_GET['limit']) ? (int)$_GET['limit'] : 15));
    $offset = ($page - 1) * $limit;
    $status = isset($_GET['status']) ? $_GET['status'] : '';
    
    $where = "1=1";
    $params = array();
    
    if ($status !== '' && in_array($status, array('pending', 'completed', 'failed', 'refunded'))) {
      $where .= " AND bo.status = ?";
      $params[] = $status;
    }
    
    // Count total
    $countSql = "SELECT COUNT(*) FROM bundle_orders bo WHERE {$where}";
    $stmt = $pdo->prepare($countSql);
    $stmt->execute($params);
    $total = (int)$stmt->fetchColumn();
    
    // Get orders with bundle and user info
    $sql = "
      SELECT 
        bo.*,
        fb.name as bundle_name,
        u.name as username
      FROM bundle_orders bo
      LEFT JOIN flash_bundles fb ON fb.id = bo.bundle_id
      LEFT JOIN users u ON u.id = bo.user_id
      WHERE {$where}
      ORDER BY bo.created_at DESC
      LIMIT {$offset}, {$limit}
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonOut(array(
      'success' => true,
      'orders' => $orders,
      'total' => $total,
      'page' => $page,
      'pages' => (int)ceil($total / $limit)
    ));
    break;
    
  // ADMIN: Update bundle order status
  case 'update_order_status':
    $auth = requireAdmin();
    if (!$auth['success']) {
      jsonFail(403, 'Admin access required');
    }
    
    $orderId = isset($input['id']) ? (int)$input['id'] : 0;
    $newStatus = isset($input['status']) ? trim($input['status']) : '';
    
    if (!$orderId) {
      jsonFail(400, 'Order ID required');
    }
    
    $allowedStatuses = array('pending', 'completed', 'failed', 'refunded');
    if (!in_array($newStatus, $allowedStatuses)) {
      jsonFail(400, 'Invalid status');
    }
    
    try {
      $deliveredAt = ($newStatus === 'completed') ? ", delivered_at = NOW()" : "";
      $stmt = $pdo->prepare("UPDATE bundle_orders SET status = ? {$deliveredAt} WHERE id = ?");
      $stmt->execute(array($newStatus, $orderId));
      
      // If marking as failed/refunded, restore stock
      if ($newStatus === 'failed' || $newStatus === 'refunded') {
        $stmt = $pdo->prepare("SELECT bundle_id, status FROM bundle_orders WHERE id = ?");
        $stmt->execute(array($orderId));
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($order && $order['bundle_id']) {
          $pdo->prepare("UPDATE flash_bundles SET stock = stock + 1 WHERE id = ? AND stock IS NOT NULL")->execute(array($order['bundle_id']));
        }
      }
      
      jsonOut(array('success' => true));
    } catch (Exception $e) {
      jsonFail(500, 'Failed to update order');
    }
    break;

  default:
    jsonFail(400, 'Invalid action');
}
