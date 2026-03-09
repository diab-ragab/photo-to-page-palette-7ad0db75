<?php
/**
 * gamepass_helpers.php - Shared Game Pass helper functions
 * PHP 5.x compatible (no closures, no short arrays, no ??)
 *
 * SEASON-BASED MODEL:
 * Instead of per-user activated_at + days_total, the system uses a global
 * season anchor date (site_settings: gamepass_season_start). Every 30 days
 * from that anchor is one "season". All users' passes expire at the season
 * boundary. Extensions add 30-day seasons on top of expires_at.
 *
 * Include AFTER bootstrap.php and session_helper.php
 */

/**
 * Get the current season info from the global anchor date.
 * Returns array with season_start, season_end, current_day, days_remaining, season_number
 *
 * @param PDO $pdo
 * @return array
 */
if (!function_exists('getCurrentSeasonInfo')) {
    function getCurrentSeasonInfo($pdo) {
        $seasonLength = 30; // days per season

        // Read anchor from site_settings
        $anchorStr = null;
        try {
            $stmt = $pdo->prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'gamepass_season_start' LIMIT 1");
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row && isset($row['setting_value']) && trim($row['setting_value']) !== '') {
                $anchorStr = trim($row['setting_value']);
            }
        } catch (Exception $e) {
            error_log("SEASON_ANCHOR_ERR: " . $e->getMessage());
        }

        // Fallback: first day of current month if no anchor set
        if ($anchorStr === null || $anchorStr === '') {
            $anchorStr = date('Y-m-01');
        }

        $anchorTs = strtotime($anchorStr);
        if ($anchorTs === false) {
            $anchorTs = strtotime(date('Y-m-01'));
        }

        // Normalize anchor to midnight
        $anchorTs = strtotime(date('Y-m-d', $anchorTs));

        $now = time();
        $nowDay = strtotime(date('Y-m-d', $now)); // midnight today

        // If anchor is in the future, treat it as current season start
        if ($anchorTs > $now) {
            $seasonStart = $anchorTs;
            $seasonNumber = 0;
        } else {
            $elapsedDays = (int)floor(($nowDay - $anchorTs) / 86400);
            $seasonNumber = (int)floor($elapsedDays / $seasonLength);
            $seasonStart = $anchorTs + ($seasonNumber * $seasonLength * 86400);
        }

        $seasonEnd = $seasonStart + ($seasonLength * 86400);
        $currentDay = (int)floor(($now - $seasonStart) / 86400) + 1; // 1-based
        if ($currentDay < 1) $currentDay = 1;
        if ($currentDay > $seasonLength) $currentDay = $seasonLength;

        $daysRemaining = max(0, (int)ceil(($seasonEnd - $now) / 86400));

        return array(
            'season_start' => date('Y-m-d H:i:s', $seasonStart),
            'season_end' => date('Y-m-d H:i:s', $seasonEnd),
            'season_start_date' => date('Y-m-d', $seasonStart),
            'season_end_date' => date('Y-m-d', $seasonEnd),
            'current_day' => $currentDay,
            'days_remaining' => $daysRemaining,
            'season_number' => $seasonNumber + 1,
            'season_length' => $seasonLength,
        );
    }
}

/**
 * Calculate remaining days for a game pass using expires_at (season-based)
 */
if (!function_exists('getGamePassRemainingDays')) {
    function getGamePassRemainingDays($activatedAt, $daysTotal) {
        // Legacy compat: if called with old params, try expires_at approach
        if ($activatedAt === null || $daysTotal === null || (int)$daysTotal <= 0) {
            return 0;
        }
        $activatedTs = strtotime($activatedAt);
        if ($activatedTs === false) return 0;
        $elapsed = floor((time() - $activatedTs) / 86400);
        $remaining = (int)$daysTotal - (int)$elapsed;
        return max(0, $remaining);
    }
}

/**
 * Calculate remaining days from expires_at datetime (primary method for season model)
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
 * Check if a game pass is currently active (season-based: use expires_at)
 */
if (!function_exists('isGamePassActive')) {
    function isGamePassActive($activatedAt, $daysTotal) {
        return getGamePassRemainingDays($activatedAt, $daysTotal) > 0;
    }
}

/**
 * Check if game pass is active using expires_at (primary for season model)
 */
if (!function_exists('isGamePassActiveByExpiry')) {
    function isGamePassActiveByExpiry($expiresAt) {
        if ($expiresAt === null || trim($expiresAt) === '') return false;
        $expiryTs = strtotime($expiresAt);
        return ($expiryTs !== false && $expiryTs > time());
    }
}

