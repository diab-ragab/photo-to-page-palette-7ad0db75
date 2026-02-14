<?php
/**
 * paypal_capture.php - Capture PayPal order after payer approval & fulfill
 * PHP 5.x compatible (no closures, no short arrays, no ??)
 *
 * POST { paypalOrderId: string }
 * Returns { success: true, status: "COMPLETED", order_id: int, processed_count: int, rid: string }
 *
 * Security hardening:
 *  - EUR-only currency verification
 *  - Amount match (integer cents comparison)
 *  - Merchant ID verification
 *  - Idempotent: duplicate confirms do NOT duplicate delivery
 *  - Status workflow: pending -> processing -> completed
 *  - Rate limiting per IP
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';
require_once __DIR__ . '/paypal_helper.php';
require_once __DIR__ . '/gamepass_helpers.php';
handleCors(array('POST', 'OPTIONS'));

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
if ($method !== 'POST') json_fail_pc(405, 'Method not allowed');

// ── Auth: require logged-in user ──
$user = getCurrentUser();
if (!$user) json_fail_pc(401, 'Not authenticated');
$authedUserId = (int)$user['user_id'];

// ── Parse input ──
$body = getJsonInput();
$paypalOrderId = isset($body['paypalOrderId']) ? trim($body['paypalOrderId']) : '';
if ($paypalOrderId === '' && isset($body['token'])) {
  $paypalOrderId = trim($body['token']);
}
if ($paypalOrderId === '') json_fail_pc(400, 'PayPal order ID required');
if (strlen($paypalOrderId) > 64) json_fail_pc(400, 'Invalid order ID');

// ── Rate limiting ──
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

// ── Idempotency: check if already completed ──
$alreadyDone = false;

// Check webshop_orders
$stmt = $pdo->prepare("SELECT id FROM webshop_orders WHERE paypal_order_id = ? AND status = 'completed' LIMIT 1");
$stmt->execute(array($paypalOrderId));
if ($stmt->fetch(PDO::FETCH_ASSOC)) {
  $alreadyDone = true;
}

// Check bundle_orders
if (!$alreadyDone) {
  try {
    $stmt = $pdo->prepare("SELECT id FROM bundle_orders WHERE paypal_order_id = ? AND status = 'completed' LIMIT 1");
    $stmt->execute(array($paypalOrderId));
    if ($stmt->fetch(PDO::FETCH_ASSOC)) {
      $alreadyDone = true;
    }
  } catch (Exception $e) { /* table may not exist */ }
}

// Check gamepass_purchases
if (!$alreadyDone) {
  try {
    $stmt = $pdo->prepare("SELECT id FROM gamepass_purchases WHERE paypal_order_id = ? AND status = 'completed' LIMIT 1");
    $stmt->execute(array($paypalOrderId));
    if ($stmt->fetch(PDO::FETCH_ASSOC)) {
      $alreadyDone = true;
    }
  } catch (Exception $e) { /* table may not exist */ }
}

// Check gamepass_extensions
if (!$alreadyDone) {
  try {
    $stmt = $pdo->prepare("SELECT id FROM gamepass_extensions WHERE paypal_order_id = ? AND status = 'completed' LIMIT 1");
    $stmt->execute(array($paypalOrderId));
    if ($stmt->fetch(PDO::FETCH_ASSOC)) {
      $alreadyDone = true;
    }
  } catch (Exception $e) { /* table may not exist */ }
}

if ($alreadyDone) {
  error_log("RID={$RID} IDEMPOTENT_SKIP already_completed order={$paypalOrderId}");
  json_response_pc(array('success' => true, 'status' => 'COMPLETED', 'message' => 'Already fulfilled', 'order_id' => 0, 'processed_count' => 0));
}

