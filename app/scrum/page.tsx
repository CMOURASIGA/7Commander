"use client";
import Link from "next/link";
import {useState} from "react";
import {useConfirm} from "@/components/ui/confirm-dialog";
import {PageIntro,SurfaceCard} from "@/components/ui/workspace-primitives";
import {ScrumSelectors,useScrumData,apiPost,today,addDays,dateBR} from "@/components/scrum/scrum-common";

export default function ScrumPage(){
 const data=useScrumData();const confirm=useConfirm();
 const [drawer,setDrawer]=useState(false);const [saving,setSaving]=useState(false);
 const [form,setForm]=useState({name:"",goal:"",startDate:today(),endDate:addDays(today(),14)});
 const selected=data.sprints.find(s=>s.id===data.sprintId);
 const linked=data.stories.filter(st=>st.sprint_id===data.sprintId);
 const overdue=linked.filter(st=>st.workflow_stage!=="closed"&&st.due_date&&st.due_date<today()).length;
 const blocked=linked.filter(st=>st.blocked).length;
 const finished=linked.filter(st=>st.workflow_stage==="closed").length;
 const backlogged=data.stories.filter(st=>!st.sprint_id).length;
 const estimated=linked.reduce((n,st)=>n+Number(st.story_points||0),0);
 const avgPoints=linked.filter(st=>st.story_points!==null).length?estimated/linked.filter(st=>st.story_points!==null).length:0;
 const complexity=avgPoints===0?"Sem estimativa":avgPoints<=1.5?"Baixa":avgPoints<=2.75?"Média":"Alta";
 const delivered=linked.filter(st=>st.actual_end_date);
 const onTime=delivered.filter(st=>st.due_date&&st.actual_end_date!<=st.due_date).length;
 const late=delivered.filter(st=>st.due_date&&st.actual_end_date!>st.due_date).length;
 const plannedCount=linked.filter(st=>st.due_date).length;
 async function submit(){if(!data.projectId||saving||!form.name.trim())return;setSaving(true);data.setError("");
 try{await apiPost("/api/scrum",{action:"create_sprint",projectId:data.projectId,...form});setDrawer(false);setForm(f=>({...f,name:"",goal:""}));await data.refresh();}
 catch(e){data.setError(e instanceof Error?e.message:"Falha ao criar Sprint.");}finally{setSaving(false)}}
 async function changeStatus(value:string){if(!selected)return;
 if(value==="closed"&&!await confirm({title:"Encerrar Sprint?",description:"A Sprint será encerrada definitivamente. Todas as US vinculadas ficarão protegidas contra alterações e exclusões.",confirmLabel:"Encerrar Sprint",tone:"danger"}))return;
 setSaving(true);try{await apiPost("/api/scrum",{action:"update_sprint",projectId:data.projectId,sprintId:selected.id,status:value});await data.refresh()}catch(e){data.setError(e instanceof Error?e.message:"Falha ao mudar Sprint")}finally{setSaving(false)}}
 return <section className="space-y-4">
   <PageIntro eyebrow="Gestão de projetos" title="Scrum e Sprints" description="Painel gerencial de Sprints, histórias e impedimentos. As User Stories são independentes do Kanban de atividades." aside={<button className="workspace-button-primary rounded-lg px-4 py-2 text-sm" onClick={()=>setDrawer(true)}>+ Criar Sprint</button>}/>
   <SurfaceCard><ScrumSelectors projects={data.projects} projectId={data.projectId} onProject={data.setProjectId} sprints={data.sprints} sprintId={data.sprintId} onSprint={data.setSprintId}/>{data.error&&<p role="alert" className="mt-3 text-sm text-(--danger)">{data.error}</p>}</SurfaceCard>
   {selected?<SurfaceCard>
     <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{selected.name}</h2><p className="mt-1 text-sm text-(--text-secondary)">Meta: {selected.goal||"Não definida"} · {dateBR(selected.start_date)} a {dateBR(selected.end_date)}</p></div>
      <label className="text-xs">Situação da Sprint<select className="workspace-select mt-1 w-full" disabled={saving||selected.status==="closed"} value={selected.status} onChange={e=>void changeStatus(e.target.value)}><option value="planned">Planejada</option><option value="active">Ativa</option><option value="closed">Encerrada</option></select></label>
     </div>
     <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{[["US vinculadas",linked.length],["Concluídas",finished],["Em execução",linked.filter(s=>s.workflow_stage==="active").length],["Atrasadas",overdue],["Impedimentos",blocked],["Pontos entregues",linked.filter(s=>s.workflow_stage==="closed").reduce((n,s)=>n+Number(s.story_points||0),0)]].map(([name,value])=><div className="rounded-lg bg-(--bg-muted) p-3" key={name}><p className="text-xs text-(--text-secondary)">{name}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div>
     <div className="mt-4"><div className="flex justify-between text-xs"><span>Progresso por US concluída</span><strong>{linked.length?Math.round(finished/linked.length*100):0}%</strong></div><div className="mt-2 h-2 rounded-full bg-(--border)"><div className="h-2 rounded-full bg-(--accent)" style={{width:(linked.length?finished/linked.length*100:0)+"%"}}/></div></div>
     <div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-lg border border-(--border) p-3"><p className="font-medium text-sm">Atenção da equipe</p><p className="mt-2 text-sm">{overdue} US atrasadas e {blocked} bloqueadas nesta Sprint.</p></div><div className="rounded-lg border border-(--border) p-3"><p className="font-medium text-sm">Próximas decisões</p><p className="mt-2 text-sm">{linked.filter(s=>s.workflow_stage==="resolved").length} US aguardando validação; {backlogged} US disponíveis no backlog.</p></div></div>

     <div className="mt-5 border-t border-(--border) pt-4">
       <h3 className="text-sm font-semibold">Indicadores de planejamento e execução</h3>
       <div className="mt-3 grid gap-3 md:grid-cols-3">
         <div className="rounded-lg border border-(--border) p-3"><p className="text-xs text-(--text-secondary)">Complexidade estimada da Sprint</p><p className="mt-1 text-xl font-semibold">{complexity}</p><p className="text-xs">Média de {avgPoints.toFixed(1)} pontos por US estimada · {estimated} pontos previstos</p></div>
         <div className="rounded-lg border border-(--border) p-3"><p className="text-xs text-(--text-secondary)">Entregas realizadas</p><p className="mt-1 text-xl font-semibold">{delivered.length} / {plannedCount}</p><p className="text-xs">US com data real / US com data prevista</p></div>
         <div className="rounded-lg border border-(--border) p-3"><p className="text-xs text-(--text-secondary)">Pontualidade das entregas</p><p className="mt-1 text-xl font-semibold">{onTime} no prazo · {late} atrasadas</p><p className="text-xs">Calculado a partir das datas previstas e reais</p></div>
       </div>
       <div className="mt-4 grid gap-4 md:grid-cols-2">
         <div><p className="text-xs font-medium">Distribuição de complexidade das US</p>
           {[1,2,3,4].map(n=><div key={n} className="mt-2 flex items-center gap-2 text-xs"><span className="w-14">Pontos {n}</span><div className="h-3 flex-1 overflow-hidden rounded-full bg-(--bg-muted)"><div className="h-3 rounded-full bg-(--accent)" style={{width:(linked.length?100*linked.filter(st=>Number(st.story_points)===n).length/linked.length:0)+"%"}}/></div><span className="w-6 text-right">{linked.filter(st=>Number(st.story_points)===n).length}</span></div>)}
         </div>
         <div><p className="text-xs font-medium">Entregas previstas e efetivas</p>
           {([["Previstas",plannedCount],["Realizadas",delivered.length],["No prazo",onTime],["Atrasadas",late]] as const).map(([label,n])=><div key={label} className="mt-2 flex items-center gap-2 text-xs"><span className="w-20">{label}</span><div className="h-3 flex-1 overflow-hidden rounded-full bg-(--bg-muted)"><div className="h-3 rounded-full bg-(--accent)" style={{width:(plannedCount?100*n/plannedCount:0)+"%"}}/></div><span className="w-6 text-right">{n}</span></div>)}
         </div>
       </div>
       <p className="mt-3 text-xs text-(--text-secondary)">Complexidade: média até 1,5 = baixa; acima de 1,5 até 2,75 = média; acima de 2,75 = alta. Critério configurado para esta versão, não é uma classificação oficial do Scrum.</p>
     </div>
     <div className="mt-4 flex flex-wrap items-center gap-2">
       <Link href={"/scrum/kanban?projectId="+encodeURIComponent(data.projectId)+"&sprintId="+encodeURIComponent(selected.id)} className="workspace-button-primary rounded-lg px-4 py-2 text-sm">Abrir Kanban da Sprint</Link>
       <Link href={"/scrum/backlog?projectId="+encodeURIComponent(data.projectId)} className="workspace-button-secondary rounded-lg px-4 py-2 text-sm">Gerenciar backlog</Link>
     </div>
    </SurfaceCard>:<SurfaceCard><p className="text-sm text-(--text-secondary)">{data.loading?"Carregando...":"Selecione ou crie uma Sprint para acompanhar seus indicadores."}</p></SurfaceCard>}
   {drawer&&<div className="fixed inset-0 z-50"><button aria-label="Fechar" className="absolute inset-0 bg-black/40" onClick={()=>setDrawer(false)}/><aside role="dialog" aria-modal="true" aria-label="Criar Sprint" className="relative ml-auto h-dvh w-full max-w-xl overflow-y-auto border-l border-(--border) bg-(--bg-surface) p-5 shadow-2xl"><div className="flex justify-between gap-2 border-b border-(--border) pb-4"><h2 className="font-semibold text-lg">Criar Sprint</h2><button className="workspace-button-secondary px-3 py-2 text-sm" onClick={()=>setDrawer(false)}>Fechar</button></div><div className="mt-4 space-y-4">
     <label className="block text-sm">Nome<input className="workspace-input mt-1 w-full" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></label>
     <label className="block text-sm">Meta da Sprint<textarea className="workspace-input mt-1 w-full" rows={4} value={form.goal} onChange={e=>setForm(f=>({...f,goal:e.target.value}))}/></label>
     <label className="block text-sm">Data inicial<input className="workspace-input mt-1 w-full" type="date" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/></label>
     <label className="block text-sm">Data final<input className="workspace-input mt-1 w-full" type="date" value={form.endDate} min={form.startDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/></label>
     <p className="text-xs text-(--text-secondary)">A Sprint nasce Planejada. Adicione US no Backlog de US e acompanhe no Kanban de US.</p>
     <button className="workspace-button-primary px-4 py-2 text-sm" disabled={saving||!data.projectId||form.name.trim().length<2||!form.startDate||form.endDate<form.startDate} onClick={()=>void submit()}>{saving?"Salvando...":"Salvar Sprint"}</button>
   </div></aside></div>}
 </section>;
}
