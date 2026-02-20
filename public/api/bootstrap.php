<?php
/**
 * bootstrap.php - Centralized configuration and utilities for /api/ endpoints
 * MUST be included at the top of every API script
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

/**
 * Always return JSON even on fatal errors/exceptions.
 * This prevents "Unexpected token <" on the frontend.
 */
if (!function_exists('boot_json_panic')) {
    function boot_json_panic($code, $msg, $rid) {
        while (ob_get_level()) { @ob_end_clean(); }
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
        }
        if (function_exists('http_response_code')) {
            http_response_code($code);
        } else {
            $protocol = isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0';
            header($protocol . ' ' . intval($code), true, intval($code));
        }
        echo json_encode(array('success' => false, 'message' => $msg, 'rid' => $rid), JSON_UNESCAPED_UNICODE);
        exit;
    }
}

if (!function_exists('generateRID')) {
    function generateRID() {
        // 32 hex chars
        if (function_exists('openssl_random_pseudo_bytes')) {
            $b = openssl_random_pseudo_bytes(16);
            if ($b !== false) return bin2hex($b);
        }
        // Fallback (PHP 5.3 safe)
        $s = '';
        for ($i=0; $i<32; $i++) $s .= dechex(mt_rand(0, 15));
        return $s;
    }
}

if (!function_exists('jsonFail')) {
    function jsonFail($code, $msg, $rid) {
        error_log("RID={$rid} JSON_FAIL code={$code} msg={$msg}");
        boot_json_panic($code, $msg, $rid);
    }
}

if (!function_exists('jsonOk')) {
    function jsonOk($data, $rid) {
        while (ob_get_level()) { @ob_end_clean(); }
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array_merge(array('success'=>true,'rid'=>$rid), $data), JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// Global handlers (optional but recommended)
$__BOOT_RID = generateRID();
set_exception_handler(function($e) use ($__BOOT_RID) {
    error_log("RID={$__BOOT_RID} EXCEPTION: ".$e->getMessage());
    boot_json_panic(500, 'Server exception', $__BOOT_RID);
});
set_error_handler(function($severity, $message, $file, $line) use ($__BOOT_RID) {
    // Convert errors to JSON response for API calls
    error_log("RID={$__BOOT_RID} ERROR: {$message} in {$file}:{$line}");
    boot_json_panic(500, 'Server error', $__BOOT_RID);
});

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
            // Optional: allow same host origin
            $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
            if ($host && (stripos($origin, $host) !== false)) {
                $isAllowed = true;
            }
        }
    }

    if ($isAllowed) {
        header("Access-Control-Allow-Origin: {$origin}");
        header("Vary: Origin");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With");
        header("Access-Control-Allow-Methods: " . implode(', ', $allowedMethods));
        header("Access-Control-Max-Age: 600");
    }

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Config loader
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
        // optional paypal config lives in config.php too
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

// -----------------------------
// GLOBAL Session sliding TTL (1 hour)
// -----------------------------
if (!defined('SESSION_TTL_SECONDS')) define('SESSION_TTL_SECONDS', 3600);
if (!defined('SESSION_TTL_MINUTES')) define('SESSION_TTL_MINUTES', 60);

if (!function_exists('getHeaderValueBoot')) {
    function getHeaderValueBoot($name) {
        $nameLower = strtolower($name);

        $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        if (isset($_SERVER[$serverKey]) && $_SERVER[$serverKey] !== '') {
            return (string)$_SERVER[$serverKey];
        }

        if ($nameLower === 'authorization') {
            if (!empty($_SERVER['HTTP_AUTHORIZATION'])) return (string)$_SERVER['HTTP_AUTHORIZATION'];
            if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) return (string)$_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (is_array($headers)) {
                foreach ($headers as $k => $v) {
                    if (strtolower($k) === $nameLower) return (string)$v;
                }
            }
        }

        return '';
    }
}

if (!function_exists('extractSessionTokenBoot')) {
    function extractSessionTokenBoot() {
        // Authorization: Bearer <token>
        $auth = getHeaderValueBoot('Authorization');
        if ($auth !== '') {
            if (stripos($auth, 'Bearer ') === 0) {
                return trim(substr($auth, 7));
            }
        }

        // Optional fallback
        if (!empty($_GET['sessionToken'])) return trim((string)$_GET['sessionToken']);
        if (!empty($_POST['sessionToken'])) return trim((string)$_POST['sessionToken']);

        return '';
    }
}

if (!function_exists('ensureUserSessionsTableBoot')) {
    function ensureUserSessionsTableBoot($pdo) {
        // If your project already creates this table elsewhere, this is safe.
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id INT UNSIGNED NOT NULL,
                session_token VARCHAR(128) NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY uq_token (session_token),
                KEY idx_user (user_id),
                KEY idx_exp (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
        ");
    }
}

if (!function_exists('autoRefreshSession')) {
    function autoRefreshSession() {
        // Optional sliding TTL refresh; safe no-op if token missing
        $token = extractSessionTokenBoot();
        if ($token === '') return;

        try {
            $pdo = getDB();
            ensureUserSessionsTableBoot($pdo);

            $stmt = $pdo->prepare("UPDATE user_sessions SET expires_at = DATE_ADD(NOW(), INTERVAL ".intval(SESSION_TTL_SECONDS)." SECOND)
                                   WHERE session_token = ? AND expires_at > NOW()");
            $stmt->execute(array($token));
        } catch (Exception $e) {
            // Don't break requests if refresh fails
            error_log("SESSION_REFRESH_FAIL: " . $e->getMessage());
        }
    }
}

// Refresh session TTL on every request
autoRefreshSession();