import React from 'react';
import { useErp, NavPage } from '../context/ErpContext';

export const SuggestionsPage: React.FC = () => {
  const { suggestions, setPage } = useErp();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-base font-bold font-display">Deterministic Business Intelligence</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Automated rules analyzing your orders, margins, stock velocity, and courier reconciliation.
        </p>
      </div>

      {suggestions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
          All operational checks passed! No priority issues detected in the selected period.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {suggestions.map((s) => (
            <article
              key={s.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2"
            >
              <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {s.priority} Priority · {s.page}
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{s.title}</h3>
              <p className="text-xs text-slate-700 dark:text-slate-300">{s.what}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.why}</p>
              <p className="text-xs font-medium text-slate-900 dark:text-slate-200 pt-1">
                Next: {s.next}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setPage(s.page as NavPage)}
                  className="min-h-[36px] px-3.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium cursor-pointer"
                >
                  Go to {s.page}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
