import React, { createContext, useContext, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastEntry {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface FeedbackContextValue {
  toast: (payload: Omit<ToastEntry, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const randomToastId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const iconByType: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={16} />,
  error: <XCircle size={16} />,
  info: <Info size={16} />,
  warning: <AlertTriangle size={16} />,
};

const toneByType: Record<ToastType, { light: string; dark: string }> = {
  success: {
    light: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    dark: 'border-emerald-800/60 bg-emerald-950/40 text-emerald-100',
  },
  error: {
    light: 'border-red-200 bg-red-50 text-red-900',
    dark: 'border-red-800/60 bg-red-950/40 text-red-100',
  },
  info: {
    light: 'border-blue-200 bg-blue-50 text-blue-900',
    dark: 'border-blue-800/60 bg-blue-950/40 text-blue-100',
  },
  warning: {
    light: 'border-amber-200 bg-amber-50 text-amber-900',
    dark: 'border-amber-800/60 bg-amber-950/40 text-amber-100',
  },
};

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useThemeStore((state) => state.theme);
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const closeToast = (id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  };

  const toast = (payload: Omit<ToastEntry, 'id'>) => {
    const id = randomToastId();
    const durationMs = payload.durationMs ?? 4200;
    setToasts((current) => [ { id, ...payload }, ...current ].slice(0, 5));

    window.setTimeout(() => {
      closeToast(id);
    }, durationMs);
  };

  const success = (message: string, title?: string) => toast({ type: 'success', message, title });
  const error = (message: string, title?: string) => toast({ type: 'error', message, title, durationMs: 5200 });
  const info = (message: string, title?: string) => toast({ type: 'info', message, title });
  const warning = (message: string, title?: string) => toast({ type: 'warning', message, title });

  const confirm = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      setConfirmState({
        ...options,
        resolve,
      });
    });

  const handleConfirm = (value: boolean) => {
    if (!confirmState) return;
    confirmState.resolve(value);
    setConfirmState(null);
  };

  const value = useMemo<FeedbackContextValue>(
    () => ({
      toast,
      success,
      error,
      info,
      warning,
      confirm,
    }),
    []
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((entry) => {
          const tone = toneByType[entry.type];
          return (
            <div
              key={entry.id}
              data-testid="app-toast"
              className={`pointer-events-auto rounded-xl border px-3 py-2 shadow-lg ${theme === 'light' ? tone.light : tone.dark}`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5">{iconByType[entry.type]}</span>
                <div className="min-w-0 flex-1">
                  {entry.title && <p className="text-xs font-black uppercase tracking-wider">{entry.title}</p>}
                  <p className="text-sm">{entry.message}</p>
                  {entry.actionLabel && entry.onAction && (
                    <button
                      data-testid="app-toast-action"
                      type="button"
                      onClick={() => {
                        entry.onAction?.();
                        closeToast(entry.id);
                      }}
                      className="mt-1 text-xs font-semibold underline underline-offset-2"
                    >
                      {entry.actionLabel}
                    </button>
                  )}
                </div>
                <button
                  data-testid="app-toast-close"
                  type="button"
                  onClick={() => closeToast(entry.id)}
                  className="rounded-md p-1 opacity-70 hover:opacity-100"
                  aria-label="Fechar notificacao"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {confirmState && (
        <div data-testid="confirm-dialog" className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4">
          <div className={`w-full max-w-md rounded-2xl border p-5 ${theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-slate-700 bg-slate-900 text-slate-100'}`}>
            <h2 className="text-lg font-black">{confirmState.title}</h2>
            <p className={`mt-2 text-sm ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>{confirmState.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                data-testid="confirm-dialog-cancel-button"
                type="button"
                onClick={() => handleConfirm(false)}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  theme === 'light'
                    ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {confirmState.cancelLabel || 'Cancelar'}
              </button>
              <button
                data-testid="confirm-dialog-confirm-button"
                type="button"
                onClick={() => handleConfirm(true)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold text-white ${
                  confirmState.destructive ? 'bg-red-600 hover:bg-red-500' : 'bg-brand-600 hover:bg-brand-500'
                }`}
              >
                {confirmState.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback deve ser usado dentro de FeedbackProvider.');
  }
  return context;
};
