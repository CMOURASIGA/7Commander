import React from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useThemeStore } from '../store/useThemeStore';
import { ExternalLink, FileStack } from 'lucide-react';
import { useFeedback } from '../components/FeedbackProvider';

const AGENTS = [
  {
    id: 'storyboardIntelligenceArchitect',
    name: 'Storyboard Intelligence Architect',
    description: 'Organiza contexto bruto, storytelling e consolidacao inicial.',
    whenToUse: 'Inicio do projeto, descoberta, consolidacao de base.',
    inputType: 'Texto livre, notas, anexos.',
    outputType: 'Storyboard, leitura inicial, contexto consolidado.',
    scope: 'SAI',
  },
  {
    id: 'pmAiPartner',
    name: 'PM AI Partner',
    description: 'Estrutura plano, backlog, diagnostico e governanca do projeto.',
    whenToUse: 'Planejamento, acompanhamento e recuperacao.',
    inputType: 'Contexto do projeto e objetivos.',
    outputType: 'Diagnostico, plano, backlog, leitura executiva.',
    scope: 'PM',
  },
  {
    id: 'bpmnMasterArchitect',
    name: 'BPMN Master Architect',
    description: 'Modela processos AS IS/TO BE e prepara arquivos BPMN.',
    whenToUse: 'Analise de processo e automacao.',
    inputType: 'Fluxo atual, regras e excecoes.',
    outputType: 'Arquivo .bpmn, imagem do fluxo e analise.',
    scope: 'BPMN',
  },
  {
    id: 'statusReportExecutiveArchitect',
    name: 'Status Report Executive Architect',
    description: 'Cria status report executivo, dashboard e apresentacao HTML.',
    whenToUse: 'Ritos semanais/mensais e comunicacao executiva.',
    inputType: 'Andamento, riscos, entregas e proximos passos.',
    outputType: 'Status markdown, dashboard HTML e apresentacao HTML.',
    scope: 'STATUS',
  },
] as const;

export const AgentsLab: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);
  const settings = useWorkspaceStore((state) => state.settings);
  const artifacts = useWorkspaceStore((state) => state.artifacts);
  const feedback = useFeedback();

  const openAgent = (id: typeof AGENTS[number]['id']) => {
    const url = settings.agentLinks[id as keyof typeof settings.agentLinks];
    if (!url) {
      feedback.warning('Link do agente nao configurado.');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-500">Agentes</p>
        <h1 className="text-3xl font-black">Catalogo de agentes por cenario</h1>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {AGENTS.map((agent) => {
          const count = artifacts.filter((artifact) => artifact.scope === agent.scope).length;
          return (
            <article key={agent.id} className={`rounded-3xl border p-5 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
              <h2 className="text-lg font-black">{agent.name}</h2>
              <p className={`mt-1 text-sm ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>{agent.description}</p>

              <div className="mt-3 space-y-1 text-xs">
                <p><span className="font-semibold text-slate-500">Quando usar:</span> {agent.whenToUse}</p>
                <p><span className="font-semibold text-slate-500">Entrada:</span> {agent.inputType}</p>
                <p><span className="font-semibold text-slate-500">Saida:</span> {agent.outputType}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button onClick={() => openAgent(agent.id)} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500">
                  <ExternalLink size={14} /> Abrir agente
                </button>
                <span className="inline-flex items-center gap-2 rounded-xl border border-slate-300/70 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-700">
                  <FileStack size={14} /> {count} artefato(s)
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
