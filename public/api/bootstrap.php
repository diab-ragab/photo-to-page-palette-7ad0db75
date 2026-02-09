<?php
/**
 * bootstrap.php - Centralized configuration and utilities for /api/ endpoints
 * MUST be included at the top of every API script
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

/**
 * CRITICAL: Cache JSON input from php://input immediately.
 * PHP only allows reading this stream ONCE per request.
 * Store in $GLOBALS so session_helper.php and endpoint scripts can both access it.
 */
if (!isset($GLOBALS['__rawInput'])) {
    $GLOBALS['__rawInput'] = file_get_contents('php://input');
    $GLOBALS['__jsonInput'] = null;
    if (is_string($GLOBALS['__rawInput']) && $GLOBALS['__rawInput'] !== '') {
        $decoded = json_decode($GLOBALS['__rawInput'], true);
        if (is_array($decoded)) {
            $GLOBALS['__jsonInput'] = $decoded;
        }
    }
}

/**
 * Helper to get the cached JSON input (or empty array)
 */
function getJsonInput() {
    return isset($GLOBALS['__jsonInput']) && is_array($GLOBALS['__jsonInput'])
        ? $GLOBALS['__jsonInput']
        : array();
}

// Polyfill for http_response_code (PHP 5.3 compatibility)
if (!function_exists('http_response_code')) {
    function http_response_code($code = null) {
        static $current = 200;
        if ($code !== null) {
            $current = (int)$code;
            $protocol = isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0';
            $texts = array(
                200 => 'OK', 201 => 'Created', 204 => 'No Content',
                400 => 'Bad Request', 401 => 'Unauthorized', 403 => 'Forbidden',
                404 => 'Not Found', 405 => 'Method Not Allowed', 429 => 'Too Many Requests',
                500 => 'Internal Server Error', 502 => 'Bad Gateway', 503 => 'Service Unavailable'
            );
            $text = isset($texts[$code]) ? $texts[$code] : '';
            header("{$protocol} {$code} {$text}", true, $code);
        }
        return $current;
    }
}

/**
 * CORS helper
 * - Never return "*" when using credentials
 * - Only reflect allowed origins
 * - Handles preflight OPTIONS (204)
 */
function handleCors($allowedMethods = array('GET', 'POST', 'OPTIONS')) {

    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

    // Allowlist
    $allowedOrigins = array(
        'https://woiendgame.online',
        'https://www.woiendgame.online',
        'https://woiendgame.lovable.app',
        'http://localhost:8080',
        'http://localhost:5173',
        'http://localhost:3000',
    );

    $isAllowed = false;

    if ($origin) {
        if (in_array($origin, $allowedOrigins, true)) {
            $isAllowed = true;
        } else {
            // Allow lovable preview domains safely
            // e.g. https://abc-123.lovableproject.com or https://abc.lovable.app
            if (preg_match('/^https:\/\/[a-z0-9-]+\.(lovableproject\.com|lovable\.app)$/i', $origin)) {
                $isAllowed = true;
            }
        }
    }

    // Only send CORS headers when there is an Origin header
    // (No Origin = same-origin or server-to-server request)
    if ($origin && $isAllowed) {
        // Ensure we don't accidentally send duplicate headers
        @header_remove('Access-Control-Allow-Origin');
        @header_remove('Access-Control-Allow-Credentials');
        @header_remove('Access-Control-Allow-Headers');
        @header_remove('Access-Control-Allow-Methods');
        @header_remove('Access-Control-Max-Age');

        header("Access-Control-Allow-Origin: {$origin}");
        header("Vary: Origin");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Session-Token, X-Requested-With");
        header("Access-Control-Allow-Methods: " . implode(', ', $allowedMethods));
        header("Access-Control-Max-Age: 86400");
    }

    // Handle preflight
    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Get configuration
 */
function getConfig() {
    static $config = null;
    if ($config !== null) return $config;

    $configFile = __DIR__ . '/config.php';
    if (file_exists($configFile)) {
        $config = require $configFile;
        return $config;
    }

    // Fallback defaults
    $config = array(
        'db' => array(
            'host' => '192.168.1.88',
            'user' => 'root',
            'pass' => 'root',
            'name' => 'shengui',
        ),
        'stripe' => array(
            'secret_key' => '',
            'publishable_key' => '',
            'webhook_secret' => '',
        ),
    );

    return $config;
}

/**
 * Get PDO database connection
 */
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
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array('success' => false, 'message' => 'Database connection failed'));
        exit;
    }

    return $pdo;
}

/**
 * Get mysqli connection (legacy)
 */
function getMySQLi() {
    static $mysqli = null;
    if ($mysqli !== null) return $mysqli;

    $cfg = getConfig();
    $db = $cfg['db'];

    $mysqli = new mysqli($db['host'], $db['user'], $db['pass'], $db['name']);

    if ($mysqli->connect_error) {
        error_log("MYSQLI_CONNECT_FAILED: " . $mysqli->connect_error);
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array('success' => false, 'message' => 'Database connection failed'));
        exit;
    }

    $mysqli->set_charset('utf8');
    return $mysqli;
}
