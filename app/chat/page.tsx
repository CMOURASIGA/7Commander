"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChatMessage, ConversationMeta } from "@/types/chat";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";

function createConversationId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}`;
}

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<string>(createConversationId);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [voiceLoadingId, setVoiceLoadingId] = useState<string | null>(null);
  const [voicePlayingId, setVoicePlayingId] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [decisionLoadingId, setDecisionLoadingId] = useState<string | null>(null);
  const [decisionSavedIds, setDecisionSavedIds] = useState<Record<string, boolean>>({});
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

  async function refreshConversations(selectLatest = false) {
    const response = await fetch("/api/conversations", {
      headers: getClientAuthHeaders(),
    });
    if (!response.ok) return;

    const payload = await response.json();
    const data = (payload?.data ?? []) as ConversationMeta[];
    setConversations(data);

    if (selectLatest && data.length > 0) {
      setConversationId(data[0].id);
    }
  }

  async function loadMessages(targetConversationId: string) {
    const response = await fetch(`/api/conversations/${targetConversationId}/messages`, {
      headers: getClientAuthHeaders(),
    });
    if (!response.ok) return;

    const payload = await response.json();
    setMessages((payload?.data ?? []) as ChatMessage[]);
  }

  useEffect(() => {
    async function bootstrap() {
      setLoadingHistory(true);
      const activeProjectResponse = await fetch("/api/projects/active", {
        headers: getClientAuthHeaders(),
      });
      if (activeProjectResponse.ok) {
        const payload = await activeProjectResponse.json();
        setActiveProjectId(payload?.data?.id ?? null);
      }
      await refreshConversations(true);
      setLoadingHistory(false);
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    void loadMessages(conversationId);
  }, [conversationId]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = input.trim();
    if (!value || loading) return;

    const activeConversationId = conversationId || createConversationId();
    setConversationId(activeConversationId);

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      conversationId: activeConversationId,
      role: "user",
      content: value,
      specialist: "core",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          message: value,
          conversationId: activeConversationId,
          selectedSpecialist: "core",
          projectId: activeProjectId,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Erro ao processar mensagem");
      }

      const assistantMessage = payload?.data?.message as ChatMessage;
      setMessages((prev) => [...prev, assistantMessage]);
      await refreshConversations();
    } catch (error) {
      const fallback: ChatMessage = {
        id: `${Date.now()}-assistant`,
        conversationId: activeConversationId,
        role: "assistant",
        content: error instanceof Error ? error.message : "Erro inesperado.",
        specialist: "core",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setLoading(false);
    }
  }

  function startNewConversation() {
    const id = createConversationId();
    setConversationId(id);
    setMessages([]);
  }

  function stopCurrentAudio() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current = null;
    setVoicePlayingId(null);
  }

  async function handleListen(message: ChatMessage) {
    if (message.role !== "assistant") return;

    if (voicePlayingId === message.id) {
      stopCurrentAudio();
      return;
    }

    setVoiceError(null);
    stopCurrentAudio();
    setVoiceLoadingId(message.id);

    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          text: message.content,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Erro ao gerar audio.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setVoicePlayingId(message.id);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        setVoicePlayingId(null);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        setVoicePlayingId(null);
      };

      await audio.play();
    } catch (error) {
      console.error("[chat] voice playback error", error);
      setVoiceError(error instanceof Error ? error.message : "Falha ao gerar ou reproduzir audio.");
      setVoicePlayingId(null);
    } finally {
      setVoiceLoadingId(null);
    }
  }

  async function handleSaveDecision(message: ChatMessage) {
    if (message.role !== "assistant") return;
    if (decisionSavedIds[message.id]) return;

    const suggestedTitle = message.content.replace(/\s+/g, " ").trim().slice(0, 100) || "Decisao sem titulo";
    const title = window.prompt("Titulo da decisao:", suggestedTitle)?.trim();
    if (!title) return;
    const context = window.prompt("Contexto operacional da decisao (opcional):", "")?.trim() ?? "";
    const impact = window.prompt("Impacto esperado (opcional):", "")?.trim() ?? "";
    const artifactId = window.prompt("Artefato relacionado (opcional):", "")?.trim() ?? "";

    setDecisionLoadingId(message.id);
    try {
      const response = await fetch("/api/decisions", {
        method: "POST",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title,
          context,
          reason: message.content,
          impact: impact || `Registrada via chat (${message.specialist})`,
          status: "aberta",
          projectId: activeProjectId,
          conversationId,
          artifactId: artifactId || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Erro ao salvar decisao.");
      }

      setDecisionSavedIds((prev) => ({ ...prev, [message.id]: true }));
    } catch (error) {
      const text = error instanceof Error ? error.message : "Falha ao salvar decisao.";
      window.alert(text);
    } finally {
      setDecisionLoadingId(null);
    }
  }

  return (
    <section className="grid min-h-[calc(100vh-180px)] gap-3 lg:h-[calc(100vh-180px)] lg:grid-cols-[280px_1fr]">
      <aside className="workspace-card min-h-0 overflow-y-auto p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-(--text-primary)">Conversas</h2>
          <button
            type="button"
            onClick={startNewConversation}
            className="workspace-button-primary px-3 py-2 text-xs"
          >
            Nova
          </button>
        </div>

        {loadingHistory ? (
          <p className="text-sm text-(--text-secondary)">Carregando historico...</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-(--text-secondary)">Sem conversas salvas ainda.</p>
        ) : (
          <div className="space-y-2">
            {conversations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setConversationId(item.id)}
                className={[
                  "w-full rounded-xl border px-3 py-2 text-left text-xs",
                  conversationId === item.id
                    ? "border-(--accent) bg-(--accent-soft) text-(--text-primary)"
                    : "border-(--border) bg-(--bg-muted) text-(--text-secondary)",
                ].join(" ")}
              >
                <p className="truncate font-medium">{item.title}</p>
                <p className="mt-1 opacity-80">{new Date(item.createdAt).toLocaleString("pt-BR")}</p>
              </button>
            ))}
          </div>
        )}
      </aside>

      <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
        <PageIntro
          eyebrow="7C Commander"
          title="Chat operacional"
          description="Conversa contextual com memória persistida, contexto do projeto e suporte às decisões operacionais."
          aside={
            <>
              <StatusPill tone="accent">{conversations.length} conversas</StatusPill>
              <StatusPill tone="success">
                {activeProjectId ? "Projeto vinculado" : "Sem projeto ativo"}
              </StatusPill>
            </>
          }
        />

        <SurfaceCard className="min-h-0 flex-1 overflow-y-auto p-4">
          {voiceError ? (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{voiceError}</p>
          ) : null}
          {!hasMessages ? (
            <p className="text-sm text-(--text-secondary)">
              Inicie a conversa para ativar o nucleo operacional.
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={[
                    "max-w-[85%] rounded-[1.2rem] px-4 py-3 text-sm",
                    message.role === "user"
                      ? "ml-auto bg-(--accent) text-white"
                      : "border border-(--border) bg-(--bg-muted) text-(--text-primary)",
                  ].join(" ")}
                >
                  <p>{message.content}</p>
                  <p
                    className={[
                      "mt-1 text-[11px]",
                      message.role === "user" ? "text-white/75" : "text-(--text-secondary)",
                    ].join(" ")}
                  >
                    {message.specialist}
                  </p>
                  {message.role === "assistant" ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleListen(message)}
                        disabled={voiceLoadingId === message.id}
                        className="workspace-button-secondary px-3 py-2 text-[11px]"
                      >
                        {voiceLoadingId === message.id
                          ? "Gerando audio..."
                          : voicePlayingId === message.id
                            ? "Parar audio"
                            : "Ouvir resposta"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveDecision(message)}
                        disabled={decisionLoadingId === message.id || decisionSavedIds[message.id]}
                        className="workspace-button-secondary px-3 py-2 text-[11px]"
                      >
                        {decisionSavedIds[message.id]
                          ? "Decisao salva"
                          : decisionLoadingId === message.id
                            ? "Salvando..."
                            : "Salvar decisao"}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </SurfaceCard>

        <form onSubmit={handleSubmit} className="workspace-card p-3">
          <SectionLabel>Entrada</SectionLabel>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Escreva sua mensagem..."
              className="workspace-input flex-1"
            />
            <button
              type="submit"
              disabled={loading}
              className="workspace-button-primary"
            >
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
