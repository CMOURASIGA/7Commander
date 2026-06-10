
import { GoogleGenAI } from "@google/genai";
import { AgentId, ChatMessage, AgentSettings } from "../types";
import { AGENTS_MAP } from "../constants";

export async function sendMessageToAgent(
  agentId: AgentId,
  messages: ChatMessage[],
  settings: AgentSettings
): Promise<ChatMessage> {
  // PRIORIDADE: 1. Chave manual do agente | 2. Chave global do ambiente
  const apiKey = settings.apiKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  // Criamos uma nova instância para garantir o uso da chave configurada para ESTE especialista
  const ai = new GoogleGenAI({ apiKey });
  const agentDef = AGENTS_MAP[agentId];
  
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const lastMessage = messages[messages.length - 1].content;
  const modelToUse = settings.model || 'gemini-3-pro-preview';

  try {
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: [
        ...history,
        { role: 'user', parts: [{ text: lastMessage }] }
      ],
      config: {
        systemInstruction: agentDef.systemPrompt,
        temperature: settings.temperature ?? 0.7,
      },
    });

    const text = response.text || "O sistema não retornou uma resposta válida.";
    
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: text,
      timestamp: Date.now(),
    };
  } catch (error: any) {
    console.error("AI API Error Context:", error);
    
    const errorMessage = error.message || "";

    if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
      throw new Error("QUOTA_EXCEEDED");
    }

    if (errorMessage.includes("API key not valid") || errorMessage.includes("INVALID_ARGUMENT") || errorMessage.includes("Requested entity was not found")) {
      throw new Error("INVALID_KEY");
    }

    if (errorMessage.includes("503") || errorMessage.includes("overloaded")) {
      throw new Error("MODEL_BUSY");
    }

    throw new Error(errorMessage || "Erro na comunicação com a rede neural.");
  }
}
