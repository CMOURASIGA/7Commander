"use client";
import {useCallback,useEffect,useState} from "react";
import {getClientAuthHeaders} from "@/lib/client-auth";

type Fact={id:string;kind:string;title:string;description:string;classification:string;due_date:string|null;approved_for_client:boolean;approved_at:string|null;source_reference?:string|null};
const kinds=[["objective","Objetivo"],["benefit","Benefício"],["deliverable","Entrega"],["milestone","Marco"],["risk","Risco relevante"],["next_step","Próximo passo"]] as const;
const classes=[["confirmed","Confirmado"],["in_progress","Em andamento"],["hypothesis","Hipótese"],["ai_recommendation","Recomendação de IA"]] as const;
const clean=()=>({kind:"deliverable",title:"",description:"",classification:"in_progress",dueDate:"",sourceReference:""});
export function PublicFactsEditor({projectId,onChange}:{projectId:string;onChange?:()=>void}){
 const [items,setItems]=useState<Fact[]>([]);
 const [canManage,setCanManage]=useState(false);
 const [loading,setLoading]=useState(true);
 const [form,setForm]=useState(clean);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [confirmId,setConfirmId]=useState("");
 const [confirmTitle,setConfirmTitle]=useState("");
 const reload=useCallback(async()=>{
  if(!projectId)return;
  setLoading(true);
  try{
   const res=await fetch("/api/status-report/public-facts?projectId="+encodeURIComponent(projectId)+"&manage=1",{headers:getClientAuthHeaders(),cache:"no-store"});
   if(res.status===403){setCanManage(false);setItems([]);return}
   const payload=await res.json();
   if(!res.ok)throw Error(payload.error||"Classificações indisponíveis.");
   setCanManage(true);setItems(payload.data||[]);setError("");
  }catch(e){setError(e instanceof Error?e.message:"Falha ao consultar classificações.");}
  finally{setLoading(false)}
 },[projectId]);
 useEffect(()=>{setCanManage(false);setItems([]);void reload()},[reload]);
 async function saveDraft(){
  if(!form.title.trim()||busy)return;
  setBusy(true);setError("");setMessage("");
  try{
   const response=await fetch("/api/status-report/public-facts",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({action:"create",projectId,...form})});
   const result=await response.json();if(!response.ok)throw Error(result.error||"Falha ao salvar.");
   setForm(clean());setMessage("Rascunho registrado, ainda não visível ao cliente.");await reload();onChange?.();
  }catch(e){setError(e instanceof Error?e.message:"Falha ao salvar rascunho.")}
  finally{setBusy(false)}
 }
 async function changeApproval(fact:Fact,approve:boolean){
  if(busy)return;
  if(approve&&confirmTitle.trim()!==fact.title){setError("Digite o título exato para autorizar a divulgação.");return}
  setBusy(true);setError("");setMessage("");
  try{
   const response=await fetch("/api/status-report/public-facts",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
    body:JSON.stringify({action:approve?"approve":"withdraw",projectId,id:fact.id,confirmTitle:approve?confirmTitle:""})});
   const result=await response.json();if(!response.ok)throw Error(result.error||"Falha ao atualizar.");
   setConfirmId("");setConfirmTitle("");
   setMessage(approve?"Informação aprovada para a versão Cliente.":"Divulgação ao cliente suspensa.");
   await reload();onChange?.();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível atualizar.")}
  finally{setBusy(false)}
 }
 if(!projectId||loading||!canManage)return null;
 return <section className="rounded-xl border border-(--border) bg-(--bg-surface) p-4 space-y-4">
  <div><h2 className="text-lg font-semibold">Informações autorizadas para o Cliente</h2>
   <p className="text-sm text-(--text-secondary)">Prepare os fatos compartilháveis. Novos registros começam restritos. A divulgação exige confirmação explícita e permanece auditável.</p></div>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  {message&&<p role="status" className="text-sm text-(--text-secondary)">{message}</p>}
  <div className="grid gap-3 sm:grid-cols-2">
   <label className="text-xs">Categoria<select className="workspace-select mt-1 w-full" value={form.kind} onChange={e=>setForm(f=>({...f,kind:e.target.value}))}>{kinds.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   <label className="text-xs">Classificação<select className="workspace-select mt-1 w-full" value={form.classification} onChange={e=>setForm(f=>({...f,classification:e.target.value}))}>{classes.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   <label className="text-xs sm:col-span-2">Título<input className="workspace-input mt-1 w-full" maxLength={180} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></label>
   <label className="text-xs sm:col-span-2">Descrição revisada<textarea rows={3} maxLength={3000} className="workspace-input mt-1 w-full" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></label>
   <label className="text-xs">Prazo, apenas se confirmado<input type="date" className="workspace-input mt-1 w-full" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/></label>
   <label className="text-xs">Referência do registro de origem<input className="workspace-input mt-1 w-full" maxLength={500} value={form.sourceReference} onChange={e=>setForm(f=>({...f,sourceReference:e.target.value}))}/></label>
  </div>
  <button className="workspace-button-secondary rounded-lg px-4 py-2 text-sm" disabled={busy||!form.title.trim()} onClick={()=>void saveDraft()}>{busy?"Processando...":"Salvar rascunho restrito"}</button>
  <div className="space-y-3 border-t border-(--border) pt-3">
   <h3 className="font-semibold">Classificações do projeto</h3>
   {items.length===0?<p className="text-sm text-(--text-secondary)">Nenhum fato classificado. Conteúdo interno não será listado para o Cliente.</p>:items.map(fact=><article key={fact.id} className="rounded-lg border border-(--border) p-3 space-y-2">
    <div className="flex flex-wrap items-start justify-between gap-2"><strong className="text-sm">{fact.title}</strong><span className="text-xs">{fact.approved_for_client?"Aprovado para Cliente":"Rascunho interno"}</span></div>
    <p className="text-xs text-(--text-secondary)">{kinds.find(x=>x[0]===fact.kind)?.[1]} · {classes.find(x=>x[0]===fact.classification)?.[1]}{fact.due_date?" · "+fact.due_date:""}</p>
    {fact.description&&<p className="text-sm">{fact.description}</p>}
    {fact.approved_for_client?<button disabled={busy} className="workspace-button-secondary rounded-lg px-3 py-1 text-xs" onClick={()=>void changeApproval(fact,false)}>Suspender divulgação</button>
     :<><button disabled={busy} className="workspace-button-secondary rounded-lg px-3 py-1 text-xs" onClick={()=>{setConfirmId(fact.id);setConfirmTitle("")}}>Revisar para publicação</button>
      {confirmId===fact.id&&<div className="space-y-2"><p className="text-xs">Digite o título exato para confirmar que não contém informação interna.</p><input className="workspace-input w-full" value={confirmTitle} onChange={e=>setConfirmTitle(e.target.value)}/><button disabled={busy||confirmTitle.trim()!==fact.title} className="workspace-button-primary rounded-lg px-3 py-1 text-xs" onClick={()=>void changeApproval(fact,true)}>Autorizar divulgação Cliente</button></div>}</>}
   </article>)}
  </div>
 </section>;
}
