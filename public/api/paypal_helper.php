<?php
/**
 * paypal_helper.php - PayPal REST API v2 helpers (PHP 5.x compatible)
 * 
 * LIVE-ONLY: All requests go to https://api-m.paypal.com
 * Uses file_get_contents (no cURL, no SDK) for PayPal REST API calls.
 * Provides: getPayPalAccessToken(), paypalCreateOrder(), paypalCaptureOrder()
 */

if (!function_exists('getPayPalAccessToken')) {

  /**
   * Get PayPal OAuth2 access token
   * @param string $clientId
   * @param string $secret
   * @param bool $sandbox  IGNORED — always uses LIVE endpoint
   * @return array  array('token' => string, 'error' => string)
   */
  function getPayPalAccessToken($clientId, $secret, $sandbox = false) {
    // FORCE LIVE — ignore sandbox parameter
    $baseUrl = 'https://api-m.paypal.com';

    $url = $baseUrl . '/v1/oauth2/token';
    $auth = base64_encode($clientId . ':' . $secret);

    $headers = array(
      'Authorization: Basic ' . $auth,
      'Content-Type: application/x-www-form-urlencoded',
      'Accept: application/json',
    );

    $opts = array(
      'http' => array(
        'method' => 'POST',
        'header' => implode("\r\n", $headers),
        'content' => 'grant_type=client_credentials',
        'ignore_errors' => true,
        'timeout' => 30,
      ),
      'ssl' => array(
        'verify_peer' => false,
        'verify_peer_name' => false,
      ),
    );

    $context = stream_context_create($opts);
    $resp = @file_get_contents($url, false, $context);

    $code = 0;
    if (isset($http_response_header) && is_array($http_response_header) && count($http_response_header) > 0) {
      if (preg_match('/HTTP\/\d+\.?\d*\s+(\d+)/', $http_response_header[0], $m)) {
        $code = (int)$m[1];
      }
    }

    if ($resp === false || $code < 200 || $code >= 300) {
      return array('token' => '', 'error' => 'Failed to get PayPal access token (HTTP ' . $code . ')');
    }

    $data = json_decode($resp, true);
    if (!is_array($data) || !isset($data['access_token'])) {
      return array('token' => '', 'error' => 'Invalid PayPal token response');
    }

    return array('token' => $data['access_token'], 'error' => '');
  }

  /**
   * Make a PayPal API request (JSON body)
   * @param string $method   HTTP method (GET, POST, etc.)
   * @param string $url      Full API URL
   * @param string $token    Bearer access token
   * @param mixed  $body     Array to JSON-encode, or null for GET
   * @return array  array($httpCode, $responseArray, $errorString)
   */
  function paypalRequest($method, $url, $token, $body = null) {
    $headers = array(
      'Authorization: Bearer ' . $token,
      'Content-Type: application/json',
      'Accept: application/json',
    );

    $opts = array(
      'http' => array(
        'method' => $method,
        'header' => implode("\r\n", $headers),
        'ignore_errors' => true,
        'timeout' => 30,
      ),
      'ssl' => array(
        'verify_peer' => false,
        'verify_peer_name' => false,
      ),
    );

    if ($body !== null) {
      $opts['http']['content'] = json_encode($body);
    }

    $context = stream_context_create($opts);
    $resp = @file_get_contents($url, false, $context);

    $code = 0;
    if (isset($http_response_header) && is_array($http_response_header) && count($http_response_header) > 0) {
      if (preg_match('/HTTP\/\d+\.?\d*\s+(\d+)/', $http_response_header[0], $m)) {
        $code = (int)$m[1];
      }
    }

    if ($resp === false) {
      return array($code, array(), 'file_get_contents failed');
    }

    $data = json_decode($resp, true);
    if (!is_array($data)) {
      return array($code, array(), 'Invalid JSON response');
    }

    return array($code, $data, '');
  }

  /**
   * Get PayPal API base URL — ALWAYS LIVE
   * @param bool $sandbox  IGNORED
   * @return string
   */
  function getPayPalBaseUrl($sandbox = false) {
    // FORCE LIVE — ignore sandbox parameter
    return 'https://api-m.paypal.com';
  }

  /**
   * Create a PayPal order (checkout)
   * @param string $accessToken
   * @param array  $purchaseUnits  Array of purchase unit arrays
   * @param string $returnUrl
   * @param string $cancelUrl
   * @param array  $metadata       Custom metadata to store (saved in custom_id as JSON)
   * @param bool   $sandbox  IGNORED
   * @return array  array('id' => string, 'approve_url' => string, 'error' => string)
   */
  function paypalCreateOrder($accessToken, $purchaseUnits, $returnUrl, $cancelUrl, $metadata = array(), $sandbox = false) {
    $baseUrl = getPayPalBaseUrl(false);
    $url = $baseUrl . '/v2/checkout/orders';

    // Encode metadata into custom_id of first purchase unit (max 127 chars)
    if (!empty($metadata) && isset($purchaseUnits[0])) {
      $purchaseUnits[0]['custom_id'] = substr(json_encode($metadata), 0, 127);
    }

    $orderData = array(
      'intent' => 'CAPTURE',
      'purchase_units' => $purchaseUnits,
      'application_context' => array(
        'return_url' => $returnUrl,
        'cancel_url' => $cancelUrl,
        'brand_name' => 'WOI Endgame',
        'landing_page' => 'NO_PREFERENCE',
        'user_action' => 'PAY_NOW',
      ),
    );

    list($code, $data, $err) = paypalRequest('POST', $url, $accessToken, $orderData);

    if ($err !== '' || $code < 200 || $code >= 300) {
      $errMsg = $err;
      if (isset($data['message'])) $errMsg = $data['message'];
      if (isset($data['details']) && is_array($data['details'])) {
        foreach ($data['details'] as $d) {
          if (isset($d['description'])) $errMsg .= ' ' . $d['description'];
        }
      }
      return array('id' => '', 'approve_url' => '', 'error' => 'PayPal create order failed: ' . $errMsg);
    }

    // Find approve URL
    $approveUrl = '';
    if (isset($data['links']) && is_array($data['links'])) {
      foreach ($data['links'] as $link) {
        if (isset($link['rel']) && $link['rel'] === 'approve') {
          $approveUrl = $link['href'];
          break;
        }
      }
    }

    $orderId = isset($data['id']) ? $data['id'] : '';

    if ($orderId === '' || $approveUrl === '') {
      return array('id' => '', 'approve_url' => '', 'error' => 'PayPal order missing ID or approve URL');
    }

    return array('id' => $orderId, 'approve_url' => $approveUrl, 'error' => '');
  }

  /**
   * Capture a PayPal order after payer approval
   * @param string $accessToken
   * @param string $orderId   PayPal order ID
   * @param bool   $sandbox  IGNORED
   * @return array  array('status' => string, 'capture_id' => string, 'data' => array, 'error' => string)
   */
  function paypalCaptureOrder($accessToken, $orderId, $sandbox = false) {
    $baseUrl = getPayPalBaseUrl(false);
    $url = $baseUrl . '/v2/checkout/orders/' . urlencode($orderId) . '/capture';

    list($code, $data, $err) = paypalRequest('POST', $url, $accessToken, new stdClass());

    if ($err !== '' || $code < 200 || $code >= 300) {
      $errMsg = $err;
      if (isset($data['message'])) $errMsg = $data['message'];
      return array('status' => '', 'capture_id' => '', 'data' => $data, 'error' => 'PayPal capture failed: ' . $errMsg);
    }

    $status = isset($data['status']) ? $data['status'] : '';
    $captureId = '';

    // Extract capture ID from purchase_units
    if (isset($data['purchase_units'][0]['payments']['captures'][0]['id'])) {
      $captureId = $data['purchase_units'][0]['payments']['captures'][0]['id'];
    }

    return array('status' => $status, 'capture_id' => $captureId, 'data' => $data, 'error' => '');
  }

  /**
   * Get PayPal order details
   * @param string $accessToken
   * @param string $orderId
   * @param bool   $sandbox  IGNORED
   * @return array  array($httpCode, $data, $error)
   */
  function paypalGetOrder($accessToken, $orderId, $sandbox = false) {
    $baseUrl = getPayPalBaseUrl(false);
    $url = $baseUrl . '/v2/checkout/orders/' . urlencode($orderId);
    return paypalRequest('GET', $url, $accessToken);
  }

  /**
   * Get PayPal config from app config
   * @return array  array('client_id', 'secret', 'sandbox', 'currency', 'success_url', 'cancel_url')
   */
  function getPayPalConfig() {
    $cfg = getConfig();
    $pp = isset($cfg['paypal']) ? $cfg['paypal'] : array();
    return array(
      'client_id'    => isset($pp['client_id']) ? $pp['client_id'] : '',
      'secret'       => isset($pp['secret']) ? $pp['secret'] : '',
      'sandbox'      => false,  // FORCED LIVE
      'currency'     => isset($pp['currency']) ? strtoupper($pp['currency']) : 'EUR',
      'merchant_id'  => isset($pp['merchant_id']) ? $pp['merchant_id'] : '',
      'success_url'  => isset($pp['success_url']) ? $pp['success_url'] : '',
      'cancel_url'   => isset($pp['cancel_url']) ? $pp['cancel_url'] : '',
    );
  }
}