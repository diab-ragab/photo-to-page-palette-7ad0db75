# WOI Dashboard Enhancement Plan

## Overview
Major dashboard upgrade with new features and admin controls for all systems.

---

## 🏆 Phase 1: Achievements System
**Priority: High**

### Database Schema
```sql
-- Achievement definitions (admin configurable)
CREATE TABLE achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  icon VARCHAR(20) DEFAULT 'TROPHY',
  category ENUM('voting', 'purchases', 'gameplay', 'social', 'events') DEFAULT 'gameplay',
  requirement_type ENUM('count', 'streak', 'level', 'spend', 'custom') NOT NULL,
  requirement_value INT DEFAULT 1,
  reward_coins INT DEFAULT 0,
  reward_vip INT DEFAULT 0,
  rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common',
  is_hidden TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at DATETIME NOT NULL
);

-- User unlocked achievements
CREATE TABLE user_achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  achievement_id INT NOT NULL,
  unlocked_at DATETIME NOT NULL,
  claimed TINYINT(1) DEFAULT 0,
  UNIQUE KEY unique_user_achievement (user_id, achievement_id)
);
```

### Preset Achievements
- First Vote, 7-Day Streak, 30-Day Streak (voting)
- First Purchase, Big Spender (purchases)
- Level 50, Level 100 (gameplay)
- Game Pass Complete (events)

### Components
- `AchievementsCard.tsx` - Dashboard widget showing recent/progress
- `AchievementsModal.tsx` - Full achievements gallery
- `admin/AchievementsManager.tsx` - Admin CRUD

### API
- `achievements.php` - List, unlock, claim rewards

---

## 📊 Phase 2: Player Stats Card
**Priority: High**

### Features
- Total votes, streak record, VIP level
- Total purchases, Zen spent
- Character count, highest level
- Account age, last login
- Shareable card with download as image

### Components
- `PlayerStatsCard.tsx` - Visual stats display
- `ShareableStatsCard.tsx` - Downloadable version

### API
- `player_stats.php` - Aggregate user statistics

---

## 🎡 Phase 3: Lucky Spin Wheel
**Priority: High**

### Database Schema
```sql
-- Wheel segments (admin configurable)
CREATE TABLE spin_wheel_segments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  reward_type ENUM('coins', 'zen', 'vip', 'item', 'nothing') NOT NULL,
  reward_value INT DEFAULT 0,
  item_id INT DEFAULT NULL,
  probability DECIMAL(5,2) NOT NULL, -- percentage weight
  color VARCHAR(20) DEFAULT '#06b6d4',
  icon VARCHAR(20) DEFAULT 'GIFT',
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0
);

-- Spin history/cooldown
CREATE TABLE user_spins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  segment_id INT NOT NULL,
  reward_type VARCHAR(20) NOT NULL,
  reward_value INT NOT NULL,
  spun_at DATETIME NOT NULL,
  INDEX idx_user_spun (user_id, spun_at)
);

-- Spin settings
CREATE TABLE spin_settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
);
-- Keys: spins_per_day, cooldown_hours, vip_bonus_spins
```

### Components
- `LuckyWheel.tsx` - Animated spin wheel with canvas/CSS
- `admin/SpinWheelManager.tsx` - Segment CRUD, settings

### API
- `spin_wheel.php` - Get segments, spin, history

---

## 📅 Phase 4: Events Calendar
**Priority: Medium**

### Database Schema
```sql
CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  event_type ENUM('double_xp', 'double_drops', 'sale', 'maintenance', 'update', 'custom') NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  banner_url VARCHAR(500),
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL
);
```

### Components
- `EventsCalendar.tsx` - Monthly calendar view
- `UpcomingEvents.tsx` - Dashboard widget
- `admin/EventsManager.tsx` - Event CRUD

### API
- `events.php` - List, CRUD

---

## 🎨 Phase 5: Dashboard Layout Redesign
**Priority: Medium**

### User Dashboard
- Responsive grid with widget cards
- Collapsible sidebar on mobile
- Quick stats bar at top
- Customizable widget order (optional)

### Mobile Optimizations
- Touch-friendly buttons
- Swipe gestures for tabs
- Bottom navigation bar
- Optimized card layouts

---

## 🔔 Phase 6: Push Notifications ✅
**Status: Completed**

### Features Implemented
- Service worker for push notifications (`public/sw.js`)
- Browser notification permission system
- Notification preferences UI in Dashboard ("Alerts" tab)
- Automatic scheduling checks for:
  - Streak expiring (6-hour warning)
  - Rewards ready (Daily Zen, Spin, Vote)
  - Events starting (5-minute warning)
- Admin push notification broadcast panel
- Customizable notification types (announcements, events, rewards, streak, maintenance)

### Components
- `usePushNotifications.ts` - Core notification hook
- `useNotificationScheduler.ts` - Background check scheduler
- `NotificationSettings.tsx` - User preferences UI
- `PushNotificationManager.tsx` - Admin broadcast panel

---

## Admin Dashboard Updates

Add new tabs for:
1. **Achievements** - Create/edit achievements, view unlock stats
2. **Spin Wheel** - Configure segments, probabilities, settings
3. **Events** - Calendar event management

---

## Implementation Order

1. ✅ Achievements System (backend + admin + user UI)
2. ✅ Player Stats Card
3. ✅ Lucky Spin Wheel
4. ✅ Dashboard Layout Redesign
5. ✅ Events Calendar
6. ✅ Push Notifications

---

## Notes
- All features controlled via Admin Dashboard
- Mobile-first responsive design
- Consistent with existing gaming aesthetic
- PHP/MySQL backend (no Supabase)
