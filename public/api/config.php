<?php
// api/config.php
// Unified app config + getConfig() + CORS handler
// PHP 5.3+ compatible

$APP_CONFIG = array(
  'db' => array(
    'host' => '192.168.1.88',
    'name' => 'shengui',
    'user' => 'root',
    'pass' => 'root',
    'charset' => 'utf8',
  ),

  'cors' => array(
    'allowed_origins' => array(
      'https://woiendgame.online',
      'https://www.woiendgame.online',
      'https://woiendgame.lovable.app',
      'http://localhost:5173',
      'http://localhost:3000',
    ),
    'allowed_origin_regex' => array(
      '/^https:\/\/[a-z0-9-]+\.(lovable\.app|lovableproject\.com)$/i',
    ),
    'allowed_headers' => 'Content-Type, Authorization, X-Requested-With, Accept, X-Session-Token',
    'default_methods' => array('GET','POST','PUT','PATCH','DELETE','OPTIONS'),
    'max_age' => 86400,
  ),

  'security' => array(
    'admin_user_ids' => array(24),
  ),

  'stripe' => array(
    'secret_key' => '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',
    'webhook_secret' => 'whsec_aUbYbZffBWZXxvTNjuD0W3bhI7fwrGrn',
    'success_url' => 'https://woiendgame.online/checkout/success?session_id={CHECKOUT_SESSION_ID}',
    'cancel_url'  => 'https://woiendgame.online/shop',
    'currency'    => 'eur',
  ),
);

if (!function_exists('getConfig')) {
  function getConfig() {
    global $APP_CONFIG;
    return $APP_CONFIG;
  }
}

if (!function_exists('handleCors')) {
  function handleCors($methods = null) {
    $cfg  = getConfig();
    $cors = isset($cfg['cors']) ? $cfg['cors'] : array();

    if ($methods === null) {
      $methods = isset($cors['default_methods']) ? $cors['default_methods'] : array('GET','POST','OPTIONS');
    }

    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    $allowedOrigins = isset($cors['allowed_origins']) ? $cors['allowed_origins'] : array();
    $allowedRegex   = isset($cors['allowed_origin_regex']) ? $cors['allowed_origin_regex'] : array();

    $isAllowed = false;

    if ($origin) {
      if (in_array($origin, $allowedOrigins, true)) {
        $isAllowed = true;
      } else {
        foreach ($allowedRegex as $rx) {
          if (is_string($rx) && @preg_match($rx, $origin)) {
            $isAllowed = true;
            break;
          }
        }
      }
    }

    header("Access-Control-Allow-Methods: " . implode(', ', $methods));
    $hdrs = isset($cors['allowed_headers']) ? $cors['allowed_headers'] : 'Content-Type, Authorization, Accept';
    header("Access-Control-Allow-Headers: " . $hdrs);
    $maxAge = isset($cors['max_age']) ? (int)$cors['max_age'] : 86400;
    header("Access-Control-Max-Age: " . $maxAge);

    if ($origin && $isAllowed) {
      header("Access-Control-Allow-Origin: " . $origin);
      header("Access-Control-Allow-Credentials: true");
      header("Vary: Origin");
    }

    $method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
    if ($method === 'OPTIONS') {
      if ($origin && !$isAllowed) {
        http_response_code(403);
        exit;
      }
      http_response_code(204);
      exit;
    }
  }
}

return $APP_CONFIG;
