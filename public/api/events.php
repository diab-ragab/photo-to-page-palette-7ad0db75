<?php
/**
 * events.php - Events Calendar API
 * 
 * Handles event listing and CRUD for admin.
 * PHP 5.x compatible.
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';

header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();
$pdo = getDB();

// Create events table if not exists
function ensureEventsTable($pdo) {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(100) NOT NULL,
            description TEXT,
            event_type ENUM('double_xp', 'double_drops', 'bonus_vote', 'sale', 'maintenance', 'update', 'pvp', 'boss', 'custom') NOT NULL DEFAULT 'custom',
            start_date DATETIME NOT NULL,
            end_date DATETIME NOT NULL,
            all_day TINYINT(1) DEFAULT 0,
            color VARCHAR(20) DEFAULT '#3b82f6',
            banner_url VARCHAR(500),
            is_active TINYINT(1) DEFAULT 1,
            is_featured TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT NULL,
            updated_at DATETIME DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
    
    // Insert sample events if empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM events");
    if ((int)$stmt->fetchColumn() === 0) {
        $now = date('Y-m-d H:i:s');
        $sampleEvents = array(
            array(
                'Weekend Double XP',
                'Earn double experience points all weekend long!',
                'double_xp',
                date('Y-m-d 00:00:00', strtotime('next saturday')),
                date('Y-m-d 23:59:59', strtotime('next sunday')),
                1,
                '#22c55e',
                1
            ),
            array(
                'Server Maintenance',
                'Scheduled maintenance for server updates.',
                'maintenance',
                date('Y-m-d 06:00:00', strtotime('+3 days')),
                date('Y-m-d 08:00:00', strtotime('+3 days')),
                0,
                '#f59e0b',
                0
            ),
            array(
                'Boss Hunt Event',
                'Special boss spawns with increased drop rates!',
                'boss',
                date('Y-m-d 18:00:00', strtotime('+5 days')),
                date('Y-m-d 22:00:00', strtotime('+5 days')),
                0,
                '#ef4444',
                1
            ),
        );
        
        $stmt = $pdo->prepare("
            INSERT INTO events 
            (title, description, event_type, start_date, end_date, all_day, color, is_featured, is_active, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
        ");
        
        foreach ($sampleEvents as $evt) {
            $stmt->execute($evt);
        }
    }
}

ensureEventsTable($pdo);

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : 'list';

// Public: Get active events
if ($method === 'GET' && $action === 'list') {
    $month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('m');
    $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
    
    // Get events for the month (including ones that span into it)
    $startOfMonth = sprintf('%04d-%02d-01 00:00:00', $year, $month);
    $endOfMonth = date('Y-m-t 23:59:59', strtotime($startOfMonth));
    
    $stmt = $pdo->prepare("
        SELECT id, title, description, event_type, start_date, end_date, all_day, color, banner_url, is_featured
        FROM events 
        WHERE is_active = 1 
        AND (
            (start_date BETWEEN ? AND ?) OR
            (end_date BETWEEN ? AND ?) OR
            (start_date <= ? AND end_date >= ?)
        )
        ORDER BY start_date ASC
    ");
    $stmt->execute([$startOfMonth, $endOfMonth, $startOfMonth, $endOfMonth, $startOfMonth, $endOfMonth]);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse(array(
        'success' => true, 
        'events' => $events, 
        'month' => $month,
        'year' => $year,
        'rid' => $RID
    ));
}

// Public: Get upcoming events
if ($method === 'GET' && $action === 'upcoming') {
    $limit = isset($_GET['limit']) ? min(20, max(1, (int)$_GET['limit'])) : 5;
    
    $stmt = $pdo->prepare("
        SELECT id, title, description, event_type, start_date, end_date, all_day, color, banner_url, is_featured
        FROM events 
        WHERE is_active = 1 AND end_date >= NOW()
        ORDER BY start_date ASC
        LIMIT ?
    ");
    $stmt->execute([$limit]);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse(array('success' => true, 'events' => $events, 'rid' => $RID));
}

// Public: Get current/active events
if ($method === 'GET' && $action === 'current') {
    $stmt = $pdo->query("
        SELECT id, title, description, event_type, start_date, end_date, all_day, color, banner_url, is_featured
        FROM events 
        WHERE is_active = 1 AND start_date <= NOW() AND end_date >= NOW()
        ORDER BY is_featured DESC, end_date ASC
    ");
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse(array('success' => true, 'events' => $events, 'rid' => $RID));
}

// ============ ADMIN ENDPOINTS ============

if (in_array($action, array('admin_list', 'admin_create', 'admin_update', 'admin_delete', 'admin_stats'))) {
    $user = requireAdmin();
}

// Admin: Get all events
if ($method === 'GET' && $action === 'admin_list') {
    $stmt = $pdo->query("SELECT * FROM events ORDER BY start_date DESC");
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse(array('success' => true, 'events' => $events, 'rid' => $RID));
}

// Admin: Create event
if ($method === 'POST' && $action === 'admin_create') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['title']) || empty($input['start_date']) || empty($input['end_date'])) {
        jsonResponse(array('success' => false, 'message' => 'Title, start date, and end date are required'), 400);
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO events 
        (title, description, event_type, start_date, end_date, all_day, color, banner_url, is_active, is_featured, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $input['title'],
        isset($input['description']) ? $input['description'] : '',
        isset($input['event_type']) ? $input['event_type'] : 'custom',
        $input['start_date'],
        $input['end_date'],
        isset($input['all_day']) ? (int)$input['all_day'] : 0,
        isset($input['color']) ? $input['color'] : '#3b82f6',
        isset($input['banner_url']) ? $input['banner_url'] : null,
        isset($input['is_active']) ? (int)$input['is_active'] : 1,
        isset($input['is_featured']) ? (int)$input['is_featured'] : 0
    ]);
    
    jsonResponse(array('success' => true, 'id' => $pdo->lastInsertId(), 'rid' => $RID));
}

// Admin: Update event
if ($method === 'POST' && $action === 'admin_update') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['id'])) {
        jsonResponse(array('success' => false, 'message' => 'Event ID is required'), 400);
    }
    
    $stmt = $pdo->prepare("
        UPDATE events SET
            title = ?,
            description = ?,
            event_type = ?,
            start_date = ?,
            end_date = ?,
            all_day = ?,
            color = ?,
            banner_url = ?,
            is_active = ?,
            is_featured = ?,
            updated_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([
        $input['title'],
        isset($input['description']) ? $input['description'] : '',
        isset($input['event_type']) ? $input['event_type'] : 'custom',
        $input['start_date'],
        $input['end_date'],
        isset($input['all_day']) ? (int)$input['all_day'] : 0,
        isset($input['color']) ? $input['color'] : '#3b82f6',
        isset($input['banner_url']) ? $input['banner_url'] : null,
        isset($input['is_active']) ? (int)$input['is_active'] : 1,
        isset($input['is_featured']) ? (int)$input['is_featured'] : 0,
        (int)$input['id']
    ]);
    
    jsonResponse(array('success' => true, 'rid' => $RID));
}

// Admin: Delete event
if ($method === 'POST' && $action === 'admin_delete') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['id'])) {
        jsonResponse(array('success' => false, 'message' => 'Event ID is required'), 400);
    }
    
    $stmt = $pdo->prepare("DELETE FROM events WHERE id = ?");
    $stmt->execute([(int)$input['id']]);
    
    jsonResponse(array('success' => true, 'rid' => $RID));
}

// Admin: Get stats
if ($method === 'GET' && $action === 'admin_stats') {
    $stats = array(
        'total_events' => 0,
        'active_events' => 0,
        'upcoming_events' => 0,
        'past_events' => 0,
        'by_type' => array()
    );
    
    $stmt = $pdo->query("SELECT COUNT(*) FROM events");
    $stats['total_events'] = (int)$stmt->fetchColumn();
    
    $stmt = $pdo->query("SELECT COUNT(*) FROM events WHERE is_active = 1 AND start_date <= NOW() AND end_date >= NOW()");
    $stats['active_events'] = (int)$stmt->fetchColumn();
    
    $stmt = $pdo->query("SELECT COUNT(*) FROM events WHERE is_active = 1 AND start_date > NOW()");
    $stats['upcoming_events'] = (int)$stmt->fetchColumn();
    
    $stmt = $pdo->query("SELECT COUNT(*) FROM events WHERE end_date < NOW()");
    $stats['past_events'] = (int)$stmt->fetchColumn();
    
    $stmt = $pdo->query("SELECT event_type, COUNT(*) as count FROM events GROUP BY event_type");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $stats['by_type'][$row['event_type']] = (int)$row['count'];
    }
    
    jsonResponse(array('success' => true, 'stats' => $stats, 'rid' => $RID));
}

jsonResponse(array('success' => false, 'message' => 'Invalid action'), 400);
