<?php
// api/config.php
// Unified app config + getConfig() + CORS handler

$APP_CONFIG = [
  'db' => [
    'host' => '192.168.1.88',
    'name' => 'shengui',
    'user' => 'root',
    'pass' => 'root',
    'charset' => 'utf8', // MySQL 5.1 safe (avoid utf8mb4)
  ],

  'cors' => [
    // Exact allowed origins (NO trailing slash)
    'allowed_origins' => [
      'https://woiendgame.online',
      'https://www.woiendgame.online',
      'https://woiendgame.lovable.app',
      'http://localhost:5173',
      'http://localhost:3000',
    ],

    // Allow lovable previews
    'allowed_origin_regex' => [
      '/^https:\/\/[a-z0-9-]+\.(lovable\.app|lovableproject\.com)$/i',
    ],

    'allowed_headers' => 'Content-Type, Authorization, X-Requested-With, Accept, X-Session-Token',
    'default_methods' => ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    'max_age' => 86400,
  ],

  'security' => [
    // Bootstrap admin IDs (users.ID)
    'admin_user_ids' => [24],
    // Optional usernames:
    // 'admin_usernames' => ['diab', 'admin'],
  ],
];

if (!function_exists('getConfig')) {
  function getConfig(): array {
    global $APP_CONFIG;
    return $APP_CONFIG;
  }
}

/**
 * Unified CORS handler for all API endpoints.
 * Call early (before output). Handles OPTIONS and exits.
 */
if (!function_exists('handleCors')) {
  function handleCors(?array $methods = null): void {
    $cfg  = getConfig();
    $cors = $cfg['cors'] ?? [];

    $methods = $methods ?: ($cors['default_methods'] ?? ['GET','POST','OPTIONS']);

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowedOrigins = $cors['allowed_origins'] ?? [];
    $allowedRegex   = $cors['allowed_origin_regex'] ?? [];

    $isAllowed = false;

    if ($origin) {
      if (in_array($origin, $allowedOrigins, true)) {
        $isAllowed = true;
      } else {
        foreach ($allowedRegex as $rx) {
          if (is_string($rx) && @preg_match($rx, $origin)) {
            if (preg_match($rx, $origin)) { $isAllowed = true; break; }
          }
        }
      }
    }

    // Preflight basics (always safe)
    header("Access-Control-Allow-Methods: " . implode(', ', $methods));
    header("Access-Control-Allow-Headers: " . ($cors['allowed_headers'] ?? 'Content-Type, Authorization, Accept'));
    header("Access-Control-Max-Age: " . (int)($cors['max_age'] ?? 86400));

    // Allow-Origin only if allowed
    if ($origin && $isAllowed) {
      header("Access-Control-Allow-Origin: $origin");
      header("Access-Control-Allow-Credentials: true");
      header("Vary: Origin");
    }

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
      if ($origin && !$isAllowed) {
        http_response_code(403);
        exit;
      }
      http_response_code(204);
      exit;
    }
  }
}

// Let "require config.php" also return array if someone uses include-return style.
return $APP_CONFIG;
