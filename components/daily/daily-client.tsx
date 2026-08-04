"use client";

import { useEffect, useState } from "react";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { DailySnapshot, DailyTask } from "@/services/daily-service";
import { PageIntro, SectionLabel, SurfaceCard } from "@/components/ui/workspace-primitives";

const STATUS_LABEL: Record<DailyTask["status"], string> = {
  aberta: "TO DO",
  em_andamento: "DOING",
  concluida: "DONE",
};

export function DailyClient() {
  const [daily, setDaily] = useState<DailySnapshot>({ tasks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDaily() {
      try {
        const response = await fetch("/api/daily", { headers: getClientAuthHeaders() });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Falha ao carregar a Daily.");
        setDaily(payload.data as DailySnapshot);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Falha ao carregar a Daily.");
      } finally {
        setLoading(false);
      }
    }

    void loadDaily();
  }, []);

  return (
    <section className="space-y-4">
      <PageIntro
        eyebrow="Workspace ativo"
        title="Daily do projeto"
        description="Cards selecionados no Kanban para orientar o trabalho de hoje."
      />

      <SurfaceCard>
        <SectionLabel>Plano de trabalho</SectionLabel>
        <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Atividades da Daily</h3>
        {loading ? <p className="mt-3 text-sm text-(--text-secondary)">Carregando atividades selecionadas...</p> : null}
        {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {!loading && !error && daily.tasks.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-(--border) bg-(--bg-muted) p-5 text-sm text-(--text-secondary)">
            Nenhuma atividade foi selecionada para a Daily. Abra um card no Kanban e marque &quot;Incluir na Daily&quot;.
          </div>
        ) : null}
        {!loading && !error && daily.tasks.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {daily.tasks.map((task) => (
              <article key={task.id} className="rounded-xl border border-(--border) bg-(--bg-muted) p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="font-semibold text-(--text-primary)">{task.title}</h4>
                  <span className="workspace-pill">{STATUS_LABEL[task.status]}</span>
                </div>
                {task.description ? <p className="mt-2 text-sm leading-6 text-(--text-secondary)">{task.description}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-(--text-secondary)">
                  <span>Prioridade: {task.priority}</span>
                  {task.responsible ? <span>Responsavel: {task.responsible}</span> : null}
                  {task.dueDate ? <span>Prazo: {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}</span> : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </SurfaceCard>
    </section>
  );
}
