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
define('STRIPE_SECRET_KEY', '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');

// Stripe Publishable Key (for reference, used in frontend)
define('STRIPE_PUBLISHABLE_KEY', 'pk_live_51SvjUtQXYdgcel89bo7rYcrrZOPr5ze2pAPmDIcv3j1vJHh66f2czWCoxMRvoDodyqW2g4oZIIxIVDl3nlJhfR9y008N9S7s6S');

// Stripe Webhook Signing Secret (starts with whsec_)
define('STRIPE_WEBHOOK_SECRET', 'whsec_S9xbzDfBA9ufirKabbiWs1Qzj4DoM7i9');
