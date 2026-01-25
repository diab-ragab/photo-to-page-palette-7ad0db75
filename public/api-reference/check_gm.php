<?php
/**
 * check_gm.php - Role-Based Access Control Check
 * 
 * Place this file at: woiendgame.online/api/check_gm.php
 * Checks if the current session user has 'admin' role.
 */

require_once __DIR__ . '/config.php';
handleCors(['GET', 'OPTIONS']);

header('Content-Type: application/json');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// Security: Use session - never accept username from URL
initSession();

$username = $_SESSION['username'] ?? null;

if (!$username) {
    echo json_encode(['is_gm' => false, 'roles' => []]);
    exit();
}

try {
    $db = getDB();

    // Get user ID from users table
    $stmt = $db->prepare("SELECT ID FROM users WHERE name = ? LIMIT 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(['is_gm' => false, 'roles' => []]);
        exit();
    }

    // Get all roles for this user from user_roles table
    $stmt = $db->prepare("SELECT role FROM user_roles WHERE user_id = ?");
    $stmt->execute([$user['ID']]);
    $roles = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Grant website access if user has 'admin' role
    $hasAccess = in_array('admin', $roles);

    echo json_encode([
        'is_gm' => $hasAccess,
        'roles' => $roles
    ]);

} catch (Throwable $e) {
    error_log("check_gm error: " . $e->getMessage());
    http_response_code(200);
    echo json_encode(['is_gm' => false, 'roles' => []]);
}
