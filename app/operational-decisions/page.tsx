"use client";
import {useCallback,useEffect,useState} from "react";
import {getClientAuthHeaders} from "@/lib/client-auth";
type Evaluation={id:string;module:string;entity_type:string;verdict:{category:string;severity:string;score:number;criteria:string[];evidence:string[];limitations:string[]};status:string;provider:string;created_at:string};
const modules=["projects","kanban","risks","commercial","decisions","knowledge","notifications"];
const moduleLabels:Record<string,string>={projects:"Projetos",kanban:"Kanban / tarefas",risks:"Riscos e problemas",commercial:"Prospects e oportunidades",decisions:"Decisões",knowledge:"Conhecimento",notifications:"Notificações / tarefas"};
type Preview={module:string;sourceId:string;sourceTitle:string;verdict:Evaluation["verdict"]};
export default function OperationalDecisions(){
 const [items,setItems]=useState<Evaluation[]>([]),[mode,setMode]=useState("disabled"),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [sourceId,setSourceId]=useState(""),[module,setModule]=useState("projects"),[title,setTitle]=useState(""),[description,setDescription]=useState(""),[reason,setReason]=useState(""),[filter,setFilter]=useState("all");
 const load=useCallback(async()=>{const r=await fetch("/api/operational-decisions",{headers:getClientAuthHeaders(),cache:"no-store"});const j=await r.json();if(!r.ok)throw Error(j.error||"Falha ao consultar");setItems(j.data||[]);setMode(j.mode||"disabled");},[]);
 useEffect(()=>{void load().catch(e=>setError(e.message))},[load]);
 async function evaluate(){setBusy(true);setError("");try{const r=await fetch("/api/operational-decisions",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({mode,synthetic:true,input:{module,title,description}})});const j=await r.json();if(!r.ok)throw Error(j.error);await load();setTitle("");setDescription("");}catch(e){setError(e instanceof Error?e.message:"Falha na avaliação")}finally{setBusy(false)}}
 async function evaluateSource(){
  setBusy(true);setError("");
  try{
   const r=await fetch("/api/operational-decisions/source",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({module,id:sourceId.trim()})});
   const j=await r.json();if(!r.ok)throw Error(j.error||"Falha ao avaliar registro");
   await load();setSourceId("");
  }catch(e){setError(e instanceof Error?e.message:"Falha de avaliação");}
  finally{setBusy(false);}
 }
 async function review(id:string,decision:string){if(reason.trim().length<5){setError("Informe um motivo com pelo menos cinco caracteres.");return;}setBusy(true);setError("");try{const r=await fetch(`/api/operational-decisions/${id}/review`,{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({decision,reason})});const j=await r.json();if(!r.ok)throw Error(j.error);await load();setReason("");}catch(e){setError(e instanceof Error?e.message:"Falha na revisão")}finally{setBusy(false)}}
 const [previewModule,setPreviewModule]=useState("projects"),[sources,setSources]=useState<Array<{id:string;title:string}>>([]),[previewId,setPreviewId]=useState(""),[preview,setPreview]=useState<Preview|null>(null),[previewBusy,setPreviewBusy]=useState(false),[previewError,setPreviewError]=useState("");
 const loadSources=useCallback(async(m:string)=>{setPreviewBusy(true);setPreview(null);setPreviewId("");setPreviewError("");try{const r=await fetch("/api/operational-decisions/preview?module="+encodeURIComponent(m),{headers:getClientAuthHeaders(),cache:"no-store"});const j=await r.json();if(!r.ok)throw Error(j.error||"Falha na listagem");setSources(j.data||[]);}catch(e){setSources([]);setPreviewError(e instanceof Error?e.message:"Falha na consulta");}finally{setPreviewBusy(false);}},[]);
 useEffect(()=>{void loadSources(previewModule);},[previewModule,loadSources]);
 async function executePreview(){if(!previewId)return;setPreviewBusy(true);setPreview(null);setPreviewError("");try{const params=new URLSearchParams({module:previewModule,id:previewId});const r=await fetch("/api/operational-decisions/preview?"+params,{headers:getClientAuthHeaders(),cache:"no-store"});const j=await r.json();if(!r.ok)throw Error(j.error||"Falha na avaliação");if(j.readOnly!==true||j.persisted!==false||j.externalProviderCalled!==false)throw Error("Garantia de prévia sem gravação não confirmada");setPreview(j.data);}catch(e){setPreviewError(e instanceof Error?e.message:"Falha na prévia");}finally{setPreviewBusy(false);}}
 const visible=items.filter(x=>filter==="all"||x.module===filter);
 return <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
  <h1 className="text-2xl font-semibold">Central de Decisões Operacionais</h1>
  <p className="text-sm text-(--text-secondary)">Avaliações consultivas, sem execução automática de tarefas, alterações de status ou decisões comerciais. Não substitui o Kairos.</p>
  <section className="rounded-xl border border-(--border) bg-white p-4 space-y-3" aria-label="Prévia sem gravação">
   <div><h2 className="font-semibold">Prévia de registros existentes, sem gravação</h2><p className="text-sm text-(--text-secondary)">Selecione um registro da empresa ativa. Classificação por regras locais, sem Jev, sem alterar registros, sem criar avaliações e sem consumir cotas. Funciona mesmo com o laboratório desativado.</p></div>
   <label className="block text-sm">Módulo<select className="workspace-select mt-1 w-full" value={previewModule} onChange={e=>setPreviewModule(e.target.value)}>{modules.map(m=><option key={m} value={m}>{moduleLabels[m]}</option>)}</select></label>
   <label className="block text-sm">Registro existente<select aria-label="Registro para prévia" className="workspace-select mt-1 w-full" value={previewId} onChange={e=>{setPreviewId(e.target.value);setPreview(null);}}><option value="">Selecione um registro</option>{sources.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
   {sources.length===0&&!previewBusy?<p className="text-xs text-(--text-secondary)">Nenhum registro disponível nos primeiros 40 resultados deste módulo, ou acesso não autorizado.</p>:null}
   <button type="button" disabled={previewBusy||!previewId} onClick={()=>void executePreview()} className="workspace-button-primary px-3 py-2">Gerar prévia sem salvar</button>
   {previewBusy?<p role="status" className="text-sm">Consultando dados autorizados...</p>:null}
   {previewError?<p role="alert" className="text-sm text-red-700">{previewError}</p>:null}
   {preview?<article className="rounded-lg border border-(--border) bg-(--bg-surface) p-4 space-y-2" aria-label="Resultado da prévia">
    <h3 className="font-semibold">{preview.sourceTitle}</h3>
    <p className="text-sm"><strong>Classificação:</strong> {preview.verdict.category} · <strong>Severidade:</strong> {preview.verdict.severity} · <strong>Pontuação indicativa:</strong> {preview.verdict.score}/100</p>
    <p className="text-sm"><strong>Critérios:</strong> {(preview.verdict.criteria||[]).join("; ")}</p>
    <p className="text-sm"><strong>Evidências:</strong> {(preview.verdict.evidence||[]).join("; ")}</p>
    <p className="text-sm"><strong>Limitações:</strong> {(preview.verdict.limitations||[]).join("; ")}</p>
    <p className="text-xs font-medium">Resultado temporário nesta tela. Nenhum registro, auditoria, cota ou avaliação foi criado.</p>
   </article>:null}
  </section>
  <div className="grid gap-3 md:grid-cols-4">{[["Avaliações",items.length],["Pendentes",items.filter(x=>x.status==="pending_review").length],["Aceitas",items.filter(x=>x.status==="accepted").length],["Rejeitadas",items.filter(x=>x.status==="rejected").length]].map(([k,v])=><section key={k} className="rounded-xl border border-(--border) bg-white p-4"><p className="text-xs text-(--text-secondary)">{k}</p><strong className="text-2xl">{v}</strong></section>)}</div>
  <section className="rounded-xl border border-(--border) bg-white p-4 space-y-3"><h2 className="font-semibold">Laboratório de simulação</h2><p className="text-xs">Modo atual: {mode}. Use somente dados sintéticos, nunca informações reais de clientes. No modo observação, o exemplo é enviado ao provedor externo.</p>
   {mode!=="disabled"?<><label className="block text-sm">Módulo<select className="workspace-select mt-1 w-full" value={module} onChange={e=>setModule(e.target.value)}>{modules.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
   <label className="block text-sm">Título fictício<input className="workspace-input mt-1 w-full" value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label className="block text-sm">Contexto fictício<textarea className="workspace-input mt-1 w-full" rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label>
   <button disabled={busy||title.trim().length<3} onClick={()=>void evaluate()} className="workspace-button-primary px-3 py-2">{mode==="observation"?"Avaliar exemplo com Jev":"Simular avaliação"}</button></>:<p className="text-sm">Funcionalidade desativada por padrão. Requer migração 066 e autorização para habilitar simulação.</p>}</section>
  {mode!=="disabled"?<section className="rounded-xl border border-(--border) bg-white p-4 space-y-3"><h2 className="font-semibold">Avaliar registro existente — simulação local</h2><p className="text-xs text-(--text-secondary)">Busca os dados autorizados no servidor e aplica uma rubrica determinística. Dados reais não são enviados ao Jev neste fluxo.</p><label className="block text-sm">ID do registro<input className="workspace-input mt-1 w-full" value={sourceId} onChange={e=>setSourceId(e.target.value)} placeholder="UUID do registro da empresa selecionada"/></label><button disabled={busy||!sourceId.trim()} className="workspace-button-secondary px-3 py-2" onClick={()=>void evaluateSource()}>Avaliar registro sem IA externa</button></section>:null}
  <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Avaliações da empresa selecionada</h2><select aria-label="Filtrar módulo" className="workspace-select" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos</option>{modules.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
   {visible.map(x=><article key={x.id} className="rounded-xl border border-(--border) bg-white p-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><strong>{x.module} · {x.verdict?.category}</strong><span className="text-xs">{x.verdict?.severity} · {x.status}</span></div>
    <p className="text-sm">Pontuação indicativa: {x.verdict?.score}/100 · {new Date(x.created_at).toLocaleString("pt-BR")}</p>
    <p className="text-xs">Evidências factuais recebidas: {(x.verdict?.evidence||[]).join("; ")}</p>
    <p className="text-xs text-(--text-secondary)">Limitações: {(x.verdict?.limitations||[]).join("; ")}</p>
    {x.status==="pending_review"?<div className="space-y-2"><label className="block text-sm">Motivo da decisão<input className="workspace-input mt-1 w-full" value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="flex gap-2">{[["accepted","Aceitar"],["rejected","Rejeitar"],["review_requested","Solicitar revisão"]].map(([value,label])=><button key={value} disabled={busy} onClick={()=>void review(x.id,value)} className="workspace-button-secondary px-3 py-2 text-sm">{label}</button>)}</div></div>:null}
   </article>)}{visible.length===0?<p className="text-sm text-(--text-secondary)">Nenhuma avaliação registrada nesta empresa ou filtro.</p>:null}</section>
  {error?<p role="alert" className="rounded-lg border p-3 text-sm">{error}</p>:null}
 </main>;
}
