import React, { useState } from 'react';
import { useErp } from '../context/ErpContext';
import { saveErpRecord } from '../firebase';
import { SettingsRecord } from '../types/erp';
import { CheckCircle2, FlaskConical, Globe, ShieldCheck, Key, Truck, Megaphone } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, canWrite, showToast } = useErp();

  const isSfMock = !settings.sfKey || settings.sfKey.toLowerCase().includes('mock') || settings.sfKey.toLowerCase().includes('demo');
  const isMetaMock = !settings.metaToken || settings.metaToken.toLowerCase().includes('mock') || settings.metaToken.toLowerCase().includes('demo');

  const [sfKeyInput, setSfKeyInput] = useState('');
  const [sfSecretInput, setSfSecretInput] = useState('');
  const [sfWebhookTokenInput, setSfWebhookTokenInput] = useState('');
  const [metaTokenInput, setMetaTokenInput] = useState('');

  const handleApplyMockCredentials = async () => {
    if (!canWrite) return;
    const next: SettingsRecord = {
      ...settings,
      sfKey: 'mock-steadfast-api-key',
      sfSecret: 'mock-steadfast-secret-key',
      sfWebhookToken: 'mock-webhook-token',
      metaToken: 'mock-meta-access-token',
      metaAccount: settings.metaAccount || 'act_1430584315368882',
    };
    await saveErpRecord('Settings', next);
    setSfKeyInput('mock-steadfast-api-key');
    setSfSecretInput('mock-steadfast-secret-key');
    setSfWebhookTokenInput('mock-webhook-token');
    setMetaTokenInput('mock-meta-access-token');
    showToast('Mock Sandbox Credentials Applied! You can now test parcel booking and balance checks.');
  };

  const handleClearCredentials = async () => {
    if (!canWrite) return;
    const next: SettingsRecord = {
      ...settings,
      sfKey: '',
      sfSecret: '',
      sfWebhookToken: '',
      metaToken: '',
    };
    await saveErpRecord('Settings', next);
    setSfKeyInput('');
    setSfSecretInput('');
    setSfWebhookTokenInput('');
    setMetaTokenInput('');
    showToast('Credentials cleared. You can now enter your live API keys.');
  };

  return (
    <div className="space-y-6">
      {/* Integration Mode Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isSfMock ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'}`}>
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <span>Steadfast Courier API:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isSfMock ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                  {isSfMock ? '🧪 Mock / Sandbox' : '🟢 Live (Packzy API)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isSfMock ? 'Simulating parcel booking, tracking and balance generation.' : 'Connected to live portal.packzy.com endpoint.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isMetaMock ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'}`}>
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <span>Meta Graph API:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isMetaMock ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                  {isMetaMock ? '🧪 Mock / Sandbox' : '🟢 Live (Graph API)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isMetaMock ? 'Simulating ad spends and conversation analytics.' : 'Connected to live graph.facebook.com.'}
              </p>
            </div>
          </div>
        </div>

        {canWrite && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyMockCredentials}
              className="min-h-[38px] px-3.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <FlaskConical className="w-4 h-4" />
              <span>Use Mock Test Mode</span>
            </button>
            <button
              type="button"
              onClick={handleClearCredentials}
              className="min-h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Clear Keys
            </button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form
          onSubmit={async (ev) => {
            ev.preventDefault();
            if (!canWrite) return;
            const fd = new FormData(ev.currentTarget);
            const next: SettingsRecord = {
              ...settings,
              businessName: String(fd.get('businessName') || 'Shoukhin Home Decor').trim(),
              subdomain: String(fd.get('subdomain') || 'erp.shoukhinhd.com').trim(),
              deadDays: Number(fd.get('deadDays') || 60),
              usdRate: Number(fd.get('usdRate') || 122),
              vatRate: Number(fd.get('vatRate') || 15),
              metaAccount: String(fd.get('metaAccount') || '').trim(),
              metaVersion: String(fd.get('metaVersion') || 'v23.0').trim(),
              sfKey: String(fd.get('sfKey') || '').trim() || settings.sfKey,
              sfSecret: String(fd.get('sfSecret') || '').trim() || settings.sfSecret,
              sfWebhookToken: String(fd.get('sfWebhookToken') || '').trim() || settings.sfWebhookToken,
              metaToken: String(fd.get('metaToken') || '').trim() || settings.metaToken,
            };
            await saveErpRecord('Settings', next);
            showToast('Settings saved to Firebase');
          }}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-display">ERP & Integration Settings</h2>
            <Key className="w-4 h-4 text-slate-400" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <label className="space-y-1">
              <span>Business Name</span>
              <input
                name="businessName"
                defaultValue={settings.businessName}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </label>
            <label className="space-y-1">
              <span>Custom Subdomain</span>
              <input
                name="subdomain"
                defaultValue={settings.subdomain || 'erp.shoukhinhd.com'}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
            </label>
            <label className="space-y-1">
              <span>Dead Stock After (Days)</span>
              <input
                name="deadDays"
                type="number"
                min="1"
                defaultValue={settings.deadDays}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
            </label>
            <label className="space-y-1">
              <span>BDT per USD (Meta Ads)</span>
              <input
                name="usdRate"
                type="number"
                step="any"
                defaultValue={settings.usdRate}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
            </label>
            <label className="space-y-1">
              <span>Ad VAT %</span>
              <input
                name="vatRate"
                type="number"
                step="any"
                defaultValue={settings.vatRate}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
            </label>
            <label className="space-y-1">
              <span>Meta USD Ad Account ID</span>
              <input
                name="metaAccount"
                defaultValue={settings.metaAccount}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
            </label>
            <label className="space-y-1">
              <span>Steadfast API Key</span>
              <input
                name="sfKey"
                type="password"
                value={sfKeyInput || settings.sfKey || ''}
                onChange={(e) => setSfKeyInput(e.target.value)}
                placeholder={settings.sfKey ? '•••••••• (Saved)' : 'Enter Steadfast API Key (or "mock")'}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </label>
            <label className="space-y-1">
              <span>Steadfast Secret Key</span>
              <input
                name="sfSecret"
                type="password"
                value={sfSecretInput || settings.sfSecret || ''}
                onChange={(e) => setSfSecretInput(e.target.value)}
                placeholder={settings.sfSecret ? '•••••••• (Saved)' : 'Enter Steadfast Secret (or "mock")'}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </label>
            <label className="col-span-2 space-y-1">
              <span>Steadfast Webhook Auth Token (Optional / Signs X-Signature)</span>
              <input
                name="sfWebhookToken"
                type="password"
                value={sfWebhookTokenInput || settings.sfWebhookToken || ''}
                onChange={(e) => setSfWebhookTokenInput(e.target.value)}
                placeholder={settings.sfWebhookToken ? '•••••••• (Saved)' : 'Enter Auth Token if specified in Steadfast webhook settings'}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </label>
            <label className="col-span-2 space-y-1">
              <span>Meta Graph API Access Token</span>
              <input
                name="metaToken"
                type="password"
                value={metaTokenInput || settings.metaToken || ''}
                onChange={(e) => setMetaTokenInput(e.target.value)}
                placeholder={settings.metaToken ? '•••••••• (Saved)' : 'Enter Meta User/System Access Token (or "mock")'}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={!canWrite}
            className="min-h-[42px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
          >
            Save Settings
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold font-display">
              Custom Subdomain: erp.shoukhinhd.com
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            To connect your custom subdomain <strong>erp.shoukhinhd.com</strong> to this cloud ERP application:
          </p>
          <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 list-decimal list-inside">
            <li>
              Open your DNS manager for <strong>shoukhinhd.com</strong> (Cloudflare, Namecheap, or cPanel).
            </li>
            <li>
              Add a <strong>CNAME</strong> record for host <code className="font-mono font-bold">erp</code> pointing to <code className="font-mono">ghs.googlehosted.com</code> (for Cloud Run custom domain mapping) or your Firebase Hosting domain.
            </li>
            <li>
              In Google Cloud Console → <strong>Firebase Authentication → Settings → Authorized domains</strong>, add <code className="font-mono font-bold">erp.shoukhinhd.com</code> so Google Sign-In works seamlessly on your subdomain.
            </li>
          </ol>
        </div>

        {/* Steadfast Webhook Configuration Helper */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold font-display">
              Steadfast Courier Webhook Setup Guide
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Endpoint / Callback URL
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Copy and paste this into Steadfast portal &quot;Callback URL&quot; (Never enter an email like shoukhinhd@gmail.com here):
              </p>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 break-all select-all">
                https://api.erp.shoukhinhd.com/api/steadfast/webhook
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Auth Token (Optional)
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Enter any secret token in Steadfast (e.g. your Secret Key <code className="font-mono">tij9eaqybg07fndan7jniisz</code>). Requests are automatically HMAC-SHA256 verified!
              </p>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-blue-600 dark:text-blue-400 break-all select-all">
                {settings.sfWebhookToken || settings.sfSecret || 'tij9eaqybg07fndan7jniisz'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
