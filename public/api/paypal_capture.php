<?php
/**
 * paypal_capture.php - Capture PayPal order after payer approval & fulfill
 * PHP 5.x compatible
 *
 * POST { paypalOrderId: string }
 * or GET ?token=PAYPAL_ORDER_ID (redirect from PayPal)
 * Returns { success: true, status: "COMPLETED", order_id: int }
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/paypal_helper.php';
handleCors(array('GET', 'POST', 'OPTIONS'));

$RID = substr(md5(uniqid(mt_rand(), true)), 0, 12);

function json_response_pc($data) {
  global $RID;
  while (ob_get_level()) { @ob_end_clean(); }
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array_merge($data, array('rid' => $RID)));
  exit;
}

function json_fail_pc($code, $msg) {
  global $RID;
  error_log("RID={$RID} PAYPAL_CAPTURE RESP={$code} MSG={$msg}");
  while (ob_get_level()) { @ob_end_clean(); }
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array('success' => false, 'message' => $msg, 'rid' => $RID));
  exit;
}

header('Content-Type: application/json; charset=utf-8');

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($method === 'OPTIONS') { http_response_code(204); exit; }

// Get PayPal order ID from POST body or GET param (PayPal sends ?token=ORDER_ID on redirect)
$paypalOrderId = '';

if ($method === 'POST') {
  $body = getJsonInput();
  $paypalOrderId = isset($body['paypalOrderId']) ? trim($body['paypalOrderId']) : '';
  if ($paypalOrderId === '' && isset($body['token'])) {
    $paypalOrderId = trim($body['token']);
  }
} else {
  // GET - PayPal redirect sends ?token=ORDER_ID
  $paypalOrderId = isset($_GET['token']) ? trim($_GET['token']) : '';
}

if ($paypalOrderId === '') {
  json_fail_pc(400, 'PayPal order ID required');
}

// Rate limiting
$pdo = getDB();

$pdo->exec("CREATE TABLE IF NOT EXISTS payment_rate_limit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  endpoint VARCHAR(50) NOT NULL,
  request_time DATETIME NOT NULL,
  KEY idx_ip_time (ip_address, endpoint, request_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8");

$clientIP = isset($_SERVER['HTTP_X_FORWARDED_FOR'])
  ? trim(current(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])))
  : (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown');

$stmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM payment_rate_limit WHERE ip_address = ? AND endpoint = 'pp_capture' AND request_time > DATE_SUB(NOW(), INTERVAL 1 MINUTE)");
$stmt->execute(array($clientIP));
$rateCheck = $stmt->fetch(PDO::FETCH_ASSOC);
if ($rateCheck && (int)$rateCheck['cnt'] >= 20) {
  json_fail_pc(429, 'Too many requests');
}
$stmt = $pdo->prepare("INSERT INTO payment_rate_limit (ip_address, endpoint, request_time) VALUES (?, 'pp_capture', NOW())");
$stmt->execute(array($clientIP));

// PayPal config
$ppCfg = getPayPalConfig();
if ($ppCfg['client_id'] === '' || $ppCfg['secret'] === '') {
  json_fail_pc(500, 'Payment not configured');
}

// Get access token
$tokenResult = getPayPalAccessToken($ppCfg['client_id'], $ppCfg['secret'], $ppCfg['sandbox']);
if ($tokenResult['error'] !== '') {
  error_log("RID={$RID} PP_CAPTURE_TOKEN_ERR: " . $tokenResult['error']);
  json_fail_pc(502, 'Payment provider error');
}

// First check order status - might already be captured
list($checkCode, $checkData, $checkErr) = paypalGetOrder($tokenResult['token'], $paypalOrderId, $ppCfg['sandbox']);

if ($checkCode < 200 || $checkCode >= 300) {
  error_log("RID={$RID} PP_ORDER_CHECK_ERR code={$checkCode} err={$checkErr}");
  json_fail_pc(400, 'Invalid PayPal order');
}

$orderStatus = isset($checkData['status']) ? $checkData['status'] : '';
error_log("RID={$RID} PP_ORDER_STATUS order={$paypalOrderId} status={$orderStatus}");

$captureId = '';

if ($orderStatus === 'COMPLETED') {
  // Already captured - extract capture ID
  if (isset($checkData['purchase_units'][0]['payments']['captures'][0]['id'])) {
    $captureId = $checkData['purchase_units'][0]['payments']['captures'][0]['id'];
  }
  error_log("RID={$RID} PP_ALREADY_CAPTURED order={$paypalOrderId} capture={$captureId}");
} elseif ($orderStatus === 'APPROVED') {
  // Capture the order
  $captureResult = paypalCaptureOrder($tokenResult['token'], $paypalOrderId, $ppCfg['sandbox']);

  if ($captureResult['error'] !== '') {
    error_log("RID={$RID} PP_CAPTURE_ERR: " . $captureResult['error']);
    json_fail_pc(502, 'Payment capture failed');
  }

  if ($captureResult['status'] !== 'COMPLETED') {
    error_log("RID={$RID} PP_CAPTURE_STATUS: " . $captureResult['status']);
    json_response_pc(array(
      'success' => false,
      'status' => $captureResult['status'],
      'message' => 'Payment not completed. Status: ' . $captureResult['status'],
    ));
  }

  $captureId = $captureResult['capture_id'];
  error_log("RID={$RID} PP_CAPTURED order={$paypalOrderId} capture={$captureId}");
} else {
  // Not approved yet
  json_response_pc(array(
    'success' => false,
    'status' => $orderStatus,
    'message' => 'Payment not approved. Status: ' . $orderStatus,
  ));
}

// Parse metadata from custom_id
$metadata = array();
if (isset($checkData['purchase_units'][0]['custom_id'])) {
  $parsed = json_decode($checkData['purchase_units'][0]['custom_id'], true);
  if (is_array($parsed)) $metadata = $parsed;
}

$userId = isset($metadata['user_id']) ? (int)$metadata['user_id'] : 0;
$purchaseType = isset($metadata['type']) ? $metadata['type'] : 'webshop';
$purchaseTier = isset($metadata['tier']) ? $metadata['tier'] : '';

// Handle Game Pass purchases
if ($purchaseType === 'gamepass' && in_array($purchaseTier, array('elite', 'gold'))) {
  handleGamePassCapture($pdo, $userId, $purchaseTier, $paypalOrderId, $captureId, $RID);
  json_response_pc(array('success' => true, 'status' => 'COMPLETED', 'message' => 'Game Pass activated!'));
}

// Handle bundle purchases
if ($purchaseType === 'bundle') {
  $bundleOrderId = isset($metadata['order_id']) ? (int)$metadata['order_id'] : 0;
  handleBundleCapture($pdo, $bundleOrderId, $paypalOrderId, $captureId, $userId, $RID);
  json_response_pc(array('success' => true, 'status' => 'COMPLETED', 'order_id' => $bundleOrderId, 'message' => 'Bundle purchased!'));
}

// Regular webshop order fulfillment
$ordersToProcess = array();
$stmt = $pdo->prepare("SELECT id FROM webshop_orders WHERE paypal_order_id = ? AND status = 'pending'");
$stmt->execute(array($paypalOrderId));
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
  $ordersToProcess[] = (int)$row['id'];
}

$lastOrderId = 0;

if (count($ordersToProcess) > 0) {
  require_once __DIR__ . '/mail_delivery.php';

  foreach ($ordersToProcess as $oid) {
    $stmt = $pdo->prepare("SELECT id, status, user_id, product_id, quantity, character_id, character_name FROM webshop_orders WHERE id = ? LIMIT 1");
    $stmt->execute(array($oid));
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$order) continue;
    if ($order['status'] === 'completed') continue;

    // Mark completed
    try {
      $stmt = $pdo->prepare("UPDATE webshop_orders SET status = 'completed', paypal_capture_id = ?, delivered_at = NOW(), updated_at = NOW() WHERE id = ?");
      $stmt->execute(array($captureId, $oid));
    } catch (Exception $e) {
      $stmt = $pdo->prepare("UPDATE webshop_orders SET status = 'completed', paypal_capture_id = ?, delivered_at = NOW() WHERE id = ?");
      $stmt->execute(array($captureId, $oid));
    }

    if ($userId <= 0 && isset($order['user_id'])) $userId = (int)$order['user_id'];
    $characterId = isset($order['character_id']) ? (int)$order['character_id'] : 0;
    $characterName = isset($order['character_name']) ? $order['character_name'] : '';
    $productId = isset($order['product_id']) ? (int)$order['product_id'] : 0;
    $quantity = isset($order['quantity']) ? (int)$order['quantity'] : 1;

    if ($productId > 0 && $characterId > 0) {
      fulfillOrderPP($pdo, $userId, $productId, $quantity, $oid, $characterId, $characterName, $RID);
    }

    $lastOrderId = $oid;
    error_log("RID={$RID} PP_ORDER_COMPLETED order={$oid} user={$userId} product={$productId}");
  }
} else {
  error_log("RID={$RID} PP_NO_ORDERS_FOUND paypal_order={$paypalOrderId}");
}

json_response_pc(array(
  'success' => true,
  'status' => 'COMPLETED',
  'message' => 'Payment confirmed and order fulfilled',
  'order_id' => $lastOrderId,
));

// ============ HANDLERS ============

function handleGamePassCapture($pdo, $userId, $tier, $paypalOrderId, $captureId, $RID) {
  if ($userId <= 0) {
    error_log("RID={$RID} GAMEPASS_PP_NO_USER order={$paypalOrderId}");
    return;
  }

  try { $pdo->exec("ALTER TABLE user_gamepass ADD COLUMN tier VARCHAR(10) DEFAULT 'free'"); } catch (Exception $e) {}
  try { $pdo->exec("ALTER TABLE user_gamepass ADD COLUMN paypal_order_id VARCHAR(255) DEFAULT NULL"); } catch (Exception $e) {}

  $stmt = $pdo->prepare("SELECT id FROM user_gamepass WHERE user_id = ?");
  $stmt->execute(array($userId));
  $existing = $stmt->fetch(PDO::FETCH_ASSOC);

  $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));

  if ($existing) {
    $stmt = $pdo->prepare("UPDATE user_gamepass SET is_premium = 1, tier = ?, expires_at = ?, paypal_order_id = ? WHERE user_id = ?");
    $stmt->execute(array($tier, $expiresAt, $paypalOrderId, $userId));
  } else {
    $stmt = $pdo->prepare("INSERT INTO user_gamepass (user_id, is_premium, tier, expires_at, paypal_order_id, created_at) VALUES (?, 1, ?, ?, ?, NOW())");
    $stmt->execute(array($userId, $tier, $expiresAt, $paypalOrderId));
  }

  try {
    $stmt = $pdo->prepare("UPDATE gamepass_purchases SET status = 'completed', completed_at = NOW() WHERE paypal_order_id = ?");
    $stmt->execute(array($paypalOrderId));
  } catch (Exception $e) {
    error_log("RID={$RID} GAMEPASS_PURCHASE_LOG_ERR: " . $e->getMessage());
  }

  error_log("RID={$RID} GAMEPASS_PP_ACTIVATED user={$userId} tier={$tier} expires={$expiresAt}");
}

function handleBundleCapture($pdo, $bundleOrderId, $paypalOrderId, $captureId, $userId, $RID) {
  if ($bundleOrderId <= 0) return;

  try {
    $stmt = $pdo->prepare("UPDATE bundle_orders SET status = 'completed', paypal_capture_id = ? WHERE id = ? AND status = 'pending'");
    $stmt->execute(array($captureId, $bundleOrderId));

    if ($stmt->rowCount() > 0) {
      // Fulfill bundle (same as stripe_webhook bundle handling)
      require_once __DIR__ . '/mail_delivery.php';
      
      $stmt = $pdo->prepare("SELECT * FROM bundle_orders WHERE id = ?");
      $stmt->execute(array($bundleOrderId));
      $order = $stmt->fetch(PDO::FETCH_ASSOC);
      
      if ($order) {
        $bundleId = (int)$order['bundle_id'];
        $characterId = (int)$order['character_id'];
        $characterName = isset($order['character_name']) ? $order['character_name'] : '';
        $orderUserId = (int)$order['user_id'];
        
        // Get bundle items
        $stmt = $pdo->prepare("SELECT * FROM flash_bundle_items WHERE bundle_id = ?");
        $stmt->execute(array($bundleId));
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if ($characterId > 0 && count($items) > 0) {
          $mailer = new GameMailer($pdo);
          foreach ($items as $item) {
            $itemId = isset($item['item_id']) ? (int)$item['item_id'] : 0;
            $itemQty = isset($item['item_quantity']) ? (int)$item['item_quantity'] : 1;
            $itemName = isset($item['item_name']) ? $item['item_name'] : 'Bundle Item';
            
            if ($itemId > 0) {
              $mailer->sendOrderReward($characterId, $itemName, $itemId, $itemQty, 0, 0, 0);
            } elseif ($itemId == -1) {
              $mailer->sendOrderReward($characterId, $itemName, 0, 0, 0, $itemQty, 0);
            } elseif ($itemId == -2) {
              $mailer->sendOrderReward($characterId, $itemName, 0, 0, $itemQty, 0, 0);
            }
          }
        }
      }

      error_log("RID={$RID} BUNDLE_PP_COMPLETED order={$bundleOrderId}");
    }
  } catch (Exception $e) {
    error_log("RID={$RID} BUNDLE_PP_ERR: " . $e->getMessage());
  }
}

function fulfillOrderPP($pdo, $userId, $productId, $quantity, $orderId, $characterId, $characterName, $RID) {
  $stmt = $pdo->prepare("SELECT * FROM webshop_products WHERE id = ? LIMIT 1");
  $stmt->execute(array($productId));
  $product = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$product) {
    error_log("RID={$RID} PP_FULFILL_ERR product_not_found id={$productId}");
    return false;
  }

  $productName = isset($product['name']) ? $product['name'] : 'Shop Item';
  $itemId = isset($product['item_id']) ? (int)$product['item_id'] : 0;
  $itemQuantity = isset($product['item_quantity']) ? (int)$product['item_quantity'] : 1;
  $totalGrant = $itemQuantity * $quantity;

  $roleId = $characterId;
  if ($roleId <= 0) return false;

  $mailer = new GameMailer($pdo);

  $coins = 0;
  $zen = 0;
  $exp = 0;
  $mailItemId = 0;
  $mailQty = 0;

  if ($itemId > 0) {
    $mailItemId = $itemId;
    $mailQty = $totalGrant;
  } else if ($itemId == -1) {
    $zen = $totalGrant;
  } else if ($itemId == -2) {
    $coins = $totalGrant;
  } else if ($itemId == -3) {
    $exp = $totalGrant;
  } else {
    return true;
  }

  $result = $mailer->sendOrderReward($roleId, $productName, $mailItemId, $mailQty, $coins, $zen, $exp);

  if ($result['success']) {
    error_log("RID={$RID} PP_MAIL_SENT user={$userId} role={$roleId} product={$productName}");
  } else {
    error_log("RID={$RID} PP_MAIL_FAILED user={$userId} role={$roleId} error={$result['message']}");
  }

  return $result['success'];
}
