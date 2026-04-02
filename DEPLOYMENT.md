# Deployment Guide

This project has two apps:

- Backend: Express + MongoDB + Stripe
- Frontend: Vite + React

## 1. Prerequisites

- Node.js 18+ (recommended: latest LTS)
- MongoDB connection string
- Stripe account with live mode enabled
- Domain/hosting for frontend and backend

## 2. Backend Environment Variables

Create backend/.env with production values:

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_long_random_secret
FRONTEND_URL=https://your-frontend-domain.com
ADMIN_EMAILS=admin@your-domain.com

STRIPE_SECRET_KEY=sk_live_xxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxx

# Optional email settings

SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email_user
SMTP_PASS=your_email_password
EMAIL_FROM=Tigrinya Kids <no-reply@your-domain.com>

# Optional queue (set true only if Redis is available)

ENABLE_EMAIL_QUEUE=false
REDIS_URL=redis://127.0.0.1:6379

Notes:

- Never expose STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET to the frontend.
- Only STRIPE_PUBLISHABLE_KEY can be used client-side.

## 3. Frontend Environment Variables

Create frontend/.env.production:

VITE_API_URL=https://your-backend-domain.com

If frontend and backend are served from the same domain path, VITE_API_URL can be left empty.

## 4. Install Dependencies

Backend:

npm install --prefix backend

Frontend:

npm install --prefix frontend

## 5. Build Frontend

npm run build --prefix frontend

This creates frontend/dist.

## 6. Start Backend

npm start --prefix backend

Verify health endpoint:

- GET /health should return status ok.

## 7. Stripe Webhook Setup

In Stripe Dashboard:

- Add webhook endpoint:
  https://your-backend-domain.com/payment/webhook
- Subscribe to at least:
  - checkout.session.completed
  - checkout.session.async_payment_failed
- Copy webhook signing secret to STRIPE_WEBHOOK_SECRET.

## 8. Go-Live Verification Checklist

- Backend starts with no missing env errors.
- Frontend can load pricing page.
- Payment status shows Stripe live mode.
- Buy Course opens Stripe Checkout.
- After successful payment:
  - Webhook records purchase
  - User gets course unlocked
  - Verify endpoint returns success
- Admin purchases page shows transaction logs.

## 9. Security Checklist

- Keep backend .env out of source control.
- Use a long JWT_SECRET.
- Use HTTPS for frontend and backend.
- Restrict CORS origin to real frontend domain.
- Keep all dependencies updated.

## 10. Common Production Troubleshooting

- Payment unavailable:
  - Check STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY.
- Payment success but course not unlocked:
  - Check webhook endpoint reachability and STRIPE_WEBHOOK_SECRET.
- API not reachable from frontend:
  - Check VITE_API_URL and backend CORS origin.

## 11. Make Site Public And Searchable (Google)

To make the site discoverable on Google, complete these steps after deployment:

1. Deploy frontend to a public domain (for example Vercel/Netlify) and ensure HTTPS is active.
2. Deploy backend to a public URL and set `VITE_API_URL` in frontend production env.
3. Replace placeholder domain values in these files with your real domain:

- `frontend/index.html` canonical URL
- `frontend/public/robots.txt` sitemap URL
- `frontend/public/sitemap.xml` all `<loc>` entries

4. Build and redeploy frontend:

- `npm run build --prefix frontend`

5. Verify these URLs are publicly reachable:

- `https://your-domain.com/robots.txt`
- `https://your-domain.com/sitemap.xml`
- `https://your-domain.com/pricing`

Google indexing checklist:

1. Open Google Search Console and add your domain property.
2. Verify ownership (DNS verification recommended).
3. Submit your sitemap URL (`https://your-domain.com/sitemap.xml`).
4. Use URL Inspection for homepage and pricing page, then request indexing.
5. Wait for crawl/index (can take days).

Notes:

- Your frontend includes SPA rewrite configs for Netlify (`frontend/public/_redirects`) and Vercel (`frontend/vercel.json`).
- Keep meaningful page titles/descriptions and publish quality content updates regularly to improve search visibility.
