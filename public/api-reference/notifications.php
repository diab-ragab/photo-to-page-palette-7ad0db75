<?php
/**
 * notifications.php - Notification Management API
 * 
 * Place this file at: woiendgame.online/api/notifications.php
 * Handles CRUD operations for site notifications/announcements.
 */

require_once __DIR__ . '/config.php';
handleCors(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);

header('Content-Type: application/json');

$db = getDB();

// Ensure table exists
$db->exec("
    CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('news', 'update', 'maintenance', 'event') DEFAULT 'news',
        created_by VARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active TINYINT(1) DEFAULT 1,
        INDEX idx_active (is_active),
        INDEX idx_created (created_at DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        // PUBLIC: List active notifications
        $stmt = $db->query("SELECT * FROM notifications WHERE is_active = 1 ORDER BY created_at DESC LIMIT 50");
        echo json_encode(['success' => true, 'notifications' => $stmt->fetchAll()]);
        break;
        
    case 'create':
        // GM ONLY
        requireGM();
        
        $input = getJsonInput();
        $title = sanitizeInput($input['title'] ?? '', 200);
        $message = sanitizeInput($input['message'] ?? '', 5000);
        $type = in_array($input['type'] ?? '', ['news', 'update', 'maintenance', 'event']) 
            ? $input['type'] : 'news';
        $created_by = $_SESSION['username'];
        
        if (empty($title) || empty($message)) {
            jsonFail(400, 'Title and message are required');
        }
        
        $stmt = $db->prepare("INSERT INTO notifications (title, message, type, created_by) VALUES (?, ?, ?, ?)");
        $success = $stmt->execute([$title, $message, $type, $created_by]);
        
        echo json_encode([
            'success' => $success,
            'id' => (int)$db->lastInsertId()
        ]);
        break;
        
    case 'update':
        // GM ONLY
        requireGM();
        
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonFail(400, 'Notification ID required');
        
        $input = getJsonInput();
        $title = sanitizeInput($input['title'] ?? '', 200);
        $message = sanitizeInput($input['message'] ?? '', 5000);
        $type = in_array($input['type'] ?? '', ['news', 'update', 'maintenance', 'event']) 
            ? $input['type'] : 'news';
        
        if (empty($title) || empty($message)) {
            jsonFail(400, 'Title and message are required');
        }
        
        $stmt = $db->prepare("UPDATE notifications SET title = ?, message = ?, type = ? WHERE id = ?");
        $success = $stmt->execute([$title, $message, $type, $id]);
        
        echo json_encode(['success' => $success && $stmt->rowCount() > 0]);
        break;
        
    case 'delete':
        // GM ONLY
        requireGM();
        
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonFail(400, 'Notification ID required');
        
        $stmt = $db->prepare("DELETE FROM notifications WHERE id = ?");
        $success = $stmt->execute([$id]);
        
        echo json_encode(['success' => $success && $stmt->rowCount() > 0]);
        break;
        
    default:
        jsonFail(400, 'Invalid action');
}
