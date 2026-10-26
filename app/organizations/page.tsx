"use client";
import {useEffect,useState} from "react";
import {getClientAuthHeaders} from "@/lib/client-auth";
type Org={id:string;role:string;organization:{id:string;name:string;slug:string;status:string;branding?:unknown}|Array<{id:string;name:string}>};
const KEY="7commander:active-organization";
export default function OrganizationChooser(){
 const [orgs,setOrgs]=useState<Org[]>([]);
 const [selected,setSelected]=useState("");
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;void(async()=>{try{const r=await fetch("/api/organizations/mine",{headers:getClientAuthHeaders(),cache:"no-store"});if(!r.ok)throw Error("Não foi possível verificar seus vínculos.");const p=await r.json();if(!active)return;const list=(p.data??[]) as Org[];setOrgs(list);const cached=window.sessionStorage.getItem(KEY);setSelected(list.find(x=>x.id===cached)?.id??list[0]?.id??"");}catch(e){if(active)setError(e instanceof Error?e.message:"Falha de acesso.");}})();return()=>{active=false};},[]);
 async function choose(){
  if(!orgs.some(x=>x.id===selected))return;
  try {
   setError("");
   const response=await fetch("/api/organizations/select",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({organizationId:selected})});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(result.error||"Acesso à empresa negado.");
   if(result.data?.operationalIsolationReady!==true){
    setError("Vínculo confirmado. Troca operacional bloqueada até a conclusão do isolamento multempresa.");
    return;
   }
   window.sessionStorage.setItem(KEY,selected);
   window.dispatchEvent(new CustomEvent("7commander:organization-selected",{detail:{organizationId:selected}}));
   window.location.assign("/"); // Clears in-memory project and Kairos context after authorized switch.
  } catch(e){setError(e instanceof Error?e.message:"Erro ao selecionar empresa.");}
 }
 return <section className="mx-auto max-w-2xl space-y-4 rounded-xl border border-(--border) bg-(--bg-surface) p-6"><h1 className="text-xl font-semibold">Selecionar empresa</h1><p className="text-sm text-(--text-secondary)">Escolha uma das organizações às quais sua conta está vinculada.</p>{error&&<p role="alert">{error}</p>}{orgs.length===0&&!error?<p>Nenhuma empresa disponível para esta conta.</p>:<div className="space-y-2">{orgs.map(x=><label key={x.id} className="flex items-center gap-3 rounded-lg border border-(--border) p-3"><input type="radio" checked={selected===x.id} onChange={()=>setSelected(x.id)}/><span>{Array.isArray(x.organization)?x.organization[0]?.name:x.organization.name}</span><span className="ml-auto text-xs text-(--text-secondary)">{x.role}</span></label>)}</div>}<button type="button" disabled={!selected} onClick={choose} className="rounded-lg bg-(--accent) px-4 py-2 text-sm text-white disabled:opacity-50">Selecionar</button><p className="text-xs text-amber-700">Preparação técnica: a seleção ainda não altera o escopo das consultas legadas. O acesso multempresa só será liberado após isolamento de todos os módulos e testes de segurança.</p></section>;
}
