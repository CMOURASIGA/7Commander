import { Project, ProjectHealth, ProjectStatus } from '../types';

type Theme = 'light' | 'dark';

export const getHealthTone = (health: ProjectHealth | undefined, theme: Theme) => {
  if (health === 'Critico') {
    return theme === 'light'
      ? 'border-red-200 bg-red-50 text-red-900'
      : 'border-red-900/70 bg-red-950/40 text-red-100';
  }

  if (health === 'Atencao') {
    return theme === 'light'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-amber-900/70 bg-amber-950/40 text-amber-100';
  }

  return theme === 'light'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : 'border-emerald-900/70 bg-emerald-950/40 text-emerald-100';
};

export const getStatusTone = (status: ProjectStatus | undefined, theme: Theme) => {
  if (status === 'Em Risco') {
    return theme === 'light'
      ? 'border-red-200 bg-red-50 text-red-900'
      : 'border-red-900/70 bg-red-950/40 text-red-100';
  }

  if (status === 'Suspenso') {
    return theme === 'light'
      ? 'border-slate-300 bg-slate-100 text-slate-800'
      : 'border-slate-700 bg-slate-800 text-slate-100';
  }

  if (status === 'Planejamento') {
    return theme === 'light'
      ? 'border-blue-200 bg-blue-50 text-blue-900'
      : 'border-blue-900/70 bg-blue-950/40 text-blue-100';
  }

  if (status === 'Concluido') {
    return theme === 'light'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-emerald-900/70 bg-emerald-950/40 text-emerald-100';
  }

  return theme === 'light'
    ? 'border-brand-200 bg-brand-50 text-brand-700'
    : 'border-brand-900/70 bg-brand-950/30 text-brand-100';
};

export const projectIsAtRisk = (project: Project) => project.status === 'Em Risco' || project.health === 'Critico';

export const projectIsStale = (project: Project, staleDays = 7) => {
  if (!project.lastUpdate) return true;
  const ageMs = Date.now() - new Date(project.lastUpdate).getTime();
  return ageMs > staleDays * 24 * 60 * 60 * 1000;
};
