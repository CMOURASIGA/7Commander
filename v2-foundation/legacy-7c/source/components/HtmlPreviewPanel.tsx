import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

interface HtmlPreviewPanelProps {
  htmlContent: string;
  title?: string;
}

export const HtmlPreviewPanel: React.FC<HtmlPreviewPanelProps> = ({ htmlContent, title }) => {
  const theme = useThemeStore((state) => state.theme);

  const openInNewTab = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className={`rounded-2xl border ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
      <div className={`flex items-center justify-between border-b px-4 py-3 ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
        <h3 className="text-sm font-semibold">{title || 'Preview HTML'}</h3>
        <button onClick={openInNewTab} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500">
          <ExternalLink size={13} /> Abrir em nova aba
        </button>
      </div>
      <iframe title="html-preview" srcDoc={htmlContent} className="h-[420px] w-full rounded-b-2xl" sandbox="allow-same-origin allow-scripts" />
    </section>
  );
};
