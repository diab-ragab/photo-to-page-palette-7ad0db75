<?php
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
  'php' => PHP_VERSION,
  'curl' => extension_loaded('curl'),
  'openssl' => extension_loaded('openssl'),
  'json' => extension_loaded('json'),
], JSON_PRETTY_PRINT);
