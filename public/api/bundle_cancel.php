<?php
/**
 * bundle_cancel.php - Restore bundle stock on payment failure/cancellation
 * 
 * POST /api/bundle_cancel.php
 * Body: { sessionId: string }
 * 
 * Called when user cancels PayPal checkout or payment fails.
 * Restores reserved stock and marks order as failed.
 */

require_once __DIR__ . '/bootstrap.php';
handleCors(array('POST', 'OPTIONS'));

$RID = bin2hex(random_bytes(6));

function json_response($data) {
    global $RID;
    while (ob_get_level()) { ob_end_clean(); }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array_merge($data, array('rid' => $RID)), JSON_UNESCAPED_UNICODE);
    exit;
}

function json_fail($code, $msg) {
    global $RID;
    error_log("RID={$RID} BUNDLE_CANCEL RESP={$code} MSG={$msg}");
    while (ob_get_level()) { ob_end_clean(); }
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('success' => false, 'message' => $msg, 'rid' => $RID), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_fail(405, 'Method not allowed');
}

$pdo = getDB();

// Parse request body
$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true);

if (!$body) {
    json_fail(400, 'Invalid JSON body');
}

$sessionId = isset($body['sessionId']) ? trim($body['sessionId']) : '';
$paypalOrderId = isset($body['paypalOrderId']) ? trim($body['paypalOrderId']) : '';

// Use paypalOrderId for lookup
$lookupId = '';
$lookupColumn = 'paypal_order_id';

if (!empty($paypalOrderId)) {
    $lookupId = $paypalOrderId;
} elseif (!empty($sessionId)) {
    $lookupId = $sessionId;
}

if (empty($lookupId)) {
    json_fail(400, 'Order ID required');
}

error_log("RID={$RID} BUNDLE_CANCEL_START id={$lookupId}");

// Find pending bundle orders
$stmt = $pdo->prepare("
    SELECT id, bundle_id, status 
    FROM bundle_orders 
    WHERE {$lookupColumn} = ? AND status = 'pending'
");
$stmt->execute(array($lookupId));
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($orders) === 0) {
    // No pending orders - might already be processed or canceled
    error_log("RID={$RID} BUNDLE_CANCEL_NO_ORDERS session={$sessionId}");
    json_response(array('success' => true, 'message' => 'No pending orders found', 'restored' => 0));
}

$restoredCount = 0;

foreach ($orders as $order) {
    $orderId = (int)$order['id'];
    $bundleId = (int)$order['bundle_id'];
    
    // Mark order as failed
    $stmt = $pdo->prepare("UPDATE bundle_orders SET status = 'failed' WHERE id = ? AND status = 'pending'");
    $stmt->execute(array($orderId));
    
    if ($stmt->rowCount() > 0) {
        // Restore stock
        $stmt = $pdo->prepare("UPDATE flash_bundles SET stock = stock + 1 WHERE id = ? AND stock IS NOT NULL");
        $stmt->execute(array($bundleId));
        
        if ($stmt->rowCount() > 0) {
            $restoredCount++;
            error_log("RID={$RID} BUNDLE_STOCK_RESTORED order={$orderId} bundle={$bundleId}");
        }
        
        error_log("RID={$RID} BUNDLE_ORDER_FAILED order={$orderId} bundle={$bundleId}");
    }
}

json_response(array(
    'success' => true,
    'message' => 'Bundle orders canceled and stock restored',
    'restored' => $restoredCount
));
