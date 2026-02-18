<?php
/**
 * lottery.php - Daily Lottery System API
 * PHP 5.x compatible - NO closures, NO ??, NO short arrays
 */

require_once __DIR__ . '/bootstrap.php';
handleCors(array('GET','POST','OPTIONS'));
require_once __DIR__ . '/session_helper.php';

header('Content-Type: application/json; charset=utf8');

$RID = generateRID();
$pdo = getDB();

// ── helpers ────────────────────────────────────────────────────────────

function lotteryJson($arr, $code = 200) {
    http_response_code((int)$code);
    echo json_encode($arr);
    exit;
}

function getClientIpLottery() {
    $headers = array('HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR');
    foreach ($headers as $h) {
        if (!empty($_SERVER[$h])) {
            $ip = trim(strtok($_SERVER[$h], ','));
            if (filter_var($ip, FILTER_VALIDATE_IP)) return $ip;
        }
    }
    return '0.0.0.0';
}

function getIpSubnetLottery($ip) {
    if (strpos($ip, ':') !== false) {
        $parts = explode(':', $ip);
        return implode(':', array_slice($parts, 0, 4));
    }
    $parts = explode('.', $ip);
    if (count($parts) >= 3) return $parts[0] . '.' . $parts[1] . '.' . $parts[2];
    return $ip;
}

function lotteryLog($pdo, $userId, $ip, $action, $details) {
    $stmt = $pdo->prepare("INSERT INTO lottery_security_log (user_id, ip_address, action_type, details, created_at) VALUES (?,?,?,?,NOW())");
    $stmt->execute(array((int)$userId, (string)$ip, (string)$action, (string)$details));
}

// ── ensure tables ─────────────────────────────────────────────────────

function ensureLotteryTables($pdo) {
    $sqlFile = __DIR__ . '/sql/lottery_schema.sql';
    if (!file_exists($sqlFile)) return;

    // Check if main table exists
    try {
        $pdo->query("SELECT 1 FROM lottery_settings LIMIT 1");
        return; // tables already exist
    } catch (Exception $e) {
        // tables missing, create them
    }

    $sql = file_get_contents($sqlFile);
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    foreach ($statements as $stmt) {
        if ($stmt === '' || strpos($stmt, '--') === 0) continue;
        try {
            $pdo->exec($stmt);
        } catch (Exception $e) {
            error_log('[Lottery] Schema exec error: ' . $e->getMessage());
        }
    }
}

ensureLotteryTables($pdo);

// ── settings loader ───────────────────────────────────────────────────

function getLotterySettings($pdo) {
    $stmt = $pdo->query("SELECT setting_key, setting_value FROM lottery_settings");
    $settings = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    $defaults = array(
        'enabled' => '1',
        'min_entry_zen' => '50000',
        'max_entries_per_day' => '10',
        'free_entries_per_day' => '1',
        'winners_per_draw' => '3',
        'reward_multiplier' => '3',
        'draw_hour' => '20',
        'draw_minute' => '0',
    );
    foreach ($defaults as $k => $v) {
        if (!isset($settings[$k])) $settings[$k] = $v;
    }
    return $settings;
}

// ── get or create today's draw ────────────────────────────────────────

function getTodayDraw($pdo) {
    $today = date('Y-m-d');
    $stmt = $pdo->prepare("SELECT * FROM lottery_draws WHERE draw_date = ?");
    $stmt->execute(array($today));
    $draw = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($draw) return $draw;

    $stmt = $pdo->prepare("INSERT INTO lottery_draws (draw_date, total_pool, total_entries, status, created_at) VALUES (?, 0, 0, 'open', NOW())");
    $stmt->execute(array($today));
    $drawId = (int)$pdo->lastInsertId();

    $stmt = $pdo->prepare("SELECT * FROM lottery_draws WHERE id = ?");
    $stmt->execute(array($drawId));
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

// ── anti-abuse checks ─────────────────────────────────────────────────

function isLotteryBanned($pdo, $userId) {
    $stmt = $pdo->prepare("SELECT id FROM lottery_bans WHERE user_id = ? AND is_active = 1 LIMIT 1");
    $stmt->execute(array((int)$userId));
    return $stmt->fetch() ? true : false;
}

function detectAbuseSignals($pdo, $drawId, $userId, $ip, $subnet, $fingerprint, $deviceHash) {
    $flags = array();

    // 1) Same fingerprint used by different user_id in same draw
    if ($fingerprint !== '') {
        $stmt = $pdo->prepare("SELECT DISTINCT user_id FROM lottery_entries WHERE draw_id = ? AND fingerprint = ? AND user_id != ? AND is_flagged = 0");
        $stmt->execute(array((int)$drawId, $fingerprint, (int)$userId));
        if ($stmt->fetch()) {
            $flags[] = 'multi_account_fingerprint';
        }
    }

    // 2) Same device hash used by different user
    if ($deviceHash !== '') {
        $stmt = $pdo->prepare("SELECT DISTINCT user_id FROM lottery_entries WHERE draw_id = ? AND device_hash = ? AND user_id != ? AND is_flagged = 0");
        $stmt->execute(array((int)$drawId, $deviceHash, (int)$userId));
        if ($stmt->fetch()) {
            $flags[] = 'multi_account_device';
        }
    }

    // 3) Same subnet with 3+ different users in same draw
    if ($subnet !== '') {
        $stmt = $pdo->prepare("SELECT COUNT(DISTINCT user_id) FROM lottery_entries WHERE draw_id = ? AND ip_subnet = ? AND is_flagged = 0");
        $stmt->execute(array((int)$drawId, $subnet));
        $subnetUsers = (int)$stmt->fetchColumn();
        if ($subnetUsers >= 3) {
            $flags[] = 'subnet_farming';
        }
    }

    // 4) Rapid entries (more than 5 entries within 60 seconds)
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM lottery_entries WHERE user_id = ? AND draw_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)");
    $stmt->execute(array((int)$userId, (int)$drawId));
    if ((int)$stmt->fetchColumn() >= 5) {
        $flags[] = 'rapid_entries';
    }

    return $flags;
}

