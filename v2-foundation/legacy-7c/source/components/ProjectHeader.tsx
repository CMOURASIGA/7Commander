import React from 'react';
import { Project } from '../types';
import { Calendar, ExternalLink, Share2, Edit3, RefreshCcw } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { getHealthTone, getStatusTone } from '../services/projectUi';
import { normalizeDriveFolderUrl } from '../services/driveUrl';

interface ProjectHeaderProps {
  project: Project;
  onEdit: () => void;
  onShare: () => void;
}

const InfoBadge: React.FC<{ label: string; value?: string; theme: 'light' | 'dark'; tone?: string }> = ({ label, value, theme, tone }) => (
  <div
    data-testid="project-info-badge"
    className={`rounded-xl border px-3 py-2 text-xs ${
      tone ||
      (theme === 'light'
        ? 'border-brand-200/80 bg-brand-50/70'
        : 'border-slate-700 bg-slate-800/60')
    }`}
  >
    <p data-testid="project-info-badge-label" className={`text-[10px] font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>{label}</p>
    <p data-testid="project-info-badge-value" className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>{value || '-'}</p>
  </div>
);

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ project, onEdit, onShare }) => {
  const theme = useThemeStore((state) => state.theme);
  const driveFolderUrl = normalizeDriveFolderUrl(project.folderRef?.projectFolderUrl);

  return (
    <header className={`rounded-3xl border p-5 md:p-6 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-500">Workspace do projeto</p>
          <h1 className={`mt-1 text-2xl font-black md:text-3xl ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>{project.name}</h1>
          <p className={`mt-2 max-w-3xl text-sm ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>{project.objective}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onEdit}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
              theme === 'light' ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100' : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Edit3 size={14} />
            Editar projeto
          </button>
          <button
            onClick={onShare}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
              theme === 'light' ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100' : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Share2 size={14} />
            Compartilhar
          </button>
          {driveFolderUrl && (
            <a
              href={driveFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500"
            >
              <ExternalLink size={14} />
              Abrir pasta Drive
            </a>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <InfoBadge label="Cliente" value={project.clientName} theme={theme} />
        <InfoBadge label="Status" value={project.status} theme={theme} tone={getStatusTone(project.status, theme)} />
        <InfoBadge label="Fase" value={project.phase} theme={theme} />
        <InfoBadge label="Saude" value={project.health} theme={theme} tone={getHealthTone(project.health, theme)} />
        <InfoBadge label="Responsavel" value={project.responsible} theme={theme} />
        <InfoBadge label="Metodo" value={project.methodology} theme={theme} />
        <InfoBadge label="Proximo passo" value={project.nextStep} theme={theme} />
        <div
          data-testid="project-info-badge"
          className={`rounded-xl border px-3 py-2 text-xs ${
            theme === 'light'
              ? 'border-brand-200/80 bg-brand-50/70'
              : 'border-slate-700 bg-slate-800/60'
          }`}
        >
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>Ultima atualizacao</p>
          <p data-testid="project-info-badge-value" className={`flex items-center gap-1 font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
            <Calendar size={12} />
            {project.lastUpdate ? new Date(project.lastUpdate).toLocaleString('pt-BR') : '-'}
          </p>
          <p className={`mt-1 flex items-center gap-1 text-[10px] ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
            <RefreshCcw size={11} />
            atualizado automaticamente
          </p>
        </div>
      </div>
    </header>
  );
};
