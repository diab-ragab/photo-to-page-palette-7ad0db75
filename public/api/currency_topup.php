<?php
/**
 * Currency Top-Up Management API
 * PHP 5.x compatible
 */

require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET', 'POST', 'DELETE', 'OPTIONS'));
require_once __DIR__ . '/session_helper.php';

header('Content-Type: application/json; charset=utf-8');
 
 $action = isset($_GET['action']) ? $_GET['action'] : '';
 
 try {
     $pdo = getDB();
     
     // Ensure currency_topup_packages table exists
     $pdo->exec("CREATE TABLE IF NOT EXISTS currency_topup_packages (
         id INT AUTO_INCREMENT PRIMARY KEY,
         currency_type ENUM('zen', 'coins') NOT NULL DEFAULT 'zen',
         amount INT NOT NULL,
         bonus_amount INT NOT NULL DEFAULT 0,
         price DECIMAL(10,2) NOT NULL,
         is_popular TINYINT(1) DEFAULT 0,
         is_best_value TINYINT(1) DEFAULT 0,
         is_active TINYINT(1) DEFAULT 1,
         sort_order INT DEFAULT 0,
         created_at DATETIME DEFAULT NULL,
         updated_at DATETIME DEFAULT NULL,
         INDEX idx_currency (currency_type),
         INDEX idx_active (is_active),
         INDEX idx_sort (sort_order)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
 
     switch ($action) {
         case 'list':
             // Public: Get active packages
             $type = isset($_GET['type']) ? $_GET['type'] : '';
             
             $sql = "SELECT id, currency_type, amount, bonus_amount, price, is_popular, is_best_value, sort_order 
                     FROM currency_topup_packages 
                     WHERE is_active = 1";
             
             if ($type === 'zen' || $type === 'coins') {
                 $sql .= " AND currency_type = ?";
                 $stmt = $pdo->prepare($sql . " ORDER BY sort_order ASC, price ASC");
                 $stmt->execute(array($type));
             } else {
                 $stmt = $pdo->query($sql . " ORDER BY currency_type ASC, sort_order ASC, price ASC");
             }
             
             $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);
             
             // Cast numeric fields
             foreach ($packages as &$pkg) {
                 $pkg['id'] = (int)$pkg['id'];
                 $pkg['amount'] = (int)$pkg['amount'];
                 $pkg['bonus_amount'] = (int)$pkg['bonus_amount'];
                 $pkg['price'] = (float)$pkg['price'];
                 $pkg['is_popular'] = (bool)$pkg['is_popular'];
                 $pkg['is_best_value'] = (bool)$pkg['is_best_value'];
                 $pkg['sort_order'] = (int)$pkg['sort_order'];
             }
             
             echo json_encode(array('success' => true, 'packages' => $packages));
             break;
 
         case 'admin_list':
             // Admin: Get all packages
             $adminUser = requireAdmin();
             
             $stmt = $pdo->query("SELECT * FROM currency_topup_packages ORDER BY currency_type ASC, sort_order ASC, price ASC");
             $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);
             
             // Cast numeric fields
             foreach ($packages as &$pkg) {
                 $pkg['id'] = (int)$pkg['id'];
                 $pkg['amount'] = (int)$pkg['amount'];
                 $pkg['bonus_amount'] = (int)$pkg['bonus_amount'];
                 $pkg['price'] = (float)$pkg['price'];
                 $pkg['is_popular'] = (bool)$pkg['is_popular'];
                 $pkg['is_best_value'] = (bool)$pkg['is_best_value'];
                 $pkg['is_active'] = (bool)$pkg['is_active'];
                 $pkg['sort_order'] = (int)$pkg['sort_order'];
             }
             
             echo json_encode(array('success' => true, 'packages' => $packages));
             break;
 
         case 'create':
             $adminUser = requireAdmin();
             
             $input = json_decode(file_get_contents('php://input'), true);
             if (!$input) {
                 http_response_code(400);
                 echo json_encode(array('success' => false, 'message' => 'Invalid JSON input'));
                 exit;
             }
             
             $currencyType = isset($input['currency_type']) ? trim($input['currency_type']) : 'zen';
             $amount = isset($input['amount']) ? (int)$input['amount'] : 0;
             $bonusAmount = isset($input['bonus_amount']) ? (int)$input['bonus_amount'] : 0;
             $price = isset($input['price']) ? (float)$input['price'] : 0;
             $isPopular = !empty($input['is_popular']) ? 1 : 0;
             $isBestValue = !empty($input['is_best_value']) ? 1 : 0;
             $isActive = isset($input['is_active']) ? (!empty($input['is_active']) ? 1 : 0) : 1;
             $sortOrder = isset($input['sort_order']) ? (int)$input['sort_order'] : 0;
             
             // Validate
             if (!in_array($currencyType, array('zen', 'coins'))) {
                 $currencyType = 'zen';
             }
             
             if ($amount <= 0 || $price <= 0) {
                 http_response_code(400);
                 echo json_encode(array('success' => false, 'message' => 'Amount and price must be greater than 0'));
                 exit;
             }
             
             $stmt = $pdo->prepare("INSERT INTO currency_topup_packages 
                 (currency_type, amount, bonus_amount, price, is_popular, is_best_value, is_active, sort_order, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
             $stmt->execute(array($currencyType, $amount, $bonusAmount, $price, $isPopular, $isBestValue, $isActive, $sortOrder));
             
             $newId = $pdo->lastInsertId();
             echo json_encode(array('success' => true, 'message' => 'Package created', 'id' => (int)$newId));
             break;
 
         case 'update':
             $adminUser = requireAdmin();
             
             $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
             if ($id <= 0) {
                 http_response_code(400);
                 echo json_encode(array('success' => false, 'message' => 'Invalid package ID'));
                 exit;
             }
             
             $input = json_decode(file_get_contents('php://input'), true);
             if (!$input) {
                 http_response_code(400);
                 echo json_encode(array('success' => false, 'message' => 'Invalid JSON input'));
                 exit;
             }
             
             $currencyType = isset($input['currency_type']) ? trim($input['currency_type']) : 'zen';
             $amount = isset($input['amount']) ? (int)$input['amount'] : 0;
             $bonusAmount = isset($input['bonus_amount']) ? (int)$input['bonus_amount'] : 0;
             $price = isset($input['price']) ? (float)$input['price'] : 0;
             $isPopular = !empty($input['is_popular']) ? 1 : 0;
             $isBestValue = !empty($input['is_best_value']) ? 1 : 0;
             $isActive = !empty($input['is_active']) ? 1 : 0;
             $sortOrder = isset($input['sort_order']) ? (int)$input['sort_order'] : 0;
             
             if (!in_array($currencyType, array('zen', 'coins'))) {
                 $currencyType = 'zen';
             }
             
             if ($amount <= 0 || $price <= 0) {
                 http_response_code(400);
                 echo json_encode(array('success' => false, 'message' => 'Amount and price must be greater than 0'));
                 exit;
             }
             
             $stmt = $pdo->prepare("UPDATE currency_topup_packages 
                 SET currency_type = ?, amount = ?, bonus_amount = ?, price = ?, 
                     is_popular = ?, is_best_value = ?, is_active = ?, sort_order = ?, updated_at = NOW() 
                 WHERE id = ?");
             $stmt->execute(array($currencyType, $amount, $bonusAmount, $price, $isPopular, $isBestValue, $isActive, $sortOrder, $id));
             
             echo json_encode(array('success' => true, 'message' => 'Package updated'));
             break;
 
         case 'delete':
             $adminUser = requireAdmin();
             
             $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
             if ($id <= 0) {
                 http_response_code(400);
                 echo json_encode(array('success' => false, 'message' => 'Invalid package ID'));
                 exit;
             }
             
             $stmt = $pdo->prepare("DELETE FROM currency_topup_packages WHERE id = ?");
             $stmt->execute(array($id));
             
             echo json_encode(array('success' => true, 'message' => 'Package deleted'));
             break;
 
         case 'toggle':
             $adminUser = requireAdmin();
             
             $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
             if ($id <= 0) {
                 http_response_code(400);
                 echo json_encode(array('success' => false, 'message' => 'Invalid package ID'));
                 exit;
             }
             
             $input = json_decode(file_get_contents('php://input'), true);
             $isActive = !empty($input['is_active']) ? 1 : 0;
             
             $stmt = $pdo->prepare("UPDATE currency_topup_packages SET is_active = ?, updated_at = NOW() WHERE id = ?");
             $stmt->execute(array($isActive, $id));
             
             echo json_encode(array('success' => true, 'message' => 'Package status updated'));
             break;
 
         case 'purchase':
             // User: Purchase a currency package via PayPal
             require_once __DIR__ . '/paypal_helper.php';
             
             $user = getCurrentUser();
             if (!$user) {
                 http_response_code(401);
                 echo json_encode(array('success' => false, 'message' => 'Not authenticated'));
                 exit;
             }
             $userId = (int)$user['user_id'];
             
             $input = json_decode(file_get_contents('php://input'), true);
             if (!$input) {
                 http_response_code(400);
                 echo json_encode(array('success' => false, 'message' => 'Invalid JSON input'));
                 exit;
             }
             
             $packageId = isset($input['package_id']) ? (int)$input['package_id'] : 0;
             $characterId = isset($input['character_id']) ? (int)$input['character_id'] : 0;
             $characterName = isset($input['character_name']) ? trim((string)$input['character_name']) : '';
             
             if ($packageId <= 0) {
                 http_response_code(400);
                 echo json_encode(array('success' => false, 'message' => 'Package ID required'));
                 exit;
             }
             if ($characterId <= 0) {
                 http_response_code(400);
                 echo json_encode(array('success' => false, 'message' => 'Please select a character'));
                 exit;
             }
             
             // Fetch the package
             $stmt = $pdo->prepare("SELECT * FROM currency_topup_packages WHERE id = ? AND is_active = 1 LIMIT 1");
             $stmt->execute(array($packageId));
             $pkg = $stmt->fetch(PDO::FETCH_ASSOC);
             
             if (!$pkg) {
                 http_response_code(404);
                 echo json_encode(array('success' => false, 'message' => 'Package not found or inactive'));
                 exit;
             }
             
             $ppCfg = getPayPalConfig();
             if ($ppCfg['client_id'] === '' || $ppCfg['secret'] === '') {
                 http_response_code(500);
                 echo json_encode(array('success' => false, 'message' => 'Payment not configured'));
                 exit;
             }
             
             $totalAmount = (int)$pkg['amount'] + (int)$pkg['bonus_amount'];
             $currencyLabel = $pkg['currency_type'] === 'zen' ? 'Zen' : 'Coins';
             $productName = number_format($totalAmount) . ' ' . $currencyLabel . ' Top-Up';
             $priceFormatted = number_format((float)$pkg['price'], 2, '.', '');
             
             // Get PayPal access token
             $tokenResult = getPayPalAccessToken($ppCfg['client_id'], $ppCfg['secret'], $ppCfg['sandbox']);
             if ($tokenResult['error'] !== '') {
                 error_log("TOPUP_PP_TOKEN_ERR: " . $tokenResult['error']);
                 http_response_code(502);
                 echo json_encode(array('success' => false, 'message' => 'Payment provider error'));
                 exit;
             }
             
             $purchaseUnits = array(
                 array(
                     'description' => $productName,
                     'amount' => array(
                         'currency_code' => $ppCfg['currency'],
                         'value' => $priceFormatted,
                     ),
                 ),
             );
             
             $rid = substr(md5(uniqid(mt_rand(), true)), 0, 12);
             
             $metadata = array(
                 'user_id' => $userId,
                 'type' => 'topup',
                 'pkg_id' => $packageId,
                 'char_id' => $characterId,
                 'char_name' => substr($characterName, 0, 20),
                 'rid' => $rid,
             );
             
             $successUrl = 'https://woiendgame.online/payment-success?paypal=1';
             $cancelUrl = 'https://woiendgame.online/shop';
             
             $orderResult = paypalCreateOrder(
                 $tokenResult['token'],
                 $purchaseUnits,
                 $successUrl,
                 $cancelUrl,
                 $metadata,
                 $ppCfg['sandbox']
             );
             
             if ($orderResult['error'] !== '') {
                 error_log("TOPUP_PP_ORDER_ERR: " . $orderResult['error']);
                 http_response_code(502);
                 echo json_encode(array('success' => false, 'message' => 'Payment provider error'));
                 exit;
             }
             
             // Create a pending order record in webshop_orders
             try {
                 $stmt = $pdo->prepare("
                     INSERT INTO webshop_orders 
                     (user_id, product_id, quantity, character_id, character_name, total_real, status, paypal_order_id, created_at)
                     VALUES (?, ?, 1, ?, ?, ?, 'pending', ?, NOW())
                 ");
                 // Use negative product_id to indicate topup type: -1 = zen, -2 = coins
                 $topupProductId = $pkg['currency_type'] === 'zen' ? -1 : -2;
                 $stmt->execute(array($userId, $topupProductId, $characterId, $characterName, $pkg['price'], $orderResult['id']));
             } catch (Exception $e) {
                 error_log("TOPUP_ORDER_DB_ERR: " . $e->getMessage());
             }
             
             // Create topup_orders record for tracking
             $pdo->exec("CREATE TABLE IF NOT EXISTS topup_orders (
                 id INT AUTO_INCREMENT PRIMARY KEY,
                 user_id INT NOT NULL,
                 package_id INT NOT NULL,
                 currency_type VARCHAR(10) NOT NULL,
                 amount INT NOT NULL,
                 bonus_amount INT NOT NULL DEFAULT 0,
                 price DECIMAL(10,2) NOT NULL,
                 character_id INT NOT NULL DEFAULT 0,
                 character_name VARCHAR(50) DEFAULT NULL,
                 paypal_order_id VARCHAR(255) DEFAULT NULL,
                 paypal_capture_id VARCHAR(255) DEFAULT NULL,
                 status VARCHAR(20) DEFAULT 'pending',
                 created_at DATETIME NOT NULL,
                 completed_at DATETIME DEFAULT NULL,
                 INDEX idx_user (user_id),
                 INDEX idx_paypal (paypal_order_id),
                 INDEX idx_status (status)
             ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
             
             try {
                 $stmt = $pdo->prepare("INSERT INTO topup_orders (user_id, package_id, currency_type, amount, bonus_amount, price, character_id, character_name, paypal_order_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())");
                 $stmt->execute(array($userId, $packageId, $pkg['currency_type'], (int)$pkg['amount'], (int)$pkg['bonus_amount'], $pkg['price'], $characterId, $characterName, $orderResult['id']));
             } catch (Exception $e) {
                 error_log("TOPUP_ORDER_TRACK_ERR: " . $e->getMessage());
             }
             
             error_log("TOPUP_PP_CREATED user={$userId} pkg={$packageId} paypal_order={$orderResult['id']}");
             
             echo json_encode(array('success' => true, 'url' => $orderResult['approve_url'], 'paypal_order_id' => $orderResult['id']));
             break;

         default:
             http_response_code(400);
             echo json_encode(array('success' => false, 'message' => 'Invalid action. Use: list, admin_list, create, update, delete, toggle, purchase'));
     }
 
 } catch (PDOException $e) {
     error_log("Currency TopUp API error: " . $e->getMessage());
     http_response_code(500);
     echo json_encode(array('success' => false, 'message' => 'Database error'));
 }