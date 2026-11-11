"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { PageIntro, StatusPill } from "@/components/ui/workspace-primitives";
import type { Decision, DecisionStatus } from "@/types/decision";

type Project = {id:string;name:string;clientName:string|null};
const statuses:Record<DecisionStatus,string>={aberta:"Aberta",em_andamento:"Em andamento",concluida:"Concluída",cancelada:"Cancelada"};

export default function DecisionsHubPage() {
  const [projects,setProjects]=useState<Project[]>([]);
  const [decisions,setDecisions]=useState<Decision[]>([]);
  const [projectId,setProjectId]=useState("");
  const [status,setStatus]=useState<"all"|DecisionStatus>("all");
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [detail,setDetail]=useState<Decision|null>(null);
  useEffect(()=>{
    let mounted=true;
    fetch("/api/projects",{headers:getClientAuthHeaders(),cache:"no-store"}).then(async r=>{
      if(!r.ok)throw Error("Não foi possível carregar os projetos.");
      return r.json();
    }).then(body=>{if(mounted)setProjects((body.data??[]) as Project[]);}).catch(e=>{
      if(mounted)setError(e instanceof Error?e.message:"Falha ao consultar projetos.");
    });
    return()=>{mounted=false};
  },[]);
  useEffect(()=>{
    let mounted=true;
    setLoading(true);setError("");
    const uri=projectId?`/api/decisions?projectId=${encodeURIComponent(projectId)}`:"/api/decisions";
    fetch(uri,{headers:getClientAuthHeaders(),cache:"no-store"}).then(async r=>{
      const body=await r.json();
      if(!r.ok)throw Error(body?.error||"Falha ao consultar decisões.");
      return body;
    }).then(body=>{if(mounted)setDecisions((body.data??[]) as Decision[]);})
      .catch(e=>{if(mounted){setError(e instanceof Error?e.message:"Falha ao consultar decisões.");setDecisions([]);}})
      .finally(()=>{if(mounted)setLoading(false);});
    return()=>{mounted=false};
  },[projectId]);
  const projectNames=useMemo(()=>new Map(projects.map(p=>[p.id,p.name])),[projects]);
  const filtered=decisions.filter(d=>(status==="all"||d.status===status)&&
    [d.title,d.context,d.reason,d.impact].join(" ").toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")))
    .sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const pending=decisions.filter(d=>d.status==="aberta"||d.status==="em_andamento").length;
  return <section className="space-y-4">
    <PageIntro eyebrow="Governança" title="Central de Decisões"
      description="Consulte decisões, evidências e vínculos com os projetos sem perder o histórico de origem."
      aside={<Link href="/projects" className="workspace-button-primary text-xs">Registrar ou editar no projeto</Link>}/>
    <div className="grid gap-3 sm:grid-cols-3">
      {[["Decisões consultadas",loading?"...":decisions.length],["Pendentes",loading?"...":pending],["Concluídas",loading?"...":decisions.filter(d=>d.status==="concluida").length]].map(([label,value])=>
        <div key={String(label)} className="workspace-card p-4"><p className="text-xs text-(--text-secondary)">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}
    </div>
    <div className="workspace-card grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_220px_170px]">
      <label className="text-sm">Pesquisar
        <input className="workspace-input mt-1 w-full" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Assunto, contexto ou justificativa"/>
      </label>
      <label className="text-sm">Projeto
        <select className="workspace-select mt-1 w-full" value={projectId} onChange={e=>setProjectId(e.target.value)}>
          <option value="">Todos os projetos acessíveis</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="text-sm">Situação
        <select className="workspace-select mt-1 w-full" value={status} onChange={e=>setStatus(e.target.value as "all"|DecisionStatus)}>
          <option value="all">Todas</option>{(Object.keys(statuses) as DecisionStatus[]).map(s=><option key={s} value={s}>{statuses[s]}</option>)}
        </select>
      </label>
    </div>
    <div className="workspace-card p-4">
      <div className="mb-3 flex justify-between gap-3"><h2 className="font-semibold">Registro de decisões</h2><StatusPill>{filtered.length} encontradas</StatusPill></div>
      {error?<p role="alert" className="text-sm text-(--danger)">{error}</p>:loading?<p className="text-sm">Carregando decisões...</p>:
        filtered.length===0?<p className="rounded-xl border border-dashed border-(--border) p-5 text-sm">Nenhuma decisão encontrada. Abra o projeto para registrar uma nova decisão ou utilize o Kairos.</p>:
        <div className="space-y-2">{filtered.map(d=><button type="button" key={d.id} onClick={()=>setDetail(d)}
          className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-(--border) p-3 text-left hover:border-(--accent)">
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{d.title}</p>
            <p className="mt-1 text-xs text-(--text-secondary)">{projectNames.get(d.projectId??"")||"Sem projeto vinculado"} · {new Date(d.createdAt).toLocaleDateString("pt-BR")}</p>
          </div><span className="rounded-full bg-(--bg-muted) px-3 py-1 text-xs">{statuses[d.status]}</span>
        </button>)}</div>}
    </div>
    {detail?<div className="fixed inset-0 z-50">
      <button type="button" aria-label="Fechar decisão" className="absolute inset-0 bg-black/35" onClick={()=>setDetail(null)}/>
      <aside role="dialog" aria-modal="true" aria-label="Detalhes da decisão" className="relative ml-auto h-dvh w-full max-w-2xl overflow-y-auto bg-(--bg-surface) p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-(--text-secondary)">{projectNames.get(detail.projectId??"")||"Sem projeto"}</p><h2 className="mt-2 text-lg font-semibold">{detail.title}</h2></div>
          <button type="button" className="workspace-button-secondary text-xs" onClick={()=>setDetail(null)}>Fechar</button></div>
        <p className="mt-2 text-xs text-(--text-secondary)">Status: {statuses[detail.status]} · Data: {new Date(detail.createdAt).toLocaleString("pt-BR")}</p>
        {[["Contexto",detail.context],["Justificativa",detail.reason],["Impacto",detail.impact]].map(([label,value])=><section key={label} className="mt-4 border-t border-(--border) pt-3">
          <h3 className="text-sm font-semibold">{label}</h3><MarkdownContent className="mt-2" content={value||"Não informado."}/>
        </section>)}
        <div className="mt-5 flex gap-2"><Link href="/projects" className="workspace-button-primary text-xs">Abrir Projetos para editar</Link><Link href="/status-report" className="workspace-button-secondary text-xs">Status Report</Link></div>
      </aside>
    </div>:null}
  </section>;
}
