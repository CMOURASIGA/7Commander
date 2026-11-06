"use client";
import Link from "next/link";
import {useState} from "react";
import {PageIntro,SurfaceCard} from "@/components/ui/workspace-primitives";
import {ScrumNav,ScrumSelectors,useScrumData,apiPost,Story,stages,transitions,dateBR,today} from "@/components/scrum/scrum-common";
export default function ScrumKanbanPage(){
 const data=useScrumData();const [saving,setSaving]=useState<string|null>(null);const [selected,setSelected]=useState<Story|null>(null);
 const sprint=data.sprints.find(s=>s.id===data.sprintId);
 const stories=data.stories.filter(s=>s.sprint_id===data.sprintId);
 const closed=sprint?.status==="closed";
 async function move(story:Story,stage:string){
  if(closed||saving||stage===story.workflow_stage||!transitions[story.workflow_stage]?.includes(stage))return;
  setSaving(story.id);data.setError("");
  try{await apiPost("/api/scrum/stories",{action:"update",projectId:data.projectId,storyId:story.id,stage});await data.refresh();setSelected(old=>old?.id===story.id?{...story,workflow_stage:stage}:old)}
  catch(e){data.setError(e instanceof Error?e.message:"Não foi possível movimentar a US")}finally{setSaving(null)}
 }
 async function returnBacklog(story:Story){
  if(closed||!window.confirm("Retirar esta US da Sprint? Ela permanecerá no backlog e manterá seus comentários."))return;
  setSaving(story.id);
  try{await apiPost("/api/scrum/stories",{action:"update",projectId:data.projectId,storyId:story.id,sprintId:null});await data.refresh();setSelected(null)}
  catch(e){data.setError(e instanceof Error?e.message:"Não foi possível retornar a US ao backlog.")}finally{setSaving(null)}
 }
 const counts={total:stories.length,done:stories.filter(s=>s.workflow_stage==="closed").length,blocked:stories.filter(s=>s.blocked).length,overdue:stories.filter(s=>s.workflow_stage!=="closed"&&s.due_date&&s.due_date<today()).length};
 return <section className="space-y-4">
   <PageIntro eyebrow="Scrum e Sprints" title="Kanban de US" description="Quadro de acompanhamento da Sprint, separado do Kanban de atividades operacionais. Movimentações seguem as etapas e decisões definidas no fluxo Scrum." aside={<Link href="/scrum/backlog" className="workspace-button-primary rounded-lg px-3 py-2 text-sm">Gerenciar backlog de US</Link>}/>
   <ScrumNav active="board"/>
   <SurfaceCard><ScrumSelectors projects={data.projects} projectId={data.projectId} onProject={data.setProjectId} sprints={data.sprints} sprintId={data.sprintId} onSprint={data.setSprintId}/>
     {sprint&&<p className="mt-3 text-xs text-(--text-secondary)">Sprint: <strong>{sprint.name}</strong> · Meta: {sprint.goal||"Não definida"} · Situação: {sprint.status}</p>}
     {data.error&&<p role="alert" className="mt-3 text-sm text-(--danger)">{data.error}</p>}
   </SurfaceCard>
   <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{[["US na Sprint",counts.total],["Aprovadas",counts.done],["Impedidas",counts.blocked],["Atrasadas",counts.overdue]].map(([label,value])=><div key={label} className="rounded-xl border border-(--border) bg-(--bg-surface) p-3"><p className="text-xs text-(--text-secondary)">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div>
   <SurfaceCard>
    {!sprint?<p className="text-sm text-(--text-secondary)">Selecione uma Sprint para visualizar seu quadro.</p>:<>
     {closed&&<p className="mb-3 rounded-lg bg-(--bg-muted) p-3 text-xs">Sprint encerrada. Histórico e US protegidos contra alterações.</p>}
     <div className="grid gap-3 lg:grid-cols-4">{stages.map(([key,label])=><section key={key} className="min-h-44 rounded-xl border border-(--border) bg-(--bg-muted) p-3">
       <div className="flex items-center justify-between"><h3 className="text-xs font-semibold">{label}</h3><span className="workspace-pill">{stories.filter(s=>s.workflow_stage===key).length}</span></div>
       <div className="mt-3 space-y-3">{stories.filter(s=>s.workflow_stage===key).map(s=><article key={s.id} className="rounded-lg border border-(--border) bg-(--bg-surface) p-3">
        <button type="button" className="w-full text-left" onClick={()=>setSelected(s)}><h4 className="text-sm font-semibold">{s.title}</h4><p className="mt-1 line-clamp-2 text-xs text-(--text-secondary)">{s.description||"Sem descrição"}</p></button>
        <div className="mt-2 space-y-1 text-xs text-(--text-secondary)"><p>Prioridade: {s.priority} · Pontos: {s.story_points??"Não estimado"}</p><p>Responsável: {s.responsible||"Não atribuído"}</p><p>Entrega: {dateBR(s.due_date)}</p>{s.blocked&&<p className="font-semibold text-(--danger)">Impedimento ativo</p>}</div>
        {!closed&&transitions[key]?.length>0&&<label className="mt-3 block text-xs">Mover para<select className="workspace-select mt-1 w-full" disabled={saving===s.id} value={key} onChange={e=>void move(s,e.target.value)}><option value={key}>Selecionar...</option>{transitions[key].map(next=><option value={next} key={next}>{stages.find(x=>x[0]===next)?.[1]||next}</option>)}</select></label>}
        <button className="workspace-button-secondary mt-2 px-3 py-2 text-xs" onClick={()=>setSelected(s)}>Detalhes</button>
       </article>)}</div>
     </section>)}</div>
    </>}
   </SurfaceCard>
   {selected&&<div className="fixed inset-0 z-50"><button aria-label="Fechar detalhes" className="absolute inset-0 bg-black/40" onClick={()=>setSelected(null)}/><aside className="relative ml-auto h-dvh w-full max-w-lg overflow-y-auto border-l border-(--border) bg-(--bg-surface) p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Detalhes da US">
    <div className="flex items-center justify-between border-b border-(--border) pb-4"><h2 className="font-semibold">Detalhes da User Story</h2><button className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>setSelected(null)}>Fechar</button></div>
    <h3 className="mt-4 text-lg font-semibold">{selected.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm">{selected.description}</p><h4 className="mt-4 text-sm font-semibold">Critérios de aceite</h4><p className="mt-1 whitespace-pre-wrap text-sm">{selected.acceptance_criteria||"Não informados"}</p>
    <div className="mt-4 space-y-2 text-sm"><p>Etapa: {selected.workflow_stage.toUpperCase()}</p><p>Responsável: {selected.responsible||"Não atribuído"}</p><p>Entrega: {dateBR(selected.due_date)}</p><p>Story points: {selected.story_points??"Não estimado"}</p><p>Impedimento: {selected.blocked?selected.blocker_reason||"Ativo":"Nenhum"}</p></div>
    <h4 className="mt-5 text-sm font-semibold">Comentários</h4>{data.comments.filter(c=>c.story_id===selected.id).map(c=><div key={c.id} className="mt-2 rounded-lg bg-(--bg-muted) p-3"><p className="text-xs">{c.author_email} · {new Date(c.created_at).toLocaleString("pt-BR")}</p><p className="mt-2 whitespace-pre-wrap text-sm">{c.content}</p></div>)}
    <div className="mt-5 flex flex-wrap gap-2"><Link href="/scrum/backlog" className="workspace-button-secondary px-3 py-2 text-xs">Editar no Backlog</Link>{!closed&&<button className="workspace-button-secondary px-3 py-2 text-xs" disabled={Boolean(saving)} onClick={()=>void returnBacklog(selected)}>Retornar ao backlog</button>}</div>
   </aside></div>}
 </section>;
}
