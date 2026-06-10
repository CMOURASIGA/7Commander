import React from 'react';

interface SuggestionCardProps {
  title: string;
  reason: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  title,
  reason,
  primaryLabel,
  secondaryLabel = 'Explorar módulos',
  onPrimary,
  onSecondary,
}) => {
  return (
    <div className="border rounded-2xl p-4 sm:p-6 bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-lg flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-500">Recomendação</p>
          <h4 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">→ {title}</h4>
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">{reason}</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onPrimary}
          className="bg-brand-600 text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-md shadow-brand-600/30"
        >
          {primaryLabel}
        </button>
        {onSecondary && (
          <button
            onClick={onSecondary}
            className="border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
};
