"use client";
import {useCallback,useEffect,useState} from "react";
import {getClientAuthHeaders} from "@/lib/client-auth";

type Fact={id:string;kind:string;title:string;description:string;classification:string;due_date:string|null;approved_for_client:boolean;approved_at:string|null;source_reference?:string|null};
type Candidate={kind:string;title:string;description:string;classification:string;dueDate:string;sourceReference:string;origin:string};
type EditorialForm={kind:string;title:string;description:string;classification:string;dueDate:string;sourceReference:string};
const kinds=[["objective","Objetivo"],["benefit","Benefício"],["deliverable","Entrega"],["milestone","Marco"],["risk","Risco relevante"],["next_step","Próximo passo"]] as const;
const classes=[["confirmed","Confirmado"],["in_progress","Em andamento"],["hypothesis","Hipótese"],["ai_recommendation","Proposta para revisão"]] as const;
const blank=():EditorialForm=>({kind:"deliverable",title:"",description:"",classification:"in_progress",dueDate:"",sourceReference:""});

export function PublicFactsEditor({projectId,onChange,proposedNextSteps}:{projectId:string;onChange?:()=>void;proposedNextSteps?:string|null}){
 const [items,setItems]=useState<Fact[]>([]);
 const [candidates,setCandidates]=useState<Candidate[]>([]);
 const [canManage,setCanManage]=useState(false);
 const [loading,setLoading]=useState(true);
 const [suggestionsLoading,setSuggestionsLoading]=useState(false);
 const [form,setForm]=useState<EditorialForm>(blank);
 const [editingId,setEditingId]=useState("");
 const [showEditor,setShowEditor]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");

 const reload=useCallback(async()=>{
  if(!projectId)return;
  setLoading(true);
  try{
   const r=await fetch("/api/status-report/public-facts?projectId="+encodeURIComponent(projectId)+"&manage=1",{headers:getClientAuthHeaders(),cache:"no-store"});
   if(r.status===403){setCanManage(false);setItems([]);return;}
   const payload=await r.json();
   if(!r.ok)throw Error(payload.error||"Informações indisponíveis.");
   setItems(payload.data||[]);setCanManage(true);setError("");
  }catch(e){setError(e instanceof Error?e.message:"Falha ao consultar informações.");}
  finally{setLoading(false);}
 },[projectId]);
 const loadSuggestions=useCallback(async()=>{
  if(!projectId)return;
  setSuggestionsLoading(true);
  try{
   const r=await fetch("/api/status-report/public-facts?projectId="+encodeURIComponent(projectId)+"&suggestions=1",{headers:getClientAuthHeaders(),cache:"no-store"});
   const payload=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(payload.error||"Não foi possível consultar o projeto.");
   setCandidates(payload.data||[]);
  }catch(e){setCandidates([]);setError(e instanceof Error?e.message:"Falha nas informações sugeridas.");}
  finally{setSuggestionsLoading(false);}
 },[projectId]);
 useEffect(()=>{
  setCanManage(false);setItems([]);setCandidates([]);setForm(blank());setEditingId("");setShowEditor(false);
  void reload();void loadSuggestions();
 },[reload,loadSuggestions]);

 async function publish(info:EditorialForm,id=""){
  if(busy||!info.title.trim())return;
  setBusy(true);setError("");setMessage("");
  try{
   const r=await fetch("/api/status-report/public-facts",{
    method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
    body:JSON.stringify({action:"publish",projectId,...info,...(id?{id}:{})})
   });
   const result=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(result.error||"Não foi possível publicar.");
   setMessage("Informação publicada na versão Cliente. A autorização ficou registrada.");
   setShowEditor(false);setEditingId("");setForm(blank());await reload();onChange?.();
  }catch(e){setError(e instanceof Error?e.message:"Falha ao publicar.");}
  finally{setBusy(false);}
 }
 async function withdraw(fact:Fact){
  if(busy)return;setBusy(true);setError("");setMessage("");
  try{
   const r=await fetch("/api/status-report/public-facts",{
    method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
    body:JSON.stringify({action:"withdraw",projectId,id:fact.id})
   });
   const payload=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(payload.error||"Falha ao retirar.");
   setMessage("Informação retirada do relatório Cliente.");await reload();onChange?.();
  }catch(e){setError(e instanceof Error?e.message:"Falha ao retirar publicação.");}
  finally{setBusy(false);}
 }
 function edit(info:EditorialForm,id=""){
  setForm(info);setEditingId(id);setShowEditor(true);setError("");setMessage("Revise o texto e clique em Publicar.");
  window.requestAnimationFrame(()=>document.getElementById("client-fact-editor")?.scrollIntoView({behavior:"smooth",block:"start"}));
 }
 const fromFact=(f:Fact):EditorialForm=>({kind:f.kind,title:f.title,description:f.description,classification:f.classification,dueDate:f.due_date||"",sourceReference:f.source_reference||""});
 const recorded=(ref:string)=>items.find(f=>f.source_reference===ref);
 const proposed=proposedNextSteps?.trim()?{kind:"next_step",title:"Próximos passos do projeto",description:proposedNextSteps.slice(0,3000),classification:"ai_recommendation",dueDate:"",sourceReference:"kairos:proposta:"+projectId}:null;

 if(!projectId||loading||!canManage)return null;
 return <section className="rounded-xl border border-(--border) bg-(--bg-surface) p-4 space-y-4">
  <header className="flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="text-lg font-semibold">Informações do relatório Cliente</h2>
    <p className="text-sm text-(--text-secondary)">Confira o conteúdo existente e escolha Publicar ou Editar. Apenas o que você publicar entra no relatório do cliente.</p>
   </div>
   <button type="button" className="workspace-button-secondary" onClick={()=>edit(blank())}>Adicionar informação</button>
  </header>
  {error?<p role="alert" className="text-sm text-red-700">{error}</p>:null}
  {message?<p role="status" className="text-sm text-(--text-secondary)">{message}</p>:null}
  <div className="space-y-2 rounded-xl border border-(--border) bg-(--bg-muted) p-3">
   <div className="flex flex-wrap items-center justify-between gap-2">
    <h3 className="font-semibold">Informações do projeto</h3>
    <button className="workspace-button-secondary text-xs" disabled={suggestionsLoading||busy} onClick={()=>void loadSuggestions()}>{suggestionsLoading?"Consultando...":"Atualizar dados"}</button>
   </div>
   {candidates.length===0?<p className="text-sm text-(--text-secondary)">Nenhuma informação disponível para seleção.</p>:
    <div className="max-h-80 space-y-2 overflow-y-auto">
     {candidates.map(candidate=>{
      const existing=recorded(candidate.sourceReference);
      const published=existing?.approved_for_client;
      return <article key={candidate.sourceReference} className="rounded-lg border border-(--border) bg-(--bg-surface) p-3">
       <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
         <p className="text-sm font-semibold">{candidate.title}</p>
         <p className="text-xs text-(--text-secondary)">{candidate.origin} · {kinds.find(k=>k[0]===candidate.kind)?.[1]}{published?" · Publicado":existing?" · Não publicado":""}</p>
         {candidate.description?<p className="mt-1 line-clamp-2 text-xs text-(--text-secondary)">{candidate.description}</p>:null}
        </div>
        <div className="flex flex-wrap gap-2">
         {published?<span className="text-xs text-(--text-secondary)">Publicado</span>:
          <button type="button" disabled={busy} className="workspace-button-primary text-xs" onClick={()=>void publish(existing?fromFact(existing):candidate,existing?.id)}>Publicar</button>}
         <button type="button" disabled={busy} className="workspace-button-secondary text-xs" onClick={()=>edit(existing?fromFact(existing):candidate,existing?.id)}>Editar</button>
        </div>
       </div>
      </article>;
     })}
    </div>}
  </div>
  {proposed?<div className="rounded-xl border border-(--border) bg-(--bg-muted) p-3 space-y-2">
   <h3 className="font-semibold">Sugestão de próximos passos</h3>
   <p className="whitespace-pre-wrap text-sm">{proposed.description}</p>
   <div className="flex gap-2">
    <button disabled={busy||!!recorded(proposed.sourceReference)?.approved_for_client} className="workspace-button-primary text-xs" onClick={()=>void publish(recorded(proposed.sourceReference)?fromFact(recorded(proposed.sourceReference)!):proposed,recorded(proposed.sourceReference)?.id)}>Publicar</button>
    <button disabled={busy} className="workspace-button-secondary text-xs" onClick={()=>edit(recorded(proposed.sourceReference)?fromFact(recorded(proposed.sourceReference)!):proposed,recorded(proposed.sourceReference)?.id)}>Editar</button>
   </div>
  </div>:null}
  {showEditor?<div id="client-fact-editor" className="rounded-xl border border-(--border) p-3 space-y-3">
   <div className="flex items-center justify-between"><h3 className="font-semibold">Editar informação para publicação</h3>
    <button type="button" className="workspace-button-secondary text-xs" onClick={()=>{setShowEditor(false);setEditingId("");}}>Cancelar</button>
   </div>
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-xs">Categoria<select className="workspace-select mt-1 w-full" value={form.kind} onChange={e=>setForm(v=>({...v,kind:e.target.value}))}>{kinds.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
    <label className="text-xs">Classificação<select className="workspace-select mt-1 w-full" value={form.classification} onChange={e=>setForm(v=>({...v,classification:e.target.value}))}>{classes.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
    <label className="text-xs sm:col-span-2">Título<input className="workspace-input mt-1 w-full" maxLength={180} value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))}/></label>
    <label className="text-xs sm:col-span-2">Descrição<textarea className="workspace-input mt-1 w-full" rows={3} maxLength={3000} value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))}/></label>
    <label className="text-xs">Prazo confirmado, quando existir<input type="date" className="workspace-input mt-1 w-full" value={form.dueDate} onChange={e=>setForm(v=>({...v,dueDate:e.target.value}))}/></label>
    <div className="text-xs text-(--text-secondary)">Origem: {form.sourceReference||"Informação escrita manualmente"}</div>
   </div>
   <button disabled={busy||form.title.trim().length<3} className="workspace-button-primary" onClick={()=>void publish(form,editingId)}>{busy?"Publicando...":"Publicar"}</button>
  </div>:null}
  <div className="space-y-2 border-t border-(--border) pt-3">
   <h3 className="font-semibold">Conteúdo registrado para o Cliente</h3>
   {items.length===0?<p className="text-sm text-(--text-secondary)">Nenhuma informação publicada ainda.</p>:items.map(fact=><article key={fact.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-(--border) p-3">
    <div><p className="text-sm font-medium">{fact.title}</p><p className="text-xs text-(--text-secondary)">{kinds.find(k=>k[0]===fact.kind)?.[1]} · {fact.approved_for_client?"Publicado":"Não publicado"}</p></div>
    <div className="flex flex-wrap gap-2">
     {!fact.approved_for_client?<button className="workspace-button-primary text-xs" disabled={busy} onClick={()=>void publish(fromFact(fact),fact.id)}>Publicar</button>:null}
     <button className="workspace-button-secondary text-xs" disabled={busy} onClick={()=>edit(fromFact(fact),fact.id)}>Editar</button>
     {fact.approved_for_client?<button className="workspace-button-secondary text-xs" disabled={busy} onClick={()=>void withdraw(fact)}>Retirar</button>:null}
    </div>
   </article>)}
  </div>
 </section>;
}
