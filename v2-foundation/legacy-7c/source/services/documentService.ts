import { AgentId, ArtifactType } from '../types';

type DocumentSection = {
  title: string;
  content: string;
};

interface GenerateDocumentParams {
  title: string;
  projectName?: string;
  date?: string;
  sections: DocumentSection[];
}

type ParsedAgentOutput = {
  resumo: string;
  backlog: string;
  plano: string;
  riscos: string;
  acoes: string;
  proximosPassos: string;
  contexto: string;
  metricas?: string;
  mensagem?: string;
  decisoes?: string;
  ui?: string;
  tech?: string;
};

function cleanLine(line: string): string {
  return line.replace(/^#+\s*/, '').replace(/^-{3,}\s*$/, '').trim();
}

export function parseAgentOutput(text: string): ParsedAgentOutput {
  const lines = text.split('\n');
  const map: Record<string, string[]> = {};
  let current = 'RESUMO_EXECUTIVO';

  const SECTION_KEYS = [
    'RESUMO_EXECUTIVO',
    'BACKLOG',
    'PLANO_30_60_90',
    'RISCOS',
    'ACOES',
    'PROXIMOS_PASSOS',
    'CONTEXTO',
    'METRICAS',
    'MENSAGEM',
    'DECISOES',
    'UI',
    'TECH',
  ];

  for (const raw of lines) {
    const line = cleanLine(raw);
    const match = line.match(/^([A-Z_]+):\s*$/);
    if (match && SECTION_KEYS.includes(match[1])) {
      current = match[1];
      map[current] = [];
      continue;
    }
    map[current] = map[current] || [];
    if (line) map[current].push(line);
  }

  const join = (key: string) => (map[key] || []).join('\n').trim();

  return {
    resumo: join('RESUMO_EXECUTIVO') || text,
    backlog: join('BACKLOG'),
    plano: join('PLANO_30_60_90'),
    riscos: join('RISCOS'),
    acoes: join('ACOES'),
    proximosPassos: join('PROXIMOS_PASSOS'),
    contexto: join('CONTEXTO'),
    metricas: join('METRICAS'),
    mensagem: join('MENSAGEM'),
    decisoes: join('DECISOES'),
    ui: join('UI'),
    tech: join('TECH'),
  };
}

function markdownTableToHtml(block: string): string {
  const rows = block
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean)
    .filter((r) => r.includes('|') && !/^[-|: ]+$/.test(r))
    .map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  if (rows.length === 0) return '';
  const [head, ...body] = rows;
  const thead = `<thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

function markdownToHtml(markdown: string): string {
  const blocks = markdown.split(/\n\s*\n/).filter(Boolean);
  return blocks
    .map((block) => {
      const trimmed = block.trim();
      if (trimmed.includes('|')) {
        const table = markdownTableToHtml(trimmed);
        if (table) return table;
      }
      return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');
}

export function generateDocumentHTML({ title, projectName, date, sections }: GenerateDocumentParams): string {
  const safeDate = date || new Date().toLocaleDateString('pt-BR');
  const headerProject = projectName || 'Projeto';

  const sectionsHtml = sections
    .map(
      (section) => `
        <section class="doc-section">
          <h2>${section.title}</h2>
          <div class="doc-content">${markdownToHtml(section.content)}</div>
        </section>
      `
    )
    .join('\n');

  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <style>
      :root {
        --brand: #f26522;
        --text: #0f172a;
        --muted: #475569;
        --border: #e2e8f0;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: 'Inter', 'Roboto', Arial, sans-serif;
        background: #f8fafc;
        color: var(--text);
        padding: 32px;
      }
      .doc {
        max-width: 960px;
        margin: 0 auto;
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        overflow: hidden;
      }
      header {
        padding: 24px 28px;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(90deg, rgba(242,101,34,0.1), rgba(59,130,246,0.08));
      }
      .meta { color: var(--muted); font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; }
      h1 {
        margin: 4px 0 0;
        font-size: 22px;
        letter-spacing: -0.02em;
      }
      .doc-body { padding: 24px 28px 32px; }
      .doc-section { margin-bottom: 24px; }
      .doc-section h2 {
        font-size: 16px;
        margin: 0 0 8px;
        letter-spacing: -0.01em;
        color: var(--text);
        border-left: 4px solid var(--brand);
        padding-left: 10px;
      }
      .doc-content { color: var(--muted); line-height: 1.6; font-size: 14px; }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 10px 0;
        font-size: 13px;
      }
      thead { background: rgba(242,101,34,0.08); }
      th, td {
        border: 1px solid var(--border);
        padding: 10px 12px;
        text-align: left;
      }
      tbody tr:nth-child(even) { background: #f8fafc; }
      tbody tr:nth-child(odd) { background: #fff; }
    </style>
  </head>
  <body>
    <div class="doc">
      <header>
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="https://i.imgur.com/GUOMwkI.png" alt="Logo" style="height:32px;"/>
          <div>
            <div class="meta">PM Commander OS · ${headerProject}</div>
            <h1>${title}</h1>
          </div>
        </div>
        <div class="meta">${safeDate}</div>
      </header>
      <div class="doc-body">
        ${sectionsHtml}
      </div>
    </div>
  </body>
  </html>
  `;
}

