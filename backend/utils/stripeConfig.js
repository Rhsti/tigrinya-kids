const createStripe = require('stripe');

const PLACEHOLDER_PATTERNS = [
    'your_stripe_secret_key',
    'your_stripe_secret_key_here',
    'your_stripe_publishable_key',
    'your_stripe_publishable_key_here',
    'your_stripe_webhook_secret',
];

function containsPlaceholder(value) {
    const v = String(value || '').toLowerCase();
    return PLACEHOLDER_PATTERNS.some((p) => v.includes(p));
}

function getStripeEnv() {
    return {
        secretKey: process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET || '',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    };
}

function detectStripeMode(secretKey) {
    const key = String(secretKey || '').trim();
    if (key.startsWith('sk_live_')) return 'live';
    if (key.startsWith('sk_test_')) return 'test';
    return 'unconfigured';
}

function isValidSecretKey(secretKey) {
    const key = String(secretKey || '').trim();
    return key.startsWith('sk_') && !containsPlaceholder(key);
}

function isValidPublishableKey(publishableKey) {
    const key = String(publishableKey || '').trim();
    return key.startsWith('pk_') && !containsPlaceholder(key);
}

function isValidWebhookSecret(webhookSecret) {
    const key = String(webhookSecret || '').trim();
    return key.startsWith('whsec_') && !containsPlaceholder(key);
}

function validateStripeConfig({ requireWebhook = false, requirePublishable = true } = {}) {
    const { secretKey, publishableKey, webhookSecret } = getStripeEnv();
    const mode = detectStripeMode(secretKey);

    const secretConfigured = isValidSecretKey(secretKey);
    const publishableConfigured = isValidPublishableKey(publishableKey);
    const webhookConfigured = isValidWebhookSecret(webhookSecret);

    const errors = [];
    const warnings = [];

    if (!secretConfigured) {
        errors.push('Missing or invalid STRIPE_SECRET_KEY');
    }

    if (!publishableConfigured) {
        if (requirePublishable) {
            errors.push('Missing or invalid STRIPE_PUBLISHABLE_KEY');
        } else {
            warnings.push('Missing or invalid STRIPE_PUBLISHABLE_KEY');
        }
    }

    if (requireWebhook && !webhookConfigured) {
        errors.push('Missing or invalid STRIPE_WEBHOOK_SECRET');
    }

    if (mode === 'test') {
        warnings.push('Stripe is configured in TEST mode');
    }

    if (mode === 'unconfigured') {
        errors.push('Stripe mode is unconfigured');
    }

    return {
        ok: errors.length === 0,
        mode,
        secretConfigured,
        publishableConfigured,
        webhookConfigured,
        errors,
        warnings,
    };
}

function createStripeClient() {
    const { secretKey } = getStripeEnv();
    if (!isValidSecretKey(secretKey)) {
        return null;
    }
    return createStripe(secretKey);
}

function logStripeDiagnostics({ requireWebhook = false, context = 'stripe' } = {}) {
    const status = validateStripeConfig({ requireWebhook, requirePublishable: true });

    if (!status.secretConfigured || !status.publishableConfigured) {
        console.error(
            `[${context}] Stripe is not configured correctly. Please set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY.`
        );
    }

    if (!status.ok) {
        console.error(`[${context}] Stripe is not configured correctly. Please check environment variables.`);
        status.errors.forEach((e) => console.error(`[${context}] ${e}`));
    }

    status.warnings.forEach((w) => console.warn(`[${context}] ${w}`));

    console.log(
        `[${context}] mode=${status.mode} secret=${status.secretConfigured ? 'ok' : 'missing'} publishable=${status.publishableConfigured ? 'ok' : 'missing'} webhook=${status.webhookConfigured ? 'ok' : 'missing'}`
    );

    return status;
}

module.exports = {
    getStripeEnv,
    detectStripeMode,
    validateStripeConfig,
    createStripeClient,
    logStripeDiagnostics,
};
