"use client";

import {measuredFetch} from "@/lib/client-performance";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {getClientAuthHeaders} from "@/lib/client-auth";
export type Project={id:string;name:string};
export type Sprint={id:string;name:string;goal:string;status:"planned"|"active"|"closed";start_date:string;end_date:string};
export type Story={id:string;actual_end_date?:string|null;feature_id?:string|null;sort_order?:number;has_history?:boolean;project_id:string;sprint_id:string|null;title:string;description:string;acceptance_criteria:string;priority:string;responsible:string|null;workflow_stage:string;start_date:string|null;due_date:string|null;duration_days:number|null;story_points:number|null;blocked:boolean;blocker_reason:string;created_at:string;updated_at:string};
export type BacklogItem={id:string;responsible?:string|null;actual_end_date?:string|null;project_id:string;organization_id:string;item_type:"epic"|"feature"|"task";title:string;description:string;state:string;parent_id:string|null;story_id:string|null;sort_order:number;created_at:string};
export type ProjectMember={email:string;name:string};
export type Comment={id:string;story_id:string;author_email:string|null;content:string;created_at:string};
export const stages=[["new","NEW"],["ready","READY"],["active","ACTIVE"],["resolved","RESOLVED"],["closed","CLOSED"],["review","REVIEW"],["rejected","REJECT"]] as const;
export const transitions:Record<string,string[]>={new:["ready"],ready:["active","review"],review:["ready"],active:["resolved"],resolved:["closed","rejected"],rejected:["ready"],closed:[],rework:["ready"]};
export const dateOnly=(value:string|null|undefined)=>value?.slice(0,10)||"";
export const dateBR=(value:string|null|undefined)=>{const s=dateOnly(value);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(8,10)+"/"+s.slice(5,7)+"/"+s.slice(0,4):"Não definido";};
export const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
export const addDays=(date:string,days:number)=>{const d=new Date(date+"T12:00:00Z");if(isNaN(d.getTime()))return "";d.setUTCDate(d.getUTCDate()+days-1);return d.toISOString().slice(0,10)};
export const daysBetween=(start:string,end:string)=>Math.round((Date.parse(end+"T12:00:00Z")-Date.parse(start+"T12:00:00Z"))/86400000)+1;
export async function apiGet(path:string){const response=await measuredFetch(path,{headers:getClientAuthHeaders(),cache:"no-store"});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||"Falha ao consultar Scrum.");return payload.data}
export async function apiPost(path:string,body:Record<string,unknown>){const response=await measuredFetch(path,{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify(body)});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||"Falha ao salvar.");return payload.data}
export function useScrumData(){
 const [projects,setProjects]=useState<Project[]>([]);const [projectId,setProjectId]=useState("");
 const [sprints,setSprints]=useState<Sprint[]>([]);const [sprintId,setSprintId]=useState("");
 const [stories,setStories]=useState<Story[]>([]);const [comments,setComments]=useState<Comment[]>([]);
 const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 useEffect(()=>{let alive=true;void apiGet("/api/scrum").then((data:Project[])=>{if(alive){setProjects(data);setProjectId(old=>old||data[0]?.id||"")}}).catch(e=>{if(alive){setError(e.message);setLoading(false)}});return()=>{alive=false}},[]);
 const refresh=useCallback(async()=>{if(!projectId){setSprints([]);setStories([]);setLoading(false);return}setLoading(true);setError("");
  try{const [a,b]=await Promise.all([apiGet("/api/scrum?projectId="+encodeURIComponent(projectId)),apiGet("/api/scrum/stories?projectId="+encodeURIComponent(projectId))]);setSprints(a.sprints);setStories(b.stories);setComments(b.comments);setSprintId(old=>a.sprints.some((x:Sprint)=>x.id===old)?old:a.sprints[0]?.id||"");}catch(e){setError(e instanceof Error?e.message:"Erro na consulta.");}finally{setLoading(false)}
 },[projectId]);
 useEffect(()=>{void refresh()},[refresh]);
 return {projects,projectId,setProjectId,sprints,sprintId,setSprintId,stories,comments,loading,error,setError,refresh};
}
export function ScrumNav({active}:{active:"overview"|"backlog"|"board"}) {
 return <div className="flex flex-wrap gap-2">
  {[{id:"overview",href:"/scrum",label:"Painel Scrum e Sprints"},{id:"backlog",href:"/scrum/backlog",label:"Backlog de US"},{id:"board",href:"/scrum/kanban",label:"Kanban de US"}].map(item=><Link key={item.id} href={item.href} className={active===item.id?"workspace-button-primary rounded-lg px-3 py-2 text-sm":"workspace-button-secondary rounded-lg px-3 py-2 text-sm"}>{item.label}</Link>)}
 </div>
}
export function ScrumSelectors({projects,projectId,onProject,sprints,sprintId,onSprint}:{projects:Project[];projectId:string;onProject:(id:string)=>void;sprints:Sprint[];sprintId:string;onSprint:(id:string)=>void}) {
 return <div className="grid gap-3 md:grid-cols-2">
 <label className="text-xs font-medium">Projeto<select className="workspace-select mt-1 w-full" value={projectId} onChange={e=>onProject(e.target.value)}><option value="">Selecione</option>{projects.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
 <label className="text-xs font-medium">Sprint<select className="workspace-select mt-1 w-full" value={sprintId} onChange={e=>onSprint(e.target.value)}><option value="">Selecione</option>{sprints.map(s=><option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}</select></label>
 </div>
}
