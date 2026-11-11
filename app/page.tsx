"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";

type Project = {
  id: string;
  name: string;
  status: string;
  clientName: string | null;
  objective?: string;
  context?: string;
  createdAt: string;
};
type Task = {
  id: string;
  title: string;
  priority: "baixa" | "media" | "alta" | "critica";
  status: "aberta" | "em_andamento" | "concluida";
  columnKey: "todo" | "doing" | "done";
  dueDate?: string | null;
  responsible?: string | null;
};
type Board = { columns: Array<{ cards: Task[] }> };
type Risk = { id: string; title: string; impact?: string | null; status: "aberto" | "em_mitigacao" | "mitigado" | "encerrado" };
type Detail = { board: Board | null; risks: Risk[]; tasksError: boolean; risksError: boolean };
type ProjectAttention = { project: Project; task: Task; days: number };
type ManagementStatus = "Indisponível" | "Sem planejamento" | "Crítico" | "Atenção" | "Em dia";
function managementStatus(info: { incomplete: boolean; total: number; delayed: number; soon: number; risks: Risk[]; unassigned: number }): ManagementStatus {
  if (info.incomplete) return "Indisponível";
  if (info.total === 0) return "Sem planejamento";
  if (info.delayed > 0 || info.risks.some(r => openRisk(r) && /cr[ií]tic[oa]|muito alto/i.test(r.impact || ""))) return "Crítico";
  if (info.soon > 0 || info.unassigned > 0 || info.risks.some(openRisk)) return "Atenção";
  return "Em dia";
}
const managementTone: Record<ManagementStatus, string> = {
  "Indisponível": "bg-(--bg-muted) text-(--text-secondary)",
  "Sem planejamento": "bg-(--warning-soft) text-(--warning)",
  "Crítico": "bg-(--danger-soft) text-(--danger)",
  "Atenção": "bg-(--warning-soft) text-(--warning)",
  "Em dia": "bg-(--success-soft) text-(--success)",
};

const isOpen = (task: Task) => task.columnKey !== "done" && task.status !== "concluida";
const openRisk = (risk: Risk) => risk.status === "aberto" || risk.status === "em_mitigacao";
const dateKey = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
const dueKey = (value: string | null | undefined) => {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match?.[1] ?? null;
};
const daysUntil = (due: string, today: string) => Math.round((Date.parse(due + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) / 86400000);
const plural = (count: number, singular: string, multiple: string) => count === 1 ? singular : multiple;

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}
function displayName(email?: string | null) {
  return (email?.split("@")[0] || "operador").split(/[.\s_-]+/).filter(Boolean).map(p => p[0].toUpperCase() + p.slice(1)).join(" ");
}

function Metric({ label, value, detail, warning = false }: { label: string; value: number | string; detail: string; warning?: boolean }) {
  return <article className="rounded-xl border border-(--border) bg-(--bg-surface) p-4">
    <p className="text-[11px] uppercase tracking-[0.05em] text-(--text-secondary)">{label}</p>
    <p className={["mt-3 text-[28px] font-medium", warning ? "text-(--danger)" : "text-(--text-primary)"].join(" ")}>{value}</p>
    <p className="mt-1 text-[13px] text-(--text-tertiary)">{detail}</p>
  </article>;
}

