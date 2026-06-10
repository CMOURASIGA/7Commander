import { Execution, Interaction, ProjectProfile } from '../types';

const STORAGE_KEY = 'pm_projects';
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

type InteractionMeta = {
  nome?: string;
  etapa?: string;
  ultimaAcao?: string;
  contexto?: {
    objetivo: string;
    escopo: string;
    stakeholders: string[];
  };
};

function loadProjects(): ProjectProfile[] {
  if (!isBrowser) return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProjects(projects: ProjectProfile[]) {
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getProjects(): ProjectProfile[] {
  return loadProjects();
}

export function getProject(projectId: string): ProjectProfile | null {
  return loadProjects().find((p) => p.id === projectId) || null;
}

export function createProject(project: ProjectProfile): ProjectProfile {
  const projects = loadProjects();
  const exists = projects.find((p) => p.id === project.id);
  if (exists) return exists;
  const next = { ...project, historico: project.historico || [] };
  saveProjects([...projects, next]);
  return next;
}

export function ensureProject(
  id: string,
  nome: string,
  contextoSeed?: InteractionMeta['contexto']
): ProjectProfile {
  const projects = loadProjects();
  const existing = projects.find((p) => p.id === id);
  if (existing) return existing;

  const novo: ProjectProfile = {
    id,
    nome,
    contexto: contextoSeed || { objetivo: '', escopo: '', stakeholders: [] },
    historico: [],
    etapa: 'Planejamento',
    ultimaAcao: 'Projeto criado',
  };
  saveProjects([...projects, novo]);
  return novo;
}

export function updateProject(
  id: string,
  updates: Partial<ProjectProfile>
): ProjectProfile | null {
  const projects = loadProjects();
  const nextProjects = projects.map((p) =>
    p.id === id ? { ...p, ...updates, contexto: { ...p.contexto, ...(updates.contexto || {}) } } : p
  );
  saveProjects(nextProjects);
  return nextProjects.find((p) => p.id === id) || null;
}

export function saveInteraction(
  projectId: string,
  interaction: Interaction,
  meta?: InteractionMeta
): ProjectProfile | null {
  if (!projectId) return null;
  const projects = loadProjects();
  const existingIndex = projects.findIndex((p) => p.id === projectId);

  const baseContext = meta?.contexto || { objetivo: '', escopo: '', stakeholders: [] };

  const baseProject: ProjectProfile =
    existingIndex >= 0
      ? projects[existingIndex]
      : {
          id: projectId,
          nome: meta?.nome || 'Projeto',
          contexto: baseContext,
          historico: [],
        };

  const historico = [interaction, ...(baseProject.historico || [])].slice(0, 200);
  const updated: ProjectProfile = {
    ...baseProject,
    nome: meta?.nome || baseProject.nome,
    contexto: {
      ...baseProject.contexto,
      ...(meta?.contexto || {}),
    },
    historico,
    etapa: meta?.etapa || interaction.etapa || baseProject.etapa,
    ultimaAcao: meta?.ultimaAcao || interaction.output?.slice(0, 140) || baseProject.ultimaAcao,
    execucoes: baseProject.execucoes || [],
  };

  if (existingIndex >= 0) {
    projects[existingIndex] = updated;
  } else {
    projects.push(updated);
  }

  saveProjects(projects);
  return updated;
}

export function saveExecution(projectId: string, execution: Execution): ProjectProfile | null {
  if (!projectId) return null;
  const projects = loadProjects();
  const idx = projects.findIndex((p) => p.id === projectId);
  if (idx === -1) return null;
  const project = projects[idx];
  const execs = [execution, ...(project.execucoes || [])].slice(0, 100);
  const updated: ProjectProfile = { ...project, execucoes: execs, ultimaAcao: execution.resumo, etapa: project.etapa || 'Operação' };
  projects[idx] = updated;
  saveProjects(projects);
  return updated;
}
