<?php
/**
 * gamepass_helpers.php - Shared Game Pass helper functions
 * PHP 5.x compatible
 *
 * GLOBAL 30-DAY SEASON MODEL:
 * All players share the same 30-day season timeline.
 * Season auto-rotates every 30 days.
 * New players start from Day 1 and can claim all past days.
 * 2 Tiers: free, premium
 */

/**
 * Get the global season info - auto-rotates every 30 days
 * Returns: season_start, season_end, current_day (1-30), remaining_days, season_number, cycle_start
 */
if (!function_exists('getGlobalSeasonInfo')) {
    function getGlobalSeasonInfo($pdo) {
        $seasonStart = null;
        try {
            $stmt = $pdo->prepare("SELECT setting_value FROM gamepass_settings WHERE setting_key = 'season_start'");
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row && trim($row['setting_value']) !== '') {
                $seasonStart = $row['setting_value'];
            }
        } catch (Exception $e) {}

        // If no season_start, create one (today at midnight)
        if (!$seasonStart) {
            $seasonStart = date('Y-m-d 00:00:00');
            try {
                $pdo->prepare("INSERT IGNORE INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('season_start', ?, NOW())")
                    ->execute(array($seasonStart));
            } catch (Exception $e) {}
        }

        $startTs = strtotime($seasonStart);
        if ($startTs === false) {
            $startTs = strtotime(date('Y-m-d 00:00:00'));
        }
        $now = time();
        $elapsed = $now - $startTs;
        $daysSinceStart = (int)floor($elapsed / 86400);

        // Auto-rotate: if past 30 days, advance season
        $seasonNumber = 1;
        // Read season number from DB
        try {
            $stmt = $pdo->prepare("SELECT setting_value FROM gamepass_settings WHERE setting_key = 'season_number'");
            $stmt->execute();
            $snRow = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($snRow) $seasonNumber = max(1, (int)$snRow['setting_value']);
        } catch (Exception $e) {}

        $rotated = false;
        while ($daysSinceStart >= 30) {
            $startTs += 30 * 86400;
            $daysSinceStart -= 30;
            $seasonNumber++;
            $rotated = true;
        }

        if ($rotated) {
            $newStart = date('Y-m-d H:i:s', $startTs);
            try {
                $pdo->prepare("UPDATE gamepass_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = 'season_start'")
                    ->execute(array($newStart));
            } catch (Exception $e) {}
            try {
                // Upsert season_number
                $pdo->prepare("INSERT INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('season_number', ?, NOW()) ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()")
                    ->execute(array($seasonNumber, $seasonNumber));
            } catch (Exception $e) {}
            $seasonStart = $newStart;

            // Reset all claims for the new season (old cycle_start won't match anyway)
            error_log("SEASON_ROTATED to season #{$seasonNumber} start={$newStart}");
        }

        $currentDay = $daysSinceStart + 1; // 1-30
        $seasonEnd = date('Y-m-d H:i:s', $startTs + 30 * 86400);
        $remainingDays = 30 - $daysSinceStart;
        $cycleStart = date('Y-m-d', $startTs);

        return array(
            'season_start' => $seasonStart,
            'season_end' => $seasonEnd,
            'current_day' => $currentDay,
            'remaining_days' => $remainingDays,
            'season_number' => $seasonNumber,
            'cycle_start' => $cycleStart,
        );
    }
}

/**
 * Calculate remaining days from expires_at
 */
if (!function_exists('getGamePassRemainingDaysFromExpiry')) {
    function getGamePassRemainingDaysFromExpiry($expiresAt) {
        if ($expiresAt === null || trim($expiresAt) === '') return 0;
        $expiryTs = strtotime($expiresAt);
        if ($expiryTs === false) return 0;
        if ($expiryTs <= time()) return 0;
        return (int)ceil(($expiryTs - time()) / 86400);
    }
}

/**
 * Check if game pass is active using expires_at
 */
if (!function_exists('isGamePassActiveByExpiry')) {
    function isGamePassActiveByExpiry($expiresAt) {
        if ($expiresAt === null || trim($expiresAt) === '') return false;
        $expiryTs = strtotime($expiresAt);
        return ($expiryTs !== false && $expiryTs > time());
    }
}

/**
 * Get first active RoleID for a user
 */
if (!function_exists('getFirstRoleIdForUser')) {
    function getFirstRoleIdForUser($pdo, $userId) {
        $userId = (int)$userId;
        if ($userId <= 0) return 0;
        $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ? LIMIT 1");
        $stmt->execute(array($userId));
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) return 0;
        $stmt = $pdo->prepare("SELECT RoleID FROM basetab_sg WHERE AccountID = ? AND IsDel = 0 ORDER BY RoleID ASC LIMIT 1");
        $stmt->execute(array($user['name']));
        $char = $stmt->fetch(PDO::FETCH_ASSOC);
        return $char ? intval($char['RoleID']) : 0;
    }
}

