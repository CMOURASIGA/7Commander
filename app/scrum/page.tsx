"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { PageIntro, SurfaceCard } from "@/components/ui/workspace-primitives";

type Project={id:string;name:string};
type Sprint={id:string;name:string;goal:string;status:"planned"|"active"|"closed";start_date:string;end_date:string};
type Task={id:string;titulo:string;descricao:string|null;status:string;prioridade:string;responsavel:string|null;due_date:string|null;created_at:string};
type Item={sprint_id:string;task_id:string;planned_start_date:string|null;planned_end_date:string|null;duration_days:number|null;story_points:number|null;workflow_stage:string;blocked:boolean;blocker_reason:string};
type Snapshot={sprints:Sprint[];tasks:Task[];items:Item[]};
const workflow=[["new","NEW"],["review","REVIEW"],["rework","REWORK"],["ready","READY"],["active","ACTIVE"],["resolved","RESOLVED"],["closed","CLOSED"],["rejected","REJECT"]] as const;
const allowed:Record<string,string[]>={new:["review"],review:["ready","rework"],rework:["review"],ready:["active","rejected","rework"],active:["resolved","rework"],resolved:["closed","rework","rejected"],closed:[],rejected:[]};
const iso=(date:Date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
const dateOnly=(s:string|null)=>s?.slice(0,10)||"";
const addDays=(start:string,days:number)=>{const d=new Date(start+"T12:00:00Z");if(Number.isNaN(d.getTime()))return "";d.setUTCDate(d.getUTCDate()+days-1);return d.toISOString().slice(0,10)};
const period=(a:string,b:string)=>Math.round((Date.parse(b+"T12:00:00Z")-Date.parse(a+"T12:00:00Z"))/86400000)+1;
const empty:Snapshot={sprints:[],tasks:[],items:[]};

export default function ScrumPage(){
  const confirm=useConfirm();
  const [projects,setProjects]=useState<Project[]>([]);
  const [projectId,setProjectId]=useState("");
  const [snapshot,setSnapshot]=useState<Snapshot>(empty);
  const [sprintId,setSprintId]=useState("");
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [form,setForm]=useState({name:"",goal:"",startDate:iso(new Date()),endDate:addDays(iso(new Date()),14)});
  const [drafts,setDrafts]=useState<Record<string,{startDate:string;endDate:string;duration:string;points:string;stage:string;blocked:boolean;blockerReason:string}>>({});
  const [taskToAdd,setTaskToAdd]=useState("");
  const [newUs,setNewUs]=useState({title:"",description:"",priority:"media" as "baixa"|"media"|"alta"|"critica",startDate:iso(new Date()),duration:"3",endDate:addDays(iso(new Date()),3),points:""});
  const [creatingUs,setCreatingUs]=useState(false);
  const [drawerTaskId,setDrawerTaskId]=useState<string|null>(null);
  const [drawerForm,setDrawerForm]=useState({title:"",description:"",priority:"media",responsible:"",dueDate:""});
  const [drawerComments,setDrawerComments]=useState<Array<{id:string;authorEmail:string;content:string;createdAt:string}>>([]);
  const [drawerComment,setDrawerComment]=useState("");
  const [drawerLoading,setDrawerLoading]=useState(false);
  const [drawerSaving,setDrawerSaving]=useState(false);
  const [activeTab,setActiveTab]=useState<"backlog"|"sprint">("backlog");
  const [createdNotice,setCreatedNotice]=useState("");

  useEffect(()=>{let live=true;void (async()=>{try{
    const r=await fetch("/api/scrum",{headers:getClientAuthHeaders(),cache:"no-store"});
    const j=await r.json();if(!r.ok)throw new Error(j.error||"Falha ao carregar projetos.");
    if(live){setProjects(j.data);setProjectId(current=>current||j.data?.[0]?.id||"");}
  }catch(e){if(live)setMessage(e instanceof Error?e.message:"Falha ao carregar projetos.");}})();return()=>{live=false}},[]);

  const load=useCallback(async()=>{if(!projectId){setSnapshot(empty);return}
    setLoading(true);setMessage("");
    try{const r=await fetch("/api/scrum?projectId="+encodeURIComponent(projectId),{headers:getClientAuthHeaders(),cache:"no-store"});
      const j=await r.json();if(!r.ok)throw new Error(j.error||"Não foi possível carregar Sprints.");
      setSnapshot(j.data);setSprintId(current=>j.data.sprints.some((s:Sprint)=>s.id===current)?current:j.data.sprints[0]?.id||"");
    }catch(e){setSnapshot(empty);setMessage(e instanceof Error?e.message:"Falha na consulta.");}
    finally{setLoading(false)}
  },[projectId]);
  useEffect(()=>{void load()},[load]);

  const selected=useMemo(()=>snapshot.sprints.find(s=>s.id===sprintId),[snapshot.sprints,sprintId]);
  const items=useMemo(()=>snapshot.items.filter(i=>i.sprint_id===sprintId),[snapshot.items,sprintId]);
  const pool=useMemo(()=>snapshot.tasks.filter(t=>!items.some(i=>i.task_id===t.id)),[snapshot.tasks,items]);
  const summary=useMemo(()=>{
    const today=iso(new Date());
    return {
      total:items.length,
      finished:items.filter(i=>i.workflow_stage==="closed").length,
      blocked:items.filter(i=>i.blocked).length,
      points:items.reduce((n,i)=>n+Number(i.story_points||0),0),
      completedPoints:items.filter(i=>i.workflow_stage==="closed").reduce((n,i)=>n+Number(i.story_points||0),0),
      overdue:items.filter(i=>i.workflow_stage!=="closed" && dateOnly(i.planned_end_date)!=="" && dateOnly(i.planned_end_date)<today).length,
      remaining:items.filter(i=>i.workflow_stage!=="closed" && i.workflow_stage!=="rejected").length,
    };
  },[items]);

  async function send(payload:Record<string,unknown>){
    setSaving(true);setMessage("");
    try{
      const r=await fetch("/api/scrum",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({projectId,...payload})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||"Falha ao salvar.");
      await load();return true;
    }catch(e){setMessage(e instanceof Error?e.message:"Falha ao salvar.");return false}
    finally{setSaving(false)}
  }
  async function createSprint(){if(!form.name.trim())return;await send({action:"create_sprint",...form});}
  async function createUs(){
    if(!projectId||!newUs.title.trim()||creatingUs)return;
    setCreatingUs(true);setMessage("");setCreatedNotice("");
    let createdId="";
    try {
      if(!newUs.startDate||!newUs.endDate||newUs.endDate<newUs.startDate)throw new Error("Informe um período válido para a US.");
      const r=await fetch("/api/projects/"+encodeURIComponent(projectId)+"/tasks",{
        method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
        body:JSON.stringify({title:newUs.title.trim(),description:newUs.description.trim(),priority:newUs.priority,columnKey:"todo",dueDate:newUs.endDate})
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok||!j.data?.id)throw new Error(j.error||"Não foi possível criar o card no Kanban.");
      createdId=j.data.id;
      if(selected&&selected.status!=="closed"&&activeTab==="sprint"){
        const link=await fetch("/api/scrum",{
          method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
          body:JSON.stringify({action:"upsert_task",projectId,sprintId:selected.id,taskId:createdId,workflowStage:"new",startDate:newUs.startDate,endDate:newUs.endDate,durationDays:Number(newUs.duration),storyPoints:newUs.points?Number(newUs.points):null})
        });
        const linked=await link.json().catch(()=>({}));
        if(!link.ok)throw new Error(linked.error||"Falha ao vincular a US à Sprint.");
      }
      setNewUs(f=>({...f,title:"",description:"",points:""}));
      setCreatedNotice(activeTab==="sprint"&&selected?.status!=="closed"?"US criada no Kanban e vinculada à Sprint.":"US criada no backlog do Kanban. Você poderá vinculá-la depois.");
      await load();
    }catch(e){
      const reason=e instanceof Error?e.message:"Falha ao criar a US.";
      setMessage(createdId?"O card foi criado no Kanban, mas não vinculado à Sprint. Selecione-o em Adicionar US do Kanban. Detalhe: "+reason:reason);
      if(createdId)await load();
    }finally{setCreatingUs(false)}
  }
  function draft(item:Item){
    return drafts[item.task_id]??{startDate:dateOnly(item.planned_start_date),endDate:dateOnly(item.planned_end_date),duration:item.duration_days?.toString()||"",points:item.story_points?.toString()||"",stage:item.workflow_stage,blocked:item.blocked,blockerReason:item.blocker_reason||""};
  }
  function updateDraft(item:Item,patch:Partial<ReturnType<typeof draft>>){setDrafts(prev=>({...prev,[item.task_id]:{...draft(item),...patch}}))}
  async function saveItem(item:Item){
    const d=draft(item);
    const ok=await send({action:"upsert_task",sprintId,taskId:item.task_id,startDate:d.startDate||null,endDate:d.endDate||null,durationDays:d.duration||null,storyPoints:d.points||null,workflowStage:d.stage,blocked:d.blocked,blockerReason:d.blockerReason});
    if(ok)setDrafts(prev=>{const next={...prev};delete next[item.task_id];return next});
  }

  async function openUs(task:Task) {
    setDrawerTaskId(task.id);setDrawerLoading(true);setDrawerComments([]);setDrawerComment("");
    setDrawerForm({title:task.titulo,description:task.descricao||"",priority:task.prioridade,responsible:task.responsavel||"",dueDate:dateOnly(task.due_date)});
    try {
      const r=await fetch("/api/tasks/"+encodeURIComponent(task.id)+"/details",{headers:getClientAuthHeaders(),cache:"no-store"});
      const json=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(json.error||"Falha ao abrir atividade.");
      setDrawerComments(json.data?.comments||[]);
    }catch(e){setMessage(e instanceof Error?e.message:"Erro ao abrir US.");}finally{setDrawerLoading(false)}
  }
  async function saveUs(){
    if(!drawerTaskId||drawerSaving||!drawerForm.title.trim())return;
    setDrawerSaving(true);setMessage("");
    try{
      const r=await fetch("/api/tasks/"+encodeURIComponent(drawerTaskId)+"/details",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({action:"update_core",title:drawerForm.title,description:drawerForm.description,priority:drawerForm.priority,responsible:drawerForm.responsible||null,dueDate:drawerForm.dueDate||null})});
      const json=await r.json().catch(()=>({}));if(!r.ok)throw new Error(json.error||"Falha ao salvar US.");
      setDrawerTaskId(null);await load();
    }catch(e){setMessage(e instanceof Error?e.message:"Falha ao salvar US.");}finally{setDrawerSaving(false)}
  }
  async function addUsComment(){
    if(!drawerTaskId||!drawerComment.trim()||drawerSaving)return;
    setDrawerSaving(true);setMessage("");
    try{
      const r=await fetch("/api/tasks/"+encodeURIComponent(drawerTaskId)+"/details",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({action:"add_comment",content:drawerComment.trim()})});
      const json=await r.json().catch(()=>({}));if(!r.ok)throw new Error(json.error||"Falha ao registrar comentário.");
      setDrawerComments(json.data?.comments||[]);setDrawerComment("");
    }catch(e){setMessage(e instanceof Error?e.message:"Falha ao registrar comentário.");}finally{setDrawerSaving(false)}
  }
  async function deleteUs(task:Task) {
    const linked=snapshot.items.some(i=>i.task_id===task.id);
    if(linked){setMessage("Esta US possui vínculo com Sprint. Não é possível excluí-la enquanto houver histórico Scrum. Para uma Sprint não encerrada, use a ação Retirar da Sprint.");return}
    const approved=await confirm({title:"Excluir US "+task.titulo+"?",description:"Exclusão definitiva do card original do Kanban, inclusive seus registros associados quando houver exclusão em cascata. Esta ação não pode ser desfeita.",confirmLabel:"Excluir US",tone:"danger"});
    if(!approved)return;
    const typed=window.prompt("Confirme digitando o título exato da US:\n"+task.titulo);
    if(typed!==task.titulo){setMessage("Exclusão cancelada: título não corresponde.");return}
    const ok=await send({action:"delete_us",taskId:task.id,confirmTitle:typed});
    if(ok&&drawerTaskId===task.id)setDrawerTaskId(null);
  }
  async function unlinkUs(item:Item) {
    if(selected?.status==="closed"){setMessage("Sprint encerrada: o histórico não pode ser alterado.");return}
    const task=snapshot.tasks.find(t=>t.id===item.task_id);
    const approved=await confirm({title:"Retirar US da Sprint?",description:"A US "+(task?.titulo||"selecionada")+" permanecerá no Kanban e poderá ser planejada novamente. O vínculo com esta Sprint será removido.",confirmLabel:"Retirar da Sprint"});
    if(approved)await send({action:"unlink_task",sprintId:item.sprint_id,taskId:item.task_id});
  }
  return <section className="space-y-4">
    <PageIntro eyebrow="Gestão de projetos" title="Scrum e Sprints" description="As US são atividades do Kanban. Planejamento, execução e validação preservam um único card e seu histórico."/>
    <SurfaceCard>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">Projeto
          <select className="workspace-select mt-1 w-full" value={projectId} onChange={e=>{setProjectId(e.target.value);setSprintId("");setDrafts({})}}>
            {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="text-sm">Sprint
          <select className="workspace-select mt-1 w-full" value={sprintId} onChange={e=>{setSprintId(e.target.value);setDrafts({})}}>
            <option value="">Selecione</option>{snapshot.sprints.map(s=><option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
          </select>
        </label>
      </div>
      {message&&<p role="alert" className="mt-3 rounded-lg bg-(--warning-soft) p-3 text-sm text-(--warning)">{message}</p>}
      {loading&&<p className="mt-2 text-sm">Carregando dados do projeto...</p>}
    </SurfaceCard>

    <SurfaceCard>
      <h2 className="mb-3 font-semibold">Criar Sprint</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs">Nome<input className="workspace-input mt-1 w-full" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Sprint 01"/></label>
        <label className="text-xs">Meta<input className="workspace-input mt-1 w-full" value={form.goal} onChange={e=>setForm(f=>({...f,goal:e.target.value}))} placeholder="Resultado esperado"/></label>
        <label className="text-xs">Início<input className="workspace-input mt-1 w-full" type="date" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/></label>
        <label className="text-xs">Fim<input className="workspace-input mt-1 w-full" type="date" value={form.endDate} min={form.startDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/></label>
      </div>
      <button type="button" disabled={!projectId||saving||!form.name.trim()} onClick={()=>void createSprint()} className="workspace-button-primary mt-3 px-4 py-2 text-sm">Criar Sprint</button>
    </SurfaceCard>


    <SurfaceCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Backlog Scrum e planejamento</h2><p className="mt-1 text-xs text-(--text-secondary)">US sem Sprint são atividades do Kanban disponíveis para planejamento. Você também pode acompanhar as US da Sprint.</p></div>
        <div className="flex gap-2">
          <button className={activeTab==="backlog"?"workspace-button-primary px-3 py-2 text-sm":"workspace-button-secondary px-3 py-2 text-sm"} onClick={()=>setActiveTab("backlog")}>Backlog de US</button>
          <button className={activeTab==="sprint"?"workspace-button-primary px-3 py-2 text-sm":"workspace-button-secondary px-3 py-2 text-sm"} disabled={!selected} onClick={()=>setActiveTab("sprint")}>Sprint selecionada</button>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-(--border) bg-(--bg-muted) p-4">
        <h3 className="text-sm font-semibold">{activeTab==="sprint"?"Criar US diretamente na Sprint":"Criar US no backlog, sem Sprint obrigatória"}</h3>
        <p className="mt-1 text-xs text-(--text-secondary)">Sempre cria o card no Kanban original. O vínculo Scrum é independente da criação.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs">Título da US<input className="workspace-input mt-1 w-full" value={newUs.title} maxLength={180} onChange={e=>setNewUs(f=>({...f,title:e.target.value}))}/></label>
          <label className="text-xs">Prioridade<select className="workspace-select mt-1 w-full" value={newUs.priority} onChange={e=>setNewUs(f=>({...f,priority:e.target.value as typeof f.priority}))}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></label>
          <label className="text-xs sm:col-span-2">Descrição e critérios de aceite<textarea className="workspace-input mt-1 w-full" rows={3} value={newUs.description} onChange={e=>setNewUs(f=>({...f,description:e.target.value}))}/></label>
          <label className="text-xs">Início planejado<input className="workspace-input mt-1 w-full" type="date" value={newUs.startDate} onChange={e=>{const date=e.target.value;setNewUs(f=>({...f,startDate:date,endDate:date&&Number(f.duration)>0?addDays(date,Number(f.duration)):f.endDate}))}}/></label>
          <label className="text-xs">Duração (dias corridos)<input type="number" className="workspace-input mt-1 w-full" min={1} max={3650} value={newUs.duration} onChange={e=>{const duration=e.target.value;setNewUs(f=>({...f,duration,endDate:f.startDate&&Number(duration)>0?addDays(f.startDate,Number(duration)):f.endDate}))}}/></label>
          <label className="text-xs">Data de entrega<input className="workspace-input mt-1 w-full" type="date" min={newUs.startDate} value={newUs.endDate} onChange={e=>{const endDate=e.target.value;setNewUs(f=>({...f,endDate,duration:f.startDate&&endDate?String(period(f.startDate,endDate)):f.duration}))}}/></label>
          <label className="text-xs">Story points (opcional)<input className="workspace-input mt-1 w-full" type="number" min="0" step="0.5" value={newUs.points} onChange={e=>setNewUs(f=>({...f,points:e.target.value}))}/></label>
        </div>
        <button type="button" className="workspace-button-primary mt-3 px-4 py-2 text-sm" disabled={creatingUs||saving||!newUs.title.trim()||!newUs.startDate||!newUs.endDate||!(Number(newUs.duration)>0)||(activeTab==="sprint"&&(!selected||selected.status==="closed"))} onClick={()=>void createUs()}>{creatingUs?"Criando...":activeTab==="sprint"?"Criar US e incluir na Sprint":"Criar US no backlog"}</button>
        {createdNotice&&<p role="status" className="mt-2 text-xs text-(--success)">{createdNotice}</p>}
      </div>
    </SurfaceCard>
    {activeTab==="backlog"&&<SurfaceCard>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">US disponíveis no Kanban</h2><Link href="/activities" className="workspace-button-secondary px-3 py-2 text-xs">Abrir Kanban</Link></div>
      <p className="mt-1 text-xs text-(--text-secondary)">Atividades do projeto que ainda não estão vinculadas à Sprint selecionada. Cards existentes podem ser editados aqui.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.tasks.filter(t=>!snapshot.items.some(i=>i.task_id===t.id)).map(task=><article key={task.id} className="rounded-xl border border-(--border) bg-(--bg-surface) p-4">
          <div className="flex items-start justify-between gap-2"><h3 className="font-semibold text-sm">{task.titulo}</h3><span className="workspace-pill">{task.status}</span></div>
          <p className="mt-2 text-xs text-(--text-secondary)">{task.descricao||"Sem descrição"}</p>
          <div className="mt-3 space-y-1 text-xs text-(--text-secondary)"><p>Responsável: {task.responsavel||"Não atribuído"}</p><p>Prioridade: {task.prioridade} · Entrega: {dateOnly(task.due_date)||"Sem prazo"}</p></div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>void openUs(task)}>Editar</button>
            <button type="button" className="workspace-button-secondary px-3 py-2 text-xs" disabled={!selected||selected.status==="closed"||saving} onClick={()=>void send({action:"upsert_task",sprintId:selected?.id,taskId:task.id,workflowStage:"new"})}>Vincular à Sprint</button>
            <button type="button" className="workspace-button-danger px-3 py-2 text-xs" disabled={saving} onClick={()=>void deleteUs(task)}>Excluir</button>
          </div>
        </article>)}
      </div>
      {!snapshot.tasks.length&&<p className="mt-3 text-sm text-(--text-secondary)">Nenhuma atividade cadastrada no Kanban deste projeto.</p>}
    </SurfaceCard>}
    {selected&&activeTab==="sprint"&&<SurfaceCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">{selected.name}</h2><p className="mt-1 text-xs text-(--text-secondary)">{selected.goal||"Meta não definida"} · {dateOnly(selected.start_date)} a {dateOnly(selected.end_date)}</p></div>
        <label className="text-xs">Estado <select className="workspace-select ml-2" value={selected.status} disabled={saving||selected.status==="closed"} onChange={e=>void send({action:"update_sprint",sprintId,status:e.target.value})}><option value="planned">Planejada</option><option value="active">Ativa</option><option value="closed">Encerrada</option></select></label>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {[["US",summary.total],["Concluídas",summary.finished],["Bloqueadas",summary.blocked],["Atrasadas",summary.overdue],["Restantes",summary.remaining],["Pontos",summary.points]].map(([label,n])=><div key={label} className="rounded-xl bg-(--bg-muted) p-3"><p className="text-xs text-(--text-secondary)">{label}</p><p className="mt-2 text-2xl font-semibold">{n}</p></div>)}
      </div>
      <div className="mt-3 rounded-lg bg-(--bg-muted) p-3"><p className="text-xs">Progresso por US concluídas: {summary.total?Math.round(summary.finished/summary.total*100):0}%</p><div className="mt-2 h-2 rounded-full bg-(--border)"><div className="h-full rounded-full bg-(--accent)" style={{width:(summary.total?summary.finished/summary.total*100:0)+"%"}}/></div></div>
      {selected.status!=="closed"&&<div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="min-w-56 flex-1 text-xs">Vincular US existente do Kanban<select className="workspace-select mt-1 w-full" value={taskToAdd} onChange={e=>setTaskToAdd(e.target.value)}><option value="">Selecione uma atividade</option>{pool.map(t=><option key={t.id} value={t.id}>{t.titulo}</option>)}</select></label>
        <Link href="/activities" className="workspace-button-secondary px-3 py-2 text-sm">Abrir Kanban</Link>
        <button className="workspace-button-primary px-3 py-2 text-sm" disabled={!taskToAdd||saving} onClick={()=>void send({action:"upsert_task",sprintId,taskId:taskToAdd,workflowStage:"new"}).then(ok=>{if(ok)setTaskToAdd("")})}>Vincular</button>
      </div>}
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map(item=>{
          const task=snapshot.tasks.find(t=>t.id===item.task_id);if(!task)return null;
          const d=draft(item);
          return <article key={item.task_id} className="rounded-xl border border-(--border) bg-(--bg-surface) p-4">
            <div className="flex items-start justify-between gap-2"><h3 className="font-semibold text-sm">{task.titulo}</h3><span className="workspace-pill">{item.workflow_stage.toUpperCase()}</span></div>
            <p className="mt-2 text-xs text-(--text-secondary)">{task.descricao||"Sem descrição"}</p>
            <div className="mt-3 space-y-1 text-xs text-(--text-secondary)">
              <p>Responsável: {task.responsavel||"Não atribuído"}</p>
              <p>Prioridade: {task.prioridade} · Pontos: {item.story_points??"Não estimado"}</p>
              <p>Início: {dateOnly(item.planned_start_date)||"Não informado"} · Entrega: {dateOnly(item.planned_end_date)||dateOnly(task.due_date)||"Não informada"}</p>
              {item.blocked&&<p className="font-semibold text-(--danger)">Impedimento ativo: {item.blocker_reason||"Sem motivo informado"}</p>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>{void openUs(task);setActiveTab("sprint")}}>Editar card</button>
              {selected.status!=="closed"&&<button className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>void unlinkUs(item)}>Retirar da Sprint</button>}
              {selected.status==="closed"&&<span className="workspace-pill">Histórico protegido</span>}
            </div>
            {selected.status!=="closed"&&<details className="mt-3 rounded-lg border border-(--border) p-3"><summary className="cursor-pointer text-xs font-semibold">Atualizar planejamento Scrum</summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="text-xs">Início<input className="workspace-input mt-1 w-full" type="date" value={d.startDate} onChange={e=>updateDraft(item,{startDate:e.target.value})}/></label>
                <label className="text-xs">Duração em dias<input className="workspace-input mt-1 w-full" type="number" value={d.duration} min={1} onChange={e=>updateDraft(item,{duration:e.target.value,endDate:d.startDate&&Number(e.target.value)>0?addDays(d.startDate,Number(e.target.value)):d.endDate})}/></label>
                <label className="text-xs">Entrega<input className="workspace-input mt-1 w-full" type="date" value={d.endDate} onChange={e=>updateDraft(item,{endDate:e.target.value,duration:d.startDate&&e.target.value?String(period(d.startDate,e.target.value)):d.duration})}/></label>
                <label className="text-xs">Story points<input className="workspace-input mt-1 w-full" type="number" min={0} step={0.5} value={d.points} onChange={e=>updateDraft(item,{points:e.target.value})}/></label>
                <label className="text-xs">Etapa<select className="workspace-select mt-1 w-full" value={d.stage} onChange={e=>updateDraft(item,{stage:e.target.value})}>{workflow.map(([value,label])=><option key={value} value={value} disabled={value!==item.workflow_stage&&!allowed[item.workflow_stage]?.includes(value)}>{label}</option>)}</select></label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={d.blocked} onChange={e=>updateDraft(item,{blocked:e.target.checked})}/> Impedimento ativo</label>
                <label className="text-xs sm:col-span-2">Motivo<input className="workspace-input mt-1 w-full" value={d.blockerReason} onChange={e=>updateDraft(item,{blockerReason:e.target.value})}/></label>
              </div>
              <button className="workspace-button-primary mt-3 px-3 py-2 text-xs" disabled={saving} onClick={()=>void saveItem(item)}>Salvar acompanhamento</button>
            </details>}
          </article>;
        })}
      </div>
      {items.length===0&&<p className="mt-4 text-sm text-(--text-secondary)">Nenhuma US vinculada. Selecione uma do Kanban ou crie diretamente nesta Sprint.</p>}
    </SurfaceCard>}
    {drawerTaskId&&<div className="fixed inset-0 z-50">
      <button type="button" aria-label="Fechar drawer" className="absolute inset-0 bg-black/40" onClick={()=>setDrawerTaskId(null)}/>
      <aside role="dialog" aria-modal="true" aria-label="Editar US" className="relative ml-auto flex h-dvh w-full max-w-2xl flex-col overflow-y-auto border-l border-(--border) bg-(--bg-surface) p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-(--border) pb-4"><h2 className="text-lg font-semibold">Editar User Story</h2><button className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>setDrawerTaskId(null)}>Fechar</button></div>
        {drawerLoading?<p className="mt-4 text-sm">Carregando histórico...</p>:<div className="mt-4 space-y-3">
          <label className="block text-xs">Título<input className="workspace-input mt-1 w-full" value={drawerForm.title} onChange={e=>setDrawerForm(v=>({...v,title:e.target.value}))}/></label>
          <label className="block text-xs">Descrição e critérios de aceite<textarea className="workspace-input mt-1 w-full" rows={5} value={drawerForm.description} onChange={e=>setDrawerForm(v=>({...v,description:e.target.value}))}/></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs">Prioridade<select className="workspace-select mt-1 w-full" value={drawerForm.priority} onChange={e=>setDrawerForm(v=>({...v,priority:e.target.value}))}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></label>
            <label className="text-xs">Data de entrega<input className="workspace-input mt-1 w-full" type="date" value={drawerForm.dueDate} onChange={e=>setDrawerForm(v=>({...v,dueDate:e.target.value}))}/></label>
            <label className="text-xs sm:col-span-2">Responsável<input className="workspace-input mt-1 w-full" type="email" value={drawerForm.responsible} onChange={e=>setDrawerForm(v=>({...v,responsible:e.target.value}))}/></label>
          </div>
          <div className="flex justify-end gap-2"><button className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>setDrawerTaskId(null)}>Cancelar</button><button className="workspace-button-primary px-3 py-2 text-xs" disabled={drawerSaving||!drawerForm.title.trim()} onClick={()=>void saveUs()}>Salvar alterações</button></div>
          <div className="border-t border-(--border) pt-4"><h3 className="font-semibold text-sm">Histórico de comentários</h3>
            {drawerComments.map(c=><div key={c.id} className="mt-3 rounded-lg bg-(--bg-muted) p-3"><p className="text-xs font-semibold">{c.authorEmail} · {new Date(c.createdAt).toLocaleString("pt-BR")}</p><p className="mt-2 whitespace-pre-wrap text-sm">{c.content}</p></div>)}
            <textarea className="workspace-input mt-3 w-full" rows={3} value={drawerComment} placeholder="Registrar acompanhamento..." onChange={e=>setDrawerComment(e.target.value)}/>
            <button className="workspace-button-secondary mt-2 px-3 py-2 text-xs" disabled={drawerSaving||!drawerComment.trim()} onClick={()=>void addUsComment()}>Adicionar comentário</button>
          </div>
        </div>}
      </aside>
    </div>}

  </section>;
}
