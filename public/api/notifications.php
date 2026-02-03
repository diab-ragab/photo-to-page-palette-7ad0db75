<?php
// api/notifications.php
// Notifications CRUD - uses PDO (getDB)

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';

try {
    $pdo = getDB();

    switch ($action) {
        case 'list':
            $stmt = $pdo->query("SELECT id, title, message, type, created_by, created_at, is_active 
                                 FROM notifications 
                                 WHERE is_active = 1 
                                 ORDER BY created_at DESC 
                                 LIMIT 50");
            $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($notifications);
            break;

        case 'create':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
                exit;
            }

            $title = trim($input['title'] ?? '');
            $message = trim($input['message'] ?? '');
            $type = trim($input['type'] ?? 'news');
            $createdBy = trim($input['created_by'] ?? 'System');

            if (empty($title) || empty($message)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Title and message are required']);
                exit;
            }

            // Validate type
            $validTypes = ['news', 'update', 'maintenance', 'event'];
            if (!in_array($type, $validTypes)) {
                $type = 'news';
            }

            $stmt = $pdo->prepare("INSERT INTO notifications (title, message, type, created_by, created_at, is_active) 
                                   VALUES (?, ?, ?, ?, NOW(), 1)");
            $stmt->execute([$title, $message, $type, $createdBy]);

            $newId = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'message' => 'Notification created', 'id' => (int)$newId]);
            break;

        case 'update':
            $id = (int)($_GET['id'] ?? 0);
            if ($id <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid notification ID']);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
                exit;
            }

            $title = trim($input['title'] ?? '');
            $message = trim($input['message'] ?? '');
            $type = trim($input['type'] ?? 'news');

            if (empty($title) || empty($message)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Title and message are required']);
                exit;
            }

            $validTypes = ['news', 'update', 'maintenance', 'event'];
            if (!in_array($type, $validTypes)) {
                $type = 'news';
            }

            $stmt = $pdo->prepare("UPDATE notifications SET title = ?, message = ?, type = ? WHERE id = ?");
            $stmt->execute([$title, $message, $type, $id]);

            echo json_encode(['success' => true, 'message' => 'Notification updated']);
            break;

        case 'delete':
            $id = (int)($_GET['id'] ?? 0);
            if ($id <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid notification ID']);
                exit;
            }

            $stmt = $pdo->prepare("DELETE FROM notifications WHERE id = ?");
            $stmt->execute([$id]);

            echo json_encode(['success' => true, 'message' => 'Notification deleted']);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action. Use: list, create, update, delete']);
    }
} catch (PDOException $e) {
    error_log("Notifications API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
}
