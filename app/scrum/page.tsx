"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
    if(!projectId||!selected||selected.status==="closed"||!newUs.title.trim()||creatingUs)return;
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
      const link=await fetch("/api/scrum",{
        method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
        body:JSON.stringify({action:"upsert_task",projectId,sprintId:selected.id,taskId:createdId,workflowStage:"new",startDate:newUs.startDate,endDate:newUs.endDate,durationDays:Number(newUs.duration),storyPoints:newUs.points?Number(newUs.points):null})
      });
      const linked=await link.json().catch(()=>({}));
      if(!link.ok)throw new Error(linked.error||"Falha ao vincular a US à Sprint.");
      setNewUs(f=>({...f,title:"",description:"",points:""}));
      setCreatedNotice("US criada no Kanban e vinculada à Sprint.");
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

    {selected&&<SurfaceCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">{selected.name}</h2><p className="mt-1 text-xs text-(--text-secondary)">{selected.goal||"Sem meta informada"} · {dateOnly(selected.start_date)} a {dateOnly(selected.end_date)}</p></div>
        <label className="text-xs">Estado
          <select className="workspace-select ml-2" value={selected.status} disabled={saving} onChange={e=>void send({action:"update_sprint",sprintId,status:e.target.value})}>
            <option value="planned">Planejada</option><option value="active">Ativa</option><option value="closed">Encerrada</option>
          </select>
        </label>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {[["US na Sprint",summary.total],["Concluídas",summary.finished],["Bloqueadas",summary.blocked],["Atrasadas",summary.overdue],["Restantes",summary.remaining],["Story Points",summary.points]].map(([label,n])=><div key={label} className="rounded-xl bg-(--bg-muted) p-3"><p className="text-xs text-(--text-secondary)">{label}</p><p className="mt-2 text-2xl font-semibold">{n}</p></div>)}
      </div>
      <div className="mt-3 rounded-lg bg-(--bg-muted) p-3">
        <div className="flex items-center justify-between gap-2 text-xs"><span>Progresso da Sprint por US concluídas</span><strong>{summary.total?Math.round(summary.finished/summary.total*100):0}%</strong></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-(--border)"><div className="h-full rounded-full bg-(--accent)" style={{width:(summary.total?summary.finished/summary.total*100:0)+"%"}}/></div>
        <p className="mt-2 text-xs text-(--text-secondary)">Story points concluídos: {summary.completedPoints} de {summary.points}. Métricas calculadas exclusivamente a partir das US vinculadas.</p>
      </div>
      {selected.status!=="closed"&&<div className="mt-4 rounded-xl border border-(--border) bg-(--bg-muted) p-4">
        <h3 className="font-semibold text-sm">Criar US nesta Sprint</h3>
        <p className="mt-1 text-xs text-(--text-secondary)">O card será criado também no Kanban do projeto, sem duplicação.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs">Título da US<input className="workspace-input mt-1 w-full" value={newUs.title} maxLength={180} placeholder="Ex.: Validar integração com ERP" onChange={e=>setNewUs(f=>({...f,title:e.target.value}))}/></label>
          <label className="text-xs">Prioridade<select className="workspace-select mt-1 w-full" value={newUs.priority} onChange={e=>setNewUs(f=>({...f,priority:e.target.value as typeof f.priority}))}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></label>
          <label className="text-xs sm:col-span-2">Descrição e critérios de aceite<textarea className="workspace-input mt-1 w-full" rows={3} value={newUs.description} onChange={e=>setNewUs(f=>({...f,description:e.target.value}))}/></label>
          <label className="text-xs">Início previsto<input className="workspace-input mt-1 w-full" type="date" value={newUs.startDate} onChange={e=>{const value=e.target.value;setNewUs(f=>({...f,startDate:value,endDate:value&&Number(f.duration)>0?addDays(value,Number(f.duration)):f.endDate}))}}/></label>
          <label className="text-xs">Duração (dias corridos)<input className="workspace-input mt-1 w-full" type="number" min="1" max="3650" value={newUs.duration} onChange={e=>{const value=e.target.value;setNewUs(f=>({...f,duration:value,endDate:f.startDate&&Number(value)>0?addDays(f.startDate,Number(value)):f.endDate}))}}/></label>
          <label className="text-xs">Entrega prevista<input className="workspace-input mt-1 w-full" type="date" min={newUs.startDate} value={newUs.endDate} onChange={e=>{const value=e.target.value;setNewUs(f=>({...f,endDate:value,duration:f.startDate&&value?String(period(f.startDate,value)):f.duration}))}}/></label>
          <label className="text-xs">Story points (opcional)<input className="workspace-input mt-1 w-full" type="number" min="0" step="0.5" value={newUs.points} onChange={e=>setNewUs(f=>({...f,points:e.target.value}))}/></label>
        </div>
        <button type="button" className="workspace-button-primary mt-3 px-4 py-2 text-sm" disabled={creatingUs||saving||!newUs.title.trim()||!newUs.startDate||!newUs.endDate||!newUs.duration} onClick={()=>void createUs()}>{creatingUs?"Criando US...":"Criar US e incluir na Sprint"}</button>
        {createdNotice&&<p role="status" className="mt-2 text-xs text-(--success)">{createdNotice}</p>}
      </div>}
      {selected.status!=="closed"&&<div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="min-w-52 flex-1 text-xs">Adicionar US do Kanban
          <select className="workspace-select mt-1 w-full" value={taskToAdd} onChange={e=>setTaskToAdd(e.target.value)}>
            <option value="">Selecione uma atividade</option>{pool.map(task=><option key={task.id} value={task.id}>{task.titulo}</option>)}
          </select>
        </label>
        <Link href="/activities" className="workspace-button-secondary px-4 py-2 text-sm">Abrir Kanban</Link>
        <button className="workspace-button-primary px-4 py-2 text-sm" disabled={!taskToAdd||saving} onClick={()=>void send({action:"upsert_task",sprintId,taskId:taskToAdd,workflowStage:"new"}).then(ok=>{if(ok)setTaskToAdd("")})}>Vincular à Sprint</button>
      </div>}
      <div className="mt-4 space-y-3">
        {items.length===0&&<p className="text-sm text-(--text-secondary)">Nenhuma atividade selecionada para esta Sprint.</p>}
        {items.map(item=>{
          const task=snapshot.tasks.find(t=>t.id===item.task_id);if(!task)return null;
          const d=draft(item);
          return <article key={item.task_id} className="rounded-xl border border-(--border) bg-(--bg-surface) p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{task.titulo}</h3><span className="workspace-pill">{task.status}</span></div>
            <p className="mt-1 text-xs text-(--text-secondary)">Responsável: {task.responsavel||"Não atribuído"} · Abertura do card: {dateOnly(task.created_at)} · Prazo no Kanban: {dateOnly(task.due_date)||"Não definido"}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs">Início planejado<input type="date" className="workspace-input mt-1 w-full" value={d.startDate} disabled={selected.status==="closed"} onChange={e=>{const start=e.target.value;updateDraft(item,{startDate:start,endDate:start&&Number(d.duration)>0?addDays(start,Number(d.duration)):d.endDate})}}/></label>
              <label className="text-xs">Prazo em dias<input type="number" min="1" max="3650" className="workspace-input mt-1 w-full" value={d.duration} disabled={selected.status==="closed"} onChange={e=>{const duration=e.target.value;updateDraft(item,{duration,endDate:d.startDate&&Number(duration)>0?addDays(d.startDate,Number(duration)):d.endDate})}}/></label>
              <label className="text-xs">Entrega prevista<input type="date" className="workspace-input mt-1 w-full" value={d.endDate} disabled={selected.status==="closed"} min={d.startDate||undefined} onChange={e=>updateDraft(item,{endDate:e.target.value,duration:d.startDate&&e.target.value?String(period(d.startDate,e.target.value)):d.duration})}/></label>
              <label className="text-xs">Story points<input type="number" min="0" step="0.5" className="workspace-input mt-1 w-full" value={d.points} disabled={selected.status==="closed"} onChange={e=>updateDraft(item,{points:e.target.value})}/></label>
              <label className="text-xs">Etapa Scrum<select className="workspace-select mt-1 w-full" value={d.stage} disabled={selected.status==="closed"} onChange={e=>updateDraft(item,{stage:e.target.value})}>{workflow.map(([value,label])=><option key={value} value={value} disabled={value!==item.workflow_stage && !allowed[item.workflow_stage]?.includes(value)}>{label}</option>)}</select></label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={d.blocked} disabled={selected.status==="closed"} onChange={e=>updateDraft(item,{blocked:e.target.checked})}/> Impedimento ativo</label>
              <label className="text-xs sm:col-span-2">Motivo do impedimento<input className="workspace-input mt-1 w-full" value={d.blockerReason} disabled={selected.status==="closed"} onChange={e=>updateDraft(item,{blockerReason:e.target.value})}/></label>
            </div>
            {selected.status!=="closed"&&<div className="mt-3 flex flex-wrap justify-end gap-2">
              <button className="workspace-button-secondary px-3 py-2 text-xs" disabled={saving} onClick={()=>void send({action:"unlink_task",sprintId,taskId:item.task_id})}>Retornar ao backlog</button>
              <button className="workspace-button-primary px-3 py-2 text-xs" disabled={saving} onClick={()=>void saveItem(item)}>Salvar US</button>
            </div>}
          </article>;
        })}
      </div>
    </SurfaceCard>}
  </section>;
}
