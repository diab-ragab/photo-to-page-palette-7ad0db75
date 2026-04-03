<?php
/**
 * gamepass_extend.php - DEPRECATED
 * Extensions are no longer supported in the Global 30-Day Season model.
 * All players share the same season timeline. Premium pass lasts until season end.
 */

require_once __DIR__ . '/bootstrap.php';
handleCors(array('POST', 'OPTIONS'));
header('Content-Type: application/json; charset=utf-8');

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($method === 'OPTIONS') { http_response_code(204); exit; }

http_response_code(410);
echo json_encode(array(
  'success' => false,
  'error' => 'Game Pass extensions are no longer available. The Premium Pass now follows the global 30-day season.'
));