// ── Verify order belongs to authed user (check local DB) ──
$ownerOk = false;
$stmt = $pdo->prepare("SELECT user_id FROM webshop_orders WHERE paypal_order_id = ? LIMIT 1");
$stmt->execute(array($paypalOrderId));
$ownerRow = $stmt->fetch(PDO::FETCH_ASSOC);
if ($ownerRow) {
  if ((int)$ownerRow['user_id'] !== $authedUserId) {
    error_log("RID={$RID} AUTH_MISMATCH order_user=" . $ownerRow['user_id'] . " authed={$authedUserId}");
    json_fail_pc(403, 'Order does not belong to you');
  }
  $ownerOk = true;
}

// Also check bundle_orders
if (!$ownerOk) {
  try {
    $stmt = $pdo->prepare("SELECT user_id FROM bundle_orders WHERE paypal_order_id = ? LIMIT 1");
    $stmt->execute(array($paypalOrderId));
    $bOwner = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($bOwner) {
      if ((int)$bOwner['user_id'] !== $authedUserId) {
        json_fail_pc(403, 'Order does not belong to you');
      }
      $ownerOk = true;
    }
  } catch (Exception $e) { /* table may not exist */ }
}

// Also check gamepass_purchases
if (!$ownerOk) {
  try {
    $stmt = $pdo->prepare("SELECT user_id FROM gamepass_purchases WHERE paypal_order_id = ? LIMIT 1");
    $stmt->execute(array($paypalOrderId));
    $gpOwner = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($gpOwner) {
      if ((int)$gpOwner['user_id'] !== $authedUserId) {
        json_fail_pc(403, 'Order does not belong to you');
      }
      $ownerOk = true;
    }
  } catch (Exception $e) { /* table may not exist */ }
}

// Also check gamepass_extensions
if (!$ownerOk) {
  try {
    $stmt = $pdo->prepare("SELECT user_id FROM gamepass_extensions WHERE paypal_order_id = ? LIMIT 1");
    $stmt->execute(array($paypalOrderId));
    $extOwner = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($extOwner) {
      if ((int)$extOwner['user_id'] !== $authedUserId) {
        json_fail_pc(403, 'Order does not belong to you');
      }
      $ownerOk = true;
    }
  } catch (Exception $e) { /* table may not exist */ }
}

// ── PayPal config ──
$ppCfg = getPayPalConfig();
if ($ppCfg['client_id'] === '' || $ppCfg['secret'] === '') {
  json_fail_pc(500, 'Payment not configured');
}
$expectedCurrency = strtoupper($ppCfg['currency']);
$expectedMerchantId = isset($ppCfg['merchant_id']) ? $ppCfg['merchant_id'] : '';

// ── Get access token ──
$tokenResult = getPayPalAccessToken($ppCfg['client_id'], $ppCfg['secret'], $ppCfg['sandbox']);
if ($tokenResult['error'] !== '') {
  error_log("RID={$RID} PP_CAPTURE_TOKEN_ERR: " . $tokenResult['error']);
  json_fail_pc(502, 'Payment provider error');
}

// ── Get order details from PayPal ──
list($checkCode, $checkData, $checkErr) = paypalGetOrder($tokenResult['token'], $paypalOrderId, $ppCfg['sandbox']);

if ($checkCode < 200 || $checkCode >= 300) {
  error_log("RID={$RID} PP_ORDER_CHECK_ERR code={$checkCode} err={$checkErr}");
  json_fail_pc(400, 'Invalid PayPal order');
}

$orderStatus = isset($checkData['status']) ? $checkData['status'] : '';
error_log("RID={$RID} PP_ORDER_STATUS order={$paypalOrderId} status={$orderStatus}");

// ── Capture if APPROVED ──
$captureId = '';

if ($orderStatus === 'COMPLETED') {
  // Already captured - extract capture ID
  if (isset($checkData['purchase_units'][0]['payments']['captures'][0]['id'])) {
    $captureId = $checkData['purchase_units'][0]['payments']['captures'][0]['id'];
  }
  error_log("RID={$RID} PP_ALREADY_CAPTURED order={$paypalOrderId} capture={$captureId}");

  // Re-fetch order data so verification below uses captured data
  list($checkCode, $checkData, $checkErr) = paypalGetOrder($tokenResult['token'], $paypalOrderId, $ppCfg['sandbox']);

} elseif ($orderStatus === 'APPROVED') {
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
  $checkData = $captureResult['data'];
  error_log("RID={$RID} PP_CAPTURED order={$paypalOrderId} capture={$captureId}");
} else {
  json_response_pc(array(
    'success' => false,
    'status' => $orderStatus,
    'message' => 'Payment not approved. Status: ' . $orderStatus,
  ));
}

