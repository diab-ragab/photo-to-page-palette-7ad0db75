<?php
// api/notifications.php
// Notifications CRUD + Auto-send settings - uses PDO (getDB)

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';

try {
    $pdo = getDB();
    
    // Ensure auto_notification_settings table exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS auto_notification_settings (
        id INT PRIMARY KEY DEFAULT 1,
        daily_zen_enabled TINYINT(1) DEFAULT 0,
        spin_wheel_enabled TINYINT(1) DEFAULT 0,
        vote_streak_enabled TINYINT(1) DEFAULT 0,
        gamepass_enabled TINYINT(1) DEFAULT 0,
        last_daily_zen_sent DATE DEFAULT NULL,
        last_spin_wheel_sent DATE DEFAULT NULL,
        last_vote_streak_sent DATE DEFAULT NULL,
        last_gamepass_sent DATE DEFAULT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");
    
    // Insert default row if not exists
    $pdo->exec("INSERT IGNORE INTO auto_notification_settings (id) VALUES (1)");

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

        case 'auto_settings':
            // Get auto-notification settings
            $stmt = $pdo->query("SELECT daily_zen_enabled, spin_wheel_enabled, vote_streak_enabled, gamepass_enabled 
                                 FROM auto_notification_settings WHERE id = 1");
            $settings = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode($settings ?: [
                'daily_zen_enabled' => 0,
                'spin_wheel_enabled' => 0,
                'vote_streak_enabled' => 0,
                'gamepass_enabled' => 0
            ]);
            break;

        case 'update_auto_settings':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
                exit;
            }

            $dailyZen = !empty($input['daily_zen_enabled']) ? 1 : 0;
            $spinWheel = !empty($input['spin_wheel_enabled']) ? 1 : 0;
            $voteStreak = !empty($input['vote_streak_enabled']) ? 1 : 0;
            $gamepass = !empty($input['gamepass_enabled']) ? 1 : 0;

            $stmt = $pdo->prepare("UPDATE auto_notification_settings 
                                   SET daily_zen_enabled = ?, spin_wheel_enabled = ?, 
                                       vote_streak_enabled = ?, gamepass_enabled = ?
                                   WHERE id = 1");
            $stmt->execute([$dailyZen, $spinWheel, $voteStreak, $gamepass]);

            echo json_encode(['success' => true, 'message' => 'Auto-notification settings updated']);
            break;

        case 'trigger_auto_notifications':
            // This endpoint can be called by a cron job to send auto notifications
            $stmt = $pdo->query("SELECT * FROM auto_notification_settings WHERE id = 1");
            $settings = $stmt->fetch(PDO::FETCH_ASSOC);
            $today = date('Y-m-d');
            $sent = [];

            // Daily Zen notification
            if ($settings['daily_zen_enabled'] && $settings['last_daily_zen_sent'] !== $today) {
                $stmt = $pdo->prepare("INSERT INTO notifications (title, message, type, created_by, created_at, is_active) 
                                       VALUES (?, ?, ?, ?, NOW(), 1)");
                $stmt->execute(['⚡ Daily Zen Ready!', 'Your daily 100,000 Zen reward is ready to claim!', 'update', 'System']);
                $pdo->exec("UPDATE auto_notification_settings SET last_daily_zen_sent = '$today' WHERE id = 1");
                $sent[] = 'daily_zen';
            }

            // Spin Wheel notification
            if ($settings['spin_wheel_enabled'] && $settings['last_spin_wheel_sent'] !== $today) {
                $stmt = $pdo->prepare("INSERT INTO notifications (title, message, type, created_by, created_at, is_active) 
                                       VALUES (?, ?, ?, ?, NOW(), 1)");
                $stmt->execute(['🎰 Free Spin Available!', 'Your daily free spin on the Lucky Wheel is ready!', 'update', 'System']);
                $pdo->exec("UPDATE auto_notification_settings SET last_spin_wheel_sent = '$today' WHERE id = 1");
                $sent[] = 'spin_wheel';
            }

            // Vote Streak notification
            if ($settings['vote_streak_enabled'] && $settings['last_vote_streak_sent'] !== $today) {
                $stmt = $pdo->prepare("INSERT INTO notifications (title, message, type, created_by, created_at, is_active) 
                                       VALUES (?, ?, ?, ?, NOW(), 1)");
                $stmt->execute(['🔥 Vote to Keep Your Streak!', 'Don\'t forget to vote today and maintain your streak bonus!', 'update', 'System']);
                $pdo->exec("UPDATE auto_notification_settings SET last_vote_streak_sent = '$today' WHERE id = 1");
                $sent[] = 'vote_streak';
            }

            // Game Pass notification
            if ($settings['gamepass_enabled'] && $settings['last_gamepass_sent'] !== $today) {
                $stmt = $pdo->prepare("INSERT INTO notifications (title, message, type, created_by, created_at, is_active) 
                                       VALUES (?, ?, ?, ?, NOW(), 1)");
                $stmt->execute(['🎁 Game Pass Reward Unlocked!', 'A new daily Game Pass reward is waiting for you!', 'update', 'System']);
                $pdo->exec("UPDATE auto_notification_settings SET last_gamepass_sent = '$today' WHERE id = 1");
                $sent[] = 'gamepass';
            }

            echo json_encode(['success' => true, 'sent' => $sent, 'date' => $today]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action. Use: list, create, update, delete, auto_settings, update_auto_settings, trigger_auto_notifications']);
    }
} catch (PDOException $e) {
    error_log("Notifications API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
}
