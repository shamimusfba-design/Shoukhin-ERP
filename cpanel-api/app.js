import express from 'express';
import crypto from 'node:crypto';

const app = express();
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || 'https://erp.shoukhinhd.com')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Signature,Idempotency-Key');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({
  limit: '15mb',
  verify: (req, _res, buffer) => { req.rawBody = buffer; }
}));

const webhookLogs = [];
const processedKeys = new Set();

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'Shoukhin Home Decor ERP API',
    domain: 'api.erp.shoukhinhd.com',
    timezone: 'Asia/Dhaka',
    version: '2.2.0-cloud-api',
    mockSteadfast: process.env.MOCK_COURIER === 'true',
    mockMeta: process.env.MOCK_META === 'true'
  });
});

app.post('/api/steadfast', async (req, res) => {
  try {
    const { endpoint, method = 'GET', body } = req.body || {};
    const sfKey = String(req.body?.sfKey || process.env.STEADFAST_API_KEY || '').trim();
    const sfSecret = String(req.body?.sfSecret || process.env.STEADFAST_SECRET_KEY || '').trim();
    if (!endpoint) return res.status(400).json({ ok: false, error: 'Steadfast endpoint is required.' });

    const cleanPath = String(endpoint).startsWith('/') ? String(endpoint) : `/${endpoint}`;
    const mock = process.env.MOCK_COURIER === 'true' ||
      /mock|demo/i.test(sfKey) || /mock|demo/i.test(sfSecret);

    if (mock) {
      if (cleanPath === '/get_balance') {
        return res.json({ ok: true, mock: true, data: { status: 200, current_balance: 28450, message: 'Mock balance retrieved' } });
      }
      if (cleanPath === '/create_order') {
        const cid = 10000000 + Math.floor(Math.random() * 9000000);
        return res.json({ ok: true, mock: true, data: { status: 200, message: 'Mock order created', consignment: {
          consignment_id: cid, invoice: body?.invoice || `INV-${Date.now()}`,
          tracking_code: `SF${Math.floor(10000000 + Math.random() * 9000000)}`,
          recipient_name: body?.recipient_name || 'Valued Customer',
          recipient_phone: body?.recipient_phone || '01700000000',
          recipient_address: body?.recipient_address || 'Bangladesh',
          cod_amount: Number(body?.cod_amount || 0), status: 'in_review', created_at: new Date().toISOString()
        } } });
      }
      if (cleanPath.startsWith('/status_by_cid') || cleanPath.startsWith('/status_by_trackingcode')) {
        const statuses = ['in_review', 'pending', 'delivered', 'partial_delivered'];
        return res.json({ ok: true, mock: true, data: { status: 200, delivery_status: statuses[Math.floor(Math.random() * statuses.length)], message: 'Mock status' } });
      }
      return res.json({ ok: true, mock: true, data: { status: 200, message: `Mock response for ${cleanPath}` } });
    }

    if (!sfKey || !sfSecret) {
      return res.status(400).json({ ok: false, error: 'Steadfast API Key & Secret Key are required.' });
    }
    const upperMethod = String(method).toUpperCase();
    const response = await fetch(`https://portal.packzy.com/api/v1${cleanPath}`, {
      method: upperMethod,
      headers: { 'Api-Key': sfKey, 'Secret-Key': sfSecret, 'Content-Type': 'application/json' },
      ...(body && upperMethod !== 'GET' ? { body: JSON.stringify(body) } : {})
    });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch {
      return res.status(502).json({ ok: false, error: `Steadfast returned non-JSON (HTTP ${response.status})` });
    }
    if (!response.ok || (data.status && Number(data.status) >= 400)) {
      return res.status(response.ok ? 400 : response.status).json({ ok: false, error: `Steadfast request rejected (${data.status || response.status})`, details: data });
    }
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Steadfast proxy error' });
  }
});

