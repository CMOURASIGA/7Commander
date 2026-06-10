"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";

type ActiveProject = {
  id: string;
  name: string;
  status: string;
  objective: string;
  context: string;
  clientName: string | null;
};

type ProjectSummary = {
  id: string;
  name: string;
  status: string;
  clientName: string | null;
  createdAt: string;
  isActive: boolean;
};

type TaskCard = {
  id: string;
  title: string;
  priority: "baixa" | "media" | "alta" | "critica";
  status: "aberta" | "em_andamento" | "concluida";
  columnKey: "todo" | "doing" | "done";
};

type TaskColumn = {
  id: string;
  key: "todo" | "doing" | "done";
  title: string;
  cards: TaskCard[];
};

type TaskBoard = {
  id: string;
  projectId: string;
  columns: TaskColumn[];
};

type RiskItem = {
  id: string;
  title: string;
  status: "aberto" | "em_mitigacao" | "mitigado" | "encerrado";
};

type KnowledgeItem = {
  id: string;
  title: string;
  createdAt: string;
};

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDisplayName(email: string | null) {
  const base = (email ?? "operador").split("@")[0] ?? "operador";
  return base
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatProjectAge(createdAt: string) {
  const diffDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Hoje";
  if (diffDays === 1) return "1 dia";
  return `${diffDays} dias`;
}

function DashboardIcon({ label }: { label: string }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-(--bg-muted) text-[10px] font-medium text-(--text-tertiary)">
      {label}
    </span>
  );
}

