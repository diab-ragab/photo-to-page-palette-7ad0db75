<?php
/**
 * bundles.php - Flash Sale Bundles API (PRO)
 * PHP 5.x compatible
 * - NO schema creation in runtime (prevents 502/timeouts)
 * - Stable Stripe call via cURL
 * - Always JSON responses
 */

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', '0');
error_reporting(E_ALL);

if (!function_exists('jsonFail')) {
  function jsonFail($code, $msg) {
    http_response_code((int)$code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('success' => false, 'error' => (string)$msg));
    exit;
  }
}

function jsonOut($data) {
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data);
  exit;
}

set_exception_handler(function($e){
  error_log("BUNDLES_EXCEPTION: " . $e->getMessage());
  jsonFail(500, 'Server error');
});

set_error_handler(function($severity, $message, $file, $line){
  // Respect @ suppression operator
  if (error_reporting() === 0) return false;
  // Only convert fatal-level errors, not warnings/notices
  if ($severity === E_ERROR || $severity === E_USER_ERROR) {
    throw new ErrorException($message, 0, $severity, $file, $line);
  }
  // Log but don't crash on warnings/notices
  error_log("BUNDLES_PHP_WARN: [{$severity}] {$message} in {$file}:{$line}");
  return true;
});

// Bootstrap + CORS
require_once __DIR__ . '/bootstrap.php';
if (function_exists('handleCors')) {
  handleCors(array('GET', 'POST', 'OPTIONS'));
} else {
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Session-Token');
}

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session_helper.php';

// DB
try {
  $pdo = getDB();
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
  error_log("BUNDLES_DB_CONNECT_ERR: " . $e->getMessage());
  jsonFail(503, 'Database unavailable');
}

// Read JSON body once
$raw = file_get_contents('php://input');
$input = array();
if ($raw) {
  $parsed = json_decode($raw, true);
  if (is_array($parsed)) $input = $parsed;
}

// Action
$action = '';
if (isset($_GET['action'])) $action = $_GET['action'];
elseif (isset($_POST['action'])) $action = $_POST['action'];
elseif (isset($input['action'])) $action = $input['action'];

// Icons
$iconMap = array(
  'GIFT' => '🎁', 'GEM' => '💎', 'SWORD' => '🗡️', 'SHIELD' => '🛡️', 'CROWN' => '👑',
  'STAR' => '⭐', 'BOLT' => '⚡', 'MOUNT' => '🐴', 'PET' => '🐉', 'COSTUME' => '👔',
  'COINS' => '🪙', 'POTION' => '🧪',
);

function getBearerToken() {
  $token = '';
  $auth = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
  if ($auth && stripos($auth, 'Bearer ') === 0) $token = trim(substr($auth, 7));
  if (!$token) $token = isset($_SERVER['HTTP_X_SESSION_TOKEN']) ? $_SERVER['HTTP_X_SESSION_TOKEN'] : '';
  return $token;
}

function stripeCreateCheckoutSession($secretKey, $body, &$httpCode, &$errText) {
  $httpCode = 0;
  $errText = '';
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
      'verify_peer' => false,
      'verify_peer_name' => false,
    ),
  );
  $context = stream_context_create($opts);
  $resp = @file_get_contents('https://api.stripe.com/v1/checkout/sessions', false, $context);
  if (isset($http_response_header) && is_array($http_response_header) && count($http_response_header) > 0) {
    if (preg_match('/HTTP\/\d+\.?\d*\s+(\d+)/', $http_response_header[0], $m)) {
      $httpCode = (int)$m[1];
    }
  }
  if ($resp === false) {
    $errText = 'file_get_contents failed';
  }
  return $resp;
}

/**
 * ROUTES
 */
