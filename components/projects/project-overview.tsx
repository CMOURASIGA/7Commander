"use client";

import { useState } from "react";
import { decodeStakeholders, STAKEHOLDER_GROUP_LABELS, type StakeholderGroup } from "@/lib/projects/stakeholders";

type Project = { name:string; clientName:string|null; status:string; description:string; maturity:string; stakeholders:string };
type Risk = {id:string;title:string;impact:string;probability:string;mitigation:string;owner:string;status:string;decisionId:string|null;taskId:string|null};
type Decision = {id:string;title:string;status:string;createdAt:string};
type Document = {id:string;title:string;category:string;createdAt:string};

export function riskLevel(input:string):number|null {
  const value=(input??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
  if (["1","baixo","baixa"].includes(value)) return 1;
  if (["2","medio","media","moderado","moderada"].includes(value)) return 2;
  if (["3","alto","alta","critico","critica"].includes(value)) return 3;
  return null;
}
export function riskSeverity(risk:Risk):string {
  const impact=riskLevel(risk.impact), probability=riskLevel(risk.probability);
  if (impact===null || probability===null) return "Não avaliado";
  const score=impact*probability;
  if (score>=9) return "Crítico";
  if (score>=6) return "Alto";
  if (score>=3) return "Moderado";
  return "Baixo";
}
export function ProjectOverview({project,risks,decisions,documents,risksLoading,decisionsLoading,documentsLoading,onOpenTab,onOpenDocument}:{
  project:Project; risks:Risk[]; decisions:Decision[]; documents:Document[];
  risksLoading:boolean;decisionsLoading:boolean;documentsLoading:boolean;
  onOpenTab:(tab:"risks"|"decisions"|"documents"|"members")=>void;
  onOpenDocument:(id:string)=>void;
}) {
  const [cell,setCell]=useState<string|null>(null);
  const [expanded,setExpanded]=useState<string|null>(null);
  const activeRisks=risks.filter(r=>r.status==="aberto"||r.status==="em_mitigacao");
  const critical=activeRisks.filter(r=>riskSeverity(r)==="Crítico").length;
  const high=activeRisks.filter(r=>riskSeverity(r)==="Alto").length;
  const unknown=activeRisks.filter(r=>riskSeverity(r)==="Não avaliado").length;
  const health=risksLoading?"Carregando":critical||high?"Atenção":unknown?"Avaliação incompleta":activeRisks.length?"Monitorar":"Sem riscos abertos";
  const stakeholders=decodeStakeholders(project.stakeholders);
  const incomplete=stakeholders.filter(s=>!s.organization.trim()||!s.role.trim()).length;
  const filtered=cell?activeRisks.filter(r=>`${riskLevel(r.impact)}-${riskLevel(r.probability)}`===cell):activeRisks;
  const formatDate=(d:string)=>d?new Date(d).toLocaleDateString("pt-BR"):"Sem data";
  const groups:StakeholderGroup[]=["cliente","consultoria","fornecedor","outro"];
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        {label:"Indicador de riscos",value:health,detail:"Não considera prazo e escopo"},
        {label:"Riscos em aberto",value:risksLoading?"...":activeRisks.length,detail:critical?`${critical} crítico(s)`:high?`${high} alto(s)`:"Do projeto selecionado"},
        {label:"Decisões registradas",value:decisionsLoading?"...":decisions.length,detail:"Histórico do projeto"},
        {label:"Stakeholders incompletos",value:incomplete,detail:`${stakeholders.length} partes interessadas`},
      ].map(item=><article key={item.label} className="workspace-card p-4">
        <p className="text-xs text-(--text-secondary)">{item.label}</p>
        <p className="mt-2 text-xl font-semibold text-(--text-primary)">{item.value}</p>
        <p className="mt-1 text-xs text-(--text-secondary)">{item.detail}</p>
      </article>)}
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,1fr)]">
      <section className="workspace-card space-y-3 p-4" aria-label="Principais riscos">
        <div className="flex items-center justify-between gap-2"><h3 className="text-base font-semibold">Riscos prioritários</h3>
          <button className="workspace-button-secondary text-xs" onClick={()=>onOpenTab("risks")}>Ver todos</button></div>
        {risksLoading?<p className="text-sm">Carregando riscos...</p>:filtered.length?filtered.slice(0,6).map(r=><article key={r.id} className="rounded-lg border border-(--border) p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-(--bg-muted) px-2 py-1 text-xs font-semibold">{riskSeverity(r)}</span>
            <strong className="flex-1 text-sm">{r.title}</strong>
          </div>
          <p className="mt-2 text-xs text-(--text-secondary)">Impacto: {r.impact||"Não informado"} · Probabilidade: {r.probability||"Não informada"} · Responsável: {r.owner||"Não definido"}</p>
          {r.mitigation?<><button className="mt-2 text-xs font-medium text-(--accent)" onClick={()=>setExpanded(expanded===r.id?null:r.id)}>{expanded===r.id?"Recolher mitigação":"Expandir mitigação"}</button>
            {expanded===r.id?<p className="mt-2 whitespace-pre-wrap text-sm">{r.mitigation}</p>:null}</>:null}
          {r.decisionId||r.taskId?<p className="mt-2 text-xs text-(--text-secondary)">Vínculos: {[r.decisionId?"decisão":null,r.taskId?"atividade":null].filter(Boolean).join(" e ")}</p>:null}
        </article>):<p className="text-sm text-(--text-secondary)">{cell?"Nenhum risco nesta célula.":"Nenhum risco em aberto."}</p>}
        {cell?<button className="workspace-button-secondary text-xs" onClick={()=>setCell(null)}>Limpar filtro da matriz</button>:null}
      </section>
      <section className="workspace-card p-4" aria-label="Matriz de riscos 3 por 3">
        <h3 className="text-base font-semibold">Matriz de riscos 3×3</h3>
        <p className="mt-1 text-xs text-(--text-secondary)">Probabilidade × impacto. Selecione uma célula para filtrar os riscos.</p>
        <div className="mt-4 grid grid-cols-[90px_repeat(3,minmax(0,1fr))] gap-1 text-center text-xs">
          <span className="self-center text-(--text-secondary)">Prob. / Impacto</span>
          {[1,2,3].map(n=><span key={n} className="p-2 font-semibold">{n}</span>)}
          {[3,2,1].flatMap(prob=>[
            <span key={`label-${prob}`} className="self-center font-semibold">{prob}</span>,
            ...[1,2,3].map(impact=>{
              const matching=activeRisks.filter(r=>riskLevel(r.impact)===impact&&riskLevel(r.probability)===prob);
              const score=impact*prob;
              return <button key={`${impact}-${prob}`} type="button" aria-pressed={cell===`${impact}-${prob}`}
                aria-label={`Impacto ${impact}, probabilidade ${prob}, ${matching.length} riscos`}
                onClick={()=>setCell(cell===`${impact}-${prob}`?null:`${impact}-${prob}`)}
                className={`min-h-16 rounded-md border p-2 font-semibold ${score>=9?"border-red-300 bg-red-100 text-red-900":score>=6?"border-orange-300 bg-orange-100 text-orange-900":score>=3?"border-amber-200 bg-amber-50 text-amber-900":"border-green-200 bg-green-50 text-green-900"} ${cell===`${impact}-${prob}`?"ring-2 ring-(--accent)":""}`}>{matching.length}</button>;
            })
          ])}
        </div>
        {unknown>0?<p className="mt-3 text-xs text-(--text-secondary)">{unknown} risco(s) fora da matriz por avaliação incompleta.</p>:null}
      </section>
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="workspace-card p-4"><div className="flex justify-between gap-2"><h3 className="font-semibold">Decisões</h3><button className="text-xs text-(--accent)" onClick={()=>onOpenTab("decisions")}>Abrir</button></div>
        {decisionsLoading?<p className="mt-3 text-sm">Carregando...</p>:decisions.length?<div className="mt-3 space-y-2">{[...decisions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,3).map(d=><p key={d.id} className="border-b border-(--border) pb-2 text-sm">{d.title}<span className="block text-xs text-(--text-secondary)">{formatDate(d.createdAt)} · {d.status}</span></p>)}</div>:<div className="mt-3"><p className="text-sm text-(--text-secondary)">Nenhuma decisão registrada.</p><button className="workspace-button-secondary mt-3 text-xs" onClick={()=>onOpenTab("decisions")}>Registrar decisão</button></div>}
      </section>
      <section className="workspace-card p-4"><div className="flex justify-between gap-2"><h3 className="font-semibold">Equipe e envolvidos</h3><button className="text-xs text-(--accent)" onClick={()=>onOpenTab("members")}>Ver equipe</button></div>
        {stakeholders.length?groups.map(g=>{const items=stakeholders.filter(s=>s.group===g);return items.length?<div key={g} className="mt-3"><p className="text-xs font-semibold text-(--text-secondary)">{STAKEHOLDER_GROUP_LABELS[g]} · {items.length}</p>{items.slice(0,3).map(s=><p key={s.id} className="mt-2 text-sm">{s.name}<span className="block text-xs text-(--text-secondary)">{s.organization||"Organização pendente"} · {s.role||"Papel pendente"}</span></p>)}</div>:null}):<p className="mt-3 text-sm text-(--text-secondary)">Sem stakeholders cadastrados.</p>}
      </section>
      <section className="workspace-card p-4"><div className="flex justify-between gap-2"><h3 className="font-semibold">Documentos recentes</h3><button className="text-xs text-(--accent)" onClick={()=>onOpenTab("documents")}>Ver todos</button></div>
        {documentsLoading?<p className="mt-3 text-sm">Carregando...</p>:documents.length?<div className="mt-3 space-y-2">{[...documents].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,3).map(d=><button key={d.id} className="block w-full border-b border-(--border) pb-2 text-left text-sm" onClick={()=>{onOpenTab("documents");onOpenDocument(d.id);}}>{d.title}<span className="block text-xs text-(--text-secondary)">{d.category} · Processado · {formatDate(d.createdAt)}</span></button>)}</div>:<p className="mt-3 text-sm text-(--text-secondary)">Nenhum conteúdo processado.</p>}
      </section>
    </div>
  </div>;
}
