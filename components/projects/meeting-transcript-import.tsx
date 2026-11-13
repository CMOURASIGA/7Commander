"use client";
import {useRef,useState} from "react";
import {getClientAuthHeaders} from "@/lib/client-auth";
import {useCentralPilotReadOnly} from "@/lib/use-central-pilot-read-only";
import type {MeetingDraft} from "@/services/meeting-transcript-draft";

type Editable=Omit<MeetingDraft,"uncertainties"|"suggestedActions">;
const fields:[keyof Editable,string][]=[
 ["title","Título"],["participants","Participantes"],["objective","Objetivo"],
 ["summary","Resumo"],["advances","Avanços"],["decisions","Decisões confirmadas"],
 ["commitments","Compromissos"],["pendingItems","Pendências"],
 ["risks","Riscos debatidos"],["sourceArtifactId","Referência da fonte"]
];
export function MeetingTranscriptImport({projectId,onSaved}:{projectId:string;onSaved?:()=>void}){
 const {readOnly,checking}=useCentralPilotReadOnly();
 const [file,setFile]=useState<File|null>(null);
 const fileInput=useRef<HTMLInputElement|null>(null);
 const [notes,setNotes]=useState("");
 const [draft,setDraft]=useState<MeetingDraft|null>(null);
 const [sourceName,setSourceName]=useState("");
 const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
 const [error,setError]=useState(""),[success,setSuccess]=useState("");
 const [open,setOpen]=useState(false);
 async function analyze(){
  if(!projectId||loading)return;
  setError("");setSuccess("");setDraft(null);setLoading(true);
  try{
   const data=new FormData();
   if(file)data.append("file",file);
   if(notes.trim())data.append("text",notes.trim());
   const response=await fetch("/api/projects/"+encodeURIComponent(projectId)+"/meetings/draft",{
    method:"POST",headers:getClientAuthHeaders(),body:data
   });
   const body=await response.json();
   if(!response.ok)throw Error(body.error||"Falha ao interpretar transcrição.");
   setDraft({...body.data,sourceArtifactId:file?.name||"Texto colado no chat"} as MeetingDraft);
   setSourceName(file?.name||"Texto colado no chat");
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível analisar a fonte.");}
  finally{setLoading(false);}
 }
 async function save(){
  if(!draft||!projectId||saving||readOnly||checking)return;
  if(!draft.heldAt){setError("Informe a data e o horário confirmados da reunião antes de salvar.");return;}
  if(!draft.title.trim()||!draft.summary.trim()){setError("Confira título e resumo.");return;}
  setError("");setSaving(true);
  try{
   const response=await fetch("/api/projects/"+encodeURIComponent(projectId)+"/meetings",{
    method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
    body:JSON.stringify({...draft,
     heldAt:new Date(draft.heldAt).toISOString(),
     nextFollowUp:draft.nextFollowUp?new Date(draft.nextFollowUp).toISOString():null,
     sourceArtifactId:draft.sourceArtifactId||sourceName,
    })
   });
   const body=await response.json();
   if(!response.ok)throw Error(body.error||"Erro ao salvar reunião.");
   setSuccess("Reunião registrada após aprovação. Nenhuma decisão, risco ou atividade foi criada automaticamente.");
   setDraft(null);setNotes("");setFile(null);onSaved?.();
  }catch(e){setError(e instanceof Error?e.message:"Falha ao registrar a reunião.");}
  finally{setSaving(false);}
 }
 const edit=(key:keyof Editable,value:string)=>setDraft(p=>p?{...p,[key]:value}:p);
 return <section className="workspace-card space-y-3 p-4" aria-label="Importação de transcrição para reunião">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="text-sm font-semibold">Importar reunião com o Kairos</h2>
    <p className="mt-1 text-xs text-(--text-secondary)">Teams, Gemini ou qualquer transcrição. O Kairos prepara uma prévia. Você decide o que registrar.</p></div>
   <button type="button" className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>setOpen(p=>!p)} aria-expanded={open}>{open?"Ocultar importação":"Importar transcrição"}</button>
  </div>
  {open&&<div className="space-y-3">
   <div className="space-y-2">
    <p className="text-xs font-semibold">Arquivo de transcrição</p>
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-(--border) bg-(--bg-surface) p-3">
     <input ref={fileInput} id="meeting-transcript-file" type="file"
      accept=".pdf,.docx,.txt,.md,.csv,.json,.vtt,.srt"
      aria-label="Selecionar arquivo de transcrição"
      className="sr-only"
      onChange={event=>{
       const next=event.target.files?.[0]??null;
       setError("");setSuccess("");setDraft(null);
       if(next&& !/\.(pdf|docx|txt|md|csv|json|vtt|srt)$/i.test(next.name)){
        setFile(null);setError("Formato não suportado. Selecione PDF, DOCX, TXT, MD, CSV, JSON, VTT ou SRT.");event.target.value="";return;
       }
       if(next&&next.size>8*1024*1024){
        setFile(null);setError("O arquivo deve ter no máximo 8 MB.");event.target.value="";return;
       }
       setFile(next);
      }}/>
     <button type="button" onClick={()=>fileInput.current?.click()}
      disabled={loading||saving}
      className="workspace-button-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
      <span aria-hidden="true">↥</span>{file?"Substituir arquivo":"Selecionar arquivo"}
     </button>
     <div className="min-w-0 flex-1" role="status" aria-live="polite">
      <p className="truncate text-sm font-medium text-(--text-primary)">{file?file.name:"Nenhum arquivo selecionado"}</p>
      <p className="text-xs text-(--text-secondary)">{file?(file.size/1024/1024).toFixed(2)+" MB · Pronto para análise":"PDF, DOCX, TXT, MD, CSV, JSON, VTT ou SRT · até 8 MB"}</p>
     </div>
     {file?<button type="button" onClick={()=>{setFile(null);setDraft(null);if(fileInput.current)fileInput.current.value="";}}
       className="workspace-button-secondary px-3 py-2 text-xs" disabled={loading||saving}>Remover</button>:null}
    </div>
    <p className="text-xs text-(--text-secondary)">Depois de selecionar, clique em Preparar prévia com Kairos. O documento não será cadastrado automaticamente.</p>
   </div>
   <label className="block text-xs font-semibold">Ou cole as anotações e a transcrição
    <textarea className="workspace-input mt-1 min-h-28 w-full" value={notes} onChange={e=>setNotes(e.target.value)}
     placeholder="Cole aqui o texto do Teams, Gemini ou suas próprias anotações..."/>
   </label>
   <button type="button" className="workspace-button-primary px-4 py-2 text-sm" disabled={loading||(!file&&notes.trim().length<80)}
    onClick={()=>void analyze()}>{loading?"Interpretando a fonte...":"Preparar prévia com Kairos"}</button>
   {draft&&<section className="space-y-3 rounded-xl border border-(--border) p-4" aria-label="Prévia para aprovação">
    <div><h3 className="text-sm font-semibold">Revisar ata antes de salvar</h3>
     <p className="text-xs text-(--text-secondary)">Origem: {sourceName}. O documento original não foi guardado. Revise datas, participantes e afirmações antes de aprovar.</p></div>
    <label className="block text-xs font-semibold">Data e hora confirmadas (obrigatório)
     <input type="datetime-local" value={draft.heldAt?draft.heldAt.slice(0,16):""} onChange={e=>edit("heldAt",e.target.value)}
      className="workspace-input mt-1 w-full"/>
    </label>
    <div className="grid gap-3 sm:grid-cols-2">{fields.map(([key,label])=>
     <label key={key} className="text-xs font-semibold sm:col-span-2">{label}
      {key==="title"||key==="sourceArtifactId"
       ?<input maxLength={key==="title"?180:500} className="workspace-input mt-1 w-full" value={draft[key]} onChange={e=>edit(key,e.target.value)}/>
       :<textarea rows={key==="summary"?4:2} className="workspace-input mt-1 w-full" value={draft[key]} onChange={e=>edit(key,e.target.value)}/>}
     </label>)}</div>
    <label className="block text-xs font-semibold">Próximo acompanhamento (somente se confirmado)
     <input type="datetime-local" value={draft.nextFollowUp?draft.nextFollowUp.slice(0,16):""}
      className="workspace-input mt-1 w-full" onChange={e=>edit("nextFollowUp",e.target.value)}/>
    </label>
    {draft.uncertainties.length>0&&<div className="text-xs"><strong>Informações que precisam de confirmação</strong>
     <ul className="mt-1 list-disc pl-5">{draft.uncertainties.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
    {draft.suggestedActions.length>0&&<div className="text-xs"><strong>Encaminhamentos sugeridos, ainda não cadastrados</strong>
     <ul className="mt-1 list-disc pl-5">{draft.suggestedActions.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
    <p className="text-xs text-(--text-secondary)">Nenhuma sugestão gera atividade, risco ou decisão. Vínculos poderão ser revisados após o cadastro.</p>
    <div className="flex flex-wrap gap-2">
     <button type="button" onClick={()=>void save()} disabled={saving||readOnly||checking||!draft.heldAt} className="workspace-button-primary px-4 py-2 text-xs">
      {saving?"Registrando...":readOnly||checking?"Somente leitura":"Aprovar e registrar reunião"}</button>
     <button type="button" onClick={()=>setDraft(null)} className="workspace-button-secondary px-4 py-2 text-xs">Descartar prévia</button>
    </div>
   </section>}
  </div>}
  {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
  {success&&<p role="status" className="text-xs text-emerald-700">{success}</p>}
 </section>;
}
