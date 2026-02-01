<?php
/**
 * mail_delivery.php - Centralized in-game mail delivery system
 * 
 * Sends items, currency, and rewards via the mailtab_sg system.
 * Used by: order fulfillment, game pass rewards, VIP rewards, admin gifts
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
        $coins = intval($coins);
        $zen = intval($zen);
        $exp = intval($exp);
        $itemId = intval($itemId);
        $qty = intval($qty);
        
        if ($roleId <= 0) {
            return array('success' => false, 'message' => 'Invalid role ID');
        }
        
        if (empty($title)) {
            $title = 'System Reward';
        }
        if (empty($text)) {
            $text = 'You received a reward!';
        }
        
        // Sanitize inputs
        $title = substr(trim($title), 0, 100);
        $text = substr(trim($text), 0, 500);
        
        if ($itemId === 0) $qty = 0;
        if ($qty < 0) $qty = 0;
        
        // Build the mail blob
        $blob = $this->buildMailBlob($title, $text, $coins, $zen, $exp, $itemId, $qty);
        
        // Validate blob format
        if (!preg_match('/^0x[0-9A-Fa-f]+$/', $blob)) {
            return array('success' => false, 'message' => 'Generated blob is invalid');
        }
        
        // Insert into mailtab_sg (blob is NOT quoted - MySQL hex literal)
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
            } catch (PDOException $e) {
                return array('success' => false, 'message' => 'Insert failed', 'error' => $e->getMessage());
            }
        } else {
            return array('success' => false, 'message' => 'Invalid database connection type');
        }
        
        return array(
            'success' => true,
            'message' => 'Mail sent successfully',
            'insert_id' => $insertId,
            'role_id' => $roleId
        );
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
     * Send order fulfillment mail
     */
    public function sendOrderReward($roleId, $productName, $itemId, $qty, $coins = 0, $zen = 0) {
        $title = 'Shop Purchase';
        $text = "Your order for {$productName} has been delivered!";
        return $this->sendMail($roleId, $title, $text, $coins, $zen, 0, $itemId, $qty);
    }
    
    /**
     * Send Game Pass reward mail
     */
    public function sendGamePassReward($roleId, $day, $tier, $itemId, $qty, $coins = 0, $zen = 0, $exp = 0) {
        $tierLabel = ($tier === 'elite') ? 'Elite' : 'Free';
        $title = "Game Pass Day {$day}";
        $text = "{$tierLabel} reward for Day {$day}. Enjoy!";
        return $this->sendMail($roleId, $title, $text, $coins, $zen, $exp, $itemId, $qty);
    }
    
    /**
     * Send VIP reward mail
     */
    public function sendVIPReward($roleId, $rewardName, $itemId, $qty, $coins = 0, $zen = 0) {
        $title = 'VIP Reward';
        $text = "Thank you for being a VIP! Here is your {$rewardName}.";
        return $this->sendMail($roleId, $title, $text, $coins, $zen, 0, $itemId, $qty);
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
        $textHex = $this->strToHex($text);
        
        // Format coins (4 bytes, little-endian)
        $coinsHex = dechex($coins);
        if (strlen($coinsHex) == 1) $coinsHex = '0' . $coinsHex;
        for ($i = strlen($coinsHex); $i < 8; $i++) $coinsHex = '0' . $coinsHex;
        $coinsHex = substr($coinsHex, 6) . substr($coinsHex, 4, 2) . substr($coinsHex, 2, 2) . substr($coinsHex, 0, 2);
        
        // Format zen (4 bytes, little-endian)
        $zenHex = dechex($zen);
        if (strlen($zenHex) == 1) $zenHex = '0' . $zenHex;
        for ($i = strlen($zenHex); $i < 8; $i++) $zenHex = '0' . $zenHex;
        $zenHex = substr($zenHex, 6) . substr($zenHex, 4, 2) . substr($zenHex, 2, 2) . substr($zenHex, 0, 2);
        
        // Format exp (4 bytes, little-endian)
        $expHex = dechex($exp);
        if (strlen($expHex) == 1) $expHex = '0' . $expHex;
        for ($i = strlen($expHex); $i < 8; $i++) $expHex = '0' . $expHex;
        $expHex = substr($expHex, 6) . substr($expHex, 4, 2) . substr($expHex, 2, 2) . substr($expHex, 0, 2);
        
        // Build base blob
        $blob = '0x6600010000' . $t_len . '00' . $titleHex . '00' . $txt_len . '00' . $textHex . '0001' . $coinsHex . $zenHex . $expHex;
        
        // Add item data
        if ($itemId == 0) {
            $blob .= '000000000000000000';
        } else {
            $qtyHex = dechex($qty);
            if (strlen($qtyHex) == 1) $qtyHex = '0' . $qtyHex;
            
            $itemHex = dechex($itemId);
            if (strlen($itemHex) == 1) $itemHex = '0' . $itemHex;
            for ($i = strlen($itemHex); $i < 4; $i++) $itemHex = '0' . $itemHex;
            $itemHex = substr($itemHex, 2) . substr($itemHex, 0, 2);
            
            $unique = uniqid();
            $unique = substr($unique, 8, 2) . substr($unique, 6, 2);
            
            $itemBlob = '64464f70d314e0297a9dffff' . $itemHex . '0000' . $qtyHex . $unique . '959a2919e029';
            $itemBlob .= '0000000000000000000000000000000000000000000000000000000000000000';
            $itemBlob .= '0000000000000000000000000000000000000000000000000000000000000000';
            $itemBlob .= '0000000000000000000000000000000000000000000000000000000000000000';
            $itemBlob .= '0000000000000000000000000000000000000000000000000000000000000000';
            
            $blob .= $itemBlob;
        }
        
        return $blob;
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
    // Get account name
    $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ? LIMIT 1");
    $stmt->execute(array($userId));
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) return 0;
    
    $accountName = $user['name'];
    
    // Get first active character
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
