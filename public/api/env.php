<?php
// api/env.php
// DO NOT COMMIT THIS FILE - Contains sensitive keys
// PHP 5.x compatible

// Stripe
putenv('STRIPE_SECRET_KEY=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');
putenv('STRIPE_WEBHOOK_SECRET=whsec_aUbYbZffBWZXxvTNjuD0W3bhI7fwrGrn');

// App environment
putenv('APP_ENV=production');
