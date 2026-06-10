import { Artifact, ArtifactVersion, Client, DriveFolderRef, HistoryEvent, Project, ShareAccess } from '../types';
import { apiBaseUrl } from './envService';

const buildUrl = (path: string) => {
  const base = apiBaseUrl();
  if (!base) return path;
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
};

class BackendApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(buildUrl(path), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new BackendApiError(data?.error || 'Erro de API', response.status, data?.code);
  }
  return data as T;
};

export interface BackendAuthMeResponse {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
  workspace?: {
    rootFolderId: string;
    masterSpreadsheetId: string;
    projectsFolderId?: string;
  } | null;
}

type ApiClient = {
  id: string;
  name: string;
  description?: string | null;
  owner?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiProject = {
  id: string;
  clientId: string;
  ownerUserId: string;
  name: string;
  description?: string | null;
  objective: string;
  methodology: string;
  status: string;
  visibility: 'PRIVATE' | 'SHARED';
  startDate?: string | null;
  endDate?: string | null;
  responsible?: string | null;
  health?: string | null;
  phase?: string | null;
  nextStep?: string | null;
  folderId?: string | null;
  folderUrl?: string | null;
  stakeholdersJson?: unknown;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; name: string } | null;
};

type ApiMember = {
  id: string;
  email: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  status: 'PENDING' | 'ACTIVE' | 'REVOKED';
  invitedAt: string;
  acceptedAt?: string | null;
};

type ApiArtifactVersion = {
  version: number;
  content: string;
  note?: string | null;
  createdAt: string;
  createdBy: string;
};

type ApiArtifact = {
  id: string;
  projectId: string;
  name: string;
  type: string;
  scope: string;
  format: string;
  link?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'FINAL' | 'ARCHIVED';
  currentVersion: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  versions?: ApiArtifactVersion[];
};

type ApiHistoryEvent = {
  id: string;
  projectId?: string | null;
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  createdAt: string;
};

const fallbackFolderRef = (project: ApiProject): DriveFolderRef | undefined => {
  if (!project.folderId && !project.folderUrl) return undefined;
  const root = project.folderId || 'drive-folder';
  const rootUrl = project.folderUrl || `https://drive.google.com/drive/folders/${root}`;
  return {
    rootId: root,
    rootUrl,
    controlFolderId: `${root}-00`,
    controlFolderUrl: rootUrl,
    clientFolderId: `${root}-client`,
    clientFolderUrl: rootUrl,
    projectFolderId: project.folderId || root,
    projectFolderUrl: project.folderUrl || rootUrl,
    subfolders: {
      contexto: `${root}-CONTEXTO`,
      sai: `${root}-SAI`,
      pm: `${root}-PM`,
      bpmn: `${root}-BPMN`,
      status: `${root}-STATUS`,
      gerais: `${root}-GERAIS`,
    },
  };
};

