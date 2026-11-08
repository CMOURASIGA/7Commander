"use client";
import {useEffect,useState} from "react";
import {getClientAuthHeaders} from "@/lib/client-auth";
import {useKairosPanel} from "@/components/kairos/kairos-context";
import {MarkdownContent} from "@/components/ui/markdown-content";
type Mode="health"|"planning"|"daily"|"review"|"retrospective";
const modes:{id:Mode;name:string;help:string}[]=[
 {id:"health",name:"Saúde da Sprint",help:"Riscos, atrasos, impedimentos e prioridades"},
 {id:"planning",name:"Planejamento",help:"US, estimativas e viabilidade da Sprint"},
 {id:"daily",name:"Preparar Daily",help:"Trabalho em andamento e questões para a reunião"},
 {id:"review",name:"Preparar Review",help:"Entregas, aceite e rejeições"},
 {id:"retrospective",name:"Retrospectiva",help:"Aprendizados e melhorias com base nos registros"}
];
export function ScrumKairosActions({projectId,sprintId,compact=false,sprints=[]}:{projectId:string;sprintId?:string;compact?:boolean;sprints?:Array<{id:string;name:string;status:string}>}){
 const [chosenSprint,setChosenSprint]=useState("");
 const effectiveSprintId=sprintId||chosenSprint;
 useEffect(()=>{setChosenSprint("")},[projectId]);
 const {openPanel}=useKairosPanel();
 const [mode,setMode]=useState<Mode>("health");
 const [loading,setLoading]=useState(false);
 const [analysis,setAnalysis]=useState("");
 const [source,setSource]=useState("");
 const [error,setError]=useState("");
 async function analyze(){
  if(!projectId||loading)return;
  setLoading(true);setError("");setAnalysis("");setSource("");
  try{
   const response=await fetch("/api/scrum/kairos-insights",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({projectId,sprintId:effectiveSprintId||undefined,mode}),cache:"no-store"});
   const payload=await response.json();if(!response.ok)throw Error(payload.error||"Análise indisponível.");
   if(payload.data?.source==="ai"&&payload.data.analysis){setAnalysis(payload.data.analysis);setSource("Kairos · análise contextual");}
   else{setError(payload.warning||"Kairos indisponível no momento.");}
  }catch(e){setError(e instanceof Error?e.message:"Falha na análise.");}finally{setLoading(false)}
 }
 return <section className="rounded-xl border border-(--border) bg-(--bg-surface) p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Kairos no Scrum</h2><p className="text-xs text-(--text-secondary)">Análises com dados autorizados do projeto. Sugestões não executam alterações.</p></div><button className="workspace-button-secondary rounded-lg px-3 py-2 text-xs" disabled={!projectId} onClick={()=>openPanel({projectId,seedMessage:"Ajude-me a interpretar a situação do Scrum e as decisões do projeto. Não altere dados sem meu consentimento."})}>Conversar com Kairos</button></div>
  {!sprintId&&<label className="mt-3 block text-xs">Sprint para análise
    <select className="workspace-select mt-1 w-full" value={chosenSprint} onChange={e=>{setChosenSprint(e.target.value);setAnalysis("");setError("")}}>
      <option value="">Selecione uma Sprint</option>
      {sprints.map(s=><option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
    </select>
    {!chosenSprint&&<span className="mt-1 block text-(--text-secondary)">Selecione uma Sprint para analisar saúde, Daily, Review ou retrospectiva. Planejamento pode analisar o backlog sem Sprint.</span>}
   </label>}
  <div className="mt-3 flex flex-wrap items-end gap-2"><label className="min-w-[210px] flex-1 text-xs">Tipo de análise<select className="workspace-select mt-1 w-full" value={mode} onChange={e=>setMode(e.target.value as Mode)}>{modes.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><button className="workspace-button-primary rounded-lg px-4 py-2 text-xs" disabled={!projectId||loading||(!effectiveSprintId&&mode!=="planning")} onClick={()=>void analyze()}>{loading?"Analisando...":"Analisar com Kairos"}</button></div>
  {!compact&&<p className="mt-2 text-xs text-(--text-secondary)">{modes.find(m=>m.id===mode)?.help}</p>}
  {error&&<p role="alert" className="mt-3 text-xs text-(--danger)">{error}</p>}
  {analysis&&<div className="mt-3 rounded-lg bg-(--bg-muted) p-3"><p className="text-xs font-semibold">{source}</p><MarkdownContent content={analysis} className="mt-3 kairos-analysis-markdown"/><button className="workspace-button-secondary mt-3 rounded-lg px-3 py-2 text-xs" onClick={()=>openPanel({projectId,seedMessage:"Quero aprofundar esta análise Scrum, conferindo as evidências e ações sugeridas:\n"+analysis.slice(0,2800)})}>Discutir análise no Kairos</button></div>}
 </section>;
}
