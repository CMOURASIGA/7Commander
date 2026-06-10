import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { AgentCard } from '../components/AgentCard';
import { ArtifactList } from '../components/ArtifactList';
import { BpmnPreviewPanel } from '../components/BpmnPreviewPanel';
import { ContextPanel } from '../components/ContextPanel';
import { HtmlPreviewPanel } from '../components/HtmlPreviewPanel';
import { ProjectForm } from '../components/ProjectForm';
import { ProjectHeader } from '../components/ProjectHeader';
import { QuickActionsBar } from '../components/QuickActionsBar';
import { ShareProjectModal } from '../components/ShareProjectModal';
import { Artifact, CoreAgentId, Project } from '../types';
import { ArtifactEditorDrawer, buildArtifactEditorDefaults } from '../components/ArtifactEditorDrawer';
import { useFeedback } from '../components/FeedbackProvider';
import { SideDrawer } from '../components/SideDrawer';
import { backendApi } from '../services/backendApi';
import { normalizeDriveFolderUrl } from '../services/driveUrl';

const tabs = [
  { id: 'overview', label: 'Visao Geral' },
  { id: 'context', label: 'Contexto' },
  { id: 'agents', label: 'Agentes' },
  { id: 'artifacts', label: 'Artefatos' },
  { id: 'history', label: 'Historico' },
  { id: 'sharing', label: 'Compartilhamento' },
] as const;

type TabId = (typeof tabs)[number]['id'];

const AGENTS_META: Array<{
  id: CoreAgentId;
  name: string;
  description: string;
  whenToUse: string;
  inputType: string;
  outputType: string;
  scope: Artifact['scope'];
}> = [
  {
    id: 'storyboardIntelligenceArchitect',
    name: 'Storyboard Intelligence Architect',
    description: 'Organiza contexto bruto e consolida a base do projeto.',
    whenToUse: 'Inicio do projeto e alinhamento de entendimento.',
    inputType: 'Notas, entrevistas, textos e anexos.',
    outputType: 'Storyboard inicial/validado e leitura inicial.',
    scope: 'SAI',
  },
  {
    id: 'pmAiPartner',
    name: 'PM AI Partner',
    description: 'Estrutura plano de trabalho, backlog e estrategia de execucao.',
    whenToUse: 'Planejamento e acompanhamento do projeto.',
    inputType: 'Contexto consolidado e objetivos.',
    outputType: 'Diagnostico, plano, backlog e leitura executiva.',
    scope: 'PM',
  },
  {
    id: 'bpmnMasterArchitect',
    name: 'BPMN Master Architect',
    description: 'Modela processo AS IS/TO BE e gera artefatos BPMN.',
    whenToUse: 'Mapeamento de processo, automacao e analise de gargalo.',
    inputType: 'Fluxo atual, regras e excecoes.',
    outputType: '.bpmn, imagem do processo e analise.',
    scope: 'BPMN',
  },
  {
    id: 'statusReportExecutiveArchitect',
    name: 'Status Report Executive Architect',
    description: 'Gera status report executivo e dashboard HTML.',
    whenToUse: 'Ritos periodicos de status e comunicacao com lideranca.',
    inputType: 'Andamento, riscos, metricas e proximos passos.',
    outputType: 'Status markdown, dashboard HTML e apresentacao.',
    scope: 'STATUS',
  },
];

const splitStakeholders = (raw: string) =>
  raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const formatProjectContext = (project: Project) => {
  const lines = [
    `Projeto: ${project.name}`,
    `Cliente: ${project.clientName || '-'}`,
    `Objetivo: ${project.objective}`,
    `Descricao: ${project.description || '-'}`,
    `Status: ${project.status}`,
    `Fase: ${project.phase || '-'}`,
    `Saude: ${project.health || '-'}`,
    `Responsavel: ${project.responsible || '-'}`,
    `Metodologia: ${project.methodology}`,
    `Stakeholders: ${(project.stakeholders || []).join(', ') || '-'}`,
    `Proximo passo: ${project.nextStep || '-'}`,
  ];
  return lines.join('\n');
};

