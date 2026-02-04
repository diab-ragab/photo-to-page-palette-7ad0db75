<?php
/**
 * mail_delivery.php - Centralized in-game mail delivery system
 * Sends coins/zen/exp/items via mailtab_sg
 * PHP 5.3+ compatible
 */

class GameMailer {
    private $db;

    public function __construct($dbConnection) {
        $this->db = $dbConnection;
    }

    /**
     * Send mail to a character (role)
     * 
     * @param int $roleId - Character ID (from basetab_sg)
     * @param string $title - Mail subject
     * @param string $text - Mail body text
     * @param int $coins - Coins to attach
     * @param int $zen - Zen/Gold to attach
     * @param int $exp - Experience to attach
     * @param int $itemId - Item ID to attach (0 for none)
     * @param int $qty - Item quantity
     * @return array - Result with success status
     */
    public function sendMail($roleId, $title, $text, $coins = 0, $zen = 0, $exp = 0, $itemId = 0, $qty = 0) {
        $roleId = intval($roleId);
        $coins  = intval($coins);
        $zen    = intval($zen);
        $exp    = intval($exp);
        $itemId = intval($itemId);
        $qty    = intval($qty);

        if ($roleId <= 0) {
            return array('success' => false, 'message' => 'Invalid role ID');
        }

        if ($title === '' || $title === null) $title = 'System Reward';
        if ($text === ''  || $text === null)  $text  = 'You received a reward!';

        $title = substr(trim($title), 0, 100);
        $text  = substr(trim($text),  0, 500);

        if ($itemId === 0) $qty = 0;
        if ($qty < 0) $qty = 0;

        $blob = $this->buildMailBlob($title, $text, $coins, $zen, $exp, $itemId, $qty);

        if (!preg_match('/^0x[0-9A-Fa-f]+$/', $blob)) {
            return array('success' => false, 'message' => 'Generated blob is invalid');
        }

        // IMPORTANT: blob is NOT quoted - MySQL hex literal
        $sql = "INSERT INTO mailtab_sg (SenderID, TargerID, MailInfo, CreateTime)
                VALUES (0, {$roleId}, {$blob}, NOW())";

        if ($this->db instanceof mysqli) {
            if (!$this->db->query($sql)) {
                return array('success' => false, 'message' => 'Insert failed', 'error' => $this->db->error);
            }
            $insertId = $this->db->insert_id;
        } else if ($this->db instanceof PDO) {
            try {
                $this->db->exec($sql);
                $insertId = $this->db->lastInsertId();
            } catch (Exception $e) {
                return array('success' => false, 'message' => 'Insert failed', 'error' => $e->getMessage());
            }
        } else {
            return array('success' => false, 'message' => 'Invalid database connection type');
        }

        return array('success' => true, 'message' => 'Mail sent', 'insert_id' => $insertId, 'role_id' => $roleId);
    }

    /**
     * Send mail to multiple characters
     */
    public function sendMailBulk($roleIds, $title, $text, $coins = 0, $zen = 0, $exp = 0, $itemId = 0, $qty = 0) {
        $results = array();
        foreach ($roleIds as $roleId) {
            $results[] = $this->sendMail($roleId, $title, $text, $coins, $zen, $exp, $itemId, $qty);
        }
        return $results;
    }

    /**
     * Order fulfillment mail (supports coins, zen, exp, items)
     * 
     * @param int $roleId - Character ID
     * @param string $productName - Product name for mail text
     * @param int $itemId - Item ID (0 for currency-only rewards)
     * @param int $qty - Item quantity
     * @param int $coins - Coins to attach
     * @param int $zen - Zen to attach
     * @param int $exp - EXP to attach
     * @return array - Result with success status
     */
    public function sendOrderReward($roleId, $productName, $itemId, $qty, $coins = 0, $zen = 0, $exp = 0) {
        $title = 'Shop Purchase';
        $text  = "Your order for {$productName} has been delivered!";
        return $this->sendMail($roleId, $title, $text, $coins, $zen, $exp, $itemId, $qty);
    }

    /**
     * Send Game Pass reward mail
     */
    public function sendGamePassReward($roleId, $day, $tier, $itemId, $qty, $coins = 0, $zen = 0, $exp = 0) {
        $tierLabel = ($tier === 'elite') ? 'Elite' : 'Free';
        $title = "Game Pass Day {$day}";
        $text  = "{$tierLabel} reward for Day {$day}. Enjoy!";
        return $this->sendMail($roleId, $title, $text, $coins, $zen, $exp, $itemId, $qty);
    }

    /**
     * Send VIP reward mail
     */
    public function sendVIPReward($roleId, $rewardName, $itemId, $qty, $coins = 0, $zen = 0) {
        $title = 'VIP Reward';
        $text  = "Thank you for being a VIP! Here is your {$rewardName}.";
        return $this->sendMail($roleId, $title, $text, $coins, $zen, 0, $itemId, $qty);
    }

