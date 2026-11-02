import React, { useState } from 'react';
import { useErp } from '../context/ErpContext';
import { batchSaveErpRecords } from '../firebase';
import { parseCsvString, previewSteadfastImport, readXlsxFile } from '../services/erpEngine';
import { Boxes, ShoppingBag, Sparkles, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';

export const ImportPage: React.FC = () => {
  const { busy, setBusy, canWrite, erpState, existingDocIds, showToast, handleLoadRealData, handleClearDemoData } = useErp();
  const [importPreview, setImportPreview] = useState<ReturnType<typeof previewSteadfastImport> | null>(null);

  return (
    <div className="space-y-6">
      {/* Real Business Data Loader Banner */}
      <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
                  শৌখিন হোম ডেকোর রিয়েল ডেটাবেজ (Real Business Data)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider">
                  Verified Sheet Export
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                আপনার দেওয়া <code className="font-mono font-bold">App.xlsx</code> ফাইল থেকে ১১১টি আসল প্রোডাক্ট (কেনা দাম ও বেচা দাম সহ) এবং ১,৭৩১টি Steadfast কাস্টমার অর্ডার সরাসরি এক্সট্রাক্ট করা হয়েছে।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || !canWrite}
              onClick={handleLoadRealData}
              className="min-h-[42px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
              <span>Load All 111 Real Products & 1,731 Orders</span>
            </button>

            <button
              type="button"
              disabled={busy || !canWrite}
              onClick={handleClearDemoData}
              className="min-h-[42px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Reset / Clear Demo Data</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
            <Boxes className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="text-[11px] text-slate-500">Real Products</div>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-white">111 Items</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-[11px] text-slate-500">Steadfast Orders</div>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-white">1,731 Orders</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-amber-600" />
            <div>
              <div className="text-[11px] text-slate-500">Pricing Data</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">Cost & Sales Set</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <div>
              <div className="text-[11px] text-slate-500">Stock & Combos</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">Active & Linked</div>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <h2 className="text-base font-bold font-display">Import / Update Steadfast Data (CSV or XLSX)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Choose your Steadfast courier export file (`.csv` or `.xlsx`). Existing orders are matched by Consignment ID / Tracking Code and updated in place while preserving your manual product/combo assignments, costs, and return verifications.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={async (ev) => {
              const file = ev.target.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                const rows = file.name.toLowerCase().endsWith('.xlsx')
                  ? await readXlsxFile(file)
                  : parseCsvString(await file.text());
                const preview = previewSteadfastImport(rows, erpState.Orders);
                setImportPreview(preview);
                showToast(`Preview ready: ${preview.newCount} new, ${preview.updatedCount} updated.`);
              } catch (err) {
                showToast(err instanceof Error ? err.message : String(err));
              } finally {
                setBusy(false);
              }
            }}
            className="text-xs file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-slate-900 file:text-white dark:file:bg-emerald-600 cursor-pointer"
          />
        </div>

        {importPreview && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-500">New Orders</div>
                <div className="text-lg font-bold text-emerald-600">{importPreview.newCount}</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-500">Updated</div>
                <div className="text-lg font-bold text-blue-600">{importPreview.updatedCount}</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-500">Unchanged</div>
                <div className="text-lg font-bold">{importPreview.unchangedCount}</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-500">Warnings / Errors</div>
                <div className="text-lg font-bold text-amber-600">
                  {importPreview.errors.length + importPreview.problems.length}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={
                busy ||
                !canWrite ||
                importPreview.errors.length > 0 ||
                importPreview.problems.length > 0 ||
                importPreview.mergedOrders.length === 0
              }
              onClick={async () => {
                setBusy(true);
                try {
                  await batchSaveErpRecords('Orders', importPreview.mergedOrders, existingDocIds);
                  showToast(
                    `Import committed: ${importPreview.newCount} added, ${importPreview.updatedCount} updated.`
                  );
                  setImportPreview(null);
                } catch (err) {
                  showToast(err instanceof Error ? err.message : String(err));
                } finally {
                  setBusy(false);
                }
              }}
              className="min-h-[44px] px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              Confirm & Merge {importPreview.mergedOrders.length} Orders into Firebase
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
