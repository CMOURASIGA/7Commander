export type AgentId =
  | 'pmAiPartner'
  | 'bpmnMasterArchitect'
  | 'uiScreensDesigner'
  | 'riskDecisionAnalyst'
  | 'stakeholderCommsWriter'
  | 'metricsReportingArchitect'
  | 'meetingDocsCopilot'
  | 'techArchitect';

export type CoreAgentId =
  | 'storyboardIntelligenceArchitect'
  | 'pmAiPartner'
  | 'bpmnMasterArchitect'
  | 'statusReportExecutiveArchitect';

export type AgentScope = 'CONTEXT' | 'SAI' | 'PM' | 'BPMN' | 'STATUS' | 'OTHER';

export type OrchestrationSuggestion = {
  nextAgent: 'BPMN' | 'RISK' | 'UI' | 'COMMS' | 'DELIVERY' | 'TECH';
  reason: string;
  confidence: 'baixa' | 'media' | 'alta';
};

export type ProjectStatus = 'Ativo' | 'Suspenso' | 'Concluido' | 'Em Risco' | 'Planejamento';
export type Methodology = 'Agile' | 'Waterfall' | 'Hybrid';
export type MaturityLevel = 'exploratorio' | 'estruturado' | 'execucao' | 'otimizacao';
export type ProjectHealth = 'Saudavel' | 'Atencao' | 'Critico';

export interface DriveSubfolderRefs {
  contexto: string;
  sai: string;
  pm: string;
  bpmn: string;
  status: string;
  gerais: string;
}

export interface DriveFolderRef {
  rootId: string;
  rootUrl: string;
  controlFolderId: string;
  controlFolderUrl: string;
  clientFolderId: string;
  clientFolderUrl: string;
  projectFolderId: string;
  projectFolderUrl: string;
  subfolders: DriveSubfolderRefs;
}

export interface ShareAccess {
  id: string;
  email: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  grantedAt: string;
}

export interface Project {
  id: string;
  name: string;
  objective: string;
  methodology: Methodology;
  status: ProjectStatus;
  startDate: string;
  endDate?: string;
  budget?: string;
  clientId?: string;
  clientName?: string;
  description?: string;
  responsible?: string;
  stakeholders?: string[];
  nextStep?: string;
  phase?: string;
  health?: ProjectHealth;
  lastUpdate?: string;
  folderRef?: DriveFolderRef;
  sharedWith?: ShareAccess[];
}

