import { ProjectContext } from '../types';

const CONTEXT_STORAGE_KEY = 'pm-command-center-context';
const HISTORY_SUFFIX = '-history';

const BASE_CONTEXT: ProjectContext = {
  id: 'contexto-principal',
  nome: 'Contexto Operacional',
  objetivo: 'Orquestrar a colaboracao entre agentes e PMs.',
  valor: {
    descricao: 'Garantir rastreabilidade e alinhamento de decisoes.',
    stakeholders: ['PM', 'Equipe de Produto', 'Patrocinador'],
    metricas: ['Satisfacao stakeholders', 'Time-to-Value'],
    prazo: '90 dias',
  },
  escopo: 'Planejamento, riscos, UX, metricas e comunicacoes.',
  stakeholders: ['PM', 'Equipe de Produto', 'Patrocinador'],
  userStories: [],
  risks: [],
  processes: [],
  decisions: [],
  maturidade: 'exploratorio',
  metricas: [],
  atualizadoEm: new Date().toISOString(),
};

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

function storageKey(projectId?: string) {
  return `${CONTEXT_STORAGE_KEY}-${projectId || 'default'}`;
}

function historyKey(projectId?: string) {
  return `${storageKey(projectId)}${HISTORY_SUFFIX}`;
}

function persistContext(context: ProjectContext, projectId?: string): ProjectContext {
  if (isBrowser) {
    localStorage.setItem(storageKey(projectId), JSON.stringify(context));
  }
  return context;
}

function seedContext(projectId?: string): ProjectContext {
  const seeded = { ...BASE_CONTEXT, atualizadoEm: new Date().toISOString() };
  return persistContext(seeded, projectId);
}