const mapClient = (item: ApiClient): Client => ({
  id: item.id,
  name: item.name,
  description: item.description || undefined,
  owner: item.owner || undefined,
  notes: item.notes || undefined,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const normalizeProjectStatus = (value: string): Project['status'] => {
  if (value === 'Ativo' || value === 'Suspenso' || value === 'Concluido' || value === 'Em Risco' || value === 'Planejamento') {
    return value;
  }
  return 'Planejamento';
};

const normalizeProjectHealth = (value?: string | null): Project['health'] => {
  if (value === 'Saudavel' || value === 'Atencao' || value === 'Critico') return value;
  return 'Saudavel';
};

const mapProject = (item: ApiProject, members?: ApiMember[]): Project => ({
  id: item.id,
  name: item.name,
  objective: item.objective,
  description: item.description || undefined,
  methodology: (item.methodology as Project['methodology']) || 'Hybrid',
  status: normalizeProjectStatus(item.status),
  startDate: item.startDate || '',
  endDate: item.endDate || undefined,
  clientId: item.clientId,
  clientName: item.client?.name || undefined,
  responsible: item.responsible || undefined,
  stakeholders: Array.isArray(item.stakeholdersJson) ? (item.stakeholdersJson as string[]) : [],
  nextStep: item.nextStep || undefined,
  phase: item.phase || undefined,
  health: normalizeProjectHealth(item.health),
  lastUpdate: item.updatedAt,
  folderRef: fallbackFolderRef(item),
  sharedWith:
    members
      ?.filter((member) => member.status !== 'REVOKED')
      .map(
        (member): ShareAccess => ({
          id: member.id,
          email: member.email,
          role: member.role,
          grantedAt: member.acceptedAt || member.invitedAt,
        })
      ) || [],
});

const isArtifactType = (value: string): Artifact['type'] => {
  const valid = new Set<Artifact['type']>([
    'EXECUTIVE_REPORT',
    'RISK_ANALYSIS',
    'UI_SPEC',
    'TECH_ARCH',
    'METRICS',
    'COMMUNICATION',
    'BPMN',
    'CONTEXT',
    'STORYBOARD',
    'PM_PLAN',
    'STATUS_MD',
    'STATUS_HTML',
    'PRESENTATION_HTML',
  ]);
  return valid.has(value as Artifact['type']) ? (value as Artifact['type']) : 'PM_PLAN';
};

const isArtifactScope = (value: string): Artifact['scope'] => {
  const valid = new Set<Artifact['scope']>(['CONTEXT', 'SAI', 'PM', 'BPMN', 'STATUS', 'OTHER']);
  return valid.has(value as Artifact['scope']) ? (value as Artifact['scope']) : 'PM';
};

const isArtifactFormat = (value: string): Artifact['format'] => {
  const valid = new Set<Artifact['format']>(['google-doc', 'markdown', 'html', 'image', 'bpmn', 'link', 'text']);
  return valid.has(value as Artifact['format']) ? (value as Artifact['format']) : 'markdown';
};

const mapArtifactVersion = (item: ApiArtifactVersion): ArtifactVersion => ({
  version: item.version,
  content: item.content,
  note: item.note || undefined,
  createdAt: item.createdAt,
  createdBy: item.createdBy,
});

const mapArtifact = (item: ApiArtifact): Artifact => ({
  id: item.id,
  projectId: item.projectId,
  name: item.name,
  type: isArtifactType(item.type),
  scope: isArtifactScope(item.scope),
  format: isArtifactFormat(item.format),
  link: item.link || undefined,
  status: item.status,
  currentVersion: item.currentVersion,
  versions:
    item.versions && item.versions.length > 0
      ? item.versions.map(mapArtifactVersion)
      : [
          {
            version: item.currentVersion,
            content: item.content,
            createdAt: item.updatedAt,
            createdBy: item.updatedBy,
          },
        ],
  createdAt: item.createdAt,
  createdBy: item.createdBy,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
  isCurrent: true,
  metadata: {},
});

const mapHistoryEvent = (item: ApiHistoryEvent): HistoryEvent => ({
  id: item.id,
  projectId: item.projectId || 'GLOBAL',
  actor: item.actorUserId,
  type: 'PROJECT_UPDATED',
  summary: item.summary,
  createdAt: item.createdAt,
});

export const backendApi = {
  async getGoogleAuthUrl(state?: string) {
    const response = await request<{ authUrl: string }>('/api/auth/google/url', {
      method: 'POST',
      body: JSON.stringify({ state }),
    });
    return response.authUrl;
  },

  async exchangeGoogleCode(code: string) {
    return request('/api/auth/google/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async getMe() {
    return request<BackendAuthMeResponse>('/api/auth/me');
  },

  async logout() {
    return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
  },

  async provisionGoogle() {
    return request('/api/google/provision', { method: 'POST' });
  },

  async listClients() {
    const response = await request<{ clients: ApiClient[] }>('/api/clients');
    return response.clients.map(mapClient);
  },

  async createClient(payload: { name: string; description?: string; owner?: string; notes?: string }) {
    const response = await request<{ client: ApiClient }>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapClient(response.client);
  },

  async updateClient(id: string, payload: { name?: string; description?: string; owner?: string; notes?: string }) {
    const response = await request<{ client: ApiClient }>(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return mapClient(response.client);
  },

  async deleteClient(id: string) {
    return request<{ ok: boolean }>(`/api/clients/${id}`, {
      method: 'DELETE',
    });
  },

  async listProjects() {
    const response = await request<{ projects: ApiProject[] }>('/api/projects');
    return response.projects;
  },

  async getProjectMembers(projectId: string) {
    const response = await request<{ members: ApiMember[] }>(`/api/projects/${projectId}/members`);
    return response.members;
  },

  async createProject(payload: {
    clientId: string;
    name: string;
    description?: string;
    objective: string;
    methodology: string;
    status: string;
    startDate?: string;
    endDate?: string;
    responsible?: string;
    health?: string;
    phase?: string;
    nextStep?: string;
    stakeholders?: string[];
    visibility?: 'PRIVATE' | 'SHARED';
  }) {
    const response = await request<{ project: ApiProject }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapProject(response.project);
  },

  async updateProject(id: string, payload: Record<string, unknown>) {
    const response = await request<{ project: ApiProject }>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return mapProject(response.project);
  },

  async deleteProject(id: string) {
    return request(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  },

  async shareProject(projectId: string, payload: { email: string; role: 'OWNER' | 'EDITOR' | 'VIEWER' }) {
    return request(`/api/projects/${projectId}/share`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateProjectMember(projectId: string, memberId: string, payload: { role: 'OWNER' | 'EDITOR' | 'VIEWER' }) {
    return request(`/api/projects/${projectId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async removeProjectMember(projectId: string, memberId: string) {
    return request(`/api/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },

  async listProjectArtifacts(projectId: string) {
    const response = await request<{ artifacts: ApiArtifact[] }>(`/api/projects/${projectId}/artifacts`);
    return response.artifacts.map(mapArtifact);
  },

  async createProjectArtifact(projectId: string, payload: Record<string, unknown>) {
    const response = await request<{ artifact: ApiArtifact }>(`/api/projects/${projectId}/artifacts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapArtifact(response.artifact);
  },

  async updateArtifact(id: string, payload: Record<string, unknown>) {
    const response = await request<{ artifact: ApiArtifact }>(`/api/artifacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return mapArtifact(response.artifact);
  },

  async createArtifactVersion(id: string, payload: Record<string, unknown>) {
    const response = await request<{ artifact: ApiArtifact }>(`/api/artifacts/${id}/version`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapArtifact(response.artifact);
  },

  async deleteArtifact(id: string) {
    return request(`/api/artifacts/${id}`, {
      method: 'DELETE',
    });
  },

  async listProjectHistory(projectId: string) {
    const response = await request<{ history: ApiHistoryEvent[] }>(`/api/projects/${projectId}/history`);
    return response.history.map(mapHistoryEvent);
  },

  async loadWorkspaceBundle() {
    const [clients, rawProjects] = await Promise.all([this.listClients(), this.listProjects()]);
    const projectIds = rawProjects.map((item) => item.id);

    const memberEntries = await Promise.all(
      projectIds.map(async (projectId) => {
        try {
          const members = await this.getProjectMembers(projectId);
          return [projectId, members] as const;
        } catch {
          return [projectId, [] as ApiMember[]] as const;
        }
      })
    );
    const membersByProject = new Map<string, ApiMember[]>(memberEntries);

    const projects = rawProjects.map((item) => mapProject(item, membersByProject.get(item.id) || []));

    const artifactEntries = await Promise.all(
      projectIds.map(async (projectId) => {
        try {
          const artifacts = await this.listProjectArtifacts(projectId);
          return [projectId, artifacts] as const;
        } catch {
          return [projectId, [] as Artifact[]] as const;
        }
      })
    );

    const historyEntries = await Promise.all(
      projectIds.map(async (projectId) => {
        try {
          const history = await this.listProjectHistory(projectId);
          return [projectId, history] as const;
        } catch {
          return [projectId, [] as HistoryEvent[]] as const;
        }
      })
    );

    const artifacts = artifactEntries.flatMap(([, rows]) => rows);
    const history = historyEntries.flatMap(([, rows]) => rows);

    return {
      clients,
      projects,
      artifacts,
      history,
    };
  },

  mapProject,
};

export { BackendApiError };
