<?php
/**
 * paypal_helper.php - PayPal REST API v2 helpers (PHP 5.x compatible)
 * Works on PHP 5.3+ and PHP 8.x
 *
 * Uses file_get_contents (no cURL, no SDK).
 * Respects config.php paypal.sandbox flag.
 *
 * Provides:
 *   getPayPalConfig()
 *   getPayPalBaseUrl()
 *   getPayPalAccessToken()
 *   paypalCreateOrder()
 *   paypalGetOrder()
 *   paypalCaptureOrder()
 */

function getPayPalConfig() {
  $cfg = array(
    'client_id'  => '',
    'secret'     => '',
    'sandbox'    => true,
    'currency'   => 'EUR',
    'merchant_id'=> '',
    'success_url'=> '',
    'cancel_url' => '',
    'webhook_id' => ''
  );

  // Try config.php
  $file = __DIR__ . '/config.php';
  if (file_exists($file)) {
    $c = include $file;
    if (is_array($c) && isset($c['paypal']) && is_array($c['paypal'])) {
      $p = $c['paypal'];
      if (isset($p['client_id'])) $cfg['client_id'] = (string)$p['client_id'];
      if (isset($p['secret'])) $cfg['secret'] = (string)$p['secret'];
      if (isset($p['sandbox'])) $cfg['sandbox'] = (bool)$p['sandbox'];
      if (isset($p['currency'])) $cfg['currency'] = (string)$p['currency'];
      if (isset($p['merchant_id'])) $cfg['merchant_id'] = (string)$p['merchant_id'];
      if (isset($p['success_url'])) $cfg['success_url'] = (string)$p['success_url'];
      if (isset($p['cancel_url'])) $cfg['cancel_url'] = (string)$p['cancel_url'];
      if (isset($p['webhook_id'])) $cfg['webhook_id'] = (string)$p['webhook_id'];
    }
  }

  return $cfg;
}

function getPayPalBaseUrl($sandbox) {
  return $sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}

function httpJson($method, $url, $headers, $bodyJson) {
  $opts = array(
    'http' => array(
      'method'  => $method,
      'header'  => $headers,
      'content' => $bodyJson,
      'ignore_errors' => true,
      'timeout' => 30
    )
  );
  $ctx = stream_context_create($opts);
  $raw = @file_get_contents($url, false, $ctx);

  $status = 0;
  if (isset($http_response_header) && is_array($http_response_header)) {
    foreach ($http_response_header as $h) {
      if (preg_match('#^HTTP/\d\.\d\s+(\d+)#', $h, $m)) { $status = intval($m[1]); break; }
    }
  }

  $data = null;
  if ($raw !== false && $raw !== '') {
    $data = json_decode($raw, true);
  }

  return array('status' => $status, 'raw' => $raw, 'data' => $data);
}

function getPayPalAccessToken($clientId, $secret, $sandbox) {
  $base = getPayPalBaseUrl($sandbox);
  $url = $base . '/v1/oauth2/token';

  $auth = base64_encode($clientId . ':' . $secret);
  $headers = "Authorization: Basic {$auth}\r\n" .
             "Content-Type: application/x-www-form-urlencoded\r\n";

  $body = "grant_type=client_credentials";

  $opts = array(
    'http' => array(
      'method' => 'POST',
      'header' => $headers,
      'content' => $body,
      'ignore_errors' => true,
      'timeout' => 30
    )
  );
  $ctx = stream_context_create($opts);
  $raw = @file_get_contents($url, false, $ctx);

  $status = 0;
  if (isset($http_response_header) && is_array($http_response_header)) {
    foreach ($http_response_header as $h) {
      if (preg_match('#^HTTP/\d\.\d\s+(\d+)#', $h, $m)) { $status = intval($m[1]); break; }
    }
  }

  if ($raw === false || $raw === '') {
    return array('token' => '', 'error' => 'No response from PayPal', 'status' => $status);
  }

  $j = json_decode($raw, true);
  if (!is_array($j) || !isset($j['access_token'])) {
    return array('token' => '', 'error' => 'Invalid token response', 'status' => $status);
  }

  return array('token' => $j['access_token'], 'error' => '', 'status' => $status);
}