// ══════════════════════════════════════════════
// SECURITY VERIFICATION (post-capture)
// ══════════════════════════════════════════════

$pu = isset($checkData['purchase_units'][0]) ? $checkData['purchase_units'][0] : array();

// 1) Verify capture status is COMPLETED
$captureData = array();
if (isset($pu['payments']['captures'][0])) {
  $captureData = $pu['payments']['captures'][0];
}
$captureStatus = isset($captureData['status']) ? $captureData['status'] : '';
if ($captureStatus !== 'COMPLETED') {
  error_log("RID={$RID} CAPTURE_STATUS_REJECT status={$captureStatus}");
  json_fail_pc(400, 'Capture not completed');
}

// 2) Verify currency is EUR
$paidCurrency = '';
$paidValue = '';
if (isset($captureData['amount']['currency_code'])) {
  $paidCurrency = strtoupper($captureData['amount']['currency_code']);
}
if (isset($captureData['amount']['value'])) {
  $paidValue = $captureData['amount']['value'];
}

if ($paidCurrency !== $expectedCurrency) {
  error_log("RID={$RID} CURRENCY_REJECT paid={$paidCurrency} expected={$expectedCurrency}");
  json_fail_pc(400, 'Currency mismatch: expected ' . $expectedCurrency . ', got ' . $paidCurrency);
}

// 3) Convert to integer cents for safe comparison
$paidCents = (int)round(floatval($paidValue) * 100);

// 4) Verify merchant / payee
if ($expectedMerchantId !== '') {
  $payeeMerchant = '';
  if (isset($pu['payee']['merchant_id'])) {
    $payeeMerchant = $pu['payee']['merchant_id'];
  }
  if ($payeeMerchant !== $expectedMerchantId) {
    error_log("RID={$RID} MERCHANT_REJECT payee={$payeeMerchant} expected={$expectedMerchantId}");
    json_fail_pc(400, 'Merchant mismatch');
  }
}

// 5) Verify amount matches local order total
$localTotalCents = 0;

// Sum from webshop_orders
$stmt = $pdo->prepare("SELECT SUM(total_real) as total FROM webshop_orders WHERE paypal_order_id = ?");
$stmt->execute(array($paypalOrderId));
$sumRow = $stmt->fetch(PDO::FETCH_ASSOC);
if ($sumRow && $sumRow['total'] !== null) {
  $localTotalCents = (int)round(floatval($sumRow['total']) * 100);
}

// If no webshop orders, check bundle_orders
if ($localTotalCents <= 0) {
  try {
    $stmt = $pdo->prepare("SELECT price_eur FROM bundle_orders WHERE paypal_order_id = ? LIMIT 1");
    $stmt->execute(array($paypalOrderId));
    $bRow = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($bRow && isset($bRow['price_eur'])) {
      $localTotalCents = (int)round(floatval($bRow['price_eur']) * 100);
    }
  } catch (Exception $e) { /* table may not exist */ }
}

// If no local orders found, check topup_orders
if ($localTotalCents <= 0) {
  try {
    $stmt = $pdo->prepare("SELECT price_eur FROM topup_orders WHERE paypal_order_id = ? LIMIT 1");
    $stmt->execute(array($paypalOrderId));
    $tRow = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($tRow && isset($tRow['price_eur'])) {
      $localTotalCents = (int)round(floatval($tRow['price_eur']) * 100);
    }
  } catch (Exception $e) { /* table may not exist */ }
}

