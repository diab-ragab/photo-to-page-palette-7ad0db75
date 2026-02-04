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
      sort_order INT DEFAULT 0,
      INDEX idx_bundle (bundle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  ");
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
          SELECT item_name, quantity, icon FROM flash_bundle_items
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
        
        if ($itemName !== '') {
          $stmt2 = $pdo->prepare("
            INSERT INTO flash_bundle_items (bundle_id, item_name, quantity, icon, sort_order)
            VALUES (?, ?, ?, ?, ?)
          ");
          $stmt2->execute(array($bundleId, $itemName, $quantity, $icon, $idx));
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
        
        if ($itemName !== '') {
          $stmt2 = $pdo->prepare("
            INSERT INTO flash_bundle_items (bundle_id, item_name, quantity, icon, sort_order)
            VALUES (?, ?, ?, ?, ?)
          ");
          $stmt2->execute(array($id, $itemName, $quantity, $icon, $idx));
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

  default:
    jsonFail(400, 'Invalid action');
}