export interface Client {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ArtifactStatus = 'DRAFT' | 'ACTIVE' | 'FINAL' | 'ARCHIVED';
export type ArtifactFormat = 'google-doc' | 'markdown' | 'html' | 'image' | 'bpmn' | 'link' | 'text';

export interface ArtifactVersion {
  version: number;
  content: string;
  note?: string;
  createdAt: string;
  createdBy: string;
}

export interface Artifact {
  id: string;
  projectId: string;
  clientId?: string;
  name: string;
  type: ArtifactType;
  scope: AgentScope;
  agentId?: CoreAgentId;
  format: ArtifactFormat;
  link?: string;
  status: ArtifactStatus;
  currentVersion: number;
  versions: ArtifactVersion[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isCurrent: boolean;
  relatedArtifactId?: string;
  metadata?: Record<string, string>;
}

export interface HistoryEvent {
  id: string;
  projectId: string;
  actor: string;
  type:
    | 'PROJECT_CREATED'
    | 'PROJECT_UPDATED'
    | 'PROJECT_DELETED'
    | 'CLIENT_CREATED'
    | 'CLIENT_UPDATED'
    | 'CLIENT_DELETED'
    | 'ARTIFACT_CREATED'
    | 'ARTIFACT_UPDATED'
    | 'ARTIFACT_VERSIONED'
    | 'ARTIFACT_DELETED'
    | 'AGENT_OPENED'
    | 'CONTEXT_UPDATED'
    | 'SHARE_GRANTED'
    | 'SHARE_REMOVED';
  summary: string;
  agentId?: CoreAgentId;
  createdAt: string;
}

export interface AgentLinkConfig {
  storyboardIntelligenceArchitect: string;
  pmAiPartner: string;
  bpmnMasterArchitect: string;
  statusReportExecutiveArchitect: string;
}

export interface WorkspaceFlags {
  enableExternalAgentLinks: boolean;
  enableInternalHtmlPreview: boolean;
  enableGoogleDocPreview: boolean;
  enableBpmnImagePreview: boolean;
}

export interface WorkspaceSettings {
  appName: string;
  appEnv: string;
  webappBaseUrl: string;
  googleClientId: string;
  googleApiKey: string;
  driveRootFolderName: string;
  projectsMasterSheetName: string;
  brandLogoUrl: string;
  agentLinks: AgentLinkConfig;
  flags: WorkspaceFlags;
}

export interface AuthUser {
  email: string;
  name: string;
  picture?: string;
  provider: 'google' | 'local';
}

export interface Risk {
  id: string;
  projectId: string;
  description: string;
  impact: 1 | 2 | 3 | 4 | 5;
  probability: 1 | 2 | 3 | 4 | 5;
  exposure: number;
  mitigation: string;
  owner: string;
  reviewDate?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AgentSettings {
  provider:
    | 'google-ai-studio'
    | 'openai'
    | 'anthropic'
    | 'xai'
    | 'perplexity'
    | 'groq'
    | 'deepseek'
    | 'custom-api';
  model: string;
  temperature?: number;
  apiKey?: string;
}

export interface AgentDefinition {
  id: AgentId;
  displayName: string;
  shortDescription: string;
  category:
    | 'Planejamento & Execucao'
    | 'Processos & BPMN'
    | 'Design & UX'
    | 'Riscos & Decisoes'
    | 'Comunicacao'
    | 'Metricas & Relatorios'
    | 'Reunioes & Documentos';
  usageTips: string[];
  systemPrompt: string;
  icon: string;
}

export interface UserStory {
  id: string;
  epico: string;
  historia: string;
  criteriosAceite: string;
  valor?: string;
  prioridade?: string;
}

export interface ContextRisk {
  id: string;
  risco: string;
  probabilidade: number;
  impacto: number;
  score: number;
  mitigacao: string;
  responsavel?: string;
}

export interface ProcessEntry {
  id: string;
  passo: string;
  ator: string;
  tipo: 'Humano' | 'Sistema';
  entrada: string;
  saida: string;
  regra?: string;
  visao?: 'AS_IS' | 'TO_BE';
}

export interface DecisionEntry {
  id: string;
  decisao: string;
  responsavel?: string;
  prazo?: string;
  status?: string;
}

export type ProjectContext = {
  id: string;
  nome: string;
  objetivo: string;
  valor: {
    descricao: string;
    stakeholders: string[];
    metricas: string[];
    prazo: string;
  };
  escopo: string;
  stakeholders: string[];
  userStories: UserStory[];
  risks: ContextRisk[];
  processes: ProcessEntry[];
  decisions: DecisionEntry[];
  maturidade: MaturityLevel;
  metricas: any[];
  atualizadoEm: string;
};

export type Interaction = {
  id: string;
  input: string;
  agente: string;
  output: string;
  data: string;
  etapa?: string;
};

export type ProjectProfile = {
  id: string;
  nome: string;
  contexto: {
    objetivo: string;
    escopo: string;
    stakeholders: string[];
  };
  historico: Interaction[];
  etapa?: string;
  ultimaAcao?: string;
  execucoes?: Execution[];
};

export type Execution = {
  tipo: 'TECH';
  resumo: string;
  data: string;
};

export type AgentType =
  | 'PM_AI'
  | 'BPMN'
  | 'RISK'
  | 'UI'
  | 'COMMS'
  | 'DELIVERY'
  | 'TECH';

export type ArtifactType =
  | 'EXECUTIVE_REPORT'
  | 'RISK_ANALYSIS'
  | 'UI_SPEC'
  | 'TECH_ARCH'
  | 'METRICS'
  | 'COMMUNICATION'
  | 'BPMN'
  | 'CONTEXT'
  | 'STORYBOARD'
  | 'PM_PLAN'
  | 'STATUS_MD'
  | 'STATUS_HTML'
  | 'PRESENTATION_HTML';
