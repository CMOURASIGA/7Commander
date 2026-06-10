import React from 'react';
import { Project } from '../types';
import { useThemeStore } from '../store/useThemeStore';

interface ContextPanelProps {
  project: Project;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ project }) => {
  const theme = useThemeStore((state) => state.theme);
  const stakeholders = (project.stakeholders || []).join(', ');

  return (
    <aside className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-500">Contexto rapido</p>
      <div className="mt-3 space-y-3 text-sm">
        <div>
          <p className="text-xs font-semibold text-slate-500">Objetivo</p>
          <p className={theme === 'light' ? 'text-slate-700' : 'text-slate-200'}>{project.objective}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500">Descricao</p>
          <p className={theme === 'light' ? 'text-slate-700' : 'text-slate-200'}>{project.description || '-'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500">Stakeholders</p>
          <p className={theme === 'light' ? 'text-slate-700' : 'text-slate-200'}>{stakeholders || '-'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500">Proximo passo</p>
          <p className={theme === 'light' ? 'text-slate-700' : 'text-slate-200'}>{project.nextStep || '-'}</p>
        </div>
      </div>
    </aside>
  );
};