// If no local orders found, check gamepass_purchases
if ($localTotalCents <= 0) {
  try {
    $stmt = $pdo->prepare("SELECT price_eur FROM gamepass_purchases WHERE paypal_order_id = ? LIMIT 1");
    $stmt->execute(array($paypalOrderId));
    $gpRow = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($gpRow && isset($gpRow['price_eur'])) {
      $localTotalCents = (int)round(floatval($gpRow['price_eur']) * 100);
    }
  } catch (Exception $e) { /* table may not exist */ }
}

// If no local orders found, check gamepass_extensions
if ($localTotalCents <= 0) {
  try {
    $stmt = $pdo->prepare("SELECT price_eur FROM gamepass_extensions WHERE paypal_order_id = ? LIMIT 1");
    $stmt->execute(array($paypalOrderId));
    $extRow = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($extRow && isset($extRow['price_eur'])) {
      $localTotalCents = (int)round(floatval($extRow['price_eur']) * 100);
    }
  } catch (Exception $e) { /* table may not exist */ }
}

// Only enforce amount check if we have a local record
if ($localTotalCents > 0 && $paidCents !== $localTotalCents) {
  error_log("RID={$RID} AMOUNT_REJECT paid_cents={$paidCents} local_cents={$localTotalCents}");
  json_fail_pc(400, 'Amount mismatch');
}

error_log("RID={$RID} VERIFICATION_PASSED currency={$paidCurrency} paid_cents={$paidCents} local_cents={$localTotalCents}");

// ══════════════════════════════════════════════
// FULFILLMENT
// ══════════════════════════════════════════════

// Parse metadata from custom_id
$metadata = array();
if (isset($pu['custom_id'])) {
  $parsed = json_decode($pu['custom_id'], true);
  if (is_array($parsed)) $metadata = $parsed;
}

// If custom_id metadata is missing or incomplete, re-fetch order details
if (empty($metadata) || !isset($metadata['type'])) {
  error_log("RID={$RID} METADATA_MISSING_FROM_CAPTURE, re-fetching order details");
  list($refetchCode, $refetchData, $refetchErr) = paypalGetOrder($tokenResult['token'], $paypalOrderId, $ppCfg['sandbox']);
  if ($refetchCode >= 200 && $refetchCode < 300 && isset($refetchData['purchase_units'][0]['custom_id'])) {
    $parsed2 = json_decode($refetchData['purchase_units'][0]['custom_id'], true);
    if (is_array($parsed2)) $metadata = $parsed2;
    error_log("RID={$RID} METADATA_REFETCHED type=" . (isset($metadata['type']) ? $metadata['type'] : 'none'));
  }
}

// Fallback: check gamepass_purchases table by paypal_order_id
if (!isset($metadata['type']) || $metadata['type'] === 'webshop') {
  try {
    $gpStmt = $pdo->prepare("SELECT user_id, tier FROM gamepass_purchases WHERE paypal_order_id = ? AND status = 'pending' LIMIT 1");
    $gpStmt->execute(array($paypalOrderId));
    $gpRow = $gpStmt->fetch(PDO::FETCH_ASSOC);
    if ($gpRow) {
      $metadata['type'] = 'gamepass';
      $metadata['tier'] = $gpRow['tier'];
      $metadata['user_id'] = (int)$gpRow['user_id'];
      error_log("RID={$RID} GAMEPASS_DETECTED_FROM_DB tier={$gpRow['tier']} user={$gpRow['user_id']}");
    }
  } catch (Exception $e) {
    error_log("RID={$RID} GAMEPASS_FALLBACK_CHECK_ERR: " . $e->getMessage());
  }
}

// Fallback: check gamepass_extensions table
if (!isset($metadata['type']) || $metadata['type'] === 'webshop') {
  try {
    $extStmt = $pdo->prepare("SELECT id, user_id, tier, days_added FROM gamepass_extensions WHERE paypal_order_id = ? AND status = 'pending' LIMIT 1");
    $extStmt->execute(array($paypalOrderId));
    $extRow = $extStmt->fetch(PDO::FETCH_ASSOC);
    if ($extRow) {
      $metadata['type'] = 'gamepass_extend';
      $metadata['tier'] = $extRow['tier'];
      $metadata['days'] = (int)$extRow['days_added'];
      $metadata['extension_id'] = (int)$extRow['id'];
      $metadata['user_id'] = (int)$extRow['user_id'];
      error_log("RID={$RID} EXTEND_DETECTED_FROM_DB tier={$extRow['tier']} days={$extRow['days_added']} user={$extRow['user_id']}");
    }
  } catch (Exception $e) {
    error_log("RID={$RID} EXTEND_FALLBACK_CHECK_ERR: " . $e->getMessage());
  }
}