const readArtifactContent = (artifact?: Artifact | null): string => {
  if (!artifact) return '';
  return artifact.versions.find((item) => item.version === artifact.currentVersion)?.content || '';
};

export const ProjectWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);
  const user = useAuthStore((state) => state.user);
  const feedback = useFeedback();

  const clients = useWorkspaceStore((state) => state.clients);
  const projects = useWorkspaceStore((state) => state.projects);
  const artifacts = useWorkspaceStore((state) => state.artifacts);
  const history = useWorkspaceStore((state) => state.history);
  const settings = useWorkspaceStore((state) => state.settings);
  const dataSource = useWorkspaceStore((state) => state.dataSource);
  const syncFromApi = useWorkspaceStore((state) => state.syncFromApi);

  const updateProject = useWorkspaceStore((state) => state.updateProject);
  const createArtifact = useWorkspaceStore((state) => state.createArtifact);
  const updateArtifact = useWorkspaceStore((state) => state.updateArtifact);
  const updateArtifactMeta = useWorkspaceStore((state) => state.updateArtifactMeta);
  const deleteArtifact = useWorkspaceStore((state) => state.deleteArtifact);
  const shareProject = useWorkspaceStore((state) => state.shareProject);
  const removeProjectShare = useWorkspaceStore((state) => state.removeProjectShare);

  const project = useMemo(() => projects.find((item) => item.id === id), [id, projects]);
  const projectArtifacts = useMemo(() => artifacts.filter((item) => item.projectId === project?.id), [artifacts, project?.id]);
  const projectHistory = useMemo(() => history.filter((item) => item.projectId === project?.id), [history, project?.id]);

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [artifactScopeFilter, setArtifactScopeFilter] = useState<'ALL' | Artifact['scope']>('ALL');
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [editingProject, setEditingProject] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [artifactDrawerOpen, setArtifactDrawerOpen] = useState(false);
  const [artifactDrawerMode, setArtifactDrawerMode] = useState<'create' | 'edit' | 'version'>('create');
  const [drawerTargetArtifact, setDrawerTargetArtifact] = useState<Artifact | null>(null);

  if (!project) {
    return (
      <div className={`rounded-2xl border p-6 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
        Projeto nao encontrado.
      </div>
    );
  }

  const actor = user?.email || 'local.admin@7c.local';
  const contextText = formatProjectContext(project);

  const filteredArtifacts = artifactScopeFilter === 'ALL'
    ? projectArtifacts
    : projectArtifacts.filter((artifact) => artifact.scope === artifactScopeFilter);

  useEffect(() => {
    if (!selectedArtifact) return;
    const latest = projectArtifacts.find((item) => item.id === selectedArtifact.id) || null;
    setSelectedArtifact(latest);
  }, [projectArtifacts, selectedArtifact?.id]);

  const copyContext = async () => {
    await navigator.clipboard.writeText(contextText);
    feedback.success('Contexto copiado para area de transferencia.');
  };

  const openAgent = (agentId: CoreAgentId) => {
    const url = settings.agentLinks[agentId];
    if (!url) {
      feedback.warning('Link do agente nao configurado.');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openArtifactLink = (artifact: Artifact) => {
    if (artifact.link) {
      window.open(artifact.link, '_blank', 'noopener,noreferrer');
      return;
    }

    feedback.info('Este icone abre o "Link externo" salvo no artefato. Edite o artefato para cadastrar uma URL.');
  };

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

  const openCreateArtifactDrawer = (scope?: Artifact['scope']) => {
    const fallbackScope = scope || (artifactScopeFilter === 'ALL' ? 'PM' : artifactScopeFilter);
    setArtifactDrawerMode('create');
    setDrawerTargetArtifact({
      ...({
        id: 'draft',
        projectId: project.id,
        name: '',
        type: resolveTypeFromScope(fallbackScope),
        scope: fallbackScope,
        format: 'markdown',
        status: 'DRAFT',
        currentVersion: 1,
        versions: [],
        createdAt: new Date().toISOString(),
        createdBy: actor,
        updatedAt: new Date().toISOString(),
        updatedBy: actor,
        isCurrent: true,
        agentId: resolveAgentFromScope(fallbackScope),
      } as Artifact),
    });
    setArtifactDrawerOpen(true);
  };

  const openEditArtifactDrawer = (artifact: Artifact) => {
    setArtifactDrawerMode('edit');
    setDrawerTargetArtifact(artifact);
    setArtifactDrawerOpen(true);
  };

  const openVersionArtifactDrawer = (artifact: Artifact) => {
    setArtifactDrawerMode('version');
    setDrawerTargetArtifact(artifact);
    setArtifactDrawerOpen(true);
  };

  const handleDeleteArtifact = async (artifact: Artifact) => {
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

      if (selectedArtifact?.id === artifact.id) {
        setSelectedArtifact(null);
      }
      feedback.success('Artefato excluido com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel excluir o artefato.';
      feedback.error(message);
    }
  };

  const submitArtifactFromDrawer = async (values: ReturnType<typeof buildArtifactEditorDefaults>) => {
    try {
      if (artifactDrawerMode === 'create') {
        if (dataSource === 'api') {
          const created = await backendApi.createProjectArtifact(project.id, {
            name: values.name,
            type: values.type,
            scope: values.scope,
            format: values.format,
            content: values.content,
            status: values.status,
            link: values.link || undefined,
            note: values.note || 'Criado via drawer',
          });
          await syncFromApi();
          setSelectedArtifact(created);
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
            note: values.note || 'Criado via drawer',
          });
          setSelectedArtifact(created);
        }

        setArtifactScopeFilter(values.scope);
        setActiveTab('artifacts');
        setArtifactDrawerOpen(false);
        feedback.success('Artefato criado com sucesso.');
        return;
      }

      if (!drawerTargetArtifact) return;
      const beforeContent = readArtifactContent(drawerTargetArtifact);

      if (dataSource === 'api') {
        if (artifactDrawerMode === 'version') {
          await backendApi.updateArtifact(drawerTargetArtifact.id, {
            name: values.name,
            type: values.type,
            scope: values.scope,
            format: values.format,
            status: values.status,
            link: values.link || null,
          });
          const updated = await backendApi.createArtifactVersion(drawerTargetArtifact.id, {
            content: values.content,
            note: values.note || 'Nova versao criada via drawer',
            status: values.status,
            link: values.link || null,
          });
          await syncFromApi();
          setSelectedArtifact(updated);
          setArtifactDrawerOpen(false);
          feedback.success('Nova versao criada com sucesso.');
          return;
        }

        const updated = await backendApi.updateArtifact(drawerTargetArtifact.id, {
          name: values.name,
          type: values.type,
          scope: values.scope,
          format: values.format,
          status: values.status,
          link: values.link || null,
          ...(beforeContent !== values.content ? { content: values.content, note: values.note || 'Edicao via drawer' } : {}),
        });
        await syncFromApi();
        setSelectedArtifact(updated);
        setArtifactDrawerOpen(false);
        feedback.success(beforeContent !== values.content ? 'Artefato atualizado com sucesso.' : 'Dados do artefato atualizados com sucesso.');
        return;
      }

      const metaUpdated = updateArtifactMeta(drawerTargetArtifact.id, {
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

      if (artifactDrawerMode === 'version') {
        const updated = updateArtifact(drawerTargetArtifact.id, {
          content: values.content,
          updatedBy: actor,
          strategy: 'new-version',
          note: values.note || 'Nova versao criada via drawer',
          status: values.status,
          link: values.link || undefined,
        });
        if (updated) setSelectedArtifact(updated);
        setArtifactDrawerOpen(false);
        feedback.success('Nova versao criada com sucesso.');
        return;
      }

      if (beforeContent !== values.content) {
        const updated = updateArtifact(drawerTargetArtifact.id, {
          content: values.content,
          updatedBy: actor,
          strategy: 'overwrite',
          note: values.note || 'Edicao via drawer',
          status: values.status,
          link: values.link || undefined,
        });
        if (updated) setSelectedArtifact(updated);
        feedback.success('Artefato atualizado com sucesso.');
      } else {
        setSelectedArtifact(metaUpdated);
        feedback.success('Dados do artefato atualizados com sucesso.');
      }

      setArtifactDrawerOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel salvar o artefato.';
      feedback.error(message);
    }
  };

  const selectedContent = readArtifactContent(selectedArtifact);
  const drawerInitialValues = buildArtifactEditorDefaults(
    drawerTargetArtifact || undefined,
    artifactScopeFilter === 'ALL' ? 'PM' : artifactScopeFilter
  );
  const drawerTitle =
    artifactDrawerMode === 'create'
      ? 'Novo artefato'
      : artifactDrawerMode === 'version'
      ? 'Nova versao do artefato'
      : 'Editar artefato';
  const drawerSubmitLabel =
    artifactDrawerMode === 'create'
      ? 'Criar artefato'
      : artifactDrawerMode === 'version'
      ? 'Criar versao'
      : 'Salvar alteracoes';

  const shareAction = async (email: string, role: 'OWNER' | 'EDITOR' | 'VIEWER') => {
    try {
      if (dataSource === 'api') {
        await backendApi.shareProject(project.id, { email, role });
        await syncFromApi();
      } else {
        shareProject({
          projectId: project.id,
          email,
          role,
          grantedBy: actor,
        });
      }
      feedback.success('Compartilhamento atualizado com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel compartilhar o projeto.';
      feedback.error(message);
    }
  };

  const handleRemoveShare = async (accessId: string) => {
    try {
      if (dataSource === 'api') {
        await backendApi.removeProjectMember(project.id, accessId);
        await syncFromApi();
      } else {
        removeProjectShare(project.id, accessId, actor);
      }
      feedback.success('Compartilhamento removido com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel remover o compartilhamento.';
      feedback.error(message);
    }
  };

  const updateFromForm = async (values: {
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
    health: Project['health'];
  }) => {
    const payload = {
      ...values,
      stakeholders: splitStakeholders(values.stakeholders),
      health: values.health,
    };

    try {
      if (dataSource === 'api') {
        await backendApi.updateProject(project.id, payload);
        await syncFromApi();
      } else {
        updateProject(project.id, payload, actor);
      }
      feedback.success('Projeto atualizado com sucesso.');
      setEditingProject(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel atualizar o projeto.';
      feedback.error(message);
    }
  };

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/projects')} className="text-sm font-semibold text-brand-500 hover:underline">
        Voltar para projetos
      </button>

      <ProjectHeader
        project={project}
        onEdit={() => setEditingProject(true)}
        onShare={() => setShareOpen(true)}
      />

      <QuickActionsBar
        onOpenAgent={() => openAgent('pmAiPartner')}
        onCopyContext={copyContext}
        onSaveArtifact={() => openCreateArtifactDrawer()}
        onOpenDrive={() => {
          const driveFolderUrl = normalizeDriveFolderUrl(project.folderRef?.projectFolderUrl);
          if (driveFolderUrl) {
            window.open(driveFolderUrl, '_blank', 'noopener,noreferrer');
          } else {
            feedback.warning('Link da pasta do Drive indisponível ou inválido.');
          }
        }}
        onShare={() => setShareOpen(true)}
      />

      <div className={`rounded-2xl border p-2 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              data-testid={`workspace-tab-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white'
                  : theme === 'light'
                  ? 'text-slate-700 hover:bg-slate-100'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <SideDrawer
        open={editingProject}
        title="Editar projeto"
        subtitle="Atualize os dados sem perder o contexto do workspace."
        onClose={() => setEditingProject(false)}
      >
        <ProjectForm
          presentation="drawer"
          clients={clients}
          initialProject={project}
          onCancel={() => setEditingProject(false)}
          onSubmit={updateFromForm}
        />
      </SideDrawer>

      {activeTab === 'overview' && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
              <h2 className="text-lg font-black">Visao geral do projeto</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div
                  data-testid="workspace-overview-info-card"
                  className={`rounded-xl border p-3 ${
                    theme === 'light' ? 'border-brand-200/70 bg-brand-50/70' : 'border-slate-700 bg-slate-800/70'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Objetivo</p>
                  <p data-testid="workspace-overview-info-card-value" className={theme === 'light' ? 'text-slate-900' : 'text-slate-100'}>{project.objective}</p>
                </div>
                <div
                  data-testid="workspace-overview-info-card"
                  className={`rounded-xl border p-3 ${
                    theme === 'light' ? 'border-brand-200/70 bg-brand-50/70' : 'border-slate-700 bg-slate-800/70'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Descricao</p>
                  <p data-testid="workspace-overview-info-card-value" className={theme === 'light' ? 'text-slate-900' : 'text-slate-100'}>{project.description || '-'}</p>
                </div>
                <div
                  data-testid="workspace-overview-info-card"
                  className={`rounded-xl border p-3 ${
                    theme === 'light' ? 'border-brand-200/70 bg-brand-50/70' : 'border-slate-700 bg-slate-800/70'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proximos passos</p>
                  <p data-testid="workspace-overview-info-card-value" className={theme === 'light' ? 'text-slate-900' : 'text-slate-100'}>{project.nextStep || '-'}</p>
                </div>
                <div
                  data-testid="workspace-overview-info-card"
                  className={`rounded-xl border p-3 ${
                    theme === 'light' ? 'border-brand-200/70 bg-brand-50/70' : 'border-slate-700 bg-slate-800/70'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Riscos e decisoes</p>
                  <p data-testid="workspace-overview-info-card-value" className={theme === 'light' ? 'text-slate-900' : 'text-slate-100'}>Registre na aba Historico e artefatos de status.</p>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
              <h3 className="text-sm font-black uppercase tracking-wider">Artefatos recentes</h3>
              <div className="mt-3 space-y-2">
                {projectArtifacts.slice(0, 5).map((artifact) => (
                  <button key={artifact.id} onClick={() => { setSelectedArtifact(artifact); setActiveTab('artifacts'); }} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${theme === 'light' ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-700 hover:bg-slate-800'}`}>
                    <div>
                      <p className="text-sm font-semibold">{artifact.name}</p>
                      <p className="text-xs text-slate-500">{artifact.scope} · v{artifact.currentVersion}</p>
                    </div>
                    <span className="text-xs font-semibold text-brand-500">Abrir</span>
                  </button>
                ))}
                {projectArtifacts.length === 0 && <p className="text-sm text-slate-500">Sem artefatos criados.</p>}
              </div>
            </div>
          </div>

          <ContextPanel project={project} />
        </section>
      )}

      {activeTab === 'context' && (
        <section className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
          <h2 className="text-lg font-black">Contexto do projeto</h2>
          <p className="mt-1 text-sm text-slate-500">Use este contexto como base ao abrir qualquer agente.</p>
          <textarea
            value={contextText}
            readOnly
            className={`mt-3 h-[320px] w-full rounded-xl border p-3 text-sm ${theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-700 bg-slate-950 text-slate-200'}`}
          />
          <div className="mt-3 flex gap-2">
            <button onClick={copyContext} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500">Copiar contexto</button>
            <button onClick={() => setEditingProject(true)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-700">Editar projeto</button>
          </div>
        </section>
      )}

      {activeTab === 'agents' && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {AGENTS_META.map((agent) => (
            <AgentCard
              key={agent.id}
              id={agent.id}
              name={agent.name}
              description={agent.description}
              whenToUse={agent.whenToUse}
              inputType={agent.inputType}
              outputType={agent.outputType}
              onOpenAgent={() => openAgent(agent.id)}
              onCopyContext={copyContext}
              onViewArtifacts={() => {
                setArtifactScopeFilter(agent.scope);
                setActiveTab('artifacts');
              }}
            />
          ))}
        </section>
      )}

      {activeTab === 'artifacts' && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'CONTEXT', 'SAI', 'PM', 'BPMN', 'STATUS', 'OTHER'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setArtifactScopeFilter(item)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                  artifactScopeFilter === item
                    ? 'border-brand-500/30 bg-brand-500/10 text-brand-500'
                    : theme === 'light'
                    ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {item}
              </button>
            ))}
            <button data-testid="workspace-new-artifact-button" onClick={() => openCreateArtifactDrawer()} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500">
              Novo artefato
            </button>
          </div>

          <ArtifactList
            artifacts={filteredArtifacts}
            onSelect={setSelectedArtifact}
            onOpenLink={openArtifactLink}
            onEditArtifact={openEditArtifactDrawer}
            onUpdateArtifact={openEditArtifactDrawer}
            onNewVersion={openVersionArtifactDrawer}
            onDeleteArtifact={handleDeleteArtifact}
            selectedArtifactId={selectedArtifact?.id}
          />

          {selectedArtifact && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">Dados do artefato</p>
                <h3 className="mt-1 text-lg font-black">{selectedArtifact.name}</h3>
                <p className="mt-2 text-sm text-slate-500">Tipo: {selectedArtifact.type}</p>
                <p className="text-sm text-slate-500">Escopo: {selectedArtifact.scope}</p>
                <p className="text-sm text-slate-500">Agente: {selectedArtifact.agentId || '-'}</p>
                <p className="text-sm text-slate-500">Status: {selectedArtifact.status}</p>
                <p className="text-sm text-slate-500">Versao atual: v{selectedArtifact.currentVersion}</p>
                <p className="text-sm text-slate-500">Atualizado por: {selectedArtifact.updatedBy}</p>
                <p className="text-sm text-slate-500">Ultima atualizacao: {new Date(selectedArtifact.updatedAt).toLocaleString('pt-BR')}</p>
              </div>

              {selectedArtifact.format === 'html' ? (
                <HtmlPreviewPanel htmlContent={selectedContent} title="Preview HTML" />
              ) : selectedArtifact.scope === 'BPMN' ? (
                <BpmnPreviewPanel content={selectedContent} title="Preview BPMN" />
              ) : (
                <div className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">Preview textual</p>
                  <pre className={`mt-2 max-h-[400px] overflow-auto rounded-xl border p-3 text-xs ${theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-700 bg-slate-950 text-slate-200'}`}>
                    {selectedContent || 'Sem conteudo na versao atual.'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === 'history' && (
        <section className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
          <h2 className="text-lg font-black">Historico do projeto</h2>
          <div className="mt-4 space-y-3">
            {projectHistory.map((event) => (
              <article key={event.id} className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/40'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{event.summary}</p>
                  <span className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Tipo: {event.type} · Autor: {event.actor} {event.agentId ? `· Agente: ${event.agentId}` : ''}</p>
              </article>
            ))}
            {projectHistory.length === 0 && <p className="text-sm text-slate-500">Sem historico registrado para este projeto.</p>}
          </div>
        </section>
      )}

      {activeTab === 'sharing' && (
        <section className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
          <h2 className="text-lg font-black">Compartilhamento</h2>
          <p className="mt-1 text-sm text-slate-500">Gerencie quem pode acessar este projeto.</p>
          <div className="mt-3">
            <button onClick={() => setShareOpen(true)} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500">Adicionar acesso</button>
          </div>

          <div className="mt-4 space-y-2">
            {(project.sharedWith || []).map((access) => (
              <div key={access.id} className={`flex items-center justify-between rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/40'}`}>
                <div>
                  <p className="text-sm font-semibold">{access.email}</p>
                  <p className="text-xs text-slate-500">{access.role} · {new Date(access.grantedAt).toLocaleString('pt-BR')}</p>
                </div>
                <button onClick={() => handleRemoveShare(access.id)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold dark:border-slate-700">Remover</button>
              </div>
            ))}
            {(project.sharedWith || []).length === 0 && <p className="text-sm text-slate-500">Sem pessoas compartilhadas.</p>}
          </div>
        </section>
      )}

      <ArtifactEditorDrawer
        open={artifactDrawerOpen}
        title={drawerTitle}
        submitLabel={drawerSubmitLabel}
        initialValues={drawerInitialValues}
        onClose={() => setArtifactDrawerOpen(false)}
        onSubmit={submitArtifactFromDrawer}
      />

      <ShareProjectModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onShare={shareAction}
        onRemove={handleRemoveShare}
        accesses={project.sharedWith || []}
      />
    </div>
  );
};
