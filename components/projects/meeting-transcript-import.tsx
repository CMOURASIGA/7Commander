"use client";
import {useEffect,useRef,useState} from "react";
import {getClientAuthHeaders} from "@/lib/client-auth";
import {useCentralPilotReadOnly} from "@/lib/use-central-pilot-read-only";
import type {MeetingDraft} from "@/services/meeting-transcript-draft";
import {formatApprovedMeetingActions,type MeetingAction} from "@/services/meeting-evidence";

type Editable=Pick<MeetingDraft,"title"|"participants"|"objective"|"summary"|"advances"|"decisions"|"commitments"|"pendingItems"|"risks"|"sourceArtifactId"|"heldAt"|"nextFollowUp">;
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
 const [reviewTab,setReviewTab]=useState<"meeting"|"actions"|"checks">("meeting");
 const [sourceName,setSourceName]=useState("");
 const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
 const [error,setError]=useState(""),[success,setSuccess]=useState("");
 const [open,setOpen]=useState(false);
 const controllerRef=useRef<AbortController|null>(null);
 const lastProgressRef=useRef(0);
 const [slow,setSlow]=useState(false);
 const [progress,setProgress]=useState<{stage:string;completed:number;total:number;message:string}|null>(null);
 useEffect(()=>{
  return ()=>controllerRef.current?.abort();
 },[]);
 useEffect(()=>{
  if(!loading)return;
  const check=window.setInterval(()=>setSlow(Date.now()-lastProgressRef.current>45000),5000);
  return ()=>window.clearInterval(check);
 },[loading]);

 async function analyze(){
  if(!projectId||loading)return;
  setError("");setSuccess("");setDraft(null);setLoading(true);setSlow(false);
  setProgress({stage:"preparing",completed:0,total:0,message:"Enviando arquivo e verificando acesso ao projeto"});
  lastProgressRef.current=Date.now();
  const controller=new AbortController();
  controllerRef.current=controller;
  try{
   const data=new FormData();
   if(file)data.append("file",file);
   if(notes.trim())data.append("text",notes.trim());
   const response=await fetch("/api/projects/"+encodeURIComponent(projectId)+"/meetings/draft",{
    method:"POST",headers:getClientAuthHeaders({"Accept":"application/x-ndjson"}),body:data,signal:controller.signal
   });
   if(!response.ok){
    const body=await response.json().catch(()=>({}));
    throw Error(body.error||"Falha ao interpretar transcrição.");
   }
   if(!response.body)throw Error("O servidor não disponibilizou acompanhamento do processamento.");
   const reader=response.body.getReader();
   const decoder=new TextDecoder();
   let pending="",received=false;
   const consume=(line:string)=>{
    if(!line.trim())return;
    const message=JSON.parse(line) as {type:string;error?:string;data?:MeetingDraft;stage?:string;completed?:number;total?:number;message?:string};
    lastProgressRef.current=Date.now();setSlow(false);
    if(message.type==="error")throw Error(message.error||"Falha na análise de um bloco.");
    if(message.type==="progress")setProgress({stage:message.stage||"preparing",completed:message.completed??0,total:message.total??0,message:message.message||"Analisando"});
    if(message.type==="result"&&message.data){
     received=true;
     setDraft({...message.data,sourceArtifactId:file?.name||"Texto colado no chat"});
     setReviewTab("meeting");
     setSourceName(file?.name||"Texto colado no chat");
     setProgress({stage:"completed",completed:1,total:1,message:"Prévia pronta para revisão"});
    }
   };
   try{
    while(true){
     const chunk=await reader.read();
     if(chunk.done)break;
     pending+=decoder.decode(chunk.value,{stream:true});
     const lines=pending.split("\n");
     pending=lines.pop()||"";
     for(const line of lines)consume(line);
    }
    pending+=decoder.decode();
    if(pending.trim())consume(pending);
   }finally{reader.releaseLock();}
   if(!received)throw Error("Processamento encerrado sem gerar a prévia. Nenhum registro foi criado.");
  }catch(e){
   setProgress(null);
   setError(controller.signal.aborted?"Análise cancelada. Nenhuma reunião foi gravada.":e instanceof Error?e.message:"Não foi possível analisar a fonte.");
  }finally{
   if(controllerRef.current===controller)controllerRef.current=null;
   setLoading(false);setSlow(false);
  }
 }
 async function save(){
  if(!draft||!projectId||saving||readOnly||checking)return;
  if(!draft.heldAt){setError("Informe a data e o horário confirmados da reunião antes de salvar.");return;}
  if(!draft.title.trim()||!draft.summary.trim()){setError("Confira título e resumo.");return;}
  setError("");setSaving(true);
  try{
   const selectedActions=draft.evidence?.actions??[];
   const formatted=selectedActions.length?formatApprovedMeetingActions(selectedActions):null;
   if(formatted&&((selectedActions.filter(action=>action.included&&["assumido","realizado"].includes(action.status)).length>0&&!formatted.commitments)||(selectedActions.filter(action=>action.included&&!["assumido","realizado"].includes(action.status)).length>0&&!formatted.pendingItems))){
    setError("Encaminhamentos selecionados não foram consolidados. Revise a seleção.");return;
   }
   if(formatted&&(formatted.commitments.length>8000||formatted.pendingItems.length>8000)){
    setReviewTab("actions");setError("Muitos encaminhamentos selecionados para o campo da ata. Revise a seleção para evitar perda de informações.");return;
   }
   const response=await fetch("/api/projects/"+encodeURIComponent(projectId)+"/meetings",{
    method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
    body:JSON.stringify({...draft,
     ...(formatted?{commitments:formatted.commitments,pendingItems:formatted.pendingItems}:{}),
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
 const editAction=(id:string,patch:Partial<MeetingAction>)=>setDraft(previous=>previous?{...previous,
  evidence:{...previous.evidence,actions:previous.evidence.actions.map(action=>action.id===id?{...action,...patch}:action)}
 }:previous);
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
   {loading&&progress?<section className="space-y-3 rounded-xl border border-(--border) bg-(--bg-muted) p-4" aria-label="Progresso da interpretação">
     <div role="status" aria-live="polite" className="space-y-1">
      <p className="text-sm font-semibold">{progress.message}</p>
      <p className="text-xs text-(--text-secondary)">{progress.stage==="blocks"&&progress.total>0
       ?progress.completed+" de "+progress.total+" blocos analisados"
       :progress.stage==="consolidating"?"Todos os blocos concluídos. Preparando o resultado final."
       :"Preparando processamento..."}</p>
     </div>
     <div role="progressbar" aria-label="Etapa de interpretação da reunião"
      aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={progress.stage==="blocks"&&progress.total>0?Math.round(progress.completed/progress.total*100):undefined}
      aria-valuetext={progress.message}
      className="h-2 w-full overflow-hidden rounded-full bg-(--border)">
      <div className={"h-full rounded-full bg-(--accent) transition-all "+(progress.stage!=="blocks"?"animate-pulse":"")}
       style={{width:progress.stage==="blocks"&&progress.total>0?(progress.completed/progress.total*100)+"%":"100%"}}/>
     </div>
     {slow?<p role="alert" className="text-xs font-semibold text-(--danger)">Sem nova atualização há mais de 45 segundos. A IA pode estar processando um bloco demorado ou a conexão pode estar interrompida. Você pode cancelar e tentar novamente.</p>:null}
     <button type="button" className="workspace-button-secondary px-3 py-2 text-xs"
      onClick={()=>controllerRef.current?.abort()}>Cancelar análise</button>
     <p className="text-xs text-(--text-secondary)">A barra mostra blocos concluídos, não uma estimativa de tempo restante. Durante a consolidação, o tempo não é previsível.</p>
    </section>:null}
   {draft&&<section className="space-y-3 rounded-xl border border-(--border) p-4" aria-label="Prévia para aprovação">
    <div><h3 className="text-sm font-semibold">Revisar ata antes de salvar</h3>
     <p className="text-xs text-(--text-secondary)">Origem: {sourceName}. O documento original não foi guardado. Revise datas, participantes e afirmações antes de aprovar.</p></div>
    <nav className="flex gap-2 overflow-x-auto border-b border-(--border) pb-2" role="tablist" aria-label="Etapas de revisão da reunião">
     {([["meeting","Dados da reunião"],["actions","Encaminhamentos"],["checks","Conferência da fonte"]] as const).map(([key,label])=>
      <button type="button" key={key} role="tab" aria-selected={reviewTab===key}
       className={reviewTab===key?"shrink-0 rounded-lg bg-(--accent-soft) px-3 py-2 text-xs font-semibold text-(--accent)":"shrink-0 rounded-lg px-3 py-2 text-xs text-(--text-secondary) hover:bg-(--bg-muted)"}
       onClick={()=>setReviewTab(key)}>{label}{key==="actions"?" ("+(draft.evidence?.actions.length??0)+")":""}</button>)}
    </nav>
    {reviewTab==="meeting"&&<>
    {(draft.evidence?.actions.length??0)>0?<p className="rounded-lg bg-(--bg-muted) px-3 py-2 text-xs text-(--text-secondary)">Os campos Compromissos e Pendências serão consolidados a partir dos encaminhamentos selecionados na aba Encaminhamentos. Revise a seleção antes de aprovar.</p>:null}
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
    </>}
    {reviewTab==="actions"&&<div className="space-y-3">
      <p className="text-xs text-(--text-secondary)">Cada encaminhamento é uma proposta extraída da fonte. Selecione somente os itens que deseja registrar na ata. Nenhum card ou decisão será criado automaticamente.</p>
      {!(draft.evidence?.actions.length)?<p className="rounded-lg border border-(--border) p-3 text-sm text-(--text-secondary)">Nenhum encaminhamento individualizado identificado. Revise o texto da ata antes de aprovar.</p>:null}
      {(draft.evidence?.actions??[]).map(action=><article key={action.id} className="space-y-2 rounded-xl border border-(--border) p-3">
       <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={action.included}
         onChange={e=>editAction(action.id,{included:e.target.checked})}/>{action.id} · Incluir na ata</label>
        <span className="text-xs text-(--text-secondary)">Bloco {action.sourceBlock}{action.time?" · "+action.time:""}</span>
       </div>
       <label className="block text-xs font-semibold">Encaminhamento
        <textarea className="workspace-input mt-1 w-full" rows={2} value={action.title}
         onChange={e=>editAction(action.id,{title:e.target.value})}/></label>
       <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs font-semibold">Responsável citado ou sugerido
         <input className="workspace-input mt-1 w-full" value={action.owner} onChange={e=>editAction(action.id,{owner:e.target.value})}/></label>
        <label className="block text-xs font-semibold">Situação na fonte
         <select className="workspace-input mt-1 w-full" value={action.status}
          onChange={e=>editAction(action.id,{status:e.target.value as MeetingAction["status"]})}>
          <option value="proposta">Proposta</option><option value="assumido">Compromisso assumido</option>
          <option value="realizado">Informado como realizado</option><option value="pendente">Pendente</option>
          <option value="a_confirmar">A confirmar</option>
         </select></label>
       </div>
       <p className="rounded-lg bg-(--bg-muted) p-2 text-xs text-(--text-secondary)">Trecho identificado pela IA (conferir na fonte): {action.evidence||"Não fornecido"}{action.time?" · "+action.time:""}</p>
      </article>)}
    </div>}
    {reviewTab==="checks"&&<div className="space-y-3 text-sm">
      <p><strong>Cobertura da fonte:</strong> {draft.evidence?.coverage.processed??0} de {draft.evidence?.coverage.blocks??0} bloco(s) analisado(s).</p>
      <p><strong>Encaminhamentos identificados:</strong> {draft.evidence?.actions.length??0}.</p>
      <p><strong>Participantes confirmados nos trechos:</strong> {draft.evidence?.participantsConfirmed?.join("; ")||"Nenhum identificado"}.</p>
      <p><strong>Pessoas mencionadas, não necessariamente presentes:</strong> {draft.evidence?.participantsMentioned.join("; ")||"Nenhuma identificada"}.</p>
      <p className="text-xs text-(--text-secondary)">Verifique especialmente responsáveis, identidade dos falantes, datas, regras ainda em discussão e compromissos realmente assumidos.</p>
      {(draft.evidence?.coverage.notes??[]).length>0&&<ul className="list-disc pl-5 text-xs text-(--text-secondary)">{draft.evidence.coverage.notes.map((note,i)=><li key={i}>{note}</li>)}</ul>}
    </div>}
    {reviewTab==="checks"&&draft.uncertainties.length>0&&<div className="text-xs"><strong>Informações que precisam de confirmação</strong>
     <ul className="mt-1 list-disc pl-5">{draft.uncertainties.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
    {reviewTab==="checks"&&draft.suggestedActions.length>0&&<div className="text-xs"><strong>Encaminhamentos sugeridos, ainda não cadastrados</strong>
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
