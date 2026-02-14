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
    'client_id'   => 'AWEFJy_edKvt3xKcWnEgeB-lQBtz2VqYGb9eSWnDJB1f7cSyBeZ8R2xoyHF5r_vrnYOxkfkHHrm6EzHs',
    'secret'      => 'EIgcYoXHk2fmkniJeYBmQRi77sTiBgJPgLg5D5mLO5ndIDN_KK7QW4kXF-aB8IrSlFlvOd_RRw9UlVfr',
    'sandbox'     => false,
    'webhook_id'  => '8SG55611X6955945V',
    'merchant_id' => '',
    'success_url' => 'https://woiendgame.online/checkout/success',
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
