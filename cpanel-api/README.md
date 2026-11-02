# Shoukhin ERP — cPanel API

This folder is a standalone Express API for the cPanel Node.js Application at
`https://api.erp.shoukhinhd.com`. The React/Vite frontend remains hosted on Firebase Hosting.

## cPanel application settings

- Node.js: 20.x
- Application root: `shoukhin-erp-api` (folder under the cPanel account home directory)
- Application URL/domain: `api.erp.shoukhinhd.com`
- Application URL path: blank
- Startup file: `app.js`
- Application mode: Production

Upload the **contents of this folder** into the cPanel application root. Then click **Run NPM Install** in cPanel and restart the application.

## Environment variables

Set these in cPanel → Setup Node.js App → Environment variables:

- `CORS_ORIGINS` = `https://erp.shoukhinhd.com`
- `MOCK_COURIER` = `true` initially for safe testing; change to `false` only when real credentials are configured.
- `MOCK_META` = `true` initially for safe testing; change to `false` only when real credentials are configured.
- `STEADFAST_API_KEY` (optional; do not commit real credentials)
- `STEADFAST_SECRET_KEY` (optional; do not commit real credentials)
- `STEADFAST_WEBHOOK_TOKEN` (optional; use a strong random secret)

The current frontend sends integration credentials from its Settings to the API. Environment variables are supported as server-side fallbacks. Never put real secrets in this repository.

## Health check

After DNS and SSL are ready, open:

`https://api.erp.shoukhinhd.com/api/health`

Expected JSON includes `"ok": true`.

## Important limitations

- Webhook event logs and duplicate-event keys are currently held in memory and are cleared if Passenger restarts the app. This is not durable event storage.
- The API currently exposes webhook event list/clear/test routes without user authentication to preserve the existing ERP UI behavior. Restrict these routes before using the API for sensitive production operations.
- The frontend must be configured to call the API subdomain (not the Firebase Hosting origin) before the integrations work. The main ERP data/auth continues to use Firebase directly.
