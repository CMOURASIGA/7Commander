"use client";
import {useMemo,useState} from "react";
import {getClientAuthHeaders} from "@/lib/client-auth";
import {parseStructuredBacklog} from "@/lib/kairos-structured-backlog";

type ExistingItem={id:string;item_type:string;title:string;parent_id:string|null};
type ExistingStory={id:string;title:string;feature_id:string|null};
const same=(a:string,b:string)=>a.trim().toLocaleLowerCase("pt-BR")===b.trim().toLocaleLowerCase("pt-BR");
export function KairosBacklogPreview({content,projectId,onClose}:{content:string;projectId:string;onClose:()=>void}){
 const proposal=useMemo(()=>parseStructuredBacklog(content),[content]);
 const [selected,setSelected]=useState<string[]|null>(null);
 const [busy,setBusy]=useState(false);
 const [results,setResults]=useState<string[]>([]);
 const [error,setError]=useState("");
 if(!proposal)return <div role="dialog" aria-modal="true" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
  <div className="workspace-card max-w-xl p-5"><h2 className="font-semibold">Estrutura não identificada</h2>
   <p className="mt-2 text-sm">O texto não contém uma hierarquia verificável de Épicos, Features e US. Nada foi cadastrado. Solicite ao Kairos uma tabela com colunas Épico, Feature, Código da US, Título, Descrição e Critérios de aceite.</p>
   <button className="workspace-button-secondary mt-4 px-4 py-2" type="button" onClick={onClose}>Fechar</button>
  </div></div>;
 const chosen=selected??proposal.stories.map(x=>x.code);
 async function execute(){
  if(!projectId||!proposal||busy||chosen.length===0)return;
  setBusy(true);setError("");setResults([]);
  const lines:string[]=[];
  try{
   const headers=getClientAuthHeaders();
   const [backlogResponse,storiesResponse]=await Promise.all([
    fetch("/api/scrum/backlog-items?projectId="+encodeURIComponent(projectId),{headers,cache:"no-store"}),
    fetch("/api/scrum/stories?projectId="+encodeURIComponent(projectId),{headers,cache:"no-store"})
   ]);
   if(!backlogResponse.ok||!storiesResponse.ok)throw Error("Não foi possível consultar o backlog atual. Nenhum registro criado.");
   const backlogPayload=await backlogResponse.json(),storiesPayload=await storiesResponse.json();
   const existing=(backlogPayload.data||[]) as ExistingItem[];
   const existingStories=(storiesPayload.data?.stories||[]) as ExistingStory[];
   async function create(path:string,body:Record<string,unknown>){
    const r=await fetch(path,{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({...body,projectId})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(j.error||"Falha ao cadastrar.");
    const id=String(j.data?.id||"");
    if(!id)throw Error("Persistência não confirmada para "+String(body.title||"item"));
    return id;
   }
   const epicIds=new Map<string,string>(),featureIds=new Map<string,string>();
   for(const story of proposal.stories.filter(x=>chosen.includes(x.code))){
    const epic=proposal.epics.find(x=>x.code===story.epicCode);
    const feature=proposal.features.find(x=>x.code===story.featureCode);
    if(!epic||!feature)throw Error("Hierarquia inconsistente para "+story.code);
    if(!epicIds.has(epic.code)){
     const found=existing.find(x=>x.item_type==="epic"&&same(x.title,epic.title));
     const id=found?.id||await create("/api/scrum/backlog-items",{action:"create",itemType:"epic",title:epic.title,description:"Origem Kairos: "+epic.code});
     epicIds.set(epic.code,id);
     if(!found){existing.push({id,item_type:"epic",title:epic.title,parent_id:null});lines.push(epic.code+" | Épico criado: "+id);}
     else lines.push(epic.code+" | Épico reutilizado: "+id);
    }
    const parentId=epicIds.get(epic.code)!;
    if(!featureIds.has(feature.code)){
     const found=existing.find(x=>x.item_type==="feature"&&x.parent_id===parentId&&same(x.title,feature.title));
     const id=found?.id||await create("/api/scrum/backlog-items",{action:"create",itemType:"feature",title:feature.title,parentId,description:"Origem Kairos: "+feature.code});
     featureIds.set(feature.code,id);
     if(!found){existing.push({id,item_type:"feature",title:feature.title,parent_id:parentId});lines.push(feature.code+" | Feature criada: "+id);}
     else lines.push(feature.code+" | Feature reutilizada: "+id);
    }
    const featureId=featureIds.get(feature.code)!;
    const duplicate=existingStories.find(x=>same(x.title,story.title));
    if(duplicate){
     lines.push(story.code+" | US existente, nenhuma duplicação: "+duplicate.id+(duplicate.feature_id!==featureId?" (verificar Feature vinculada)":""));
     continue;
    }
    const id=await create("/api/scrum/stories",{action:"create",fromKairos:true,title:story.title,description:story.description||"Origem: "+story.code,acceptanceCriteria:story.acceptanceCriteria,priority:story.priority,featureId});
    existingStories.push({id,title:story.title,feature_id:featureId});
    lines.push(story.code+" | US criada: "+id);
   }
   setResults(lines);
  }catch(e){setError(e instanceof Error?e.message:"Falha ao registrar estrutura.");setResults(lines);}
  finally{setBusy(false);}
 }
 return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" role="presentation">
 <div role="dialog" aria-modal="true" aria-label="Prévia estruturada do backlog" className="workspace-card max-h-[90vh] w-full max-w-4xl space-y-4 overflow-y-auto p-5">
  <div className="flex justify-between gap-3"><div>
    <h2 className="font-semibold">Proposta estruturada do Kairos</h2>
    <p className="text-xs text-(--text-secondary)">Prévia: {proposal.epics.length} Épicos, {proposal.features.length} Features, {proposal.stories.length} US. Nenhum registro é criado até sua confirmação.</p>
   </div><button className="workspace-button-secondary px-3 py-2 text-xs" type="button" onClick={onClose} disabled={busy}>Fechar</button></div>
  <div className="flex gap-2"><button type="button" className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>setSelected(proposal.stories.map(x=>x.code))}>Selecionar US</button>
    <button type="button" className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>setSelected([])}>Limpar</button></div>
  {proposal.epics.map(ep=><section key={ep.code} className="rounded-lg border border-(--border) p-3">
   <h3 className="font-semibold">{ep.code} · {ep.title}</h3>
   {proposal.features.filter(f=>f.epicCode===ep.code).map(fe=><div key={fe.code} className="ml-3 mt-3">
    <h4 className="text-sm font-medium">{fe.code} · {fe.title}</h4>
    {proposal.stories.filter(st=>st.featureCode===fe.code&&st.epicCode===ep.code).map(st=><label key={st.code} className="mt-2 flex items-start gap-3 rounded-lg bg-(--bg-muted) p-2 text-sm">
      <input type="checkbox" checked={chosen.includes(st.code)} disabled={busy} onChange={e=>setSelected(prev=>{const values=prev??proposal.stories.map(x=>x.code);return e.target.checked?[...new Set([...values,st.code])]:values.filter(x=>x!==st.code);})}/>
      <span><strong>{st.code} · {st.title}</strong><span className="mt-1 block text-xs text-(--text-secondary)">{st.description||"Descrição a revisar"} · {st.priority}</span></span>
     </label>)}
   </div>)}
  </section>)}
  {error&&<p role="alert" className="text-sm text-(--danger)">{error}</p>}
  {results.length>0&&<div className="rounded-lg border p-3 text-xs"><h3 className="font-semibold">Resultado confirmado pela API</h3>{results.map((line,i)=><p key={i}>{line}</p>)}</div>}
  <button type="button" className="workspace-button-primary px-4 py-2 text-sm" disabled={busy||chosen.length===0||results.length>0} onClick={()=>void execute()}>
   {busy?"Registrando...":"Confirmar criação/reutilização de "+chosen.length+" US"}
  </button>
  <p className="text-xs text-(--text-secondary)">Criações sequenciais com verificação dos cadastros existentes. Em caso de falha, os registros já confirmados são listados e nenhum sucesso é simulado. Sprints e responsáveis não serão atribuídos automaticamente.</p>
 </div></div>;
}
