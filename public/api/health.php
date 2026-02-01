<?php
/**
 * health.php - Simple health check endpoint
 * GET /api/health.php
 */

require_once __DIR__ . '/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

$response = array(
    'success' => true,
    'status' => 'ok',
    'php_version' => PHP_VERSION,
    'timestamp' => date('c'),
);

// Test DB connection
try {
    $pdo = getDB();
    $stmt = $pdo->query("SELECT 1");
    $response['database'] = 'connected';
} catch (Exception $e) {
    $response['database'] = 'error: ' . $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);