function autoDisqualify($pdo, $drawId, $userId, $reason, $ip) {
    // Flag all entries from this user in this draw
    $stmt = $pdo->prepare("UPDATE lottery_entries SET is_flagged = 1, flag_reason = ? WHERE draw_id = ? AND user_id = ?");
    $stmt->execute(array($reason, (int)$drawId, (int)$userId));

    // Ban user
    $stmt = $pdo->prepare("INSERT INTO lottery_bans (user_id, reason, banned_by, is_active, created_at) VALUES (?, ?, 'system', 1, NOW())");
    $stmt->execute(array((int)$userId, 'Auto-ban: ' . $reason));

    lotteryLog($pdo, $userId, $ip, 'auto_disqualify', $reason);
}

// ── account name resolver ─────────────────────────────────────────────

function getLotteryAccountName($pdo, $userId) {
    $candidates = array('name', 'login', 'username');
    foreach ($candidates as $col) {
        try {
            $stmt = $pdo->prepare("SELECT `$col` AS acct FROM users WHERE ID = ? LIMIT 1");
            $stmt->execute(array((int)$userId));
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row && isset($row['acct']) && $row['acct'] !== '') return (string)$row['acct'];
        } catch (Exception $e) {}
    }
    return 'User#' . $userId;
}

// ── Zen balance helpers ───────────────────────────────────────────────

function getLotteryZenBalance($pdo, $userId) {
    // Try goldtab_sg first (game database)
    try {
        $stmt = $pdo->prepare("SELECT Gold FROM goldtab_sg WHERE AccountID = ? LIMIT 1");
        $stmt->execute(array((int)$userId));
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) return (int)$row['Gold'];
    } catch (Exception $e) {}

    // Try by account name
    $name = getLotteryAccountName($pdo, $userId);
    if ($name !== 'User#' . $userId) {
        try {
            $stmt = $pdo->prepare("SELECT Gold FROM goldtab_sg WHERE AccountID = ? LIMIT 1");
            $stmt->execute(array($name));
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) return (int)$row['Gold'];
        } catch (Exception $e) {}
    }

    return 0;
}

function deductLotteryZen($pdo, $userId, $amount) {
    $amount = (int)$amount;
    // Try numeric first
    try {
        $stmt = $pdo->prepare("UPDATE goldtab_sg SET Gold = Gold - ? WHERE AccountID = ? AND Gold >= ?");
        $stmt->execute(array($amount, (int)$userId, $amount));
        if ($stmt->rowCount() > 0) return true;
    } catch (Exception $e) {}

    // Try by name
    $name = getLotteryAccountName($pdo, $userId);
    if ($name !== 'User#' . $userId) {
        try {
            $stmt = $pdo->prepare("UPDATE goldtab_sg SET Gold = Gold - ? WHERE AccountID = ? AND Gold >= ?");
            $stmt->execute(array($amount, $name, $amount));
            if ($stmt->rowCount() > 0) return true;
        } catch (Exception $e) {}
    }

    return false;
}

