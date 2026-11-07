"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {PageIntro,SurfaceCard} from "@/components/ui/workspace-primitives";
import {useConfirm} from "@/components/ui/confirm-dialog";
import {ScrumSelectors,useScrumData,apiGet,apiPost,Story,BacklogItem,ProjectMember,stages,transitions,dateBR,dateOnly,today,addDays,daysBetween} from "@/components/scrum/scrum-common";

type Row={id:string;type:"epic"|"feature"|"story"|"task";title:string;state:string;depth:number;order:number;story?:Story;item?:BacklogItem;ancestorIds:string[]};
type Form={title:string;description:string;acceptanceCriteria:string;priority:string;responsible:string;stage:string;startDate:string;dueDate:string;durationDays:string;storyPoints:string;blocked:boolean;blockerReason:string;sprintId:string;actualEndDate:string;featureId:string;parentId:string;storyId:string;sortOrder:string};
const initial=():Form=>({title:"",description:"",acceptanceCriteria:"",priority:"media",responsible:"",stage:"new",startDate:today(),dueDate:addDays(today(),3),durationDays:"3",storyPoints:"",blocked:false,blockerReason:"",sprintId:"",actualEndDate:"",featureId:"",parentId:"",storyId:"",sortOrder:"0"});
function fromStory(s:Story):Form{return {...initial(),title:s.title,description:s.description,acceptanceCriteria:s.acceptance_criteria,priority:s.priority,responsible:s.responsible||"",stage:s.workflow_stage,startDate:dateOnly(s.start_date),dueDate:dateOnly(s.due_date),durationDays:s.duration_days===null?"":String(s.duration_days),storyPoints:s.story_points===null?"":String(s.story_points),blocked:s.blocked,blockerReason:s.blocker_reason,sprintId:s.sprint_id||"",actualEndDate:dateOnly(s.actual_end_date),featureId:s.feature_id||"",sortOrder:String(s.sort_order||0)}}
function Icon({kind}:{kind:"view"|"edit"|"delete"|"add"}){return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==="view"?<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>:kind==="edit"?<><path d="m4 20 4-1 11-11-3-3L5 16l-1 4Z"/><path d="m14 6 3 3"/></>:kind==="delete"?<><path d="M4 6h16M9 6V4h6v2M7 6l1 14h8l1-14M10 10v7M14 10v7"/></>:<path d="M12 4v16M4 12h16"/>}</svg>}
const types={epic:"Epic",feature:"Feature",story:"User Story",task:"Task"} as const;
export default function BacklogPage(){
 const data=useScrumData();const confirm=useConfirm();
 const [items,setItems]=useState<BacklogItem[]>([]);const [members,setMembers]=useState<ProjectMember[]>([]);const [opened,setOpened]=useState<Row|null>(null);const [drawerOpen,setDrawerOpen]=useState(false);const [readOnly,setReadOnly]=useState(false);
 const [form,setForm]=useState<Form>(initial);const [saving,setSaving]=useState(false);const [comment,setComment]=useState("");const [transitionComment,setTransitionComment]=useState("");
 const [query,setQuery]=useState("");const [typeFilter,setTypeFilter]=useState("all");const [stateFilter,setStateFilter]=useState("all");const [sprintFilter,setSprintFilter]=useState("all");const [collapsed,setCollapsed]=useState<string[]>([]);
 const [error,setError]=useState("");
 const loadItems=useCallback(async()=>{if(!data.projectId){setItems([]);return;}try{const rows=await apiGet("/api/scrum/backlog-items?projectId="+encodeURIComponent(data.projectId));setItems(rows as BacklogItem[])}catch(e){setError(e instanceof Error?e.message:"Erro ao carregar hierarquia.")}},[data.projectId]);
 useEffect(()=>{void loadItems()},[loadItems]);
 useEffect(()=>{let live=true;if(!data.projectId){setMembers([]);return}void apiGet("/api/scrum/project-members?projectId="+encodeURIComponent(data.projectId)).then((v:ProjectMember[])=>{if(live)setMembers(v)}).catch(()=>{if(live)setMembers([])});return()=>{live=false}},[data.projectId]);
 const order=(a:{sort_order?:number;created_at?:string},b:{sort_order?:number;created_at?:string})=>(a.sort_order||0)-(b.sort_order||0)||(a.created_at||"").localeCompare(b.created_at||"");
 const rows=useMemo(()=>{
  const result:Row[]=[];const visited=new Set<string>();
  function pushItem(it:BacklogItem,depth:number,parents:string[]){if(visited.has(it.id))return;visited.add(it.id);result.push({id:it.id,type:it.item_type,title:it.title,state:it.state,depth,order:it.sort_order,item:it,ancestorIds:parents})}
  function pushStory(st:Story,depth:number,parents:string[]){result.push({id:st.id,type:"story",title:st.title,state:st.workflow_stage,depth,order:st.sort_order||0,story:st,ancestorIds:parents});items.filter(t=>t.item_type==="task"&&t.story_id===st.id).sort(order).forEach(t=>pushItem(t,depth+1,[...parents,st.id]))}
  items.filter(i=>i.item_type==="epic").sort(order).forEach(epic=>{
   pushItem(epic,0,[]);
   items.filter(i=>i.item_type==="feature"&&i.parent_id===epic.id).sort(order).forEach(feature=>{
    pushItem(feature,1,[epic.id]);
    data.stories.filter(s=>s.feature_id===feature.id).sort(order).forEach(s=>pushStory(s,2,[epic.id,feature.id]))
   })
  });
  data.stories.filter(s=>!s.feature_id||!items.some(i=>i.id===s.feature_id)).sort(order).forEach(s=>pushStory(s,0,[]));
  return result;
 },[items,data.stories]);
 const visible=rows.filter(r=>{
  const matchesText=!query||r.title.toLowerCase().includes(query.toLowerCase());
  const matchesType=typeFilter==="all"||r.type===typeFilter;
  const matchesState=stateFilter==="all"||r.state===stateFilter;
  const matchesSprint=sprintFilter==="all"||(r.story?sprintFilter==="unassigned"?!r.story.sprint_id:r.story.sprint_id===sprintFilter:true);
  const filtersActive=query||typeFilter!=="all"||stateFilter!=="all"||sprintFilter!=="all";
  return matchesText&&matchesType&&matchesState&&matchesSprint&&(!r.ancestorIds.some(p=>collapsed.includes(p))||Boolean(filtersActive));
 });
 function open(row:Row|null,type:Row["type"],view=false,defaults?:Partial<Form>){
  setOpened(row);setDrawerOpen(true);setReadOnly(view);setComment("");setTransitionComment("");setError("");
  if(row?.story)setForm(fromStory(row.story));
  else if(row?.item)setForm({...initial(),title:row.title,description:row.item.description,responsible:row.item.responsible||"",actualEndDate:dateOnly(row.item.actual_end_date),stage:row.state,parentId:row.item.parent_id||"",storyId:row.item.story_id||"",sortOrder:String(row.item.sort_order)});
  else setForm({...initial(),stage:type==="task"?"todo":"new",...defaults});
  setMode(type);
 }
 const [mode,setMode]=useState<Row["type"]>("story");
 const isLocked=Boolean(opened?.story?.sprint_id&&data.sprints.find(s=>s.id===opened.story?.sprint_id)?.status==="closed");
 async function submit(){
  if(!data.projectId||!form.title.trim()||saving||isLocked||readOnly)return;
  if(mode==="story"&&opened?.story&&form.stage==="review"&&opened.story.workflow_stage!=="review"&&!transitionComment.trim()){setError("O motivo é obrigatório ao solicitar REVIEW.");return}
  setSaving(true);setError("");
  try{
   if(mode==="story")await apiPost("/api/scrum/stories",{action:opened?"update":"create",projectId:data.projectId,storyId:opened?.id,title:form.title,description:form.description,acceptanceCriteria:form.acceptanceCriteria,priority:form.priority,responsible:form.responsible,stage:form.stage,startDate:form.startDate||null,dueDate:form.dueDate||null,durationDays:form.durationDays||null,storyPoints:form.storyPoints||null,blocked:form.blocked,blockerReason:form.blockerReason,sprintId:form.sprintId||null,featureId:form.featureId||null,actualEndDate:form.actualEndDate||null,transitionComment,sortOrder:Number(form.sortOrder)||0});
   else await apiPost("/api/scrum/backlog-items",{action:opened?"update":"create",projectId:data.projectId,id:opened?.id,itemType:mode,title:form.title,description:form.description,state:form.stage,responsible:form.responsible||null,parentId:form.parentId||null,storyId:form.storyId||null,sortOrder:Number(form.sortOrder)||0});
   setDrawerOpen(false);await Promise.all([data.refresh(),loadItems()]);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar.");}finally{setSaving(false)}
 }
 async function remove(row:Row){
  if(row.story&&(row.story.has_history||row.story.sprint_id||row.story.workflow_stage!=="new")){setError("Exclusão bloqueada: a US já possui histórico ou Sprint.");return}
  if(!await confirm({title:"Excluir "+types[row.type]+"?",description:"A exclusão é definitiva e só será permitida quando não houver filhos, vínculos ou movimentações.",confirmLabel:"Excluir",tone:"danger"}))return;
  setSaving(true);setError("");
  try{
   if(row.story)await apiPost("/api/scrum/stories",{action:"delete",projectId:data.projectId,storyId:row.id,confirmTitle:row.title});
   else await apiPost("/api/scrum/backlog-items",{action:"delete",projectId:data.projectId,id:row.id,itemType:row.type});
   await Promise.all([data.refresh(),loadItems()]);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível excluir.");}finally{setSaving(false)}
 }
 async function addComment(){if(!opened?.story||!comment.trim()||saving)return;setSaving(true);try{await apiPost("/api/scrum/stories",{action:"comment",projectId:data.projectId,storyId:opened.id,content:comment});setComment("");await data.refresh()}catch(e){setError(e instanceof Error?e.message:"Erro ao comentar.")}finally{setSaving(false)}}
 const epics=items.filter(i=>i.item_type==="epic"),features=items.filter(i=>i.item_type==="feature");
 const allComments=opened?.story?data.comments.filter(c=>c.story_id===opened.id):[];
 return <section className="space-y-3">
  <PageIntro eyebrow="Scrum e Sprints" title="Backlog do projeto" description="Hierarquia Epic → Feature → User Story → Task. Gerencie e priorize os itens independentemente de Sprint." aside={<div className="flex flex-wrap gap-2">{(["epic","feature","story","task"] as const).map(t=><button key={t} className="workspace-button-secondary rounded-lg px-3 py-2 text-xs" onClick={()=>open(null,t)}>+ {types[t]}</button>)}</div>}/>
  <SurfaceCard>
   <label className="block text-xs font-medium">Projeto<select className="workspace-select mt-1 w-full" value={data.projectId} onChange={e=>data.setProjectId(e.target.value)}><option value="">Selecione</option>{data.projects.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
   <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
    <input className="workspace-input w-full text-sm" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar título"/>
    <select className="workspace-select" aria-label="Filtrar tipo" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="all">Todos os tipos</option>{(["epic","feature","story","task"] as const).map(t=><option key={t} value={t}>{types[t]}</option>)}</select>
    <select className="workspace-select" aria-label="Filtrar status" value={stateFilter} onChange={e=>setStateFilter(e.target.value)}><option value="all">Todos os estados</option>{stages.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>
    <select className="workspace-select" aria-label="Filtrar Sprint" value={sprintFilter} onChange={e=>setSprintFilter(e.target.value)}><option value="all">Todas as Sprints</option><option value="unassigned">Sem Sprint</option>{data.sprints.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
   </div>
   <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-(--text-secondary)"><span>{visible.length} itens exibidos · {data.stories.length} US cadastradas</span><div className="flex gap-2"><button className="workspace-button-secondary px-2 py-1" onClick={()=>setCollapsed([...epics.map(e=>e.id),...features.map(f=>f.id)])}>Recolher</button><button className="workspace-button-secondary px-2 py-1" onClick={()=>setCollapsed([])}>Expandir</button><button className="workspace-button-secondary px-2 py-1" onClick={()=>{setQuery("");setTypeFilter("all");setStateFilter("all");setSprintFilter("all")}}>Limpar filtros</button></div></div>
   {(error||data.error)&&<p role="alert" className="mt-3 text-sm text-(--danger)">{error||data.error}</p>}
  </SurfaceCard>
  <SurfaceCard>
   <div className="overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-sm">
    <thead><tr className="border-b border-(--border) text-left text-xs text-(--text-secondary)"><th className="p-2 w-16">Ordem</th><th className="p-2 w-36">Work Item Type</th><th className="p-2">Title</th><th className="p-2 w-44">Responsável</th><th className="p-2 w-28">Status</th><th className="p-2 w-32">Ações</th></tr></thead>
    <tbody>{visible.map(r=><tr key={r.type+":"+r.id} className="border-b border-(--border) hover:bg-(--bg-muted)">
     <td className="p-2 text-xs text-(--text-secondary)">{r.order}</td>
     <td className="p-2 text-xs font-medium"><span className="inline-flex items-center gap-1.5">{r.type==="epic"?<span className="text-orange-600">◆</span>:r.type==="feature"?<span className="text-violet-600">⬡</span>:r.type==="story"?<span className="text-sky-600">▣</span>:<span className="text-emerald-600">☑</span>}{types[r.type]}</span></td>
     <td className="p-2"><div className="flex items-center gap-2" style={{paddingLeft:r.depth*18}}>
      {(r.type==="epic"||r.type==="feature"||r.type==="story")?<button type="button" className="shrink-0 text-xs" aria-label={collapsed.includes(r.id)?"Expandir":"Recolher"} onClick={()=>setCollapsed(c=>c.includes(r.id)?c.filter(x=>x!==r.id):[...c,r.id])}>{collapsed.includes(r.id)?"▸":"▾"}</button>:<span className="w-3"/>}
      <span className={r.type==="epic"?"font-semibold":""}>{r.title}</span>
      {(r.type==="epic"||r.type==="feature"||r.type==="story")&&<button type="button" title="Adicionar filho" className="rounded-md border border-(--border) p-1" onClick={()=>open(null,r.type==="epic"?"feature":r.type==="feature"?"story":"task",false,r.type==="epic"?{parentId:r.id}:r.type==="feature"?{featureId:r.id}:{storyId:r.id})}><Icon kind="add"/></button>}
     </div></td>
     <td className="p-2 text-xs"><div className="flex items-center gap-1.5">{(r.story?.responsible||r.item?.responsible)?<span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-(--bg-muted) text-[10px] font-bold">{(members.find(m=>m.email===(r.story?.responsible||r.item?.responsible))?.name||r.story?.responsible||r.item?.responsible||"?").slice(0,1).toUpperCase()}</span>:null}<span className="truncate" title={r.story?.responsible||r.item?.responsible||""}>{members.find(m=>m.email===(r.story?.responsible||r.item?.responsible))?.name||r.story?.responsible||r.item?.responsible||"Não atribuído"}</span></div></td>
     <td className="p-2 text-xs">{r.state.toUpperCase()}</td>
     <td className="p-2"><div className="flex gap-1">
      <button title="Visualizar" aria-label={"Visualizar "+r.title} className="rounded-md border border-(--border) p-1.5" onClick={()=>open(r,r.type,true)}><Icon kind="view"/></button>
      <button title="Editar" aria-label={"Editar "+r.title} className="rounded-md border border-(--border) p-1.5" onClick={()=>open(r,r.type)}><Icon kind="edit"/></button>
      <button title="Excluir" aria-label={"Excluir "+r.title} className="rounded-md border border-(--border) p-1.5 text-(--danger)" disabled={saving||Boolean(r.story&&(r.story.has_history||r.story.sprint_id||r.story.workflow_stage!=="new"))} onClick={()=>void remove(r)}><Icon kind="delete"/></button>
     </div></td>
    </tr>)}</tbody>
   </table>{!visible.length&&<p className="p-4 text-sm text-(--text-secondary)">Nenhum item encontrado. Ajuste os filtros ou cadastre um Epic.</p>}</div>
  </SurfaceCard>
  {drawerOpen&&<div className="fixed inset-0 z-50"><button className="absolute inset-0 bg-black/40" aria-label="Fechar" onClick={()=>setDrawerOpen(false)}/><aside role="dialog" aria-modal="true" aria-label={types[mode]} className="relative ml-auto h-dvh w-full max-w-2xl overflow-y-auto border-l border-(--border) bg-(--bg-surface) p-5 shadow-2xl">
   <div className="flex items-center justify-between border-b border-(--border) pb-3"><h2 className="text-lg font-semibold">{opened?"Gerenciar":"Criar"} {types[mode]}</h2><button className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>setDrawerOpen(false)}>Fechar</button></div>
   <fieldset disabled={readOnly||saving||isLocked} className="mt-4 space-y-3">
    <label className="block text-xs">Título<input className="workspace-input mt-1 w-full" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></label>
    <label className="block text-xs">Descrição<textarea rows={4} className="workspace-input mt-1 w-full" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></label>
    {mode==="feature"&&<label className="block text-xs">Epic pai<select className="workspace-select mt-1 w-full" value={form.parentId} onChange={e=>setForm(f=>({...f,parentId:e.target.value}))}><option value="">Selecione Epic</option>{epics.map(e=><option value={e.id} key={e.id}>{e.title}</option>)}</select></label>}
    {mode==="story"&&<>
      <label className="block text-xs">Feature (opcional)<select className="workspace-select mt-1 w-full" value={form.featureId} onChange={e=>setForm(f=>({...f,featureId:e.target.value}))}><option value="">US independente</option>{features.map(i=><option value={i.id} key={i.id}>{i.title}</option>)}</select></label>
      <label className="block text-xs">Critérios de aceite<textarea rows={3} className="workspace-input mt-1 w-full" value={form.acceptanceCriteria} onChange={e=>setForm(f=>({...f,acceptanceCriteria:e.target.value}))}/></label>
      <div className="grid grid-cols-2 gap-3">
       <label className="text-xs">Prioridade<select className="workspace-select mt-1 w-full" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>{["baixa","media","alta","critica"].map(p=><option key={p} value={p}>{p}</option>)}</select></label>
       <label className="text-xs">Status<select className="workspace-select mt-1 w-full" value={form.stage} onChange={e=>setForm(f=>({...f,stage:e.target.value}))}>{stages.map(([v,label])=><option key={v} value={v} disabled={Boolean(opened?.story&&v!==opened.story.workflow_stage&&!transitions[opened.story.workflow_stage]?.includes(v))}>{label}</option>)}</select></label>
       <label className="text-xs col-span-2">Responsável<select className="workspace-select mt-1 w-full" value={form.responsible} onChange={e=>setForm(f=>({...f,responsible:e.target.value}))}><option value="">Não atribuído</option>{members.map(m=><option key={m.email} value={m.email}>{m.name} ({m.email})</option>)}</select></label>
       <label className="text-xs">Início<input type="date" className="workspace-input mt-1 w-full" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value,dueDate:e.target.value&&Number(f.durationDays)>0?addDays(e.target.value,Number(f.durationDays)):f.dueDate}))}/></label>
       <label className="text-xs">Prazo (dias corridos)<input type="number" min="1" className="workspace-input mt-1 w-full" value={form.durationDays} onChange={e=>setForm(f=>({...f,durationDays:e.target.value,dueDate:f.startDate&&Number(e.target.value)>0?addDays(f.startDate,Number(e.target.value)):f.dueDate}))}/></label>
       <label className="text-xs">Entrega<input type="date" className="workspace-input mt-1 w-full" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value,durationDays:f.startDate&&e.target.value?String(daysBetween(f.startDate,e.target.value)):f.durationDays}))}/></label>
       <label className="text-xs">Story points<select className="workspace-select mt-1 w-full" value={form.storyPoints} onChange={e=>setForm(f=>({...f,storyPoints:e.target.value}))}><option value="">Não estimado</option>{[1,2,3,4].map(n=><option key={n} value={n}>{n} {n===1?"(baixa)":n===2?"(moderada)":n===3?"(alta)":"(muito alta)"}</option>)}</select></label>
       <label className="text-xs">Data real de conclusão<input type="date" className="workspace-input mt-1 w-full" value={form.actualEndDate} onChange={e=>setForm(f=>({...f,actualEndDate:e.target.value}))}/></label>
       <label className="text-xs col-span-2">Sprint (opcional)<select className="workspace-select mt-1 w-full" value={form.sprintId} disabled={Boolean(opened?.story?.sprint_id)} onChange={e=>setForm(f=>({...f,sprintId:e.target.value}))}><option value="">Sem Sprint</option>{data.sprints.filter(s=>s.status!=="closed"||s.id===form.sprintId).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
       <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={form.blocked} onChange={e=>setForm(f=>({...f,blocked:e.target.checked}))}/> Impedimento</label>
       <label className="text-xs">Motivo<input className="workspace-input mt-1 w-full" value={form.blockerReason} onChange={e=>setForm(f=>({...f,blockerReason:e.target.value}))}/></label>
      </div>
      {opened?.story&&form.stage==="review"&&opened.story.workflow_stage!=="review"&&<label className="block text-xs">Justificativa obrigatória para REVIEW<textarea className="workspace-input mt-1 w-full" value={transitionComment} onChange={e=>setTransitionComment(e.target.value)}/></label>}
    </>}
    {mode==="task"&&<label className="block text-xs">User Story pai<select className="workspace-select mt-1 w-full" value={form.storyId} onChange={e=>setForm(f=>({...f,storyId:e.target.value}))}><option value="">Selecione a US</option>{data.stories.map(st=><option value={st.id} key={st.id}>{st.title}</option>)}</select></label>}
    {mode==="task"&&<label className="block text-xs">Responsável<select className="workspace-select mt-1 w-full" value={form.responsible} onChange={e=>setForm(f=>({...f,responsible:e.target.value}))}><option value="">Não atribuído</option>{members.map(m=><option value={m.email} key={m.email}>{m.name} ({m.email})</option>)}</select></label>}
    <div className="grid grid-cols-2 gap-3"><label className="text-xs">Ordem<input type="number" min="0" className="workspace-input mt-1 w-full" value={form.sortOrder} onChange={e=>setForm(f=>({...f,sortOrder:e.target.value}))}/></label>{mode!=="story"&&<label className="text-xs">Estado<select className="workspace-select mt-1 w-full" value={form.stage} onChange={e=>setForm(f=>({...f,stage:e.target.value}))}>{(mode==="task"?[["todo","TO DO"],["doing","DOING"],["done","DONE"]] as const:stages).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>}</div>
   </fieldset>
   {!readOnly&&!isLocked&&<button className="workspace-button-primary mt-4 px-4 py-2 text-sm" disabled={saving||!form.title.trim()||mode==="feature"&&!form.parentId||mode==="task"&&!form.storyId} onClick={()=>void submit()}>{saving?"Salvando...":"Salvar "+types[mode]}</button>}
   {error&&<p role="alert" className="mt-3 text-sm text-(--danger)">{error}</p>}
   {opened?.story&&<section className="mt-5 border-t border-(--border) pt-3"><h3 className="font-semibold text-sm">Histórico de comentários</h3>{allComments.map(c=><div key={c.id} className="mt-2 rounded-lg bg-(--bg-muted) p-3 text-xs"><p className="text-(--text-secondary)">{c.author_email} · {new Date(c.created_at).toLocaleString("pt-BR")}</p><p className="mt-1 whitespace-pre-wrap">{c.content}</p></div>)}{!isLocked&&!readOnly&&<><textarea className="workspace-input mt-3 w-full" rows={3} placeholder="Registrar acompanhamento..." value={comment} onChange={e=>setComment(e.target.value)}/><button className="workspace-button-secondary mt-2 px-3 py-2 text-xs" disabled={saving||!comment.trim()} onClick={()=>void addComment()}>Comentar</button></>}</section>}
  </aside></div>}
 </section>;
}
