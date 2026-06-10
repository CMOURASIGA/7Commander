import React, { useMemo, useState } from 'react';
import { Artifact } from '../types';
import { Eye, ExternalLink, RefreshCcw, PlusCircle, Pencil, Trash2, Search } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

interface ArtifactListProps {
  artifacts: Artifact[];
  onSelect: (artifact: Artifact) => void;
  onOpenLink?: (artifact: Artifact) => void;
  onUpdateArtifact?: (artifact: Artifact) => void;
  onNewVersion?: (artifact: Artifact) => void;
  onEditArtifact?: (artifact: Artifact) => void;
  onDeleteArtifact?: (artifact: Artifact) => void;
  selectedArtifactId?: string;
}

export const ArtifactList: React.FC<ArtifactListProps> = ({
  artifacts,
  onSelect,
  onOpenLink,
  onUpdateArtifact,
  onNewVersion,
  onEditArtifact,
  onDeleteArtifact,
  selectedArtifactId,
}) => {
  const theme = useThemeStore((state) => state.theme);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'name' | 'version'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filteredArtifacts = useMemo(() => {
    const value = search.trim().toLowerCase();
    const filtered = artifacts.filter((artifact) => {
      if (!value) return true;
      return (
        artifact.name.toLowerCase().includes(value) ||
        artifact.type.toLowerCase().includes(value) ||
        artifact.scope.toLowerCase().includes(value) ||
        (artifact.agentId || '').toLowerCase().includes(value)
      );
    });

    return filtered.sort((a, b) => {
      const factor = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * factor;
      }
      if (sortBy === 'version') {
        return (a.currentVersion - b.currentVersion) * factor;
      }
      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * factor;
    });
  }, [artifacts, search, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredArtifacts.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedArtifacts = filteredArtifacts.slice(startIndex, startIndex + pageSize);

  if (artifacts.length === 0) {
    return (
      <div className={`rounded-2xl border p-6 text-sm ${theme === 'light' ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-800 bg-slate-900 text-slate-300'}`}>
        Nenhum artefato encontrado para o filtro atual.
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-900/70'}`}>
        <div className={`flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border px-3 py-2 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-700 bg-slate-950'}`}>
          <Search size={14} className="text-slate-400" />
          <input
            data-testid="artifact-table-search-input"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nome, tipo, escopo ou agente..."
            className="w-full bg-transparent text-xs outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as 'updatedAt' | 'name' | 'version');
              setPage(1);
            }}
            className={`rounded-xl border px-2 py-1.5 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-700 bg-slate-900'}`}
          >
            <option value="updatedAt">Ordenar: atualizacao</option>
            <option value="name">Ordenar: nome</option>
            <option value="version">Ordenar: versao</option>
          </select>
          <select
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value as 'asc' | 'desc');
              setPage(1);
            }}
            className={`rounded-xl border px-2 py-1.5 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-700 bg-slate-900'}`}
          >
            <option value="desc">Descendente</option>
            <option value="asc">Ascendente</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className={theme === 'light' ? 'bg-slate-50' : 'bg-slate-800/60'}>
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Nome</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Tipo</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Agente</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Versao</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Atualizacao</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {pagedArtifacts.map((artifact) => {
              const selected = selectedArtifactId === artifact.id;
              return (
                <tr
                  data-testid="artifact-row"
                  key={artifact.id}
                  className={`border-t ${
                    theme === 'light' ? 'border-slate-100 hover:bg-slate-50' : 'border-slate-800 hover:bg-slate-800/60'
                  } ${selected ? (theme === 'light' ? 'bg-brand-50/60' : 'bg-brand-900/20') : ''}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold">{artifact.name}</p>
                    <p className="text-xs text-slate-500">{artifact.scope} · {artifact.format}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold">{artifact.type}</td>
                  <td className="px-4 py-3 text-xs">{artifact.agentId || '-'}</td>
                  <td className="px-4 py-3 text-xs">v{artifact.currentVersion}</td>
                  <td className="px-4 py-3 text-xs">{new Date(artifact.updatedAt).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button data-testid="artifact-view-button" onClick={() => onSelect(artifact)} className="rounded-lg border border-slate-300/70 p-2 text-slate-500 hover:text-brand-500 dark:border-slate-700">
                        <Eye size={14} />
                      </button>
                      {onEditArtifact && (
                        <button data-testid="artifact-edit-button" onClick={() => onEditArtifact(artifact)} className="rounded-lg border border-slate-300/70 p-2 text-slate-500 hover:text-brand-500 dark:border-slate-700" title="Editar artefato" aria-label="Editar artefato">
                          <Pencil size={14} />
                        </button>
                      )}
                      {onUpdateArtifact && (
                        <button data-testid="artifact-update-button" onClick={() => onUpdateArtifact(artifact)} className="rounded-lg border border-slate-300/70 p-2 text-slate-500 hover:text-brand-500 dark:border-slate-700" title="Atualizar versao atual" aria-label="Atualizar versao atual">
                          <RefreshCcw size={14} />
                        </button>
                      )}
                      {onNewVersion && (
                        <button data-testid="artifact-new-version-button" onClick={() => onNewVersion(artifact)} className="rounded-lg border border-slate-300/70 p-2 text-slate-500 hover:text-brand-500 dark:border-slate-700" title="Criar nova versao" aria-label="Criar nova versao">
                          <PlusCircle size={14} />
                        </button>
                      )}
                      {onOpenLink && (
                        <button data-testid="artifact-open-link-button" onClick={() => onOpenLink(artifact)} className="rounded-lg border border-slate-300/70 p-2 text-slate-500 hover:text-brand-500 dark:border-slate-700" title="Abrir link externo" aria-label="Abrir link externo">
                          <ExternalLink size={14} />
                        </button>
                      )}
                      {onDeleteArtifact && (
                        <button data-testid="artifact-delete-button" onClick={() => onDeleteArtifact(artifact)} className="rounded-lg border border-red-200/70 p-2 text-red-500 hover:text-red-600 dark:border-red-900/40" title="Excluir artefato" aria-label="Excluir artefato">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filteredArtifacts.length === 0 ? (
        <div className={`border-t px-4 py-6 text-center text-sm ${theme === 'light' ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-300'}`}>
          Nenhum artefato encontrado para este filtro.
        </div>
      ) : (
        <div className={`flex items-center justify-between border-t px-4 py-3 text-xs ${theme === 'light' ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-300'}`}>
          <span>
            Exibindo {startIndex + 1}-{Math.min(startIndex + pageSize, filteredArtifacts.length)} de {filteredArtifacts.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              data-testid="artifact-table-prev-page"
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className={`rounded-lg border px-2 py-1 font-semibold ${theme === 'light' ? 'border-slate-200' : 'border-slate-700'} disabled:opacity-50`}
            >
              Anterior
            </button>
            <span>
              Pagina {safePage} de {totalPages}
            </span>
            <button
              data-testid="artifact-table-next-page"
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className={`rounded-lg border px-2 py-1 font-semibold ${theme === 'light' ? 'border-slate-200' : 'border-slate-700'} disabled:opacity-50`}
            >
              Proxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
