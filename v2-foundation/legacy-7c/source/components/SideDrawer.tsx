import React from 'react';
import { X } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

interface SideDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  open,
  title,
  subtitle,
  onClose,
  children,
  widthClassName = 'max-w-3xl',
}) => {
  const theme = useThemeStore((state) => state.theme);

  if (!open) return null;

  return (
    <div data-testid="side-drawer" className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/45" onClick={onClose} />
      <aside
        className={`absolute right-0 top-0 h-full w-full overflow-y-auto border-l p-4 md:p-6 ${widthClassName} ${
          theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-slate-700 bg-slate-900 text-slate-100'
        }`}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-500">Formulario</p>
            <h2 className="mt-1 text-xl font-black">{title}</h2>
            {subtitle && <p className={`mt-1 text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg border p-2 ${
              theme === 'light' ? 'border-slate-300 text-slate-600 hover:bg-slate-100' : 'border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
};
