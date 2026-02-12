-- ============================================================
-- Spin Wheel: 30 Rewards (MySQL 5.1 compatible)
-- Run this to REPLACE existing segments with 30 balanced rewards.
-- ============================================================

-- Clear existing segments
DELETE FROM spin_wheel_segments;

-- Reset auto-increment
ALTER TABLE spin_wheel_segments AUTO_INCREMENT = 1;

-- ===== COMMON: Coins (11 segments, ~40% probability) =====
INSERT INTO spin_wheel_segments (label, reward_type, reward_value, probability, color, icon, sort_order, is_active, created_at) VALUES
('1M Coins',     'coins',    1000000,   6.00, '#4ade80', 'coins',  1, 1, NOW()),
('2M Coins',     'coins',    2000000,   6.00, '#22c55e', 'coins',  2, 1, NOW()),
('3M Coins',     'coins',    3000000,   5.50, '#16a34a', 'coins',  3, 1, NOW()),
('5M Coins',     'coins',    5000000,   4.50, '#15803d', 'coins',  4, 1, NOW()),
('7M Coins',     'coins',    7000000,   4.00, '#3b82f6', 'coins',  5, 1, NOW()),
('10M Coins',    'coins',   10000000,   3.50, '#2563eb', 'coins',  6, 1, NOW()),
('15M Coins',    'coins',   15000000,   3.00, '#1d4ed8', 'coins',  7, 1, NOW()),
('20M Coins',    'coins',   20000000,   2.50, '#6366f1', 'coins',  8, 1, NOW()),
('30M Coins',    'coins',   30000000,   2.00, '#8b5cf6', 'coins',  9, 1, NOW()),
('50M Coins',    'coins',   50000000,   1.50, '#7c3aed', 'coins', 10, 1, NOW()),
('100M Coins',   'coins',  100000000,   1.00, '#a855f7', 'coins', 11, 1, NOW());

-- ===== UNCOMMON: VIP Points (8 segments, ~15% probability) =====
INSERT INTO spin_wheel_segments (label, reward_type, reward_value, probability, color, icon, sort_order, is_active, created_at) VALUES
('5 VIP',       'vip',         5,   3.50, '#f472b6', 'crown', 12, 1, NOW()),
('10 VIP',      'vip',        10,   3.00, '#ec4899', 'crown', 13, 1, NOW()),
('25 VIP',      'vip',        25,   2.50, '#db2777', 'crown', 14, 1, NOW()),
('50 VIP',      'vip',        50,   2.00, '#be185d', 'crown', 15, 1, NOW()),
('100 VIP',     'vip',       100,   1.50, '#9d174d', 'crown', 16, 1, NOW()),
('200 VIP',     'vip',       200,   1.00, '#831843', 'crown', 17, 1, NOW()),
('500 VIP',     'vip',       500,   0.80, '#701a75', 'crown', 18, 1, NOW()),
('1000 VIP',    'vip',      1000,   0.70, '#86198f', 'crown', 19, 1, NOW());

-- ===== RARE: Zen (5 segments, ~8% probability) =====
INSERT INTO spin_wheel_segments (label, reward_type, reward_value, probability, color, icon, sort_order, is_active, created_at) VALUES
('500 Zen',     'zen',       500,   2.50, '#22d3ee', 'zap',   20, 1, NOW()),
('1000 Zen',    'zen',      1000,   2.00, '#06b6d4', 'zap',   21, 1, NOW()),
('2500 Zen',    'zen',      2500,   1.50, '#0891b2', 'zap',   22, 1, NOW()),
('5000 Zen',    'zen',      5000,   1.20, '#0e7490', 'zap',   23, 1, NOW()),
('10000 Zen',   'zen',     10000,   0.80, '#155e75', 'zap',   24, 1, NOW());

-- ===== SUPER RARE: Zen Jackpots (4 segments, ~1.4% probability) =====
INSERT INTO spin_wheel_segments (label, reward_type, reward_value, probability, color, icon, sort_order, is_active, created_at) VALUES
('25000 Zen',   'zen',     25000,   0.60, '#f59e0b', 'zap',   25, 1, NOW()),
('50000 Zen',   'zen',     50000,   0.40, '#d97706', 'zap',   26, 1, NOW()),
('100000 Zen',  'zen',    100000,   0.25, '#b45309', 'zap',   27, 1, NOW()),
('500000 Zen',  'zen',    500000,   0.15, '#ef4444', 'zap',   28, 1, NOW());

-- ===== NOTHING (2 segments, ~33% probability) =====
INSERT INTO spin_wheel_segments (label, reward_type, reward_value, probability, color, icon, sort_order, is_active, created_at) VALUES
('Try Again',   'nothing',     0,  18.00, '#64748b', 'x',     29, 1, NOW()),
('Better Luck', 'nothing',     0,  15.00, '#94a3b8', 'x',     30, 1, NOW());

-- Total probability: ~100%
-- Breakdown:
--   Common (Coins):     ~40%  - 10 to 1000 coins
--   Uncommon (VIP):     ~15%  - 5 to 1000 VIP points
--   Rare (Zen):          ~8%  - 500 to 10000 Zen
--   Super Rare (Zen):   ~1.4% - 25000 to 500000 Zen
--   Nothing:            ~33%  - No reward
