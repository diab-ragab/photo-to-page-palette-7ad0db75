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
define('STRIPE_SECRET_KEY', 'sk_test_your_secret_key_here');

// Stripe Publishable Key (for reference, used in frontend)
define('STRIPE_PUBLISHABLE_KEY', 'pk_test_your_publishable_key_here');

// Stripe Webhook Signing Secret (starts with whsec_)
define('STRIPE_WEBHOOK_SECRET', 'whsec_your_webhook_secret_here');
