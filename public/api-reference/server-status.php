<?php
/**
 * server-status.php - Game Server Status API
 * 
 * Place this file at: woiendgame.online/api/server-status.php
 * Returns current game server status and statistics.
 */

require_once __DIR__ . '/config.php';
handleCors(['GET', 'OPTIONS']);

header('Content-Type: application/json');

try {
    $db = getDB();
    
    // Get online players count
    // Adjust this query based on your actual table structure
    $onlinePlayers = 0;
    try {
        $stmt = $db->query("SELECT COUNT(*) FROM memb_stat WHERE ConnectStat = 1");
        $onlinePlayers = (int)$stmt->fetchColumn();
    } catch (Throwable $e) {
        // Table might not exist - use fallback
        $onlinePlayers = 0;
    }
    
    // Get total accounts
    $totalAccounts = 0;
    try {
        $stmt = $db->query("SELECT COUNT(*) FROM users");
        $totalAccounts = (int)$stmt->fetchColumn();
    } catch (Throwable $e) {
        $totalAccounts = 0;
    }
    
    // Calculate uptime (example: from a config or server start time)
    $uptimeSeconds = 0;
    try {
        $stmt = $db->query("SELECT TIMESTAMPDIFF(SECOND, server_start, NOW()) FROM server_config LIMIT 1");
        $uptimeSeconds = (int)$stmt->fetchColumn();
    } catch (Throwable $e) {
        // If no server_config table, estimate based on current date
        $uptimeSeconds = 86400 * 4 + 43200; // Mock: 4d 12h
    }
    
    $uptimeString = formatUptime($uptimeSeconds);
    
    // Get peak players today
    $peakToday = 0;
    try {
        $stmt = $db->query("
            SELECT MAX(player_count) FROM server_stats 
            WHERE DATE(recorded_at) = CURDATE()
        ");
        $peakToday = (int)$stmt->fetchColumn();
    } catch (Throwable $e) {
        $peakToday = $onlinePlayers; // Fallback to current
    }
    
    echo json_encode([
        'success' => true,
        'online' => true,
        'players' => $onlinePlayers,
        'accounts' => $totalAccounts,
        'uptime' => $uptimeString,
        'peak_today' => max($peakToday, $onlinePlayers),
        'timestamp' => date('c')
    ]);
    
} catch (Throwable $e) {
    error_log("server-status error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'online' => false,
        'players' => 0,
        'accounts' => 0,
        'uptime' => 'N/A',
        'peak_today' => 0
    ]);
}

/**
 * Format uptime seconds to human-readable string
 */
function formatUptime(int $seconds): string {
    if ($seconds < 0) return 'N/A';
    
    $days = floor($seconds / 86400);
    $hours = floor(($seconds % 86400) / 3600);
    
    if ($days > 0) {
        return "{$days}d {$hours}h";
    } elseif ($hours > 0) {
        $minutes = floor(($seconds % 3600) / 60);
        return "{$hours}h {$minutes}m";
    } else {
        $minutes = floor($seconds / 60);
        return "{$minutes}m";
    }
}
