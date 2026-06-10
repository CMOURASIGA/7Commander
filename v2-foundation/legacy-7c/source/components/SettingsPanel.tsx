import React from 'react';
import { WorkspaceSettings } from '../types';
import { useThemeStore } from '../store/useThemeStore';

interface SettingsPanelProps {
  settings: WorkspaceSettings;
  onAgentLinkChange: (key: keyof WorkspaceSettings['agentLinks'], value: string) => void;
  onFlagChange: (key: keyof WorkspaceSettings['flags'], value: boolean) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onAgentLinkChange, onFlagChange }) => {
  const theme = useThemeStore((state) => state.theme);
  const flagLabels: Record<keyof WorkspaceSettings['flags'], string> = {
    enableExternalAgentLinks: 'Permitir links externos dos agentes',
    enableInternalHtmlPreview: 'Permitir preview HTML interno',
    enableGoogleDocPreview: 'Permitir preview de Google Docs',
    enableBpmnImagePreview: 'Permitir preview de imagem BPMN',
  };

  const agentLabels: Record<keyof WorkspaceSettings['agentLinks'], string> = {
    storyboardIntelligenceArchitect: 'Storyboard Intelligence Architect',
    pmAiPartner: 'PM AI Partner',
    bpmnMasterArchitect: 'BPMN Master Architect',
    statusReportExecutiveArchitect: 'Status Report Executive Architect',
  };

  return (
    <section className={`rounded-3xl border p-5 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
      <h3 className="text-lg font-black">Configuracoes principais</h3>
      <p className="mt-1 text-sm text-slate-500">Somente controles operacionais do ambiente.</p>

      <div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-2">
        {(Object.keys(settings.flags) as Array<keyof WorkspaceSettings['flags']>).map((key) => (
          <label key={key} className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/40'}`}>
            {flagLabels[key]}
            <input
              type="checkbox"
              checked={settings.flags[key]}
              onChange={(event) => onFlagChange(key, event.target.checked)}
              className="h-4 w-4"
            />
          </label>
        ))}
      </div>

      <details className={`mt-5 rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/40'}`}>
        <summary className="cursor-pointer text-sm font-semibold">Avancado: links dos agentes</summary>
        <p className="mt-1 text-xs text-slate-500">
          Edite apenas se precisar trocar o destino padrao dos agentes.
        </p>
        <div className="mt-3 space-y-3">
          {(Object.keys(settings.agentLinks) as Array<keyof WorkspaceSettings['agentLinks']>).map((key) => (
            <label key={key} className="block text-sm">
              <span className="font-semibold">{agentLabels[key]}</span>
              <input
                value={settings.agentLinks[key]}
                onChange={(event) => onAgentLinkChange(key, event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-xs dark:border-slate-700"
              />
            </label>
          ))}
        </div>
      </details>
    </section>
  );
};
