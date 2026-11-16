"use client";
import {IconActionButton} from "@/components/ui/icon-action-button";
import {useCallback,useEffect,useState} from "react";
import {getClientAuthHeaders} from "@/lib/client-auth";
import {isVagueNextStep} from "@/lib/reports/editorial-rules";
import {executiveRiskTitle} from "@/lib/reports/risk-editorial";

type Fact={id:string;kind:string;title:string;description:string;classification:string;due_date:string|null;approved_for_client:boolean;approved_at:string|null;source_reference?:string|null};
type Candidate={kind:string;title:string;description:string;classification:string;dueDate:string;sourceReference:string;origin:string;internalContext?:string};
type EditorialForm={kind:string;title:string;description:string;classification:string;dueDate:string;sourceReference:string};
const kinds=[["objective","Objetivo"],["benefit","Benefício"],["deliverable","Entrega"],["milestone","Marco"],["risk","Risco relevante"],["next_step","Próximo passo"]] as const;
const classes=[["confirmed","Confirmado"],["in_progress","Em andamento"],["hypothesis","Hipótese"],["ai_recommendation","Proposta para revisão"]] as const;
const blank=():EditorialForm=>({kind:"deliverable",title:"",description:"",classification:"in_progress",dueDate:"",sourceReference:""});

const riskReady=(info:{kind:string;description:string})=>
 info.kind!=="risk"||info.description.split("\n").some(line=>
  /^ponto de aten[çc][aã]o\s*:\s*\S/i.test(line.trim()));
const riskTemplate=(description:string,title:string)=>{
 const lines=description.split("\n").filter(Boolean);
 if(!lines.some(line=>/^ponto de aten[çc][aã]o\s*:/i.test(line.trim())))
  lines.unshift("Ponto de atenção: "+executiveRiskTitle(title));
 return lines.join("\n");
};


