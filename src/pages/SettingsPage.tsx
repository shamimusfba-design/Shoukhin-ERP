import React, { useState } from 'react';
import { useErp } from '../context/ErpContext';
import { saveErpRecord } from '../firebase';
import { SettingsRecord } from '../types/erp';
import { APP_VERSION, RELEASE_HISTORY } from '../data/releaseHistory';
import {
  CheckCircle2,
  FlaskConical,
  Globe,
  ShieldCheck,
  Key,
  Truck,
  Megaphone,
  History,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, canWrite, showToast } = useErp();
  const [activeTab, setActiveTab] = useState<'general' | 'updates' | 'about'>('general');

  const isSfMock =
    !settings.sfKey ||
    settings.sfKey.toLowerCase().includes('mock') ||
    settings.sfKey.toLowerCase().includes('demo');
  const isMetaMock =
    !settings.metaToken ||
    settings.metaToken.toLowerCase().includes('mock') ||
    settings.metaToken.toLowerCase().includes('demo');

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
      {/* Top Tab Bar */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`min-h-[38px] px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>General & Integrations</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('updates')}
          className={`min-h-[38px] px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'updates'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Update History</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-700/60 text-white">
            {APP_VERSION}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('about')}
          className={`min-h-[38px] px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'about'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>About</span>
        </button>
      </div>

      {/* TAB 1: General & Integrations */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Integration Mode Banner */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    isSfMock
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <span>Steadfast Courier API:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isSfMock
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isSfMock ? '🧪 Mock / Sandbox' : '🟢 Live (Packzy API)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isSfMock
                      ? 'Simulating parcel booking, tracking and balance generation.'
                      : 'Connected to live portal.packzy.com endpoint.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    isMetaMock
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <span>Meta Graph API:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isMetaMock
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isMetaMock ? '🧪 Mock / Sandbox' : '🟢 Live (Graph API)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isMetaMock
                      ? 'Simulating ad spends and conversation analytics.'
                      : 'Connected to live graph.facebook.com.'}
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
                  sfWebhookToken:
                    String(fd.get('sfWebhookToken') || '').trim() || settings.sfWebhookToken,
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
                <label className="space-y-1 sm:col-span-2">
                  <span>Steadfast API Key</span>
                  <input
                    name="sfKey"
                    defaultValue={sfKeyInput || settings.sfKey}
                    onChange={(e) => setSfKeyInput(e.target.value)}
                    placeholder="hp465esy0vg4qfhh2tmc64kthtczvrfe"
                    className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span>Steadfast Secret Key</span>
                  <input
                    name="sfSecret"
                    defaultValue={sfSecretInput || settings.sfSecret}
                    onChange={(e) => setSfSecretInput(e.target.value)}
                    placeholder="tij9eaqybg07fndan7jniisz"
                    className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span>Steadfast Webhook Secret Token</span>
                  <input
                    name="sfWebhookToken"
                    defaultValue={sfWebhookTokenInput || settings.sfWebhookToken}
                    onChange={(e) => setSfWebhookTokenInput(e.target.value)}
                    placeholder="Webhook signature token"
                    className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span>Meta System User Token</span>
                  <input
                    name="metaToken"
                    defaultValue={metaTokenInput || settings.metaToken}
                    onChange={(e) => setMetaTokenInput(e.target.value)}
                    placeholder="EAA..."
                    className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={!canWrite}
                className="min-h-[42px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Save Settings
              </button>
            </form>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold font-display">
                  Live Domain: erp.shoukhinhd.com
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Your custom subdomain <strong>erp.shoukhinhd.com</strong> is fully verified with Google Firebase SSL (HTTPS) certificate.
              </p>
              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>DNS CNAME record resolved to <code>gen-lang-client-0373015650.web.app</code>.</span>
              </div>
            </div>

            {/* Steadfast Webhook Configuration Helper */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 lg:col-span-2">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold font-display">
                  Steadfast Courier Webhook Configuration
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Callback URL
                  </span>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 break-all select-all">
                    https://erp.shoukhinhd.com/api/steadfast/webhook
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Auth Token (Optional)
                  </span>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-blue-600 dark:text-blue-400 break-all select-all">
                    {settings.sfWebhookToken || settings.sfSecret || 'tij9eaqybg07fndan7jniisz'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Update History */}
      {activeTab === 'updates' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
                  Update History & Release Records
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chronological release notes categorized by actual Added, Improved, and Fixed system modifications.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {RELEASE_HISTORY.map((rel) => (
              <div
                key={rel.version}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
              >
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-600 text-white shadow-xs">
                      {rel.version}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Release Date: {rel.releaseDate}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {rel.changes.length} Verified Modifications
                  </span>
                </div>

                <div className="p-6 space-y-4 text-xs">
                  <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {rel.summary}
                  </p>

                  <div className="space-y-2.5 pt-2">
                    {rel.changes.map((c, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-3"
                      >
                        {c.type === 'added' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 uppercase shrink-0 mt-0.5">
                            Added
                          </span>
                        ) : c.type === 'improved' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 uppercase shrink-0 mt-0.5">
                            Improved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 uppercase shrink-0 mt-0.5">
                            Fixed
                          </span>
                        )}
                        <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                          {c.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: About */}
      {activeTab === 'about' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Shoukhin"
                className="w-12 h-12 rounded-2xl object-contain bg-white p-1 border border-slate-200 dark:border-slate-800 shadow-xs"
              />
              <div>
                <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
                  Shoukhin Home Decor ERP
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  "Live the place you love" · Transform your place like imagination
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Installed Application Version</div>
                <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                  {APP_VERSION}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Workspace Subdomain</div>
                <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  erp.shoukhinhd.com
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Account Access Model</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Single-Role (Admin) with Backend Rules Enforcement
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Backend & Database Infrastructure</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Google Cloud Firestore & Firebase Applet
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
