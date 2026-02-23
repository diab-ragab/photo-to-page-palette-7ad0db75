<?php
/**
 * gamepass_helpers.php - Shared Game Pass helper functions
 * PHP 5.x compatible (no closures, no short arrays, no ??)
 *
 * Duration model: activated_at + days_total (static 30-day periods)
 * Instead of expires_at datetime, we store when the pass was activated
 * and how many total days it lasts. Remaining = days_total - DATEDIFF(NOW(), activated_at)
 *
 * Include AFTER bootstrap.php and session_helper.php
 */

/**
 * Calculate remaining days for a game pass
 * 
 * @param string|null $activatedAt - datetime string
 * @param int|null $daysTotal - total days purchased
 * @return int remaining days (0 if expired or null)
 */
if (!function_exists('getGamePassRemainingDays')) {
    function getGamePassRemainingDays($activatedAt, $daysTotal) {
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
 * Check if a game pass is currently active
 * 
 * @param string|null $activatedAt
 * @param int|null $daysTotal
 * @return bool
 */
if (!function_exists('isGamePassActive')) {
    function isGamePassActive($activatedAt, $daysTotal) {
        return getGamePassRemainingDays($activatedAt, $daysTotal) > 0;
    }
}

/**
 * Calculate the expiry datetime from activated_at + days_total (for display/compat)
 * 
 * @param string|null $activatedAt
 * @param int|null $daysTotal
 * @return string|null datetime string or null
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
    }
}

/**
 * Auto-activate Free Pass for a user (one-time, idempotent)
 * Free pass has no expiry (activated_at=NULL, days_total=NULL)
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

        // Free pass: no expiry (activated_at and days_total are NULL)
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
 * Extend a Game Pass by adding days to days_total (stackable)
 * Idempotent by paypal_order_id
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
        $stmt = $pdo->prepare("SELECT activated_at, days_total, tier FROM user_gamepass WHERE user_id = ? LIMIT 1");
        $stmt->execute(array($userId));
        $gp = $stmt->fetch(PDO::FETCH_ASSOC);

        $oldDaysTotal = 0;
        $oldActivatedAt = null;
        $newDaysTotal = $days;

        if ($gp) {
            $oldActivatedAt = isset($gp['activated_at']) ? $gp['activated_at'] : null;
            $oldDaysTotal = isset($gp['days_total']) ? (int)$gp['days_total'] : 0;

            // If pass is still active, stack days on top
            if (isGamePassActive($oldActivatedAt, $oldDaysTotal)) {
                $newDaysTotal = $oldDaysTotal + $days;
            } else {
                // Pass expired - start a fresh period
                $oldActivatedAt = date('Y-m-d H:i:s');
                $newDaysTotal = $days;
            }
        } else {
            // No pass row - create fresh
            $oldActivatedAt = date('Y-m-d H:i:s');
            $newDaysTotal = $days;
        }

        $oldExpiry = getGamePassExpiryDate($oldActivatedAt, $oldDaysTotal);
        $newExpiry = getGamePassExpiryDate($gp ? $oldActivatedAt : date('Y-m-d H:i:s'), $newDaysTotal);

        // Update user_gamepass
        if ($gp) {
            if (isGamePassActive($gp['activated_at'], $gp['days_total'])) {
                // Active: just add days
                $stmt = $pdo->prepare("UPDATE user_gamepass SET days_total = ?, is_premium = 1, tier = ?, expires_at = ?, updated_at = NOW() WHERE user_id = ?");
                $stmt->execute(array($newDaysTotal, $tier, $newExpiry, $userId));
            } else {
                // Expired: reset activation
                $nowStr = date('Y-m-d H:i:s');
                $freshExpiry = getGamePassExpiryDate($nowStr, $days);
                $stmt = $pdo->prepare("UPDATE user_gamepass SET activated_at = ?, days_total = ?, is_premium = 1, tier = ?, expires_at = ?, updated_at = NOW() WHERE user_id = ?");
                $stmt->execute(array($nowStr, $days, $tier, $freshExpiry, $userId));
            }
        } else {
            $nowStr = date('Y-m-d H:i:s');
            $freshExpiry = getGamePassExpiryDate($nowStr, $days);
            $stmt = $pdo->prepare("INSERT INTO user_gamepass (user_id, is_premium, tier, activated_at, days_total, expires_at, created_at, updated_at) VALUES (?, 1, ?, ?, ?, ?, NOW(), NOW())");
            $stmt->execute(array($userId, $tier, $nowStr, $days, $freshExpiry));
        }

        // Update extension record
        $stmt = $pdo->prepare("UPDATE gamepass_extensions SET status = 'completed', old_until = ?, new_until = ?, paypal_capture_id = ?, completed_at = NOW() WHERE id = ?");
        $stmt->execute(array($oldExpiry, $newExpiry, $captureId, $extensionId));

        error_log("RID={$RID} EXTEND_COMPLETED user={$userId} tier={$tier} days={$days} old_total={$oldDaysTotal} new_total={$newDaysTotal}");

        return array('success' => true, 'message' => 'Pass extended', 'days_added' => $days, 'days_total' => $newDaysTotal);
    }
}

/**
 * Activate a paid Game Pass (elite/gold) idempotently
 * Uses activated_at + days_total model (static 30 days from purchase record)
 * After expiry, buying again starts a fresh 30-day period
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

        // Look up days from purchase record (default 30)
        $days = 30;
        $purchaseStmt = $pdo->prepare("SELECT days FROM gamepass_purchases WHERE paypal_order_id = ? LIMIT 1");
        $purchaseStmt->execute(array($paypalOrderId));
        $purchaseRow = $purchaseStmt->fetch(PDO::FETCH_ASSOC);
        if ($purchaseRow && isset($purchaseRow['days']) && (int)$purchaseRow['days'] > 0) {
            $days = (int)$purchaseRow['days'];
        }

        $nowStr = date('Y-m-d H:i:s');

        // Upsert user_gamepass
        $stmt = $pdo->prepare("SELECT id, activated_at, days_total FROM user_gamepass WHERE user_id = ?");
        $stmt->execute(array($userId));
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $oldActivatedAt = isset($existing['activated_at']) ? $existing['activated_at'] : null;
            $oldDaysTotal = isset($existing['days_total']) ? (int)$existing['days_total'] : 0;

            if (isGamePassActive($oldActivatedAt, $oldDaysTotal)) {
                // Still active: stack days on top
                $newDaysTotal = $oldDaysTotal + $days;
                $expiresAt = getGamePassExpiryDate($oldActivatedAt, $newDaysTotal);
                $stmt = $pdo->prepare("UPDATE user_gamepass SET is_premium = 1, tier = ?, days_total = ?, expires_at = ?, paypal_order_id = ?, updated_at = NOW() WHERE user_id = ?");
                $stmt->execute(array($tier, $newDaysTotal, $expiresAt, $paypalOrderId, $userId));
            } else {
                // Expired: start fresh 30-day period
                $expiresAt = getGamePassExpiryDate($nowStr, $days);
                $stmt = $pdo->prepare("UPDATE user_gamepass SET is_premium = 1, tier = ?, activated_at = ?, days_total = ?, expires_at = ?, paypal_order_id = ?, updated_at = NOW() WHERE user_id = ?");
                $stmt->execute(array($tier, $nowStr, $days, $expiresAt, $paypalOrderId, $userId));
            }
        } else {
            $expiresAt = getGamePassExpiryDate($nowStr, $days);
            $stmt = $pdo->prepare("INSERT INTO user_gamepass (user_id, is_premium, tier, activated_at, days_total, expires_at, paypal_order_id, created_at, updated_at) VALUES (?, 1, ?, ?, ?, ?, ?, NOW(), NOW())");
            $stmt->execute(array($userId, $tier, $nowStr, $days, $expiresAt, $paypalOrderId));
        }

        // Update gamepass_purchases
        try {
            $stmt = $pdo->prepare("UPDATE gamepass_purchases SET status = 'completed', paypal_capture_id = ?, completed_at = NOW() WHERE paypal_order_id = ? AND status = 'pending'");
            $stmt->execute(array($captureId, $paypalOrderId));
        } catch (Exception $e) {
            error_log("RID={$RID} GAMEPASS_PURCHASE_UPDATE_ERR: " . $e->getMessage());
        }

        error_log("RID={$RID} GAMEPASS_ACTIVATED user={$userId} tier={$tier} days={$days} activated_at={$nowStr} order={$paypalOrderId}");

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
