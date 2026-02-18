-- Daily Lottery System Schema (MySQL 5.1 compatible)

CREATE TABLE IF NOT EXISTS lottery_settings (
  setting_key   VARCHAR(50)  NOT NULL,
  setting_value VARCHAR(255) NOT NULL,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Default settings
INSERT IGNORE INTO lottery_settings (setting_key, setting_value) VALUES
  ('enabled',           '1'),
  ('min_entry_zen',     '50000'),
  ('max_entries_per_day','10'),
  ('free_entries_per_day','1'),
  ('winners_per_draw',  '3'),
  ('reward_multiplier', '3'),
  ('draw_hour',         '20'),
  ('draw_minute',       '0');

CREATE TABLE IF NOT EXISTS lottery_draws (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  draw_date     DATE NOT NULL,
  total_pool    BIGINT NOT NULL DEFAULT 0,
  total_entries INT NOT NULL DEFAULT 0,
  status        ENUM('open','drawing','completed') NOT NULL DEFAULT 'open',
  drawn_at      DATETIME DEFAULT NULL,
  created_at    DATETIME NOT NULL,
  UNIQUE KEY idx_draw_date (draw_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS lottery_entries (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  draw_id       INT NOT NULL,
  user_id       INT NOT NULL,
  username      VARCHAR(100) NOT NULL DEFAULT '',
  zen_amount    BIGINT NOT NULL,
  entry_type    ENUM('free','zen','bonus') NOT NULL DEFAULT 'zen',
  fingerprint   VARCHAR(128) DEFAULT '',
  ip_address    VARCHAR(45)  DEFAULT '',
  ip_subnet     VARCHAR(45)  DEFAULT '',
  device_hash   VARCHAR(128) DEFAULT '',
  is_flagged    TINYINT(1)   NOT NULL DEFAULT 0,
  flag_reason   VARCHAR(255) DEFAULT '',
  created_at    DATETIME NOT NULL,
  INDEX idx_draw_user (draw_id, user_id),
  INDEX idx_draw (draw_id),
  INDEX idx_user (user_id),
  INDEX idx_fingerprint (fingerprint),
  INDEX idx_ip_subnet (ip_subnet),
  INDEX idx_device (device_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS lottery_winners (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  draw_id       INT NOT NULL,
  entry_id      INT NOT NULL,
  user_id       INT NOT NULL,
  username      VARCHAR(100) NOT NULL DEFAULT '',
  zen_entered   BIGINT NOT NULL,
  zen_won       BIGINT NOT NULL,
  rank_position TINYINT NOT NULL DEFAULT 0,
  delivered     TINYINT(1)   NOT NULL DEFAULT 0,
  delivered_at  DATETIME DEFAULT NULL,
  created_at    DATETIME NOT NULL,
  INDEX idx_draw (draw_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS lottery_bonus_entries (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  entries_available INT NOT NULL DEFAULT 0,
  source        VARCHAR(50) NOT NULL DEFAULT 'boss_drop',
  granted_at    DATETIME NOT NULL,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS lottery_bans (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  reason        VARCHAR(500) NOT NULL,
  banned_by     VARCHAR(100) NOT NULL DEFAULT 'system',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL,
  INDEX idx_user_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS lottery_security_log (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL DEFAULT 0,
  ip_address    VARCHAR(45)  DEFAULT '',
  action_type   VARCHAR(50)  NOT NULL,
  details       TEXT,
  created_at    DATETIME NOT NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action_type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
