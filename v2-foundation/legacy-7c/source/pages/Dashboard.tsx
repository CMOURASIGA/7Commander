import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useThemeStore } from '../store/useThemeStore';
import { AlertTriangle, Briefcase, Clock3, FileStack, Plus, Zap } from 'lucide-react';
import { getHealthTone, getStatusTone, projectIsAtRisk, projectIsStale } from '../services/projectUi';

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; highlight?: boolean }> = ({ label, value, icon, highlight }) => {
  const theme = useThemeStore((state) => state.theme);
  return (
    <div className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'} ${highlight ? 'ring-1 ring-brand-500/30' : ''}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-brand-500">{icon}</span>
      </div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);
  const projects = useWorkspaceStore((state) => state.projects);
  const artifacts = useWorkspaceStore((state) => state.artifacts);
  const history = useWorkspaceStore((state) => state.history);
  const isSyncing = useWorkspaceStore((state) => state.isSyncing);
  const dataSource = useWorkspaceStore((state) => state.dataSource);
  const flags = useWorkspaceStore((state) => state.settings.flags);

  const indicators = useMemo(() => {
    const active = projects.filter((project) => project.status === 'Ativo').length;
    const riskProjects = projects.filter((project) => projectIsAtRisk(project));
    const staleProjects = projects.filter((project) => projectIsStale(project));
    const recentArtifacts = artifacts.slice(0, 5);
    return { active, riskProjects, staleProjects, recentArtifacts };
  }, [artifacts, projects]);

  if (isSyncing && projects.length === 0 && artifacts.length === 0 && history.length === 0) {
    return (
      <div className="space-y-4">
        <div className={`h-44 animate-pulse rounded-3xl border ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={`h-28 animate-pulse rounded-2xl border ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className={`rounded-3xl border p-6 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'} `}>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-500">Início</p>
        <h1 className="mt-2 text-3xl font-black">Command center operacional</h1>
        <p className={`mt-2 text-sm ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
          Visualize riscos, pendências e os próximos passos para priorizar ação no fluxo Cliente &gt; Projeto &gt; Agente &gt; Artefato.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => navigate('/clients')} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500">Criar cliente</button>
          <button onClick={() => navigate('/projects')} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">Criar projeto</button>
          <button onClick={() => navigate('/artifacts')} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">Abrir artefatos</button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard label="Projetos" value={projects.length} icon={<Briefcase size={16} />} highlight />
        <StatCard label="Projetos ativos" value={indicators.active} icon={<Clock3 size={16} />} />
        <StatCard label="Projetos em risco" value={indicators.riskProjects.length} icon={<AlertTriangle size={16} />} />
        <StatCard label="Artefatos" value={artifacts.length} icon={<FileStack size={16} />} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider">Projetos em risco</h2>
            <button onClick={() => navigate('/projects')} className="text-xs font-semibold text-brand-500 hover:underline">Ver todos</button>
          </div>
          <div className="space-y-2">
            {indicators.riskProjects.slice(0, 6).map((project) => (
              <button key={project.id} onClick={() => navigate(`/projects/${project.id}`)} className={`w-full rounded-xl border px-3 py-2 text-left ${theme === 'light' ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-700 hover:bg-slate-800'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{project.name}</p>
                    <p className="text-xs text-slate-500">{project.clientName || '-'} · {project.phase || '-'}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getHealthTone(project.health, theme)}`}>
                    {project.health || '-'}
                  </span>
                </div>
              </button>
            ))}
            {indicators.riskProjects.length === 0 && <p className="text-sm text-slate-500">Sem projetos em risco no momento.</p>}
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider">Sem atualização recente</h2>
            <span className="text-xs text-slate-500">Mais de 7 dias</span>
          </div>
          <div className="space-y-2">
            {indicators.staleProjects.slice(0, 6).map((project) => (
              <button key={project.id} onClick={() => navigate(`/projects/${project.id}`)} className={`w-full rounded-xl border px-3 py-2 text-left ${theme === 'light' ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-700 hover:bg-slate-800'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{project.name}</p>
                    <p className="text-xs text-slate-500">
                      Última atualização: {project.lastUpdate ? new Date(project.lastUpdate).toLocaleString('pt-BR') : 'Não informado'}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusTone(project.status, theme)}`}>
                    {project.status}
                  </span>
                </div>
              </button>
            ))}
            {indicators.staleProjects.length === 0 && <p className="text-sm text-slate-500">Todos os projetos foram atualizados recentemente.</p>}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider">Projetos recentes</h2>
            <button onClick={() => navigate('/projects')} className="text-xs font-semibold text-brand-500 hover:underline">Ver todos</button>
          </div>
          <div className="space-y-2">
            {projects.slice(0, 6).map((project) => (
              <button key={project.id} onClick={() => navigate(`/projects/${project.id}`)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${theme === 'light' ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-700 hover:bg-slate-800'}`}>
                <div>
                  <p className="text-sm font-semibold">{project.name}</p>
                  <p className="text-xs text-slate-500">{project.clientName} · {project.phase || '-'}</p>
                </div>
                <span className="text-xs font-semibold text-brand-500">Abrir</span>
              </button>
            ))}
            {projects.length === 0 && <p className="text-sm text-slate-500">Sem projetos cadastrados.</p>}
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider">Artefatos recentes</h2>
            <button onClick={() => navigate('/artifacts')} className="text-xs font-semibold text-brand-500 hover:underline">Biblioteca</button>
          </div>
          <div className="space-y-2">
            {indicators.recentArtifacts.map((artifact) => (
              <div key={artifact.id} className={`rounded-xl border px-3 py-2 ${theme === 'light' ? 'border-slate-200' : 'border-slate-700'}`}>
                <p className="text-sm font-semibold">{artifact.name}</p>
                <p className="text-xs text-slate-500">{artifact.scope} · v{artifact.currentVersion} · {new Date(artifact.updatedAt).toLocaleString('pt-BR')}</p>
              </div>
            ))}
            {indicators.recentArtifacts.length === 0 && <p className="text-sm text-slate-500">Sem artefatos no momento.</p>}
          </div>
        </div>
      </section>

      <section className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
        <h2 className="mb-3 text-sm font-black uppercase tracking-wider">Status do sistema</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">Fonte de dados</p>
            <p className="mt-1 font-semibold">{dataSource === 'api' ? 'API (backend)' : 'Local (browser)'}</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">Sincronização</p>
            <p className="mt-1 font-semibold">{isSyncing ? 'Sincronizando dados...' : 'Dados sincronizados'}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Recursos habilitados</p>
            <p className="mt-1 font-semibold">{Object.values(flags).filter(Boolean).length} de {Object.keys(flags).length} ativos</p>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Últimos eventos: {history.slice(0, 3).map((item) => item.summary).join(' | ') || 'Sem eventos ainda.'}
        </div>
      </section>

      <button
        onClick={() => navigate('/projects?new=1')}
        className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-brand-600/30 hover:bg-brand-500"
      >
        <Plus size={16} /> Novo projeto
      </button>

      <div className="h-10" />
      <div className="hidden"><Zap /></div>
    </div>
  );
};
