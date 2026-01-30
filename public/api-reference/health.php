<?php
/**
 * health.php - Simple diagnostic endpoint
 * Tests PHP execution and DB connection
 */

// No dependencies - pure PHP
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$result = array(
    'status' => 'ok',
    'php_version' => PHP_VERSION,
    'timestamp' => date('c'),
    'server' => isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : 'unknown'
);

// Test DB connection
try {
    require_once __DIR__ . '/db.php';
    $pdo = getDB();
    $result['db'] = 'connected';
    
    // Check tables
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $result['tables_count'] = count($tables);
    
    // Check if vote_sites exists
    $result['vote_sites_exists'] = in_array('vote_sites', $tables);
    
    if ($result['vote_sites_exists']) {
        $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM vote_sites WHERE is_active = 1");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $result['active_vote_sites'] = (int)$row['cnt'];
    }
    
} catch (Exception $e) {
    $result['db'] = 'error';
    $result['db_error'] = $e->getMessage();
}

echo json_encode($result);