export const agentArtifactMap: Record<AgentId, ArtifactType> = {
  pmAiPartner: 'EXECUTIVE_REPORT',
  bpmnMasterArchitect: 'BPMN',
  riskDecisionAnalyst: 'RISK_ANALYSIS',
  uiScreensDesigner: 'UI_SPEC',
  stakeholderCommsWriter: 'COMMUNICATION',
  metricsReportingArchitect: 'METRICS',
  meetingDocsCopilot: 'COMMUNICATION',
  techArchitect: 'TECH_ARCH',
};

function sectionsByArtifact(type: ArtifactType, parsed: ParsedAgentOutput): DocumentSection[] {
  const buildUiMock = () => {
    const lines = (parsed.ui || parsed.backlog || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const header = lines.slice(0, 3).join(' · ') || 'Tela / Página';
    const chips = lines.slice(3, 8).map((c) => `<span class="chip">${c}</span>`).join(' ');
    const list = lines.slice(8, 14).map((l) => `<li>${l}</li>`).join('');
    return `
      <div class="ui-mock">
        <div class="pane">
          <h4>Menu / Filtros</h4>
          ${chips || '<span class="chip">Filtro</span><span class="chip">Status</span>'}
        </div>
        <div class="pane">
          <h4>${header}</h4>
          <ul class="list">${list || '<li>Bloco de cards</li><li>Tabela com ações</li><li>Indicadores</li>'}</ul>
        </div>
      </div>
    `;
  };

  switch (type) {
    case 'RISK_ANALYSIS':
      return [
        { title: 'Resumo Executivo', content: parsed.resumo || '' },
        { title: 'Cenário / Contexto', content: parsed.contexto || '' },
        { title: 'Riscos', content: parsed.riscos || '' },
        { title: 'Opções / Ações', content: parsed.acoes || parsed.decisoes || '' },
        { title: 'Próximos Passos', content: parsed.proximosPassos || '' },
      ];
    case 'UI_SPEC':
      return [
        { title: 'Resumo Executivo', content: parsed.resumo || '' },
        { title: 'Contexto', content: parsed.contexto || '' },
        { title: 'Telas Propostas', content: parsed.ui || parsed.backlog || parsed.acoes || '' },
        { title: 'Estrutura de Tela / Fluxo', content: parsed.backlog || parsed.acoes || '' },
        { title: 'Comportamento e Regras', content: parsed.plano || parsed.acoes || '' },
        { title: 'Estados e Critérios', content: parsed.proximosPassos || '' },
        { title: 'Mockup Visual (HTML)', content: buildUiMock() },
      ];
    case 'TECH_ARCH':
      return [
        { title: 'Resumo Executivo', content: parsed.resumo || '' },
        { title: 'Arquitetura Geral', content: parsed.contexto || '' },
        { title: 'Componentes / Entidades', content: parsed.backlog || parsed.plano || '' },
        { title: 'APIs / Integrações', content: parsed.acoes || parsed.tech || '' },
        { title: 'Pontos de Atenção', content: parsed.proximosPassos || '' },
      ];
    case 'METRICS':
      return [
        { title: 'Resumo Executivo', content: parsed.resumo || '' },
        { title: 'Métricas', content: parsed.metricas || parsed.backlog || '' },
        { title: 'Riscos / Alertas', content: parsed.riscos || '' },
        { title: 'Ações', content: parsed.acoes || '' },
        { title: 'Próximos Passos', content: parsed.proximosPassos || '' },
      ];
    case 'COMMUNICATION':
      return [
        { title: 'Resumo Executivo', content: parsed.resumo || '' },
        { title: 'Mensagem', content: parsed.contexto || parsed.acoes || '' },
        { title: 'Ações / Call To Action', content: parsed.proximosPassos || '' },
      ];
    case 'EXECUTIVE_REPORT':
    default:
      return [
        { title: 'Resumo Executivo', content: parsed.resumo || '' },
        { title: 'Contexto', content: parsed.contexto || '' },
        { title: 'Backlog', content: parsed.backlog || '' },
        { title: 'Plano 30-60-90', content: parsed.plano || '' },
        { title: 'Riscos', content: parsed.riscos || '' },
        { title: 'Ações', content: parsed.acoes || '' },
        { title: 'Próximos Passos', content: parsed.proximosPassos || '' },
      ];
  }
}

export function renderDocumentForAgent(agentId: AgentId, rawContent: string, title: string, projectName?: string) {
  const parsed = parseAgentOutput(rawContent);
  const artifactType = agentArtifactMap[agentId] || 'EXECUTIVE_REPORT';
  const sections = sectionsByArtifact(artifactType, parsed).filter((s) => s.content && s.content.trim().length > 0);
  return generateDocumentHTML({ title, projectName, sections });
}
