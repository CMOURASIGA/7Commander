"use client";
import {IconActionButton} from "@/components/ui/icon-action-button";

import {measuredFetch} from "@/lib/client-performance";
import Link from "next/link";
import { useEffect,useState } from "react";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
import { getClientAuthHeaders } from "@/lib/client-auth";
import {useCentralPilotReadOnly} from "@/lib/use-central-pilot-read-only";
type Item={id:string;projectId:string;projectName:string;title:string;priority:string;dueDate:string|null;status?:string};
type ScrumNotification={id:string;story_id:string;project_id:string;message:string;event_type:string;actor_email:string|null;created_at:string;read_at:string|null};
export function TaskAlerts({center=false}:{center?:boolean}){
 const {readOnly,checking}=useCentralPilotReadOnly();
 const [savingTaskId,setSavingTaskId]=useState<string|null>(null);
 const [statusError,setStatusError]=useState<string|null>(null);
 const [statusSuccess,setStatusSuccess]=useState<string|null>(null);
 const auth=useKairosAuth();const [items,setItems]=useState<Item[]>([]);const [open,setOpen]=useState(false);const [error,setError]=useState(false);const [scrum,setScrum]=useState<ScrumNotification[]>([]);const [projectNames,setProjectNames]=useState<Record<string,string>>({});
 useEffect(()=>{if(!auth.user){setItems([]);setScrum([]);setOpen(false);return;}let active=true;let controller:AbortController|null=null;const load=async()=>{controller?.abort();controller=new AbortController();try{const headers=getClientAuthHeaders();const [r,notifications]=await Promise.all([measuredFetch("/api/my-tasks",{headers,cache:"no-store",signal:controller.signal}),measuredFetch("/api/scrum/notifications",{headers,cache:"no-store",signal:controller.signal})]);if(!r.ok||!notifications.ok)throw Error();const [j,n]=await Promise.all([r.json(),notifications.json()]);if(active){setItems((j.data||[]).filter((item:Item,index:number,list:Item[])=>list.findIndex(other=>other.id===item.id)===index));setScrum((n.data||[]).filter((item:ScrumNotification,index:number,list:ScrumNotification[])=>list.findIndex(other=>other.id===item.id)===index));setError(false)}}catch(err){if(active && !(err instanceof Error && err.name==="AbortError"))setError(true)}};
 void load();void measuredFetch("/api/projects",{headers:getClientAuthHeaders(),cache:"no-store"}).then(async response=>{if(!response.ok)return;const data=await response.json();if(active)setProjectNames(Object.fromEntries((data.data||[]).map((p:{id:string;name:string})=>[p.id,p.name])));}).catch(()=>{});const timer=setInterval(()=>{if(document.visibilityState==="visible")void load()},60000);const refresh=()=>void load();const onTaskChanged=(event:Event)=>{const change=(event as CustomEvent<{taskId?:string;completed?:boolean}>).detail;if(change?.completed&&change.taskId)setItems(prev=>prev.filter(item=>item.id!==change.taskId));void load();};window.addEventListener("focus",refresh);window.addEventListener("7commander:organization-selected",refresh);window.addEventListener("7commander:tasks-changed",onTaskChanged);return()=>{active=false;clearInterval(timer);controller?.abort();window.removeEventListener("focus",refresh);window.removeEventListener("7commander:organization-selected",refresh);window.removeEventListener("7commander:tasks-changed",onTaskChanged)}},[auth.user?.id]);
 async function changeTaskStatus(item:Item,columnKey:"todo"|"doing"|"done"){
  if(readOnly||checking||savingTaskId)return;
  setSavingTaskId(item.id);setStatusError(null);setStatusSuccess(null);
  try{
   const response=await measuredFetch("/api/tasks/"+encodeURIComponent(item.id)+"/status",{
    method:"PATCH",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
    body:JSON.stringify({projectId:item.projectId,columnKey})
   });
   const json=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(json.error||"Não foi possível alterar o status.");
   const next=json.data?.status as string|undefined;
   if(!next)throw Error("Resposta de alteração sem status confirmado.");
   if(columnKey==="done")setItems(previous=>previous.filter(entry=>entry.id!==item.id));
   else setItems(previous=>previous.map(entry=>entry.id===item.id?{...entry,status:next}:entry));
   setStatusSuccess("Status de "+item.title+" atualizado.");
   window.dispatchEvent(new CustomEvent("7commander:tasks-changed",{detail:{taskId:item.id,completed:columnKey==="done"}}));
  }catch(err){setStatusError(err instanceof Error?err.message:"Erro ao alterar status.");}
  finally{setSavingTaskId(null);}
 }
 useEffect(()=>{
  if(!open)return;
  const onEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};
  window.addEventListener("keydown",onEscape);
  return()=>window.removeEventListener("keydown",onEscape);
 },[open]);
 if(!auth.user)return null;
 if(center)return (items.length||scrum.length)?<div role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-slate-900"><strong>Você tem {items.length} atividade(s) e {scrum.length} notificação(ões) Scrum pendentes</strong><p className="mt-1 text-sm">Confira as atividades atribuídas a você nos projetos da empresa selecionada.</p><div className="mt-2 space-y-1">{scrum.slice(0,3).map(n=><p key={n.id} className="text-sm"><Link className="underline" href={"/scrum/kanban?projectId="+encodeURIComponent(n.project_id)+"&storyId="+encodeURIComponent(n.story_id)}>{projectNames[n.project_id]||"Projeto autorizado"} · {n.message} · Abrir US no Kanban</Link></p>)}{items.slice(0,3).map(i=><p key={i.id} className="text-sm"><Link className="underline" href={"/activities?projectId="+encodeURIComponent(i.projectId)+"&taskId="+encodeURIComponent(i.id)}>{i.projectName}: {i.title}</Link></p>)}</div></div>:null;
 const total=items.length+scrum.length;
 return <>
  <button type="button" aria-label={"Abrir central de notificações, "+total+" pendente(s)"}
    aria-controls="commander-notification-drawer" aria-expanded={open} onClick={()=>setOpen(true)}
    className="rounded-xl border border-(--border) bg-(--bg-surface) px-3 py-2 text-sm font-semibold hover:bg-(--bg-muted)">
    <span aria-hidden="true">🔔</span>{total>0?" "+total:""}
  </button>
  {open&&<div className="fixed inset-0 z-[90]">
    <button type="button" aria-label="Fechar central de notificações" className="absolute inset-0 bg-slate-950/45"
      onClick={()=>setOpen(false)}/>
    <aside id="commander-notification-drawer" role="dialog" aria-modal="true"
      aria-label="Central de notificações" className="absolute right-0 top-0 flex h-dvh w-full max-w-[520px] flex-col overflow-hidden border-l border-(--border) bg-(--bg-surface) shadow-2xl">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-(--border) px-5 py-5">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">7Commander</p>
         <h2 className="mt-1 text-xl font-semibold text-(--text-primary)">Central de notificações</h2>
         <p className="mt-1 text-sm text-(--text-secondary)">{total} pendência(s) · Atividades e Scrum</p></div>
        <button type="button" onClick={()=>setOpen(false)} aria-label="Fechar notificações"
         className="workspace-button-secondary px-3 py-2 text-xs">Fechar ✕</button>
      </header>
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5">
        {error&&<div role="alert" className="rounded-xl border border-(--danger) bg-(--danger-soft) p-3 text-sm text-(--danger)">
         Não foi possível atualizar as notificações. Os registros abaixo podem estar desatualizados.
        </div>}
        {statusError?<p role="alert" className="rounded-lg border border-(--danger) bg-(--danger-soft) p-3 text-sm font-semibold text-(--danger)">{statusError}</p>:null}
        {statusSuccess?<p role="status" className="rounded-lg border border-(--border) p-3 text-sm">{statusSuccess}</p>:null}
        {!total&&!error?<div className="workspace-empty-state p-5 text-sm">Nenhuma notificação pendente.</div>:null}
        {scrum.length>0&&<section aria-label="Notificações de Scrum" className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="font-semibold">Scrum e User Stories</h3>
           <span className="rounded-full bg-(--bg-muted) px-2 py-1 text-xs">{scrum.length}</span></div>
          {scrum.map(n=><article key={n.id} className="workspace-card space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
             <span className="rounded-lg bg-(--accent-soft) px-2 py-1 text-xs font-semibold text-(--accent)">Scrum</span>
             <span className="text-xs text-(--text-secondary)">{new Date(n.created_at).toLocaleString("pt-BR")}</span>
            </div>
            <p className="text-sm font-semibold">{n.message}</p>
            <p className="text-xs text-(--text-secondary)">Projeto: {projectNames[n.project_id]||"Projeto autorizado"} · Origem: {n.event_type}</p>
            <div className="flex flex-wrap items-center gap-2">
             <Link href={"/scrum/kanban?projectId="+encodeURIComponent(n.project_id)+"&storyId="+encodeURIComponent(n.story_id)}
              onClick={()=>setOpen(false)} className="workspace-button-primary px-3 py-2 text-xs">Abrir User Story</Link>
             <IconActionButton icon="check-circle" tone="success" label={"Marcar notificação "+n.id+" como lida"}
              onClick={()=>{void measuredFetch("/api/scrum/notifications",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({id:n.id})}).then(async res=>{if(res.ok){const value=await res.json();if(value.data?.updated)setScrum(prev=>prev.filter(x=>x.id!==n.id));}else setError(true)}).catch(()=>setError(true));}}/>
            </div>
          </article>)}
        </section>}
        {items.length>0&&<section aria-label="Atividades pendentes" className="space-y-3">
         <div className="flex items-center justify-between"><h3 className="font-semibold">Atividades atribuídas</h3>
          <span className="rounded-full bg-(--bg-muted) px-2 py-1 text-xs">{items.length}</span></div>
         {items.map(item=><article key={item.id} className="workspace-card space-y-3 p-4">
           <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-lg bg-(--bg-muted) px-2 py-1 text-xs font-semibold">Kanban operacional</span>
            <span className="text-xs text-(--text-secondary)">Prioridade: {item.priority||"Não informada"}</span>
           </div>
           <p className="text-sm font-semibold">{item.title}</p>
           <p className="text-xs text-(--text-secondary)">Projeto: {item.projectName}</p>
           <p className="text-xs text-(--text-secondary)">Prazo: {item.dueDate?new Date(item.dueDate).toLocaleDateString("pt-BR"):"Não informado"}</p>
           <label className="block text-xs font-semibold text-(--text-secondary)">
             Status da atividade
             <select aria-label={"Alterar status de "+item.title}
               className="workspace-select mt-1 w-full" value={item.status==="concluida"?"done":item.status==="em_andamento"?"doing":"todo"}
               disabled={readOnly||checking||savingTaskId===item.id}
               onChange={e=>void changeTaskStatus(item,e.target.value as "todo"|"doing"|"done")}>
                <option value="todo">TO DO · A fazer</option>
                <option value="doing">DOING · Em andamento</option>
                <option value="done">DONE · Concluída</option>
             </select>
           </label>
           {readOnly?<p className="text-xs text-(--text-secondary)">Somente leitura: a mudança de status deve ser feita em ambiente autorizado.</p>:null}
           {savingTaskId===item.id?<p className="text-xs text-(--text-secondary)">Atualizando status...</p>:null}
           <Link onClick={()=>setOpen(false)}
             href={"/activities?projectId="+encodeURIComponent(item.projectId)+"&taskId="+encodeURIComponent(item.id)}
             className="workspace-button-primary px-3 py-2 text-xs">Abrir card e trabalhar</Link>
         </article>)}
        </section>}
      </div>
      <footer className="shrink-0 border-t border-(--border) px-5 py-3 text-xs text-(--text-secondary)">
        Atividades continuam pendentes até a atualização de seu estado. Notificações Scrum podem ser marcadas como lidas.
      </footer>
    </aside>
   </div>}
 </>;
}
