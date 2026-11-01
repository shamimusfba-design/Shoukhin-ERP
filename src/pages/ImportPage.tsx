import React, { useState } from 'react';
import { useErp } from '../context/ErpContext';
import { batchSaveErpRecords } from '../firebase';
import { parseCsvString, previewSteadfastImport, readXlsxFile } from '../services/erpEngine';

export const ImportPage: React.FC = () => {
  const { busy, setBusy, canWrite, erpState, existingDocIds, showToast } = useErp();
  const [importPreview, setImportPreview] = useState<ReturnType<typeof previewSteadfastImport> | null>(null);

  return (
    <div className="space-y-6">
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
