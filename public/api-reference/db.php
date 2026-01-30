<?php
// api/db.php
// Unified DB connection (PDO singleton)

// Config is loaded via bootstrap.php - don't require config.php separately

if (!function_exists('getDB')) {
  function getDB(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $cfg = getConfig();
    $db  = $cfg['db'] ?? [];

    $host = $db['host'] ?? '192.168.1.88';
    $name = $db['name'] ?? 'shengui';
    $user = $db['user'] ?? 'root';
    $pass = $db['pass'] ?? 'root';
    $charset = $db['charset'] ?? 'utf8';

    $dsn = "mysql:host={$host};dbname={$name};charset={$charset}";

    $pdo = new PDO($dsn, $user, $pass, [
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

    return $pdo;
  }
}
