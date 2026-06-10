
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Trash2, AlertTriangle, Loader2, Bot, User, Settings as SettingsIcon, RefreshCw, Activity, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentId, ChatMessage, Interaction, OrchestrationSuggestion, ProjectProfile } from '../types';
import { useChatStore } from '../store/useChatStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useThemeStore } from '../store/useThemeStore';
import { sendMessageToAgent } from '../services/aiService';
import { AGENTS_MAP } from '../constants';
import { useNavigate } from 'react-router-dom';
import { getContext, validateContext } from '../services/contextService';
import { saveInteraction, saveExecution } from '../services/projectService';
import { generateUiImage } from '../services/imageService';
import * as XLSX from 'xlsx';

interface ChatPanelProps {
  agentId: AgentId;
  projectId?: string;
  projectName?: string;
  stage?: string;
  onInteractionSaved?: (interaction: Interaction, project?: ProjectProfile | null) => void;
}

const EMPTY_MESSAGES: ChatMessage[] = [];
const MAX_ROWS_PREVIEW = 20;
const MAX_COLS_PREVIEW = 10;
const ORCHESTRATION_AGENT_MAP: Record<OrchestrationSuggestion['nextAgent'], AgentId> = {
  BPMN: 'bpmnMasterArchitect',
  RISK: 'riskDecisionAnalyst',
  UI: 'uiScreensDesigner',
  COMMS: 'stakeholderCommsWriter',
  DELIVERY: 'metricsReportingArchitect',
  TECH: 'techArchitect',
};

