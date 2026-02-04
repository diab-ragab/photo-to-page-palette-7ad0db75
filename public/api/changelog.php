<?php
/**
 * changelog.php - Changelog API
 * 
 * Handles changelog entries for version updates.
 * PHP 5.x compatible.
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/session_helper.php';

header('Content-Type: application/json; charset=utf-8');

$RID = generateRID();
$pdo = getDB();

// Create changelog table if not exists
function ensureChangelogTable($pdo) {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS changelog (
            id INT AUTO_INCREMENT PRIMARY KEY,
            version VARCHAR(20) NOT NULL,
            version_type ENUM('major', 'minor', 'patch', 'hotfix') NOT NULL DEFAULT 'patch',
            release_date DATE NOT NULL,
            is_published TINYINT(1) DEFAULT 1,
            created_at DATETIME DEFAULT NULL,
            updated_at DATETIME DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
    
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS changelog_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            changelog_id INT NOT NULL,
            change_type ENUM('add', 'fix', 'remove', 'change', 'security') NOT NULL DEFAULT 'add',
            description VARCHAR(255) NOT NULL,
            sort_order INT DEFAULT 0,
            FOREIGN KEY (changelog_id) REFERENCES changelog(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    ");
    
    // Insert sample data if empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM changelog");
    if ((int)$stmt->fetchColumn() === 0) {
        $pdo->exec("
            INSERT INTO changelog (version, version_type, release_date, is_published, created_at) VALUES
            ('v3.2.1', 'patch', CURDATE(), 1, NOW()),
            ('v3.2.0', 'minor', DATE_SUB(CURDATE(), INTERVAL 5 DAY), 1, NOW()),
            ('v3.1.0', 'minor', DATE_SUB(CURDATE(), INTERVAL 14 DAY), 1, NOW())
        ");
        
        $pdo->exec("
            INSERT INTO changelog_items (changelog_id, change_type, description, sort_order) VALUES
            (1, 'add', 'Passive skill notification', 1),
            (1, 'add', 'Hit marker & character title', 2),
            (1, 'fix', 'Added Ordiline Assassin chat commands for char management', 3),
            (2, 'add', 'Added new Halloween Dungeon', 1),
            (2, 'add', 'Pet System Enhancement (25 new pets)', 2),
            (2, 'fix', 'Gold dupe bug in marketplace', 3),
            (3, 'add', 'New PvP Arena System', 1),
            (3, 'add', 'Guild Wars feature', 2),
            (3, 'fix', 'Memory leak in dungeon instances', 3),
            (3, 'change', 'Improved server stability', 4)
        ");
    }
}

ensureChangelogTable($pdo);

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : 'list';

// Public: Get published changelog entries
if ($method === 'GET' && $action === 'list') {
    $limit = isset($_GET['limit']) ? min(20, max(1, (int)$_GET['limit'])) : 5;
    
    $stmt = $pdo->prepare("
        SELECT id, version, version_type, release_date
        FROM changelog 
        WHERE is_published = 1
        ORDER BY release_date DESC, id DESC
        LIMIT ?
    ");
    $stmt->execute([$limit]);
    $changelogs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get items for each changelog
    $itemStmt = $pdo->prepare("
        SELECT change_type, description 
        FROM changelog_items 
        WHERE changelog_id = ? 
        ORDER BY sort_order ASC
    ");
    
    foreach ($changelogs as &$log) {
        $itemStmt->execute([$log['id']]);
        $log['changes'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    jsonResponse(array('success' => true, 'changelogs' => $changelogs, 'rid' => $RID));
}

// ============ ADMIN ENDPOINTS ============

if (in_array($action, array('admin_list', 'admin_create', 'admin_update', 'admin_delete'))) {
    $user = requireAdmin();
}

// Admin: Get all changelog entries
if ($method === 'GET' && $action === 'admin_list') {
    $stmt = $pdo->query("
        SELECT id, version, version_type, release_date, is_published, created_at
        FROM changelog 
        ORDER BY release_date DESC, id DESC
    ");
    $changelogs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $itemStmt = $pdo->prepare("
        SELECT id, change_type, description, sort_order 
        FROM changelog_items 
        WHERE changelog_id = ? 
        ORDER BY sort_order ASC
    ");
    
    foreach ($changelogs as &$log) {
        $itemStmt->execute([$log['id']]);
        $log['changes'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    jsonResponse(array('success' => true, 'changelogs' => $changelogs, 'rid' => $RID));
}

// Admin: Create changelog
if ($method === 'POST' && $action === 'admin_create') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['version']) || empty($input['release_date'])) {
        jsonResponse(array('success' => false, 'message' => 'Version and release date are required'), 400);
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO changelog (version, version_type, release_date, is_published, created_at) 
        VALUES (?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $input['version'],
        isset($input['version_type']) ? $input['version_type'] : 'patch',
        $input['release_date'],
        isset($input['is_published']) ? (int)$input['is_published'] : 1
    ]);
    
    $changelogId = $pdo->lastInsertId();
    
    // Insert changes if provided
    if (!empty($input['changes']) && is_array($input['changes'])) {
        $itemStmt = $pdo->prepare("
            INSERT INTO changelog_items (changelog_id, change_type, description, sort_order) 
            VALUES (?, ?, ?, ?)
        ");
        foreach ($input['changes'] as $index => $change) {
            $itemStmt->execute([
                $changelogId,
                isset($change['change_type']) ? $change['change_type'] : 'add',
                $change['description'],
                $index
            ]);
        }
    }
    
    jsonResponse(array('success' => true, 'id' => $changelogId, 'rid' => $RID));
}

// Admin: Update changelog
if ($method === 'POST' && $action === 'admin_update') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['id'])) {
        jsonResponse(array('success' => false, 'message' => 'Changelog ID is required'), 400);
    }
    
    $stmt = $pdo->prepare("
        UPDATE changelog SET
            version = ?,
            version_type = ?,
            release_date = ?,
            is_published = ?,
            updated_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([
        $input['version'],
        isset($input['version_type']) ? $input['version_type'] : 'patch',
        $input['release_date'],
        isset($input['is_published']) ? (int)$input['is_published'] : 1,
        (int)$input['id']
    ]);
    
    // Replace changes
    $pdo->prepare("DELETE FROM changelog_items WHERE changelog_id = ?")->execute([(int)$input['id']]);
    
    if (!empty($input['changes']) && is_array($input['changes'])) {
        $itemStmt = $pdo->prepare("
            INSERT INTO changelog_items (changelog_id, change_type, description, sort_order) 
            VALUES (?, ?, ?, ?)
        ");
        foreach ($input['changes'] as $index => $change) {
            $itemStmt->execute([
                (int)$input['id'],
                isset($change['change_type']) ? $change['change_type'] : 'add',
                $change['description'],
                $index
            ]);
        }
    }
    
    jsonResponse(array('success' => true, 'rid' => $RID));
}

// Admin: Delete changelog
if ($method === 'POST' && $action === 'admin_delete') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['id'])) {
        jsonResponse(array('success' => false, 'message' => 'Changelog ID is required'), 400);
    }
    
    $stmt = $pdo->prepare("DELETE FROM changelog WHERE id = ?");
    $stmt->execute([(int)$input['id']]);
    
    jsonResponse(array('success' => true, 'rid' => $RID));
}

jsonResponse(array('success' => false, 'message' => 'Invalid action'), 400);
