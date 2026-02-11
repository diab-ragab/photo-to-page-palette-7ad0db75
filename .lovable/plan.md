
# Update API Files to Use New Session Helper

## Problem
Several API files still use **old manual session lookups** (raw `SELECT ... FROM user_sessions WHERE session_token = ?` without SHA-256 hashing), which causes "Invalid session" errors. The new `session_helper.php` uses `resolveSessionRow()` which tries raw token, SHA-256 hash, and optional hash columns -- but these files bypass it entirely.

## Files That Need Updating

### 1. `order_status.php` (HIGH priority - checkout flow)
- Still requires legacy `db.php` (should be removed)
- Does NOT include `session_helper.php`
- Manual session lookup without SHA-256 hash
- **Fix**: Include `session_helper.php`, replace manual lookup with `resolveSessionRow()`, add CORS via `handleCors()`

### 2. `create_payment_intent.php` (HIGH priority - payment flow)
- Still requires legacy `db.php`
- Does NOT include `session_helper.php`
- Manual session lookup without hash
- **Fix**: Include `session_helper.php`, use `resolveSessionRow()`, remove `db.php`

### 3. `user_characters.php` (HIGH priority - checkout character selector)
- Does NOT include `session_helper.php`
- Manual token extraction from headers only (misses query params, cookies, JSON body)
- Manual session lookup without hash
- No `handleCors()` call
- **Fix**: Include `session_helper.php`, use `getSessionToken()` + `resolveSessionRow()`, add `handleCors()`

### 4. `bundles.php` - purchase case (MEDIUM priority)
- Already includes `session_helper.php` but the `purchase` case uses its own `getBearerToken()` and manual `SELECT` without hash
- **Fix**: Replace `getBearerToken()` call with `getSessionToken()`, replace manual lookup with `resolveSessionRow()`

### 5. `payment_confirm.php` (MEDIUM priority)
- Does NOT include `session_helper.php`
- Has its own session verification logic
- **Fix**: Include `session_helper.php`, use centralized functions

## Technical Details

For each file, the changes follow the same pattern:

```text
BEFORE (broken):
  $stmt = $pdo->prepare("SELECT user_id FROM user_sessions WHERE session_token = ? LIMIT 1");
  $stmt->execute(array($token));

AFTER (works with hashed tokens):
  $sess = resolveSessionRow($token);
  if (!$sess) { fail(401, 'Invalid session'); }
  $userId = (int)$sess['user_id'];
```

### Changes per file:

**order_status.php**
- Remove `require_once db.php`
- Add `require_once session_helper.php`
- Add `handleCors(array('GET', 'OPTIONS'))`
- Replace manual token extraction with `getSessionToken()`
- Replace manual DB query with `resolveSessionRow()`

**create_payment_intent.php**
- Remove `require_once db.php`
- Add `require_once session_helper.php`
- Replace manual session lookup with `resolveSessionRow()`

**user_characters.php**
- Add `require_once session_helper.php`
- Add `handleCors(array('GET', 'OPTIONS'))`
- Replace manual header reading + DB query with `getSessionToken()` + `resolveSessionRow()`

**bundles.php (purchase case only)**
- Replace `getBearerToken()` with `getSessionToken()`
- Replace manual `SELECT user_id FROM user_sessions` with `resolveSessionRow()`

**payment_confirm.php**
- Add `require_once session_helper.php`
- Use centralized session functions where applicable

All changes maintain PHP 5.1 compatibility (no closures, no `??`, `array()` syntax).
