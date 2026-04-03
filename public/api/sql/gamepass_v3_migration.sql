-- ============================================
-- Game Pass V3 Migration - Fix tier enum
-- Run this on your MySQL 5.1 database
-- ============================================

-- 1) Fix tier enum: replace elite/gold with premium
ALTER TABLE `gamepass_rewards`
  MODIFY COLUMN `tier` enum('free','premium') NOT NULL DEFAULT 'free';

-- 2) Fix any empty-tier rows (from failed premium inserts) → delete them so you can re-seed
DELETE FROM `gamepass_rewards` WHERE `tier` = '' OR `tier` NOT IN ('free','premium');

-- 3) Fix user_gamepass tier column (if still enum)
ALTER TABLE `user_gamepass`
  MODIFY COLUMN `tier` VARCHAR(10) NOT NULL DEFAULT 'free';

-- 4) Done! Now re-run Seed Free + Seed Premium from the admin panel.