export default function HomePage() {
  const auth = useKairosAuth();
  const [project, setProject] = useState<ActiveProject | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [board, setBoard] = useState<TaskBoard | null>(null);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const canLoadWorkspace = !auth.loading && (!auth.required || Boolean(auth.user));

  const counters = useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter((item) => item.status === "ativo").length;
    const riskyProjects = openRiskProjects(risks, project?.id ?? null);
    const artifacts = knowledge.length;
    return { totalProjects, activeProjects, riskyProjects, artifacts };
  }, [knowledge.length, project?.id, projects, risks]);

  const staleProjects = useMemo(() => {
    return projects
      .slice()
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
      .slice(0, 4);
  }, [projects]);

  useEffect(() => {
    if (!canLoadWorkspace) return;

    async function bootstrap() {
      setStatusMessage(null);
      try {
        const activeResponse = await fetch("/api/projects/active", {
          headers: getClientAuthHeaders(),
        });
        const activePayload = await activeResponse.json().catch(() => ({}));
        if (!activeResponse.ok) throw new Error(activePayload?.error || "Falha ao carregar projeto ativo.");

        const activeProject = (activePayload?.data ?? null) as ActiveProject | null;
        setProject(activeProject);

        const projectsResponse = await fetch("/api/projects", {
          headers: getClientAuthHeaders(),
        });
        const projectsPayload = await projectsResponse.json().catch(() => ({}));
        if (projectsResponse.ok) {
          setProjects((projectsPayload?.data ?? []) as ProjectSummary[]);
        }

        if (!activeProject?.id) {
          setBoard(null);
          setRisks([]);
          setKnowledge([]);
          setStatusMessage("Nenhum projeto ativo. Crie ou ative um projeto para iniciar a execução.");
          return;
        }

        const [tasksResponse, risksResponse, knowledgeResponse] = await Promise.all([
          fetch(`/api/projects/${activeProject.id}/tasks`, { headers: getClientAuthHeaders() }),
          fetch(`/api/projects/${activeProject.id}/risks`, { headers: getClientAuthHeaders() }),
          fetch(`/api/knowledge?projectId=${encodeURIComponent(activeProject.id)}`, { headers: getClientAuthHeaders() }),
        ]);

        const tasksPayload = await tasksResponse.json().catch(() => ({}));
        const risksPayload = await risksResponse.json().catch(() => ({}));
        const knowledgePayload = await knowledgeResponse.json().catch(() => ({}));

        if (!tasksResponse.ok) throw new Error(tasksPayload?.error || "Falha ao carregar quadro.");
        if (!risksResponse.ok) throw new Error(risksPayload?.error || "Falha ao carregar riscos.");
        if (!knowledgeResponse.ok) throw new Error(knowledgePayload?.error || "Falha ao carregar artefatos.");

        setBoard((tasksPayload?.data ?? null) as TaskBoard | null);
        setRisks((risksPayload?.data ?? []) as RiskItem[]);
        setKnowledge((knowledgePayload?.data ?? []) as KnowledgeItem[]);
      } catch (error) {
        setProject(null);
        setBoard(null);
        setRisks([]);
        setKnowledge([]);
        setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar dashboard.");
      } finally {
      }
    }

    void bootstrap();
  }, [canLoadWorkspace]);

  const userName = formatDisplayName(auth.user?.email ?? null);
  const subtitle = `${counters.activeProjects} projetos ativos e ${counters.riskyProjects} em risco agora.`;

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-(--border) bg-(--bg-surface) p-5">
        <h2 className="text-[20px] font-medium text-(--text-primary)">{`${greetingForNow()}, ${userName}`}</h2>
        <p className="mt-2 text-[13px] text-(--text-secondary)">{subtitle}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/clients"
            className="rounded-lg bg-(--accent) px-3 py-2 text-[12px] font-medium text-(--accent-contrast)"
          >
            + Criar cliente
          </Link>
          <Link
            href="/projects"
            className="rounded-lg border border-(--border) bg-(--bg-surface) px-3 py-2 text-[12px] font-medium text-(--text-primary)"
          >
            Criar projeto
          </Link>
          <Link
            href="/projects"
            className="rounded-lg border border-(--border) bg-(--bg-surface) px-3 py-2 text-[12px] font-medium text-(--text-primary)"
          >
            Artefatos
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-(--border-strong) bg-(--bg-elevated) px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-(--accent-soft) text-lg text-(--accent-strong)">
            V
          </span>
          <div>
            <p className="text-[13px] font-medium text-(--accent-strong)">Voice Room disponível</p>
            <p className="text-[12px] text-(--brand-ink)">
              Converse com o Kairos sobre o projeto ativo em tempo real.
            </p>
          </div>
        </div>
        <Link
          href="/voice"
          className="rounded-lg bg-(--accent) px-3 py-2 text-[12px] font-medium text-(--accent-contrast)"
        >
          Abrir
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <MetricCard label="Projetos" icon="P" value={counters.totalProjects} sub="Base operacional cadastrada" />
        <MetricCard label="Ativos" icon="A" value={counters.activeProjects} sub="Projetos em operação" />
        <MetricCard
          label="Em risco"
          icon="R"
          value={counters.riskyProjects}
          sub={counters.riskyProjects > 0 ? "Projetos com atenção imediata" : "Nenhum projeto em risco"}
          tone={counters.riskyProjects > 0 ? "danger" : "default"}
        />
        <MetricCard label="Artefatos" icon="F" value={counters.artifacts} sub="Conhecimentos e registros do projeto" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-(--border) bg-(--bg-surface) p-4">
          <div className="card-header">
            <p className="card-title">Sem atualização recente</p>
            <Link href="/projects" className="card-link">
              ver todos
            </Link>
          </div>
          {staleProjects.length === 0 ? (
            <p className="text-[12px] text-(--text-tertiary)">Nenhum projeto cadastrado.</p>
          ) : (
            <div>
              {staleProjects.map((item, index) => {
                const ageInDays = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                const stale = ageInDays >= 7;
                return (
                  <div
                    key={item.id}
                    className={[
                      "flex items-center justify-between gap-3 py-3",
                      index < staleProjects.length - 1 ? "border-b border-(--border)" : "",
                    ].join(" ")}
                  >
                    <div>
                      <p className="text-[13px] font-medium text-(--text-primary)">{item.name}</p>
                      <p className="mt-1 text-[11px] text-(--text-tertiary)">{formatProjectAge(item.createdAt)}</p>
                    </div>
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-[11px] font-medium",
                        stale
                          ? "bg-(--warning-soft) text-(--warning)"
                          : "bg-(--success-soft) text-(--success)",
                      ].join(" ")}
                    >
                      {stale ? "7+ dias" : "Ativo"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="rounded-xl border border-(--border) bg-(--bg-surface) p-4">
          <div className="card-header">
            <p className="card-title">Projetos em risco</p>
            <Link href="/projects" className="card-link">
              ver todos
            </Link>
          </div>
          {counters.riskyProjects === 0 ? (
            <div className="flex min-h-36 flex-col items-center justify-center gap-2 text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-(--success-soft) text-(--success)">
                C
              </span>
              <p className="text-[12px] text-(--text-tertiary)">Nenhum projeto em risco</p>
            </div>
          ) : (
            <div className="space-y-3">
              {risks.slice(0, 4).map((risk) => (
                <div key={risk.id} className="rounded-xl border border-(--border) bg-(--bg-muted) px-3 py-3">
                  <p className="text-[13px] font-medium text-(--text-primary)">{risk.title}</p>
                  <p className="mt-1 text-[11px] text-(--danger)">Status: {risk.status}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>

      {project ? (
        <article className="rounded-xl border border-(--border) bg-(--bg-surface) p-4">
          <div className="card-header">
            <p className="card-title">Projeto ativo</p>
          </div>
          <p className="text-[13px] font-medium text-(--text-primary)">{project.name}</p>
          <p className="mt-1 text-[12px] text-(--text-secondary)">
            Cliente: {project.clientName || "Não vinculado"} · Status: {project.status}
          </p>
          <p className="mt-2 text-[13px] text-(--text-secondary)">{project.objective || project.context || "Sem objetivo definido."}</p>
          {board ? (
            <p className="mt-3 text-[11px] text-(--text-tertiary)">
              Quadro atual: {board.columns.reduce((total, column) => total + column.cards.length, 0)} cards em execução.
            </p>
          ) : null}
        </article>
      ) : null}

      {statusMessage ? (
        <div className="rounded-xl border border-(--border) bg-(--bg-surface) p-4 text-[13px] text-(--text-secondary)">
          {statusMessage}
        </div>
      ) : null}
    </section>
  );
}

function openRiskProjects(risks: RiskItem[], activeProjectId: string | null) {
  if (!activeProjectId) return 0;
  return risks.some((item) => item.status === "aberto" || item.status === "em_mitigacao") ? 1 : 0;
}

function MetricCard({
  label,
  icon,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  icon: string;
  value: number;
  sub: string;
  tone?: "default" | "danger";
}) {
  return (
    <article className="rounded-xl border border-(--border) bg-(--bg-surface) p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.05em] text-(--text-secondary)">{label}</p>
        <DashboardIcon label={icon} />
      </div>
      <p className={["mt-3 text-[28px] font-medium", tone === "danger" ? "text-(--danger)" : "text-(--text-primary)"].join(" ")}>{value}</p>
      <p className="mt-1 text-[11px] text-(--text-tertiary)">{sub}</p>
    </article>
  );
}