function parseContext(raw: string | null): ProjectContext | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const parsedValor = (() => {
      if (typeof parsed.valor === 'string') {
        return {
          descricao: parsed.valor,
          stakeholders: parsed.stakeholders || [],
          metricas: parsed.metricas || [],
          prazo: parsed.prazo || '',
        };
      }
      return {
        ...BASE_CONTEXT.valor,
        ...(parsed.valor || {}),
        stakeholders: (parsed.valor?.stakeholders as string[]) || [],
        metricas: (parsed.valor?.metricas as string[]) || [],
        prazo: parsed.valor?.prazo || '',
      };
    })();

    const normalizeArray = <T>(candidate: any, fallback: T[]): T[] => (Array.isArray(candidate) ? candidate : fallback);

    // compat: map legacy keys
    const userStories = normalizeArray(parsed.userStories ?? parsed.backlog, []);
    const risks = normalizeArray(parsed.risks ?? parsed.riscos, []);
    const processes = normalizeArray(parsed.processes ?? parsed.processos, []);
    const decisions = normalizeArray(parsed.decisions ?? parsed.decisoes, []);

    return {
      ...BASE_CONTEXT,
      ...parsed,
      valor: parsedValor,
      stakeholders: parsed.stakeholders || [],
      userStories,
      risks,
      processes,
      decisions,
      maturidade: parsed.maturidade || 'exploratorio',
      metricas: parsed.metricas || [],
      atualizadoEm: parsed.atualizadoEm || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function getContext(projectId?: string): ProjectContext {
  if (!isBrowser) return { ...BASE_CONTEXT };
  const stored = parseContext(localStorage.getItem(storageKey(projectId)));
  const context = stored || seedContext(projectId);
  console.info('[ProjectContext] Contexto carregado', { projectId, context });
  return context;
}

function appendHistory(context: ProjectContext, projectId?: string) {
  if (!isBrowser) return;
  const key = historyKey(projectId);
  const existing = localStorage.getItem(key);
  const list = existing ? JSON.parse(existing) : [];
  list.unshift({ ...context, savedAt: new Date().toISOString() });
  const trimmed = list.slice(0, 20);
  localStorage.setItem(key, JSON.stringify(trimmed));
}

export function getHistory(projectId?: string): any[] {
  if (!isBrowser) return [];
  const raw = localStorage.getItem(historyKey(projectId));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function updateContext(updates: Partial<ProjectContext>, projectId?: string): ProjectContext {
  const current = getContext(projectId);

  const normalizedUserStories = Array.isArray((updates as any).backlog) ? (updates as any).backlog : updates.userStories;
  const normalizedRisks = Array.isArray((updates as any).riscos) ? (updates as any).riscos : updates.risks;
  const normalizedProcesses = Array.isArray((updates as any).processos) ? (updates as any).processos : updates.processes;
  const normalizedDecisions = Array.isArray((updates as any).decisoes) ? (updates as any).decisoes : updates.decisions;

  const nextContext: ProjectContext = {
    ...current,
    ...updates,
    valor: {
      ...current.valor,
      ...(updates.valor || {}),
      stakeholders: updates.valor?.stakeholders ?? current.valor.stakeholders ?? [],
      metricas: updates.valor?.metricas ?? current.valor.metricas ?? [],
      prazo: updates.valor?.prazo ?? current.valor.prazo ?? '',
    },
    stakeholders: updates.stakeholders ?? current.stakeholders ?? [],
    userStories: normalizedUserStories ?? current.userStories ?? [],
    risks: normalizedRisks ?? current.risks ?? [],
    processes: normalizedProcesses ?? current.processes ?? [],
    decisions: normalizedDecisions ?? current.decisions ?? [],
    metricas: updates.metricas ?? current.metricas ?? [],
    atualizadoEm: new Date().toISOString(),
  };

  appendHistory(nextContext, projectId);
  console.info('[ProjectContext] Contexto atualizado', { projectId, nextContext });
  return persistContext(nextContext, projectId);
}

export function resetContext(projectId?: string): ProjectContext {
  const reseted = seedContext(projectId);
  appendHistory(reseted, projectId);
  console.info('[ProjectContext] Contexto resetado para base', { projectId, reseted });
  return reseted;
}

export function formatPromptWithContext(context: ProjectContext, userInput: string): string {
  return `Contexto do projeto:\n${JSON.stringify(context, null, 2)}\n\nRegras de validacao:\n- Se faltar objetivo, valor.descricao, valor.metricas ou stakeholders, NAO responda. Liste "Hipoteses e Dados Faltantes" em tabela.\n- Marque qualquer hipotese explicitamente como H1, H2.\n- Se o input conflitar com o ProjectContext, peca confirmacao antes de prosseguir.\n- Adapte a resposta ao nivel de maturidade (${context.maturidade}):\n  * exploratorio: foque em discovery, framing de escopo e validacoes iniciais.\n  * estruturado: detalhe backlog/processos e riscos moderados.\n  * execucao: foque em entregaveis, ritmo e bloqueios.\n  * otimizacao: foque em melhorias, automacao e eficiencia.\n\nInstrucao:\n${userInput}`;
}

export function parseContextUpdateFromResponse(content: string): Partial<ProjectContext> {
  const trimmed = content.trim();
  let parsed: any = null;

  const jsonBlockMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  const rawCandidate = jsonBlockMatch ? jsonBlockMatch[1] : trimmed;

  try {
    parsed = JSON.parse(rawCandidate);
  } catch {
    return {};
  }

  if (!parsed || typeof parsed !== 'object') return {};

  const next: Partial<ProjectContext> = {};
  if (Array.isArray(parsed.userStories)) next.userStories = parsed.userStories;
  if (Array.isArray(parsed.backlog)) next.userStories = parsed.backlog;
  if (Array.isArray(parsed.risks)) next.risks = parsed.risks;
  if (Array.isArray(parsed.riscos)) next.risks = parsed.riscos;
  if (Array.isArray(parsed.processes)) next.processes = parsed.processes;
  if (Array.isArray(parsed.processos)) next.processes = parsed.processos;
  if (Array.isArray(parsed.decisions)) next.decisions = parsed.decisions;
  if (Array.isArray(parsed.decisoes)) next.decisions = parsed.decisoes;
  if (parsed.valor && typeof parsed.valor === 'object') {
    next.valor = {
      descricao: parsed.valor.descricao || '',
      stakeholders: Array.isArray(parsed.valor.stakeholders) ? parsed.valor.stakeholders : [],
      metricas: Array.isArray(parsed.valor.metricas) ? parsed.valor.metricas : [],
      prazo: parsed.valor.prazo || '',
    };
  }

  return next;
}

export function validateContext(context: ProjectContext): string[] {
  const issues: string[] = [];
  if (!context.objetivo) issues.push('Objetivo ausente');
  if (!context.valor?.descricao) issues.push('Valor.descricao ausente');
  if (!context.valor?.metricas || context.valor.metricas.length === 0) issues.push('Valor.metricas ausentes');
  if (!context.stakeholders || context.stakeholders.length === 0) issues.push('Stakeholders ausentes');
  return issues;
}
