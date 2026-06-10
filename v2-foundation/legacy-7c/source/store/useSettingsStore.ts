
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AgentId, AgentSettings } from '../types';

interface SettingsState {
  settingsByAgent: Record<AgentId, AgentSettings>;
  customApiKey: string;
  updateAgentSettings: (agentId: AgentId, partial: Partial<AgentSettings>) => void;
  setCustomApiKey: (key: string) => void;
}

const defaultSettings: AgentSettings = {
  // Fix: Changed 'Google Gemini' to 'google-ai-studio' to align with the type definition in types.ts
  provider: 'google-ai-studio',
  model: 'gemini-3-pro-preview',
  temperature: 0.7,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settingsByAgent: {
        pmAiPartner: { ...defaultSettings },
        bpmnMasterArchitect: { ...defaultSettings },
        uiScreensDesigner: { ...defaultSettings },
        riskDecisionAnalyst: { ...defaultSettings },
        stakeholderCommsWriter: { ...defaultSettings },
        metricsReportingArchitect: { ...defaultSettings },
        meetingDocsCopilot: { ...defaultSettings },
        techArchitect: { ...defaultSettings },
      },
      customApiKey: '',
      updateAgentSettings: (agentId, partial) =>
        set((state) => ({
          settingsByAgent: {
            ...state.settingsByAgent,
            [agentId]: { ...state.settingsByAgent[agentId], ...partial },
          },
        })),
      setCustomApiKey: (key) => set({ customApiKey: key }),
    }),
    { name: 'pm-command-center-settings' }
  )
);