export default function HomePage() {
  const auth = useKairosAuth();
  const canLoad = !auth.loading && (!auth.required || Boolean(auth.user));
  const [projects, setProjects] = useState<Project[]>([]);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [referenceDate, setReferenceDate] = useState(() => dateKey(new Date()));

  useEffect(() => {
    if (!canLoad) { setCanCreate(false); return; }
    let live = true;
    void (async () => {
      try {
        const res = await fetch("/api/organizations/mine", { headers: getClientAuthHeaders(), cache: "no-store", credentials: "same-origin" });
        const payload = await res.json().catch(() => ({}));
        const members = Array.isArray(payload?.data) ? payload.data : [];
        if (live) setCanCreate(res.ok && members.some((m: { role?: string }) => ["owner", "admin", "manager"].includes(m.role || "")));
      } catch { if (live) setCanCreate(false); }
    })();
    return () => { live = false; };
  }, [canLoad]);

  useEffect(() => {
    if (!canLoad) return;
    let live = true;
    void (async () => {
      setLoading(true);
      setError(null);
      setDenied(false);
      setProjects([]);
      setDetails({});
      setReferenceDate(dateKey(new Date()));
      try {
        const response = await fetch("/api/projects", { headers: getClientAuthHeaders(), cache: "no-store", credentials: "same-origin" });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          if (live) setDenied(true);
          throw new Error("Acesso operacional não autorizado.");
        }
        if (!response.ok || !Array.isArray(payload?.data)) throw new Error(payload?.error || "Não foi possível carregar projetos.");
        const listed = payload.data as Project[];
        if (!live) return;
        setProjects(listed);
        const active = listed.filter(p => p.status === "ativo");
        // Only load the projects that the authorized projects endpoint returned.
        // Project-specific APIs independently enforce tenant and membership permissions.
        const entries = await Promise.all(active.map(async project => {
          const endpoints = [
            "/api/projects/" + encodeURIComponent(project.id) + "/tasks",
            "/api/projects/" + encodeURIComponent(project.id) + "/risks",
          ];
          const responses = await Promise.allSettled(endpoints.map(url =>
            fetch(url, { headers: getClientAuthHeaders(), cache: "no-store", credentials: "same-origin" })
          ));
          const parsed = await Promise.all(responses.map(async result => {
            if (result.status !== "fulfilled" || !result.value.ok) return { ok: false, data: null };
            const json = await result.value.json().catch(() => null);
            return { ok: Boolean(json && "data" in json), data: json?.data ?? null };
          }));
          const board = parsed[0].ok && parsed[0].data?.columns ? parsed[0].data as Board : null;
          const risks = parsed[1].ok && Array.isArray(parsed[1].data) ? parsed[1].data as Risk[] : [];
          return [project.id, { board, risks, tasksError: !board, risksError: !parsed[1].ok || !Array.isArray(parsed[1].data) }] as const;
        }));
        if (live) setDetails(Object.fromEntries(entries));
      } catch (cause) {
        if (live) setError(cause instanceof Error ? cause.message : "Falha ao carregar o Dashboard.");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [canLoad]);

  const active = useMemo(() => projects.filter(p => p.status === "ativo"), [projects]);
  const unavailable = active.some(p => !details[p.id] || details[p.id].tasksError || details[p.id].risksError);
  const analysis = useMemo(() => {
    let risky = 0;
    let overdue = 0;
    let dueSoon = 0;
    const attention: ProjectAttention[] = [];
    const summaries = active.map(project => {
      const detail = details[project.id];
      const cards = detail?.board?.columns.flatMap(col => col.cards) ?? [];
      const openRisks = detail?.risks.filter(openRisk).length ?? 0;
      const open = cards.filter(isOpen);
      const delayed = open.filter(task => {
        const due = dueKey(task.dueDate);
        return due !== null && due < referenceDate;
      });
      const soon = open.filter(task => {
        const due = dueKey(task.dueDate);
        return due !== null && due >= referenceDate && daysUntil(due, referenceDate) <= 7;
      });
      risky += openRisks > 0 ? 1 : 0;
      overdue += delayed.length;
      dueSoon += soon.length;
      for (const task of [...delayed, ...soon]) {
        const due = dueKey(task.dueDate);
        if (due) attention.push({ project, task, days: daysUntil(due, referenceDate) });
      }
      const unassigned = open.filter(task => !task.responsible?.trim()).length;
      const incomplete = !detail || detail.tasksError || detail.risksError;
      const health = managementStatus({ incomplete, total: cards.length, delayed: delayed.length, soon: soon.length, risks: detail?.risks ?? [], unassigned });
      return { project, risks: openRisks, delayed: delayed.length, soon: soon.length, open: open.length, unassigned, incomplete, health };
    });
    attention.sort((a,b) => a.days - b.days);
    return { risky, overdue, dueSoon, attention: attention.slice(0, 6), summaries };
  }, [active, details, referenceDate]);

  if (denied) return <section role="alert" className="rounded-xl border border-(--border) bg-(--bg-surface) p-6">
    <h2 className="text-xl font-semibold">Acesso operacional ainda não confirmado</h2>
    <p className="mt-3 text-sm">Sua identidade foi autenticada, mas a autorização para acessar os dados da empresa não foi confirmada. Consulte os vínculos locais e o 7Service.</p>
  </section>;

  return <section className="space-y-4">
    <header className="rounded-xl border border-(--border) bg-(--bg-surface) p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-(--accent)">Visão geral da empresa</p>
      <h2 className="mt-2 text-2xl font-semibold text-(--text-primary)">{greeting()}, {displayName(auth.user?.email)}</h2>
      <p className="mt-2 text-[13px] text-(--text-secondary)">{loading ? "Carregando indicadores dos projetos..." : error ? "Indicadores indisponíveis." : active.length + " " + plural(active.length, "projeto ativo", "projetos ativos") + " em acompanhamento."}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {canCreate && <Link className="workspace-button-primary rounded-lg px-3 py-2 text-[13px]" href="/projects">Criar projeto</Link>}
        {canCreate && <Link className="rounded-lg border border-(--border) px-3 py-2 text-[13px]" href="/clients">Criar cliente</Link>}
        <Link className="rounded-lg border border-(--border) px-3 py-2 text-[13px]" href="/projects">Artefatos</Link>
      </div>
    </header>

    <nav aria-label="Acessos operacionais" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        {href:"/projects",title:"Projetos",description:"Visão geral, riscos e decisões"},
        {href:"/clients",title:"Clientes",description:"Cadastros e vínculos"},
        {href:"/scrum",title:"Scrum",description:"Sprints e planejamento"},
        {href:"/activities",title:"Atividades",description:"Kanban e prioridades"},
      ].map(action=><Link key={action.href} href={action.href}
        className="workspace-card p-4 transition-colors hover:border-(--accent)">
        <h3 className="text-sm font-semibold text-(--text-primary)">{action.title}</h3>
        <p className="mt-1 text-xs text-(--text-secondary)">{action.description}</p>
      </Link>)}
    </nav>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--border-strong) bg-(--bg-elevated) px-4 py-3">
      <div><p className="text-[13px] font-medium text-(--accent-strong)">Voice Room disponível</p><p className="text-[13px] text-(--brand-ink)">Converse com o Kairos sobre o projeto selecionado em tempo real.</p></div>
      <Link href="/voice" className="workspace-button-primary rounded-lg px-3 py-2 text-[13px]">Abrir</Link>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Projetos" value={loading || error ? "–" : projects.length} detail="Projetos cadastrados" />
      <Metric label="Ativos" value={loading || error ? "–" : active.length} detail="Projetos em operação" />
      <Metric label="Em risco" value={loading || error || unavailable ? "–" : analysis.risky} detail={unavailable ? "Dados incompletos, revise os quadros" : "Projetos com riscos abertos"} warning={!unavailable && analysis.risky > 0} />
      <Metric label="Tarefas atrasadas" value={loading || error || unavailable ? "–" : analysis.overdue} detail={unavailable ? "Dados incompletos, revise os quadros" : "Atividades vencidas não concluídas"} warning={!unavailable && analysis.overdue > 0} />
    </div>

    {error && <div role="alert" className="rounded-xl border border-(--border) bg-(--bg-surface) p-4 text-sm text-(--danger)">{error}</div>}
    {!error && !loading && unavailable && <div role="status" className="rounded-xl border border-(--border) bg-(--bg-surface) p-3 text-[13px] text-(--warning)">Nem todos os quadros ou riscos puderam ser consultados. Valores ausentes não são considerados zero.</div>}

    <div className="grid gap-3 lg:grid-cols-2">
      <article className="rounded-xl border border-(--border) bg-(--bg-surface) p-4">
        <div className="flex items-center justify-between gap-2"><h3 className="font-medium text-(--text-primary)">Pendências que exigem atenção</h3><Link href="/activities" className="card-link">Abrir Kanban</Link></div>
        {loading ? <p className="mt-4 text-sm">Consultando atividades...</p> : analysis.attention.length ? <div className="mt-3 divide-y divide-(--border)">
          {analysis.attention.map(({ project, task, days }) => <div key={project.id + ":" + task.id} className="py-3">
            <p className="text-[13px] font-medium text-(--text-primary)">{task.title}</p>
            <p className="mt-1 text-[12px] text-(--text-secondary)">{project.name} · {days < 0 ? "Atrasada há " + Math.abs(days) + " dia(s)" : days === 0 ? "Vence hoje" : "Vence em " + days + " dia(s)"}</p>
          </div>)}
        </div> : <p className="mt-4 text-[13px] text-(--text-secondary)">{unavailable ? "Não foi possível verificar todas as pendências." : "Nenhuma atividade vencida ou com prazo nos próximos 7 dias."}</p>}
      </article>
      <article className="rounded-xl border border-(--border) bg-(--bg-surface) p-4">
        <div className="flex items-center justify-between gap-2"><h3 className="font-medium text-(--text-primary)">Próximos prazos</h3><Link href="/activities" className="card-link">Ver atividades</Link></div>
        <p className="mt-4 text-[28px] font-medium text-(--text-primary)">{loading || error || unavailable ? "–" : analysis.dueSoon}</p>
        <p className="mt-1 text-[13px] text-(--text-secondary)">Atividades abertas que vencem em até 7 dias, incluindo hoje.</p>
        <p className="mt-4 text-[13px] text-(--text-tertiary)">Os prazos são calculados pela data de vencimento registrada no Kanban, não pela data de criação do projeto.</p>
      </article>
    </div>

    <article className="rounded-xl border border-(--border) bg-(--bg-surface) p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium text-(--text-primary)">Projetos em acompanhamento</h3><Link href="/projects" className="card-link">Ver todos</Link></div>
      {loading ? <p className="mt-4 text-[13px]">Carregando projetos...</p> : active.length === 0 ? <p className="mt-4 text-[13px] text-(--text-secondary)">Nenhum projeto ativo cadastrado.</p> : <div className="mt-3 divide-y divide-(--border)">
        {analysis.summaries.map(({ project, risks, delayed, soon, open, unassigned, incomplete, health }) => <div key={project.id} className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-(--text-primary)">{project.name}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className={["rounded-full px-3 py-1 text-[12px]", managementTone[health]] .join(" ")}>{health}</span>
              <span className="rounded-full bg-(--success-soft) px-3 py-1 text-[12px] text-(--success)">Ativo</span>
              <Link href={"/projects?projectId=" + encodeURIComponent(project.id)} className="rounded-lg border border-(--border) bg-(--bg-surface) px-3 py-2 text-[12px] font-medium text-(--text-primary) hover:bg-(--bg-muted)" aria-label={"Abrir projeto " + project.name}>Abrir projeto</Link>
            </div>
          </div>
          <p className="mt-1 text-[12px] text-(--text-secondary)">Cliente: {project.clientName || "Não vinculado"}</p>
          <p className="mt-2 text-[13px] text-(--text-secondary)">{project.objective || project.context || "Sem objetivo definido."}</p>
          <p className="mt-2 text-[12px] text-(--text-tertiary)">{incomplete ? "Indicadores parcialmente indisponíveis" : open + " abertas · " + delayed + " atrasadas · " + soon + " vencem em 7 dias · " + risks + " riscos abertos · " + unassigned + " sem responsável"}</p>
        </div>)}
      </div>}
    </article>
  </section>;
}
