const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { sendPurchaseConfirmationEmail } = require('../services/emailService');

const EMAIL_QUEUE_NAME = 'purchase-email-queue';

let queue;
let worker;
let redisDisabled = false;
const emailQueueEnabled = process.env.ENABLE_EMAIL_QUEUE === 'true';

const getRedisConnection = () => {
    if (process.env.REDIS_URL) {
        return new IORedis(process.env.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableOfflineQueue: false,
            lazyConnect: true,
            retryStrategy: () => null,
        });
    }

    return new IORedis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        lazyConnect: true,
        retryStrategy: () => null,
    });
};

const getQueue = () => {
    if (!queue) {
        queue = new Queue(EMAIL_QUEUE_NAME, {
            connection: getRedisConnection(),
            defaultJobOptions: {
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: 100,
                removeOnFail: 200,
            },
        });
    }

    return queue;
};

const enqueuePurchaseEmail = async (payload) => {
    if (!emailQueueEnabled || redisDisabled) {
        await sendPurchaseConfirmationEmail(payload);
        return;
    }

    const q = getQueue();
    try {
        await q.add('purchase-confirmation', payload, {
            jobId: `${payload.checkoutSessionId || Date.now()}_${payload.toEmail}`,
        });
    } catch (err) {
        redisDisabled = true;
        console.warn('[EmailQueue] Redis unavailable, sending email without queue:', err.message);
        await sendPurchaseConfirmationEmail(payload);
    }
};

const startEmailWorker = () => {
    if (!emailQueueEnabled) {
        redisDisabled = true;
        console.log('[EmailQueue] Queue disabled. Using direct email sending.');
        return null;
    }

    if (worker || redisDisabled) return worker;

    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
        redisDisabled = true;
        console.warn('[EmailQueue] Redis configuration missing, queue worker disabled.');
        return null;
    }

    try {
        worker = new Worker(
            EMAIL_QUEUE_NAME,
            async (job) => {
                const sent = await sendPurchaseConfirmationEmail(job.data);
                if (!sent) {
                    throw new Error('Email service not configured or recipient missing');
                }
                return { sent: true };
            },
            {
                connection: getRedisConnection(),
                concurrency: 3,
            }
        );
    } catch (err) {
        redisDisabled = true;
        console.warn('[EmailQueue] Worker disabled because Redis is unavailable:', err.message);
        return null;
    }

    worker.on('failed', (job, err) => {
        console.error(`[EmailQueue] Job ${job?.id} failed:`, err.message);
    });

    worker.on('completed', (job) => {
        console.log(`[EmailQueue] Job ${job.id} completed`);
    });

    worker.on('error', (err) => {
        redisDisabled = true;
        console.warn('[EmailQueue] Worker disabled because Redis is unavailable:', err.message);
        worker = null;
    });

    return worker;
};

module.exports = {
    enqueuePurchaseEmail,
    startEmailWorker,
};
