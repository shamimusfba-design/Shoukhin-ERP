import React from 'react';

export const HelpPage: React.FC = () => {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
      <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
        Quick Guide — Shoukhin Home Decor Cloud ERP v2.2.0
      </h2>
      <p>
        <strong>Mobile App Installation:</strong> Tap <em>Install App</em> in the top toolbar (or <em>Add to Home Screen</em> in Safari on iPhone) to use Shoukhin ERP full-screen on your phone like a native app.
      </p>
      <p>
        <strong>Offline Syncing:</strong> All orders, inventory counts, and expenses are cached locally in IndexedDB. If your phone loses mobile data, keep working — changes sync automatically when you reconnect.
      </p>
      <p>
        <strong>Dates & Profit Recognition:</strong> Delivered sales use the verified delivery date; orders received use the creation date. Historical orders prior to September 2026 use the 15% net estimate.
      </p>
      <p>
        <strong>Stock & Combos:</strong> Physical counts replace the baseline as of the count date. Combos automatically calculate their cost and available stock from their physical component products.
      </p>
    </div>
  );
};
