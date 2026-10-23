"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {getClientAuthHeaders} from "@/lib/client-auth";
type P={id:string;name:string};type R={id:string;title:string};
type Row={id:string;requirement_id:string;alternative_id:string;status:string;verified:boolean;justification:string;evidence_url:string|null};
const options=["desconhecido","atende","parcial","nao_atende"] as const;
export default function CoveragePage(){
 const[projects,setProjects]=useState<P[]>([]),[projectId,setProjectId]=useState("");
 const[requirements,setRequirements]=useState<R[]>([]),[alternatives,setAlternatives]=useState<R[]>([]);
 const[rows,setRows]=useState<Row[]>([]),[requirementId,setRequirementId]=useState(""),[alternativeId,setAlternativeId]=useState("");
 const[coverage,setCoverage]=useState<string>("desconhecido"),[justification,setJustification]=useState(""),[evidenceUrl,setEvidenceUrl]=useState("");
 const[verified,setVerified]=useState(false),[score,setScore]=useState<number|null>(null),[status,setStatus]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{void(async()=>{const r=await fetch("/api/projects",{headers:getClientAuthHeaders()});if(!r.ok)return;const j=await r.json();setProjects(j.data??[])})()},[]);
 useEffect(()=>{if(!projectId){setRows([]);return;}let active=true;void(async()=>{try{
  const make=(kind:string)=>fetch("/api/planning?kind="+kind+"&projectId="+projectId,{headers:getClientAuthHeaders(),cache:"no-store"}).then(r=>r.json());
  const [r,a,c]=await Promise.all([make("requirement"),make("research"),fetch("/api/planning/coverage?projectId="+projectId,{headers:getClientAuthHeaders(),cache:"no-store"}).then(r=>r.json())]);
  if(!active)return;if(c.error)throw Error(c.error);setRequirements(r.data||[]);setAlternatives(a.data||[]);setRows(c.data||[]);setScore(c.meta?.score??null);
 }catch(e){if(active)setStatus(e instanceof Error?e.message:"Falha ao consultar")}})();return()=>{active=false}},[projectId]);
 async function save(){if(!projectId||!requirementId||!alternativeId){setStatus("Selecione projeto, requisito e alternativa.");return;}
 setBusy(true);setStatus("Salvando a matriz...");try{
 const res=await fetch("/api/planning/coverage",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
 body:JSON.stringify({projectId,requirementId,alternativeId,status:coverage,justification,evidenceUrl,verified})});
 const j=await res.json();if(!res.ok)throw Error(j.error||"Falha ao salvar");
 const fresh=await fetch("/api/planning/coverage?projectId="+projectId,{headers:getClientAuthHeaders(),cache:"no-store"}).then(x=>x.json());
 setRows(fresh.data||[]);setScore(fresh.meta?.score??null);setStatus("Relação registrada. Verifique a cobertura e as fontes antes de decidir.");
 }catch(e){setStatus(e instanceof Error?e.message:"Erro de gravação")}finally{setBusy(false)}}
 const names=new Map([...requirements,...alternatives].map(x=>[x.id,x.title]));
 return <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
 <Link href="/planning" className="text-sm underline">← Planejamento</Link>
 <h1 className="text-2xl font-semibold">Matriz de aderência</h1>
 <p className="text-sm text-(--text-secondary)">Compare cada requisito com uma alternativa pesquisada. Marque evidências como verificadas somente após avaliação humana.</p>
 <section className="rounded-xl border border-(--border) bg-white p-4 space-y-3">
  <label className="block text-sm">Projeto<select className="workspace-select mt-1 w-full" value={projectId} onChange={e=>setProjectId(e.target.value)}>
  <option value="">Selecione</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  <div className="grid gap-3 md:grid-cols-2">
   <label className="block text-sm">Requisito<select className="workspace-select mt-1 w-full" value={requirementId} onChange={e=>setRequirementId(e.target.value)}>
    <option value="">Selecione</option>{requirements.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
   <label className="block text-sm">Alternativa<select className="workspace-select mt-1 w-full" value={alternativeId} onChange={e=>setAlternativeId(e.target.value)}>
    <option value="">Selecione</option>{alternatives.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label>
  </div>
  <label className="block text-sm">Aderência<select className="workspace-select mt-1 w-full" value={coverage} onChange={e=>setCoverage(e.target.value)}>
   {options.map(o=><option key={o} value={o}>{o}</option>)}</select></label>
  <label className="block text-sm">Justificativa<textarea rows={3} className="workspace-input mt-1 w-full" value={justification} onChange={e=>setJustification(e.target.value)}/></label>
  <label className="block text-sm">URL da evidência<input className="workspace-input mt-1 w-full" placeholder="https://" value={evidenceUrl} onChange={e=>setEvidenceUrl(e.target.value)}/></label>
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/> Evidência conferida manualmente</label>
  <button className="workspace-button-primary px-4 py-2" disabled={busy} onClick={()=>void save()}>{busy?"Salvando...":"Registrar aderência"}</button>
  {status?<p role="status" className="rounded-lg border p-3 text-sm">{status}</p>:null}
 </section>
 <section className="rounded-xl border border-(--border) bg-white p-4">
  <h2 className="font-semibold">Cobertura documentada</h2>
  <p className="mt-1 text-sm">{score===null?"Sem pontuação verificada":`Pontuação entre relações verificadas: ${score}%`}</p>
  <p className="text-xs text-(--text-secondary)">A pontuação não representa cobertura total: itens não verificados ficam fora do cálculo.</p>
  <div className="mt-3 space-y-2">{rows.map(row=><article key={row.id} className="rounded-lg border border-(--border) p-3">
   <strong className="text-sm">{names.get(row.requirement_id)||"Requisito"}</strong>
   <span className="text-sm"> → {names.get(row.alternative_id)||"Alternativa"}</span>
   <p className="text-xs">{row.status} · {row.verified?"Verificada":"Não verificada"}</p>
   <p className="text-sm text-(--text-secondary)">{row.justification}</p>
  </article>)}</div>
 </section>
 </main>;
}
