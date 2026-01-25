# WOI Endgame API Reference

This folder contains all PHP API files needed for the WOI Endgame backend.

## 📁 File Structure

Upload these files to `woiendgame.online/api/`:

```
api/
├── .htaccess              # Security rules (see api-htaccess-example.txt)
├── config.php             # Core bootstrap
├── db_config.php          # Database credentials (UPDATE BEFORE DEPLOY!)
├── cors_config.php        # CORS handling
├── auth_middleware.php    # Session & RBAC
├── auth.php               # Login/logout endpoints
├── check_gm.php           # Admin role check
├── notifications.php      # Announcements CRUD
├── server-status.php      # Game server stats
├── gamepass.php           # User gamepass status
├── gamepass_admin.php     # GM reward management
├── vote.php               # Voting system
├── vote_sites.php         # Vote site management
└── vote_streaks.php       # Streak tier management
```

## 🔐 Security Configuration

### 1. Database Setup
Edit `db_config.php` with your MySQL credentials:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database');
define('DB_USER', 'your_user');
define('DB_PASS', 'your_password');
```

### 2. Required Tables
Run this SQL to create the user roles table:
```sql
CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role ENUM('user', 'gm', 'mode', 'admin') NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_role (user_id, role),
    INDEX idx_user (user_id),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3. Grant Admin Access
```sql
-- Find your user ID
SELECT ID, name FROM users WHERE name = 'your_username';

-- Grant admin role
INSERT INTO user_roles (user_id, role) VALUES (YOUR_USER_ID, 'admin');
```

### 4. .htaccess Security
Copy `api-htaccess-example.txt` content to `api/.htaccess`

## 🔄 API Endpoints

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth.php?action=login` | POST | User login |
| `/auth.php?action=logout` | GET | User logout |
| `/auth.php?action=check_session` | GET | Validate session |
| `/auth.php?action=refresh_session` | GET | Extend session |

### Admin Check
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/check_gm.php` | GET | Check if user has admin role |

### Notifications
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/notifications.php?action=list` | GET | No | List active notifications |
| `/notifications.php?action=create` | POST | Admin | Create notification |
| `/notifications.php?action=update&id=X` | PUT | Admin | Update notification |
| `/notifications.php?action=delete&id=X` | DELETE | Admin | Delete notification |

### Voting System
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/vote.php` | POST | Submit vote, get status |
| `/vote_sites.php?action=list` | GET | List active vote sites |
| `/vote_sites.php?action=add` | POST | Add site (Admin) |
| `/vote_streaks.php?action=get_streak` | GET | Get user streak |
| `/vote_streaks.php?action=leaderboard` | GET | Get streak leaderboard |

### Game Pass
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/gamepass.php?action=get_status` | GET | User pass status |
| `/gamepass.php` | POST | Claim reward |
| `/gamepass_admin.php?action=get_rewards` | GET | List all rewards |
| `/gamepass_admin.php?action=add_reward` | POST | Add reward (Admin) |

### Server Status
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/server-status.php` | GET | Game server statistics |

## 🛡️ Role System

| Role | Access Level |
|------|-------------|
| `user` | Regular player, no admin access |
| `gm` | Game tools only (future use) |
| `mode` | Limited admin (future use) |
| `admin` | Full website admin access |

Only the `admin` role grants access to the GM Panel and admin API endpoints.

## 📝 Notes

- All admin endpoints require:
  1. Valid session (cookie-based)
  2. Valid CSRF token (X-CSRF-Token header)
  3. `admin` role in `user_roles` table

- CORS is configured to allow:
  - `https://woiendgame.lovable.app`
  - `https://woiendgame.online`
  - Lovable preview domains (pattern: `*--*.lovable.app`)
  - localhost for development