switch ($action) {

  case 'ping':
    jsonOut(array('success' => true, 'ts' => time(), 'php' => PHP_VERSION));
    break;

  // PUBLIC: list bundles
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

      foreach ($bundles as $k => $bundle) {
        $stmt2 = $pdo->prepare("
          SELECT item_name, quantity, icon, item_id, item_quantity
          FROM flash_bundle_items
          WHERE bundle_id = ?
          ORDER BY sort_order ASC
        ");
        $stmt2->execute(array($bundle['id']));
        $items = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        foreach ($items as $i => $item) {
          $code = isset($item['icon']) ? $item['icon'] : 'GIFT';
          $items[$i]['icon_emoji'] = isset($iconMap[$code]) ? $iconMap[$code] : '🎁';
        }

        $bundles[$k]['items'] = $items;
        $bundles[$k]['ends_at_ts'] = strtotime($bundle['ends_at']);
      }

      jsonOut(array('success' => true, 'bundles' => $bundles, 'server_time' => time()));
    } catch (Exception $e) {
      error_log("BUNDLES_LIST_ERR: " . $e->getMessage());
      jsonFail(500, 'Failed to fetch bundles');
    }
    break;

  // ADMIN: list all
  case 'list_all':
    $adminUser = requireAdmin();
    try {
      $stmt = $pdo->query("SELECT * FROM flash_bundles ORDER BY is_active DESC, ends_at DESC");
      $bundles = $stmt->fetchAll(PDO::FETCH_ASSOC);

      foreach ($bundles as $k => $bundle) {
        $stmt2 = $pdo->prepare("SELECT * FROM flash_bundle_items WHERE bundle_id = ? ORDER BY sort_order ASC");
        $stmt2->execute(array($bundle['id']));
        $bundles[$k]['items'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);
      }

      jsonOut(array('success' => true, 'bundles' => $bundles));
    } catch (Exception $e) {
      error_log("BUNDLES_LIST_ALL_ERR: " . $e->getMessage());
      jsonFail(500, 'Failed to fetch bundles');
    }
    break;

  // ADMIN: create
  case 'create':
    $adminUser = requireAdmin();

    $name = isset($input['name']) ? trim($input['name']) : '';
    $description = isset($input['description']) ? trim($input['description']) : '';
    $originalPrice = isset($input['original_price']) ? floatval($input['original_price']) : 0;
    $salePrice = isset($input['sale_price']) ? floatval($input['sale_price']) : 0;
    $endsAt = isset($input['ends_at']) ? $input['ends_at'] : '';
    $isFeatured = isset($input['is_featured']) ? ($input['is_featured'] ? 1 : 0) : 0;
    $stock = (isset($input['stock']) && $input['stock'] !== '' && $input['stock'] !== null) ? intval($input['stock']) : null;
    $isActive = isset($input['is_active']) ? ($input['is_active'] ? 1 : 0) : 1;
    $items = (isset($input['items']) && is_array($input['items'])) ? $input['items'] : array();

    if ($name === '' || $originalPrice <= 0 || $salePrice <= 0 || $endsAt === '') {
      jsonFail(400, 'Name, prices, and end date are required');
    }

    $discount = $originalPrice > 0 ? round((1 - $salePrice / $originalPrice) * 100) : 0;

    try {
      $pdo->beginTransaction();

      $stmt = $pdo->prepare("
        INSERT INTO flash_bundles
          (name, description, original_price, sale_price, discount_percent, ends_at, is_featured, stock, is_active, created_at)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ");
      $stmt->execute(array($name, $description, $originalPrice, $salePrice, $discount, $endsAt, $isFeatured, $stock, $isActive));
      $bundleId = $pdo->lastInsertId();

      foreach ($items as $idx => $item) {
        $itemName = isset($item['item_name']) ? trim($item['item_name']) : '';
        if ($itemName === '') continue;
        $quantity = isset($item['quantity']) ? intval($item['quantity']) : 1;
        $icon = isset($item['icon']) ? strtoupper(trim($item['icon'])) : 'GIFT';
        $gameItemId = isset($item['item_id']) ? intval($item['item_id']) : 0;
        $gameItemQty = isset($item['item_quantity']) ? intval($item['item_quantity']) : 1;

        $stmt2 = $pdo->prepare("
          INSERT INTO flash_bundle_items
            (bundle_id, item_name, quantity, icon, item_id, item_quantity, sort_order)
          VALUES
            (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt2->execute(array($bundleId, $itemName, $quantity, $icon, $gameItemId, $gameItemQty, $idx));
      }

      $pdo->commit();
      jsonOut(array('success' => true, 'bundle_id' => $bundleId));
    } catch (Exception $e) {
      $pdo->rollBack();
      error_log("BUNDLES_CREATE_ERR: " . $e->getMessage());
      jsonFail(500, 'Failed to create bundle');
    }
    break;

  // ADMIN: update
  case 'update':
    $adminUser = requireAdmin();

    $id = isset($input['id']) ? intval($input['id']) : 0;
    if (!$id) jsonFail(400, 'Bundle ID required');

    $name = isset($input['name']) ? trim($input['name']) : '';
    $description = isset($input['description']) ? trim($input['description']) : '';
    $originalPrice = isset($input['original_price']) ? floatval($input['original_price']) : 0;
    $salePrice = isset($input['sale_price']) ? floatval($input['sale_price']) : 0;
    $endsAt = isset($input['ends_at']) ? $input['ends_at'] : '';
    $isFeatured = isset($input['is_featured']) ? ($input['is_featured'] ? 1 : 0) : 0;
    $stock = (isset($input['stock']) && $input['stock'] !== '' && $input['stock'] !== null) ? intval($input['stock']) : null;
    $isActive = isset($input['is_active']) ? ($input['is_active'] ? 1 : 0) : 1;
    $items = (isset($input['items']) && is_array($input['items'])) ? $input['items'] : array();

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

      $pdo->prepare("DELETE FROM flash_bundle_items WHERE bundle_id = ?")->execute(array($id));

      foreach ($items as $idx => $item) {
        $itemName = isset($item['item_name']) ? trim($item['item_name']) : '';
        if ($itemName === '') continue;
        $quantity = isset($item['quantity']) ? intval($item['quantity']) : 1;
        $icon = isset($item['icon']) ? strtoupper(trim($item['icon'])) : 'GIFT';
        $gameItemId = isset($item['item_id']) ? intval($item['item_id']) : 0;
        $gameItemQty = isset($item['item_quantity']) ? intval($item['item_quantity']) : 1;

        $stmt2 = $pdo->prepare("
          INSERT INTO flash_bundle_items
            (bundle_id, item_name, quantity, icon, item_id, item_quantity, sort_order)
          VALUES
            (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt2->execute(array($id, $itemName, $quantity, $icon, $gameItemId, $gameItemQty, $idx));
      }

      $pdo->commit();
      jsonOut(array('success' => true));
    } catch (Exception $e) {
      $pdo->rollBack();
      error_log("BUNDLES_UPDATE_ERR: " . $e->getMessage());
      jsonFail(500, 'Failed to update bundle');
    }
    break;

  // ADMIN: delete
  case 'delete':
    $adminUser = requireAdmin();

    $id = isset($input['id']) ? intval($input['id']) : 0;
    if (!$id) jsonFail(400, 'Bundle ID required');

    try {
      $pdo->beginTransaction();
      $pdo->prepare("DELETE FROM flash_bundle_items WHERE bundle_id = ?")->execute(array($id));
      $pdo->prepare("DELETE FROM flash_bundles WHERE id = ?")->execute(array($id));
      $pdo->commit();
      jsonOut(array('success' => true));
    } catch (Exception $e) {
      $pdo->rollBack();
      error_log("BUNDLES_DELETE_ERR: " . $e->getMessage());
      jsonFail(500, 'Failed to delete bundle');
    }
    break;

  // ADMIN: toggle
  case 'toggle':
    $adminUser = requireAdmin();

    $id = isset($input['id']) ? intval($input['id']) : 0;
    $isActive = isset($input['is_active']) ? ($input['is_active'] ? 1 : 0) : 0;
    if (!$id) jsonFail(400, 'Bundle ID required');

    try {
      $stmt = $pdo->prepare("UPDATE flash_bundles SET is_active = ? WHERE id = ?");
      $stmt->execute(array($isActive, $id));
      jsonOut(array('success' => true));
    } catch (Exception $e) {
      error_log("BUNDLES_TOGGLE_ERR: " . $e->getMessage());
      jsonFail(500, 'Failed to toggle bundle');
    }
    break;

  // PUBLIC: purchase
  case 'purchase':
    $token = getBearerToken();
    if (!$token) jsonFail(401, 'Please login to purchase');

    // Validate session
    $stmt = $pdo->prepare("SELECT user_id FROM user_sessions WHERE session_token = ? LIMIT 1");
    $stmt->execute(array($token));
    $uid = (int)$stmt->fetchColumn();
    if ($uid <= 0) jsonFail(401, 'Invalid session');

    $bundleId = isset($input['bundle_id']) ? (int)$input['bundle_id'] : 0;
    $characterId = isset($input['character_id']) ? (int)$input['character_id'] : 0;
    $characterName = isset($input['character_name']) ? trim($input['character_name']) : '';

    if (!$bundleId) jsonFail(400, 'Bundle ID required');
    if (!$characterId) jsonFail(400, 'Please select a character');

    // Load bundle
    $stmt = $pdo->prepare("SELECT * FROM flash_bundles WHERE id = ? AND is_active = 1 AND ends_at > NOW()");
    $stmt->execute(array($bundleId));
    $bundle = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$bundle) jsonFail(404, 'Bundle not found or expired');

    // Stripe config
    $cfg = function_exists('getConfig') ? getConfig() : array();
    $stripeCfg = isset($cfg['stripe']) ? $cfg['stripe'] : array();
    $secretKey = isset($stripeCfg['secret_key']) ? $stripeCfg['secret_key'] : '';
    $currency  = isset($stripeCfg['currency']) ? $stripeCfg['currency'] : 'eur';
    $successUrl = isset($stripeCfg['success_url']) ? $stripeCfg['success_url'] : '';
    $cancelUrl  = isset($stripeCfg['cancel_url']) ? $stripeCfg['cancel_url'] : '';

    if (!$secretKey || !$successUrl || !$cancelUrl) jsonFail(500, 'Payment not configured');

    $salePrice = (float)$bundle['sale_price'];
    $unitAmount = (int)round($salePrice * 100);

    // Reserve stock + create pending order BEFORE calling Stripe
    $orderId = 0;
    $reserved = false;

    try {
      $pdo->beginTransaction();

      // Stock check/reserve (only if stock is not NULL)
      if ($bundle['stock'] !== null) {
        $stmt = $pdo->prepare("UPDATE flash_bundles SET stock = stock - 1 WHERE id = ? AND stock > 0");
        $stmt->execute(array($bundleId));
        if ($stmt->rowCount() <= 0) {
          $pdo->rollBack();
          jsonFail(400, 'Bundle sold out');
        }
        $reserved = true;
      }

      // Create pending order
      $stmt = $pdo->prepare("
        INSERT INTO bundle_orders
          (user_id, bundle_id, character_id, character_name, total_real, status, created_at)
        VALUES
          (?, ?, ?, ?, ?, 'pending', NOW())
      ");
      $stmt->execute(array($uid, $bundleId, $characterId, $characterName, $salePrice));
      $orderId = (int)$pdo->lastInsertId();

      $pdo->commit();
    } catch (Exception $e) {
      try { $pdo->rollBack(); } catch (Exception $ignore) {}
      error_log("BUNDLE_PREPARE_ORDER_ERR: " . $e->getMessage());
      jsonFail(500, 'Failed to prepare order');
    }

    // Create Stripe checkout session
    $fields = array(
      'mode' => 'payment',
      'success_url' => $successUrl,
      'cancel_url' => $cancelUrl,
      'client_reference_id' => (string)$uid,
      'metadata[user_id]' => (string)$uid,
      'metadata[bundle_id]' => (string)$bundleId,
      'metadata[character_id]' => (string)$characterId,
      'metadata[character_name]' => $characterName,
      'metadata[type]' => 'bundle',
      'metadata[order_id]' => (string)$orderId,
      'line_items[0][price_data][currency]' => $currency,
      'line_items[0][price_data][unit_amount]' => $unitAmount,
      'line_items[0][price_data][product_data][name]' => $bundle['name'],
      'line_items[0][price_data][product_data][description]' => ($bundle['description'] ? $bundle['description'] : 'Flash Sale Bundle'),
      'line_items[0][quantity]' => 1,
    );

    $body = http_build_query($fields);
    $httpCode = 0;
    $errText = '';
    $resp = stripeCreateCheckoutSession($secretKey, $body, $httpCode, $errText);

    if ($resp === false || $httpCode < 200 || $httpCode >= 300) {
      error_log("BUNDLE_STRIPE_ERR order={$orderId} code={$httpCode} err={$errText} resp=" . substr((string)$resp, 0, 600));
      // mark failed + restore stock
      try {
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE bundle_orders SET status='failed' WHERE id=?")->execute(array($orderId));
        if ($reserved) {
          $pdo->prepare("UPDATE flash_bundles SET stock = stock + 1 WHERE id=? AND stock IS NOT NULL")->execute(array($bundleId));
        }
        $pdo->commit();
      } catch (Exception $e) {
        try { $pdo->rollBack(); } catch (Exception $ignore) {}
      }
      jsonFail(502, 'Payment service error');
    }

    $stripeData = json_decode($resp, true);
    if (!is_array($stripeData) || !isset($stripeData['url']) || !isset($stripeData['id'])) {
      error_log("BUNDLE_STRIPE_BADJSON order={$orderId} resp=" . substr((string)$resp, 0, 600));
      try {
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE bundle_orders SET status='failed' WHERE id=?")->execute(array($orderId));
        if ($reserved) {
          $pdo->prepare("UPDATE flash_bundles SET stock = stock + 1 WHERE id=? AND stock IS NOT NULL")->execute(array($bundleId));
        }
        $pdo->commit();
      } catch (Exception $e) {
        try { $pdo->rollBack(); } catch (Exception $ignore) {}
      }
      jsonFail(502, 'Invalid payment response');
    }

    // Save stripe session id
    try {
      $stmt = $pdo->prepare("UPDATE bundle_orders SET stripe_session_id = ? WHERE id = ?");
      $stmt->execute(array($stripeData['id'], $orderId));
    } catch (Exception $e) {
      error_log("BUNDLE_SAVE_SESSION_WARN order={$orderId} err=" . $e->getMessage());
    }

    error_log("BUNDLE_ORDER_CREATED order={$orderId} user={$uid} bundle={$bundleId} stripe_session=" . $stripeData['id']);
    jsonOut(array('success' => true, 'url' => $stripeData['url'], 'order_id' => $orderId));
    break;

  // ADMIN: list bundle orders
  case 'list_bundle_orders':
    $adminUser = requireAdmin();

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

    $countSql = "SELECT COUNT(*) FROM bundle_orders bo WHERE {$where}";
    $stmt = $pdo->prepare($countSql);
    $stmt->execute($params);
    $total = (int)$stmt->fetchColumn();

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

  // ADMIN: update order status
  case 'update_order_status':
    $adminUser = requireAdmin();

    $orderId = isset($input['id']) ? (int)$input['id'] : 0;
    $newStatus = isset($input['status']) ? trim($input['status']) : '';

    if (!$orderId) jsonFail(400, 'Order ID required');

    $allowedStatuses = array('pending', 'completed', 'failed', 'refunded');
    if (!in_array($newStatus, $allowedStatuses)) jsonFail(400, 'Invalid status');

    try {
      $deliveredAt = ($newStatus === 'completed') ? ", delivered_at = NOW()" : "";
      $stmt = $pdo->prepare("UPDATE bundle_orders SET status = ? {$deliveredAt} WHERE id = ?");
      $stmt->execute(array($newStatus, $orderId));

      if ($newStatus === 'failed' || $newStatus === 'refunded') {
        $stmt = $pdo->prepare("SELECT bundle_id FROM bundle_orders WHERE id = ?");
        $stmt->execute(array($orderId));
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($order && $order['bundle_id']) {
          $pdo->prepare("UPDATE flash_bundles SET stock = stock + 1 WHERE id = ? AND stock IS NOT NULL")->execute(array($order['bundle_id']));
        }
      }

      jsonOut(array('success' => true));
    } catch (Exception $e) {
      error_log("BUNDLES_UPDATE_ORDER_ERR: " . $e->getMessage());
      jsonFail(500, 'Failed to update order');
    }
    break;

  default:
    jsonFail(400, 'Invalid action');
}
