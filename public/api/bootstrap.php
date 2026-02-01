<?php
// api/bootstrap.php
// Unified app config + getConfig() + CORS handler
// PHP 5.x compatible

// Load environment variables (Stripe keys, etc.)
if (file_exists(__DIR__ . '/env.php')) {
  require_once __DIR__ . '/env.php';
}

$APP_CONFIG = array(
  'db' => array(
    'host' => '192.168.1.88',
    'name' => 'shengui',
    'user' => 'root',
    'pass' => 'root',
    'charset' => 'utf8', // MySQL 5.1 safe (avoid utf8mb4)
  ),

  'cors' => array(
    // Exact allowed origins (NO trailing slash)
    'allowed_origins' => array(
      'https://woiendgame.online',
      'https://www.woiendgame.online',
      'https://woiendgame.lovable.app',
      'http://localhost:5173',
      'http://localhost:3000',
    ),

    // Allow lovable previews
    'allowed_origin_regex' => array(
      '/^https:\/\/[a-z0-9-]+\.(lovable\.app|lovableproject\.com)$/i',
    ),

    'allowed_headers' => 'Content-Type, Authorization, X-Requested-With, Accept, X-Session-Token',
    'default_methods' => array('GET','POST','PUT','PATCH','DELETE','OPTIONS'),
    'max_age' => 86400,
  ),

  'security' => array(
    // Bootstrap admin IDs (users.ID)
    'admin_user_ids' => array(24),
  ),

  'stripe' => array(
    'secret_key' => getenv('STRIPE_SECRET_KEY') ? getenv('STRIPE_SECRET_KEY') : '',
    'webhook_secret' => getenv('STRIPE_WEBHOOK_SECRET') ? getenv('STRIPE_WEBHOOK_SECRET') : '',
    'currency' => 'eur',
    'success_url' => 'https://woiendgame.online/payment-success?session_id={CHECKOUT_SESSION_ID}',
    'cancel_url' => 'https://woiendgame.online/cart',
  ),
);

// Polyfill for older PHP versions
if (!function_exists('http_response_code')) {
    function http_response_code($code = null) {
        static $current = 200;
        if ($code !== null) {
            $current = (int)$code;
            header('X-PHP-Response-Code: ' . $current, true, $current);
        }
        return $current;
    }
}

if (!function_exists('getConfig')) {
  function getConfig() {
    global $APP_CONFIG;
    return $APP_CONFIG;
  }
}

/**
 * Unified CORS handler for all API endpoints.
 * Call early (before output). Handles OPTIONS and exits.
 */
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

    // Preflight basics (always safe)
    header("Access-Control-Allow-Methods: " . implode(', ', $methods));
    $allowedHeaders = isset($cors['allowed_headers']) ? $cors['allowed_headers'] : 'Content-Type, Authorization, Accept';
    header("Access-Control-Allow-Headers: " . $allowedHeaders);
    $maxAge = isset($cors['max_age']) ? (int)$cors['max_age'] : 86400;
    header("Access-Control-Max-Age: " . $maxAge);

    // Allow-Origin only if allowed
    if ($origin && $isAllowed) {
      header("Access-Control-Allow-Origin: $origin");
      header("Access-Control-Allow-Credentials: true");
      header("Vary: Origin");
    }

    $requestMethod = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
    if ($requestMethod === 'OPTIONS') {
      if ($origin && !$isAllowed) {
        http_response_code(403);
        exit;
      }
      http_response_code(204);
      exit;
    }
  }
}

/**
 * Get PDO database connection
 */
if (!function_exists('getDB')) {
  function getDB() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    
    $cfg = getConfig();
    $db = $cfg['db'];
    
    $dsn = "mysql:host={$db['host']};dbname={$db['name']};charset=utf8";
    $options = array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    );
    
    try {
        $pdo = new PDO($dsn, $db['user'], $db['pass'], $options);
    } catch (PDOException $e) {
        error_log("DB_CONNECT_FAILED: " . $e->getMessage());
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(array('success' => false, 'message' => 'Database connection failed'));
        exit;
    }
    
    return $pdo;
  }
}

// Auto-call CORS handler when bootstrap is included
handleCors();

// Let "require config.php" also return array if someone uses include-return style.
return $APP_CONFIG;
