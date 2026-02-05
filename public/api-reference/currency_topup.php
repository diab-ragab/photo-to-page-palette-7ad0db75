<?php
/**
 * Currency Top-Up Management API
 * PHP 5.x compatible
 */

require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET', 'POST', 'DELETE', 'OPTIONS'));
require_once __DIR__ . '/db.php';
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
 
         default:
             http_response_code(400);
             echo json_encode(array('success' => false, 'message' => 'Invalid action. Use: list, admin_list, create, update, delete, toggle'));
     }
 
 } catch (PDOException $e) {
     error_log("Currency TopUp API error: " . $e->getMessage());
     http_response_code(500);
     echo json_encode(array('success' => false, 'message' => 'Database error'));
 }