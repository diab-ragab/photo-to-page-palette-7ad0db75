<?php
/**
 * cors_config.php - CORS Configuration
 * 
 * Place this file at: woiendgame.online/api/cors_config.php
 * Handles Cross-Origin Resource Sharing for frontend communication.
 */

// Allowed origins (add your domains here)
define('ALLOWED_ORIGINS', [
    'https://woiendgame.lovable.app',
    'https://woiendgame.online',
    'http://localhost:5173',
    'http://localhost:3000',
]);

// Pattern for Lovable preview domains
define('LOVABLE_PREVIEW_PATTERN', '/^https:\/\/[a-z0-9-]+--[a-f0-9-]+\.lovable\.app$/');

/**
 * Handle CORS headers dynamically
 */
function handleCors(array $allowedMethods = ['GET', 'POST', 'OPTIONS']): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    $isAllowed = in_array($origin, ALLOWED_ORIGINS) || 
                 preg_match(LOVABLE_PREVIEW_PATTERN, $origin);
    
    if ($isAllowed) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: ' . implode(', ', $allowedMethods));
        header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token, Accept');
        header('Access-Control-Max-Age: 86400');
    }
    
    // Handle preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
