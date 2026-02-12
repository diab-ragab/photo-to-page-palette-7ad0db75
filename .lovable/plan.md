

# Game Pass: 3-Tier System (Free, Elite, Gold) with Stripe Purchase

## Summary
Expand the current 2-tier Game Pass (Free + Elite) to a 3-tier system (Free, Elite, Gold) where Elite and Gold tiers can be purchased via Stripe Checkout. Admin can manage rewards for all 3 tiers.

## Current State
- Game Pass has **Free** and **Elite** tiers
- `gamepass_rewards` table stores rewards with `tier` column (`free` / `elite`)
- `user_gamepass` table tracks premium status (`is_premium` flag)
- Admin manager (`GamePassRewardsManager`) manages Free/Elite rewards
- Stripe checkout already works via `stripe_checkout.php` (raw Stripe API, no SDK)
- `ElitePassUpsell` component has hardcoded "9.99/month" text

## What Changes

### 1. Database Changes (PHP backend)

**`gamepass_rewards` table** - The `tier` column currently allows `free` / `elite`. Add `gold` as a valid tier value. Since MySQL 5.1 ENUM altering can be tricky, use VARCHAR instead or ALTER ENUM.

**`user_gamepass` table** - Replace the boolean `is_premium` with a `tier` column storing `free`, `elite`, or `gold`. Add `stripe_session_id` for tracking purchases.

```text
ALTER TABLE user_gamepass ADD COLUMN tier VARCHAR(10) DEFAULT 'free';
UPDATE user_gamepass SET tier = 'elite' WHERE is_premium = 1;
```

### 2. Backend: `gamepass_admin.php` Updates
- Allow `gold` as a valid tier in `add_reward` and `update_reward` actions
- Update validation: `in_array($tierInput, array('free', 'elite', 'gold'))`

### 3. Backend: `gamepass.php` Updates
- **`status` action**: Return the user's current tier (`free`, `elite`, `gold`) instead of just `is_premium`
- **`claim` action**: Check if user's purchased tier matches the reward tier (elite users can claim elite, gold users can claim elite + gold)
- **`rewards` action**: Include gold-tier rewards in the response

### 4. Backend: New `gamepass_purchase.php` Endpoint
- Creates a Stripe Checkout session for purchasing Elite or Gold Game Pass
- Uses the existing `stripeRequest()` pattern from `stripe_checkout.php` (raw HTTP, no SDK)
- On success URL, a confirmation endpoint updates `user_gamepass` tier
- Flow:
  1. POST `{ tier: "elite" }` or `{ tier: "gold" }`
  2. Creates Stripe session with the correct price
  3. Returns checkout URL
  4. After payment, webhook or success-page verification upgrades the user's tier

### 5. Backend: Update `stripe_webhook.php`
- Handle Game Pass purchase completions
- Set `user_gamepass.tier` based on the purchased product metadata

### 6. Frontend: `GamePass.tsx` Updates
- Add a **3-row layout**: Free (bottom), Elite (middle), Gold (top)
- Each tier row shows its rewards horizontally
- Gold rewards get a distinct visual style (diamond/platinum gradient)
- Show which tier the user owns (Free / Elite / Gold badge)
- Gold users can claim all tiers; Elite users can claim Free + Elite; Free users only Free
- Add purchase buttons for Elite and Gold tiers

### 7. Frontend: `GamePassRewardsManager.tsx` (Admin)
- Add `gold` to the tier dropdown selector
- Add `gold` to the filter options (All / Free / Elite / Gold)
- Gold tier gets a diamond icon in the UI

### 8. Frontend: `ElitePassUpsell.tsx` Update
- Rename/expand to show both Elite and Gold purchase options
- Show pricing for each tier
- Link to Stripe Checkout via the new `gamepass_purchase.php` endpoint

### 9. Frontend: New Type Definitions
- Update `ApiReward` interface: `tier: "free" | "elite" | "gold"`
- Update `PassReward` to include `goldReward`
- Add tier hierarchy logic: `gold > elite > free`

## Tier Hierarchy
```text
Gold  (highest) - Can claim: Free + Elite + Gold rewards
Elite (middle)  - Can claim: Free + Elite rewards
Free  (base)    - Can claim: Free rewards only
```

## Stripe Integration
- Uses the existing raw Stripe API pattern (no SDK, PHP 5.x compatible)
- Two products/prices configured in Stripe Dashboard (or created via the config)
- Prices stored in `gamepass_settings` table or `config.php`
- Monthly subscription model using `mode: 'subscription'` or one-time `mode: 'payment'` (user preference needed -- defaulting to one-time monthly payment for simplicity)

## Files to Create/Modify

| File | Action |
|------|--------|
| `public/api/gamepass_admin.php` | Modify -- add `gold` tier support |
| `public/api/gamepass.php` | Modify -- tier-based access, return user tier |
| `public/api/gamepass_purchase.php` | **Create** -- Stripe checkout for pass purchase |
| `src/components/GamePass.tsx` | Modify -- 3-tier UI, purchase buttons |
| `src/components/admin/GamePassRewardsManager.tsx` | Modify -- add gold tier option |
| `src/components/ElitePassUpsell.tsx` | Modify -- show Elite + Gold options |

## Technical Notes
- All PHP must be PHP 5.x compatible (no closures in handlers, use `array()` syntax)
- MySQL 5.1 compatible (no `DEFAULT CURRENT_TIMESTAMP` on DATETIME)
- Stripe API called via `file_get_contents` with stream context (existing pattern)
- Session token passed redundantly in URL + body + headers (existing pattern for proxy safety)

