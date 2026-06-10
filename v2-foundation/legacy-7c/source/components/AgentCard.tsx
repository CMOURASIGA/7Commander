import React from 'react';
import { CoreAgentId } from '../types';
import { ExternalLink, Copy, FolderOpen } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

interface AgentCardProps {
  id: CoreAgentId;
  name: string;
  description: string;
  whenToUse: string;
  inputType: string;
  outputType: string;
  onOpenAgent: () => void;
  onCopyContext: () => void;
  onViewArtifacts: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  name,
  description,
  whenToUse,
  inputType,
  outputType,
  onOpenAgent,
  onCopyContext,
  onViewArtifacts,
}) => {
  const theme = useThemeStore((state) => state.theme);

  return (
    <article className={`rounded-3xl border p-5 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
      <div className="mb-4">
        <h3 className={`text-lg font-black ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>{name}</h3>
        <p className={`mt-1 text-sm ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>{description}</p>
      </div>

      <div className="space-y-2 text-xs">
        <p><span className="font-semibold text-slate-500">Quando usar:</span> {whenToUse}</p>
        <p><span className="font-semibold text-slate-500">Entrada:</span> {inputType}</p>
        <p><span className="font-semibold text-slate-500">Saida:</span> {outputType}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onOpenAgent} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500">
          <ExternalLink size={14} />
          Abrir agente
        </button>
        <button
          onClick={onCopyContext}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
            theme === 'light' ? 'border-slate-200 text-slate-700 hover:bg-slate-100' : 'border-slate-700 text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Copy size={14} />
          Copiar contexto
        </button>
        <button
          onClick={onViewArtifacts}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
            theme === 'light' ? 'border-slate-200 text-slate-700 hover:bg-slate-100' : 'border-slate-700 text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FolderOpen size={14} />
          Ver artefatos
        </button>
      </div>
    </article>
  );
};
