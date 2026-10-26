"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {getClientAuthHeaders} from "@/lib/client-auth";
type P={id:string;name:string};
type R={id:string;title:string;status:string};
export default function BacklogPage(){
 const[projects,setProjects]=useState<P[]>([]),[projectId,setProjectId]=useState("");
 const[decisions,setDecisions]=useState<R[]>([]),[requirements,setRequirements]=useState<R[]>([]);
 const[decisionId,setDecisionId]=useState(""),[requirementId,setRequirementId]=useState("");
 const[busy,setBusy]=useState(false),[status,setStatus]=useState("");
 useEffect(()=>{void(async()=>{const r=await fetch("/api/projects",{headers:getClientAuthHeaders()});if(!r.ok)return;const j=await r.json();setProjects(j.data??[])})()},[]);
 useEffect(()=>{let alive=true;setDecisionId("");setRequirementId("");setRequirements([]);setDecisions([]);
 if(!projectId)return;void(async()=>{try{
  const query=(kind:string)=>fetch(`/api/planning?kind=${kind}&projectId=${encodeURIComponent(projectId)}`,{headers:getClientAuthHeaders()}).then(r=>r.json());
  const [d,r]=await Promise.all([query("decision_gate"),query("requirement")]);
  if(alive){setDecisions((d.data||[]).filter((x:R)=>x.status==="approved"));setRequirements((r.data||[]).filter((x:R)=>x.status==="approved"));}
 }catch{if(alive)setStatus("Não foi possível consultar aprovações.")}})();
 return()=>{alive=false}},[projectId]);
 async function submit(){if(!projectId||!decisionId||!requirementId){setStatus("Escolha projeto, decisão e requisito aprovados.");return;}
 if(!window.confirm("Criar tarefa no Kanban a partir do requisito e da decisão aprovados? A ação poderá ser repetida sem duplicar o card."))return;
 setBusy(true);setStatus("Criando tarefa...");
 try{
  const response=await fetch("/api/planning/backlog",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
  body:JSON.stringify({projectId,decisionId,requirementId})});const json=await response.json();
  if(!response.ok)throw Error(json.error||"Falha ao criar backlog");
  setStatus(json.alreadyCreated?"A atividade já existe. Não foi criada duplicata.":"Atividade criada no Kanban com vínculo de origem.");
 }catch(e){setStatus(e instanceof Error?e.message:"Falha de gravação");}finally{setBusy(false)}
 }
 return <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
  <Link className="text-sm underline" href="/planning">← Planejamento</Link>
  <h1 className="text-2xl font-semibold">Gerar backlog aprovado</h1>
  <p className="text-sm text-(--text-secondary)">Somente a partir de requisitos e decisões já aprovados pela gestão. Nenhuma tarefa é criada automaticamente pelo Kairos.</p>
  <section className="rounded-xl border border-(--border) bg-white p-4 space-y-3">
   <label className="block text-sm">Projeto<select className="workspace-select mt-1 w-full" value={projectId} onChange={e=>setProjectId(e.target.value)}>
    <option value="">Selecione um projeto</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
   </select></label>
   <label className="block text-sm">Decisão aprovada<select className="workspace-select mt-1 w-full" value={decisionId} onChange={e=>setDecisionId(e.target.value)}>
    <option value="">Selecione uma decisão</option>{decisions.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
   </select></label>
   <label className="block text-sm">Requisito aprovado<select className="workspace-select mt-1 w-full" value={requirementId} onChange={e=>setRequirementId(e.target.value)}>
    <option value="">Selecione um requisito</option>{requirements.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}
   </select></label>
   <button disabled={busy||!decisionId||!requirementId} className="workspace-button-primary px-4 py-2" onClick={()=>void submit()}>{busy?"Criando...":"Gerar atividade no Kanban"}</button>
   {status?<p role="status" aria-live="polite" className="rounded-lg border p-3 text-sm">{status}</p>:null}
  </section>
 </main>;
}
