import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useThemeStore } from '../store/useThemeStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useAuthStore } from '../store/useAuthStore';
import { Artifact } from '../types';
import { ArtifactList } from '../components/ArtifactList';
import { HtmlPreviewPanel } from '../components/HtmlPreviewPanel';
import { BpmnPreviewPanel } from '../components/BpmnPreviewPanel';
import { ArtifactEditorDrawer, buildArtifactEditorDefaults } from '../components/ArtifactEditorDrawer';
import { useFeedback } from '../components/FeedbackProvider';
import { backendApi } from '../services/backendApi';

const getArtifactContent = (artifact?: Artifact | null) => {
  if (!artifact) return '';
  return artifact.versions.find((item) => item.version === artifact.currentVersion)?.content || '';
};

export const ProjectArtifactsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);
  const user = useAuthStore((state) => state.user);
  const feedback = useFeedback();

  const projects = useWorkspaceStore((state) => state.projects);
  const artifacts = useWorkspaceStore((state) => state.artifacts);
  const dataSource = useWorkspaceStore((state) => state.dataSource);
  const syncFromApi = useWorkspaceStore((state) => state.syncFromApi);
  const createArtifact = useWorkspaceStore((state) => state.createArtifact);
  const updateArtifact = useWorkspaceStore((state) => state.updateArtifact);
  const updateArtifactMeta = useWorkspaceStore((state) => state.updateArtifactMeta);
  const deleteArtifact = useWorkspaceStore((state) => state.deleteArtifact);

  const project = useMemo(() => projects.find((item) => item.id === id), [id, projects]);
  const projectArtifacts = useMemo(
    () => artifacts.filter((artifact) => artifact.projectId === project?.id),
    [artifacts, project?.id]
  );
  const actor = user?.email || 'local.admin@7c.local';

  const [filter, setFilter] = useState<'ALL' | Artifact['scope']>('ALL');
  const [selected, setSelected] = useState<Artifact | null>(projectArtifacts[0] || null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'version'>('create');
  const [drawerTarget, setDrawerTarget] = useState<Artifact | null>(null);

  useEffect(() => {
    if (!selected) return;
    const latest = projectArtifacts.find((item) => item.id === selected.id) || null;
    setSelected(latest);
  }, [projectArtifacts, selected?.id]);

  if (!project) {
    return (
      <div className={`rounded-2xl border p-6 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
        Projeto nao encontrado.
      </div>
    );
  }

  const filteredArtifacts = filter === 'ALL' ? projectArtifacts : projectArtifacts.filter((artifact) => artifact.scope === filter);

  const resolveTypeFromScope = (scope: Artifact['scope']): Artifact['type'] => {
    if (scope === 'BPMN') return 'BPMN';
    if (scope === 'STATUS') return 'STATUS_MD';
    if (scope === 'SAI') return 'STORYBOARD';
    if (scope === 'CONTEXT') return 'CONTEXT';
    return 'PM_PLAN';
  };

  const resolveAgentFromScope = (scope: Artifact['scope']) => {
    if (scope === 'SAI') return 'storyboardIntelligenceArchitect';
    if (scope === 'PM') return 'pmAiPartner';
    if (scope === 'BPMN') return 'bpmnMasterArchitect';
    if (scope === 'STATUS') return 'statusReportExecutiveArchitect';
    return undefined;
  };

  const openCreateDrawer = () => {
    const scope = filter === 'ALL' ? 'PM' : filter;
    setDrawerMode('create');
    setDrawerTarget({
      ...({
        id: 'draft',
        projectId: project.id,
        name: '',
        type: resolveTypeFromScope(scope),
        scope,
        format: 'markdown',
        status: 'DRAFT',
        currentVersion: 1,
        versions: [],
        createdAt: new Date().toISOString(),
        createdBy: actor,
        updatedAt: new Date().toISOString(),
        updatedBy: actor,
        isCurrent: true,
        agentId: resolveAgentFromScope(scope),
      } as Artifact),
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (artifact: Artifact) => {
    setDrawerMode('edit');
    setDrawerTarget(artifact);
    setDrawerOpen(true);
  };

  const openVersionDrawer = (artifact: Artifact) => {
    setDrawerMode('version');
    setDrawerTarget(artifact);
    setDrawerOpen(true);
  };

  const openArtifactLink = (artifact: Artifact) => {
    if (artifact.link) {
      window.open(artifact.link, '_blank', 'noopener,noreferrer');
      return;
    }
    feedback.info('Este icone abre o "Link externo" salvo no artefato. Edite o artefato para cadastrar uma URL.');
  };

  const removeArtifact = async (artifact: Artifact) => {
    const approved = await feedback.confirm({
      title: 'Excluir artefato',
      message: `Deseja excluir o artefato "${artifact.name}"?`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      destructive: true,
    });
    if (!approved) return;

    try {
      if (dataSource === 'api') {
        await backendApi.deleteArtifact(artifact.id);
        await syncFromApi();
      } else {
        const removed = deleteArtifact(artifact.id, actor);
        if (!removed) {
          feedback.error('Nao foi possivel excluir o artefato.');
          return;
        }
      }

      if (selected?.id === artifact.id) {
        setSelected(null);
      }
      feedback.success('Artefato excluido com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel excluir o artefato.';
      feedback.error(message);
    }
  };

  const submitDrawer = async (values: ReturnType<typeof buildArtifactEditorDefaults>) => {
    try {
      if (drawerMode === 'create') {
        if (dataSource === 'api') {
          const created = await backendApi.createProjectArtifact(project.id, {
            name: values.name,
            type: values.type,
            scope: values.scope,
            format: values.format,
            content: values.content,
            status: values.status,
            link: values.link || undefined,
            note: values.note || 'Criado pela biblioteca de artefatos',
          });
          await syncFromApi();
          setSelected(created);
        } else {
          const created = createArtifact({
            projectId: project.id,
            name: values.name,
            type: values.type,
            scope: values.scope,
            format: values.format,
            content: values.content,
            createdBy: actor,
            status: values.status,
            agentId: values.agentId,
            link: values.link || undefined,
            note: values.note || 'Criado pela biblioteca de artefatos',
          });
          setSelected(created);
        }

        setFilter(values.scope);
        setDrawerOpen(false);
        feedback.success('Artefato criado com sucesso.');
        return;
      }

      if (!drawerTarget) return;

      const beforeContent = getArtifactContent(drawerTarget);
      if (dataSource === 'api') {
        if (drawerMode === 'version') {
          await backendApi.updateArtifact(drawerTarget.id, {
            name: values.name,
            type: values.type,
            scope: values.scope,
            format: values.format,
            status: values.status,
            link: values.link || null,
          });
          const updated = await backendApi.createArtifactVersion(drawerTarget.id, {
            content: values.content,
            note: values.note || 'Nova versao criada na biblioteca',
            status: values.status,
            link: values.link || null,
          });
          await syncFromApi();
          setSelected(updated);
          setDrawerOpen(false);
          feedback.success('Nova versao criada com sucesso.');
          return;
        }

        const updated = await backendApi.updateArtifact(drawerTarget.id, {
          name: values.name,
          type: values.type,
          scope: values.scope,
          format: values.format,
          status: values.status,
          link: values.link || null,
          ...(beforeContent !== values.content
            ? { content: values.content, note: values.note || 'Edicao na biblioteca de artefatos' }
            : {}),
        });
        await syncFromApi();
        setSelected(updated);
        setDrawerOpen(false);
        feedback.success(beforeContent !== values.content ? 'Artefato atualizado com sucesso.' : 'Dados do artefato atualizados com sucesso.');
        return;
      }

      const metaUpdated = updateArtifactMeta(drawerTarget.id, {
        name: values.name,
        type: values.type,
        scope: values.scope,
        format: values.format,
        status: values.status,
        link: values.link || undefined,
        agentId: values.agentId,
        updatedBy: actor,
      });

      if (!metaUpdated) {
        feedback.error('Nao foi possivel atualizar o artefato.');
        return;
      }

      if (drawerMode === 'version') {
        const updated = updateArtifact(drawerTarget.id, {
          content: values.content,
          updatedBy: actor,
          strategy: 'new-version',
          note: values.note || 'Nova versao criada na biblioteca',
          status: values.status,
          link: values.link || undefined,
        });
        if (updated) setSelected(updated);
        setDrawerOpen(false);
        feedback.success('Nova versao criada com sucesso.');
        return;
      }

      if (beforeContent !== values.content) {
        const updated = updateArtifact(drawerTarget.id, {
          content: values.content,
          updatedBy: actor,
          strategy: 'overwrite',
          note: values.note || 'Edicao na biblioteca de artefatos',
          status: values.status,
          link: values.link || undefined,
        });
        if (updated) setSelected(updated);
        feedback.success('Artefato atualizado com sucesso.');
      } else {
        setSelected(metaUpdated);
        feedback.success('Dados do artefato atualizados com sucesso.');
      }

      setDrawerOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel salvar o artefato.';
      feedback.error(message);
    }
  };

  const selectedContent = getArtifactContent(selected);
  const drawerInitialValues = buildArtifactEditorDefaults(drawerTarget || undefined, filter === 'ALL' ? 'PM' : filter);
  const drawerTitle =
    drawerMode === 'create'
      ? 'Novo artefato'
      : drawerMode === 'version'
      ? 'Nova versao do artefato'
      : 'Editar artefato';
  const drawerSubmitLabel =
    drawerMode === 'create'
      ? 'Criar artefato'
      : drawerMode === 'version'
      ? 'Criar versao'
      : 'Salvar alteracoes';

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/artifacts')} className="text-sm font-semibold text-brand-500 hover:underline">
        Voltar para projetos de artefatos
      </button>

      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-500">Artefatos do projeto</p>
        <h1 className="text-3xl font-black">{project.name}</h1>
        <p className={`mt-2 text-sm ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
          Cliente: {project.clientName || '-'}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['ALL', 'CONTEXT', 'SAI', 'PM', 'BPMN', 'STATUS', 'OTHER'] as const).map((item) => (
          <button
            key={item}
            data-testid={`project-artifacts-filter-${item}`}
            onClick={() => setFilter(item)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
              filter === item
                ? 'border-brand-500/30 bg-brand-500/10 text-brand-500'
                : theme === 'light'
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            {item}
          </button>
        ))}
        <button data-testid="project-artifacts-new-button" onClick={openCreateDrawer} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500">
          Novo artefato
        </button>
      </div>

      <ArtifactList
        artifacts={filteredArtifacts}
        onSelect={setSelected}
        onOpenLink={openArtifactLink}
        onEditArtifact={openEditDrawer}
        onUpdateArtifact={openEditDrawer}
        onNewVersion={openVersionDrawer}
        onDeleteArtifact={removeArtifact}
        selectedArtifactId={selected?.id}
      />

      {selected && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">Detalhes</p>
            <h3 className="mt-1 text-lg font-black">{selected.name}</h3>
            <p className="mt-2 text-sm text-slate-500">Tipo: {selected.type}</p>
            <p className="text-sm text-slate-500">Escopo: {selected.scope}</p>
            <p className="text-sm text-slate-500">Agente: {selected.agentId || '-'}</p>
            <p className="text-sm text-slate-500">Status: {selected.status}</p>
            <p className="text-sm text-slate-500">Versao atual: v{selected.currentVersion}</p>
            <p className="text-sm text-slate-500">Ultima atualizacao: {new Date(selected.updatedAt).toLocaleString('pt-BR')}</p>
          </div>

          {selected.format === 'html' ? (
            <HtmlPreviewPanel htmlContent={selectedContent} title="Preview do HTML" />
          ) : selected.scope === 'BPMN' ? (
            <BpmnPreviewPanel content={selectedContent} title="Preview BPMN" />
          ) : (
            <div className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-500">Preview textual</p>
              <pre className={`max-h-[420px] overflow-auto rounded-xl border p-3 text-xs ${theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-700 bg-slate-950 text-slate-200'}`}>
                {selectedContent || 'Sem conteudo armazenado.'}
              </pre>
            </div>
          )}
        </section>
      )}

      <ArtifactEditorDrawer
        open={drawerOpen}
        title={drawerTitle}
        submitLabel={drawerSubmitLabel}
        initialValues={drawerInitialValues}
        onClose={() => setDrawerOpen(false)}
        onSubmit={submitDrawer}
      />
    </div>
  );
};