export function PublicFactsEditor({projectId,onChange,proposedNextSteps,selectedFactIds,onSelectionChange}:{projectId:string;onChange?:()=>void;proposedNextSteps?:string|null;selectedFactIds:string[];onSelectionChange:(ids:string[])=>void}){
 const [items,setItems]=useState<Fact[]>([]);
 const [candidates,setCandidates]=useState<Candidate[]>([]);
 const [canManage,setCanManage]=useState(false);
 const [loading,setLoading]=useState(true);
 const [suggestionsLoading,setSuggestionsLoading]=useState(false);
 const [form,setForm]=useState<EditorialForm>(blank);
 const [editingId,setEditingId]=useState("");
 const [showEditor,setShowEditor]=useState(false);
 const [busy,setBusy]=useState(false);
 const [selected,setSelected]=useState<string[]>([]);
 const [bulkProgress,setBulkProgress]=useState("");
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
  setCanManage(false);setItems([]);setCandidates([]);setForm(blank());setEditingId("");setShowEditor(false);setSelected([]);
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
 async function publishSelected(){
  if(busy||selected.length===0)return;
  setBusy(true);setError("");setMessage("");
  const available=candidates.filter(candidate=>selected.includes(candidate.sourceReference)&&(!recorded(candidate.sourceReference)?.approved_for_client||!riskReady(recorded(candidate.sourceReference)!))&&riskReady(candidate));
  const failures:string[]=[];
  const failedRefs:string[]=[];
  let published=0;
  try{
   for(const [index,candidate] of available.entries()){
    setBulkProgress("Publicando "+(index+1)+" de "+available.length);
    const existing=recorded(candidate.sourceReference);
    const info=existing&&riskReady(existing)?fromFact(existing):candidate;
    try{
     const response=await fetch("/api/status-report/public-facts",{
      method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
      body:JSON.stringify({action:"publish",projectId,...info,...(existing?{id:existing.id}:{})})
     });
     const result=await response.json().catch(()=>({}));
     if(!response.ok)throw Error(result.error||"Falha na publicação");
     published++;
    }catch(e){failedRefs.push(candidate.sourceReference);failures.push(candidate.title+": "+(e instanceof Error?e.message:"erro desconhecido"));}
   }
   setSelected(failedRefs);
   setMessage(published+" informações publicadas. "+(failures.length?failures.length+" falharam e permaneceram selecionadas.":""));
   if(failures.length)setError(failures.slice(0,3).join(" | "));
   await reload();onChange?.();
  }finally{setBusy(false);setBulkProgress("");}
 }
 async function withdrawAll(){
  if(busy||!items.some(item=>item.approved_for_client))return;
  if(!window.confirm("Despublicar TODAS as informações aprovadas do relatório Cliente? Os registros permanecem cadastrados, mas não serão exibidos em novas emissões."))return;
  setBusy(true);setError("");setMessage("");
  try{
   const response=await fetch("/api/status-report/public-facts",{
    method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
    body:JSON.stringify({action:"withdraw_all",projectId})
   });
   const payload=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(payload.error||"Falha ao despublicar.");
   setSelected([]);
   setMessage((payload.data?.withdrawn||0)+" informações despublicadas.");
   await reload();onChange?.();
  }catch(error){setError(error instanceof Error?error.message:"Erro ao despublicar.");}
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
  setForm(info.kind==="risk"?{...info,description:riskTemplate(info.description,info.title)}:info);setEditingId(id);setShowEditor(true);setError("");setMessage("Revise o texto e clique em Publicar.");
  window.requestAnimationFrame(()=>document.getElementById("client-fact-editor")?.scrollIntoView({behavior:"smooth",block:"start"}));
 }
 const fromFact=(f:Fact):EditorialForm=>({kind:f.kind,title:f.title,description:f.description,classification:f.classification,dueDate:f.due_date||"",sourceReference:f.source_reference||""});
 const recorded=(ref:string)=>items.find(f=>f.source_reference===ref);
 const editorialInfo=(candidate:Candidate,existing?:Fact):EditorialForm=>
  existing&&riskReady(existing)?fromFact(existing):candidate;
 const proposed=proposedNextSteps?.trim()?{kind:"next_step",title:"Próximos passos do projeto",description:proposedNextSteps.slice(0,3000),classification:"ai_recommendation",dueDate:"",sourceReference:"kairos:proposta:"+projectId}:null;

 const suggestions=[...candidates,...(proposed?[proposed]:[])].filter(candidate=>
   !items.some(item=>item.source_reference===candidate.sourceReference));
 const publishedItems=items.filter(item=>item.approved_for_client);
 if(!projectId||loading)return <div className="workspace-card p-4 text-sm">Consultando informações autorizadas para o Cliente...</div>;
 if(!canManage)return <section className="workspace-card p-4">
  <h3 className="font-semibold">Gestão do conteúdo | Cliente</h3>
  <p className="text-sm text-(--text-secondary)">A gestão de publicações exige permissão de editor ou responsável pelo projeto. Dados internos não serão apresentados nesta interface.</p>
 </section>;
 return <section className="workspace-card space-y-3 p-4" aria-label="Gestão do conteúdo do relatório Cliente">
  <header className="space-y-2">
   <h2 className="text-base font-semibold">Gestão do conteúdo | Cliente</h2>
   <p className="text-xs text-(--text-secondary)">Controle exclusivo do Cliente. Primeiro publique a informação revisada, depois selecione se ela entra nesta emissão. Desmarcar não revoga a publicação; despublicar revoga a autorização para futuras emissões.</p>
   <div className="flex flex-wrap gap-2">
    <button type="button" disabled={busy} className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>onSelectionChange(publishedItems.map(x=>x.id))}>Selecionar todos</button>
    <button type="button" disabled={busy} className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>onSelectionChange([])}>Limpar seleção</button>
    <button type="button" disabled={busy||!publishedItems.length} className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>void withdrawAll()}>Despublicar tudo</button>
    <button type="button" className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>edit(blank())}>Adicionar informação</button>
    <button type="button" className="workspace-button-secondary px-3 py-2 text-xs" disabled={busy||suggestionsLoading} onClick={()=>void loadSuggestions()}>{suggestionsLoading?"Atualizando...":"Atualizar dados"}</button>
   </div>
   <p className="text-xs text-(--text-secondary)">{publishedItems.filter(item=>selectedFactIds.includes(item.id)).length} de {publishedItems.length} informações publicadas selecionadas para esta emissão</p>
  </header>
  {error?<p role="alert" className="text-xs text-red-700">{error}</p>:null}
  {message?<p role="status" className="text-xs text-(--text-secondary)">{message}</p>:null}
  {items.some(x=>x.kind==="next_step"&&x.approved_for_client&&isVagueNextStep(x.title,x.description))&&<p className="text-xs text-amber-700">Próximos passos genéricos precisam ser revisados antes de aparecer no relatório.</p>}
  <div className="max-h-[26rem] space-y-3 overflow-y-auto">
   {kinds.map(([kind,label])=>{
    const registered=items.filter(item=>item.kind===kind);
    const proposals=suggestions.filter(item=>item.kind===kind);
    if(!registered.length&&!proposals.length)return null;
    return <details key={kind} className="rounded-lg border border-(--border) p-3" open={kind==="next_step"?true:undefined}>
     <summary className="cursor-pointer text-sm font-semibold">{label} ({registered.length+proposals.length})</summary>
     <div className="mt-3 space-y-2">
      {registered.map(item=><div key={item.id} className="flex items-start gap-2 rounded-lg border border-(--border) p-2 text-xs">
       <input type="checkbox" className="mt-1" disabled={busy||!item.approved_for_client||!riskReady(item)} checked={item.approved_for_client&&selectedFactIds.includes(item.id)}
        aria-label={"Incluir "+item.title+" na emissão Cliente"}
        onChange={event=>onSelectionChange(event.target.checked?[...new Set([...selectedFactIds,item.id])]:selectedFactIds.filter(id=>id!==item.id))}/>
       <div className="min-w-0 flex-1">
        <p className="font-semibold">{item.title}</p>
        <p className="mt-1 text-(--text-secondary)">{item.approved_for_client?(riskReady(item)?"Publicado · apto à seleção":"Publicado · requer revisão"):"Não publicado"} · {item.classification}</p>
        {item.description?<p className="mt-1 line-clamp-2 text-(--text-secondary)">{item.description}</p>:null}
       </div>
       <div className="flex shrink-0 gap-1">
        {item.approved_for_client?<IconActionButton icon="archive" tone="danger" label={"Despublicar "+item.title} disabled={busy} onClick={()=>void withdraw(item)}/>:
         <IconActionButton icon="check-circle" tone="success" label={"Publicar "+item.title} disabled={busy} onClick={()=>void publish(fromFact(item),item.id)}/>}
        <IconActionButton icon="pencil" tone="edit" label={"Editar "+item.title} disabled={busy} onClick={()=>edit(fromFact(item),item.id)}/>
       </div>
      </div>)}
      {proposals.map(candidate=><div key={candidate.sourceReference} className="flex items-start gap-2 rounded-lg border border-dashed border-(--border) p-2 text-xs">
       <input type="checkbox" className="mt-1" disabled={!riskReady(candidate)||busy}
        aria-label={"Selecionar sugestão "+candidate.title} checked={selected.includes(candidate.sourceReference)}
        onChange={event=>setSelected(current=>event.target.checked?[...new Set([...current,candidate.sourceReference])]:current.filter(ref=>ref!==candidate.sourceReference))}/>
       <div className="min-w-0 flex-1">
        <p className="font-semibold">{candidate.title}</p>
        <p className="mt-1 text-(--text-secondary)">Sugestão não publicada · {"origin" in candidate?candidate.origin:"Kairos"}</p>
        {candidate.description?<p className="mt-1 line-clamp-2 text-(--text-secondary)">{candidate.description}</p>:null}
       </div>
       <div className="flex shrink-0 gap-1">
        <IconActionButton icon="check-circle" tone="success" label={"Publicar sugestão "+candidate.title} disabled={busy||!riskReady(candidate)} onClick={()=>void publish(candidate)}/>
        <IconActionButton icon="pencil" tone="edit" label={"Revisar sugestão "+candidate.title} disabled={busy} onClick={()=>edit(candidate)}/>
       </div>
      </div>)}
     </div>
    </details>;
   })}
   {items.length===0&&suggestions.length===0?<p className="text-xs text-(--text-secondary)">Nenhuma informação disponível. Adicione uma informação ou atualize os dados.</p>:null}
  </div>
  {selected.length>0&&<button type="button" disabled={busy} className="workspace-button-primary px-3 py-2 text-xs" onClick={()=>void publishSelected()}>{bulkProgress||"Publicar sugestões selecionadas ("+selected.length+")"}</button>}
  {showEditor?<div id="client-fact-editor" className="rounded-xl border border-(--border) p-3 space-y-3">
   <div className="flex items-center justify-between"><h3 className="font-semibold">Editar informação para publicação</h3>
    <button type="button" className="workspace-button-secondary text-xs" onClick={()=>{setShowEditor(false);setEditingId("");}}>Cancelar</button>
   </div>
   {form.kind==="risk"&&<p className="text-xs text-(--text-secondary)">Os dados existentes do risco foram aproveitados. Você pode editar o ponto de atenção e a medida. Consequência e situação da mitigação são opcionais e só serão exibidas se tiverem evidência confirmada. Publicar autoriza o texto apresentado, sem alterar o risco original.</p>}
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

 </section>;
}
