<?php
/**
 * gamepass_helpers.php - Shared Game Pass helper functions
 * PHP 5.x compatible (no closures, no short arrays, no ??)
 *
 * Include AFTER bootstrap.php and session_helper.php
 */

/**
 * Get first active RoleID for a user
 * 
 * @param PDO $pdo
 * @param int $userId
 * @return int RoleID or 0
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
 * 
 * @param string $name
 * @return string 'free'|'elite'|'gold'|''
 */
if (!function_exists('detectGamePassTierFromName')) {
    function detectGamePassTierFromName($name) {
        $name = strtolower(trim($name));

        // Strict match
        if ($name === 'free pass') return 'free';
        if ($name === 'elite pass') return 'elite';
        if ($name === 'gold pass') return 'gold';

        // Fallback: contains "pass" + tier keyword
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
 * 
 * @param PDO $pdo
 */
if (!function_exists('ensureGamePassTables')) {
    function ensureGamePassTables($pdo) {
        $pdo->exec("CREATE TABLE IF NOT EXISTS user_gamepass (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            is_premium TINYINT(1) DEFAULT 0,
            tier VARCHAR(10) DEFAULT 'free',
            expires_at DATETIME DEFAULT NULL,
            paypal_order_id VARCHAR(255) DEFAULT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME DEFAULT NULL,
            UNIQUE KEY idx_user_unique (user_id),
            KEY idx_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

        // Safe column adds
        try { $pdo->exec("ALTER TABLE user_gamepass ADD COLUMN tier VARCHAR(10) DEFAULT 'free'"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE user_gamepass ADD COLUMN paypal_order_id VARCHAR(255) DEFAULT NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE user_gamepass ADD COLUMN updated_at DATETIME DEFAULT NULL"); } catch (Exception $e) {}

        $pdo->exec("CREATE TABLE IF NOT EXISTS gamepass_purchases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            tier VARCHAR(10) NOT NULL,
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

        // Safe column adds for gamepass_purchases
        try { $pdo->exec("ALTER TABLE gamepass_purchases ADD COLUMN price_eur DECIMAL(10,2) DEFAULT 0.00 AFTER tier"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE gamepass_purchases ADD COLUMN paypal_capture_id VARCHAR(64) DEFAULT NULL AFTER paypal_order_id"); } catch (Exception $e) {}
    }
}

/**
 * Auto-activate Free Pass for a user (one-time, idempotent)
 * - If user_gamepass row already exists => do nothing (no mail)
 * - Else insert free row and send activation mail once
 * 
 * @param PDO $pdo
 * @param int $userId
 * @param string $RID - Request ID for logging
 * @return array result
 */
if (!function_exists('autoActivateFreePass')) {
    function autoActivateFreePass($pdo, $userId, $RID) {
        $userId = (int)$userId;
        if ($userId <= 0) {
            return array('success' => false, 'message' => 'Invalid user ID');
        }

        ensureGamePassTables($pdo);

        // Check if user already has ANY gamepass row
        $stmt = $pdo->prepare("SELECT id, tier FROM user_gamepass WHERE user_id = ? LIMIT 1");
        $stmt->execute(array($userId));
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            // Already has a pass (free, elite, or gold) - do nothing
            return array('success' => true, 'message' => 'Pass already exists', 'tier' => $existing['tier'], 'new' => false);
        }

        // Insert free pass row
        $stmt = $pdo->prepare("INSERT INTO user_gamepass (user_id, is_premium, tier, expires_at, created_at, updated_at) VALUES (?, 0, 'free', NULL, NOW(), NOW())");
        $stmt->execute(array($userId));

        error_log("RID={$RID} FREE_PASS_ACTIVATED user={$userId}");

        // Also log in gamepass_purchases for order history
        try {
            $stmt = $pdo->prepare("INSERT INTO gamepass_purchases (user_id, tier, price_eur, status, created_at, completed_at) VALUES (?, 'free', 0.00, 'completed', NOW(), NOW())");
            $stmt->execute(array($userId));
        } catch (Exception $e) {
            error_log("RID={$RID} FREE_PASS_PURCHASE_LOG_ERR: " . $e->getMessage());
        }

        // Send activation mail if character exists
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
 * Activate a paid Game Pass (elite/gold) idempotently
 * Also sends activation mail ONE TIME
 * 
 * @param PDO $pdo
 * @param int $userId
 * @param string $tier 'elite' or 'gold'
 * @param string $paypalOrderId
 * @param string $captureId
 * @param string $RID
 * @return bool true if newly activated, false if already done
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

        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));

        // Upsert user_gamepass
        $stmt = $pdo->prepare("SELECT id FROM user_gamepass WHERE user_id = ?");
        $stmt->execute(array($userId));
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $stmt = $pdo->prepare("UPDATE user_gamepass SET is_premium = 1, tier = ?, expires_at = ?, paypal_order_id = ?, updated_at = NOW() WHERE user_id = ?");
            $stmt->execute(array($tier, $expiresAt, $paypalOrderId, $userId));
        } else {
            $stmt = $pdo->prepare("INSERT INTO user_gamepass (user_id, is_premium, tier, expires_at, paypal_order_id, created_at, updated_at) VALUES (?, 1, ?, ?, ?, NOW(), NOW())");
            $stmt->execute(array($userId, $tier, $expiresAt, $paypalOrderId));
        }

        // Update gamepass_purchases
        try {
            $stmt = $pdo->prepare("UPDATE gamepass_purchases SET status = 'completed', paypal_capture_id = ?, completed_at = NOW() WHERE paypal_order_id = ? AND status = 'pending'");
            $stmt->execute(array($captureId, $paypalOrderId));
        } catch (Exception $e) {
            error_log("RID={$RID} GAMEPASS_PURCHASE_UPDATE_ERR: " . $e->getMessage());
        }

        error_log("RID={$RID} GAMEPASS_ACTIVATED user={$userId} tier={$tier} expires={$expiresAt} order={$paypalOrderId}");

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
