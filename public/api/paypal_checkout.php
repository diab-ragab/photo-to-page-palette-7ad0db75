<?php
/**
 * paypal_checkout.php - minimal checkout page (redirect/handler)
 * PHP 5.x compatible
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';

handleCors(array('GET','OPTIONS'));

$token = isset($_GET['token']) ? trim((string)$_GET['token']) : '';
$success = isset($_GET['success']) ? trim((string)$_GET['success']) : '';

if ($token === '') {
  header("Location: /shop?err=missing_token");
  exit;
}

if ($success === '1' || strtolower($success) === 'true') {
  header("Location: /shop/payment-success?token=" . urlencode($token));
  exit;
}

header("Location: /shop/payment-cancel?token=" . urlencode($token));
exit;