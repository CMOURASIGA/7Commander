"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import {getClientAuthHeaders} from "@/lib/client-auth";
import {MarkdownContent} from "@/components/ui/markdown-content";
import {useCentralPilotReadOnly} from "@/lib/use-central-pilot-read-only";
import {MeetingTranscriptImport} from "@/components/projects/meeting-transcript-import";

type LinkItem={record_type:string;record_id:string};
type Meeting={
 id:string;title:string;held_at:string;participants:string;objective:string;summary:string;
 advances:string;decisions:string;commitments:string;pending_items:string;risks:string;
 next_follow_up:string|null;source_conversation_id:string|null;source_artifact_id:string|null;
 created_at:string;links:LinkItem[];
};
type Field="participants"|"objective"|"summary"|"advances"|"decisions"|"commitments"|"pendingItems"|"risks"|"sourceArtifactId";
const labels:Record<Field,string>={
 participants:"Participantes",objective:"Objetivo",summary:"Resumo",advances:"Avanços",
 decisions:"Decisões",commitments:"Compromissos",pendingItems:"Pendências",
 risks:"Riscos e impedimentos",sourceArtifactId:"Documento/artefato de origem"
};
const empty=()=>({
 title:"",heldAt:new Date().toISOString().slice(0,16),participants:"",objective:"",
 summary:"",advances:"",decisions:"",commitments:"",pendingItems:"",risks:"",
 nextFollowUp:"",sourceArtifactId:""
});
export default function ProjectMeetings(){
 const {projectId}=useParams<{projectId:string}>();
 const {readOnly,checking}=useCentralPilotReadOnly();
 const [meetings,setMeetings]=useState<Meeting[]>([]);
 const [form,setForm]=useState(empty);
 const [showForm,setShowForm]=useState(false);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [compareIds,setCompareIds]=useState<string[]>([]);
 const [linkForm,setLinkForm]=useState({meetingId:"",recordType:"decision",recordId:""});
 const [linking,setLinking]=useState(false);
 const [availableRecords,setAvailableRecords]=useState<Array<{id:string;title:string}>>([]);
 const [recordsLoading,setRecordsLoading]=useState(false);
 useEffect(()=>{
  if(!projectId||!linkForm.recordType){setAvailableRecords([]);return}
  let live=true;
  const type=linkForm.recordType;
  const base="/api/projects/"+encodeURIComponent(projectId);
  const endpoint=type==="decision"?"/api/decisions?projectId="+encodeURIComponent(projectId)
   :type==="risk"?base+"/risks"
   :type==="story"?"/api/scrum/stories?projectId="+encodeURIComponent(projectId)
   :type==="scrum_task"?"/api/scrum/backlog-items?projectId="+encodeURIComponent(projectId)
   :type==="task"?base+"/tasks"
   :type==="sprint"?"/api/scrum?projectId="+encodeURIComponent(projectId)
   :"/api/knowledge?projectId="+encodeURIComponent(projectId);
  setRecordsLoading(true);setAvailableRecords([]);
  void fetch(endpoint,{headers:getClientAuthHeaders(),cache:"no-store"}).then(async response=>{
   const json=await response.json();if(!response.ok)throw Error(json.error||"Consulta indisponível.");
   let values:Array<{id:string;title:string}>=[];
   if(type==="story")values=(json.data?.stories||[]).map((x:{id:string;title:string})=>({id:x.id,title:x.title}));
   else if(type==="sprint")values=(json.data?.sprints||[]).map((x:{id:string;name:string})=>({id:x.id,title:x.name}));
   else if(type==="scrum_task")values=(json.data||[]).filter((x:{item_type:string})=>x.item_type==="task").map((x:{id:string;title:string})=>({id:x.id,title:x.title}));
   else if(type==="task")values=(json.data?.columns||[]).flatMap((x:{cards:Array<{id:string;title:string}>})=>x.cards.map(card=>({id:card.id,title:card.title})));
   else values=(json.data||[]).map((x:{id:string;title?:string;name?:string})=>({id:x.id,title:x.title||x.name||"Registro"}));
   if(live)setAvailableRecords(values);
  }).catch(()=>{if(live)setAvailableRecords([])}).finally(()=>{if(live)setRecordsLoading(false)});
  return()=>{live=false};
 },[projectId,linkForm.recordType]);

 const fetchMeetings=useCallback(async()=>{
  if(!projectId)return;
  setLoading(true);
  try{
   const response=await fetch(`/api/projects/${projectId}/meetings`,{headers:getClientAuthHeaders(),cache:"no-store"});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||"Falha na consulta.");
   setMeetings(result.data??[]);setError("");
  }catch(err){setError(err instanceof Error?err.message:"Não foi possível consultar as reuniões.");}
  finally{setLoading(false)}
 },[projectId]);
 useEffect(()=>{void fetchMeetings()},[fetchMeetings]);
 async function save(){
  if(!form.title.trim()||!form.heldAt||saving||readOnly||checking)return;
  setSaving(true);setError("");setMessage("");
  try{
   const response=await fetch(`/api/projects/${projectId}/meetings`,{
    method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
    body:JSON.stringify({...form,heldAt:new Date(form.heldAt).toISOString(),
     nextFollowUp:form.nextFollowUp?new Date(form.nextFollowUp).toISOString():null})
   });
   const payload=await response.json();if(!response.ok)throw Error(payload.error||"Falha ao registrar reunião.");
   setShowForm(false);setForm(empty());setMessage("Reunião registrada e disponível no histórico do projeto.");
   await fetchMeetings();
  }catch(err){setError(err instanceof Error?err.message:"Falha ao salvar.");}
  finally{setSaving(false)}
 }
 async function linkExisting(){
  if(readOnly||checking||linking||!linkForm.meetingId||!linkForm.recordId.trim())return;
  setLinking(true);setError("");setMessage("");
  try{
   const response=await fetch(`/api/projects/${projectId}/meetings/links`,{
    method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
    body:JSON.stringify({meetingId:linkForm.meetingId,recordType:linkForm.recordType,recordId:linkForm.recordId.trim()})
   });const data=await response.json();if(!response.ok)throw Error(data.error||"Vínculo não autorizado.");
   setLinkForm(x=>({...x,recordId:""}));setMessage("Vínculo confirmado sem duplicar o registro de origem.");
   await fetchMeetings();
  }catch(err){setError(err instanceof Error?err.message:"Erro ao vincular.")}
  finally{setLinking(false)}
 }
 const selected=compareIds.map(id=>meetings.find(m=>m.id===id)).filter((m):m is Meeting=>Boolean(m));
 const compareFields:[keyof Meeting,string][]=[["commitments","Compromissos"],["pending_items","Pendências"],["risks","Riscos e impedimentos"],["decisions","Decisões"]];
 return <main className="space-y-5">
  <header className="flex flex-wrap items-start justify-between gap-3">
   <div><Link className="text-sm underline text-(--accent)" href={"/projects?projectId="+encodeURIComponent(projectId)}>Voltar ao projeto</Link>
    <h1 className="mt-2 text-2xl font-semibold">Reuniões do projeto</h1>
    <p className="mt-1 text-sm text-(--text-secondary)">Registros estruturados, compromissos e rastreabilidade com origem preservada. Não presume entregas concluídas.</p></div>
   {!readOnly&&!checking&&<button className="workspace-button-primary px-4 py-2 text-sm" onClick={()=>setShowForm(x=>!x)}>{showForm?"Fechar formulário":"+ Registrar reunião"}</button>}
  </header>
  {projectId && <MeetingTranscriptImport projectId={projectId} onSaved={()=>void fetchMeetings()} />}
  {error&&<p role="alert" className="rounded-lg border p-3 text-sm text-red-700">{error}</p>}
  {message&&<p role="status" className="text-sm text-(--text-secondary)">{message}</p>}
  {showForm&&<section className="workspace-card space-y-3 p-5">
   <h2 className="font-semibold">Nova reunião</h2>
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-sm">Título<input className="workspace-input mt-1 w-full" maxLength={180} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></label>
    <label className="text-sm">Data e horário<input className="workspace-input mt-1 w-full" type="datetime-local" value={form.heldAt} onChange={e=>setForm(f=>({...f,heldAt:e.target.value}))}/></label>
    {(Object.keys(labels) as Field[]).map(key=><label key={key} className="text-sm sm:col-span-2">{labels[key]}<textarea className="workspace-input mt-1 w-full" rows={key==="summary"?4:2} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/></label>)}
    <label className="text-sm sm:col-span-2">Próximo acompanhamento, se confirmado<input className="workspace-input mt-1 w-full" type="datetime-local" value={form.nextFollowUp} onChange={e=>setForm(f=>({...f,nextFollowUp:e.target.value}))}/></label>
   </div>
   <p className="text-xs text-(--text-secondary)">A reunião é armazenada como registro gerencial. Apenas ações confirmadas devem ser encaminhadas para o Kanban ou Scrum.</p>
   <button className="workspace-button-primary px-4 py-2" disabled={saving||!form.title.trim()||!form.heldAt} onClick={()=>void save()}>{saving?"Salvando...":"Salvar reunião"}</button>
  </section>}
  <section className="workspace-card space-y-3 p-5">
   <h2 className="font-semibold">Comparar acompanhamentos</h2>
   <p className="text-sm text-(--text-secondary)">Selecione duas reuniões. A comparação apresenta os registros originais lado a lado, sem interpretar automaticamente um compromisso como entregue.</p>
   <div className="grid gap-3 sm:grid-cols-2">{[0,1].map(index=><label key={index} className="text-sm">Reunião {index+1}
    <select className="workspace-select mt-1 w-full" value={compareIds[index]??""} onChange={e=>setCompareIds(prev=>{const copy=[prev[0]??"",prev[1]??""];copy[index]=e.target.value;return copy})}>
     <option value="">Selecione</option>{meetings.map(meeting=><option key={meeting.id} value={meeting.id}>{new Date(meeting.held_at).toLocaleDateString("pt-BR")} · {meeting.title}</option>)}
    </select></label>)}</div>
   {selected.length===2&&compareIds[0]!==compareIds[1]&&<div className="space-y-4">{compareFields.map(([key,label])=><div key={String(key)} className="rounded-lg border border-(--border) p-3"><h3 className="mb-2 text-sm font-semibold">{label}</h3><div className="grid gap-3 sm:grid-cols-2">{selected.map(m=><div key={m.id} className="text-sm"><p className="mb-1 font-medium">{new Date(m.held_at).toLocaleDateString("pt-BR")}</p><MarkdownContent content={String(m[key]||"Não informado.")}/></div>)}</div></div>)}</div>}
  </section>
  {!readOnly&&!checking&&meetings.length>0&&<section className="workspace-card space-y-3 p-5">
   <h2 className="font-semibold">Vincular registro já existente</h2>
   <p className="text-xs text-(--text-secondary)">O vínculo exige um registro do mesmo projeto e não cria cópias. Selecione um registro autorizado. Os identificadores internos não aparecem na interface.</p>
   <div className="grid gap-3 sm:grid-cols-3">
    <select aria-label="Reunião" className="workspace-select" value={linkForm.meetingId} onChange={e=>setLinkForm(f=>({...f,meetingId:e.target.value}))}><option value="">Reunião</option>{meetings.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select>
    <select aria-label="Tipo de registro" className="workspace-select" value={linkForm.recordType} onChange={e=>setLinkForm(f=>({...f,recordType:e.target.value,recordId:""}))}>{[["decision","Decisão"],["risk","Risco"],["story","User Story"],["task","Task operacional"],["scrum_task","Task de US"],["sprint","Sprint"],["knowledge","Conhecimento"]].map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>
    <select aria-label="Registro existente" className="workspace-select" disabled={recordsLoading} value={linkForm.recordId} onChange={e=>setLinkForm(f=>({...f,recordId:e.target.value}))}><option value="">{recordsLoading?"Consultando registros...":"Selecione o registro"}</option>{availableRecords.map(record=><option key={record.id} value={record.id}>{record.title}</option>)}</select>
   </div>
   <button className="workspace-button-secondary px-4 py-2 text-sm" disabled={linking||!linkForm.meetingId||!linkForm.recordId.trim()} onClick={()=>void linkExisting()}>{linking?"Vinculando...":"Vincular"}</button>
  </section>}
  <section className="workspace-card p-5">
   <h2 className="font-semibold">Timeline de acompanhamento</h2>
   <p className="mt-1 text-sm text-(--text-secondary)">Somente acontecimentos e vínculos registrados. Não representa comprovação automática de entrega ou conclusão.</p>
   <ol className="mt-4 space-y-4 border-l-2 border-(--border) pl-5">
    {[...meetings].sort((a,b)=>Date.parse(b.held_at)-Date.parse(a.held_at)).map(meeting=><li key={meeting.id} className="relative">
     <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-(--accent)"/>
     <p className="text-xs text-(--text-secondary)">{new Date(meeting.held_at).toLocaleString("pt-BR")}</p>
     <h3 className="font-semibold">{meeting.title}</h3>
     <div className="mt-1 text-sm"><MarkdownContent content={meeting.summary||"Registro criado sem resumo."}/></div>
     {meeting.links.length>0&&<div className="mt-2 flex flex-wrap gap-2">{meeting.links.map((link,index)=>{
       const textLabel=({decision:"Decisão",risk:"Risco",story:"User Story",task:"Atividade",scrum_task:"Task de US",sprint:"Sprint",knowledge:"Conhecimento"} as Record<string,string>)[link.record_type]||"Registro";
       const target=link.record_type==="story"?"/scrum/kanban?projectId="+encodeURIComponent(projectId)+"&storyId="+encodeURIComponent(link.record_id)
         :link.record_type==="scrum_task"?"/scrum/backlog?projectId="+encodeURIComponent(projectId)+"&itemId="+encodeURIComponent(link.record_id)
         :link.record_type==="task"?"/activities?projectId="+encodeURIComponent(projectId)+"&taskId="+encodeURIComponent(link.record_id)
         :link.record_type==="sprint"?"/scrum?projectId="+encodeURIComponent(projectId)+"&sprintId="+encodeURIComponent(link.record_id)
         :null;
       return target?<Link key={index} href={target} className="rounded-lg border px-2 py-1 text-xs underline">{textLabel}</Link>
         :<span key={index} className="rounded-lg border px-2 py-1 text-xs">{textLabel} vinculada</span>
     })}</div>}
    </li>)}
   </ol>
   {!loading&&!meetings.length&&<p className="mt-3 text-sm text-(--text-secondary)">Nenhuma reunião registrada para compor a timeline.</p>}
  </section>
  <section className="space-y-3"><h2 className="font-semibold">Histórico de reuniões</h2>
   {loading?<p>Carregando registros...</p>:meetings.length===0?<p className="text-sm text-(--text-secondary)">Nenhuma reunião cadastrada para este projeto.</p>:meetings.map(m=><article key={m.id} className="workspace-card p-4">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{m.title}</h3><span className="text-sm text-(--text-secondary)">{new Date(m.held_at).toLocaleString("pt-BR")}</span></div>
    <div className="mt-2 text-sm"><MarkdownContent content={m.summary||"Sem resumo."}/></div>
    <details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-(--accent)">Ver registro completo e vínculos</summary>
     <div className="mt-3 space-y-3">{([
      ["Participantes",m.participants],["Objetivo",m.objective],["Avanços",m.advances],
      ["Decisões",m.decisions],["Compromissos",m.commitments],["Pendências",m.pending_items],
      ["Riscos",m.risks],["Próximo acompanhamento",m.next_follow_up?new Date(m.next_follow_up).toLocaleString("pt-BR"):""]
     ] as [string,string][]).map(([label,content])=><section key={label}><h4 className="text-xs font-semibold">{label}</h4><MarkdownContent content={content||"Não informado."}/></section>)}
      <p className="text-xs text-(--text-secondary)">Origem: {m.source_conversation_id?"Conversa vinculada":m.source_artifact_id?"Documento referenciado":"Registro manual"} · {m.links.length} vínculos</p>
      {m.links.length>0&&<p className="text-xs text-(--text-secondary)">Relacionamentos: {m.links.map(l=>l.record_type).join(", ")}</p>}
     </div>
    </details>
   </article>)}
  </section>
 </main>
}
