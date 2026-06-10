export interface ClientFixture {
  name: string;
  description: string;
  owner: string;
  notes: string;
  updatedDescription: string;
}

export interface ProjectFixture {
  name: string;
  objective: string;
  description: string;
  responsible: string;
  methodology: 'Agile' | 'Waterfall' | 'Hybrid';
  status: 'Planejamento' | 'Ativo' | 'Em Risco' | 'Suspenso' | 'Concluido';
  health: 'Saudavel' | 'Atencao' | 'Critico';
  phase: string;
  nextStep: string;
  updatedNextStep: string;
  stakeholders: string;
  startDateInput: string;
  endDateInput: string;
}

export interface ArtifactFixture {
  name: string;
  type: string;
  scope: string;
  format: string;
  status: string;
  link: string;
  content: string;
  editedContent: string;
  versionedContent: string;
}

export interface E2EData {
  runId: string;
  client: ClientFixture;
  project: ProjectFixture;
  artifact: ArtifactFixture;
  artifactToDelete: ArtifactFixture;
}

const isoDate = (daysFromToday: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
};

export const createE2EData = (suite: string): E2EData => {
  const runId = `${suite}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  return {
    runId,
    client: {
      name: `E2E Cliente ${runId}`,
      description: `Cliente criado automaticamente (${runId})`,
      owner: 'Colaborador QA',
      notes: 'Teste E2E automatizado',
      updatedDescription: 'Cliente atualizado pelo Playwright',
    },
    project: {
      name: `E2E Projeto ${runId}`,
      objective: 'Validar fluxo completo automatizado',
      description: 'Projeto de validacao E2E com Playwright',
      responsible: 'Colaborador QA',
      methodology: 'Hybrid',
      status: 'Planejamento',
      health: 'Saudavel',
      phase: 'Descoberta',
      nextStep: 'Criar primeiro artefato',
      updatedNextStep: 'Revisar artefatos gerados',
      stakeholders: 'Diretoria, Operacoes, TI',
      startDateInput: isoDate(0),
      endDateInput: isoDate(30),
    },
    artifact: {
      name: `E2E Artefato Primario ${runId}`,
      type: 'PM_PLAN',
      scope: 'PM',
      format: 'markdown',
      status: 'ACTIVE',
      link: 'https://example.com',
      content: 'Conteudo inicial do artefato E2E',
      editedContent: 'Conteudo editado do artefato E2E',
      versionedContent: 'Conteudo da nova versao do artefato E2E',
    },
    artifactToDelete: {
      name: `E2E Artefato Remocao ${runId}`,
      type: 'PM_PLAN',
      scope: 'PM',
      format: 'markdown',
      status: 'DRAFT',
      link: '',
      content: 'Artefato para testar exclusao',
      editedContent: 'N/A',
      versionedContent: 'N/A',
    },
  };
};
