import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // Health & Subdomain Info Endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'Shoukhin Home Decor ERP',
      domain: 'erp.shoukhinhd.com',
      timezone: 'Asia/Dhaka',
      version: '2.2.0-cloud',
    });
  });

  // Steadfast Courier Proxy Route (avoids browser CORS issues with Packzy API)
  app.post('/api/steadfast', async (req, res) => {
    try {
      const { endpoint, method = 'GET', sfKey, sfSecret, body } = req.body || {};
      if (!endpoint || !sfKey || !sfSecret) {
        res.status(400).json({ ok: false, error: 'Steadfast API Key, Secret Key, and endpoint are required.' });
        return;
      }
      const cleanPath = String(endpoint).startsWith('/') ? String(endpoint) : `/${endpoint}`;
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
      const { metaVersion, metaToken, path: graphPath, params } = req.body || {};
      if (!metaVersion || !metaToken || !graphPath) {
        res.status(400).json({ ok: false, error: 'Save Meta token and supported Graph API version in Settings.' });
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
