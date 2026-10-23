"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {getClientAuthHeaders} from "@/lib/client-auth";
type P={id:string;name:string};
type Run={id:string;project_id:string;status:string;checkpoint:Record<string,string>;baseline_version:number;updated_at:string};
const available:Record<string,string[]>={
 iniciada:["requisitos","pausada","cancelada"],
 requisitos:["pesquisa","matriz","pausada","falhou","cancelada"],
 pesquisa:["matriz","pausada","falhou","cancelada"],
 matriz:["revisao","pausada","falhou","cancelada"],
 revisao:["aprovada","rejeitada","matriz","pausada","cancelada"],
 pausada:["requisitos","pesquisa","matriz","revisao","cancelada"],
 falhou:["requisitos","pesquisa","matriz","cancelada"],
 aprovada:[],rejeitada:[],cancelada:[]
};
export default function WorkflowsPage(){
 const[projects,setProjects]=useState<P[]>([]),[projectId,setProjectId]=useState("");
 const[baseline,setBaseline]=useState(1),[fingerprint,setFingerprint]=useState("");
 const[runs,setRuns]=useState<Run[]>([]),[note,setNote]=useState(""),[status,setStatus]=useState("");
 const[busy,setBusy]=useState(false);
 useEffect(()=>{void (async()=>{const r=await fetch("/api/projects",{headers:getClientAuthHeaders()});if(!r.ok)return;const j=await r.json();setProjects(j.data||[]);})()},[]);
 async function load(){if(!projectId)return;try{
 const r=await fetch("/api/planning/workflows?projectId="+encodeURIComponent(projectId),{headers:getClientAuthHeaders(),cache:"no-store"});
 const j=await r.json();if(!r.ok)throw Error(j.error||"Falha");
 setRuns(j.data||[]);setStatus("");
 }catch(e){setStatus(e instanceof Error?e.message:"Falha ao consultar");}}
 useEffect(()=>{void load()},[projectId]);
 async function start(){if(!projectId)return;setBusy(true);try{
 const r=await fetch("/api/planning/workflows",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
 body:JSON.stringify({projectId,baselineVersion:baseline,fingerprint:fingerprint||"analysis-"+crypto.randomUUID()})});
 const j=await r.json();if(!r.ok)throw Error(j.error||"Falha");
 setStatus(j.alreadyExists?"Execução com este identificador já existe.":"Execução criada sem disparar IA ou pesquisa externa.");
 await load();
 }catch(e){setStatus(e instanceof Error?e.message:"Falha");}finally{setBusy(false)}}
 async function move(run:Run,next:string){setBusy(true);try{
 const r=await fetch("/api/planning/workflows",{method:"PATCH",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
 body:JSON.stringify({id:run.id,projectId,status:next,checkpoint:{nota:note}})});
 const j=await r.json();if(!r.ok)throw Error(j.error||"Falha");
 setStatus("Etapa atualizada.");setNote("");await load();
 }catch(e){setStatus(e instanceof Error?e.message:"Falha");}finally{setBusy(false)}}
 return <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
 <Link href="/planning" className="text-sm underline">← Voltar ao planejamento</Link>
 <header><h1 className="text-2xl font-semibold">Fluxo de análise governada</h1>
 <p className="text-sm text-(--text-secondary)">Checkpoints e aprovação humana. Esta tela não executa buscas externas nem modelos de IA automaticamente.</p></header>
 <section className="rounded-xl border border-(--border) bg-white p-4 space-y-3">
  <label className="block text-sm">Projeto<select className="workspace-select mt-1 w-full" value={projectId} onChange={e=>setProjectId(e.target.value)}>
  <option value="">Escolha um projeto</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  <label className="block text-sm">Versão baseline<input type="number" min={1} value={baseline} onChange={e=>setBaseline(Math.max(1,Number(e.target.value)||1))} className="workspace-input mt-1 w-full"/></label>
  <label className="block text-sm">Chave estável da execução (opcional)<input value={fingerprint} onChange={e=>setFingerprint(e.target.value)} className="workspace-input mt-1 w-full" placeholder="ex.: requisitos-v2-outubro"/></label>
  <button className="workspace-button-primary px-4 py-2" disabled={busy||!projectId} onClick={()=>void start()}>Criar execução controlada</button>
 </section>
 <section className="space-y-3">
  <label className="block text-sm">Nota/checkpoint<textarea className="workspace-input mt-1 w-full" rows={2} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label>
  {runs.map(run=><article key={run.id} className="rounded-xl border border-(--border) bg-white p-4 space-y-2">
   <div className="flex flex-wrap items-center justify-between"><strong>{run.status.toUpperCase()}</strong><span className="text-xs">Baseline v{run.baseline_version}</span></div>
   <p className="text-xs text-(--text-secondary)">Atualizado em {new Date(run.updated_at).toLocaleString("pt-BR")}</p>
   {run.checkpoint?.nota?<p className="text-sm">{run.checkpoint.nota}</p>:null}
   <div className="flex flex-wrap gap-2">{(available[run.status]||[]).map(next=><button key={next} className="workspace-button-secondary px-3 py-2 text-xs" disabled={busy} onClick={()=>void move(run,next)}>→ {next}</button>)}</div>
  </article>)}
  {status?<p role="status" className="rounded-lg border p-3 text-sm">{status}</p>:null}
 </section>
 </div>;
}