function paypalCreateOrder($accessToken, $purchaseUnits, $returnUrl, $cancelUrl, $meta, $sandbox) {
  $base = getPayPalBaseUrl($sandbox);
  $url = $base . '/v2/checkout/orders';

  $payload = array(
    'intent' => 'CAPTURE',
    'purchase_units' => $purchaseUnits,
    'application_context' => array(
      'return_url' => $returnUrl,
      'cancel_url' => $cancelUrl,
      'brand_name' => 'WOI ENDGAME',
      'landing_page' => 'LOGIN',
      'user_action' => 'PAY_NOW'
    )
  );

  if (is_array($meta) && count($meta) > 0) {
    $payload['custom_id'] = json_encode($meta);
  }

  $bodyJson = json_encode($payload);
  $headers = "Authorization: Bearer {$accessToken}\r\n" .
             "Content-Type: application/json\r\n";

  $res = httpJson('POST', $url, $headers, $bodyJson);

  if ($res['status'] < 200 || $res['status'] >= 300 || !is_array($res['data'])) {
    $err = 'HTTP ' . $res['status'];
    if (is_array($res['data']) && isset($res['data']['message'])) $err .= ' ' . $res['data']['message'];
    return array('id' => '', 'approve_url' => '', 'error' => $err, 'raw' => $res['raw']);
  }

  $id = isset($res['data']['id']) ? (string)$res['data']['id'] : '';
  $approveUrl = '';
  if (isset($res['data']['links']) && is_array($res['data']['links'])) {
    foreach ($res['data']['links'] as $lnk) {
      if (isset($lnk['rel']) && $lnk['rel'] === 'approve' && isset($lnk['href'])) {
        $approveUrl = (string)$lnk['href'];
        break;
      }
    }
  }

  return array('id' => $id, 'approve_url' => $approveUrl, 'error' => '', 'raw' => $res['raw']);
}

function paypalGetOrder($accessToken, $paypalOrderId, $sandbox) {
  $base = getPayPalBaseUrl($sandbox);
  $url = $base . '/v2/checkout/orders/' . rawurlencode($paypalOrderId);

  $headers = "Authorization: Bearer {$accessToken}\r\n" .
             "Content-Type: application/json\r\n";

  $res = httpJson('GET', $url, $headers, '');

  if ($res['status'] < 200 || $res['status'] >= 300 || !is_array($res['data'])) {
    $err = 'HTTP ' . $res['status'];
    if (is_array($res['data']) && isset($res['data']['message'])) $err .= ' ' . $res['data']['message'];
    return array('data' => null, 'error' => $err, 'raw' => $res['raw']);
  }

  return array('data' => $res['data'], 'error' => '', 'raw' => $res['raw']);
}

function paypalCaptureOrder($accessToken, $paypalOrderId, $sandbox) {
  $base = getPayPalBaseUrl($sandbox);
  $url = $base . '/v2/checkout/orders/' . rawurlencode($paypalOrderId) . '/capture';

  $headers = "Authorization: Bearer {$accessToken}\r\n" .
             "Content-Type: application/json\r\n";

  $res = httpJson('POST', $url, $headers, '{}');

  if (!is_array($res['data'])) {
    return array('status' => '', 'capture_id' => '', 'data' => null, 'error' => 'Invalid response', 'raw' => $res['raw']);
  }

  $status = isset($res['data']['status']) ? (string)$res['data']['status'] : '';
  $captureId = '';
  if (isset($res['data']['purchase_units'][0]['payments']['captures'][0]['id'])) {
    $captureId = (string)$res['data']['purchase_units'][0]['payments']['captures'][0]['id'];
  }

  if ($res['status'] < 200 || $res['status'] >= 300) {
    $err = 'HTTP ' . $res['status'];
    if (isset($res['data']['message'])) $err .= ' ' . $res['data']['message'];
    return array('status' => $status, 'capture_id' => $captureId, 'data' => $res['data'], 'error' => $err, 'raw' => $res['raw']);
  }

  return array('status' => $status, 'capture_id' => $captureId, 'data' => $res['data'], 'error' => '', 'raw' => $res['raw']);
}