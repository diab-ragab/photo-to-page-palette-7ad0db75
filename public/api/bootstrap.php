<?php
/**
 * bootstrap.php - Centralized configuration and utilities for /api/ endpoints
 * This file MUST be included at the top of every API script
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

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
 * Handle CORS preflight and headers
 */
function handleCors($allowedMethods = array('GET', 'POST', 'OPTIONS')) {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
    
    // Allow specific origins
    $allowedOrigins = array(
        'https://woiendgame.online',
        'https://www.woiendgame.online',
        'https://woiendgame.lovable.app',
        'http://localhost:8080',
        'http://localhost:5173',
    );
    
    // Also allow lovableproject.com preview domains
    if (preg_match('/\.lovableproject\.com$/', $origin) || preg_match('/\.lovable\.app$/', $origin)) {
        $allowedOrigins[] = $origin;
    }
    
    if (in_array($origin, $allowedOrigins) || $origin === '*') {
        header("Access-Control-Allow-Origin: {$origin}");
    } else {
        header("Access-Control-Allow-Origin: https://woiendgame.online");
    }
    
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Session-Token");
    header("Access-Control-Allow-Methods: " . implode(', ', $allowedMethods));
    header("Access-Control-Max-Age: 86400");
    
    // Handle preflight
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
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
    
    // Try to load from config.php
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
        header('Content-Type: application/json');
        echo json_encode(array('success' => false, 'message' => 'Database connection failed'));
        exit;
    }
    
    return $pdo;
}

/**
 * Get mysqli connection (for legacy code compatibility)
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
        header('Content-Type: application/json');
        echo json_encode(array('success' => false, 'message' => 'Database connection failed'));
        exit;
    }
    
    $mysqli->set_charset('utf8');
    return $mysqli;
}
