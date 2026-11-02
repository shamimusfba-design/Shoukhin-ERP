import React, { useState, useEffect } from 'react';
import { Sparkles, X, PlusCircle, ArrowUpCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { APP_VERSION, RELEASE_HISTORY } from '../data/releaseHistory';

export const WhatsNewModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const latestRelease = RELEASE_HISTORY[0];

  useEffect(() => {
    const seenVersion = localStorage.getItem('shd_seen_version');
    if (seenVersion !== APP_VERSION) {
      setIsOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('shd_seen_version', APP_VERSION);
    setIsOpen(false);
  };

  if (!isOpen || !latestRelease) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Update Notice
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-600 text-white">
                  {latestRelease.version}
                </span>
              </div>
              <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white mt-0.5">
                What’s New in Shoukhin ERP
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {latestRelease.summary}
          </p>

          <div className="space-y-2.5 pt-2">
            {latestRelease.changes.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 flex items-start gap-2.5"
              >
                {item.type === 'added' ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 uppercase shrink-0 mt-0.5">
                    Added
                  </span>
                ) : item.type === 'improved' ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 uppercase shrink-0 mt-0.5">
                    Improved
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 uppercase shrink-0 mt-0.5">
                    Fixed
                  </span>
                )}
                <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {item.description}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-4">
          <span className="text-[11px] text-slate-400">
            Release Date: {latestRelease.releaseDate}
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            className="min-h-[38px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Got it, continue
          </button>
        </div>
      </div>
    </div>
  );
};
