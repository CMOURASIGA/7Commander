"use client";
import {useState} from "react";
import {Eye,Pencil,Trash2} from "lucide-react";
import {PageIntro,SurfaceCard} from "@/components/ui/workspace-primitives";
import {useConfirm} from "@/components/ui/confirm-dialog";
import {ScrumSelectors,useScrumData,apiPost,Story,stages,transitions,dateBR,dateOnly,today,addDays,daysBetween} from "@/components/scrum/scrum-common";
type Form={title:string;description:string;acceptanceCriteria:string;priority:string;responsible:string;stage:string;startDate:string;dueDate:string;durationDays:string;storyPoints:string;blocked:boolean;blockerReason:string;sprintId:string};
const empty=():Form=>({title:"",description:"",acceptanceCriteria:"",priority:"media",responsible:"",stage:"new",startDate:today(),dueDate:addDays(today(),3),durationDays:"3",storyPoints:"",blocked:false,blockerReason:"",sprintId:""});
function fromStory(s:Story):Form{return {title:s.title,description:s.description,acceptanceCriteria:s.acceptance_criteria,priority:s.priority,responsible:s.responsible||"",stage:s.workflow_stage,startDate:dateOnly(s.start_date),dueDate:dateOnly(s.due_date),durationDays:String(s.duration_days||""),storyPoints:s.story_points===null?"":String(s.story_points),blocked:s.blocked,blockerReason:s.blocker_reason,sprintId:s.sprint_id||""}}
export default function BacklogPage(){
 const data=useScrumData();const confirm=useConfirm();
 const [opened,setOpened]=useState<Story|null|undefined>(undefined);const [form,setForm]=useState<Form>(empty);const [saving,setSaving]=useState(false);const [commentText,setCommentText]=useState("");
 const [showAll,setShowAll]=useState(false);const [readOnly,setReadOnly]=useState(false);const [transitionComment,setTransitionComment]=useState("");
 const storyComments=opened?data.comments.filter(c=>c.story_id===opened.id):[];
 const isLocked=opened?.sprint_id?data.sprints.some(s=>s.id===opened.sprint_id&&s.status==="closed"):false;
 function edit(story:Story|null,view=false){setOpened(story);setReadOnly(view);setForm(story?fromStory(story):empty());setCommentText("");setTransitionComment("");data.setError("")}
 async function submit(){
   if(saving||!form.title.trim()||!data.projectId||isLocked||readOnly)return;
   if(opened&&form.stage==="review"&&opened.workflow_stage!=="review"&&!transitionComment.trim()){data.setError("Informe o motivo para solicitar REVIEW.");return}
   setSaving(true);data.setError("");
   try{
     await apiPost("/api/scrum/stories",{action:opened?"update":"create",projectId:data.projectId,storyId:opened?.id,
      title:form.title,description:form.description,acceptanceCriteria:form.acceptanceCriteria,priority:form.priority,responsible:form.responsible,
      stage:form.stage,startDate:form.startDate||null,dueDate:form.dueDate||null,durationDays:form.durationDays||null,storyPoints:form.storyPoints||null,
      blocked:form.blocked,blockerReason:form.blockerReason,sprintId:form.sprintId||null,transitionComment});
     setOpened(undefined);await data.refresh();
   }catch(e){data.setError(e instanceof Error?e.message:"Falha ao salvar US")}finally{setSaving(false)}
 }
 async function remove(story:Story){
   if(story.has_history||story.workflow_stage!=="new"){data.setError("US já movimentada no fluxo não pode ser excluída.");return}
   if(story.sprint_id){data.setError("Retire a US da Sprint antes da exclusão. Sprints encerradas são imutáveis.");return}
   if(!await confirm({title:"Excluir US?",description:"A US será excluída definitivamente, incluindo seus comentários. Essa ação não poderá ser desfeita.",confirmLabel:"Excluir",tone:"danger"}))return;
   const title=window.prompt("Digite o título exato da US para confirmar:",story.title);
   if(title!==story.title){data.setError("Exclusão cancelada: confirmação não corresponde.");return}
   setSaving(true);try{await apiPost("/api/scrum/stories",{action:"delete",projectId:data.projectId,storyId:story.id,confirmTitle:title});await data.refresh();if(opened?.id===story.id)setOpened(undefined)}
   catch(e){data.setError(e instanceof Error?e.message:"Exclusão não concluída")}finally{setSaving(false)}
 }
 async function comment(){
   if(!opened||saving||!commentText.trim())return;setSaving(true);
   try{await apiPost("/api/scrum/stories",{action:"comment",projectId:data.projectId,storyId:opened.id,content:commentText});setCommentText("");await data.refresh()}catch(e){data.setError(e instanceof Error?e.message:"Erro ao comentar")}finally{setSaving(false)}
 }
 const stories=data.stories.filter(s=>showAll||!s.sprint_id);
 return <section className="space-y-4">
   <PageIntro eyebrow="Scrum e Sprints" title="Backlog de US" description="Cadastre, refine, estime e priorize User Stories independentemente das atividades do Kanban operacional." aside={<button className="workspace-button-primary rounded-lg px-4 py-2 text-sm" disabled={!data.projectId} onClick={()=>edit(null)}>+ Criar US</button>}/>
   <SurfaceCard><ScrumSelectors projects={data.projects} projectId={data.projectId} onProject={data.setProjectId} sprints={data.sprints} sprintId={data.sprintId} onSprint={data.setSprintId}/>
     {data.error&&<p role="alert" className="mt-3 text-sm text-(--danger)">{data.error}</p>}
     <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)}/> Mostrar também US vinculadas às Sprints</label>
   </SurfaceCard>
   <SurfaceCard><div className="flex justify-between"><h2 className="font-semibold">{showAll?"Todas as US":"US aguardando Sprint"}</h2><span className="workspace-pill">{stories.length} US</span></div>
     <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{stories.map(s=>{
       const sprint=data.sprints.find(x=>x.id===s.sprint_id);const locked=sprint?.status==="closed";
       return <article key={s.id} className="rounded-xl border border-(--border) bg-(--bg-surface) p-4">
         <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-semibold">{s.title}</h3><span className="workspace-pill">{s.workflow_stage.toUpperCase()}</span></div>
         <p className="mt-2 line-clamp-3 text-sm text-(--text-secondary)">{s.description||"Sem descrição"}</p>
         <div className="mt-3 space-y-1 text-xs text-(--text-secondary)"><p>Prioridade: {s.priority} · Pontos: {s.story_points??"Não estimado"}</p><p>Responsável: {s.responsible||"Não atribuído"}</p><p>Entrega: {dateBR(s.due_date)}</p><p>{sprint?"Sprint: "+sprint.name:"Aguardando planejamento"}</p>{s.blocked&&<p className="text-(--danger)">Bloqueada: {s.blocker_reason||"Sem motivo"}</p>}</div>
         <div className="mt-4 flex flex-wrap gap-2"><button title="Visualizar US" aria-label={"Visualizar "+s.title} className="workspace-button-secondary p-2" onClick={()=>edit(s,true)}><Eye size={15}/></button><button title="Editar US" aria-label={"Editar "+s.title} className="workspace-button-secondary p-2" onClick={()=>edit(s)}><Pencil size={15}/></button>{!locked&&!s.sprint_id&&!s.has_history&&s.workflow_stage==="new"&&<button title="Excluir US" aria-label={"Excluir "+s.title} className="workspace-button-danger p-2" onClick={()=>void remove(s)}><Trash2 size={15}/></button>}{locked&&<span className="workspace-pill">Histórico protegido</span>}</div>
       </article>
     })}</div>
     {!stories.length&&<p className="mt-4 text-sm text-(--text-secondary)">Nenhuma US neste filtro. Use Criar US para iniciar o backlog.</p>}
   </SurfaceCard>
   {opened!==undefined&&<div className="fixed inset-0 z-50">
     <button type="button" aria-label="Fechar drawer" className="absolute inset-0 bg-black/40" onClick={()=>setOpened(undefined)}/>
     <aside role="dialog" aria-modal="true" aria-label={opened?"Editar US":"Criar US"} className="relative ml-auto h-dvh w-full max-w-2xl overflow-y-auto border-l border-(--border) bg-(--bg-surface) p-5 shadow-2xl">
       <div className="flex items-center justify-between border-b border-(--border) pb-4"><h2 className="text-lg font-semibold">{opened?"User Story":"Nova User Story"} {isLocked||readOnly?"(somente leitura)":""}</h2><button className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>setOpened(undefined)}>Fechar</button></div>
       <fieldset disabled={isLocked||readOnly||saving} className="mt-4 space-y-3">
         <label className="block text-xs">Título<input className="workspace-input mt-1 w-full" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></label>
         <label className="block text-xs">Descrição<textarea rows={3} className="workspace-input mt-1 w-full" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></label>
         <label className="block text-xs">Critérios de aceite<textarea rows={3} className="workspace-input mt-1 w-full" value={form.acceptanceCriteria} onChange={e=>setForm(f=>({...f,acceptanceCriteria:e.target.value}))}/></label>
         <div className="grid gap-3 sm:grid-cols-2">
           <label className="text-xs">Prioridade<select className="workspace-select mt-1 w-full" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></label>
           <label className="text-xs">Status Scrum<select className="workspace-select mt-1 w-full" value={form.stage} onChange={e=>setForm(f=>({...f,stage:e.target.value}))}>{stages.map(([value,label])=><option key={value} value={value} disabled={opened?value!==opened.workflow_stage&&!transitions[opened.workflow_stage]?.includes(value):value!=="new"}>{label}</option>)}</select></label>
           <label className="text-xs sm:col-span-2">Responsável (email)<input type="email" className="workspace-input mt-1 w-full" value={form.responsible} onChange={e=>setForm(f=>({...f,responsible:e.target.value}))}/></label>
           <label className="text-xs">Início<input className="workspace-input mt-1 w-full" type="date" value={form.startDate} onChange={e=>{const startDate=e.target.value;setForm(f=>({...f,startDate,dueDate:startDate&&Number(f.durationDays)>0?addDays(startDate,Number(f.durationDays)):f.dueDate}))}}/></label>
           <label className="text-xs">Duração (dias corridos)<input type="number" min="1" max="3650" className="workspace-input mt-1 w-full" value={form.durationDays} onChange={e=>{const durationDays=e.target.value;setForm(f=>({...f,durationDays,dueDate:f.startDate&&Number(durationDays)>0?addDays(f.startDate,Number(durationDays)):f.dueDate}))}}/></label>
           <label className="text-xs">Entrega prevista<input className="workspace-input mt-1 w-full" type="date" value={form.dueDate} onChange={e=>{const dueDate=e.target.value;setForm(f=>({...f,dueDate,durationDays:f.startDate&&dueDate?String(daysBetween(f.startDate,dueDate)):f.durationDays}))}}/></label>
           <label className="text-xs">Story points<input type="number" min="0" step="0.5" className="workspace-input mt-1 w-full" value={form.storyPoints} onChange={e=>setForm(f=>({...f,storyPoints:e.target.value}))}/></label>
           <label className="text-xs sm:col-span-2">Sprint (opcional)<select className="workspace-select mt-1 w-full" value={form.sprintId} disabled={Boolean(opened?.sprint_id)} onChange={e=>setForm(f=>({...f,sprintId:e.target.value}))}><option value="">Sem Sprint, permanecer no backlog</option>{data.sprints.filter(s=>s.status!=="closed"||s.id===form.sprintId).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
           <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.blocked} onChange={e=>setForm(f=>({...f,blocked:e.target.checked}))}/> Impedimento ativo</label>
           <label className="text-xs">Motivo do impedimento<input className="workspace-input mt-1 w-full" value={form.blockerReason} onChange={e=>setForm(f=>({...f,blockerReason:e.target.value}))}/></label>
         </div>
       </fieldset>
       {opened&&form.stage==="review"&&opened.workflow_stage!=="review"&&!isLocked&&!readOnly&&<label className="mt-3 block text-xs font-medium">Motivo obrigatório da REVIEW<textarea className="workspace-input mt-1 w-full" rows={3} value={transitionComment} onChange={e=>setTransitionComment(e.target.value)} placeholder="Explique o que precisa ser revisado"/></label>}
       {!isLocked&&!readOnly&&<button className="workspace-button-primary mt-4 px-4 py-2 text-sm" disabled={saving||!form.title.trim()} onClick={()=>void submit()}>{saving?"Salvando...":"Salvar US"}</button>}
       {data.error&&<p role="alert" className="mt-3 text-sm text-(--danger)">{data.error}</p>}
       {opened&&<section className="mt-5 border-t border-(--border) pt-4"><h3 className="font-semibold">Comentários</h3>{storyComments.map(c=><div key={c.id} className="mt-2 rounded-lg bg-(--bg-muted) p-3 text-sm"><p className="text-xs text-(--text-secondary)">{c.author_email} · {new Date(c.created_at).toLocaleString("pt-BR")}</p><p className="mt-1 whitespace-pre-wrap">{c.content}</p></div>)}{!isLocked&&!readOnly&&<><textarea className="workspace-input mt-3 w-full" rows={3} placeholder="Registrar acompanhamento..." value={commentText} onChange={e=>setCommentText(e.target.value)}/><button className="workspace-button-secondary mt-2 px-3 py-2 text-xs" disabled={saving||!commentText.trim()} onClick={()=>void comment()}>Adicionar comentário</button></>}</section>}
     </aside>
   </div>}
 </section>;
}
