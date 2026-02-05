<?php
// api/diag.php - Simple PHP diagnostics
// PHP 5.x compatible

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

echo json_encode(array(
  'php' => PHP_VERSION,
  'curl' => extension_loaded('curl'),
  'openssl' => extension_loaded('openssl'),
  'json' => extension_loaded('json'),
), JSON_PRETTY_PRINT);
