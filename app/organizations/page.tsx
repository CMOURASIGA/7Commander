"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {getClientAuthHeaders} from "@/lib/client-auth";
import {useCentralPilotReadOnly} from "@/lib/use-central-pilot-read-only";
type Org={id:string;role:string;organization:{id:string;name:string;slug:string;status:string;branding?:unknown}|Array<{id:string;name:string}>};
export default function OrganizationChooser(){
 const {readOnly,checking,canSwitchCompany}=useCentralPilotReadOnly();
 const [orgs,setOrgs]=useState<Org[]>([]);
 const [loadingCompanies,setLoadingCompanies]=useState(true);
 const [selected,setSelected]=useState("");
 const [search,setSearch]=useState("");
 const [error,setError]=useState("");
 const [activeCompany,setActiveCompany]=useState<string|null>(null);
 useEffect(()=>{let active=true;void(async()=>{try{const r=await fetch("/api/organizations/mine",{headers:getClientAuthHeaders(),cache:"no-store"});if(!r.ok)throw Error("Não foi possível verificar seus vínculos.");const p=await r.json();if(!active)return;const list=(p.data??[]) as Org[];setOrgs(list);
 const current=await fetch("/api/organizations/branding?summary=1",{headers:getClientAuthHeaders(),cache:"no-store"}).then(x=>x.ok?x.json():null).catch(()=>null);
 if(active){setActiveCompany(typeof current?.data?.name==="string"?current.data.name:null);const serverSelected=current?.data?.id;setSelected(list.find(x=>x.id===serverSelected)?.id??list[0]?.id??"");}}catch(e){if(active)setError(e instanceof Error?e.message:"Falha de acesso.");}finally{if(active)setLoadingCompanies(false);}})();return()=>{active=false};},[]);
 async function choose(){
  if(!canSwitchCompany || checking || !orgs.some(x=>x.id===selected))return;
  try {
   setError("");
   const response=await fetch("/api/organizations/select",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({organizationId:selected})});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(result.error||"Acesso à empresa negado.");
   if(result.data?.operationalIsolationReady!==true){
    setError("O Commander confirmou seu vínculo, mas NÃO alterou a empresa ativa. O isolamento multempresa ainda está pendente.");
    return;
   }
   // Independent GET confirms that the server now resolves the selected
   // tenant. Browser storage never decides authorization or active company.
   const confirmed=await fetch("/api/organizations/branding?summary=1",{
     headers:getClientAuthHeaders(),cache:"no-store"
   });
   const confirmation=await confirmed.json().catch(()=>({}));
   if(!confirmed.ok || confirmation.data?.id!==selected){
     setError("A empresa selecionada não foi confirmada pelo servidor. A tela não será redirecionada para evitar uma identidade incorreta.");
     return;
   }
   window.localStorage.setItem("7commander:company-changed",String(Date.now()));
   window.dispatchEvent(new CustomEvent("7commander:organization-selected",{detail:{organizationId:selected}}));
   window.location.assign("/"); // Clears in-memory project and Kairos context after authorized switch.
  } catch(e){setError(e instanceof Error?e.message:"Erro ao selecionar empresa.");}
 }
 return <section className="mx-auto max-w-2xl space-y-4 rounded-xl border border-(--border) bg-(--bg-surface) p-6"><h1 className="text-xl font-semibold">Selecionar empresa</h1><p className="text-sm text-(--text-secondary)">Escolha uma das organizações às quais sua conta está vinculada.</p><p className="rounded-lg border border-(--border) p-3 text-sm font-medium">Empresa realmente ativa: {loadingCompanies?"verificando...":activeCompany??"não confirmada"}</p>{error&&<p role="alert">{error}</p>}{loadingCompanies?<p role="status">Consultando empresas autorizadas...</p>:orgs.length===0&&!error?<p role="status">Nenhuma empresa autorizada foi retornada. Se a empresa QA aparece no cabeçalho, atualize esta tela para confirmar a sessão.</p>:<div className="space-y-2"><label className="block text-sm">Pesquisar empresa<input aria-label="Pesquisar empresa" className="mt-1 w-full rounded-lg border border-(--border) p-3" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Digite o nome da empresa"/></label>{orgs.filter(x=>(Array.isArray(x.organization)?x.organization[0]?.name:x.organization.name)?.toLowerCase().includes(search.trim().toLowerCase())).map(x=><label key={x.id} className="flex items-center gap-3 rounded-lg border border-(--border) p-3"><input type="radio" checked={selected===x.id} onChange={()=>setSelected(x.id)}/><span>{Array.isArray(x.organization)?x.organization[0]?.name:x.organization.name}</span><span className="ml-auto text-xs text-(--text-secondary)">{x.role}</span></label>)}</div>}{!loadingCompanies && orgs.length===1 && activeCompany && (Array.isArray(orgs[0].organization)?orgs[0].organization[0]?.name:orgs[0].organization.name)===activeCompany ? <p role="status" className="text-sm">Você possui uma empresa autorizada nesta homologação. Ela já está ativa; não é necessário selecioná-la novamente.</p> : null}{!loadingCompanies && canSwitchCompany && !checking && orgs.length>1 ? <button type="button" disabled={!selected} onClick={choose} className="rounded-lg bg-(--accent) px-4 py-2 text-sm text-white disabled:opacity-50">Selecionar</button> : null}{!loadingCompanies && readOnly && !checking && !canSwitchCompany && !!activeCompany ? <p role="status" className="text-sm">Empresa ativa confirmada. Seu perfil permite somente consulta nesta empresa.</p> : null}<p className="text-xs text-amber-700">A seleção exige autorização no servidor. Após escolher uma empresa, a página será recarregada e os módulos consultarão os dados da organização ativa.</p>{!readOnly && !checking ? <p className="text-sm"><Link className="underline" href="/platform/companies">Administração de empresas (superadmin)</Link></p> : null}</section>;
}