$userId = isset($metadata['user_id']) ? (int)$metadata['user_id'] : $authedUserId;
$purchaseType = isset($metadata['type']) ? $metadata['type'] : 'webshop';
$purchaseTier = isset($metadata['tier']) ? $metadata['tier'] : '';

// Verify metadata user matches authed user
if ($userId !== $authedUserId) {
  error_log("RID={$RID} META_USER_MISMATCH meta={$userId} authed={$authedUserId}");
  // Use authed user as authoritative
  $userId = $authedUserId;
}

// Handle Game Pass purchases (uses shared activatePaidGamePass for idempotency + mail)
if ($purchaseType === 'gamepass' && in_array($purchaseTier, array('elite', 'gold'))) {
  activatePaidGamePass($pdo, $userId, $purchaseTier, $paypalOrderId, $captureId, $RID);
  json_response_pc(array('success' => true, 'status' => 'COMPLETED', 'message' => 'Game Pass activated!', 'order_id' => 0, 'processed_count' => 1));
}

// Handle Game Pass extension purchases
if ($purchaseType === 'gamepass_extend') {
  $extDays = isset($metadata['days']) ? (int)$metadata['days'] : 0;
  $extId = isset($metadata['extension_id']) ? (int)$metadata['extension_id'] : 0;
  $extTier = isset($metadata['tier']) ? $metadata['tier'] : 'elite';
  
  if ($extDays > 0 && $extId > 0) {
    ensureExtensionTable($pdo);
    $extResult = extendGamePass($pdo, $userId, $extTier, $extDays, $paypalOrderId, $captureId, $extId, $RID);
    json_response_pc(array(
      'success' => true, 
      'status' => 'COMPLETED', 
      'message' => 'Game Pass extended by ' . $extDays . ' days!', 
      'new_until' => isset($extResult['new_until']) ? $extResult['new_until'] : null,
      'days_added' => $extDays,
      'order_id' => 0, 
      'processed_count' => 1
    ));
  } else {
    error_log("RID={$RID} EXTEND_MISSING_DATA days={$extDays} extId={$extId}");
    json_fail_pc(400, 'Extension data incomplete');
  }
}

// Handle bundle purchases
if ($purchaseType === 'bundle') {
  $bundleOrderId = isset($metadata['order_id']) ? (int)$metadata['order_id'] : 0;
  handleBundleCapture($pdo, $bundleOrderId, $paypalOrderId, $captureId, $userId, $RID);
  json_response_pc(array('success' => true, 'status' => 'COMPLETED', 'order_id' => $bundleOrderId, 'processed_count' => 1, 'message' => 'Bundle purchased!'));
}

// Handle currency top-up purchases
if ($purchaseType === 'topup') {
  $pkgId = isset($metadata['pkg_id']) ? (int)$metadata['pkg_id'] : 0;
  $charId = isset($metadata['char_id']) ? (int)$metadata['char_id'] : 0;
  $charName = isset($metadata['char_name']) ? $metadata['char_name'] : '';
  handleTopUpCapture($pdo, $userId, $pkgId, $charId, $charName, $paypalOrderId, $captureId, $RID);
  json_response_pc(array('success' => true, 'status' => 'COMPLETED', 'message' => 'Currency delivered!', 'order_id' => 0, 'processed_count' => 1));
}

// ── Regular webshop order fulfillment ──