/**
 * Calculate the expiry datetime from activated_at + days_total (legacy compat)
 */
if (!function_exists('getGamePassExpiryDate')) {
    function getGamePassExpiryDate($activatedAt, $daysTotal) {
        if ($activatedAt === null || $daysTotal === null || (int)$daysTotal <= 0) {
            return null;
        }
        $activatedTs = strtotime($activatedAt);
        if ($activatedTs === false) return null;
        return date('Y-m-d H:i:s', $activatedTs + ((int)$daysTotal * 86400));
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

        $accountName = $user['name'];

        $stmt = $pdo->prepare("SELECT RoleID FROM basetab_sg WHERE AccountID = ? AND IsDel = 0 ORDER BY RoleID ASC LIMIT 1");
        $stmt->execute(array($accountName));
        $char = $stmt->fetch(PDO::FETCH_ASSOC);

        return $char ? intval($char['RoleID']) : 0;
    }
}

/**
 * Detect game pass tier from product/description name
 */
if (!function_exists('detectGamePassTierFromName')) {
    function detectGamePassTierFromName($name) {
        $name = strtolower(trim($name));

        if ($name === 'free pass') return 'free';
        if ($name === 'elite pass') return 'elite';
        if ($name === 'gold pass') return 'gold';

        if (strpos($name, 'pass') !== false) {
            if (strpos($name, 'gold') !== false) return 'gold';
            if (strpos($name, 'elite') !== false) return 'elite';
            if (strpos($name, 'free') !== false) return 'free';
        }

        return '';
    }
}

/**
 * Ensure user_gamepass and gamepass_purchases tables exist with all columns
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

        // Safe column adds (including new columns)
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

        // Safe column adds for gamepass_purchases
        try { $pdo->exec("ALTER TABLE gamepass_purchases ADD COLUMN price_cents INT DEFAULT 0 AFTER tier"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE gamepass_purchases ADD COLUMN price_eur DECIMAL(10,2) DEFAULT 0.00 AFTER price_cents"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE gamepass_purchases ADD COLUMN character_name VARCHAR(100) DEFAULT NULL AFTER price_eur"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE gamepass_purchases ADD COLUMN days INT DEFAULT 30 AFTER character_name"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE gamepass_purchases ADD COLUMN rid VARCHAR(32) DEFAULT NULL AFTER status"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE gamepass_purchases ADD COLUMN paypal_capture_id VARCHAR(64) DEFAULT NULL AFTER paypal_order_id"); } catch (Exception $e) {}

        // Ensure user_gamepass_claims table exists
        $pdo->exec("CREATE TABLE IF NOT EXISTS user_gamepass_claims (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            reward_id INT NOT NULL,
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

        // Safe column adds for user_gamepass_claims
        try { $pdo->exec("ALTER TABLE user_gamepass_claims ADD COLUMN reward_id INT NOT NULL DEFAULT 0"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE user_gamepass_claims ADD COLUMN zen_cost INT DEFAULT 0"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE user_gamepass_claims ADD COLUMN character_id INT DEFAULT 0"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE user_gamepass_claims ADD COLUMN character_name VARCHAR(100) DEFAULT ''"); } catch (Exception $e) {}

        // Ensure gamepass_settings table exists
        $pdo->exec("CREATE TABLE IF NOT EXISTS gamepass_settings (
            setting_key VARCHAR(50) PRIMARY KEY,
            setting_value VARCHAR(255) NOT NULL,
            updated_at DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    }
}

/**
 * Auto-activate Free Pass for a user (one-time, idempotent)
 * Free pass has no expiry (expires_at=NULL)
 */
