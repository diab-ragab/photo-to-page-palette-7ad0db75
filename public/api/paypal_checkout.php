<?php
/**
 * paypal_checkout.php - Create PayPal Order for Webshop checkout
 * PHP 5.x compatible (no closures, no short arrays)
 *
 * POST { items: [{id,name,price,quantity}], character_id: int, character_name: string }
 * Returns { success: true, url: "https://www.paypal.com/checkoutnow?token=..." }
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

define('VERSION_PP', '2026-02-13-A');

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/paypal_helper.php';
handleCors(array('POST', 'OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$rid = substr(md5(uniqid(mt_rand(), true)), 0, 12);

function jsonOutPP($data) {
  if (ob_get_length()) { ob_clean(); }
  echo json_encode($data);
  exit;
}

function failPP($code, $msg) {
  global $rid;
  http_response_code($code);
  jsonOutPP(array('success' => false, 'message' => $msg, 'rid' => $rid));
}

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'POST') failPP(405, 'Method not allowed');

// Auth
$user = getCurrentUser();
if (!$user) failPP(401, 'Not authenticated');
$userId = (int)$user['user_id'];

// Parse input
$payload = getJsonInput();
$items = isset($payload['items']) && is_array($payload['items']) ? $payload['items'] : array();
if (count($items) < 1) failPP(400, 'Cart items required');

$characterId = isset($payload['character_id']) ? (int)$payload['character_id'] : 0;
$characterName = isset($payload['character_name']) ? trim((string)$payload['character_name']) : '';
$isGift = isset($payload['is_gift']) ? (bool)$payload['is_gift'] : false;
$giftCharacterName = isset($payload['gift_character_name']) ? trim((string)$payload['gift_character_name']) : '';

if ($isGift) {
  // Gift mode: look up recipient character by name
  if ($giftCharacterName === '') failPP(400, 'Please enter the recipient character name');
  if (strlen($giftCharacterName) > 50) failPP(400, 'Character name too long');

  try {
    $lookupDb = getDB();
    $stmt = $lookupDb->prepare("SELECT RoleID, Name FROM basetab_sg WHERE Name = ? AND IsDel = 0 LIMIT 1");
    $stmt->execute(array($giftCharacterName));
    $recipient = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$recipient) {
      failPP(400, 'Character "' . $giftCharacterName . '" not found. Please check the name.');
    }

    $characterId = (int)$recipient['RoleID'];
    $characterName = $recipient['Name'];
  } catch (Exception $e) {
    error_log("RID={$rid} GIFT_LOOKUP_ERR: " . $e->getMessage());
    failPP(500, 'Failed to look up character');
  }
} else {
  if ($characterId <= 0) failPP(400, 'Please select a character to receive the items');
}

// PayPal config
$ppCfg = getPayPalConfig();
if ($ppCfg['client_id'] === '' || $ppCfg['secret'] === '') {
  failPP(500, 'Payment not configured');
}

$currency = $ppCfg['currency'];
$successUrl = $ppCfg['success_url'];
$cancelUrl = $ppCfg['cancel_url'];
if ($successUrl === '' || $cancelUrl === '') failPP(500, 'Payment not configured (missing redirect URLs)');

// Build line items and calculate total
$ppItems = array();
$totalAmount = 0;
$safeItems = array();

foreach ($items as $it) {
  if (!is_array($it)) continue;
  $id = isset($it['id']) ? trim((string)$it['id']) : '';
  $name = isset($it['name']) ? trim((string)$it['name']) : '';
  $price = isset($it['price']) ? (float)$it['price'] : 0.0;
  $qty = isset($it['quantity']) ? (int)$it['quantity'] : 1;

  if ($id === '' || $name === '') continue;
  if ($qty < 1) $qty = 1;
  if ($qty > 99) $qty = 99;
  if ($price <= 0) continue;
  if ($price < 0.50) continue;

  $unitPrice = number_format($price, 2, '.', '');
  $lineTotal = number_format($price * $qty, 2, '.', '');
  $totalAmount += $price * $qty;

  $safeItems[] = array('id' => $id, 'name' => $name, 'price' => $price, 'quantity' => $qty);

  $ppItems[] = array(
    'name' => substr($name, 0, 127),
    'quantity' => (string)$qty,
    'unit_amount' => array(
      'currency_code' => $currency,
      'value' => $unitPrice,
    ),
  );
}

if (count($ppItems) < 1) failPP(400, 'No valid items');

$totalFormatted = number_format($totalAmount, 2, '.', '');

// Purchase units
$purchaseUnits = array(
  array(
    'description' => 'WOI Endgame Shop',
    'amount' => array(
      'currency_code' => $currency,
      'value' => $totalFormatted,
      'breakdown' => array(
        'item_total' => array(
          'currency_code' => $currency,
          'value' => $totalFormatted,
        ),
      ),
    ),
    'items' => $ppItems,
  ),
);

$metadata = array(
  'user_id' => $userId,
  'rid' => $rid,
  'type' => 'webshop',
);

// Get access token
$tokenResult = getPayPalAccessToken($ppCfg['client_id'], $ppCfg['secret'], $ppCfg['sandbox']);
if ($tokenResult['error'] !== '') {
  error_log("RID={$rid} PAYPAL_TOKEN_ERR: " . $tokenResult['error']);
  failPP(502, 'Payment provider error');
}

// Append paypal order token to success URL
$returnUrl = $successUrl . '?paypal=1';
$cancelReturnUrl = $cancelUrl;

// Create PayPal order
$orderResult = paypalCreateOrder(
  $tokenResult['token'],
  $purchaseUnits,
  $returnUrl,
  $cancelReturnUrl,
  $metadata,
  $ppCfg['sandbox']
);

if ($orderResult['error'] !== '') {
  error_log("RID={$rid} PAYPAL_ORDER_ERR: " . $orderResult['error']);
  failPP(502, 'Payment provider error');
}

$paypalOrderId = $orderResult['id'];
$approveUrl = $orderResult['approve_url'];

// Create order records in webshop_orders
try {
  $pdo = getDB();

  $pdo->exec("CREATE TABLE IF NOT EXISTS webshop_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    character_id INT NOT NULL DEFAULT 0,
    character_name VARCHAR(50) DEFAULT NULL,
    total_coins INT NOT NULL DEFAULT 0,
    total_vip INT NOT NULL DEFAULT 0,
    total_zen INT NOT NULL DEFAULT 0,
    total_real DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    paypal_order_id VARCHAR(255) DEFAULT NULL,
    paypal_capture_id VARCHAR(255) DEFAULT NULL,
    delivered_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_paypal_order (paypal_order_id),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

  // Migration columns
  try { $pdo->exec("ALTER TABLE webshop_orders ADD COLUMN paypal_order_id VARCHAR(255) DEFAULT NULL"); } catch (Exception $e) {}
  try { $pdo->exec("ALTER TABLE webshop_orders ADD COLUMN paypal_capture_id VARCHAR(255) DEFAULT NULL"); } catch (Exception $e) {}
  try { $pdo->exec("ALTER TABLE webshop_orders ADD COLUMN character_id INT NOT NULL DEFAULT 0 AFTER quantity"); } catch (Exception $e) {}
  try { $pdo->exec("ALTER TABLE webshop_orders ADD COLUMN character_name VARCHAR(50) DEFAULT NULL AFTER character_id"); } catch (Exception $e) {}

  $ordersCreated = 0;
  foreach ($safeItems as $item) {
    $productId = isset($item['id']) ? (int)$item['id'] : 0;
    $qty = isset($item['quantity']) ? (int)$item['quantity'] : 1;
    $price = isset($item['price']) ? (float)$item['price'] : 0;
    $totalReal = $price * $qty;

    $ins = $pdo->prepare("
      INSERT INTO webshop_orders 
      (user_id, product_id, quantity, character_id, character_name, total_real, status, paypal_order_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW())
    ");
    $ins->execute(array($userId, $productId, $qty, $characterId, $characterName, $totalReal, $paypalOrderId));
    $ordersCreated++;
  }

  error_log("RID={$rid} PP_CHECKOUT_COMPLETE paypal_order={$paypalOrderId} user={$userId} orders={$ordersCreated}");
} catch (Exception $e) {
  error_log("RID={$rid} PP_ORDER_DB_ERR: " . $e->getMessage());
}

jsonOutPP(array('success' => true, 'url' => $approveUrl, 'paypal_order_id' => $paypalOrderId));
