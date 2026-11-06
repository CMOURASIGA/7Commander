"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {Eye,Pencil,MessageSquare,ChevronRight} from "lucide-react";
import {useConfirm} from "@/components/ui/confirm-dialog";
import {PageIntro,SurfaceCard} from "@/components/ui/workspace-primitives";
import {ScrumSelectors,useScrumData,apiPost,Story,stages,transitions,dateBR,today} from "@/components/scrum/scrum-common";

export default function ScrumKanbanPage(){
 const data=useScrumData();const confirm=useConfirm();
 const [saving,setSaving]=useState<string|null>(null);
 const [selected,setSelected]=useState<Story|null>(null);
 const [editing,setEditing]=useState(false);
 const [editForm,setEditForm]=useState({title:"",description:"",acceptanceCriteria:"",responsible:"",priority:"media"});
 const [comment,setComment]=useState("");
 const [showEmpty,setShowEmpty]=useState(true);
 const [transition,setTransition]=useState<{story:Story;stage:string}|null>(null);
 const [reason,setReason]=useState("");
 const sprint=data.sprints.find(s=>s.id===data.sprintId);
 const stories=data.stories.filter(s=>s.sprint_id===data.sprintId);
 const closed=sprint?.status==="closed";
 const columns=stages.filter(([key])=>showEmpty||stories.some(s=>s.workflow_stage===key));
 const currentSelected=selected?data.stories.find(s=>s.id===selected.id)||selected:null;
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  const projectId=params.get("projectId"),storyId=params.get("storyId");
  if(projectId&&data.projects.some(p=>p.id===projectId)&&data.projectId!==projectId){data.setProjectId(projectId);return}
  if(storyId&&data.stories.length){
   const story=data.stories.find(s=>s.id===storyId);
   if(story&&!selected){setSelected(story);if(story.sprint_id)data.setSprintId(story.sprint_id)}
  }
 },[data.projects,data.projectId,data.stories,selected,data.setProjectId,data.setSprintId]);
 function view(story:Story,edit=false){
  setSelected(story);setEditing(edit);setComment("");setReason("");
  setEditForm({title:story.title,description:story.description,acceptanceCriteria:story.acceptance_criteria,responsible:story.responsible||"",priority:story.priority});
 }
 async function saveStory(){
  if(!currentSelected||closed||saving)return;
  setSaving(currentSelected.id);data.setError("");
  try{await apiPost("/api/scrum/stories",{action:"update",projectId:data.projectId,storyId:currentSelected.id,...editForm});
   await data.refresh();setEditing(false)}
  catch(e){data.setError(e instanceof Error?e.message:"Falha ao salvar US")}
  finally{setSaving(null)}
 }
 async function addComment(){
  if(!currentSelected||closed||saving||!comment.trim())return;
  setSaving(currentSelected.id);
  try{await apiPost("/api/scrum/stories",{action:"comment",projectId:data.projectId,storyId:currentSelected.id,content:comment.trim()});setComment("");await data.refresh()}
  catch(e){data.setError(e instanceof Error?e.message:"Falha ao comentar")}
  finally{setSaving(null)}
 }
 async function move(story:Story,stage:string,transitionComment=""){
  if(closed||saving||stage===story.workflow_stage||!transitions[story.workflow_stage]?.includes(stage))return;
  if(stage==="review"&&!transitionComment.trim()){setTransition({story,stage});return}
  setSaving(story.id);data.setError("");
  try{await apiPost("/api/scrum/stories",{action:"update",projectId:data.projectId,storyId:story.id,stage,transitionComment});await data.refresh();
   setTransition(null);setReason("");setSelected(old=>old?.id===story.id?{...story,workflow_stage:stage}:old)}
  catch(e){data.setError(e instanceof Error?e.message:"Falha ao movimentar US")}
  finally{setSaving(null)}
 }
 async function returnBacklog(story:Story){
  if(closed||!await confirm({title:"Retirar US da Sprint?",description:"A história retorna ao backlog mantendo os comentários e o histórico de movimentações.",confirmLabel:"Retornar ao backlog"}))return;
  setSaving(story.id);
  try{await apiPost("/api/scrum/stories",{action:"update",projectId:data.projectId,storyId:story.id,sprintId:null});await data.refresh();setSelected(null)}
  catch(e){data.setError(e instanceof Error?e.message:"Falha ao retornar US ao backlog")}
  finally{setSaving(null)}
 }
 const counts={total:stories.length,done:stories.filter(s=>s.workflow_stage==="closed").length,blocked:stories.filter(s=>s.blocked).length,overdue:stories.filter(s=>s.workflow_stage!=="closed"&&s.due_date&&s.due_date<today()).length};
 return <section className="space-y-3">
  <PageIntro eyebrow="Scrum e Sprints" title="Kanban de US" description="Visualização compacta do fluxo de User Stories. Todas as ações mantêm histórico, e REVIEW exige justificativa." />
  <SurfaceCard>
   <ScrumSelectors projects={data.projects} projectId={data.projectId} onProject={data.setProjectId} sprints={data.sprints} sprintId={data.sprintId} onSprint={data.setSprintId}/>
   <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-(--text-secondary)">{sprint?"Sprint: "+sprint.name+" · "+sprint.status:"Selecione uma Sprint"}</p>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!showEmpty} onChange={e=>setShowEmpty(!e.target.checked)}/> Ocultar colunas vazias</label></div>
   {data.error&&<p role="alert" className="mt-3 text-sm text-(--danger)">{data.error}</p>}
  </SurfaceCard>
  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{[["US na Sprint",counts.total],["Aprovadas",counts.done],["Bloqueadas",counts.blocked],["Atrasadas",counts.overdue]].map(([label,value])=><div key={label} className="rounded-xl border border-(--border) bg-(--bg-surface) p-2.5"><p className="text-[11px] text-(--text-secondary)">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}</div>
  <SurfaceCard className="p-2">
   {!sprint?<p className="p-3 text-sm">Selecione uma Sprint.</p>:<>
    {closed&&<p className="mb-2 rounded-lg bg-(--bg-muted) p-2 text-xs">Sprint encerrada: somente leitura.</p>}
    <div className="overflow-x-auto">
     <div className="grid gap-1.5" style={{gridTemplateColumns:"repeat("+Math.max(columns.length,1)+", minmax(135px, 1fr))",minWidth:columns.length>5?"1080px":"auto"}}>
      {columns.map(([key,label])=><section key={key} className="min-w-0 rounded-lg border border-(--border) bg-(--bg-muted) p-1.5">
       <div className="flex items-center justify-between gap-1 px-1 py-1"><h3 className="truncate text-[11px] font-bold">{label}</h3><span className="workspace-pill">{stories.filter(s=>s.workflow_stage===key).length}</span></div>
       <div className="mt-1 space-y-1.5">{stories.filter(s=>s.workflow_stage===key).map(s=><article key={s.id} className="rounded-lg border border-(--border) bg-(--bg-surface) p-2">
        <p className="line-clamp-2 text-[11px] font-semibold leading-4" title={s.title}>{s.title}</p>
        <p className="mt-1 truncate text-[10px] text-(--text-secondary)" title={s.responsible||""}>{s.responsible||"Sem responsável"}</p>
        <p className="mt-1 text-[10px] text-(--text-secondary)">{dateBR(s.due_date)} · {s.story_points??"–"} pt</p>
        {s.blocked&&<span className="text-[10px] font-semibold text-(--danger)">Bloqueada</span>}
        <div className="mt-2 flex items-center gap-1">
         <button type="button" className="rounded-md border border-(--border) p-1.5" title="Visualizar US e comentários" aria-label={"Visualizar "+s.title} onClick={()=>view(s)}><Eye size={14}/></button>
         <button type="button" className="rounded-md border border-(--border) p-1.5" title="Editar US" aria-label={"Editar "+s.title} disabled={closed} onClick={()=>view(s,true)}><Pencil size={14}/></button>
         <button type="button" className="rounded-md border border-(--border) p-1.5" title="Comentários" aria-label={"Comentar "+s.title} onClick={()=>view(s)}><MessageSquare size={14}/></button>
        </div>
        {!closed&&transitions[key]?.length>0&&<select aria-label={"Alterar status de "+s.title} className="workspace-select mt-2 w-full text-[11px]" disabled={Boolean(saving)} value={key} onChange={e=>{const stage=e.target.value;if(stage==="review")setTransition({story:s,stage});else void move(s,stage)}}>
         <option value={key}>Mover para…</option>{transitions[key].map(next=><option value={next} key={next}>{stages.find(x=>x[0]===next)?.[1]||next}</option>)}
        </select>}
       </article>)}</div>
      </section>)}
     </div>
    </div>
    {!showEmpty&&columns.length===0&&<p className="p-3 text-xs">Nenhuma US vinculada a esta Sprint.</p>}
   </>}
  </SurfaceCard>
  {selected&&<div className="fixed inset-0 z-50"><button aria-label="Fechar painel" className="absolute inset-0 bg-black/40" onClick={()=>setSelected(null)}/><aside className="relative ml-auto h-dvh w-full max-w-xl overflow-y-auto border-l border-(--border) bg-(--bg-surface) p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="User Story">
   <div className="flex items-center justify-between border-b border-(--border) pb-3"><h2 className="font-semibold">{editing?"Editar User Story":"Detalhes da User Story"}</h2><button className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>setSelected(null)}>Fechar</button></div>
   {editing&&!closed?<div className="mt-4 space-y-3">
    <label className="block text-xs">Título<input className="workspace-input mt-1 w-full" value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))}/></label>
    <label className="block text-xs">Descrição<textarea rows={4} className="workspace-input mt-1 w-full" value={editForm.description} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))}/></label>
    <label className="block text-xs">Critérios de aceite<textarea rows={3} className="workspace-input mt-1 w-full" value={editForm.acceptanceCriteria} onChange={e=>setEditForm(f=>({...f,acceptanceCriteria:e.target.value}))}/></label>
    <label className="block text-xs">Responsável<input className="workspace-input mt-1 w-full" value={editForm.responsible} onChange={e=>setEditForm(f=>({...f,responsible:e.target.value}))}/></label>
    <label className="block text-xs">Prioridade<select className="workspace-select mt-1 w-full" value={editForm.priority} onChange={e=>setEditForm(f=>({...f,priority:e.target.value}))}>{["baixa","media","alta","critica"].map(p=><option key={p} value={p}>{p}</option>)}</select></label>
    <button className="workspace-button-primary px-3 py-2 text-xs" disabled={Boolean(saving)||!editForm.title.trim()} onClick={()=>void saveStory()}>Salvar alterações</button>
   </div>:<div className="mt-4 space-y-2 text-sm"><h3 className="text-base font-semibold">{currentSelected?.title}</h3><p className="whitespace-pre-wrap">{currentSelected?.description||"Sem descrição"}</p><p>Critérios de aceite: {currentSelected?.acceptance_criteria||"Não definidos"}</p><p>Etapa: {currentSelected?.workflow_stage.toUpperCase()}</p><p>Responsável: {currentSelected?.responsible||"Não atribuído"}</p><p>Entrega: {dateBR(currentSelected?.due_date)}</p></div>}
   <div className="mt-5 border-t border-(--border) pt-3"><h3 className="text-sm font-semibold">Histórico de comentários</h3>
    {data.comments.filter(c=>c.story_id===selected.id).map(c=><div className="mt-2 rounded-lg bg-(--bg-muted) p-3 text-xs" key={c.id}><p className="text-(--text-secondary)">{c.author_email} · {new Date(c.created_at).toLocaleString("pt-BR")}</p><p className="mt-1 whitespace-pre-wrap">{c.content}</p></div>)}
    {!closed&&<><textarea rows={3} className="workspace-input mt-3 w-full" placeholder="Registrar decisão, impedimento ou atualização…" value={comment} onChange={e=>setComment(e.target.value)}/><button className="workspace-button-secondary mt-2 px-3 py-2 text-xs" disabled={Boolean(saving)||!comment.trim()} onClick={()=>void addComment()}>Adicionar comentário</button></>}
   </div>
   {!closed&&<div className="mt-5 flex gap-2 border-t border-(--border) pt-3"><button className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>setEditing(!editing)}>{editing?"Visualizar":"Editar"}</button><button className="workspace-button-secondary px-3 py-2 text-xs" disabled={Boolean(saving)} onClick={()=>void returnBacklog(currentSelected||selected)}>Retornar ao backlog</button></div>}
  </aside></div>}
  {transition&&<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-xl bg-(--bg-surface) p-5 shadow-xl" role="dialog" aria-modal="true" aria-label="Solicitar REVIEW">
   <h2 className="font-semibold">Justificativa para REVIEW</h2><p className="mt-2 text-xs text-(--text-secondary)">Informe o motivo da revisão. Ele ficará registrado no histórico da US e será comunicado aos envolvidos.</p>
   <textarea className="workspace-input mt-3 w-full" rows={4} value={reason} onChange={e=>setReason(e.target.value)} placeholder="O que precisa ser revisado?"/>
   <div className="mt-3 flex justify-end gap-2"><button className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>{setTransition(null);setReason("")}}>Cancelar</button><button className="workspace-button-primary px-3 py-2 text-xs" disabled={!reason.trim()||Boolean(saving)} onClick={()=>void move(transition.story,transition.stage,reason)}>Solicitar REVIEW <ChevronRight size={12} className="inline"/></button></div>
  </div></div>}
 </section>;
}
