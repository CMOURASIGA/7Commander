"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Kind = "projetos" | "prospects" | "oportunidades" | "internas";
type Column = "todo" | "doing" | "done";
type WorkItem = { id: string; kind: Kind; contextId: string; title: string; description: string; creator: string; assignee: string; dueDate: string; column: Column };
const contexts: Record<Kind, Array<{ id: string; name: string }>> = {
  projetos: [{ id: "proj-demo", name: "Projeto de demonstração" }, { id: "proj-beta", name: "Projeto Beta" }],
  prospects: [{ id: "prospect-clinica", name: "Clínica ABC" }, { id: "prospect-empresa", name: "Empresa Beta" }],
  oportunidades: [{ id: "oportunidade-a", name: "Proposta comercial ABC" }],
  internas: [{ id: "interna", name: "Consult Services" }],
};
const columns: Array<{ id: Column; name: string }> = [
  { id: "todo", name: "TO DO" }, { id: "doing", name: "DOING" }, { id: "done", name: "DONE" },
];
const seed: WorkItem[] = [
  { id: "mock-1", kind: "prospects", contextId: "prospect-clinica", title: "Retornar contato", description: "Confirmar reunião de apresentação", creator: "Eu", assignee: "Rodrigo", dueDate: "2026-10-29", column: "todo" },
  { id: "mock-2", kind: "projetos", contextId: "proj-demo", title: "Revisar documentação", description: "Analisar entregáveis", creator: "Rodrigo", assignee: "Eu", dueDate: "2026-10-28", column: "doing" },
  { id: "mock-3", kind: "internas", contextId: "interna", title: "Revisar proposta comercial", description: "", creator: "Eu", assignee: "Rodrigo", dueDate: "", column: "todo" },
];
const STORE = "7commander:mock-workitems:v1";
const kinds: Array<{id:Kind;name:string}> = [
  { id: "projetos", name: "Projetos" },{ id: "prospects", name: "Prospects" },
  { id: "oportunidades", name: "Oportunidades" },{ id: "internas", name: "Internas" },
];
function validate(value: unknown): WorkItem[] {
  if (!Array.isArray(value)) return seed;
  return value.filter((item):item is WorkItem =>
    item && typeof item.id === "string" && kinds.some(k => k.id === item.kind) &&
    typeof item.contextId === "string" && typeof item.title === "string" &&
    ["todo", "doing", "done"].includes(item.column) &&
    typeof item.creator === "string" && typeof item.assignee === "string" &&
    typeof item.dueDate === "string" && typeof item.description === "string");
}
export default function MulticontextActivitiesMock() {
  const [items, setItems] = useState<WorkItem[]>(seed);
  const [ready, setReady] = useState(false);
  const [kind, setKind] = useState<Kind>("projetos");
  const [contextId, setContextId] = useState("proj-demo");
  const [filter, setFilter] = useState<"todas"|"minhas"|"delegadas"|"criadas">("todas");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("Eu");
  const [dueDate, setDueDate] = useState("");
  useEffect(() => {
    try { const raw = window.localStorage.getItem(STORE); if (raw) setItems(validate(JSON.parse(raw))); } catch { /* mock seed fallback */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) window.localStorage.setItem(STORE, JSON.stringify(items)); }, [items,ready]);
  const own = useMemo(() => items.filter(item => item.assignee === "Eu" && item.column !== "done"), [items]);
  const visible = useMemo(() => items.filter(item =>
    (pendingOnly || (item.kind === kind && item.contextId === contextId)) &&
    (!pendingOnly || (item.assignee === "Eu" && item.column !== "done")) &&
    (filter === "todas" || filter === "minhas" && item.assignee === "Eu" ||
      filter === "delegadas" && item.creator === "Eu" && item.assignee !== "Eu" ||
      filter === "criadas" && item.creator === "Eu")), [items,pendingOnly,kind,contextId,filter]);
  const mutate = (id:string, column:Column) => setItems(prev => prev.map(item => item.id === id ? {...item,column} : item));
  const add = () => {
    if (!title.trim()) return;
    setItems(prev => [...prev, { id: crypto.randomUUID(), kind, contextId, title:title.trim(), description:"", creator:"Eu", assignee, dueDate, column:"todo" }]);
    setTitle(""); setDueDate("");
  };
  return (
    <main className="space-y-5 px-1 pb-10">
      <div className="rounded-xl border border-(--border) bg-(--bg-surface) p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h1 className="text-xl font-semibold">Atividades multicontexto</h1><p className="mt-1 text-sm text-(--text-secondary)">Gerencie atividades por projeto, prospect ou oportunidade sem misturar os contextos.</p></div>
          <Link href="/activities" className="rounded-lg border border-(--border) px-3 py-2 text-sm">Kanban atual</Link>
        </div>
        <p role="status" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          HOMOLOGAÇÃO MOCK — dados sintéticos salvos somente neste navegador. Nenhuma operação consulta ou modifica o Supabase de produção.
        </p>
      </div>
      <div className="rounded-xl border border-(--border) bg-(--bg-surface) p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPendingOnly(false)} className={`rounded-lg border px-3 py-2 text-sm ${!pendingOnly?"bg-(--accent) text-white":""}`}>Kanban por contexto</button>
          <button type="button" onClick={() => {setPendingOnly(true);setFilter("todas");}} className={`rounded-lg border px-3 py-2 text-sm ${pendingOnly?"bg-(--accent) text-white":""}`}>Minhas pendências ({own.length})</button>
        </div>
        {!pendingOnly && <><div className="flex flex-wrap gap-2" role="group" aria-label="Origem das atividades">
          {kinds.map(k => <button key={k.id} type="button" onClick={() => {setKind(k.id);setContextId(contexts[k.id][0].id);}} aria-pressed={kind === k.id} className={`rounded-lg border px-3 py-2 text-sm ${kind === k.id?"bg-(--accent) text-white":""}`}>{k.name}</button>)}
        </div>
        <label className="block text-sm">Contexto
          <select className="mt-1 block w-full rounded-lg border border-(--border) bg-(--bg-surface) px-3 py-2" value={contextId} onChange={e=>setContextId(e.target.value)}>
            {contexts[kind].map(ctx=><option key={ctx.id} value={ctx.id}>{ctx.name}</option>)}
          </select>
        </label></>}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar atividades">
          {([["todas","Todas"],["minhas","Minhas"],["delegadas","Delegadas"],["criadas","Criadas por mim"]] as const).map(([id,label])=>
            <button key={id} type="button" onClick={()=>setFilter(id)} aria-pressed={filter === id} className={`rounded-full border px-3 py-1.5 text-sm ${filter===id?"bg-(--accent) text-white":""}`}>{label}</button>)}
        </div>
      </div>
      {!pendingOnly && <form onSubmit={e=>{e.preventDefault();add();}} className="grid gap-2 rounded-xl border border-(--border) bg-(--bg-surface) p-4 md:grid-cols-[1fr_140px_160px_auto]">
        <input aria-label="Título da atividade" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nova atividade..." required maxLength={120} className="min-w-0 rounded-lg border border-(--border) p-2 text-sm"/>
        <select aria-label="Responsável" value={assignee} onChange={e=>setAssignee(e.target.value)} className="rounded-lg border border-(--border) p-2 text-sm"><option>Eu</option><option>Rodrigo</option></select>
        <input aria-label="Data final" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="rounded-lg border border-(--border) p-2 text-sm"/>
        <button type="submit" className="rounded-lg bg-(--accent) px-3 py-2 text-sm text-white">Criar</button>
      </form>}
      {pendingOnly ? <div className="space-y-2">{visible.length ? visible.map(item=><div key={item.id} className="rounded-xl border border-(--border) bg-(--bg-surface) p-3"><p className="font-medium">{item.title}</p><p className="text-xs text-(--text-secondary)">{kinds.find(k=>k.id===item.kind)?.name} · {contexts[item.kind].find(c=>c.id===item.contextId)?.name} · Entrega: {item.dueDate || "sem prazo"}</p><button type="button" onClick={()=>mutate(item.id,"done")} className="mt-2 rounded border px-2 py-1 text-xs">Concluir</button></div>) : <p className="text-sm text-(--text-secondary)">Nenhuma pendência nesta seleção.</p>}</div> :
      <div className="grid gap-3 md:grid-cols-3">{columns.map(col=><section key={col.id} className="min-h-64 rounded-xl border border-(--border) bg-(--bg-surface) p-3"><h2 className="mb-3 text-xs font-bold tracking-wider">{col.name}</h2><div className="space-y-2">{visible.filter(item=>item.column===col.id).map(item=><article key={item.id} className="space-y-2 rounded-lg border border-(--border) bg-(--bg-muted) p-3"><h3 className="text-sm font-medium">{item.title}</h3><p className="text-xs text-(--text-secondary)">Responsável: {item.assignee} · Criada por: {item.creator}</p>{item.dueDate&&<p className="text-xs">Entrega: {item.dueDate.split("-").reverse().join("/")}</p>}<div className="flex flex-wrap gap-1">{columns.filter(x=>x.id!==col.id).map(target=><button key={target.id} type="button" onClick={()=>mutate(item.id,target.id)} className="rounded border border-(--border) px-2 py-1 text-xs">Mover para {target.name}</button>)}</div></article>)}</div></section>)}</div>}
      <button type="button" className="rounded-lg border border-(--border) px-3 py-2 text-xs" onClick={()=>setItems(seed)}>Restaurar dados de demonstração</button>
    </main>
  );
}
