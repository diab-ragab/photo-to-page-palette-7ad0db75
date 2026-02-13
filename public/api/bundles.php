<?php
/**
 * bundles.php - Flash Sale Bundles API (PRO)
 * PHP 5.1+ compatible - NO closures, NO short array syntax
 */

ob_start();
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', '0');
error_reporting(0);

if (!function_exists('jsonFail')) {
  function jsonFail($code, $msg) {
    ob_clean();
    http_response_code((int)$code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('success' => false, 'error' => (string)$msg));
    exit;
  }
}

function jsonOut($data) {
  ob_clean();
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data);
  exit;
}

function _bundles_exception_handler($e) {
  error_log("BUNDLES_EXCEPTION: " . $e->getMessage());
  jsonFail(500, 'Server error');
}
set_exception_handler('_bundles_exception_handler');

function _bundles_error_handler($severity, $message, $file, $line) {
  if (error_reporting() === 0) return false;
  error_log("BUNDLES_PHP_WARN: [{$severity}] {$message} in {$file}:{$line}");
  return true;
}
set_error_handler('_bundles_error_handler');

// Bootstrap + CORS
require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET', 'POST', 'OPTIONS'));
require_once __DIR__ . '/session_helper.php';

// DB
try {
  $pdo = getDB();
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
  error_log("BUNDLES_DB_CONNECT_ERR: " . $e->getMessage());
  jsonFail(503, 'Database unavailable');
}

// Read JSON body once (use cached input from bootstrap)
$input = function_exists('getJsonInput') ? getJsonInput() : array();
if (empty($input)) {
  $raw = file_get_contents('php://input');
  if ($raw) {
    $parsed = json_decode($raw, true);
    if (is_array($parsed)) $input = $parsed;
  }
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

// PayPal helper is loaded from paypal_helper.php when needed

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
    require_once __DIR__ . '/paypal_helper.php';

    $token = getSessionToken();
    if (!$token) jsonFail(401, 'Please login to purchase');

    // Validate session using centralized helper
    $sess = resolveSessionRow($token);
    if (!$sess) jsonFail(401, 'Invalid session');
    if (isset($sess['expires_at']) && isSessionExpired($sess['expires_at'])) jsonFail(401, 'Session expired');
    $uid = (int)$sess['user_id'];
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

    // PayPal config
    $ppCfg = getPayPalConfig();
    if ($ppCfg['client_id'] === '' || $ppCfg['secret'] === '') jsonFail(500, 'Payment not configured');

    $salePrice = (float)$bundle['sale_price'];
    $salePriceFormatted = number_format($salePrice, 2, '.', '');

    // Reserve stock + create pending order BEFORE calling PayPal
    $orderId = 0;
    $reserved = false;

    try {
      $pdo->beginTransaction();

      if ($bundle['stock'] !== null) {
        $stmt = $pdo->prepare("UPDATE flash_bundles SET stock = stock - 1 WHERE id = ? AND stock > 0");
        $stmt->execute(array($bundleId));
        if ($stmt->rowCount() <= 0) {
          $pdo->rollBack();
          jsonFail(400, 'Bundle sold out');
        }
        $reserved = true;
      }

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

    // Get PayPal access token
    $tokenResult = getPayPalAccessToken($ppCfg['client_id'], $ppCfg['secret'], $ppCfg['sandbox']);
    if ($tokenResult['error'] !== '') {
      error_log("BUNDLE_PP_TOKEN_ERR: " . $tokenResult['error']);
      try {
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE bundle_orders SET status='failed' WHERE id=?")->execute(array($orderId));
        if ($reserved) {
          $pdo->prepare("UPDATE flash_bundles SET stock = stock + 1 WHERE id=? AND stock IS NOT NULL")->execute(array($bundleId));
        }
        $pdo->commit();
      } catch (Exception $e) { try { $pdo->rollBack(); } catch (Exception $ignore) {} }
      jsonFail(502, 'Payment service error');
    }

    // Build purchase units
    $purchaseUnits = array(
      array(
        'description' => $bundle['name'],
        'amount' => array(
          'currency_code' => $ppCfg['currency'],
          'value' => $salePriceFormatted,
        ),
      ),
    );

    $metadata = array(
      'user_id' => $uid,
      'type' => 'bundle',
      'bundle_id' => $bundleId,
      'order_id' => $orderId,
      'character_id' => $characterId,
    );

    $successUrl = $ppCfg['success_url'] . '?paypal=1';
    $cancelUrl = $ppCfg['cancel_url'];

    $orderResult = paypalCreateOrder(
      $tokenResult['token'],
      $purchaseUnits,
      $successUrl,
      $cancelUrl,
      $metadata,
      $ppCfg['sandbox']
    );

    if ($orderResult['error'] !== '') {
      error_log("BUNDLE_PP_ORDER_ERR order={$orderId}: " . $orderResult['error']);
      try {
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE bundle_orders SET status='failed' WHERE id=?")->execute(array($orderId));
        if ($reserved) {
          $pdo->prepare("UPDATE flash_bundles SET stock = stock + 1 WHERE id=? AND stock IS NOT NULL")->execute(array($bundleId));
        }
        $pdo->commit();
      } catch (Exception $e) { try { $pdo->rollBack(); } catch (Exception $ignore) {} }
      jsonFail(502, 'Payment service error');
    }

    // Save PayPal order id
    try {
      $pdo->prepare("ALTER TABLE bundle_orders ADD COLUMN paypal_order_id VARCHAR(255) DEFAULT NULL")->execute();
    } catch (Exception $e) { /* column exists */ }
    try {
      $pdo->prepare("ALTER TABLE bundle_orders ADD COLUMN paypal_capture_id VARCHAR(255) DEFAULT NULL")->execute();
    } catch (Exception $e) { /* column exists */ }

    try {
      $stmt = $pdo->prepare("UPDATE bundle_orders SET paypal_order_id = ? WHERE id = ?");
      $stmt->execute(array($orderResult['id'], $orderId));
    } catch (Exception $e) {
      error_log("BUNDLE_SAVE_PP_ORDER_WARN order={$orderId} err=" . $e->getMessage());
    }

    error_log("BUNDLE_ORDER_CREATED order={$orderId} user={$uid} bundle={$bundleId} paypal_order=" . $orderResult['id']);
    jsonOut(array('success' => true, 'url' => $orderResult['approve_url'], 'order_id' => $orderId));
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