function addLotteryZen($pdo, $userId, $amount) {
    $amount = (int)$amount;
    try {
        $stmt = $pdo->prepare("UPDATE goldtab_sg SET Gold = Gold + ? WHERE AccountID = ?");
        $stmt->execute(array($amount, (int)$userId));
        if ($stmt->rowCount() > 0) return true;
    } catch (Exception $e) {}

    $name = getLotteryAccountName($pdo, $userId);
    if ($name !== 'User#' . $userId) {
        try {
            $stmt = $pdo->prepare("UPDATE goldtab_sg SET Gold = Gold + ? WHERE AccountID = ?");
            $stmt->execute(array($amount, $name));
            if ($stmt->rowCount() > 0) return true;
        } catch (Exception $e) {}
    }
    return false;
}

// ── bonus entries ─────────────────────────────────────────────────────

function getUserBonusEntries($pdo, $userId) {
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(entries_available), 0) FROM lottery_bonus_entries WHERE user_id = ? AND entries_available > 0");
    $stmt->execute(array((int)$userId));
    return (int)$stmt->fetchColumn();
}

function consumeBonusEntry($pdo, $userId) {
    $stmt = $pdo->prepare("SELECT id, entries_available FROM lottery_bonus_entries WHERE user_id = ? AND entries_available > 0 ORDER BY granted_at ASC LIMIT 1");
    $stmt->execute(array((int)$userId));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) return false;
    $newVal = (int)$row['entries_available'] - 1;
    if ($newVal <= 0) {
        $stmt = $pdo->prepare("DELETE FROM lottery_bonus_entries WHERE id = ?");
        $stmt->execute(array((int)$row['id']));
    } else {
        $stmt = $pdo->prepare("UPDATE lottery_bonus_entries SET entries_available = ? WHERE id = ?");
        $stmt->execute(array($newVal, (int)$row['id']));
    }
    return true;
}

// ══════════════════════════════════════════════════════════════════════
//  ROUTE HANDLER
// ══════════════════════════════════════════════════════════════════════

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
$action = isset($_GET['action']) ? $_GET['action'] : '';
$settings = getLotterySettings($pdo);

// ── PUBLIC: GET status ────────────────────────────────────────────────

if ($method === 'GET' && $action === 'status') {
    $draw = getTodayDraw($pdo);
    $drawId = (int)$draw['id'];
    $enabled = ($settings['enabled'] === '1');
    $drawHour   = (int)$settings['draw_hour'];
    $drawMinute = (int)$settings['draw_minute'];

    // Calculate seconds until draw
    $nowTs = time();
    $drawTs = mktime($drawHour, $drawMinute, 0);
    if ($drawTs <= $nowTs) $drawTs += 86400; // tomorrow
    $secondsUntilDraw = $drawTs - $nowTs;

    $response = array(
        'success'           => true,
        'enabled'           => $enabled,
        'draw_id'           => $drawId,
        'draw_date'         => $draw['draw_date'],
        'draw_status'       => $draw['status'],
        'total_pool'        => (int)$draw['total_pool'],
        'total_entries'     => (int)$draw['total_entries'],
        'min_entry_zen'     => (int)$settings['min_entry_zen'],
        'max_entries_per_day'=> (int)$settings['max_entries_per_day'],
        'reward_multiplier' => (int)$settings['reward_multiplier'],
        'seconds_until_draw'=> $secondsUntilDraw,
        'draw_time'         => sprintf('%02d:%02d', $drawHour, $drawMinute),
        'server_time'       => $nowTs,
        'rid'               => $RID,
    );

    // If user is logged in, add personal data
    $token = '';
    if (isset($_GET['sessionToken'])) $token = $_GET['sessionToken'];
    if ($token === '') {
        $h = isset($_SERVER['HTTP_X_SESSION_TOKEN']) ? $_SERVER['HTTP_X_SESSION_TOKEN'] : '';
        if ($h !== '') $token = $h;
    }
    if ($token !== '') {
        try {
            $sessionRow = resolveSessionRow($token);
            if ($sessionRow && !isSessionExpired($sessionRow['expires_at'])) {
                $uid = (int)$sessionRow['user_id'];

                // User's entries today
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM lottery_entries WHERE draw_id = ? AND user_id = ? AND is_flagged = 0");
                $stmt->execute(array($drawId, $uid));
                $userEntries = (int)$stmt->fetchColumn();

                // User's total zen entered
                $stmt = $pdo->prepare("SELECT COALESCE(SUM(zen_amount), 0) FROM lottery_entries WHERE draw_id = ? AND user_id = ? AND is_flagged = 0");
                $stmt->execute(array($drawId, $uid));
                $userZenEntered = (int)$stmt->fetchColumn();

                // Free entries used
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM lottery_entries WHERE draw_id = ? AND user_id = ? AND entry_type = 'free'");
                $stmt->execute(array($drawId, $uid));
                $freeUsed = (int)$stmt->fetchColumn();

                $bonusEntries = getUserBonusEntries($pdo, $uid);
                $isBanned = isLotteryBanned($pdo, $uid);
                $freePerDay = (int)$settings['free_entries_per_day'];
                $maxPerDay = (int)$settings['max_entries_per_day'];

                // Win chance
                $totalPool = (int)$draw['total_pool'];
                $winChance = ($totalPool > 0 && $userZenEntered > 0) 
                    ? round(($userZenEntered / $totalPool) * 100, 2) 
                    : 0;

                $response['user'] = array(
                    'entries_today'       => $userEntries,
                    'zen_entered'         => $userZenEntered,
                    'free_entries_remaining' => max(0, $freePerDay - $freeUsed),
                    'bonus_entries'       => $bonusEntries,
                    'max_entries'         => $maxPerDay,
                    'can_enter'           => !$isBanned && $enabled && ($draw['status'] === 'open') && ($userEntries < $maxPerDay),
                    'is_banned'           => $isBanned,
                    'win_chance'          => $winChance,
                );
            }
        } catch (Exception $e) {
            // ignore, just return public data
        }
    }

    lotteryJson($response);
}