    /**
     * Send Bundle reward mail - delivers all items via multiple mails
     * 
     * @param int $roleId - Character ID
     * @param string $bundleName - Bundle name for mail title
     * @param array $items - Array of bundle items [{item_name, quantity, icon, item_id, item_quantity}]
     * @return array - Result with success status
     */
    public function sendBundleReward($roleId, $bundleName, $items) {
        $results = array();
        $successCount = 0;
        $lastInsertId = 0;
        
        foreach ($items as $item) {
            $itemName = isset($item['item_name']) ? $item['item_name'] : 'Bundle Item';
            $gameItemId = isset($item['item_id']) ? intval($item['item_id']) : 0;
            $gameItemQty = isset($item['item_quantity']) ? intval($item['item_quantity']) : 1;
            $displayQty = isset($item['quantity']) ? intval($item['quantity']) : 1;
            
            // Total quantity = display quantity * item_quantity
            $totalQty = $displayQty * $gameItemQty;
            
            // Skip items with no game item mapping (display only)
            if ($gameItemId === 0) {
                continue;
            }
            
            // Determine reward type based on item_id rules
            $coins = 0;
            $zen = 0;
            $exp = 0;
            $mailItemId = 0;
            $mailQty = 0;
            
            if ($gameItemId > 0) {
                // Real game item
                $mailItemId = $gameItemId;
                $mailQty = $totalQty;
            } else if ($gameItemId == -1) {
                // Zen currency
                $zen = $totalQty;
            } else if ($gameItemId == -2) {
                // Coins currency
                $coins = $totalQty;
            } else if ($gameItemId == -3) {
                // EXP
                $exp = $totalQty;
            }
            
            $title = 'Flash Sale Bundle';
            $text = "{$bundleName}: {$itemName}";
            
            $result = $this->sendMail($roleId, $title, $text, $coins, $zen, $exp, $mailItemId, $mailQty);
            $results[] = $result;
            
            if ($result['success']) {
                $successCount++;
                $lastInsertId = $result['insert_id'];
            }
        }
        
        // If no deliverable items, send notification mail
        if (count($results) === 0) {
            $itemList = array();
            foreach ($items as $item) {
                $itemName = isset($item['item_name']) ? $item['item_name'] : 'Item';
                $qty = isset($item['quantity']) ? intval($item['quantity']) : 1;
                $itemList[] = "{$itemName} x{$qty}";
            }
            $text = "{$bundleName}: " . implode(', ', $itemList) . ". Check your inventory!";
            return $this->sendMail($roleId, 'Flash Sale Bundle', $text, 0, 0, 0, 0, 0);
        }
        
        return array(
            'success' => $successCount > 0,
            'message' => "Delivered {$successCount}/" . count($results) . " items",
            'insert_id' => $lastInsertId,
            'results' => $results
        );
    }

    /**
     * Build the binary blob for mailtab_sg
     */
    private function buildMailBlob($title, $text, $coins, $zen, $exp, $itemId, $qty) {
        $t_len = dechex(strlen($title) + 1);
        if (strlen($t_len) == 1) $t_len = '0' . $t_len;

        $txt_len = dechex(strlen($text) + 1);
        if (strlen($txt_len) == 1) $txt_len = '0' . $txt_len;

        $titleHex = $this->strToHex($title);
        $textHex  = $this->strToHex($text);

        $coinsHex = $this->toLE32($coins);
        $zenHex   = $this->toLE32($zen);
        $expHex   = $this->toLE32($exp);

        // Base blob
        $blob = '0x6600010000' . $t_len . '00' . $titleHex . '00' . $txt_len . '00' . $textHex . '0001' . $coinsHex . $zenHex . $expHex;

        // Add item data
        if ($itemId == 0) {
            $blob .= '000000000000000000';
            return $blob;
        }

        // qty is 1 byte
        $qtyHex = dechex($qty);
        if (strlen($qtyHex) == 1) $qtyHex = '0' . $qtyHex;
        if (strlen($qtyHex) > 2) $qtyHex = substr($qtyHex, -2);

        // item id is 2 bytes LE
        $itemHex = dechex($itemId);
        if (strlen($itemHex) == 1) $itemHex = '0' . $itemHex;
        for ($i = strlen($itemHex); $i < 4; $i++) $itemHex = '0' . $itemHex;
        $itemHex = substr($itemHex, 2) . substr($itemHex, 0, 2);

        $unique = uniqid();
        $unique = substr($unique, 8, 2) . substr($unique, 6, 2);

        // Item blob with padding
        $itemBlob = '64464f70d314e0297a9dffff' . $itemHex . '0000' . $qtyHex . $unique . '959a2919e029';
        $itemBlob .= str_repeat('00', 128);

        $blob .= $itemBlob;
        return $blob;
    }

    /**
     * Convert integer to 4-byte little-endian hex
     */
    private function toLE32($n) {
        $hex = dechex((int)$n);
        if (strlen($hex) == 1) $hex = '0' . $hex;
        for ($i = strlen($hex); $i < 8; $i++) $hex = '0' . $hex;
        return substr($hex, 6) . substr($hex, 4, 2) . substr($hex, 2, 2) . substr($hex, 0, 2);
    }

    /**
     * Convert string to hex
     */
    private function strToHex($string) {
        $hex = '';
        for ($i = 0; $i < strlen($string); $i++) {
            $hexCode = dechex(ord($string[$i]));
            $hex .= substr('0' . $hexCode, -2);
        }
        return strtoupper($hex);
    }
}

/**
 * Get character role ID from user ID
 * Returns first active character for the account
 */
function getUserRoleId($pdo, $userId) {
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

/**
 * Get all character role IDs for a user
 */
function getUserRoleIds($pdo, $userId) {
    $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ? LIMIT 1");
    $stmt->execute(array($userId));
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) return array();

    $accountName = $user['name'];

    $stmt = $pdo->prepare("SELECT RoleID FROM basetab_sg WHERE AccountID = ? AND IsDel = 0 ORDER BY RoleID ASC");
    $stmt->execute(array($accountName));

    $roleIds = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $roleIds[] = intval($row['RoleID']);
    }

    return $roleIds;
}
