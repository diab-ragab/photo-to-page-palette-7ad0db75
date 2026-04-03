-- =============================================
-- Game Pass V3 - Global 30-Day Season Model
-- 2 Tiers: Free + Premium
-- All players share the same season timeline
-- Season auto-rotates every 30 days
-- =============================================

-- STEP 1: Drop old data (CAUTION: deletes everything)
TRUNCATE TABLE user_gamepass_claims;
TRUNCATE TABLE gamepass_purchases;

-- STEP 2: Drop extensions table (no longer used)
DROP TABLE IF EXISTS gamepass_extensions;

-- STEP 3: Reset all users to free
UPDATE user_gamepass SET tier = 'free', is_premium = 0, activated_at = NULL, expires_at = NULL, days_total = NULL, updated_at = NOW();

-- STEP 4: Delete old rewards (elite/gold) - we'll use 'free' and 'premium'
DELETE FROM gamepass_rewards;

-- STEP 5: Update gamepass_settings for new model
DELETE FROM gamepass_settings WHERE setting_key IN ('gold_price_cents', 'gold_enabled', 'elite_price_cents', 'elite_enabled', 'elite_extend_per_day_cents', 'gold_extend_per_day_cents', 'zenSkipCost');
INSERT IGNORE INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('premium_price_cents', '999', NOW());
INSERT IGNORE INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('premium_enabled', '1', NOW());
INSERT IGNORE INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('zen_skip_cost', '100000', NOW());
INSERT IGNORE INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('gamepass_enabled', '1', NOW());

-- STEP 6: Set global season start (today) and season number
INSERT IGNORE INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('season_start', NOW(), NOW());
INSERT IGNORE INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('season_number', '1', NOW());

-- STEP 7: Update unique key for seasonal claim tracking
ALTER TABLE user_gamepass_claims DROP INDEX IF EXISTS uq_user_reward_cycle;
ALTER TABLE user_gamepass_claims ADD UNIQUE KEY uq_user_day_tier_cycle (user_id, day, tier, cycle_start);

-- STEP 8: Update site_settings 
DELETE FROM site_settings WHERE setting_key IN ('gamepass_gold_price', 'gamepass_elite_price', 'elite_extend_per_day_cents', 'gold_extend_per_day_cents', 'gamepass_extend_enabled');
INSERT IGNORE INTO site_settings (setting_key, setting_value, updated_at) VALUES ('gamepass_premium_price', '999', NOW());

-- Done! Upload the new PHP files and seed rewards from admin panel.
