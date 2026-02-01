<?php
/**
 * stripe_config.php - Stripe Configuration
 * 
 * IMPORTANT: Copy this file to stripe_config.php and fill in your keys
 * NEVER commit stripe_config.php to version control!
 * 
 * Add to .htaccess to protect:
 * <Files "stripe_config.php">
 *     Order Allow,Deny
 *     Deny from all
 * </Files>
 */

// Stripe Secret Key (starts with sk_live_ or sk_test_)
define('STRIPE_SECRET_KEY', 'sk_test_51SvjV4HvRV9niQ97Y3n2QSVmAqXw3ihLul51C3MKpOlAGt2NrFT1x0OAvIpqJ1C8I0YjOC3BK6qEmEZ6wFc7dm2n00O74gCKv7');

// Stripe Publishable Key (for reference, used in frontend)
define('STRIPE_PUBLISHABLE_KEY', 'pk_test_51SvjV4HvRV9niQ975rw0QIWnHdvsaaoDtxxBK36IJzclBitZNciDGBaEm0XFpGcASwkDGbI9K6gm9P1b99jnclPQ004ZJqa4h1');

// Stripe Webhook Signing Secret (starts with whsec_)
define('STRIPE_WEBHOOK_SECRET', 'whsec_S9xbzDfBA9ufirKabbiWs1Qzj4DoM7i9');
