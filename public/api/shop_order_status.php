<?php
/**
 * shop_order_status.php - get order status by PayPal token or order id
 * Sync with NEW SHOP SCHEMA (no user_id in shop_orders)
 * PHP 5.x compatible
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';

handleCors(array('GET','OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();

$user = requireAuth();
$userId = isset($user['user_id']) ? intval($user['user_id']) : 0;
$accountName = isset($user['name']) ? trim((string)$user['name']) : '';

if ($userId <= 0 || $accountName === '') {
  http_response_code(401);
  echo json_encode(array('success'=>false,'message'=>'Unauthorized','rid'=>$RID));
  exit;
}

$pdo = getDB();
$token = isset($_GET['token']) ? trim((string)$_GET['token']) : '';
$orderId = isset($_GET['order_id']) ? intval($_GET['order_id']) : 0;

if ($token === '' && $orderId <= 0) {
  http_response_code(400);
  echo json_encode(array('success'=>false,'message'=>'token or order_id required','rid'=>$RID));
  exit;
}

if ($token !== '') {
  $st = $pdo->prepare("SELECT id, status, total_cents, currency, paypal_order_id, capture_id, payer_email, updated_at
                       FROM shop_orders
                       WHERE paypal_order_id = ? AND account_name = ?
                       LIMIT 1");
  $st->execute(array($token, $accountName));
  $row = $st->fetch(PDO::FETCH_ASSOC);
} else {
  $st = $pdo->prepare("SELECT id, status, total_cents, currency, paypal_order_id, capture_id, payer_email, updated_at
                       FROM shop_orders
                       WHERE id = ? AND account_name = ?
                       LIMIT 1");
  $st->execute(array($orderId, $accountName));
  $row = $st->fetch(PDO::FETCH_ASSOC);
}

if (!$row) {
  http_response_code(404);
  echo json_encode(array('success'=>false,'message'=>'Order not found','rid'=>$RID));
  exit;
}

echo json_encode(array(
  'success' => true,
  'order' => $row,
  'rid' => $RID
));
exit;