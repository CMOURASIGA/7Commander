import { GoogleGenAI } from "@google/genai";
import { AgentId, ChatMessage, AgentSettings } from "../types";
import { AGENTS_MAP } from "../constants";
import { getContext, updateContext, formatPromptWithContext, parseContextUpdateFromResponse } from "./contextService";

export async function sendMessageToAgent(
  agentId: AgentId,
  messages: ChatMessage[],
  settings: AgentSettings,
  projectId?: string
): Promise<ChatMessage> {
  const apiKey = settings.apiKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const agentDef = AGENTS_MAP[agentId];
  const modelToUse = settings.model;
  const context = getContext(projectId);

  // aplica contexto apenas na ultima mensagem do usuario
  const contextualizedMessages = messages.map((m, idx) => {
    if (m.role === 'user' && idx === messages.length - 1) {
      return { ...m, content: formatPromptWithContext(context, m.content) };
    }
    return m;
  });

  // 1. GOOGLE AI STUDIO (GEMINI) - Use Native SDK
  if (settings.provider === 'google-ai-studio') {
    const ai = new GoogleGenAI({ apiKey });
    const history = contextualizedMessages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));
    const lastMessage = contextualizedMessages[contextualizedMessages.length - 1].content;

    try {
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: [...history, { role: 'user', parts: [{ text: lastMessage }] }],
        config: {
          systemInstruction: agentDef.systemPrompt,
          temperature: settings.temperature ?? 0.7,
        },
      });
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.text || "Sem resposta do Gemini.",
        timestamp: Date.now(),
      };
      applyContextUpdate(message.content, projectId);
      return message;
    } catch (error: any) {
      handleApiErrors(error);
    }
  }

  // 2. ANTHROPIC (CLAUDE) - Specific Headers and Body
  if (settings.provider === 'anthropic') {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model: modelToUse,
          system: agentDef.systemPrompt,
          messages: contextualizedMessages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: 4096,
          temperature: settings.temperature ?? 0.7
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content[0].text,
        timestamp: Date.now(),
      };
      applyContextUpdate(message.content, projectId);
      return message;
    } catch (error: any) {
      handleApiErrors(error);
    }
  }

  // 3. OPENAI COMPATIBLE (OpenAI, Grok, Perplexity, DeepSeek, Groq)
  const OPENAI_COMPATIBLE_ENDPOINTS: Record<string, string> = {
    'openai': 'https://api.openai.com/v1/chat/completions',
    'xai': 'https://api.x.ai/v1/chat/completions',
    'perplexity': 'https://api.perplexity.ai/chat/completions',
    'groq': 'https://api.groq.com/openai/v1/chat/completions',
    'deepseek': 'https://api.deepseek.com/chat/completions',
  };

  const endpoint = OPENAI_COMPATIBLE_ENDPOINTS[settings.provider as string];

  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: 'system', content: agentDef.systemPrompt },
            ...contextualizedMessages.map(m => ({ role: m.role, content: m.content }))
          ],
          temperature: settings.temperature ?? 0.7
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: Date.now(),
      };
      applyContextUpdate(message.content, projectId);
      return message;
    } catch (error: any) {
      handleApiErrors(error);
    }
  }

  throw new Error("PROVIDER_NOT_SUPPORTED");
}

function handleApiErrors(error: any) {
  console.error("AI Service Error:", error);
  const msg = error.message || "";
  if (msg.includes("429") || msg.includes("quota") || msg.includes("rate limit")) throw new Error("QUOTA_EXCEEDED");
  if (msg.includes("key") || msg.includes("invalid") || msg.includes("unauthorized") || msg.includes("401")) throw new Error("INVALID_KEY");
  throw new Error(msg || "Erro na comunicacao com a IA.");
}

function applyContextUpdate(content: string, projectId?: string) {
  const updates = parseContextUpdateFromResponse(content);
  const hasUpdates = ['backlog', 'riscos', 'decisoes'].some((key) => {
    const value = (updates as any)[key];
    return Array.isArray(value);
  });

  if (!hasUpdates) return;

  updateContext({
    ...updates,
    atualizadoEm: new Date().toISOString(),
  }, projectId);
}
