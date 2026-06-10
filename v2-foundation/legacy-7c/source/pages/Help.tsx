import React from 'react';
import { useThemeStore } from '../store/useThemeStore';

const steps = [
  '1. Acesse Clientes e cadastre a empresa.',
  '2. Acesse Projetos e crie um projeto completo com fase, saude e proximo passo.',
  '3. Abra o Workspace do projeto e use a aba Contexto para revisar base de trabalho.',
  '4. Na aba Agentes, abra o agente correto e leve o contexto do projeto.',
  '5. Registre a saida como artefato, escolhendo sobrescrita ou nova versao.',
  '6. Use Historico e Compartilhamento para rastreabilidade e colaboracao.',
];

const agentGuide = [
  {
    title: 'Storyboard Intelligence Architect',
    use: 'Consolidar contexto e organizar entendimento inicial.',
    output: 'Storyboard inicial/validado e leitura de base.',
  },
  {
    title: 'PM AI Partner',
    use: 'Planejar, priorizar e gerir o andamento do projeto.',
    output: 'Diagnostico, plano, backlog e leitura executiva.',
  },
  {
    title: 'BPMN Master Architect',
    use: 'Modelar processo AS IS e TO BE.',
    output: '.bpmn, imagem do processo e analise.',
  },
  {
    title: 'Status Report Executive Architect',
    use: 'Gerar comunicacao executiva periodica.',
    output: 'Status markdown, dashboard HTML e apresentacao HTML.',
  },
];

export const Help: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-500">Ajuda</p>
        <h1 className="text-3xl font-black">Guia operacional do 7C Commander</h1>
      </header>

      <section className={`rounded-2xl border p-5 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
        <h2 className="text-lg font-black">Objetivo do sistema</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-500">
          <p>
            Centralizar a gestao ponta a ponta de projetos, conectando contexto, execucao com agentes especializados,
            versionamento de artefatos e rastreabilidade de decisoes.
          </p>
          <p>
            O 7C Commander existe para reduzir dispersao operacional, padronizar entregaveis e acelerar a
            comunicacao executiva do projeto.
          </p>
        </div>
      </section>

      <section className={`rounded-2xl border p-5 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
        <h2 className="text-lg font-black">Fluxo recomendado</h2>
        <div className="mt-3 space-y-2 text-sm">
          {steps.map((step) => (
            <p key={step}>{step}</p>
          ))}
        </div>
      </section>

      <section className={`rounded-2xl border p-5 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
        <h2 className="text-lg font-black">Guia dos agentes</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {agentGuide.map((agent) => (
            <article key={agent.title} className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/40'}`}>
              <h3 className="font-semibold">{agent.title}</h3>
              <p className="mt-1 text-sm text-slate-500"><strong>Quando usar:</strong> {agent.use}</p>
              <p className="mt-1 text-sm text-slate-500"><strong>Saida:</strong> {agent.output}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`rounded-2xl border p-5 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
        <h2 className="text-lg font-black">Versionamento de artefatos</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-500">
          <li>Sobrescrita controlada para ajustes pequenos no documento em trabalho.</li>
          <li>Nova versao para marco importante, mudanca relevante ou preservacao de historico.</li>
          <li>Status recomendados: DRAFT, ACTIVE, FINAL, ARCHIVED.</li>
          <li>Metadados obrigatorios: versao, criado por, atualizado por, data e status.</li>
        </ul>
      </section>
    </div>
  );
};