// Set to processing first (idempotent: only pending orders transition)
$stmt = $pdo->prepare("UPDATE webshop_orders SET status = 'processing' WHERE paypal_order_id = ? AND status = 'pending'");
$stmt->execute(array($paypalOrderId));
$processingCount = $stmt->rowCount();

$ordersToProcess = array();
$stmt = $pdo->prepare("SELECT id FROM webshop_orders WHERE paypal_order_id = ? AND status = 'processing'");
$stmt->execute(array($paypalOrderId));
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
  $ordersToProcess[] = (int)$row['id'];
}

$lastOrderId = 0;
$processedCount = 0;

if (count($ordersToProcess) > 0) {
  require_once __DIR__ . '/mail_delivery.php';

  foreach ($ordersToProcess as $oid) {
    $stmt = $pdo->prepare("SELECT id, status, user_id, product_id, quantity, character_id, character_name FROM webshop_orders WHERE id = ? LIMIT 1");
    $stmt->execute(array($oid));
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$order) continue;
    if ($order['status'] === 'completed') continue;

    $characterId = isset($order['character_id']) ? (int)$order['character_id'] : 0;
    $characterName = isset($order['character_name']) ? $order['character_name'] : '';
    $productId = isset($order['product_id']) ? (int)$order['product_id'] : 0;
    $quantity = isset($order['quantity']) ? (int)$order['quantity'] : 1;

    $delivered = false;
    if ($productId > 0 && $characterId > 0) {
      $delivered = fulfillOrderPP($pdo, $userId, $productId, $quantity, $oid, $characterId, $characterName, $RID);
    } else {
      $delivered = true; // nothing to deliver
    }

    if ($delivered) {
      // Mark completed with capture info
      try {
        $stmt = $pdo->prepare("UPDATE webshop_orders SET status = 'completed', paypal_capture_id = ?, delivered_at = NOW(), updated_at = NOW() WHERE id = ? AND status = 'processing'");
        $stmt->execute(array($captureId, $oid));
      } catch (Exception $e) {
        $stmt = $pdo->prepare("UPDATE webshop_orders SET status = 'completed', paypal_capture_id = ?, delivered_at = NOW() WHERE id = ? AND status = 'processing'");
        $stmt->execute(array($captureId, $oid));
      }
      $processedCount++;
    } else {
      // Delivery failed - create pending_deliveries record
      error_log("RID={$RID} DELIVERY_FAILED order={$oid} - creating pending_deliveries record");
      try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS pending_deliveries (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          order_type VARCHAR(20) NOT NULL DEFAULT 'webshop',
          paypal_order_id VARCHAR(64) DEFAULT NULL,
          user_id INT NOT NULL,
          retry_count INT NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at DATETIME NOT NULL,
          KEY idx_order (order_id, order_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $ins = $pdo->prepare("INSERT INTO pending_deliveries (order_id, order_type, paypal_order_id, user_id, created_at) VALUES (?, 'webshop', ?, ?, NOW())");
        $ins->execute(array($oid, $paypalOrderId, $userId));
      } catch (Exception $e) {
        error_log("RID={$RID} PENDING_DELIVERY_ERR: " . $e->getMessage());
      }
      // Revert to pending
      $stmt = $pdo->prepare("UPDATE webshop_orders SET status = 'pending' WHERE id = ? AND status = 'processing'");
      $stmt->execute(array($oid));
    }

    $lastOrderId = $oid;
    error_log("RID={$RID} PP_ORDER_PROCESSED order={$oid} user={$userId} product={$productId} delivered=" . ($delivered ? 'yes' : 'no'));
  }
} else {
  error_log("RID={$RID} PP_NO_ORDERS_FOUND paypal_order={$paypalOrderId}");
}

json_response_pc(array(
  'success' => true,
  'status' => 'COMPLETED',
  'message' => 'Payment confirmed and order fulfilled',
  'order_id' => $lastOrderId,
  'processed_count' => $processedCount,
));

// ============ HANDLERS ============

