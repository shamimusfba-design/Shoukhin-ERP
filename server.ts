import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WebhookLogItem {
  id: string;
  receivedAt: string;
  notification_type: string;
  consignment_id?: number | string;
  invoice?: string;
  status?: string;
  cod_amount?: number;
  delivery_charge?: number;
  tracking_message?: string;
  updated_at?: string;
  raw: Record<string, unknown>;
}

const webhookLogs: WebhookLogItem[] = [];
const processedIdempotencyKeys = new Set<string>();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  // Capture raw body for HMAC signature verification
  app.use(
    express.json({
      limit: '15mb',
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    })
  );

  // Health & Subdomain Info Endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'Shoukhin Home Decor ERP',
      domain: 'erp.shoukhinhd.com',
      timezone: 'Asia/Dhaka',
      version: '2.2.0-cloud',
      mockSteadfast: process.env.MOCK_COURIER === 'true',
      mockMeta: process.env.MOCK_META === 'true',
    });
  });

  // Steadfast Courier Proxy Route (avoids browser CORS issues with Packzy API)
  app.post('/api/steadfast', async (req, res) => {
    try {
      let { endpoint, method = 'GET', sfKey, sfSecret, body } = req.body || {};

      // Fallback to environment variables if configured
      sfKey = sfKey || process.env.STEADFAST_API_KEY || '';
      sfSecret = sfSecret || process.env.STEADFAST_SECRET_KEY || '';

      const cleanPath = String(endpoint || '').startsWith('/') ? String(endpoint) : `/${endpoint}`;

      // Check if Mock / Sandbox mode is active
      const isMock =
        process.env.MOCK_COURIER === 'true' ||
        String(sfKey).toLowerCase().includes('mock') ||
        String(sfKey).toLowerCase().includes('demo') ||
        String(sfSecret).toLowerCase().includes('mock') ||
        String(sfSecret).toLowerCase().includes('demo');

      if (isMock) {
        if (cleanPath === '/get_balance') {
          res.json({
            ok: true,
            mock: true,
            data: {
              status: 200,
              current_balance: 28450,
              message: 'Mock Steadfast balance retrieved successfully',
            },
          });
          return;
        }

        if (cleanPath === '/create_order') {
          const cid = 10000000 + Math.floor(Math.random() * 9000000);
          const tracking = 'SF' + Math.floor(10000000 + Math.random() * 9000000);
          res.json({
            ok: true,
            mock: true,
            data: {
              status: 200,
              message: 'Consignment created successfully (Mock Mode)',
              consignment: {
                consignment_id: cid,
                invoice: body?.invoice || `INV-${Date.now()}`,
                tracking_code: tracking,
                recipient_name: body?.recipient_name || 'Valued Customer',
                recipient_phone: body?.recipient_phone || '01700000000',
                recipient_address: body?.recipient_address || 'Dhaka, Bangladesh',
                cod_amount: Number(body?.cod_amount || 0),
                status: 'in_review',
                created_at: new Date().toISOString(),
              },
            },
          });
          return;
        }

        if (cleanPath.startsWith('/status_by_cid') || cleanPath.startsWith('/status_by_trackingcode')) {
          const statuses = ['in_review', 'pending', 'delivered', 'partial_delivered', 'delivered'];
          const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
          res.json({
            ok: true,
            mock: true,
            data: {
              status: 200,
              delivery_status: randomStatus,
              message: `Mock status for ${cleanPath}`,
            },
          });
          return;
        }

        res.json({
          ok: true,
          mock: true,
          data: {
            status: 200,
            message: `Mock response for endpoint: ${cleanPath}`,
          },
        });
        return;
      }

      if (!endpoint || !sfKey || !sfSecret) {
        res.status(400).json({
          ok: false,
          error:
            'Steadfast API Key & Secret Key are required. Enter real credentials or type "mock" in Settings to test in Mock Mode.',
        });
        return;
      }

      const url = `https://portal.packzy.com/api/v1${cleanPath}`;
      const fetchOptions: RequestInit = {
        method: String(method).toUpperCase(),
        headers: {
          'Api-Key': String(sfKey).trim(),
          'Secret-Key': String(sfSecret).trim(),
          'Content-Type': 'application/json',
        },
      };
      if (body && fetchOptions.method !== 'GET') {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      const text = await response.text();
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(text);
      } catch {
        res.status(502).json({ ok: false, error: `Steadfast response was not valid JSON (HTTP ${response.status})` });
        return;
      }

      if (!response.ok || (data.status && Number(data.status) >= 400)) {
        res.status(response.ok ? 400 : response.status).json({
          ok: false,
          error: `Steadfast request rejected (${data.status || response.status}). Check credentials or parcel fields.`,
          details: data,
        });
        return;
      }

      res.json({ ok: true, data });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Steadfast proxy error',
      });
    }
  });

  // Meta Graph API Proxy Route (Read-only Ads Insights)
  app.post('/api/meta', async (req, res) => {
    try {
      let { metaVersion = 'v23.0', metaToken, path: graphPath, params } = req.body || {};
      metaToken = metaToken || process.env.META_ACCESS_TOKEN || '';

      const isMock =
        process.env.MOCK_META === 'true' ||
        String(metaToken).toLowerCase().includes('mock') ||
        String(metaToken).toLowerCase().includes('demo');

      if (isMock) {
        res.json({
          ok: true,
          mock: true,
          data: {
            data: [
              {
                campaign_name: 'Shoukhin Home Decor - Autumn Collection',
                spend: '45.20',
                impressions: '19400',
                clicks: '980',
                actions: [
                  { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '82' },
                ],
              },
              {
                campaign_name: 'Shoukhin Home Decor - Wall Accents & Lighting',
                spend: '32.10',
                impressions: '14100',
                clicks: '730',
                actions: [
                  { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '54' },
                ],
              },
            ],
          },
        });
        return;
      }

      if (!metaVersion || !metaToken || !graphPath) {
        res.status(400).json({
          ok: false,
          error: 'Save Meta token in Settings or enter "mock" to test in Mock Mode.',
        });
        return;
      }

      const query = new URLSearchParams(params || {}).toString();
      const url = `https://graph.facebook.com/${encodeURIComponent(metaVersion)}/${graphPath}${query ? `?${query}` : ''}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${String(metaToken).trim()}`,
        },
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        res.status(400).json({
          ok: false,
          error: `Meta request failed (code ${data.error?.code || response.status}). Check token, ads_read permission and API version.`,
        });
        return;
      }
      res.json({ ok: true, data });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Meta Graph proxy error',
      });
    }
  });

  // Steadfast Webhook Handler
  const handleSteadfastWebhook = async (req: express.Request, res: express.Response) => {
    try {
      const rawBodyBuffer: Buffer = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}));
      const authHeader = (req.get('Authorization') || req.get('authorization') || '').trim();
      const givenSignature = (req.get('X-Signature') || req.get('x-signature') || '').trim();
      const idempotencyKey = (req.get('Idempotency-Key') || req.get('idempotency-key') || '').trim();

      const configuredToken = (process.env.STEADFAST_WEBHOOK_TOKEN || process.env.STEADFAST_SECRET_KEY || '').trim();

      // If token and signature are present, verify HMAC-SHA256
      if (configuredToken && givenSignature) {
        const hmac = crypto.createHmac('sha256', configuredToken);
        const computedSignature = hmac.update(rawBodyBuffer).digest('hex');

        const givenBuf = Buffer.from(givenSignature);
        const computedBuf = Buffer.from(computedSignature);

        const isValid =
          givenBuf.length === computedBuf.length &&
          crypto.timingSafeEqual(givenBuf, computedBuf);

        if (!isValid) {
          console.warn('[Steadfast Webhook] Invalid X-Signature header provided:', {
            givenSignature,
            computedSignature,
          });
          return res.status(401).json({
            status: 'error',
            message: 'Signature verification failed (X-Signature mismatch)',
          });
        }
      }

      // If token and Bearer authorization are present, check token
      if (configuredToken && authHeader.startsWith('Bearer ')) {
        const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (bearer && bearer !== configuredToken) {
          console.warn('[Steadfast Webhook] Invalid Authorization Bearer token.');
          return res.status(401).json({
            status: 'error',
            message: 'Invalid Authorization Bearer token',
          });
        }
      }

      // Idempotency: avoid double-processing when Steadfast retries within 2 minutes
      if (idempotencyKey) {
        if (processedIdempotencyKeys.has(idempotencyKey)) {
          console.log(`[Steadfast Webhook] Duplicate retry ignored for Idempotency-Key: ${idempotencyKey}`);
          return res.status(200).json({
            status: 'success',
            duplicate: true,
            message: 'Event already processed',
          });
        }
        processedIdempotencyKeys.add(idempotencyKey);
        if (processedIdempotencyKeys.size > 1000) {
          const oldestKey = processedIdempotencyKeys.values().next().value;
          if (oldestKey) processedIdempotencyKeys.delete(oldestKey);
        }
      }

      let payload = req.body;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = {};
        }
      }

      const notificationType = String(payload?.notification_type || 'unknown');
      const eventRecord: WebhookLogItem = {
        id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        receivedAt: new Date().toISOString(),
        notification_type: notificationType,
        consignment_id: payload?.consignment_id,
        invoice: payload?.invoice,
        status: payload?.status,
        cod_amount: payload?.cod_amount ? Number(payload.cod_amount) : undefined,
        delivery_charge: payload?.delivery_charge ? Number(payload.delivery_charge) : undefined,
        tracking_message: payload?.tracking_message,
        updated_at: payload?.updated_at || new Date().toISOString(),
        raw: payload,
      };

      webhookLogs.unshift(eventRecord);
      if (webhookLogs.length > 100) {
        webhookLogs.pop();
      }

      console.log(`[Steadfast Webhook] Received ${notificationType} event:`, {
        consignment_id: eventRecord.consignment_id,
        invoice: eventRecord.invoice,
        status: eventRecord.status,
      });

      // Steadfast expects a 2xx response within 5 seconds
      return res.status(200).json({
        status: 'success',
        received: true,
        notification_type: notificationType,
        consignment_id: eventRecord.consignment_id,
        invoice: eventRecord.invoice,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[Steadfast Webhook Error]:', err);
      return res.status(500).json({
        status: 'error',
        message: err instanceof Error ? err.message : 'Internal webhook error',
      });
    }
  };

  // Endpoints accepting incoming Steadfast webhook
  app.post('/api/steadfast/webhook', handleSteadfastWebhook);
  app.post('/steadfast/webhook', handleSteadfastWebhook);

  // Retrieve received webhook events for ERP UI
  app.get('/api/steadfast/webhook/events', (_req, res) => {
    res.json({
      ok: true,
      events: webhookLogs,
      total: webhookLogs.length,
      configuredToken: Boolean(process.env.STEADFAST_WEBHOOK_TOKEN || process.env.STEADFAST_SECRET_KEY),
    });
  });

  // Clear webhook events
  app.delete('/api/steadfast/webhook/events', (_req, res) => {
    webhookLogs.length = 0;
    res.json({ ok: true, message: 'Webhook logs cleared' });
  });

  // Test webhook simulator (allows instant testing from Courier dashboard)
  app.post('/api/steadfast/webhook/test', (req, res) => {
    const { notification_type = 'delivery_status', status = 'delivered', invoice = 'INV-1001', consignment_id = 98765 } = req.body || {};
    const samplePayload = {
      notification_type,
      consignment_id,
      invoice,
      cod_amount: 1500.0,
      status,
      delivery_charge: 100.0,
      tracking_message: status === 'delivered' ? 'Your package has been delivered successfully.' : `Parcel status updated to ${status}`,
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    const token = (process.env.STEADFAST_WEBHOOK_TOKEN || process.env.STEADFAST_SECRET_KEY || 'shoukhin_sf_token').trim();
    const rawBodyBuffer = Buffer.from(JSON.stringify(samplePayload));
    const signature = crypto.createHmac('sha256', token).update(rawBodyBuffer).digest('hex');

    const testEvent: WebhookLogItem = {
      id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      receivedAt: new Date().toISOString(),
      notification_type: samplePayload.notification_type,
      consignment_id: samplePayload.consignment_id,
      invoice: samplePayload.invoice,
      status: samplePayload.status,
      cod_amount: samplePayload.cod_amount,
      delivery_charge: samplePayload.delivery_charge,
      tracking_message: samplePayload.tracking_message,
      updated_at: samplePayload.updated_at,
      raw: samplePayload,
    };

    webhookLogs.unshift(testEvent);
    if (webhookLogs.length > 100) webhookLogs.pop();

    res.json({
      ok: true,
      message: 'Test webhook event simulated successfully',
      event: testEvent,
      signature,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Shoukhin Home Decor ERP server running on http://localhost:${PORT}`);
  });
}

startServer();
