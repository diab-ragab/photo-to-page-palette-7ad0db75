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

return $APP_CONFIG;
