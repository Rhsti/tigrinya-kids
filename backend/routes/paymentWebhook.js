const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Purchase = require('../models/Purchase');
const Course = require('../models/Course');
const defaultCourses = require('../data/defaultCourses');
const { users } = require('../data/store');
const { enqueuePurchaseEmail } = require('../queue/emailQueue');
const {
    getStripeEnv,
    validateStripeConfig,
    createStripeClient,
    logStripeDiagnostics,
} = require('../utils/stripeConfig');

const router = express.Router();

const stripe = createStripeClient();

const getCourseById = async (courseId) => {
    if (mongoose.connection.readyState === 1) {
        const dbCourse = await Course.findOne({ courseId, isActive: true }).lean();
        if (dbCourse) {
            return {
                id: dbCourse.courseId,
                title: dbCourse.title,
                price: dbCourse.price,
                currency: dbCourse.currency || 'usd',
            };
        }
    }

    const fallback = defaultCourses.find((c) => c.courseId === courseId && c.isActive);
    if (!fallback) return null;
    return {
        id: fallback.courseId,
        title: fallback.title,
        price: fallback.price,
        currency: fallback.currency || 'usd',
    };
};

async function persistUserPurchase(userId, courseId) {
    try {
        const dbUser = await User.findById(userId);
        if (dbUser) {
            if (!dbUser.purchasedCourses.includes(courseId)) {
                dbUser.purchasedCourses.push(courseId);
            }
            dbUser.subscriptionActive = true;
            dbUser.purchaseDate = new Date();
            await dbUser.save();
            return;
        }
    } catch {
        // Fall through to demo store
    }

    if (users.has(userId)) {
        const demoUser = users.get(userId);
        demoUser.purchasedCourses = demoUser.purchasedCourses || [];
        if (!demoUser.purchasedCourses.includes(courseId)) {
            demoUser.purchasedCourses.push(courseId);
        }
        demoUser.subscriptionActive = true;
        demoUser.purchaseDate = new Date();
        users.set(userId, demoUser);
    }
}

router.post('/', async (req, res) => {
    const stripeStatus = validateStripeConfig({ requireWebhook: true });
    if (!stripe || !stripeStatus.ok) {
        logStripeDiagnostics({ requireWebhook: true, context: 'payment.webhook' });
        return res.status(500).send('Stripe is not configured correctly. Please check environment variables.');
    }

    const { webhookSecret } = getStripeEnv();
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const courseId = session?.metadata?.courseId;
        const userId = String(session?.metadata?.userId || session?.client_reference_id || '');
        const course = await getCourseById(courseId);

        if (courseId && userId && course && session.payment_status === 'paid') {
            try {
                const exists = await Purchase.findOne({ checkoutSessionId: session.id });
                if (!exists) {
                    const purchase = await Purchase.create({
                        userId,
                        email: session.customer_details?.email || session.customer_email || '',
                        courseId,
                        paymentId: String(session.payment_intent || session.id),
                        purchaseDate: new Date(),
                        provider: 'stripe',
                        checkoutSessionId: session.id,
                        paymentIntentId: String(session.payment_intent || ''),
                        amount: (session.amount_total || Math.round(course.price * 100)) / 100,
                        currency: String(session.currency || 'usd'),
                        status: session.payment_status || 'paid',
                        receiptUrl: null,
                    });

                    try {
                        await enqueuePurchaseEmail({
                            toEmail: purchase.email,
                            course,
                            paymentMethod: 'card',
                            receiptUrl: purchase.receiptUrl,
                            checkoutSessionId: session.id,
                            purchase: {
                                purchaseId: purchase._id,
                                email: purchase.email,
                                courseId: purchase.courseId,
                                courseTitle: course.title,
                                provider: purchase.provider,
                                amount: purchase.amount,
                                currency: purchase.currency,
                                status: purchase.status,
                                checkoutSessionId: purchase.checkoutSessionId,
                                paymentIntentId: purchase.paymentIntentId,
                                receiptUrl: purchase.receiptUrl,
                                createdAt: purchase.createdAt,
                            },
                        });
                    } catch (queueErr) {
                        console.error('Webhook email queue failed:', queueErr.message);
                    }
                }

                await persistUserPurchase(userId, courseId);
            } catch (err) {
                return res.status(500).send(`Webhook persistence error: ${err.message}`);
            }
        }
    }

    if (event.type === 'checkout.session.async_payment_failed') {
        const session = event.data.object;
        if (session?.id) {
            await Purchase.findOneAndUpdate(
                { checkoutSessionId: String(session.id) },
                { status: 'failed' },
                { new: true }
            );
        }
    }

    return res.status(200).json({ received: true });
});

module.exports = router;