/**
 * Ensure user_gamepass and related tables exist with all columns
 */
if (!function_exists('ensureGamePassTables')) {
    function ensureGamePassTables($pdo) {
        $pdo->exec("CREATE TABLE IF NOT EXISTS user_gamepass (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            is_premium TINYINT(1) DEFAULT 0,
            tier VARCHAR(10) DEFAULT 'free',
            activated_at DATETIME DEFAULT NULL,
            days_total INT DEFAULT NULL,
            expires_at DATETIME DEFAULT NULL,
            paypal_order_id VARCHAR(255) DEFAULT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME DEFAULT NULL,
            UNIQUE KEY idx_user_unique (user_id),
            KEY idx_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

        try { $pdo->exec("ALTER TABLE user_gamepass ADD COLUMN tier VARCHAR(10) DEFAULT 'free'"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE user_gamepass ADD COLUMN paypal_order_id VARCHAR(255) DEFAULT NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE user_gamepass ADD COLUMN updated_at DATETIME DEFAULT NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE user_gamepass ADD COLUMN activated_at DATETIME DEFAULT NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE user_gamepass ADD COLUMN days_total INT DEFAULT NULL"); } catch (Exception $e) {}

        $pdo->exec("CREATE TABLE IF NOT EXISTS gamepass_purchases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            tier VARCHAR(10) NOT NULL,
            price_cents INT DEFAULT 0,
            price_eur DECIMAL(10,2) DEFAULT 0.00,
            character_name VARCHAR(100) DEFAULT NULL,
            days INT DEFAULT 30,
            paypal_order_id VARCHAR(64) DEFAULT NULL,
            paypal_capture_id VARCHAR(64) DEFAULT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            rid VARCHAR(32) DEFAULT NULL,
            created_at DATETIME NOT NULL,
            completed_at DATETIME DEFAULT NULL,
            INDEX idx_user (user_id),
            INDEX idx_paypal_order (paypal_order_id),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

        try { $pdo->exec("ALTER TABLE gamepass_purchases ADD COLUMN price_cents INT DEFAULT 0 AFTER tier"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE gamepass_purchases ADD COLUMN price_eur DECIMAL(10,2) DEFAULT 0.00 AFTER price_cents"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE gamepass_purchases ADD COLUMN character_name VARCHAR(100) DEFAULT NULL AFTER price_eur"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE gamepass_purchases ADD COLUMN days INT DEFAULT 30 AFTER character_name"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE gamepass_purchases ADD COLUMN rid VARCHAR(32) DEFAULT NULL AFTER status"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE gamepass_purchases ADD COLUMN paypal_capture_id VARCHAR(64) DEFAULT NULL AFTER paypal_order_id"); } catch (Exception $e) {}

        $pdo->exec("CREATE TABLE IF NOT EXISTS user_gamepass_claims (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            reward_id INT NOT NULL DEFAULT 0,
            day INT NOT NULL,
            tier VARCHAR(10) NOT NULL,
            character_id INT DEFAULT 0,
            character_name VARCHAR(100) DEFAULT '',
            zen_cost INT DEFAULT 0,
            claimed_at DATETIME NOT NULL,
            cycle_start DATE NOT NULL,
            UNIQUE KEY uq_user_day_tier_cycle (user_id, day, tier, cycle_start),
            KEY idx_user_cycle (user_id, cycle_start)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

        try { $pdo->exec("ALTER TABLE user_gamepass_claims ADD COLUMN reward_id INT NOT NULL DEFAULT 0"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE user_gamepass_claims ADD COLUMN zen_cost INT DEFAULT 0"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE user_gamepass_claims ADD COLUMN character_id INT DEFAULT 0"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE user_gamepass_claims ADD COLUMN character_name VARCHAR(100) DEFAULT ''"); } catch (Exception $e) {}

        $pdo->exec("CREATE TABLE IF NOT EXISTS gamepass_settings (
            setting_key VARCHAR(50) PRIMARY KEY,
            setting_value VARCHAR(255) NOT NULL,
            updated_at DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    }
}

/**
 * Auto-activate Free Pass for a user (one-time, idempotent)
 */
if (!function_exists('autoActivateFreePass')) {
    function autoActivateFreePass($pdo, $userId, $RID) {
        $userId = (int)$userId;
        if ($userId <= 0) return array('success' => false, 'message' => 'Invalid user ID');

        ensureGamePassTables($pdo);

        $stmt = $pdo->prepare("SELECT id, tier FROM user_gamepass WHERE user_id = ? LIMIT 1");
        $stmt->execute(array($userId));
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            return array('success' => true, 'message' => 'Pass already exists', 'tier' => $existing['tier'], 'new' => false);
        }

        $stmt = $pdo->prepare("INSERT INTO user_gamepass (user_id, is_premium, tier, activated_at, days_total, expires_at, created_at, updated_at) VALUES (?, 0, 'free', NOW(), 30, NULL, NOW(), NOW())");
        $stmt->execute(array($userId));

        error_log("RID={$RID} FREE_PASS_ACTIVATED user={$userId}");

        try {
            $stmt = $pdo->prepare("INSERT INTO gamepass_purchases (user_id, tier, price_eur, status, created_at, completed_at) VALUES (?, 'free', 0.00, 'completed', NOW(), NOW())");
            $stmt->execute(array($userId));
        } catch (Exception $e) {
            error_log("RID={$RID} FREE_PASS_PURCHASE_LOG_ERR: " . $e->getMessage());
        }

        $roleId = getFirstRoleIdForUser($pdo, $userId);
        if ($roleId > 0) {
            require_once __DIR__ . '/mail_delivery.php';
            $mailer = new GameMailer($pdo);
            $mailResult = $mailer->sendGamePassActivationMail($roleId, 'free');
            error_log("RID={$RID} FREE_PASS_MAIL user={$userId} role={$roleId} success=" . ($mailResult['success'] ? 'yes' : 'no'));
        }

        return array('success' => true, 'message' => 'Free Pass activated', 'tier' => 'free', 'new' => true);
    }
}

/**
 * Ensure gamepass_extensions table exists
 */
if (!function_exists('ensureExtensionTable')) {
    function ensureExtensionTable($pdo) {
        $pdo->exec("CREATE TABLE IF NOT EXISTS gamepass_extensions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            tier VARCHAR(10) NOT NULL,
            days_added INT NOT NULL DEFAULT 0,
            old_until DATETIME DEFAULT NULL,
            new_until DATETIME DEFAULT NULL,
            price_eur DECIMAL(10,2) DEFAULT 0.00,
            paypal_order_id VARCHAR(64) DEFAULT NULL,
            paypal_capture_id VARCHAR(64) DEFAULT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            created_at DATETIME NOT NULL,
            completed_at DATETIME DEFAULT NULL,
            INDEX idx_user (user_id),
            INDEX idx_paypal_order (paypal_order_id),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    }
}

/**
 * Extend a Game Pass by adding days to expires_at
 */
if (!function_exists('extendGamePass')) {
    function extendGamePass($pdo, $userId, $tier, $paypalOrderId, $captureId, $extensionId, $RID) {
        $userId = (int)$userId;
        ensureExtensionTable($pdo);

        $extStmt = $pdo->prepare("SELECT days_added FROM gamepass_extensions WHERE id = ? LIMIT 1");
        $extStmt->execute(array($extensionId));
        $extRow = $extStmt->fetch(PDO::FETCH_ASSOC);
        $days = ($extRow && (int)$extRow['days_added'] > 0) ? (int)$extRow['days_added'] : 30;

        if ($userId <= 0 || $days < 1 || $days > 90) {
            return array('success' => false, 'message' => 'Invalid parameters');
        }

        // Idempotency
        $stmt = $pdo->prepare("SELECT id FROM gamepass_extensions WHERE paypal_order_id = ? AND status = 'completed' LIMIT 1");
        $stmt->execute(array($paypalOrderId));
        if ($stmt->fetch(PDO::FETCH_ASSOC)) {
            return array('success' => true, 'message' => 'Already extended', 'idempotent' => true);
        }

        $stmt = $pdo->prepare("SELECT expires_at, tier, activated_at FROM user_gamepass WHERE user_id = ? LIMIT 1");
        $stmt->execute(array($userId));
        $gp = $stmt->fetch(PDO::FETCH_ASSOC);

        $oldExpiry = null;
        $newExpiry = null;
        $nowStr = date('Y-m-d H:i:s');

        if ($gp) {
            $oldExpiry = isset($gp['expires_at']) ? $gp['expires_at'] : null;
            if ($oldExpiry !== null && isGamePassActiveByExpiry($oldExpiry)) {
                $newExpiryTs = strtotime($oldExpiry) + ($days * 86400);
            } else {
                $newExpiryTs = time() + ($days * 86400);
            }
            $newExpiry = date('Y-m-d H:i:s', $newExpiryTs);
            $newDaysTotal = (int)ceil(($newExpiryTs - time()) / 86400);

            $stmt = $pdo->prepare("UPDATE user_gamepass SET is_premium = 1, tier = ?, expires_at = ?, days_total = ?, updated_at = NOW() WHERE user_id = ?");
            $stmt->execute(array($tier, $newExpiry, $newDaysTotal, $userId));
        } else {
            $newExpiryTs = time() + ($days * 86400);
            $newExpiry = date('Y-m-d H:i:s', $newExpiryTs);
            $newDaysTotal = $days;

            $stmt = $pdo->prepare("INSERT INTO user_gamepass (user_id, is_premium, tier, activated_at, days_total, expires_at, created_at, updated_at) VALUES (?, 1, ?, ?, ?, ?, NOW(), NOW())");
            $stmt->execute(array($userId, $tier, $nowStr, $newDaysTotal, $newExpiry));
        }

        $stmt = $pdo->prepare("UPDATE gamepass_extensions SET status = 'completed', old_until = ?, new_until = ?, paypal_capture_id = ?, completed_at = NOW() WHERE id = ?");
        $stmt->execute(array($oldExpiry, $newExpiry, $captureId, $extensionId));

        error_log("RID={$RID} EXTEND_COMPLETED user={$userId} tier={$tier} days={$days} new_expiry={$newExpiry}");
        return array('success' => true, 'message' => 'Pass extended', 'days_added' => $days, 'days_total' => $newDaysTotal);
    }
}

/**
 * Activate a paid Game Pass (premium) - GLOBAL SEASON MODEL
 * Sets expires_at to the end of the current season
 */
if (!function_exists('activatePaidGamePass')) {
    function activatePaidGamePass($pdo, $userId, $tier, $paypalOrderId, $captureId, $RID) {
        $userId = (int)$userId;
        if ($userId <= 0 || $tier !== 'premium') {
            error_log("RID={$RID} ACTIVATE_GAMEPASS_INVALID user={$userId} tier={$tier}");
            return false;
        }

        ensureGamePassTables($pdo);

        // Idempotency
        $stmt = $pdo->prepare("SELECT id FROM user_gamepass WHERE user_id = ? AND paypal_order_id = ?");
        $stmt->execute(array($userId, $paypalOrderId));
        if ($stmt->fetch(PDO::FETCH_ASSOC)) return false;

        $stmt = $pdo->prepare("SELECT id FROM gamepass_purchases WHERE paypal_order_id = ? AND status = 'completed' LIMIT 1");
        $stmt->execute(array($paypalOrderId));
        if ($stmt->fetch(PDO::FETCH_ASSOC)) return false;

        // Get season dates: activated_at = season_start, expires_at = season_end
        $seasonInfo = getGlobalSeasonInfo($pdo);
        $activatedAt = $seasonInfo['season_start'];
        $expiresAt = $seasonInfo['season_end'];

        // Upsert user_gamepass
        $stmt = $pdo->prepare("SELECT id, expires_at FROM user_gamepass WHERE user_id = ?");
        $stmt->execute(array($userId));
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $stmt = $pdo->prepare("UPDATE user_gamepass SET is_premium = 1, tier = 'premium', activated_at = ?, days_total = 30, expires_at = ?, paypal_order_id = ?, updated_at = NOW() WHERE user_id = ?");
            $stmt->execute(array($activatedAt, $expiresAt, $paypalOrderId, $userId));
        } else {
            $stmt = $pdo->prepare("INSERT INTO user_gamepass (user_id, is_premium, tier, activated_at, days_total, expires_at, paypal_order_id, created_at, updated_at) VALUES (?, 1, 'premium', ?, 30, ?, ?, NOW(), NOW())");
            $stmt->execute(array($userId, $activatedAt, $expiresAt, $paypalOrderId));
        }

        // Update purchases
        try {
            $stmt = $pdo->prepare("UPDATE gamepass_purchases SET status = 'completed', paypal_capture_id = ?, completed_at = NOW() WHERE paypal_order_id = ? AND status = 'pending'");
            $stmt->execute(array($captureId, $paypalOrderId));
        } catch (Exception $e) {
            error_log("RID={$RID} GAMEPASS_PURCHASE_UPDATE_ERR: " . $e->getMessage());
        }

        error_log("RID={$RID} GAMEPASS_ACTIVATED user={$userId} tier=premium expires_at={$expiresAt} order={$paypalOrderId}");

        $roleId = getFirstRoleIdForUser($pdo, $userId);
        if ($roleId > 0) {
            require_once __DIR__ . '/mail_delivery.php';
            $mailer = new GameMailer($pdo);
            $mailResult = $mailer->sendGamePassActivationMail($roleId, 'premium');
            error_log("RID={$RID} GAMEPASS_ACTIVATION_MAIL user={$userId} role={$roleId} success=" . ($mailResult['success'] ? 'yes' : 'no'));
        }

        return true;
    }
}
