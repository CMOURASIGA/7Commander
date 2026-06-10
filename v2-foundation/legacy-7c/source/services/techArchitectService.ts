import { ProjectContext } from '../types';
import { techArchitectPrompt, AGENTS_MAP } from '../constants';
import { sendMessageToAgent } from './aiService';
import { AgentId, ChatMessage } from '../types';

const TECH_ID: AgentId = 'techArchitect';

export async function runTechArchitect(input: string, context?: ProjectContext) {
  const promptMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: input,
    timestamp: Date.now(),
  };

  // Aproveita o mesmo fluxo do aiService, usando o prompt do agente já registrado
  const response = await sendMessageToAgent(
    TECH_ID,
    [promptMessage],
    {
      provider: 'google-ai-studio',
      model: 'gemini-3-pro-preview',
      temperature: 0.4,
      apiKey: '',
    },
    context?.id
  );

  return response;
}
