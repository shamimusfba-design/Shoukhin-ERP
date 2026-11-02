import React, { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../services/api';
import { useErp } from '../context/ErpContext';
import {
  Truck,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Radio,
  Zap,
  Trash2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { formatMoney, normalizeStatus } from '../services/erpEngine';
import { SteadfastWebhookEvent, OrderRecord } from '../types/erp';
import { saveErpRecord } from '../firebase';

export const CourierPage: React.FC = () => {
  const {
    busy,
    setBusy,
    settings,
    handleRefreshCourierBalance,
    handleUpdateOrderStatus,
    handleBookSteadfastOrder,
    erpState,
    setPage,
    showToast,
    canWrite,
  } = useErp();

  const [courierOutput, setCourierOutput] = useState<string>('');
  const [webhookEvents, setWebhookEvents] = useState<SteadfastWebhookEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [testBusy, setTestBusy] = useState<boolean>(false);

  const isMock =
    !settings.sfKey ||
    settings.sfKey.toLowerCase().includes('mock') ||
    settings.sfKey.toLowerCase().includes('demo');

  const unbookedOrders = erpState.Orders.filter((o) => !o.cid && !o.tracking);
  const bookedOrders = erpState.Orders.filter((o) => o.cid || o.tracking);

  const callbackUrl = 'https://api.erp.shoukhinhd.com/api/steadfast/webhook';
  const authToken = settings.sfWebhookToken || settings.sfSecret || 'tij9eaqybg07fndan7jniisz';

  const fetchWebhookEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const res = await fetch(apiUrl('/api/steadfast/webhook/events'));
      if (res.ok) {
        const json = await res.json();
        setWebhookEvents(json.events || []);
      }
    } catch (err) {
      console.warn('Failed to fetch webhook events:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhookEvents();
  }, [fetchWebhookEvents]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(callbackUrl);
      setCopiedUrl(true);
      showToast('Copied Callback URL to clipboard!');
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      showToast(callbackUrl);
    }
  };

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(authToken);
      setCopiedToken(true);
      showToast('Copied Auth Token to clipboard!');
      setTimeout(() => setCopiedToken(false), 2500);
    } catch {
      showToast(authToken);
    }
  };

  const handleSimulateWebhook = async () => {
    try {
      setTestBusy(true);
      const sampleOrder = bookedOrders[0] || unbookedOrders[0];
      const payload = {
        notification_type: 'delivery_status',
        status: 'delivered',
        invoice: sampleOrder?.invoice || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        consignment_id: sampleOrder?.cid ? Number(sampleOrder.cid) : 9876543,
      };

      const res = await fetch(apiUrl('/api/steadfast/webhook/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Test webhook trigger failed');
      showToast('⚡ Simulated delivery_status webhook event received & HMAC verified!');
      await fetchWebhookEvents();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Test webhook failed');
    } finally {
      setTestBusy(false);
    }
  };

  const handleClearWebhookLogs = async () => {
    try {
      await fetch(apiUrl('/api/steadfast/webhook/events'), { method: 'DELETE' });
      setWebhookEvents([]);
      showToast('Webhook event log cleared.');
    } catch {
      showToast('Could not clear logs');
    }
  };

  const handleApplyWebhooksToOrders = async () => {
    if (!canWrite) {
      showToast('Write permission required');
      return;
    }
    const statusEvents = webhookEvents.filter(
      (e) => e.notification_type === 'delivery_status' && e.status
    );
    if (!statusEvents.length) {
      showToast('No delivery_status events found in webhook stream.');
      return;
    }

    setBusy(true);
    let updatedCount = 0;
    try {
      for (const ev of statusEvents) {
        const order = erpState.Orders.find(
          (o) =>
            (ev.invoice && o.invoice === ev.invoice) ||
            (ev.consignment_id && o.cid === String(ev.consignment_id))
        );
        if (order) {
          const nextStatus = normalizeStatus(ev.status || 'Delivered');
          if (order.status !== nextStatus) {
            const updated: OrderRecord = {
              ...order,
              status: nextStatus,
              rawStatus: ev.status,
              lastSync: new Date().toISOString(),
              revision: (order.revision || 1) + 1,
            };
            await saveErpRecord('Orders', updated);
            updatedCount++;
          }
        }
      }
      showToast(`Updated ${updatedCount} order(s) from incoming Steadfast webhook events!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to apply webhook updates');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Courier Status Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isMock
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-display">Steadfast Courier Integration</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isMock
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50'
                }`}
              >
                {isMock ? '🧪 Mock Sandbox Active' : '🟢 Live (Packzy API)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isMock
                ? 'Mock mode is enabled. Parcel booking, tracking, and balance checks generate instant simulated responses.'
                : 'Connected to live Steadfast portal.packzy.com with your API keys.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPage('Settings')}
          className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Configure API Keys in Settings</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Booked Parcels</div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {bookedOrders.length}
          </div>
          <p className="text-[11px] text-slate-500">With Steadfast CID or Tracking code</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">Pending Booking</div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {unbookedOrders.length}
          </div>
          <p className="text-[11px] text-slate-500">Confirmed orders ready to book</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">Last Courier Balance</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {erpState.Checks.find((c) => c.id === 'courier-balance')
              ? formatMoney(erpState.Checks.find((c) => c.id === 'courier-balance')?.amount || 0)
              : 'Tap to check'}
          </div>
          <p className="text-[11px] text-slate-500">Requestable cash from Steadfast</p>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <h3 className="text-sm font-semibold">Courier Actions</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={handleRefreshCourierBalance}
            className="min-h-[42px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
            <span>Check Steadfast Balance</span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const active = erpState.Orders.filter(
                (o) =>
                  (o.cid || o.tracking) &&
                  !['Delivered', 'Partial', 'Cancelled', 'Returned'].includes(o.status)
              ).slice(0, 15);
              if (!active.length) {
                setCourierOutput('No open booked orders require status sync.');
                return;
              }
              setBusy(true);
              let checked = 0;
              let failed = 0;
              for (const o of active) {
                try {
                  await handleUpdateOrderStatus(o);
                  checked++;
                } catch {
                  failed++;
                }
              }
              setBusy(false);
              setCourierOutput(`Batch sync complete: ${checked} updated, ${failed} failed.`);
            }}
            className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
          >
            Update Active Parcel Statuses
          </button>

          {unbookedOrders.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const target = unbookedOrders[0];
                if (!target) return;
                await handleBookSteadfastOrder(target);
                setCourierOutput(`Successfully booked Order #${target.invoice || target.id} with Steadfast!`);
              }}
              className="min-h-[42px] px-4 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium cursor-pointer"
            >
              ⚡ Test Book Order #{unbookedOrders[0].invoice || unbookedOrders[0].id}
            </button>
          )}
        </div>

        {courierOutput && (
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono">
            {courierOutput}
          </div>
        )}
      </div>

      {/* Steadfast Real-Time Webhook Panel */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-display">Steadfast Webhook Receiver</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50">
                  HTTP 200 Ready (&lt;5s SLA)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automatically receives real-time delivery status, tracking updates, and settlement events from Steadfast.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={testBusy}
              onClick={handleSimulateWebhook}
              className="min-h-[38px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{testBusy ? 'Sending Test…' : 'Simulate Test Webhook'}</span>
            </button>

            <button
              type="button"
              disabled={loadingEvents}
              onClick={fetchWebhookEvents}
              className="min-h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingEvents ? 'animate-spin' : ''}`} />
              <span>Refresh Log</span>
            </button>
          </div>
        </div>

        {/* Warning Alert about Email vs URL */}
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>জরুরি সতর্কতা (Important Setup Warning):</span>
          </div>
          <p className="text-[12px] leading-relaxed">
            Steadfast পোর্টালে <strong>&quot;Callback URL&quot;</strong> এর বক্সে কখনো আপনার ইমেইল অ্যাড্রেস (<code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">shoukhinhd@gmail.com</code>) দিবেন না! Steadfast সার্ভার সেখানে সরাসরি একটি HTTPS ওয়েব অ্যাড্রেস চায়। নিচের সম্পূর্ণ URL-টি কপি করে Steadfast-এর Callback URL বক্সে পেস্ট করুন:
          </p>
        </div>

        {/* Credentials Inputs to Copy */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                1. Endpoint / Callback URL
              </span>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-emerald-600 dark:text-emerald-400 break-all select-all">
              {callbackUrl}
            </div>
            <p className="text-[11px] text-slate-500">Enter this exact URL in Steadfast Courier settings.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                2. Auth Token (Optional / Used for HMAC X-Signature)
              </span>
              <button
                type="button"
                onClick={handleCopyToken}
                className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedToken ? 'Copied' : 'Copy Token'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-blue-600 dark:text-blue-400 break-all select-all">
              {authToken}
            </div>
            <p className="text-[11px] text-slate-500">Paste in Steadfast &quot;Auth token&quot; field to enable cryptographic signing.</p>
          </div>
        </div>

        {/* Webhook Events Stream & Actions */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Received Webhook Events ({webhookEvents.length})
              </h4>
            </div>

            <div className="flex items-center gap-2">
              {webhookEvents.length > 0 && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleApplyWebhooksToOrders}
                    className="min-h-[34px] px-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-500/20 text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sync Statuses to Orders</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearWebhookLogs}
                    className="min-h-[34px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 text-xs cursor-pointer"
                    title="Clear event logs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {webhookEvents.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
              <Radio className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No webhook events received yet. Tap <strong>&quot;Simulate Test Webhook&quot;</strong> above to verify your endpoint.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 border-b border-slate-200 dark:border-slate-700/60 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Received</th>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Invoice / CID</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">COD / Charge</th>
                    <th className="py-2.5 px-3">Tracking Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {webhookEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {ev.receivedAt ? new Date(ev.receivedAt).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-slate-100 dark:bg-slate-800 font-medium">
                          {ev.notification_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold whitespace-nowrap">
                        {ev.invoice || (ev.consignment_id ? `#${ev.consignment_id}` : '—')}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {ev.status ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              ['delivered'].includes(ev.status.toLowerCase())
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50'
                                : ['partial', 'partial_delivered'].includes(ev.status.toLowerCase())
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700/50'
                                : ['cancelled', 'return'].includes(ev.status.toLowerCase())
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-700/50'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50'
                            }`}
                          >
                            {ev.status}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px] whitespace-nowrap">
                        {ev.cod_amount ? `৳${ev.cod_amount}` : ''}
                        {ev.delivery_charge ? ` (Fee: ৳${ev.delivery_charge})` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                        {ev.tracking_message || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
