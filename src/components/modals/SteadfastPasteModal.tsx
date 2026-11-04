import React, { useState } from 'react';
import { X, ClipboardPaste, Check, AlertCircle, RefreshCw, Truck } from 'lucide-react';
import { OrderRecord, OrderStatus } from '../../types/erp';
import { normalizeStatus, districtHint } from '../../services/erpEngine';

interface SteadfastPasteModalProps {
  onClose: () => void;
  onImport: (orders: OrderRecord[]) => Promise<void>;
}

export const SteadfastPasteModal: React.FC<SteadfastPasteModalProps> = ({ onClose, onImport }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [parsedOrders, setParsedOrders] = useState<OrderRecord[]>([]);
  const [parseError, setParseError] = useState('');

  const handleParse = () => {
    setParseError('');
    if (!text.trim()) {
      setParseError('দয়া করে Steadfast পোর্টাল থেকে কপি করা টেবিল টেক্সট এখানে পেস্ট করুন।');
      return;
    }

    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const results: OrderRecord[] = [];

    for (const line of lines) {
      // Tab-separated table row from Chrome copy
      if (line.includes('\t')) {
        const parts = line.split('\t').map((p) => p.trim());
        const cidCandidate = parts.find((p) => /^\d{8,11}$/.test(p));
        if (cidCandidate) {
          const cidIdx = parts.indexOf(cidCandidate);
          const invoice = parts[cidIdx + 1] && parts[cidIdx + 1] !== '—' ? parts[cidIdx + 1] : cidCandidate;
          const name = parts[cidIdx + 2] && parts[cidIdx + 2] !== '—' ? parts[cidIdx + 2] : 'Steadfast Customer';
          const address = parts[cidIdx + 3] || 'Bangladesh';
          const rawDate = parts[cidIdx + 4] || '';
          const codStr = (parts[cidIdx + 5] || '').replace(/[^\d.]/g, '');
          const chargeStr = (parts[cidIdx + 6] || '').replace(/[^\d.]/g, '');
          const rawStatus = parts[cidIdx + 7] || 'Pending';

          let isoDate = new Date().toISOString().slice(0, 10);
          try {
            const parsedD = new Date(rawDate);
            if (!isNaN(parsedD.getTime())) {
              isoDate = parsedD.toISOString().slice(0, 10);
            }
          } catch {}

          const cod = Number(codStr) || 0;
          const charge = Number(chargeStr) || 0;
          const normStatus = normalizeStatus(rawStatus);

          results.push({
            id: 'SF-' + cidCandidate,
            cid: cidCandidate,
            invoice,
            name,
            phone: '01700000000',
            address,
            district: districtHint(address) || 'Dhaka',
            date: isoDate,
            total: cod,
            cod,
            shippingCharge: charge,
            codCharge: 0,
            returnCharge: 0,
            status: normStatus,
            rawStatus,
            source: 'Steadfast Portal Ingest',
            paymentStatus: normStatus === 'Delivered' ? 'Paid' : 'Unpaid',
            note: `Steadfast Consignment #${cidCandidate}`,
            createdAt: new Date().toISOString(),
            stockReturns: {},
            stockReserved: false,
            dispatched: true,
            lines: [],
            revision: 1,
            imported: true,
            amountVerified: true,
            itemsVerified: true,
          });
          continue;
        }
      }

      // Regex fallback for space-separated or messy copy
      const cidMatch = line.match(/\b(31\d{7}|[0-9]{8,11})\b/);
      if (cidMatch) {
        const cid = cidMatch[1];
        const moneys = [...line.matchAll(/[৳Tk\s]?([0-9,]{2,7})\b/g)]
          .map((m) => Number(m[1].replace(/,/g, '')))
          .filter((n) => n > 20 && n !== Number(cid));

        const cod = moneys[0] || 0;
        const charge = moneys[1] || 0;

        let status: OrderStatus = 'Pending';
        if (/delivered/i.test(line)) status = 'Delivered';
        else if (/partial/i.test(line)) status = 'Partial';
        else if (/cancel/i.test(line)) status = 'Cancelled';

        results.push({
          id: 'SF-' + cid,
          cid,
          invoice: cid,
          name: 'Steadfast Customer (' + cid + ')',
          phone: '01700000000',
          address: 'Bangladesh',
          district: 'Dhaka',
          date: new Date().toISOString().slice(0, 10),
          total: cod,
          cod,
          shippingCharge: charge,
          codCharge: 0,
          returnCharge: 0,
          status,
          rawStatus: status,
          source: 'Steadfast Portal Ingest',
          paymentStatus: status === 'Delivered' ? 'Paid' : 'Unpaid',
          note: `Steadfast Consignment #${cid}`,
          createdAt: new Date().toISOString(),
          stockReturns: {},
          stockReserved: false,
          dispatched: true,
          lines: [],
          revision: 1,
          imported: true,
          amountVerified: true,
          itemsVerified: true,
        });
      }
    }

    if (!results.length) {
      setParseError('কোনো ভ্যালিড Consignment তথ্য পাওয়া যায়নি। Steadfast টেবিলের লাইনগুলো সম্পূর্ণ কপি করে পেস্ট করুন।');
      return;
    }

    setParsedOrders(results);
  };

  const handleConfirmImport = async () => {
    if (!parsedOrders.length) return;
    setBusy(true);
    try {
      await onImport(parsedOrders);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Steadfast পোর্টাল থেকে সরাসরি বাল্ক পেস্ট করুন
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                কোনো এক্সেল ডাউনলোড বা আপলোড ছাড়া সরাসরি টেবিল কপি করে পেস্ট করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!parsedOrders.length ? (
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-semibold">সহজ নির্দেশনা:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
                <li>Steadfast পোর্টালে আপনার Consignments পেজে যান (All, Pending বা Delivered)।</li>
                <li>মাউস দিয়ে টেবিলের সারিগুলো সিলেক্ট করে কপি করুন (অথবা <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded font-mono">Ctrl + C</kbd> চাপুন)।</li>
                <li>নিচের বক্সে পেস্ট (<kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded font-mono">Ctrl + V</kbd>) করুন এবং "টেবিল প্রসেস করুন" বাটনে চাপুন।</li>
              </ol>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Steadfast টেবিলের কপি করা লেখা এখানে পেস্ট করুন..."
              className="flex-1 w-full min-h-[180px] p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {parseError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleParse}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>টেবিল প্রসেস করুন</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <span className="font-semibold">
                ✓ মোট {parsedOrders.length} টি নতুন অর্ডার সনাক্ত হয়েছে!
              </span>
              <button
                type="button"
                onClick={() => setParsedOrders([])}
                className="text-emerald-600 dark:text-emerald-400 underline text-[11px] cursor-pointer"
              >
                পুনরায় পেস্ট করুন
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {parsedOrders.slice(0, 30).map((o) => (
                <div key={o.id} className="p-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{o.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      #{o.cid} · {o.date} · {o.district}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      ৳{o.total?.toLocaleString() || 0}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
              {parsedOrders.length > 30 && (
                <div className="p-2 text-center text-slate-400 text-[11px]">
                  + আরও {parsedOrders.length - 30} টি অর্ডার অন্তর্ভুক্ত আছে
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setParsedOrders([])}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleConfirmImport}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
                <span>{busy ? 'ইম্পোর্ট হচ্ছে...' : `সকল ${parsedOrders.length} টি অর্ডার যুক্ত করুন`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
