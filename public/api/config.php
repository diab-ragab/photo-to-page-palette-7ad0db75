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

  'paypal' => array(
    'client_id'   => 'AdOJBG93gQ82tIgh5NQpSWu02cjjDF0FGjCP9REfrLDZ4m28TFvPt6KVJwCpZZCsE0J8Rc7A7Km2d3oQ',
    'secret'      => 'EDEoRdNYFM5tTfH6xMOsupYWwH2c4nfLo5wNI6rFLvjmzMasG_EP1dfJDNc1MP7ReLxwI5mgziQOW5K2',
    'sandbox'     => false,  // LIVE ONLY — never set to true
    'webhook_id'  => '3W4074240A126903X',
    'merchant_id' => 'Y3SS84QPDW7EC',
    'success_url' => 'https://woiendgame.online/shop/success',
    'cancel_url'  => 'https://woiendgame.online/shop',
    'currency'    => 'EUR',
  ),
);

if (!function_exists('getConfig')) {
  function getConfig() {
    global $APP_CONFIG;
    return $APP_CONFIG;
  }
}

return $APP_CONFIG;
