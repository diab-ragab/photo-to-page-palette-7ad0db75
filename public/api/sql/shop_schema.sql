-- ============================================================
-- NEW SHOP SCHEMA  (MySQL 5.1+ compatible)
-- Run this once on the `shengui` database.
-- ============================================================

CREATE TABLE IF NOT EXISTS shop_products (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sku           VARCHAR(64)  NOT NULL DEFAULT '',
  name          VARCHAR(128) NOT NULL,
  description   TEXT,
  type          ENUM('zen','coins','exp','item','bundle') NOT NULL DEFAULT 'item',
  price_cents   INT UNSIGNED NOT NULL DEFAULT 0,
  currency      VARCHAR(3)   NOT NULL DEFAULT 'EUR',
  payload_json  TEXT,
  image_url     VARCHAR(512) DEFAULT '',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL,
  PRIMARY KEY (id),
  KEY idx_active (is_active),
  KEY idx_type   (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS shop_orders (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  rid             VARCHAR(32)  NOT NULL DEFAULT '',
  account_name    VARCHAR(64)  NOT NULL,
  character_name  VARCHAR(64)  NOT NULL,
  total_cents     INT UNSIGNED NOT NULL DEFAULT 0,
  currency        VARCHAR(3)   NOT NULL DEFAULT 'EUR',
  status          ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  paypal_order_id VARCHAR(64)  DEFAULT NULL,
  capture_id      VARCHAR(64)  DEFAULT NULL,
  payer_email     VARCHAR(255) DEFAULT '',
  ip              VARCHAR(45)  DEFAULT '',
  created_at      DATETIME     NOT NULL,
  updated_at      DATETIME     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_paypal_order (paypal_order_id),
  KEY idx_status     (status),
  KEY idx_rid        (rid),
  KEY idx_created    (created_at),
  KEY idx_account    (account_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS shop_order_items (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id         INT UNSIGNED NOT NULL,
  product_id       INT UNSIGNED NOT NULL,
  qty              INT UNSIGNED NOT NULL DEFAULT 1,
  unit_price_cents INT UNSIGNED NOT NULL DEFAULT 0,
  line_total_cents INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS shop_paypal_txn (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id        INT UNSIGNED NOT NULL,
  paypal_order_id VARCHAR(64)  NOT NULL DEFAULT '',
  capture_id      VARCHAR(64)  DEFAULT '',
  status          VARCHAR(32)  NOT NULL DEFAULT '',
  raw_json        MEDIUMTEXT,
  created_at      DATETIME     NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order       (order_id),
  KEY idx_pp_order    (paypal_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS shop_delivery_log (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    INT UNSIGNED NOT NULL,
  item_type   VARCHAR(32)  NOT NULL DEFAULT '',
  item_ref    VARCHAR(128) NOT NULL DEFAULT '',
  qty         INT UNSIGNED NOT NULL DEFAULT 0,
  result      VARCHAR(16)  NOT NULL DEFAULT '',
  message     VARCHAR(512) DEFAULT '',
  created_at  DATETIME     NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS shop_rate_limit (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip         VARCHAR(45)  NOT NULL,
  action_key VARCHAR(32)  NOT NULL,
  created_at DATETIME     NOT NULL,
  PRIMARY KEY (id),
  KEY idx_ip_action (ip, action_key, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================
-- Example seed data (adjust prices & item IDs to your game)
-- ============================================================
-- INSERT INTO shop_products (sku, name, description, type, price_cents, currency, payload_json, is_active, created_at)
-- VALUES
--   ('ZEN500',   '500 Zen',    'Get 500 Zen delivered instantly', 'zen',   200, 'EUR', '{"zen":500}',          1, NOW()),
--   ('COINS10K', '10000 Coins','10000 Gold Coins',               'coins', 300, 'EUR', '{"coins":10000}',      1, NOW()),
--   ('EXP5K',   '5000 EXP',   '5000 Experience Points',         'exp',   150, 'EUR', '{"exp":5000}',         1, NOW()),
--   ('SWORD01', 'Flame Sword', 'Legendary Flame Sword',          'item',  500, 'EUR', '{"item_id":1234,"qty":1}', 1, NOW());
