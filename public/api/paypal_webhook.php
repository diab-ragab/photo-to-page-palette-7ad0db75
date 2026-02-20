<?php
/**
 * paypal_webhook.php - PayPal webhook receiver (optional)
 * PHP 5.x compatible
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/paypal_helper.php';

handleCors(array('POST','OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
  http_response_code(400);
  echo json_encode(array('success'=>false,'message'=>'Invalid JSON','rid'=>$RID));
  exit;
}

$eventType = isset($data['event_type']) ? (string)$data['event_type'] : '';
$resource = isset($data['resource']) && is_array($data['resource']) ? $data['resource'] : array();

error_log("RID={$RID} PAYPAL_WEBHOOK event={$eventType}");

echo json_encode(array('success'=>true,'rid'=>$RID));
exit;