function handleBundleCapture($pdo, $bundleOrderId, $paypalOrderId, $captureId, $userId, $RID) {
  if ($bundleOrderId <= 0) return;

  try {
    // Idempotency: only update if pending
    $stmt = $pdo->prepare("UPDATE bundle_orders SET status = 'completed', paypal_capture_id = ? WHERE id = ? AND status = 'pending'");
    $stmt->execute(array($captureId, $bundleOrderId));

    if ($stmt->rowCount() > 0) {
      require_once __DIR__ . '/mail_delivery.php';
      
      $stmt = $pdo->prepare("SELECT * FROM bundle_orders WHERE id = ?");
      $stmt->execute(array($bundleOrderId));
      $order = $stmt->fetch(PDO::FETCH_ASSOC);
      
      if ($order) {
        $bundleId = (int)$order['bundle_id'];
        $characterId = (int)$order['character_id'];
        $characterName = isset($order['character_name']) ? $order['character_name'] : '';
        
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
    } else {
      error_log("RID={$RID} BUNDLE_IDEMPOTENT_SKIP order={$bundleOrderId} already_completed_or_missing");
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

  require_once __DIR__ . '/mail_delivery.php';
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

function handleTopUpCapture($pdo, $userId, $pkgId, $charId, $charName, $paypalOrderId, $captureId, $RID) {
  if ($userId <= 0 || $pkgId <= 0 || $charId <= 0) {
    error_log("RID={$RID} TOPUP_CAPTURE_INVALID user={$userId} pkg={$pkgId} char={$charId}");
    return;
  }

  // Idempotency
  try {
    $stmt = $pdo->prepare("SELECT id, status FROM topup_orders WHERE paypal_order_id = ? LIMIT 1");
    $stmt->execute(array($paypalOrderId));
    $tRow = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($tRow && $tRow['status'] === 'completed') {
      error_log("RID={$RID} TOPUP_IDEMPOTENT_SKIP order={$paypalOrderId}");
      return;
    }
  } catch (Exception $e) { /* table may not exist */ }

  $stmt = $pdo->prepare("SELECT * FROM currency_topup_packages WHERE id = ? LIMIT 1");
  $stmt->execute(array($pkgId));
  $pkg = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$pkg) {
    error_log("RID={$RID} TOPUP_PKG_NOT_FOUND id={$pkgId}");
    return;
  }

  $amount = (int)$pkg['amount'];
  $bonus = (int)$pkg['bonus_amount'];
  $total = $amount + $bonus;
  $currencyType = $pkg['currency_type'];
  $label = $currencyType === 'zen' ? 'Zen' : 'Coins';

  require_once __DIR__ . '/mail_delivery.php';
  $mailer = new GameMailer($pdo);

  $zen = 0;
  $coins = 0;
  if ($currencyType === 'zen') {
    $zen = $total;
  } else {
    $coins = $total;
  }

  $result = $mailer->sendOrderReward($charId, number_format($total) . ' ' . $label . ' Top-Up', 0, 0, $coins, $zen, 0);

  try {
    $stmt = $pdo->prepare("UPDATE topup_orders SET status = 'completed', paypal_capture_id = ?, completed_at = NOW() WHERE paypal_order_id = ? AND status = 'pending'");
    $stmt->execute(array($captureId, $paypalOrderId));
  } catch (Exception $e) {
    error_log("RID={$RID} TOPUP_ORDER_UPDATE_ERR: " . $e->getMessage());
  }

  try {
    $stmt = $pdo->prepare("UPDATE webshop_orders SET status = 'completed', paypal_capture_id = ?, delivered_at = NOW() WHERE paypal_order_id = ? AND status = 'pending'");
    $stmt->execute(array($captureId, $paypalOrderId));
  } catch (Exception $e) {
    error_log("RID={$RID} TOPUP_WEBSHOP_ORDER_ERR: " . $e->getMessage());
  }

  if ($result['success']) {
    error_log("RID={$RID} TOPUP_DELIVERED user={$userId} char={$charId} type={$currencyType} total={$total}");
  } else {
    error_log("RID={$RID} TOPUP_DELIVERY_FAILED user={$userId} error={$result['message']}");
  }
}
