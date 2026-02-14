-- ============================================================
-- WOI Endgame - Complete Website & Webshop Database Schema
-- MySQL 5.1+ compatible (NO DEFAULT CURRENT_TIMESTAMP on DATETIME)
-- Generated: 2026-02-14
-- ============================================================

SET NAMES utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. AUTHENTICATION & USERS
-- ============================================================

-- User sessions (login tokens)
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_token VARCHAR(255) NOT NULL,
  csrf_token VARCHAR(64) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  last_activity DATETIME NOT NULL,
  UNIQUE KEY IX_user_sessions_token (session_token),
  KEY IX_user_sessions_user (user_id),
  KEY IX_user_sessions_expires (expires_at),
  KEY IX_user_sessions_last (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- User roles (admin, gm, etc.)
CREATE TABLE IF NOT EXISTS user_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role VARCHAR(50) NOT NULL,
  granted_at DATETIME NOT NULL,
  granted_by VARCHAR(50) NULL,
  UNIQUE KEY uq_user_role (user_id, role),
  KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Rate limiting for auth
CREATE TABLE IF NOT EXISTS rate_limits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  action VARCHAR(20) NOT NULL,
  attempt_time DATETIME NOT NULL,
  KEY idx_ip_action_time (ip_address, action, attempt_time)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- User bans
CREATE TABLE IF NOT EXISTS user_bans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  reason TEXT,
  banned_at DATETIME NOT NULL,
  banned_by INT NULL,
  expires_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================
-- 2. USER CURRENCY & ECONOMY (Sidecar tables)
-- ============================================================

-- User currency balances (coins, vip, zen)
CREATE TABLE IF NOT EXISTS user_currency (
  user_id INT PRIMARY KEY,
  coins INT DEFAULT 0,
  vip_points INT DEFAULT 0,
  zen BIGINT DEFAULT 0,
  premium INT DEFAULT 0,
  total_votes INT DEFAULT 0,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================
-- 3. WEBSHOP
-- ============================================================

-- Products catalog
CREATE TABLE IF NOT EXISTS webshop_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  item_id INT NOT NULL DEFAULT 0,
  item_quantity INT NOT NULL DEFAULT 1,
  price_real DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  description TEXT,
  image_url VARCHAR(500) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Orders
CREATE TABLE IF NOT EXISTS webshop_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total_real DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('pending','processing','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  paypal_order_id VARCHAR(255) DEFAULT NULL,
  paypal_capture_id VARCHAR(255) DEFAULT NULL,
  character_id INT DEFAULT 0,
  character_name VARCHAR(100) DEFAULT '',
  is_gift TINYINT(1) DEFAULT 0,
  gift_character_name VARCHAR(100) DEFAULT '',
  delivered_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME DEFAULT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_paypal (paypal_order_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Failed delivery tracking
CREATE TABLE IF NOT EXISTS pending_deliveries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  order_type VARCHAR(20) NOT NULL DEFAULT 'webshop',
  paypal_order_id VARCHAR(64) DEFAULT NULL,
  user_id INT NOT NULL,
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at DATETIME NOT NULL,
  KEY idx_order (order_id, order_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================
-- 4. FLASH SALE BUNDLES
-- ============================================================

CREATE TABLE IF NOT EXISTS flash_bundles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  original_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  sale_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount INT DEFAULT 0,
  ends_at DATETIME NOT NULL,
  is_featured TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  stock INT DEFAULT NULL,
  sort_order INT DEFAULT 0,
  created_at DATETIME NOT NULL,
  KEY idx_active_ends (is_active, ends_at),
  KEY idx_featured (is_featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS flash_bundle_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bundle_id INT NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  item_id INT DEFAULT 0,
  item_quantity INT DEFAULT 1,
  quantity INT DEFAULT 1,
  icon VARCHAR(20) DEFAULT 'GIFT',
  sort_order INT DEFAULT 0,
  KEY idx_bundle_id (bundle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS bundle_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bundle_id INT NOT NULL,
  price_eur DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'pending',
  paypal_order_id VARCHAR(255) DEFAULT NULL,
  paypal_capture_id VARCHAR(255) DEFAULT NULL,
  character_id INT DEFAULT 0,
  character_name VARCHAR(100) DEFAULT '',
  created_at DATETIME NOT NULL,
  completed_at DATETIME DEFAULT NULL,
  KEY idx_user (user_id),
  KEY idx_paypal_order (paypal_order_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================
-- 5. CURRENCY TOP-UP
-- ============================================================

CREATE TABLE IF NOT EXISTS currency_topup_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  currency_type ENUM('zen', 'coins') NOT NULL DEFAULT 'zen',
  amount INT NOT NULL,
  bonus_amount INT DEFAULT 0,
  price_eur DECIMAL(10,2) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS topup_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  package_id INT NOT NULL,
  character_id INT DEFAULT 0,
  character_name VARCHAR(100) DEFAULT '',
  price_eur DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  paypal_order_id VARCHAR(255) DEFAULT NULL,
  paypal_capture_id VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL,
  completed_at DATETIME DEFAULT NULL,
  KEY idx_user (user_id),
  KEY idx_paypal (paypal_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================
-- 6. GAME PASS (3-Tier: Free, Elite, Gold)
-- ============================================================

-- User game pass status
CREATE TABLE IF NOT EXISTS user_gamepass (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  is_premium TINYINT(1) DEFAULT 0,
  tier VARCHAR(10) DEFAULT 'free',
  expires_at DATETIME DEFAULT NULL,
  paypal_order_id VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Game pass reward definitions (admin-managed)
CREATE TABLE IF NOT EXISTS gamepass_rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  day INT NOT NULL,
  tier VARCHAR(10) NOT NULL DEFAULT 'free',
  item_id INT DEFAULT 0,
  item_name VARCHAR(200) DEFAULT '',
  quantity INT DEFAULT 1,
  coins INT DEFAULT 0,
  zen INT DEFAULT 0,
  exp INT DEFAULT 0,
  rarity VARCHAR(20) DEFAULT 'common',
  icon VARCHAR(20) DEFAULT 'GIFT',
  KEY idx_day_tier (day, tier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Game pass claim tracking
CREATE TABLE IF NOT EXISTS gamepass_claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reward_id INT NOT NULL,
  day INT NOT NULL,
  tier VARCHAR(10) NOT NULL,
  character_id INT DEFAULT 0,
  character_name VARCHAR(100) DEFAULT '',
  claimed_at DATETIME NOT NULL,
  cycle_start DATE NOT NULL,
  UNIQUE KEY uq_user_reward_cycle (user_id, reward_id, cycle_start),
  KEY idx_user_cycle (user_id, cycle_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Game pass settings (prices, enabled tiers)
CREATE TABLE IF NOT EXISTS gamepass_settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  updated_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Default settings
INSERT IGNORE INTO gamepass_settings (setting_key, setting_value, updated_at) VALUES
  ('zen_skip_cost', '100000', NOW()),
  ('elite_price_cents', '999', NOW()),
  ('gold_price_cents', '1999', NOW()),
  ('gamepass_enabled', '1', NOW()),
  ('elite_enabled', '1', NOW()),
  ('gold_enabled', '1', NOW());

-- Game pass purchase records
CREATE TABLE IF NOT EXISTS gamepass_purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tier VARCHAR(10) NOT NULL,
  paypal_order_id VARCHAR(255) DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at DATETIME NOT NULL,
  completed_at DATETIME DEFAULT NULL,
  INDEX idx_user (user_id),
  INDEX idx_paypal_order (paypal_order_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================
-- 7. SPIN WHEEL (Lucky Wheel)
-- ============================================================

CREATE TABLE IF NOT EXISTS spin_wheel_segments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  reward_type VARCHAR(20) NOT NULL,
  reward_value BIGINT NOT NULL DEFAULT 0,
  probability DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  color VARCHAR(20) DEFAULT '#666',
  icon VARCHAR(50) DEFAULT 'gift',
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL,
  KEY idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS user_spins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  segment_id INT NOT NULL,
  reward_type VARCHAR(20) NOT NULL,
  reward_value BIGINT NOT NULL DEFAULT 0,
  character_id INT DEFAULT 0,
  character_name VARCHAR(100) DEFAULT '',
  delivered TINYINT(1) DEFAULT 0,
  spun_at DATETIME NOT NULL,
  KEY idx_user_id (user_id),
  KEY idx_spun_at (spun_at),
  KEY idx_user_date (user_id, spun_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS spin_settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Default spin settings
INSERT IGNORE INTO spin_settings (setting_key, setting_value) VALUES
  ('spins_per_day', '3'),
  ('zen_cost', '50000');

CREATE TABLE IF NOT EXISTS user_bonus_spins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  spins_remaining INT NOT NULL DEFAULT 0,
  source VARCHAR(50) DEFAULT 'purchase',
  granted_at DATETIME NOT NULL,
  expires_at DATETIME DEFAULT NULL,
  KEY idx_user (user_id),
  KEY idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================
-- 8. VOTING SYSTEM
-- ============================================================

-- Vote sites configuration
CREATE TABLE IF NOT EXISTS vote_sites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  coins_reward INT DEFAULT 50,
  vip_reward INT DEFAULT 25,
  cooldown_hours INT DEFAULT 12,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Vote log
CREATE TABLE IF NOT EXISTS vote_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  username VARCHAR(100) NOT NULL,
  site_id INT NOT NULL,
  fingerprint VARCHAR(255) DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  coins_earned INT NOT NULL DEFAULT 0,
  vip_earned INT NOT NULL DEFAULT 0,
  streak_bonus DECIMAL(3,2) DEFAULT 1.00,
  vote_time DATETIME NOT NULL,
  INDEX idx_user_site (user_id, site_id),
  INDEX idx_username_site (username, site_id),
  INDEX idx_vote_time (vote_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Vote streaks
CREATE TABLE IF NOT EXISTS vote_streaks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_vote_date DATE DEFAULT NULL,
  streak_expires_at DATETIME DEFAULT NULL,
  total_bonus_earned INT NOT NULL DEFAULT 0,
  updated_at DATETIME NULL,
  INDEX idx_username (username),
  INDEX idx_current_streak (current_streak)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================
-- 9. DAILY ZEN REWARDS
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_zen_claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  character_id INT NOT NULL,
  character_name VARCHAR(100) DEFAULT '',
  amount INT NOT NULL DEFAULT 0,
  claimed_at DATETIME NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  fingerprint VARCHAR(255) DEFAULT NULL,
  INDEX idx_account (account_id),
  INDEX idx_claimed (claimed_at),
  INDEX idx_account_claimed (account_id, claimed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS daily_zen_security_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT,
  ip_address VARCHAR(45),
  fingerprint VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  details TEXT,
  created_at DATETIME NOT NULL,
  INDEX idx_account (account_id),
  INDEX idx_ip (ip_address),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS daily_zen_penalties (
  account_id INT PRIMARY KEY,
  strike_count INT NOT NULL DEFAULT 0,
  banned_until DATETIME DEFAULT NULL,
  last_strike_at DATETIME DEFAULT NULL,
  last_strike_reason VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================
-- 10. ACHIEVEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS achievements (
  id INT(11) NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'trophy',
  category VARCHAR(50) DEFAULT 'general',
  points INT DEFAULT 10,
  threshold INT DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_code (code),
  KEY idx_category (category),
  KEY idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS user_achievements (
  id INT(11) NOT NULL AUTO_INCREMENT,
  user_id INT(11) NOT NULL,
  achievement_id INT(11) NOT NULL,
  progress INT DEFAULT 0,
  unlocked TINYINT(1) DEFAULT 0,
  unlocked_at DATETIME DEFAULT NULL,
  updated_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_achievement (user_id, achievement_id),
  KEY idx_user_id (user_id),
  KEY idx_unlocked (unlocked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================
-- 11. NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'news',
  created_by VARCHAR(100) DEFAULT 'System',
  created_at DATETIME DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  INDEX idx_active (is_active),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS auto_notification_settings (
  id INT PRIMARY KEY DEFAULT 1,
  daily_zen_enabled TINYINT(1) DEFAULT 0,
  spin_wheel_enabled TINYINT(1) DEFAULT 0,
  vote_streak_enabled TINYINT(1) DEFAULT 0,
  gamepass_enabled TINYINT(1) DEFAULT 0,
  last_daily_zen_sent DATE DEFAULT NULL,
  last_spin_wheel_sent DATE DEFAULT NULL,
  last_vote_streak_sent DATE DEFAULT NULL,
  last_gamepass_sent DATE DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT IGNORE INTO auto_notification_settings (id) VALUES (1);

-- ============================================================
-- 12. EVENTS & CHANGELOG
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  event_type VARCHAR(30) DEFAULT 'general',
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL,
  KEY idx_dates (start_date, end_date),
  KEY idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS changelog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  version_type VARCHAR(20) DEFAULT 'patch',
  release_date DATE NOT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_release (release_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS changelog_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  changelog_id INT NOT NULL,
  category VARCHAR(50) DEFAULT 'added',
  description TEXT NOT NULL,
  KEY idx_changelog (changelog_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================
-- 13. SITE SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Default site settings
INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES
  ('discord_link', 'https://discord.gg/example'),
  ('discord_members', '0'),
  ('download_mega', ''),
  ('download_gdrive', ''),
  ('download_filefm', ''),
  ('daily_zen_amount', '100000'),
  ('discord_url', 'https://discord.gg/example'),
  ('download_url', ''),
  ('register_url', '');

-- ============================================================
-- 14. PAYPAL & PAYMENT INFRASTRUCTURE
-- ============================================================

-- Payment rate limiting
CREATE TABLE IF NOT EXISTS payment_rate_limit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(64) NOT NULL,
  endpoint VARCHAR(32) NOT NULL,
  request_time DATETIME NOT NULL,
  KEY idx_ip_endpoint_time (ip_address, endpoint, request_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- PayPal webhook logs
CREATE TABLE IF NOT EXISTS paypal_webhook_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload TEXT,
  processed TINYINT(1) DEFAULT 0,
  error_message TEXT,
  created_at DATETIME,
  KEY idx_event_id (event_id),
  KEY idx_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================
-- END OF SCHEMA
-- ============================================================

SET FOREIGN_KEY_CHECKS = 1;
