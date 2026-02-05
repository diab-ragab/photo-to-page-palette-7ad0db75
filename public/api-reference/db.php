<?php
// api/db.php
// Unified DB connection (PDO singleton)
// PHP 5.x compatible - no return type hints, no ?? operator

// Config is loaded via bootstrap.php - don't require config.php separately

if (!function_exists('getDB')) {
  function getDB() {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $cfg = getConfig();
    $db  = isset($cfg['db']) ? $cfg['db'] : array();

    $host = isset($db['host']) ? $db['host'] : '192.168.1.88';
    $name = isset($db['name']) ? $db['name'] : 'shengui';
    $user = isset($db['user']) ? $db['user'] : 'root';
    $pass = isset($db['pass']) ? $db['pass'] : 'root';
    $charset = isset($db['charset']) ? $db['charset'] : 'utf8';

    $dsn = "mysql:host={$host};dbname={$name};charset={$charset}";

    $pdo = new PDO($dsn, $user, $pass, array(
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES   => false,
    ));

    return $pdo;
  }
}
