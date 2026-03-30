-- =============================================
-- Game Pass V3 - Individual 30-Day Model
-- 2 Tiers: Free + Premium
-- Each player gets 30 days from their purchase date
-- =============================================

-- STEP 1: Drop old data (CAUTION: deletes everything)
TRUNCATE TABLE user_gamepass_claims;
TRUNCATE TABLE gamepass_purchases;
-- If gamepass_extensions exists:
-- TRUNCATE TABLE gamepass_extensions;

-- STEP 2: Reset all users to free
UPDATE user_gamepass SET tier = 'free', is_premium = 0, activated_at = NULL, expires_at = NULL, days_total = NULL, updated_at = NOW();

-- STEP 3: Delete old rewards (gold/elite) - we'll use 'free' and 'premium'
DELETE FROM gamepass_rewards;

-- STEP 4: Update gamepass_settings for new model
DELETE FROM gamepass_settings WHERE setting_key IN ('gold_price_cents', 'gold_enabled', 'elite_price_cents', 'elite_enabled');
INSERT IGNORE INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('premium_price_cents', '999', NOW());
INSERT IGNORE INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('premium_enabled', '1', NOW());
INSERT IGNORE INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('zen_skip_cost', '100000', NOW());
INSERT IGNORE INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES ('gamepass_enabled', '1', NOW());

-- STEP 5: Update site_settings 
DELETE FROM site_settings WHERE setting_key IN ('gamepass_gold_price', 'gamepass_elite_price');
INSERT IGNORE INTO site_settings (setting_key, setting_value, updated_at) VALUES ('gamepass_premium_price', '999', NOW());

-- Done! Now upload the new PHP files and seed rewards from admin panel.