if (!function_exists('autoActivateFreePass')) {
    function autoActivateFreePass($pdo, $userId, $RID) {
        $userId = (int)$userId;
        if ($userId <= 0) {
            return array('success' => false, 'message' => 'Invalid user ID');
        }

        ensureGamePassTables($pdo);

        $stmt = $pdo->prepare("SELECT id, tier FROM user_gamepass WHERE user_id = ? LIMIT 1");
        $stmt->execute(array($userId));
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            return array('success' => true, 'message' => 'Pass already exists', 'tier' => $existing['tier'], 'new' => false);
        }

        // Free pass: no expiry
        $stmt = $pdo->prepare("INSERT INTO user_gamepass (user_id, is_premium, tier, activated_at, days_total, expires_at, created_at, updated_at) VALUES (?, 0, 'free', NULL, NULL, NULL, NOW(), NOW())");
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
        } else {
            error_log("RID={$RID} FREE_PASS_NO_CHAR user={$userId} (no activation mail sent)");
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
 * Extend a Game Pass by adding days to expires_at (season-based stacking)
 * Extensions add 30-day increments on top of current expiry
 */
if (!function_exists('extendGamePass')) {
    function extendGamePass($pdo, $userId, $tier, $paypalOrderId, $captureId, $extensionId, $RID) {
        $userId = (int)$userId;

        ensureExtensionTable($pdo);

        // Get days from extension record
        $extStmt = $pdo->prepare("SELECT days_added FROM gamepass_extensions WHERE id = ? LIMIT 1");
        $extStmt->execute(array($extensionId));
        $extRow = $extStmt->fetch(PDO::FETCH_ASSOC);
        $days = ($extRow && (int)$extRow['days_added'] > 0) ? (int)$extRow['days_added'] : 30;

        if ($userId <= 0 || $days < 1 || $days > 90) {
            return array('success' => false, 'message' => 'Invalid parameters');
        }

        // Idempotency: check if already completed
        $stmt = $pdo->prepare("SELECT id FROM gamepass_extensions WHERE paypal_order_id = ? AND status = 'completed' LIMIT 1");
        $stmt->execute(array($paypalOrderId));
        if ($stmt->fetch(PDO::FETCH_ASSOC)) {
            error_log("RID={$RID} EXTEND_IDEMPOTENT already_completed order={$paypalOrderId}");
            return array('success' => true, 'message' => 'Already extended', 'idempotent' => true);
        }

        // Get current pass info
        $stmt = $pdo->prepare("SELECT expires_at, tier FROM user_gamepass WHERE user_id = ? LIMIT 1");
        $stmt->execute(array($userId));
        $gp = $stmt->fetch(PDO::FETCH_ASSOC);

        $oldExpiry = null;
        $newExpiry = null;
        $nowStr = date('Y-m-d H:i:s');

        if ($gp) {
            $oldExpiry = isset($gp['expires_at']) ? $gp['expires_at'] : null;

            // If pass is still active, stack days on top of current expiry
            if ($oldExpiry !== null && isGamePassActiveByExpiry($oldExpiry)) {
                $newExpiryTs = strtotime($oldExpiry) + ($days * 86400);
            } else {
                // Pass expired - get current season end and extend from there
                $season = getCurrentSeasonInfo($pdo);
                $newExpiryTs = strtotime($season['season_end']) + (($days - 30) * 86400);
                if ($newExpiryTs < time()) {
                    $newExpiryTs = time() + ($days * 86400);
                }
            }
            $newExpiry = date('Y-m-d H:i:s', $newExpiryTs);
            $newDaysTotal = (int)ceil(($newExpiryTs - time()) / 86400);

            $stmt = $pdo->prepare("UPDATE user_gamepass SET is_premium = 1, tier = ?, expires_at = ?, days_total = ?, updated_at = NOW() WHERE user_id = ?");
            $stmt->execute(array($tier, $newExpiry, $newDaysTotal, $userId));
        } else {
            // No pass row - get season end
            $season = getCurrentSeasonInfo($pdo);
            $newExpiryTs = strtotime($season['season_end']) + (max(0, $days - 30) * 86400);
            $newExpiry = date('Y-m-d H:i:s', $newExpiryTs);
            $newDaysTotal = (int)ceil(($newExpiryTs - time()) / 86400);

            $stmt = $pdo->prepare("INSERT INTO user_gamepass (user_id, is_premium, tier, activated_at, days_total, expires_at, created_at, updated_at) VALUES (?, 1, ?, ?, ?, ?, NOW(), NOW())");
            $stmt->execute(array($userId, $tier, $nowStr, $newDaysTotal, $newExpiry));
        }

        // Update extension record
        $stmt = $pdo->prepare("UPDATE gamepass_extensions SET status = 'completed', old_until = ?, new_until = ?, paypal_capture_id = ?, completed_at = NOW() WHERE id = ?");
        $stmt->execute(array($oldExpiry, $newExpiry, $captureId, $extensionId));

        error_log("RID={$RID} EXTEND_COMPLETED user={$userId} tier={$tier} days={$days} new_expiry={$newExpiry}");

        return array('success' => true, 'message' => 'Pass extended', 'days_added' => $days, 'days_total' => $newDaysTotal);
    }
}

/**
 * Activate a paid Game Pass (elite/gold) - SEASON-BASED
 * Sets expires_at to current season end (all users share same end date)
 * If pass is still active from a previous season, stack on top
 */
if (!function_exists('activatePaidGamePass')) {
    function activatePaidGamePass($pdo, $userId, $tier, $paypalOrderId, $captureId, $RID) {
        $userId = (int)$userId;
        if ($userId <= 0 || !in_array($tier, array('elite', 'gold'))) {
            error_log("RID={$RID} ACTIVATE_GAMEPASS_INVALID user={$userId} tier={$tier}");
            return false;
        }

        ensureGamePassTables($pdo);

        // Idempotency: check if already activated with this paypal order
        $stmt = $pdo->prepare("SELECT id FROM user_gamepass WHERE user_id = ? AND paypal_order_id = ?");
        $stmt->execute(array($userId, $paypalOrderId));
        if ($stmt->fetch(PDO::FETCH_ASSOC)) {
            error_log("RID={$RID} GAMEPASS_IDEMPOTENT already_activated user={$userId} order={$paypalOrderId}");
            return false;
        }

        // Also check gamepass_purchases for completed
        $stmt = $pdo->prepare("SELECT id FROM gamepass_purchases WHERE paypal_order_id = ? AND status = 'completed' LIMIT 1");
        $stmt->execute(array($paypalOrderId));
        if ($stmt->fetch(PDO::FETCH_ASSOC)) {
            error_log("RID={$RID} GAMEPASS_PURCHASE_IDEMPOTENT already_completed order={$paypalOrderId}");
            return false;
        }

        // Get current season info
        $season = getCurrentSeasonInfo($pdo);
        $seasonEndStr = $season['season_end'];

        $nowStr = date('Y-m-d H:i:s');

        // Upsert user_gamepass
        $stmt = $pdo->prepare("SELECT id, expires_at FROM user_gamepass WHERE user_id = ?");
        $stmt->execute(array($userId));
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $oldExpiry = isset($existing['expires_at']) ? $existing['expires_at'] : null;

            if ($oldExpiry !== null && isGamePassActiveByExpiry($oldExpiry)) {
                // Still active: if current expiry is already >= season end, keep it (may have extensions)
                $oldExpiryTs = strtotime($oldExpiry);
                $seasonEndTs = strtotime($seasonEndStr);
                $newExpiry = ($oldExpiryTs >= $seasonEndTs) ? $oldExpiry : $seasonEndStr;
            } else {
                // Expired or no expiry: set to current season end
                $newExpiry = $seasonEndStr;
            }

            $newDaysTotal = (int)ceil((strtotime($newExpiry) - time()) / 86400);
            $stmt = $pdo->prepare("UPDATE user_gamepass SET is_premium = 1, tier = ?, activated_at = ?, days_total = ?, expires_at = ?, paypal_order_id = ?, updated_at = NOW() WHERE user_id = ?");
            $stmt->execute(array($tier, $nowStr, $newDaysTotal, $newExpiry, $paypalOrderId, $userId));
        } else {
            $newExpiry = $seasonEndStr;
            $newDaysTotal = (int)ceil((strtotime($newExpiry) - time()) / 86400);
            $stmt = $pdo->prepare("INSERT INTO user_gamepass (user_id, is_premium, tier, activated_at, days_total, expires_at, paypal_order_id, created_at, updated_at) VALUES (?, 1, ?, ?, ?, ?, ?, NOW(), NOW())");
            $stmt->execute(array($userId, $tier, $nowStr, $newDaysTotal, $newExpiry, $paypalOrderId));
        }

        // Update gamepass_purchases
        try {
            $stmt = $pdo->prepare("UPDATE gamepass_purchases SET status = 'completed', paypal_capture_id = ?, completed_at = NOW() WHERE paypal_order_id = ? AND status = 'pending'");
            $stmt->execute(array($captureId, $paypalOrderId));
        } catch (Exception $e) {
            error_log("RID={$RID} GAMEPASS_PURCHASE_UPDATE_ERR: " . $e->getMessage());
        }

        error_log("RID={$RID} GAMEPASS_ACTIVATED user={$userId} tier={$tier} expires_at={$newExpiry} season_end={$seasonEndStr} order={$paypalOrderId}");

        // Send activation mail ONE TIME
        $roleId = getFirstRoleIdForUser($pdo, $userId);
        if ($roleId > 0) {
            require_once __DIR__ . '/mail_delivery.php';
            $mailer = new GameMailer($pdo);
            $mailResult = $mailer->sendGamePassActivationMail($roleId, $tier);
            error_log("RID={$RID} GAMEPASS_ACTIVATION_MAIL user={$userId} role={$roleId} tier={$tier} success=" . ($mailResult['success'] ? 'yes' : 'no'));
        } else {
            error_log("RID={$RID} GAMEPASS_NO_CHAR user={$userId} (no activation mail sent)");
        }

        return true;
    }
}
