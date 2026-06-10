import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, FolderOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { Project, ProjectHealth } from '../types';
import { ProjectForm } from '../components/ProjectForm';
import { SideDrawer } from '../components/SideDrawer';
import { useFeedback } from '../components/FeedbackProvider';
import { getHealthTone, getStatusTone } from '../services/projectUi';

const splitStakeholders = (raw: string) =>
  raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

export const Projects: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);
  const user = useAuthStore((state) => state.user);
  const feedback = useFeedback();
  const clients = useWorkspaceStore((state) => state.clients);
  const projects = useWorkspaceStore((state) => state.projects);
  const isSyncing = useWorkspaceStore((state) => state.isSyncing);
  const createProjectAction = useWorkspaceStore((state) => state.createProjectAction);
  const updateProjectAction = useWorkspaceStore((state) => state.updateProjectAction);
  const deleteProjectAction = useWorkspaceStore((state) => state.deleteProjectAction);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [viewing, setViewing] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === '1') {
      setEditing(null);
      setOpenForm(true);
      navigate('/projects', { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const filteredProjects = useMemo(() => {
    const value = debouncedSearch.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(value) ||
        project.objective.toLowerCase().includes(value) ||
        (project.clientName || '').toLowerCase().includes(value)
    );
  }, [projects, debouncedSearch]);

  const submit = async (values: {
    name: string;
    objective: string;
    description: string;
    clientId: string;
    responsible: string;
    methodology: Project['methodology'];
    status: Project['status'];
    startDate: string;
    endDate?: string;
    stakeholders: string;
    nextStep: string;
    phase: string;
    health: ProjectHealth;
  }) => {
    const actor = user?.email || 'local.admin@7c.local';
    const payload = {
      ...values,
      stakeholders: splitStakeholders(values.stakeholders),
    };

    try {
      if (editing) {
        await updateProjectAction(editing.id, payload, actor);
        feedback.success('Projeto atualizado com sucesso.');
        setEditing(null);
      } else {
        await createProjectAction(payload, actor);
        feedback.success('Projeto criado com sucesso.');
      }
      setOpenForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o projeto.';
      feedback.error(message);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    const actor = user?.email || 'local.admin@7c.local';
    const approved = await feedback.confirm({
      title: 'Excluir projeto',
      message: `Deseja excluir o projeto "${project.name}"?`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      destructive: true,
    });
    if (!approved) return;

    setDeletingId(project.id);
    try {
      const removed = await deleteProjectAction(project.id, actor);
      if (!removed) {
        feedback.error('Não foi possível excluir o projeto.');
        return;
      }

      feedback.success('Projeto excluído com sucesso.');
      if (viewing?.id === project.id) {
        setViewing(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível excluir o projeto.';
      feedback.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-500">Projetos</p>
          <h1 className="text-3xl font-black">Catálogo operacional</h1>
        </div>
        <button
          data-testid="projects-new-button"
          onClick={() => {
            setEditing(null);
            setOpenForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500"
        >
          <Plus size={15} /> Novo projeto
        </button>
      </header>

      <SideDrawer
        open={openForm}
        title={editing ? 'Editar projeto' : 'Novo projeto'}
        subtitle="Use os campos abaixo para manter o cadastro do projeto sem perder o contexto da listagem."
        onClose={() => {
          setOpenForm(false);
          setEditing(null);
        }}
      >
        <ProjectForm
          presentation="drawer"
          clients={clients}
          initialProject={editing}
          onCancel={() => {
            setOpenForm(false);
            setEditing(null);
          }}
          onSubmit={submit}
        />
      </SideDrawer>

      <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
        <Search size={15} className="text-slate-400" />
        <input
          data-testid="projects-search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, objetivo ou cliente..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {isSyncing && projects.length === 0 ? (
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`h-56 animate-pulse rounded-2xl border ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}
            />
          ))}
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filteredProjects.map((project) => (
            <article data-testid="project-card" key={project.id} className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black">{project.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{project.objective}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    title="Visualizar projeto"
                    aria-label="Visualizar projeto"
                    data-testid="project-view-button"
                    onClick={() => setViewing(project)}
                    className="rounded-lg border border-slate-300/70 p-2 text-slate-500 hover:text-brand-500 dark:border-slate-700"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    title="Editar projeto"
                    aria-label="Editar projeto"
                    data-testid="project-edit-button"
                    onClick={() => {
                      setEditing(project);
                      setOpenForm(true);
                    }}
                    className="rounded-lg border border-slate-300/70 p-2 text-slate-500 hover:text-brand-500 dark:border-slate-700"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    title="Excluir projeto"
                    aria-label="Excluir projeto"
                    data-testid="project-delete-button"
                    disabled={deletingId === project.id}
                    onClick={() => handleDeleteProject(project)}
                    className="rounded-lg border border-red-200/70 p-2 text-red-500 hover:text-red-600 disabled:opacity-50 dark:border-red-900/40"
                  >
                    <Trash2 size={14} />
                  </button>
                  <Link
                    to={`/projects/${project.id}`}
                    title="Abrir workspace"
                    aria-label="Abrir workspace"
                    data-testid="project-open-workspace-button"
                    className="rounded-lg bg-brand-600 p-2 text-white hover:bg-brand-500"
                  >
                    <FolderOpen size={14} />
                  </Link>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-200/80 p-2 dark:border-slate-700">
                  <p className="font-semibold text-slate-500">Cliente</p>
                  <p>{project.clientName || '-'}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 p-2 dark:border-slate-700">
                  <p className="font-semibold text-slate-500">Status</p>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusTone(project.status, theme)}`}>
                    {project.status}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200/80 p-2 dark:border-slate-700">
                  <p className="font-semibold text-slate-500">Fase</p>
                  <p>{project.phase || '-'}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 p-2 dark:border-slate-700">
                  <p className="font-semibold text-slate-500">Saúde</p>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getHealthTone(project.health, theme)}`}>
                    {project.health || '-'}
                  </span>
                </div>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                <p>Responsável: {project.responsible || '-'}</p>
                <p>Atualizado: {project.lastUpdate ? new Date(project.lastUpdate).toLocaleString('pt-BR') : '-'}</p>
              </div>
            </article>
          ))}
        </section>
      )}

      {filteredProjects.length === 0 && (
        <div className={`rounded-2xl border p-6 text-center text-sm ${theme === 'light' ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-800 bg-slate-900 text-slate-300'}`}>
          Nenhum projeto encontrado.
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 p-4">
          <div className={`w-full max-w-2xl rounded-2xl border p-5 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-700 bg-slate-900'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-500">Projeto</p>
                <h3 className="mt-1 text-xl font-black">{viewing.name}</h3>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="rounded-lg border border-slate-300/70 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-200"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Objetivo</p>
                <p className={theme === 'light' ? 'text-slate-800' : 'text-slate-100'}>{viewing.objective || '-'}</p>
              </div>
              <div className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Cliente</p>
                <p className={theme === 'light' ? 'text-slate-800' : 'text-slate-100'}>{viewing.clientName || '-'}</p>
              </div>
              <div className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Descrição</p>
                <p className={theme === 'light' ? 'text-slate-800' : 'text-slate-100'}>{viewing.description || '-'}</p>
              </div>
              <div className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Próximo passo</p>
                <p className={theme === 'light' ? 'text-slate-800' : 'text-slate-100'}>{viewing.nextStep || '-'}</p>
              </div>
              <div className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Responsável</p>
                <p className={theme === 'light' ? 'text-slate-800' : 'text-slate-100'}>{viewing.responsible || '-'}</p>
              </div>
              <div className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Metodologia</p>
                <p className={theme === 'light' ? 'text-slate-800' : 'text-slate-100'}>{viewing.methodology || '-'}</p>
              </div>
              <div className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Status</p>
                <p className={theme === 'light' ? 'text-slate-800' : 'text-slate-100'}>{viewing.status || '-'}</p>
              </div>
              <div className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Saúde</p>
                <p className={theme === 'light' ? 'text-slate-800' : 'text-slate-100'}>{viewing.health || '-'}</p>
              </div>
              <div className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Fase</p>
                <p className={theme === 'light' ? 'text-slate-800' : 'text-slate-100'}>{viewing.phase || '-'}</p>
              </div>
              <div className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Data de início</p>
                <p className={theme === 'light' ? 'text-slate-800' : 'text-slate-100'}>{viewing.startDate || '-'}</p>
              </div>
              <div className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Data final prevista</p>
                <p className={theme === 'light' ? 'text-slate-800' : 'text-slate-100'}>{viewing.endDate || '-'}</p>
              </div>
              <div className={`rounded-xl border p-3 md:col-span-2 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Stakeholders</p>
                <p className={theme === 'light' ? 'text-slate-800' : 'text-slate-100'}>
                  {viewing.stakeholders && viewing.stakeholders.length > 0 ? viewing.stakeholders.join(', ') : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
