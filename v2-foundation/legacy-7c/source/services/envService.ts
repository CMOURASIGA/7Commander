import { AgentLinkConfig, WorkspaceSettings } from '../types';

const toBool = (value: string | undefined, fallback: boolean) => {
  if (value == null) return fallback;
  return value.toLowerCase() === 'true';
};

const env = import.meta.env;

export const defaultAgentLinks: AgentLinkConfig = {
  storyboardIntelligenceArchitect:
    env.VITE_AGENT_SAI_URL ||
    'https://chatgpt.com/g/g-69d836711b3481918b02b30202578e02-storyboard-intelligence-architect',
  pmAiPartner:
    env.VITE_AGENT_PM_URL ||
    'https://chatgpt.com/g/g-68d6e73451dc8191838993ddd78210ec-pm-ai-partner',
  bpmnMasterArchitect:
    env.VITE_AGENT_BPMN_URL ||
    'https://chatgpt.com/g/g-693b306393108191a6539e556a76af23-bpmn-master-architect',
  statusReportExecutiveArchitect:
    env.VITE_AGENT_STATUS_URL ||
    'https://chatgpt.com/g/g-69d8505a014c81919fc682a281a51e96-status-report-executive-architect',
};

export const workspaceSettingsFromEnv = (): WorkspaceSettings => ({
  appName: env.VITE_APP_NAME || '7C Commander',
  appEnv: env.VITE_APP_ENV || 'development',
  webappBaseUrl: env.VITE_WEBAPP_BASE_URL || 'http://localhost:5173',
  googleClientId: env.VITE_GOOGLE_CLIENT_ID || '',
  googleApiKey: env.VITE_GOOGLE_API_KEY || '',
  driveRootFolderName: env.VITE_GOOGLE_DRIVE_ROOT_FOLDER_NAME || '7C Commander',
  projectsMasterSheetName: env.VITE_GOOGLE_PROJECTS_SHEET_NAME || 'Projetos_Master',
  brandLogoUrl: env.VITE_IMGR_BRAND_LOGO_URL || 'https://i.imgur.com/GUOMwkI.png',
  agentLinks: defaultAgentLinks,
  flags: {
    enableExternalAgentLinks: toBool(env.VITE_ENABLE_EXTERNAL_AGENT_LINKS, true),
    enableInternalHtmlPreview: toBool(env.VITE_ENABLE_INTERNAL_HTML_PREVIEW, true),
    enableGoogleDocPreview: toBool(env.VITE_ENABLE_GOOGLE_DOC_PREVIEW, true),
    enableBpmnImagePreview: toBool(env.VITE_ENABLE_BPMN_IMAGE_PREVIEW, true),
  },
});

export const authMode = (): 'google' | 'local' => {
  const value = env.VITE_AUTH_MODE;
  if (value === 'google') return 'google';
  return 'local';
};

export const backendMode = (): 'api' | 'local' => {
  const value = env.VITE_BACKEND_MODE;
  if (value === 'api') return 'api';
  return 'local';
};

export const apiBaseUrl = (): string => {
  return env.VITE_API_BASE_URL || '';
};
