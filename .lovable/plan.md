

# Stripe Checkout Configuration for PHP Backend

This guide covers the complete setup for integrating Stripe Checkout with your PHP backend.

---

## Current Architecture

Your system already has:
- **Products with `stripe_payment_link`** field in `webshop_products` table
- **Webhook handler** at `stripe_webhook.php` ready to process payments
- **Frontend** that opens Stripe Payment Links when products have them configured

---

## Configuration Steps

### Step 1: Get Your Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → API Keys**
3. Copy your keys:
   - **Publishable key** (`pk_live_...` or `pk_test_...`) - for frontend
   - **Secret key** (`sk_live_...` or `sk_test_...`) - for webhook verification

### Step 2: Create Stripe Products & Payment Links

**Option A: Via Stripe Dashboard (Recommended)**
1. Go to **Products** → **Add Product**
2. Set name, description, price (e.g., "100 Zen - €5.00")
3. Go to **Payment Links** → **Create**
4. Select the product, configure settings
5. Copy the payment link URL (e.g., `https://buy.stripe.com/xxx`)
6. Paste this URL in your Admin Dashboard → Webshop → Product → "Stripe Payment Link" field

**Option B: Via Stripe API** (for automation)
```php
// Example: Create product and payment link via API
// Requires stripe/stripe-php library
```

### Step 3: Configure Webhook

1. Go to Stripe Dashboard → **Developers → Webhooks**
2. Click **Add endpoint**
3. Enter your endpoint URL:
   ```
   https://woiendgame.online/api/stripe_webhook.php
   ```
4. Select events to listen:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (`whsec_...`)

### Step 4: Set Environment Variables on Server

Add these to your server configuration (Apache `.htaccess`, PHP-FPM pool, or system environment):

```apache
# In .htaccess or Apache config
SetEnv STRIPE_WEBHOOK_SECRET whsec_your_webhook_signing_secret_here
```

Or in PHP directly (create `config.php` in api folder):

```php
<?php
// api/stripe_config.php
// IMPORTANT: Keep this file outside public_html if possible, or protect with .htaccess

define('STRIPE_WEBHOOK_SECRET', 'whsec_your_signing_secret');

// Optional: If you want to create checkout sessions server-side
define('STRIPE_SECRET_KEY', 'sk_live_your_secret_key');
```

### Step 5: Update Webhook to Use Config

Edit `stripe_webhook.php` to load the config:

```php
<?php
// At the top of stripe_webhook.php, after the opening <?php

// Load config if exists
$configPath = __DIR__ . '/stripe_config.php';
if (file_exists($configPath)) {
    require_once $configPath;
}

// Use constant if defined, else fallback to environment
$webhookSecret = defined('STRIPE_WEBHOOK_SECRET') 
    ? STRIPE_WEBHOOK_SECRET 
    : (getenv('STRIPE_WEBHOOK_SECRET') ? getenv('STRIPE_WEBHOOK_SECRET') : '');
```

---

## How the Flow Works

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PAYMENT FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User clicks "Buy Now"                                                   │
│     ↓                                                                       │
│  2. Frontend redirects to Stripe Payment Link                               │
│     (window.open(product.stripe_payment_link))                              │
│     ↓                                                                       │
│  3. User completes payment on Stripe Checkout page                          │
│     ↓                                                                       │
│  4. Stripe sends webhook to your server                                     │
│     POST https://woiendgame.online/api/stripe_webhook.php                   │
│     ↓                                                                       │
│  5. stripe_webhook.php processes the event:                                 │
│     - Verifies signature                                                    │
│     - Creates order in webshop_orders table                                 │
│     - Marks as "completed"                                                  │
│     - (Optional) Delivers items to player                                   │
│     ↓                                                                       │
│  6. User is redirected to success page                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Details

### Enhanced Payment Link with Metadata

For automatic order linking, add metadata to your Stripe Payment Links:

When creating Payment Links in Stripe Dashboard, add prefilled parameters:
```
https://buy.stripe.com/xxx?client_reference_id={USER_ID}&prefilled_email={USER_EMAIL}
```

Or configure metadata on the product in Stripe that includes `product_id`.

### Creating a PHP Checkout Session Endpoint (Alternative)

If you want server-side checkout session creation (instead of Payment Links), I can create a new `create_checkout.php` endpoint that:
1. Receives product ID and user info from frontend
2. Creates a Stripe Checkout Session with proper metadata
3. Returns the checkout URL

This provides better tracking and metadata control.

### Order Delivery Integration

The webhook already has a placeholder for item delivery:
```php
// In handleCheckoutComplete() function:
// TODO: Deliver items to player in-game
// deliverItemsToPlayer($userId, $productId, $quantity);
```

You can implement this to call your game server API.

---

## Testing the Setup

1. **Use Stripe Test Mode** first (test API keys starting with `pk_test_` and `sk_test_`)
2. **Test card numbers**:
   - `4242 4242 4242 4242` - Successful payment
   - `4000 0000 0000 0002` - Declined payment
3. **Check webhook logs** in your database:
   ```sql
   SELECT * FROM stripe_webhook_logs ORDER BY id DESC LIMIT 10;
   ```
4. **Check orders**:
   ```sql
   SELECT * FROM webshop_orders ORDER BY id DESC LIMIT 10;
   ```

---

## Summary Checklist

| Step | Action | Status |
|------|--------|--------|
| 1 | Create Stripe account & get API keys | ◯ |
| 2 | Create products in Stripe Dashboard | ◯ |
| 3 | Create Payment Links for each product | ◯ |
| 4 | Add Payment Link URLs to products in Admin panel | ◯ |
| 5 | Configure webhook endpoint in Stripe Dashboard | ◯ |
| 6 | Add webhook secret to server config | ◯ |
| 7 | Test with test mode | ◯ |
| 8 | Switch to live mode | ◯ |

