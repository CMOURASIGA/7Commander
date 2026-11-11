"use client";
import {IconActionButton} from "@/components/ui/icon-action-button";

import { useEffect, useState } from "react";
import { MemoryPriority, MemoryRecord } from "@/types/memory";
import { PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";

const PRIORITIES: MemoryPriority[] = ["P0", "P1", "P2", "P3", "P4"];

export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [search,setSearch]=useState("");
  const [priorityFilter,setPriorityFilter]=useState<"all"|MemoryPriority>("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [prioritizing, setPrioritizing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [priorityInfo, setPriorityInfo] = useState<string | null>(null);

  async function loadMemories() {
    setLoading(true);
    try {
      const response = await fetch("/api/memories");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao carregar memorias.");
      setMemories((payload?.data ?? []) as MemoryRecord[]);
    } catch {
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMemories();
  }, []);

  async function runCompression(force = false) {
    setCompressing(true);
    setCompressionInfo(null);
    try {
      const response = await fetch("/api/memories/compress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao comprimir memorias.");

      const data = payload?.data as {
        compressed: boolean;
        archivedCount: number;
        summaryMemoryId?: string;
        reason?: string;
      };

      if (data.compressed) {
        setCompressionInfo(`Compressao concluida. Arquivadas: ${data.archivedCount}.`);
      } else {
        setCompressionInfo(`Sem compressao: ${data.reason ?? "criterio nao atendido"}.`);
      }
      await loadMemories();
    } catch (error) {
      setCompressionInfo(error instanceof Error ? error.message : "Falha de compressao.");
    } finally {
      setCompressing(false);
    }
  }

  async function runPriorityMaintenance() {
    setPrioritizing(true);
    setPriorityInfo(null);
    try {
      const response = await fetch("/api/memories/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao priorizar memorias.");

      const data = payload?.data as {
        processed: number;
        changed: number;
        discarded: number;
        fixed: number;
        highPriority: number;
      };

      setPriorityInfo(
        `Priorizacao concluida. Processadas: ${data.processed}, alteradas: ${data.changed}, descartadas: ${data.discarded}.`,
      );
      await loadMemories();
    } catch (error) {
      setPriorityInfo(error instanceof Error ? error.message : "Falha na priorizacao.");
    } finally {
      setPrioritizing(false);
    }
  }

  async function patchMemory(memoryId: string, body: { content?: string; priority?: MemoryPriority; type?: string }) {
    setUpdatingId(memoryId);
    try {
      const response = await fetch(`/api/memories/${memoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao atualizar memoria.");
      const updated = payload?.data as MemoryRecord;
      setMemories((prev) => prev.map((item) => (item.id === memoryId ? updated : item)));
    } catch {
      // ignore UI error details for now
    } finally {
      setUpdatingId(null);
    }
  }

  async function sendFeedback(memoryId: string, feedback: "useful" | "not_useful") {
    setUpdatingId(memoryId);
    try {
      const response = await fetch(`/api/memories/${memoryId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao registrar feedback.");
      const updated = payload?.data as MemoryRecord;
      setMemories((prev) => prev.map((item) => (item.id === memoryId ? updated : item)));
    } catch {
      // ignore UI error details for now
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleEdit(memory: MemoryRecord) {
    const nextContent = window.prompt("Editar memoria:", memory.content)?.trim();
    if (!nextContent || nextContent === memory.content) return;
    await patchMemory(memory.id, { content: nextContent });
  }

  const filteredMemories=memories.filter(memory=>
    (priorityFilter==="all"||memory.priority===priorityFilter)&&
    [memory.content,memory.type].join(" ").toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")));
  return (
    <section className="space-y-3">
      <PageIntro
        eyebrow="7Commander"
        title="Memória operacional"
        description="Governança do contexto persistido, priorização automática e compressão de histórico para manter respostas úteis e rastreáveis."
        aside={
          <>
            <StatusPill tone="accent">{memories.length} registros</StatusPill>
            <StatusPill tone="success">{memories.filter((item) => item.priority === "P0").length} críticos</StatusPill>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="workspace-section-label">Ações de manutenção</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runPriorityMaintenance()}
            disabled={prioritizing}
            className="workspace-button-secondary"
          >
            {prioritizing ? "Priorizando..." : "Priorizar automatico"}
          </button>
          <button
            type="button"
            onClick={() => void runCompression(true)}
            disabled={compressing}
            className="workspace-button-secondary"
          >
            {compressing ? "Comprimindo..." : "Comprimir agora"}
          </button>
          <button
            type="button"
            onClick={() => void loadMemories()}
            className="workspace-button-primary"
          >
            Atualizar
          </button>
        </div>
      </div>

      {compressionInfo ? (
        <p className="workspace-card-muted px-3 py-2 text-xs text-(--text-secondary)">{compressionInfo}</p>
      ) : null}

      {priorityInfo ? (
        <p className="workspace-card-muted px-3 py-2 text-xs text-(--text-secondary)">{priorityInfo}</p>
      ) : null}

      <div className="workspace-card grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_180px]">
        <label className="text-sm">Pesquisar na memória
          <input className="workspace-input mt-1 w-full" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar conteúdo ou tipo"/>
        </label>
        <label className="text-sm">Prioridade
          <select className="workspace-select mt-1 w-full" value={priorityFilter} onChange={event=>setPriorityFilter(event.target.value as "all"|MemoryPriority)}>
            <option value="all">Todas</option>{PRIORITIES.map(item=><option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <p className="text-xs text-(--text-secondary) sm:col-span-2">{filteredMemories.length} de {memories.length} registros</p>
      </div>
      {loading ? (
        <div className="workspace-card p-4 text-sm text-(--text-secondary)">
          Carregando memorias...
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="workspace-empty-state text-sm">
          Nenhuma memória encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMemories.map((memory) => (
            <SurfaceCard key={memory.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <SectionLabel>{memory.type}</SectionLabel>
                  <p className="mt-1 text-xs text-(--text-secondary)">
                    Prioridade atual: {memory.priority}
                  </p>
                </div>
                <select
                  value={memory.priority}
                  onChange={(event) =>
                    void patchMemory(memory.id, { priority: event.target.value as MemoryPriority })
                  }
                  disabled={updatingId === memory.id}
                  className="workspace-select max-w-28"
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>

              <p className="mt-3 text-sm leading-6 text-(--text-primary)">{memory.content}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <IconActionButton icon="pin" tone="success" label={"Fixar memória "+memory.id} disabled={updatingId === memory.id} onClick={() => void patchMemory(memory.id, { priority: "P0", type: "fixed" })}/>
                <IconActionButton icon="thumbs-up" tone="success" label={"Marcar útil "+memory.id} disabled={updatingId === memory.id} onClick={() => void sendFeedback(memory.id, "useful")}/>
                <IconActionButton icon="thumbs-down" tone="neutral" label={"Marcar não útil "+memory.id} disabled={updatingId === memory.id} onClick={() => void sendFeedback(memory.id, "not_useful")}/>
                <IconActionButton icon="archive" tone="danger" label={"Marcar memória obsoleta "+memory.id} disabled={updatingId === memory.id} onClick={() => void patchMemory(memory.id, { priority: "P4", type: "obsolete" })}/>
                <IconActionButton icon="pencil" tone="edit" label={"Editar memória "+memory.id} disabled={updatingId === memory.id} onClick={() => void handleEdit(memory)}/>
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}
    </section>
  );
}
