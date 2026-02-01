
# Fix Order and Game Pass Fulfillment - Syntax Fix and Verification

## Problem Identified
There's a **PHP syntax error** in `payment_confirm.php` that's causing the "Unexpected token '<'" error. The script is crashing before it can output JSON, which breaks the entire order confirmation flow.

### Root Cause
Line 113-114 is missing a closing brace. The code structure is:
```php
if ($orderId <= 0) {           // Opens block
    ...
    if ($webshopOrder) {       // Opens nested block  
        ...
    }                          // MISSING - should close nested block
}                              // Line 113 - only one brace here
```

This causes PHP to throw a parse error, outputting HTML error text instead of JSON.

---

## Fix Required

### Fix 1: Correct the missing brace in `payment_confirm.php`
**Line 113** - Add the missing closing brace:

```php
// BEFORE (broken):
            error_log("RID={$RID} FOUND_ORDER_BY_SESSION session={$sessionId} order={$orderId}");
            }
    }
}

// AFTER (fixed):
            error_log("RID={$RID} FOUND_ORDER_BY_SESSION session={$sessionId} order={$orderId}");
            }
        }
    }
}
```

---

## Verification After Fix

Once the syntax is fixed, the flow will work as follows:

### Order Flow
1. User adds items to cart → clicks checkout
2. `stripe_checkout.php` creates `pending` order records with `stripe_session_id`
3. Stripe redirects to PaymentSuccess page after payment
4. `payment_confirm.php` is called with `sessionId`
5. Script finds pending orders by `stripe_session_id` → marks as `completed`
6. `fulfillOrder()` uses `GameMailer` to send items to in-game mailbox

### Game Pass Flow
1. User opens Game Pass → clicks claim on a day
2. `gamepass.php?action=claim` verifies eligibility
3. `getUserRoleId()` fetches player's character ID
4. `GameMailer->sendGamePassReward()` inserts into `mailtab_sg`
5. Record added to `user_gamepass_claims` to prevent re-claiming

---

## Technical Details

### Mail Delivery System
The `GameMailer` class builds a binary blob for the `mailtab_sg` table:
- Uses the exact blob format your game server expects
- Supports: Coins, Zen, EXP, and physical items with quantities
- Works with both mysqli and PDO connections

### Character Resolution
`getUserRoleId($pdo, $userId)` resolves:
1. `users.name` (account name) from web user ID
2. First active character from `basetab_sg WHERE AccountID = ? AND IsDel = 0`
3. Returns `RoleID` for mail delivery

### Fallback for Missing Characters
If no character exists, order is saved to `pending_deliveries` table for later processing.

---

## Files to Modify

| File | Change |
|------|--------|
| `public/api-reference/payment_confirm.php` | Fix missing brace on line 113 |

---

## After Implementation

1. Upload the fixed `payment_confirm.php` to your server
2. Test by making a purchase - order should appear in Order History
3. Test Game Pass claim - reward should arrive in game mailbox
4. Check server logs for `MAIL_SENT` entries to confirm delivery