app.post('/api/meta', async (req, res) => {
  try {
    const { metaVersion = 'v23.0', path: graphPath, params } = req.body || {};
    const token = String(req.body?.metaToken || process.env.META_ACCESS_TOKEN || '').trim();
    const mock = process.env.MOCK_META === 'true' || /mock|demo/i.test(token);
    if (mock) {
      return res.json({ ok: true, mock: true, data: { data: [
        { campaign_name: 'Shoukhin Home Decor - Autumn Collection', spend: '45.20', impressions: '19400', clicks: '980', actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '82' }] },
        { campaign_name: 'Shoukhin Home Decor - Wall Accents & Lighting', spend: '32.10', impressions: '14100', clicks: '730', actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '54' }] }
      ] } });
    }
    if (!token || !graphPath) return res.status(400).json({ ok: false, error: 'Meta token and Graph API path are required.' });
    const query = new URLSearchParams(params || {}).toString();
    const url = `https://graph.facebook.com/${encodeURIComponent(metaVersion)}/${String(graphPath).replace(/^\/+/, '')}${query ? `?${query}` : ''}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok || data.error) return res.status(400).json({ ok: false, error: `Meta request failed (code ${data.error?.code || response.status}). Check token and permissions.` });
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Meta proxy error' });
  }
});

async function handleWebhook(req, res) {
  try {
    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const auth = String(req.get('Authorization') || '').trim();
    const signature = String(req.get('X-Signature') || '').trim();
    const key = String(req.get('Idempotency-Key') || '').trim();
    const secret = String(process.env.STEADFAST_WEBHOOK_TOKEN || process.env.STEADFAST_SECRET_KEY || '').trim();

    if (secret && signature) {
      const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
      const a = Buffer.from(signature);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ status: 'error', message: 'Signature verification failed' });
      }
    }
    if (secret && auth.toLowerCase().startsWith('bearer ')) {
      if (auth.slice(7).trim() !== secret) return res.status(401).json({ status: 'error', message: 'Invalid Bearer token' });
    }
    if (key && processedKeys.has(key)) return res.status(200).json({ status: 'success', duplicate: true, message: 'Event already processed' });
    if (key) {
      processedKeys.add(key);
      if (processedKeys.size > 1000) processedKeys.delete(processedKeys.values().next().value);
    }
    const payload = req.body || {};
    const event = {
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      receivedAt: new Date().toISOString(),
      notification_type: String(payload.notification_type || 'unknown'),
      consignment_id: payload.consignment_id,
      invoice: payload.invoice,
      status: payload.status,
      cod_amount: payload.cod_amount ? Number(payload.cod_amount) : undefined,
      delivery_charge: payload.delivery_charge ? Number(payload.delivery_charge) : undefined,
      tracking_message: payload.tracking_message,
      updated_at: payload.updated_at || new Date().toISOString(),
      raw: payload
    };
    webhookLogs.unshift(event);
    if (webhookLogs.length > 100) webhookLogs.pop();
    return res.status(200).json({ status: 'success', received: true, notification_type: event.notification_type, consignment_id: event.consignment_id, invoice: event.invoice, timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Webhook error' });
  }
}

app.post('/api/steadfast/webhook', handleWebhook);
app.post('/steadfast/webhook', handleWebhook);
app.get('/api/steadfast/webhook/events', (_req, res) => {
  res.json({ ok: true, events: webhookLogs, total: webhookLogs.length, configuredToken: Boolean(process.env.STEADFAST_WEBHOOK_TOKEN || process.env.STEADFAST_SECRET_KEY) });
});
app.delete('/api/steadfast/webhook/events', (_req, res) => {
  webhookLogs.length = 0;
  res.json({ ok: true, message: 'Webhook logs cleared' });
});
app.post('/api/steadfast/webhook/test', (req, res) => {
  const { notification_type = 'delivery_status', status = 'delivered', invoice = 'INV-1001', consignment_id = 98765 } = req.body || {};
  const payload = { notification_type, consignment_id, invoice, cod_amount: 1500, status, delivery_charge: 100,
    tracking_message: status === 'delivered' ? 'Your package has been delivered successfully.' : `Parcel status updated to ${status}`,
    updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19) };
  const secret = String(process.env.STEADFAST_WEBHOOK_TOKEN || process.env.STEADFAST_SECRET_KEY || 'shoukhin_sf_token').trim();
  const signature = crypto.createHmac('sha256', secret).update(Buffer.from(JSON.stringify(payload))).digest('hex');
  const event = { id: `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, receivedAt: new Date().toISOString(),
    ...payload, raw: payload };
  webhookLogs.unshift(event);
  if (webhookLogs.length > 100) webhookLogs.pop();
  res.json({ ok: true, message: 'Test webhook event simulated successfully', event, signature });
});

app.use((req, res) => res.status(404).json({ ok: false, error: 'API route not found' }));

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => console.log(`Shoukhin ERP API listening on port ${port}`));
