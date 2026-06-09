# MyBlueprintPortfolio Server

Express + MongoDB API for the portfolio, admin panel, Study Hub, PDF resources, AI chat, contact form, and premium study content.

## Local Setup

```bash
npm install
cp .env.example .env
npm run build
npm run start
```

Required production variables are `MONGO_URI`, `JWT_SECRET`, and `CLIENT_ORIGINS`. Optional AI, Cloudinary, Google login, NewsAPI, and Resend keys are documented in `.env.example`.

## Production Checks

- `GET /` returns service metadata as JSON.
- `GET /api/health` returns service, database, uptime, and timestamp.
- `ENABLE_DAILY_JOURNEY_CRON=false` disables the daily cron on secondary workers.
- `CLIENT_ORIGINS` should contain the exact deployed frontend origins.
- `NODE_ENV=production` enables HTTPS HSTS when the request is behind an HTTPS proxy.

## Content Enrichment

Use these scripts before a release or after importing new materials:

```bash
npm run admin:seed-premium-study-content -- --verify
npm run admin:seed-cbse-upsc-premium -- --verify
npm run admin:compact-cbse-upsc
```

If verification reports missing resources, run the matching command with `--apply` after reviewing the output.

## Contact Email Notifications

The contact form saves each message in MongoDB. To also receive messages by email, configure Resend:

```env
RESEND_API_KEY=your_resend_api_key
CONTACT_EMAIL_TO=your-inbox@example.com
RESEND_EMAIL_FROM=Portfolio Contact <hello@yourdomain.com>
```

`RESEND_EMAIL_FROM` is optional until a custom domain is verified.
