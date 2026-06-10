import React, { useMemo, useState } from 'react';
import { ZoomIn, ZoomOut, ExternalLink } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

interface BpmnPreviewPanelProps {
  content: string;
  title?: string;
}

const extractImageFromBpmn = (content: string): string | null => {
  if (!content) return null;
  if (content.startsWith('data:image')) return content;
  return null;
};

export const BpmnPreviewPanel: React.FC<BpmnPreviewPanelProps> = ({ content, title }) => {
  const theme = useThemeStore((state) => state.theme);
  const [zoom, setZoom] = useState(1);
  const imageSrc = useMemo(() => extractImageFromBpmn(content), [content]);

  const zoomIn = () => setZoom((value) => Math.min(2.5, value + 0.2));
  const zoomOut = () => setZoom((value) => Math.max(0.6, value - 0.2));

  return (
    <section className={`rounded-2xl border ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
      <div className={`flex items-center justify-between border-b px-4 py-3 ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
        <h3 className="text-sm font-semibold">{title || 'Preview BPMN'}</h3>
        <div className="flex items-center gap-2">
          <button onClick={zoomOut} className="rounded-lg border border-slate-300/70 p-2 text-slate-500 dark:border-slate-700"><ZoomOut size={13} /></button>
          <button onClick={zoomIn} className="rounded-lg border border-slate-300/70 p-2 text-slate-500 dark:border-slate-700"><ZoomIn size={13} /></button>
          {imageSrc && (
            <a href={imageSrc} target="_blank" rel="noreferrer" className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500">
              <span className="inline-flex items-center gap-1"><ExternalLink size={12} /> Abrir</span>
            </a>
          )}
        </div>
      </div>
      <div className="max-h-[420px] overflow-auto p-4">
        {imageSrc ? (
          <img src={imageSrc} alt="BPMN" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }} className="max-w-full rounded-xl border border-slate-200 dark:border-slate-700" />
        ) : (
          <pre className={`overflow-auto rounded-xl border p-4 text-xs ${theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-700 bg-slate-950 text-slate-200'}`}>
            {content}
          </pre>
        )}
      </div>
    </section>
  );
};
