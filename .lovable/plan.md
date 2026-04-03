

# Game Pass: Global 30-Day Season Model (Free + Premium)

## Summary
The Game Pass uses a 2-tier system (Free + Premium) with a synchronized global 30-day season. All players share the same season timeline. Season auto-rotates every 30 days. Extensions are no longer supported.

## Current State (Completed)
- **2 Tiers**: Free + Premium (Elite/Gold fully removed)
- **Global Season**: All players share a 30-day cycle managed via `gamepass_settings.season_start`
- **Auto-Rotation**: Season advances automatically every 30 days
- **Zen Skip**: Users can pay Zen to claim past days' rewards
- **PayPal Purchase**: Premium pass bought via PayPal, captured via `gamepass_capture.php`
- **Admin Controls**: Seed rewards, reset season, manage pricing from admin dashboard

## Tier Hierarchy
```text
Premium - Can claim: Free + Premium rewards (expires at season end)
Free    - Can claim: Free rewards only (always active)
```

## Key Files
| File | Purpose |
|------|---------|
| `public/api/gamepass.php` | Status, rewards list, claim rewards |
| `public/api/gamepass_admin.php` | Admin CRUD for rewards, settings, season reset |
| `public/api/gamepass_capture.php` | PayPal capture + premium activation |
| `public/api/gamepass_purchase.php` | Create PayPal order for premium |
| `public/api/gamepass_helpers.php` | Season rotation, activation, shared utils |
| `public/api/mail_delivery.php` | In-game mail for rewards/activation |
| `src/components/GamePass.tsx` | Main Game Pass UI (reward track) |
| `src/components/admin/GamePassRewardsManager.tsx` | Admin reward management |
| `src/components/admin/SettingsManager.tsx` | Season start + pricing settings |

## Deprecated (410 Gone)
- `gamepass_extend.php` - Extensions removed
- `gamepass_extend_capture.php` - Extensions removed
- `GamePassExtendCards.tsx` - Still exists but unused

## Technical Notes
- PHP 5.x compatible (no closures, `array()` syntax)
- MySQL 5.1 compatible (no `DEFAULT CURRENT_TIMESTAMP`)
- PayPal via raw HTTP (`file_get_contents` with stream context)