export const ChatPanel: React.FC<ChatPanelProps> = ({ agentId, projectId, projectName, stage, onInteractionSaved }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [orchestrationSuggestion, setOrchestrationSuggestion] = useState<OrchestrationSuggestion | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);
  const context = useMemo(() => getContext(projectId), [projectId]);
  const contextIssues = useMemo(() => validateContext(context), [context]);

  const chatId = useMemo(() => 
    projectId ? `${projectId}-${agentId}` : `standalone-${agentId}`, 
    [projectId, agentId]
  );

  const rawMessages = useChatStore((state) => state.chats[chatId]);
  const messages = rawMessages || EMPTY_MESSAGES;
  
  const addMessage = useChatStore((state) => state.addMessage);
  const clearChat = useChatStore((state) => state.clearChat);
  const settingsByAgent = useSettingsStore((state) => state.settingsByAgent);
  const settings = settingsByAgent[agentId];
  const agentDef = AGENTS_MAP[agentId];

  const contextDensity = useMemo(() => {
    const count = messages.length;
    if (count === 0) return { label: 'Vazio', color: 'text-slate-400', icon: Activity };
    if (count < 5) return { label: 'Otimizado', color: 'text-brand-500', icon: Zap };
    if (count < 12) return { label: 'Médio', color: 'text-amber-500', icon: Activity };
    return { label: 'Pesado', color: 'text-red-500', icon: AlertTriangle };
  }, [messages]);

  const deriveSuggestion = (text: string): OrchestrationSuggestion | null => {
    const content = text.toLowerCase();
    if (!content) return null;

    const score = (keywords: string[]) => keywords.reduce((acc, k) => (content.includes(k) ? acc + 1 : acc), 0);

    const candidates: Array<{ nextAgent: OrchestrationSuggestion['nextAgent']; reason: string; score: number }> = [
      { nextAgent: 'BPMN', reason: 'Fluxo ou processo detectado', score: score(['processo', 'fluxo', 'bpmn', 'gateway', 'swimlane']) },
      { nextAgent: 'RISK', reason: 'Riscos ou dependências mencionados', score: score(['risco', 'impacto', 'probabilidade', 'mitigacao', 'dependencia']) },
      { nextAgent: 'UI', reason: 'Interfaces ou telas descritas', score: score(['tela', 'interface', 'ui', 'ux', 'protótipo', 'wireframe']) },
      { nextAgent: 'COMMS', reason: 'Comunicação com stakeholders', score: score(['comunic', 'email', 'mensagem', 'executivo', 'stakeholder']) },
      { nextAgent: 'DELIVERY', reason: 'Entrega ou monitoramento de execução', score: score(['entrega', 'deploy', 'roadmap', 'cronograma', 'release']) },
      { nextAgent: 'TECH', reason: 'Arquitetura técnica necessária', score: score(['arquitetura', 'api', 'endpoint', 'modelo de dados', 'entidade', 'integracao', 'servico', 'backend']) },
    ];

    const sorted = candidates.sort((a, b) => b.score - a.score);
    const top = sorted[0];
    if (!top || top.score === 0) return null;

    const confidence: OrchestrationSuggestion['confidence'] =
      top.score >= 3 ? 'alta' : top.score === 2 ? 'media' : 'baixa';

    return { nextAgent: top.nextAgent, reason: top.reason, confidence };
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, errorType]);

  const handleSend = async () => {
    if (contextIssues.length > 0) {
      setErrorType(`Contexto incompleto: ${contextIssues.join(', ')}. Atualize o contexto antes de enviar.`);
      return;
    }
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: input,
      timestamp: Date.now(),
    };

    addMessage(chatId, userMessage);
    setInput('');
    setIsLoading(true);
    setErrorType(null);

    try {
      const response = await sendMessageToAgent(agentId, [...messages, userMessage], settings, projectId);
      addMessage(chatId, response);
      recordInteraction(userMessage.content, agentId, response.content);
    } catch (err: any) {
      setErrorType(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderError = () => {
    if (!errorType) return null;
    return (
      <div className={`mx-6 mb-6 p-5 border rounded-[24px] shadow-2xl ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-950/80 border-slate-800'}`}>
        <div className="flex gap-4">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl h-fit">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-[10px] font-black uppercase text-red-500">Erro no Processamento</h4>
            <p className="text-[11px] font-bold uppercase text-slate-400 mt-1">{errorType}</p>
            <button onClick={() => navigate('/settings')} className="mt-3 text-[10px] font-black uppercase text-blue-500 underline">Ajustar Credenciais</button>
          </div>
        </div>
      </div>
    );
  };

  const renderGeneratedImage = () => {
    if (!generatedImageUrl) return null;
    return (
      <div className="mx-6 mb-4 border rounded-2xl p-3 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-500">Mock visual (OpenAI)</span>
          <a href={generatedImageUrl} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase text-blue-500 underline">Abrir</a>
        </div>
        <img src={generatedImageUrl} alt="Mock UI" className="w-full rounded-xl border border-slate-200 dark:border-slate-700" />
      </div>
    );
  };

  const lastAssistantMessage = useMemo(
    () => [...messages].reverse().find((m) => m.role === 'assistant'),
    [messages]
  );

  useEffect(() => {
    if (agentId !== 'pmAiPartner') {
      setOrchestrationSuggestion(null);
      return;
    }
    const suggestion = lastAssistantMessage ? deriveSuggestion(lastAssistantMessage.content) : null;
    setOrchestrationSuggestion(suggestion);
  }, [agentId, lastAssistantMessage]);

  const bottleneckSignals = useMemo(() => {
    const text = (lastAssistantMessage?.content || '').toLowerCase();
    if (!text) return { manual: false, retrabalho: false, complexo: false };
    const manual = /manual|humano|planilha|digitar|entrada manual/.test(text);
    const retrabalho = /retrabalho|refazer|rework|correcao|corrigir/.test(text);
    const gatewayCount = (text.match(/gateway|decisao/g) || []).length;
    const arrowCount = (text.match(/->/g) || []).length;
    const lineCount = text.split('\n').length;
    const complexo = gatewayCount >= 2 || arrowCount >= 6 || lineCount >= 30;
    return { manual, retrabalho, complexo };
  }, [lastAssistantMessage]);

  const recordInteraction = (inputText: string, agent: AgentId, outputText: string) => {
    if (!projectId) return;
    const interaction: Interaction = {
      id: crypto.randomUUID(),
      input: inputText,
      agente: agent,
      output: outputText,
      data: new Date().toISOString(),
      etapa: stage,
    };
    const saved = saveInteraction(
      projectId,
      interaction,
      {
        nome: projectName,
        etapa: stage,
        ultimaAcao: outputText,
        contexto: { objetivo: context.objetivo, escopo: context.escopo, stakeholders: context.stakeholders },
      }
    );
    if (onInteractionSaved) onInteractionSaved(interaction, saved);

    if (agent === 'techArchitect') {
      saveExecution(projectId, {
        tipo: 'TECH',
        resumo: outputText.slice(0, 180),
        data: new Date().toISOString(),
      });
    }
  };

  const sendQuickAction = async (targetAgent: AgentId, instruction: string) => {
    const targetSettings = settingsByAgent[targetAgent];
    if (!targetSettings) return;
    if (contextIssues.length > 0) {
      setErrorType(`Contexto incompleto: ${contextIssues.join(', ')}. Atualize o contexto antes de enviar.`);
      return;
    }
    const actionChatId = projectId ? `${projectId}-${targetAgent}` : `standalone-${targetAgent}`;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `${instruction}\n\nResumo anterior:\n${lastAssistantMessage?.content || 'Sem resposta anterior.'}`,
      timestamp: Date.now(),
    };

    addMessage(actionChatId, userMessage);
    setIsLoading(true);
    setErrorType(null);
    try {
      const response = await sendMessageToAgent(targetAgent, [userMessage], targetSettings, projectId);
      addMessage(actionChatId, response);
      recordInteraction(userMessage.content, targetAgent, response.content);
      // feedback visual: opcional, não limpa input principal
    } catch (err: any) {
      setErrorType(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderActions = () => {
    if (!lastAssistantMessage) return null;
    if (agentId === 'pmAiPartner') {
      return (
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => sendQuickAction('bpmnMasterArchitect', 'Gerar modelo BPMN com base na analise do PM. AS IS vs TO BE, Humano/Sistema e gargalos.')}
            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-blue-600/10 text-blue-600 border-blue-500/30 hover:bg-blue-600/20 transition-all"
          >
            Gerar BPMN
          </button>
          <button
            onClick={() => sendQuickAction('pmAiPartner', 'A partir do contexto e do resumo, gere backlog INVEST detalhado.')}
            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-brand-600/10 text-brand-600 border-brand-500/30 hover:bg-brand-600/20 transition-all"
          >
            Gerar backlog
          </button>
          <button
            onClick={() => sendQuickAction('riskDecisionAnalyst', 'Analise de riscos com base no resumo anterior e contexto.')}
            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20 transition-all"
          >
            Analisar risco
          </button>
          <button
            onClick={() => sendQuickAction('stakeholderCommsWriter', 'Preparar comunicacao executiva aos stakeholders com base no resumo anterior e contexto. Inclua mensagem principal, versao completa, versao resumida e acao esperada.')}
            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-purple-500/10 text-purple-700 border-purple-500/30 hover:bg-purple-500/20 transition-all"
          >
            Preparar comunicacao
          </button>
          <button
            onClick={() => sendQuickAction('uiScreensDesigner', 'Gerar especificacao funcional de telas: objetivo, tipo de usuario, secoes/componentes (cards, tabelas, filtros), campos e regras, acoes do usuario, comportamento (busca/paginacao/ordenacao), estados (loading/vazio/erro/sem permissao), responsividade e criterios de aceite.')}
            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-brand-500/10 text-brand-700 border-brand-500/30 hover:bg-brand-500/20 transition-all"
          >
            Preparar UI
          </button>
          <button
            onClick={() => sendQuickAction('techArchitect', 'Gerar arquitetura técnica: resumo executivo, arquitetura geral, componentes, entidades, APIs, regras de negócio backend, integrações, eventos e pontos de atenção. Usar tabelas.')}
            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-slate-900/10 text-brand-700 border-brand-500/30 hover:bg-brand-500/20 transition-all"
          >
            Gerar arquitetura TECH
          </button>
        </div>
      );
    }

    if (agentId === 'bpmnMasterArchitect') {
      return (
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => sendQuickAction('pmAiPartner', 'Com base no modelo BPMN, sugira melhorias de backlog e entregaveis.')}
            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-brand-600/10 text-brand-600 border-brand-500/30 hover:bg-brand-600/20 transition-all"
          >
            Enviar melhorias PM
          </button>
        </div>
      );
    }
    return null;
  };

  const renderSmartSuggestions = () => {
    const { manual, retrabalho, complexo } = bottleneckSignals;
    const hasSignals = manual || retrabalho || complexo;
    if (!hasSignals) return null;

    return (
      <div className={`mb-3 p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${theme === 'light' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-blue-900/20 border-blue-800 text-blue-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <span>Sinais de gargalo detectados:</span>
          <div className="flex gap-2 text-[9px]">
            {manual && <span className="px-2 py-1 rounded bg-brand-600/10 text-brand-600 border border-brand-500/30">Manual</span>}
            {retrabalho && <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 border border-amber-500/30">Retrabalho</span>}
            {complexo && <span className="px-2 py-1 rounded bg-red-500/10 text-red-600 border border-red-500/30">Fluxo complexo</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => sendQuickAction('bpmnMasterArchitect', 'Modelar BPMN para automatizar gargalos e reduzir manual/retrabalho.')}
            className="px-3 py-2 rounded-xl border bg-blue-600/10 text-blue-700 border-blue-500/30 hover:bg-blue-600/20 transition-all"
          >
            Sugerir BPMN
          </button>
          <button
            onClick={() => sendQuickAction('pmAiPartner', 'Avaliar automacao e simplificacao de fluxo; priorizar user stories de automacao.')}
            className="px-3 py-2 rounded-xl border bg-brand-600/10 text-brand-700 border-brand-500/30 hover:bg-brand-600/20 transition-all"
          >
            Sugerir automacao
          </button>
        </div>
      </div>
    );
  };

  const renderPostTechContinuation = () => {
    if (agentId !== 'techArchitect' || !lastAssistantMessage) return null;
    return (
      <div className={`mb-3 p-4 rounded-2xl border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-700/50'}`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-500">Próximo passo recomendado</p>
            <p className={`text-sm font-black ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>→ Gerar backlog técnico detalhado</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">Use a arquitetura definida para listar épicos técnicos, integrações e prioridades.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => sendQuickAction('pmAiPartner', 'Consolidar a saída técnica em backlog técnico detalhado: épicos técnicos, user stories técnicas, APIs e dependências. Priorizar próximos passos e riscos.')}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-brand-500/20 transition-all"
          >
            Executar
          </button>
        </div>
      </div>
    );
  };
  const renderOrchestration = () => {
    if (!orchestrationSuggestion || agentId !== 'pmAiPartner') return null;
    const targetAgent = ORCHESTRATION_AGENT_MAP[orchestrationSuggestion.nextAgent];
    const labels: Record<OrchestrationSuggestion['nextAgent'], string> = {
      BPMN: 'Modelar processo com BPMN',
      RISK: 'Rodar análise de risco',
      UI: 'Gerar especificação de UI',
      COMMS: 'Preparar comunicação',
      DELIVERY: 'Planejar entrega/execução',
      TECH: 'Gerar arquitetura técnica',
    };

    return (
      <div className={`mb-3 p-4 rounded-2xl border text-sm ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-700/50'}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-500">Sugestão do sistema</p>
            <p className={`text-sm font-black ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
              → {labels[orchestrationSuggestion.nextAgent]}
            </p>
          </div>
          <span className="text-[10px] font-black uppercase px-3 py-1 rounded-xl border bg-brand-500/10 text-brand-700 border-brand-500/20">
            Confiança {orchestrationSuggestion.confidence}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">Motivo: {orchestrationSuggestion.reason}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => {
              sendQuickAction(targetAgent, `Executar próxima etapa sugerida: ${labels[orchestrationSuggestion.nextAgent]}. Motivo: ${orchestrationSuggestion.reason}.`);
              setOrchestrationSuggestion(null);
            }}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-brand-500/20 transition-all"
          >
            Confirmar execução
          </button>
          <button
            onClick={() => setOrchestrationSuggestion(null)}
            className="px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400"
          >
            Escolher outro caminho
          </button>
        </div>
      </div>
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setErrorType(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let text = '';

      const formatTable = (rows: any[][]) => {
        const limitedRows = rows.slice(0, MAX_ROWS_PREVIEW).map((r) => r.slice(0, MAX_COLS_PREVIEW));
        const header = limitedRows[0] || [];
        const body = limitedRows.slice(1);
        const headerLine = `| ${header.join(' | ')} |`;
        const sepLine = `| ${header.map(() => '---').join(' | ')} |`;
        const bodyLines = body.map((r) => `| ${r.join(' | ')} |`);
        return [headerLine, sepLine, ...bodyLines].join('\n');
      };

      const parseCsv = (raw: string) => {
        const lines = raw.split(/\r?\n/).filter(Boolean);
        return lines.map((line) => {
          const delimiter = line.includes(';') ? ';' : ',';
          return line.split(delimiter).map((c) => c.trim());
        });
      };

      if (['csv', 'txt', 'md', 'json', 'log'].includes(ext)) {
        text = await file.text();
        if (ext === 'csv') {
          const rows = parseCsv(text);
          text = `Pré-visualização CSV (${rows.length} linhas, max ${MAX_ROWS_PREVIEW}):\n${formatTable(rows)}`;
        }
      } else if (['xlsx', 'xls'].includes(ext)) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        text = `Pré-visualização Excel (${firstSheetName}) - ${rows.length} linhas (max ${MAX_ROWS_PREVIEW}):\n${formatTable(rows)}`;
      } else {
        throw new Error('Formato de anexo não suportado. Use CSV, TXT, JSON ou XLSX.');
      }

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: `Conteudo do anexo (${file.name}):\n\n${text}`,
        timestamp: Date.now(),
      };
      addMessage(chatId, userMessage);
      setIsLoading(true);
      const response = await sendMessageToAgent(agentId, [...messages, userMessage], settings, projectId);
      addMessage(chatId, response);
      recordInteraction(userMessage.content, agentId, response.content);
    } catch (err: any) {
      setErrorType(err.message || 'Erro ao ler anexo.');
    } finally {
      setIsUploading(false);
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`flex flex-col h-full border rounded-[32px] overflow-hidden shadow-2xl relative ${
      theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
    }`}>
      <div className={`px-6 py-4 border-b flex items-center justify-between ${
        theme === 'light' ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'
      }`}>
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-brand-500/10 rounded-2xl text-brand-500">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-tight truncate">{agentDef.displayName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <contextDensity.icon size={10} className={contextDensity.color} />
              <span className={`text-[8px] font-black uppercase ${contextDensity.color}`}>Contexto: {contextDensity.label}</span>
            </div>
          </div>
        </div>
        <button onClick={() => clearChat(chatId)} className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-lg transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`flex gap-3 w-full ${m.role === 'user' ? 'flex-row-reverse max-w-[85%]' : 'max-w-full'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-lg ${m.role === 'user' ? 'bg-blue-600' : 'bg-brand-600'}`}>
                {m.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
              </div>
              <div className={`p-5 rounded-3xl border shadow-sm markdown-content w-full ${
                m.role === 'user' 
                  ? (theme === 'light' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-blue-600/10 text-blue-100 border-blue-500/20')
                  : (theme === 'light' ? 'bg-slate-50 text-slate-800 border-slate-200' : 'bg-slate-900/60 text-slate-200 border-slate-700/50')
              }`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 animate-pulse p-4">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 flex items-center justify-center">
              <RefreshCw size={14} className="text-brand-500 animate-spin" />
            </div>
            <span className="text-[10px] font-black uppercase text-brand-500 tracking-widest">Processando Inteligência...</span>
          </div>
        )}
        {isGeneratingImage && (
          <div className="flex items-center gap-3 animate-pulse p-4">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 flex items-center justify-center">
              <RefreshCw size={14} className="text-brand-500 animate-spin" />
            </div>
            <span className="text-[10px] font-black uppercase text-brand-500 tracking-widest">Gerando imagem...</span>
          </div>
        )}
        {renderError()}
        {renderGeneratedImage()}
      </div>

      <div className={`p-6 border-t ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
        {contextIssues.length > 0 && (
          <div className={`mb-3 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${theme === 'light' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-900/20 border-amber-800 text-amber-200'}`}>
            <div className="flex items-center justify-between">
              <span>Contexto incompleto: {contextIssues.join(', ')}</span>
              <button onClick={() => navigate('/projects')} className="underline text-[10px]">Ajustar</button>
            </div>
          </div>
        )}
        {renderOrchestration()}
        {renderSmartSuggestions()}
        {renderPostTechContinuation()}
        {renderActions()}
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder={`Envie ordens para ${agentDef.displayName}...`}
            className={`flex-1 border rounded-2xl px-5 py-4 text-sm focus:outline-none resize-none h-16 shadow-inner transition-all focus:ring-2 focus:ring-brand-500/20 ${
              theme === 'light' ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-950 border-slate-700 text-white placeholder-slate-600'
            }`}
          />
          <div className="flex flex-col gap-2">
            {agentId === 'uiScreensDesigner' && (
              <button
                type="button"
                onClick={async () => {
                  if (!lastAssistantMessage) {
                    setErrorType('Gere uma descrição da tela antes de pedir imagem.');
                    return;
                  }
                  if (settings?.provider !== 'openai') {
                    setErrorType('A geração de imagem exige provedor OpenAI configurado.');
                    return;
                  }
                  try {
                    setIsGeneratingImage(true);
                    const img = await generateUiImage(lastAssistantMessage.content, settings);
                    setGeneratedImageUrl(img.url);
                  } catch (err: any) {
                    setErrorType(err.message || 'Falha ao gerar imagem.');
                  } finally {
                    setIsGeneratingImage(false);
                  }
                }}
                disabled={isGeneratingImage || isLoading}
                className="px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-500 disabled:opacity-50"
              >
                {isGeneratingImage ? 'Gerando mock...' : 'Gerar mock visual'}
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".txt,.md,.csv,.json,.log,.xls,.xlsx"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isLoading}
              className="px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-500 disabled:opacity-50"
            >
              {isUploading ? 'Lendo...' : 'Anexar'}
            </button>
            <button 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading} 
              className="w-16 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-brand-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


