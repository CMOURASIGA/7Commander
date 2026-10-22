"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
import { getClientAuthHeaders } from "@/lib/client-auth";
type Item={id:string;projectId:string;projectName:string;title:string;priority:string;dueDate:string|null};
export function TaskAlerts({center=false}:{center?:boolean}){
 const auth=useKairosAuth();const [items,setItems]=useState<Item[]>([]);const [open,setOpen]=useState(false);const [error,setError]=useState(false);
 useEffect(()=>{if(!auth.user)return;let active=true;const load=async()=>{try{const r=await fetch("/api/my-tasks",{headers:getClientAuthHeaders(),cache:"no-store"});if(!r.ok)throw Error();const j=await r.json();if(active){setItems(j.data||[]);setError(false)}}catch{if(active)setError(true)}};
 void load();const timer=setInterval(()=>void load(),60000);const refresh=()=>void load();window.addEventListener("focus",refresh);return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",refresh)}},[auth.user?.id]);
 if(!auth.user)return null;
 if(center)return items.length?<div role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-slate-900"><strong>Você tem {items.length} atividade{items.length===1?"":"s"} para executar</strong><p className="mt-1 text-sm">Confira as atividades atribuídas a você nos projetos da Consult Services.</p><div className="mt-2 space-y-1">{items.slice(0,3).map(i=><p key={i.id} className="text-sm"><Link className="underline" href="/activities">{i.projectName}: {i.title}</Link></p>)}</div></div>:null;
 return <div className="relative"><button aria-label="Notificações de atividades" aria-expanded={open} onClick={()=>setOpen(!open)} className="rounded-xl border px-3 py-2 text-sm font-semibold">🔔 {items.length>0?items.length:""}</button>{open&&<div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-xl border bg-white p-4 shadow-xl"><strong>Minhas atividades ({items.length})</strong>{error?<p className="mt-2 text-sm">Não foi possível atualizar as notificações.</p>:items.length===0?<p className="mt-2 text-sm">Sem atividades pendentes atribuídas.</p>:<ul className="mt-2 max-h-80 space-y-2 overflow-auto">{items.map(i=><li key={i.id} className="border-b pb-2 text-sm"><Link onClick={()=>setOpen(false)} href="/activities" className="font-medium underline">{i.title}</Link><p>{i.projectName}</p></li>)}</ul>}</div>}</div>;
}
