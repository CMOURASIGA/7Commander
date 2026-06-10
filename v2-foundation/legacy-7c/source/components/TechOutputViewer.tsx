import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  content: string;
  theme: 'light' | 'dark';
};

export const TechOutputViewer: React.FC<Props> = ({ content, theme }) => {
  if (!content) return null;
  return (
    <div className={`border rounded-[24px] p-4 sm:p-6 shadow-xl ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-500">Arquitetura Técnica Gerada</p>
          <h4 className={`text-base sm:text-lg font-black uppercase tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>Tech Architect</h4>
        </div>
      </div>
      <div className={`rounded-2xl border p-4 markdown-content custom-scrollbar ${theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-slate-950/50 border-slate-800'}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};
