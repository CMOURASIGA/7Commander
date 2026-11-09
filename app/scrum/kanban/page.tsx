"use client";
import {ScrumKairosActions} from "@/components/scrum/scrum-kairos-actions";
import {MarkdownContent} from "@/components/ui/markdown-content";
import {useEffect,useRef,useState} from "react";

import {useConfirm} from "@/components/ui/confirm-dialog";
import {PageIntro,SurfaceCard} from "@/components/ui/workspace-primitives";
import {ScrumSelectors,useScrumData,apiGet,apiPost,Story,BacklogItem,ProjectMember,stages,transitions,dateBR,today} from "@/components/scrum/scrum-common";

function ScrumIcon({kind,size=16,className=""}:{kind:"eye"|"pencil"|"message"|"chevron"|"trash";size?:number;className?:string}){
 return <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
 {kind==="eye"?<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>:null}
 {kind==="pencil"?<><path d="m4 20 4.4-1 11-11a2 2 0 0 0-3-3l-11 11L4 20Z"/><path d="m14 7 3 3"/></>:null}
 {kind==="message"?<path d="M5 4h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 3V6a2 2 0 0 1 1-2Z"/>:null}
 {kind==="chevron"?<path d="m9 18 6-6-6-6"/>:null}
 {kind==="trash"?<><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v7M14 10v7"/></>:null}
 </svg>;
}
export default function ScrumKanbanPage(){
 const data=useScrumData();const confirm=useConfirm();const openedFromUrl=useRef(false);
 const [saving,setSaving]=useState<string|null>(null);
 // A mutation locks only its own card until the API confirms persistence.
 const pendingCardIds=useRef(new Set<string>());
 const [pendingCards,setPendingCards]=useState<string[]>([]);
 const startCard=(id:string)=>{
  if(pendingCardIds.current.has(id))return false;
  pendingCardIds.current.add(id);
  setPendingCards([...pendingCardIds.current]);
  return true;
 };
 const finishCard=(id:string)=>{
  pendingCardIds.current.delete(id);
  setPendingCards([...pendingCardIds.current]);
 };

 const [mode,setMode]=useState<"stories"|"tasks">("stories");
 const [tasks,setTasks]=useState<BacklogItem[]>([]);const [features,setFeatures]=useState<BacklogItem[]>([]);
 const [members,setMembers]=useState<ProjectMember[]>([]);
 const [taskFilter,setTaskFilter]=useState("all");
 const [selected,setSelected]=useState<Story|null>(null);
 const [editing,setEditing]=useState(false);
 const [editForm,setEditForm]=useState({title:"",description:"",acceptanceCriteria:"",responsible:"",priority:"media",featureId:"",startDate:"",dueDate:"",actualEndDate:"",durationDays:"",storyPoints:"",blocked:false,blockerReason:""});
 const [comment,setComment]=useState("");
 const [showEmpty,setShowEmpty]=useState(true);
 const [search,setSearch]=useState("");
 const [priority,setPriority]=useState("all");
 const [assignee,setAssignee]=useState("all");
 const [blockedOnly,setBlockedOnly]=useState(false);
 const [transition,setTransition]=useState<{story:Story;stage:string}|null>(null);
 const [reason,setReason]=useState("");
 useEffect(()=>{let live=true;if(!data.projectId){setTasks([]);setFeatures([]);setMembers([]);return}
  void Promise.all([apiGet("/api/scrum/backlog-items?projectId="+encodeURIComponent(data.projectId)),apiGet("/api/scrum/project-members?projectId="+encodeURIComponent(data.projectId))]).then(([a,b])=>{if(live){setTasks((a as BacklogItem[]).filter(t=>t.item_type==="task"));setFeatures((a as BacklogItem[]).filter(t=>t.item_type==="feature"));setMembers(b as ProjectMember[])}}).catch(()=>{});
  return()=>{live=false}
 },[data.projectId]);

 const sprint=data.sprints.find(s=>s.id===data.sprintId);
 const stories=data.stories.filter(s=>s.sprint_id===data.sprintId);
 const filtered=stories.filter(s=>(!search||s.title.toLowerCase().includes(search.toLowerCase()))&&(priority==="all"||s.priority===priority)&&(assignee==="all"||s.responsible===assignee)&&(blockedOnly?s.blocked:true));
 const relatedTasks=tasks.filter(t=>stories.some(us=>us.id===t.story_id)).filter(t=>taskFilter==="all"||t.story_id===taskFilter);
 const closed=sprint?.status==="closed";
 const columns=stages.filter(([key])=>showEmpty||filtered.some(s=>s.workflow_stage===key));
 const taskColumns=(["todo","doing","done"] as const).filter(key=>showEmpty||relatedTasks.some(t=>t.state===key));
 const currentSelected=selected?data.stories.find(s=>s.id===selected.id)||selected:null;
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  const projectId=params.get("projectId"),storyId=params.get("storyId"),sprintId=params.get("sprintId");
  if(sprintId&&data.sprints.some(s=>s.id===sprintId)&&data.sprintId!==sprintId)data.setSprintId(sprintId);
  if(projectId&&data.projects.some(p=>p.id===projectId)&&data.projectId!==projectId){data.setProjectId(projectId);return}
  if(storyId&&data.stories.length&&!openedFromUrl.current){
   const story=data.stories.find(s=>s.id===storyId);
   if(story&&!selected){openedFromUrl.current=true;setSelected(story);if(story.sprint_id)data.setSprintId(story.sprint_id)}
  }
 },[data.projects,data.projectId,data.stories,selected,data.setProjectId,data.setSprintId]);
 function view(story:Story,edit=false){
  setSelected(story);setEditing(edit);setComment("");setReason("");
  setEditForm({title:story.title,description:story.description,acceptanceCriteria:story.acceptance_criteria,responsible:story.responsible||"",priority:story.priority,featureId:story.feature_id||"",startDate:story.start_date||"",dueDate:story.due_date||"",actualEndDate:story.actual_end_date||"",durationDays:story.duration_days===null?"":String(story.duration_days),storyPoints:story.story_points===null?"":String(story.story_points),blocked:story.blocked,blockerReason:story.blocker_reason});
 }
 async function saveStory(){
  if(!currentSelected||closed||saving)return;
  setSaving(currentSelected.id);data.setError("");
  try{await apiPost("/api/scrum/stories",{action:"update",projectId:data.projectId,storyId:currentSelected.id,...editForm,storyPoints:editForm.storyPoints||null,featureId:editForm.featureId||null,durationDays:editForm.durationDays||null,actualEndDate:editForm.actualEndDate||null});
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
 async function moveTask(task:BacklogItem,newStatus:string){
  if(closed||saving||task.state===newStatus||!startCard(task.id))return;
  data.setError("");
  // Optimistic movement, with one in-flight request per Task.
  setTasks(prev=>prev.map(item=>item.id===task.id?{...item,state:newStatus}:item));
  try{
   const persisted=await apiPost("/api/scrum/backlog-items",{action:"update",projectId:data.projectId,id:task.id,itemType:"task",title:task.title,state:newStatus}) as {id:string;state?:string;actual_end_date?:string|null;story?:{id:string;workflow_stage:string;actual_end_date?:string|null;updated_at?:string}};
   setTasks(prev=>prev.map(item=>item.id===task.id?{...item,state:persisted.state??newStatus,actual_end_date:persisted.actual_end_date??null}:item));
   if(persisted.story){
    data.patchStory(persisted.story.id,{workflow_stage:persisted.story.workflow_stage,actual_end_date:persisted.story.actual_end_date??null,updated_at:persisted.story.updated_at??""});
   }
  }catch(e){
   setTasks(prev=>prev.map(item=>item.id===task.id?{...item,state:task.state,actual_end_date:task.actual_end_date??null}:item));
   data.setError(e instanceof Error?e.message:"Falha ao mover Task.");
  }finally{finishCard(task.id)}
 }
 async function move(story:Story,stage:string,transitionComment=""){
  if(closed||saving||stage===story.workflow_stage||!transitions[story.workflow_stage]?.includes(stage))return;
  if(stage==="review"&&!transitionComment.trim()){setTransition({story,stage});return}
  if(!startCard(story.id))return;
  data.setError("");
  data.setStoryStage(story.id,stage);
  try{
   const persisted=await apiPost("/api/scrum/stories",{action:"update",projectId:data.projectId,storyId:story.id,stage,transitionComment}) as {id:string;workflow_stage?:string;actual_end_date?:string|null;updated_at?:string};
   data.patchStory(story.id,{workflow_stage:persisted.workflow_stage??stage,actual_end_date:persisted.actual_end_date??null,updated_at:persisted.updated_at??story.updated_at});
   setTransition(null);setReason("");
   setSelected(old=>old?.id===story.id?{...old,workflow_stage:persisted.workflow_stage??stage}:old);
  }catch(e){
   data.setStoryStage(story.id,story.workflow_stage);
   data.setError(e instanceof Error?e.message:"Falha ao movimentar US");
  }finally{finishCard(story.id)}
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
  <PageIntro eyebrow="Scrum e Sprints" title="Kanban Scrum" description="Acompanhe User Stories e Tasks em quadros separados. REVIEW exige justificativa e o avanço de Tasks atualiza a US." aside={<div className="flex gap-2"><button className={mode==="stories"?"workspace-button-primary rounded-lg px-3 py-2 text-sm":"workspace-button-secondary rounded-lg px-3 py-2 text-sm"} onClick={()=>setMode("stories")}>User Stories</button><button className={mode==="tasks"?"workspace-button-primary rounded-lg px-3 py-2 text-sm":"workspace-button-secondary rounded-lg px-3 py-2 text-sm"} onClick={()=>setMode("tasks")}>Tasks</button></div>}/>
  <SurfaceCard>
   <ScrumSelectors projects={data.projects} projectId={data.projectId} onProject={data.setProjectId} sprints={data.sprints} sprintId={data.sprintId} onSprint={data.setSprintId}/>
   {mode==="tasks"&&<label className="mt-3 block text-xs">Filtrar Tasks por US<select className="workspace-select mt-1 w-full" value={taskFilter} onChange={e=>setTaskFilter(e.target.value)}><option value="all">Todas as US da Sprint</option>{stories.map(us=><option key={us.id} value={us.id}>{us.title}</option>)}</select></label>}
   {mode==="stories"&&<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
     <input className="workspace-input w-full text-sm" placeholder="Pesquisar US" value={search} onChange={e=>setSearch(e.target.value)}/>
     <select className="workspace-select" aria-label="Filtrar prioridade" value={priority} onChange={e=>setPriority(e.target.value)}><option value="all">Todas as prioridades</option>{["baixa","media","alta","critica"].map(p=><option value={p} key={p}>{p}</option>)}</select>
     <select className="workspace-select" aria-label="Filtrar responsável" value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="all">Todos os responsáveis</option>{[...new Set(stories.map(s=>s.responsible).filter((v):v is string=>Boolean(v)))].map(p=><option value={p} key={p}>{p}</option>)}</select>
     <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={blockedOnly} onChange={e=>setBlockedOnly(e.target.checked)}/> Somente impedidas</label>
   </div>}
   <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-(--text-secondary)">{sprint?"Sprint: "+sprint.name+" · "+sprint.status:"Selecione uma Sprint"}</p>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!showEmpty} onChange={e=>setShowEmpty(!e.target.checked)}/> Ocultar colunas vazias</label></div>
   {data.error&&<p role="alert" className="mt-3 text-sm text-(--danger)">{data.error}</p>}
  </SurfaceCard>
  {mode==="tasks"?<div className="grid grid-cols-3 gap-2">{[["Tasks",relatedTasks.length],["Em andamento",relatedTasks.filter(t=>t.state==="doing").length],["Concluídas",relatedTasks.filter(t=>t.state==="done").length]].map(([label,n])=><div key={label} className="rounded-lg border border-(--border) bg-(--bg-surface) p-3"><p className="text-xs text-(--text-secondary)">{label}</p><p className="text-xl font-semibold">{n}</p></div>)}</div>:<div className="grid grid-cols-2 gap-2 md:grid-cols-4">{[["US na Sprint",counts.total],["Aprovadas",counts.done],["Bloqueadas",counts.blocked],["Atrasadas",counts.overdue]].map(([label,value])=><div key={label} className="rounded-xl border border-(--border) bg-(--bg-surface) p-2.5"><p className="text-[11px] text-(--text-secondary)">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}</div>}
  <SurfaceCard>
   {!sprint?<p className="p-3 text-sm">Selecione uma Sprint.</p>:<>
    {closed&&<p className="mb-2 rounded-lg bg-(--bg-muted) p-2 text-xs">Sprint encerrada: somente leitura.</p>}
    {mode==="tasks"?<div className="grid gap-3 md:grid-cols-3">
      {taskColumns.map(key=><div key={key} className="min-h-48 rounded-xl border border-(--border) bg-(--bg-muted) p-3">
       <div className="mb-3 flex justify-between text-sm font-semibold"><span>{key==="todo"?"TO DO":key==="doing"?"DOING":"DONE"}</span><span>{relatedTasks.filter(t=>t.state===key).length}</span></div>
       <div className="space-y-2">{relatedTasks.filter(t=>t.state===key).map(t=><article key={t.id} className="rounded-lg border border-(--border) bg-(--bg-surface) p-3">
         <h3 className="text-sm font-semibold">{t.title}</h3><p className="mt-1 text-xs text-(--text-secondary)">US: {stories.find(us=>us.id===t.story_id)?.title||"Não encontrada"}</p>
         <p className="mt-1 text-xs">Responsável: {members.find(m=>m.email===t.responsible)?.name||t.responsible||"Não atribuído"}</p>
         {t.actual_end_date&&<p className="text-xs">Conclusão: {dateBR(t.actual_end_date)}</p>}
         {!closed&&<select className="workspace-select mt-2 w-full text-xs" aria-label={"Status de "+t.title} disabled={Boolean(saving)||pendingCards.includes(t.id)} value={t.state} onChange={e=>void moveTask(t,e.target.value)}>
          <option value="todo">TO DO</option><option value="doing">DOING</option><option value="done" disabled={t.state==="todo"}>DONE</option>
         </select>}
       </article>)}</div>
      </div>)}
     </div>:<div className="overflow-x-auto">
     <div className="grid gap-1.5" style={{gridTemplateColumns:"repeat("+Math.max(columns.length,1)+", minmax(135px, 1fr))",minWidth:columns.length>5?"980px":"auto"}}>
      {columns.map(([key,label])=><section key={key} className="min-w-0 rounded-lg border border-(--border) bg-(--bg-muted) p-1.5">
       <div className="flex items-center justify-between gap-1 px-1 py-1"><h3 className="truncate text-[11px] font-bold">{label}</h3><span className="workspace-pill">{filtered.filter(s=>s.workflow_stage===key).length}</span></div>
       <div className="mt-1 space-y-1.5">{filtered.filter(s=>s.workflow_stage===key).map(s=><article key={s.id} className="rounded-lg border border-(--border) bg-(--bg-surface) p-2">
        <p className="line-clamp-2 text-[11px] font-semibold leading-4" title={s.title}>{s.title}</p>
        <p className="mt-1 truncate text-[10px] text-(--text-secondary)" title={s.responsible||""}>{s.responsible||"Sem responsável"}</p>
        <p className="mt-1 text-[10px] text-(--text-secondary)">{dateBR(s.due_date)} · {s.story_points??"–"} pt</p>
        {s.blocked&&<span className="text-[10px] font-semibold text-(--danger)">Bloqueada</span>}
        <div className="mt-2 flex items-center gap-1">
         <button type="button" className="rounded-md border border-(--border) p-1.5" title="Visualizar US e comentários" aria-label={"Visualizar "+s.title} onClick={()=>view(s)}><ScrumIcon kind="eye" size={14}/></button>
         <button type="button" className="rounded-md border border-(--border) p-1.5" title="Editar US" aria-label={"Editar "+s.title} disabled={closed} onClick={()=>view(s,true)}><ScrumIcon kind="pencil" size={14}/></button>
         <button type="button" className="rounded-md border border-(--border) p-1.5" title="Comentários" aria-label={"Comentar "+s.title} onClick={()=>view(s)}><ScrumIcon kind="message" size={14}/></button>
        </div>
        {!closed&&transitions[key]?.length>0&&<select aria-label={"Alterar status de "+s.title} className="workspace-select mt-2 w-full text-[11px]" disabled={Boolean(saving)||pendingCards.includes(s.id)} value={key} onChange={e=>{const stage=e.target.value;setTransition({story:s,stage})}}>
         <option value={key}>Mover para…</option>{transitions[key].map(next=><option value={next} key={next}>{stages.find(x=>x[0]===next)?.[1]||next}</option>)}
        </select>}
       </article>)}</div>
      </section>)}
     </div>
    </div>}
    {mode==="stories"&&!showEmpty&&columns.length===0&&<p className="p-3 text-xs">Nenhuma US vinculada a esta Sprint.</p>}
   </>}
  </SurfaceCard>
  <ScrumKairosActions projectId={data.projectId} sprintId={data.sprintId} compact/>
  {selected&&<div className="fixed inset-0 z-50"><button aria-label="Fechar painel" className="absolute inset-0 bg-black/40" onClick={()=>setSelected(null)}/><aside className="relative ml-auto h-dvh w-full max-w-xl overflow-y-auto border-l border-(--border) bg-(--bg-surface) p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="User Story">
   <div className="flex items-center justify-between border-b border-(--border) pb-3"><h2 className="font-semibold">{editing?"Editar User Story":"Detalhes da User Story"}</h2><button className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>setSelected(null)}>Fechar</button></div>
   {editing&&!closed?<div className="mt-4 space-y-3">
    <label className="block text-xs">Título<input className="workspace-input mt-1 w-full" value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))}/></label>
    <label className="block text-xs">Descrição<textarea rows={4} className="workspace-input mt-1 w-full" value={editForm.description} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))}/></label>
    <label className="block text-xs">Critérios de aceite<textarea rows={3} className="workspace-input mt-1 w-full" value={editForm.acceptanceCriteria} onChange={e=>setEditForm(f=>({...f,acceptanceCriteria:e.target.value}))}/></label>
    <label className="block text-xs">Responsável<select className="workspace-select mt-1 w-full" value={editForm.responsible} onChange={e=>setEditForm(f=>({...f,responsible:e.target.value}))}><option value="">Não atribuído</option>{members.map(m=><option key={m.email} value={m.email}>{m.name} ({m.email})</option>)}</select></label>
    <label className="block text-xs">Feature<select className="workspace-select mt-1 w-full" value={editForm.featureId} onChange={e=>setEditForm(f=>({...f,featureId:e.target.value}))}><option value="">Sem Feature</option>{features.map(t=><option value={t.id} key={t.id}>{t.title}</option>)}</select></label>
    <p className="text-xs text-(--text-secondary)">Sprint: {sprint?.name||"Não vinculada"}</p>
    <label className="block text-xs">Prioridade<select className="workspace-select mt-1 w-full" value={editForm.priority} onChange={e=>setEditForm(f=>({...f,priority:e.target.value}))}>{["baixa","media","alta","critica"].map(p=><option key={p} value={p}>{p}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-xs">Início<input type="date" className="workspace-input mt-1 w-full" value={editForm.startDate} onChange={e=>setEditForm(f=>({...f,startDate:e.target.value}))}/></label>
      <label className="text-xs">Entrega prevista<input type="date" className="workspace-input mt-1 w-full" value={editForm.dueDate} onChange={e=>setEditForm(f=>({...f,dueDate:e.target.value}))}/></label>
      <label className="text-xs">Data real<input type="date" className="workspace-input mt-1 w-full" value={editForm.actualEndDate} onChange={e=>setEditForm(f=>({...f,actualEndDate:e.target.value}))}/></label>
      <label className="text-xs">Prazo (dias)<input type="number" min="1" className="workspace-input mt-1 w-full" value={editForm.durationDays} onChange={e=>setEditForm(f=>({...f,durationDays:e.target.value}))}/></label>
      <label className="text-xs">Story points<select className="workspace-select mt-1 w-full" value={editForm.storyPoints} onChange={e=>setEditForm(f=>({...f,storyPoints:e.target.value}))}><option value="">Não estimado</option>{[1,2,3,4].map(n=><option value={n} key={n}>{n}</option>)}</select></label>
      <label className="text-xs">Status<select className="workspace-select mt-1 w-full" value={currentSelected?.workflow_stage||"new"} disabled><option>{currentSelected?.workflow_stage.toUpperCase()}</option></select></label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={editForm.blocked} onChange={e=>setEditForm(f=>({...f,blocked:e.target.checked}))}/> Impedimento ativo</label>
      <label className="text-xs">Motivo do impedimento<input className="workspace-input mt-1 w-full" value={editForm.blockerReason} onChange={e=>setEditForm(f=>({...f,blockerReason:e.target.value}))}/></label>
    </div>
    <button className="workspace-button-primary px-3 py-2 text-xs" disabled={Boolean(saving)||!editForm.title.trim()} onClick={()=>void saveStory()}>Salvar alterações</button>
   </div>:<div className="mt-4 space-y-2 text-sm"><h3 className="text-base font-semibold">{currentSelected?.title}</h3><section><h4 className="text-xs font-semibold">Descrição</h4><MarkdownContent content={currentSelected?.description||"Sem descrição"}/></section><section><h4 className="text-xs font-semibold">Critérios de aceite</h4><MarkdownContent content={currentSelected?.acceptance_criteria||"Não definidos"}/></section><p>Etapa: {currentSelected?.workflow_stage.toUpperCase()}</p><p>Responsável: {currentSelected?.responsible||"Não atribuído"}</p><p>Entrega prevista: {dateBR(currentSelected?.due_date)}</p><p>Entrega real: {dateBR(currentSelected?.actual_end_date)}</p><p>Story points: {currentSelected?.story_points??"Não estimado"}</p><p>Feature: {features.find(t=>t.id===currentSelected?.feature_id)?.title||"Sem Feature"}</p><p>Prioridade: {currentSelected?.priority}</p><p>Impedimento: {currentSelected?.blocked?currentSelected.blocker_reason||"Ativo":"Não"}</p></div>}
   <section className="mt-5 border-t border-(--border) pt-3">
     <h3 className="text-sm font-semibold">Tasks vinculadas à US</h3>
     <p className="mt-1 text-xs text-(--text-secondary)">{tasks.filter(t=>t.story_id===selected.id&&t.state==="done").length} de {tasks.filter(t=>t.story_id===selected.id).length} concluídas</p>
     <div className="mt-3 h-2 rounded-full bg-(--bg-muted)"><div className="h-2 rounded-full bg-(--accent)" style={{width:(tasks.filter(t=>t.story_id===selected.id).length?100*tasks.filter(t=>t.story_id===selected.id&&t.state==="done").length/tasks.filter(t=>t.story_id===selected.id).length:0)+"%"}}/></div>
     {tasks.filter(t=>t.story_id===selected.id).map(t=><div key={t.id} className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-(--border) p-2"><span className="text-xs">{t.title}</span><span className="text-xs font-semibold">{t.state.toUpperCase()}</span></div>)}
     {!tasks.some(t=>t.story_id===selected.id)&&<p className="mt-2 text-xs text-(--text-secondary)">Nenhuma Task cadastrada.</p>}
   </section>
   <div className="mt-5 border-t border-(--border) pt-3"><h3 className="text-sm font-semibold">Histórico de comentários</h3>
    {data.comments.filter(c=>c.story_id===selected.id).map(c=><div className="mt-2 rounded-lg bg-(--bg-muted) p-3 text-xs" key={c.id}><p className="text-(--text-secondary)">{c.author_email} · {new Date(c.created_at).toLocaleString("pt-BR")}</p><p className="mt-1 whitespace-pre-wrap">{c.content}</p></div>)}
    {!closed&&<><textarea rows={3} className="workspace-input mt-3 w-full" placeholder="Registrar decisão, impedimento ou atualização…" value={comment} onChange={e=>setComment(e.target.value)}/><button className="workspace-button-secondary mt-2 px-3 py-2 text-xs" disabled={Boolean(saving)||!comment.trim()} onClick={()=>void addComment()}>Adicionar comentário</button></>}
   </div>
   {!closed&&<div className="mt-5 flex gap-2 border-t border-(--border) pt-3"><button className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>setEditing(!editing)}>{editing?"Visualizar":"Editar"}</button><button className="workspace-button-secondary px-3 py-2 text-xs" disabled={Boolean(saving)} onClick={()=>void returnBacklog(currentSelected||selected)}>Retornar ao backlog</button></div>}
  </aside></div>}
  {transition&&<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-xl bg-(--bg-surface) p-5 shadow-xl" role="dialog" aria-modal="true" aria-label="Registrar mudança de status">
   <h2 className="font-semibold">Mover para {transition.stage.toUpperCase()}</h2><p className="mt-2 text-xs text-(--text-secondary)">{transition.stage==="review"?"A justificativa é obrigatória para solicitar REVIEW.":"Comentário opcional para registrar a decisão."} O registro será preservado no histórico e o responsável será notificado.</p>
   <textarea className="workspace-input mt-3 w-full" rows={4} value={reason} onChange={e=>setReason(e.target.value)} placeholder="O que precisa ser revisado?"/>
   <div className="mt-3 flex justify-end gap-2"><button className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>{setTransition(null);setReason("")}}>Cancelar</button><button className="workspace-button-primary px-3 py-2 text-xs" disabled={(transition.stage==="review"&&!reason.trim())||Boolean(saving)||pendingCards.includes(transition.story.id)} onClick={()=>void move(transition.story,transition.stage,reason)}>Confirmar status <ScrumIcon kind="chevron" size={12} className="inline"/></button></div>
  </div></div>}
 </section>;
}
