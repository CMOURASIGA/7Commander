import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Search } from 'lucide-react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useThemeStore } from '../store/useThemeStore';

export const ArtifactsPage: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);
  const projects = useWorkspaceStore((state) => state.projects);
  const artifacts = useWorkspaceStore((state) => state.artifacts);
  const [search, setSearch] = useState('');

  const cards = useMemo(() => {
    const value = search.toLowerCase();

    return projects
      .filter((project) =>
        project.name.toLowerCase().includes(value) ||
        (project.clientName || '').toLowerCase().includes(value)
      )
      .map((project) => {
        const projectArtifacts = artifacts.filter((artifact) => artifact.projectId === project.id);
        const latest = projectArtifacts
          .slice()
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

        return {
          project,
          count: projectArtifacts.length,
          latestUpdate: latest?.updatedAt,
        };
      });
  }, [artifacts, projects, search]);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-500">Artefatos</p>
        <h1 className="text-3xl font-black">Biblioteca por projeto</h1>
        <p className={`mt-2 text-sm ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
          Selecione um projeto para visualizar, editar e versionar os artefatos dele.
        </p>
      </header>

      <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
        <Search size={15} className="text-slate-400" />
        <input
          data-testid="artifacts-project-search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar projeto ou cliente..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {cards.map(({ project, count, latestUpdate }) => (
          <article data-testid="artifacts-project-card" key={project.id} className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black">{project.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{project.clientName || '-'}</p>
              </div>
              <Link
                to={`/artifacts/project/${project.id}`}
                title="Abrir artefatos do projeto"
                aria-label="Abrir artefatos do projeto"
                data-testid="artifacts-open-project-button"
                className="rounded-lg bg-brand-600 p-2 text-white hover:bg-brand-500"
              >
                <FolderOpen size={14} />
              </Link>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-slate-200/80 p-2 dark:border-slate-700">
                <p className="font-semibold text-slate-500">Artefatos</p>
                <p>{count}</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 p-2 dark:border-slate-700">
                <p className="font-semibold text-slate-500">Ultima atualizacao</p>
                <p>{latestUpdate ? new Date(latestUpdate).toLocaleString('pt-BR') : '-'}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      {cards.length === 0 && (
        <div className={`rounded-2xl border p-6 text-center text-sm ${theme === 'light' ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-800 bg-slate-900 text-slate-300'}`}>
          Nenhum projeto encontrado.
        </div>
      )}
    </div>
  );
};
