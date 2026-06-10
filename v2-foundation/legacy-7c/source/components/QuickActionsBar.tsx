import React from 'react';
import { Copy, ExternalLink, Save, Share2 } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

interface QuickActionsBarProps {
  onOpenAgent: () => void;
  onCopyContext: () => void;
  onSaveArtifact: () => void;
  onOpenDrive: () => void;
  onShare: () => void;
}

const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}> = ({ icon, label, onClick, primary }) => {
  const theme = useThemeStore((state) => state.theme);

  if (primary) {
    return (
      <button onClick={onClick} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500">
        {icon}
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
        theme === 'light' ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100' : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );
};

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  onOpenAgent,
  onCopyContext,
  onSaveArtifact,
  onOpenDrive,
  onShare,
}) => {
  const theme = useThemeStore((state) => state.theme);

  return (
    <div className={`flex flex-wrap gap-2 rounded-2xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
      <ActionButton onClick={onOpenAgent} icon={<ExternalLink size={14} />} label="Abrir agente" primary />
      <ActionButton onClick={onCopyContext} icon={<Copy size={14} />} label="Copiar contexto" />
      <ActionButton onClick={onSaveArtifact} icon={<Save size={14} />} label="Salvar artefato" />
      <ActionButton onClick={onOpenDrive} icon={<ExternalLink size={14} />} label="Abrir pasta Drive" />
      <ActionButton onClick={onShare} icon={<Share2 size={14} />} label="Compartilhar" />
    </div>
  );
};