// ── PUBLIC: GET winners (recent) ──────────────────────────────────────

if ($method === 'GET' && $action === 'winners') {
    $limit = isset($_GET['limit']) ? min(50, max(1, (int)$_GET['limit'])) : 10;

    $stmt = $pdo->prepare("
        SELECT lw.*, ld.draw_date
        FROM lottery_winners lw
        JOIN lottery_draws ld ON ld.id = lw.draw_id
        WHERE ld.status = 'completed'
        ORDER BY lw.created_at DESC
        LIMIT ?
    ");
    $stmt->execute(array($limit));
    $winners = $stmt->fetchAll(PDO::FETCH_ASSOC);

    lotteryJson(array('success' => true, 'winners' => $winners, 'rid' => $RID));
}

// ── AUTH: POST enter ──────────────────────────────────────────────────

if ($method === 'POST' && $action === 'enter') {
    $user = requireAuth();
    $userId = isset($user['user_id']) ? (int)$user['user_id'] : (int)$user['id'];
    $username = getLotteryAccountName($pdo, $userId);
    $ip = getClientIpLottery();
    $subnet = getIpSubnetLottery($ip);

    $input = getJsonInput();
    $zenAmount = isset($input['zen_amount']) ? (int)$input['zen_amount'] : 0;
    $entryType = isset($input['entry_type']) ? (string)$input['entry_type'] : 'zen';
    $fingerprint = isset($input['fingerprint']) ? (string)$input['fingerprint'] : '';
    $deviceHash  = isset($input['device_hash']) ? (string)$input['device_hash'] : '';

    if ($settings['enabled'] !== '1') {
        lotteryJson(array('success' => false, 'message' => 'Lottery is currently disabled.', 'rid' => $RID), 403);
    }

    if (isLotteryBanned($pdo, $userId)) {
        lotteryJson(array('success' => false, 'message' => 'Your account has been banned from the lottery.', 'rid' => $RID), 403);
    }

    $draw = getTodayDraw($pdo);
    $drawId = (int)$draw['id'];

    if ($draw['status'] !== 'open') {
        lotteryJson(array('success' => false, 'message' => 'Today\'s lottery draw is no longer accepting entries.', 'rid' => $RID), 400);
    }

    // Check max entries
    $maxPerDay = (int)$settings['max_entries_per_day'];
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM lottery_entries WHERE draw_id = ? AND user_id = ? AND is_flagged = 0");
    $stmt->execute(array($drawId, $userId));
    $currentEntries = (int)$stmt->fetchColumn();

    if ($currentEntries >= $maxPerDay) {
        lotteryJson(array('success' => false, 'message' => 'You have reached the maximum entries for today.', 'rid' => $RID), 429);
    }

    // Anti-abuse check
    $abuseFlags = detectAbuseSignals($pdo, $drawId, $userId, $ip, $subnet, $fingerprint, $deviceHash);
    if (count($abuseFlags) > 0) {
        $reason = implode(', ', $abuseFlags);
        autoDisqualify($pdo, $drawId, $userId, $reason, $ip);
        lotteryJson(array('success' => false, 'message' => 'Suspicious activity detected. Your entries have been flagged.', 'rid' => $RID), 403);
    }

    // Handle entry types
    $actualZen = 0;
    $actualType = 'zen';

    if ($entryType === 'free') {
        // Check free entries remaining
        $freePerDay = (int)$settings['free_entries_per_day'];
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM lottery_entries WHERE draw_id = ? AND user_id = ? AND entry_type = 'free'");
        $stmt->execute(array($drawId, $userId));
        $freeUsed = (int)$stmt->fetchColumn();
        if ($freeUsed >= $freePerDay) {
            lotteryJson(array('success' => false, 'message' => 'No free entries remaining today.', 'rid' => $RID), 400);
        }
        $actualZen = 0;
        $actualType = 'free';

    } else if ($entryType === 'bonus') {
        $bonusAvailable = getUserBonusEntries($pdo, $userId);
        if ($bonusAvailable <= 0) {
            lotteryJson(array('success' => false, 'message' => 'No bonus entries available.', 'rid' => $RID), 400);
        }
        $consumed = consumeBonusEntry($pdo, $userId);
        if (!$consumed) {
            lotteryJson(array('success' => false, 'message' => 'Failed to use bonus entry.', 'rid' => $RID), 500);
        }
        $actualZen = $zenAmount > 0 ? $zenAmount : 0;
        $actualType = 'bonus';

        // If bonus entry has zen, deduct it
        if ($actualZen > 0) {
            $minZen = (int)$settings['min_entry_zen'];
            if ($actualZen < $minZen) {
                lotteryJson(array('success' => false, 'message' => 'Minimum entry is ' . number_format($minZen) . ' Zen.', 'rid' => $RID), 400);
            }
            $deducted = deductLotteryZen($pdo, $userId, $actualZen);
            if (!$deducted) {
                lotteryJson(array('success' => false, 'message' => 'Insufficient Zen balance.', 'rid' => $RID), 400);
            }
        }

    } else {
        // Paid entry
        $minZen = (int)$settings['min_entry_zen'];
        if ($zenAmount < $minZen) {
            lotteryJson(array('success' => false, 'message' => 'Minimum entry is ' . number_format($minZen) . ' Zen.', 'rid' => $RID), 400);
        }
        $actualZen = $zenAmount;
        $actualType = 'zen';

        $deducted = deductLotteryZen($pdo, $userId, $actualZen);
        if (!$deducted) {
            lotteryJson(array('success' => false, 'message' => 'Insufficient Zen balance.', 'rid' => $RID), 400);
        }
    }

    // Insert entry
    $stmt = $pdo->prepare("
        INSERT INTO lottery_entries (draw_id, user_id, username, zen_amount, entry_type, fingerprint, ip_address, ip_subnet, device_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute(array($drawId, $userId, $username, $actualZen, $actualType, $fingerprint, $ip, $subnet, $deviceHash));

    // Update draw totals
    $stmt = $pdo->prepare("UPDATE lottery_draws SET total_pool = total_pool + ?, total_entries = total_entries + 1 WHERE id = ?");
    $stmt->execute(array($actualZen, $drawId));

    lotteryLog($pdo, $userId, $ip, 'entry', 'type=' . $actualType . ' zen=' . $actualZen);

    // Refresh user data
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM lottery_entries WHERE draw_id = ? AND user_id = ? AND is_flagged = 0");
    $stmt->execute(array($drawId, $userId));
    $newEntryCount = (int)$stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT COALESCE(SUM(zen_amount), 0) FROM lottery_entries WHERE draw_id = ? AND user_id = ? AND is_flagged = 0");
    $stmt->execute(array($drawId, $userId));
    $newZenTotal = (int)$stmt->fetchColumn();

    // Updated pool
    $stmt = $pdo->prepare("SELECT total_pool FROM lottery_draws WHERE id = ?");
    $stmt->execute(array($drawId));
    $newPool = (int)$stmt->fetchColumn();

    $winChance = ($newPool > 0 && $newZenTotal > 0)
        ? round(($newZenTotal / $newPool) * 100, 2)
        : 0;

    lotteryJson(array(
        'success' => true,
        'message' => $actualType === 'free' ? 'Free entry submitted!' : 'Entry submitted! ' . number_format($actualZen) . ' Zen entered.',
        'entry_type' => $actualType,
        'zen_amount' => $actualZen,
        'entries_today' => $newEntryCount,
        'total_pool' => $newPool,
        'win_chance' => $winChance,
        'rid' => $RID,
    ));
}

// ── AUTH: GET my_entries ───────────────────────────────────────────────

if ($method === 'GET' && $action === 'my_entries') {
    $user = requireAuth();
    $userId = isset($user['user_id']) ? (int)$user['user_id'] : (int)$user['id'];
    $draw = getTodayDraw($pdo);

    $stmt = $pdo->prepare("SELECT id, zen_amount, entry_type, is_flagged, created_at FROM lottery_entries WHERE draw_id = ? AND user_id = ? ORDER BY created_at DESC");
    $stmt->execute(array((int)$draw['id'], $userId));
    $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);

    lotteryJson(array('success' => true, 'entries' => $entries, 'rid' => $RID));
}

// ── AUTH: GET my_wins ─────────────────────────────────────────────────

if ($method === 'GET' && $action === 'my_wins') {
    $user = requireAuth();
    $userId = isset($user['user_id']) ? (int)$user['user_id'] : (int)$user['id'];

    $stmt = $pdo->prepare("
        SELECT lw.*, ld.draw_date
        FROM lottery_winners lw
        JOIN lottery_draws ld ON ld.id = lw.draw_id
        WHERE lw.user_id = ?
        ORDER BY lw.created_at DESC
        LIMIT 20
    ");
    $stmt->execute(array($userId));
    $wins = $stmt->fetchAll(PDO::FETCH_ASSOC);

    lotteryJson(array('success' => true, 'wins' => $wins, 'rid' => $RID));
}

// ══════════════════════════════════════════════════════════════════════
//  ADMIN ENDPOINTS
// ══════════════════════════════════════════════════════════════════════

// ── ADMIN: GET admin_status ───────────────────────────────────────────

if ($method === 'GET' && $action === 'admin_status') {
    $admin = requireAdmin();

    $draw = getTodayDraw($pdo);
    $drawId = (int)$draw['id'];

    // All entries for today
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM lottery_entries WHERE draw_id = ?");
    $stmt->execute(array($drawId));
    $totalEntries = (int)$stmt->fetchColumn();

    // Flagged entries
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM lottery_entries WHERE draw_id = ? AND is_flagged = 1");
    $stmt->execute(array($drawId));
    $flaggedEntries = (int)$stmt->fetchColumn();

    // Active bans
    $stmt = $pdo->query("SELECT COUNT(*) FROM lottery_bans WHERE is_active = 1");
    $activeBans = (int)$stmt->fetchColumn();

    // Total draws completed
    $stmt = $pdo->query("SELECT COUNT(*) FROM lottery_draws WHERE status = 'completed'");
    $totalDraws = (int)$stmt->fetchColumn();

    // Total zen distributed
    $stmt = $pdo->query("SELECT COALESCE(SUM(zen_won), 0) FROM lottery_winners");
    $totalDistributed = (int)$stmt->fetchColumn();

    lotteryJson(array(
        'success' => true,
        'draw' => $draw,
        'total_entries' => $totalEntries,
        'flagged_entries' => $flaggedEntries,
        'active_bans' => $activeBans,
        'total_draws' => $totalDraws,
        'total_distributed' => $totalDistributed,
        'settings' => $settings,
        'rid' => $RID,
    ));
}

// ── ADMIN: GET admin_entries ──────────────────────────────────────────

if ($method === 'GET' && $action === 'admin_entries') {
    $admin = requireAdmin();
    $drawDate = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

    $stmt = $pdo->prepare("SELECT id FROM lottery_draws WHERE draw_date = ?");
    $stmt->execute(array($drawDate));
    $drawRow = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$drawRow) {
        lotteryJson(array('success' => true, 'entries' => array(), 'rid' => $RID));
    }

    $stmt = $pdo->prepare("SELECT * FROM lottery_entries WHERE draw_id = ? ORDER BY created_at DESC");
    $stmt->execute(array((int)$drawRow['id']));
    $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);

    lotteryJson(array('success' => true, 'entries' => $entries, 'draw_id' => (int)$drawRow['id'], 'rid' => $RID));
}

// ── ADMIN: GET admin_winners_history ──────────────────────────────────

if ($method === 'GET' && $action === 'admin_winners_history') {
    $admin = requireAdmin();
    $limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 30;

    $stmt = $pdo->prepare("
        SELECT lw.*, ld.draw_date, ld.total_pool
        FROM lottery_winners lw
        JOIN lottery_draws ld ON ld.id = lw.draw_id
        ORDER BY lw.created_at DESC
        LIMIT ?
    ");
    $stmt->execute(array($limit));
    $winners = $stmt->fetchAll(PDO::FETCH_ASSOC);

    lotteryJson(array('success' => true, 'winners' => $winners, 'rid' => $RID));
}

// ── ADMIN: POST draw (manual trigger) ─────────────────────────────────

if ($method === 'POST' && $action === 'draw') {
    $admin = requireAdmin();
    $ip = getClientIpLottery();
    $adminId = isset($admin['user_id']) ? (int)$admin['user_id'] : 0;

    $draw = getTodayDraw($pdo);
    $drawId = (int)$draw['id'];

    if ($draw['status'] === 'completed') {
        lotteryJson(array('success' => false, 'message' => 'Today\'s draw is already completed.', 'rid' => $RID), 400);
    }

    // Mark as drawing
    $stmt = $pdo->prepare("UPDATE lottery_draws SET status = 'drawing' WHERE id = ?");
    $stmt->execute(array($drawId));

    // Get all valid (non-flagged) entries with zen > 0, plus free entries
    $stmt = $pdo->prepare("SELECT * FROM lottery_entries WHERE draw_id = ? AND is_flagged = 0 ORDER BY zen_amount DESC, created_at ASC");
    $stmt->execute(array($drawId));
    $allEntries = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $winnersCount = (int)$settings['winners_per_draw'];
    $multiplier = (int)$settings['reward_multiplier'];
    $winners = array();

    if (count($allEntries) > 0) {
        // Weighted random selection based on zen_amount (free entries get weight of min_entry_zen/2)
        $minZen = (int)$settings['min_entry_zen'];
        $weightedPool = array();
        foreach ($allEntries as $entry) {
            $weight = (int)$entry['zen_amount'];
            if ($weight <= 0) $weight = max(1, (int)($minZen / 2)); // free entries get half-min weight
            $weightedPool[] = array('entry' => $entry, 'weight' => $weight);
        }

        $selectedUserIds = array();
        for ($i = 0; $i < $winnersCount && count($weightedPool) > 0; $i++) {
            // Calculate total weight
            $totalWeight = 0;
            foreach ($weightedPool as $wp) {
                $totalWeight += $wp['weight'];
            }
            if ($totalWeight <= 0) break;

            // Pick random
            $rand = mt_rand(1, $totalWeight);
            $cumulative = 0;
            $winnerIdx = 0;
            foreach ($weightedPool as $idx => $wp) {
                $cumulative += $wp['weight'];
                if ($rand <= $cumulative) {
                    $winnerIdx = $idx;
                    break;
                }
            }

            $winnerEntry = $weightedPool[$winnerIdx]['entry'];
            $winUserId = (int)$winnerEntry['user_id'];

            // Skip if this user already won (unique winners)
            if (in_array($winUserId, $selectedUserIds)) {
                // Remove and retry this iteration
                array_splice($weightedPool, $winnerIdx, 1);
                $i--;
                continue;
            }

            $selectedUserIds[] = $winUserId;
            $zenEntered = (int)$winnerEntry['zen_amount'];
            $zenWon = $zenEntered > 0 ? $zenEntered * $multiplier : $minZen; // free winners get min_entry_zen

            // Deliver zen
            $delivered = addLotteryZen($pdo, $winUserId, $zenWon);

            // Insert winner record
            $rank = $i + 1;
            $stmt = $pdo->prepare("
                INSERT INTO lottery_winners (draw_id, entry_id, user_id, username, zen_entered, zen_won, rank_position, delivered, delivered_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute(array(
                $drawId,
                (int)$winnerEntry['id'],
                $winUserId,
                (string)$winnerEntry['username'],
                $zenEntered,
                $zenWon,
                $rank,
                $delivered ? 1 : 0,
                $delivered ? date('Y-m-d H:i:s') : null,
            ));

            $winners[] = array(
                'rank' => $rank,
                'username' => $winnerEntry['username'],
                'zen_entered' => $zenEntered,
                'zen_won' => $zenWon,
                'delivered' => $delivered,
            );

            // Remove from pool
            array_splice($weightedPool, $winnerIdx, 1);
        }
    }

    // Mark draw as completed
    $stmt = $pdo->prepare("UPDATE lottery_draws SET status = 'completed', drawn_at = NOW() WHERE id = ?");
    $stmt->execute(array($drawId));

    lotteryLog($pdo, $adminId, $ip, 'manual_draw', 'draw_id=' . $drawId . ' winners=' . count($winners));

    lotteryJson(array(
        'success' => true,
        'message' => 'Draw completed! ' . count($winners) . ' winner(s) selected.',
        'winners' => $winners,
        'rid' => $RID,
    ));
}

// ── ADMIN: POST reroll ────────────────────────────────────────────────

if ($method === 'POST' && $action === 'reroll') {
    $admin = requireAdmin();
    $input = getJsonInput();
    $drawId = isset($input['draw_id']) ? (int)$input['draw_id'] : 0;
    $ip = getClientIpLottery();
    $adminId = isset($admin['user_id']) ? (int)$admin['user_id'] : 0;

    if ($drawId <= 0) {
        lotteryJson(array('success' => false, 'message' => 'draw_id required.', 'rid' => $RID), 400);
    }

    // Remove old winners and refund them
    $stmt = $pdo->prepare("SELECT * FROM lottery_winners WHERE draw_id = ?");
    $stmt->execute(array($drawId));
    $oldWinners = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // Note: we don't refund the winnings, just re-draw

    $stmt = $pdo->prepare("DELETE FROM lottery_winners WHERE draw_id = ?");
    $stmt->execute(array($drawId));

    // Reset draw status
    $stmt = $pdo->prepare("UPDATE lottery_draws SET status = 'open' WHERE id = ?");
    $stmt->execute(array($drawId));

    lotteryLog($pdo, $adminId, $ip, 'reroll', 'draw_id=' . $drawId . ' old_winners_cleared=' . count($oldWinners));

    lotteryJson(array(
        'success' => true,
        'message' => 'Draw reset. You can now trigger a new draw.',
        'rid' => $RID,
    ));
}

// ── ADMIN: POST ban_user ──────────────────────────────────────────────

if ($method === 'POST' && $action === 'ban_user') {
    $admin = requireAdmin();
    $input = getJsonInput();
    $targetUserId = isset($input['user_id']) ? (int)$input['user_id'] : 0;
    $reason = isset($input['reason']) ? (string)$input['reason'] : 'Admin ban';
    $ip = getClientIpLottery();

    if ($targetUserId <= 0) {
        lotteryJson(array('success' => false, 'message' => 'user_id required.', 'rid' => $RID), 400);
    }

    $adminName = getLotteryAccountName($pdo, isset($admin['user_id']) ? (int)$admin['user_id'] : 0);
    $stmt = $pdo->prepare("INSERT INTO lottery_bans (user_id, reason, banned_by, is_active, created_at) VALUES (?, ?, ?, 1, NOW())");
    $stmt->execute(array($targetUserId, $reason, $adminName));

    lotteryLog($pdo, $targetUserId, $ip, 'admin_ban', 'by=' . $adminName . ' reason=' . $reason);

    lotteryJson(array('success' => true, 'message' => 'User banned from lottery.', 'rid' => $RID));
}

// ── ADMIN: POST unban_user ────────────────────────────────────────────

if ($method === 'POST' && $action === 'unban_user') {
    $admin = requireAdmin();
    $input = getJsonInput();
    $targetUserId = isset($input['user_id']) ? (int)$input['user_id'] : 0;

    if ($targetUserId <= 0) {
        lotteryJson(array('success' => false, 'message' => 'user_id required.', 'rid' => $RID), 400);
    }

    $stmt = $pdo->prepare("UPDATE lottery_bans SET is_active = 0 WHERE user_id = ? AND is_active = 1");
    $stmt->execute(array($targetUserId));

    lotteryJson(array('success' => true, 'message' => 'User unbanned.', 'rid' => $RID));
}

// ── ADMIN: POST update_settings ───────────────────────────────────────

if ($method === 'POST' && $action === 'update_settings') {
    $admin = requireAdmin();
    $input = getJsonInput();
    $ip = getClientIpLottery();

    $allowedKeys = array('enabled', 'min_entry_zen', 'max_entries_per_day', 'free_entries_per_day', 'winners_per_draw', 'reward_multiplier', 'draw_hour', 'draw_minute');

    $updated = 0;
    foreach ($allowedKeys as $key) {
        if (isset($input[$key])) {
            $stmt = $pdo->prepare("INSERT INTO lottery_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            $stmt->execute(array($key, (string)$input[$key]));
            $updated++;
        }
    }

    lotteryLog($pdo, isset($admin['user_id']) ? (int)$admin['user_id'] : 0, $ip, 'settings_update', json_encode($input));

    lotteryJson(array('success' => true, 'message' => $updated . ' setting(s) updated.', 'rid' => $RID));
}

// ── ADMIN: GET admin_bans ─────────────────────────────────────────────

if ($method === 'GET' && $action === 'admin_bans') {
    $admin = requireAdmin();
    $stmt = $pdo->query("SELECT lb.*, u_name.acct AS username FROM lottery_bans lb LEFT JOIN (SELECT ID, name AS acct FROM users) u_name ON u_name.ID = lb.user_id WHERE lb.is_active = 1 ORDER BY lb.created_at DESC");
    // Fallback if join fails
    try {
        $bans = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $stmt = $pdo->query("SELECT * FROM lottery_bans WHERE is_active = 1 ORDER BY created_at DESC");
        $bans = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    lotteryJson(array('success' => true, 'bans' => $bans, 'rid' => $RID));
}

// ── ADMIN: GET admin_logs ─────────────────────────────────────────────

if ($method === 'GET' && $action === 'admin_logs') {
    $admin = requireAdmin();
    $limit = isset($_GET['limit']) ? min(200, max(1, (int)$_GET['limit'])) : 50;
    $stmt = $pdo->prepare("SELECT * FROM lottery_security_log ORDER BY created_at DESC LIMIT ?");
    $stmt->execute(array($limit));
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    lotteryJson(array('success' => true, 'logs' => $logs, 'rid' => $RID));
}

// ── Fallback ──────────────────────────────────────────────────────────

lotteryJson(array('success' => false, 'message' => 'Unknown action: ' . $action, 'rid' => $RID), 400);
