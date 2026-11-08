"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { BRAND_LOGO_URL } from "@/lib/brand";
import type {ReportData,ReportAudience} from "@/lib/scrum/report-data";
import {safeMarkdownHtml} from "@/lib/safe-markdown-html";

type Project = { id:string; name:string; objective?:string; status?:string; clientName?:string|null };
type Card = { id:string; title:string; status:string; dueDate?:string|null; responsible?:string|null; columnKey:string };
type Board = { columns:Array<{key:string;cards:Card[]}> };
type Risk = {id:string;title:string;status:string;impact?:string|null;probability?:string|null;mitigation?:string|null;owner?:string|null};
type Decision = {id:string;title:string;status:string;impact?:string|null};

const htmlEscape = (value:unknown) => String(value ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
const css = `
.report-ai-text{font-size:13px;line-height:1.7;overflow-wrap:anywhere}
.report-ai-text p{margin:8px 0}
.report-ai-text h4{color:#103c65;font-weight:700;font-size:14px;margin:14px 0 6px;padding-left:9px;border-left:3px solid #027bbb}
.report-ai-text ul,.report-ai-text ol{margin:8px 0;padding-left:23px}
.report-ai-text li{padding:3px 0}
.report-ai-text strong{font-weight:700}

:root{font-family:Inter,'Segoe UI',Arial,sans-serif;color:#19334b;background:#f4f7fb;font-size:14px}*{box-sizing:border-box}body{margin:0}.wrap{max-width:1100px;margin:auto;padding:28px 20px 60px}.hero{background:white;border-radius:22px;padding:40px 38px;box-shadow:0 16px 36px #183e6020;position:relative;overflow:hidden}.hero:before{content:'';position:absolute;right:-130px;top:-190px;width:380px;height:380px;border:50px solid #f0f7fb;border-radius:50%;pointer-events:none}.top{display:flex;justify-content:space-between;gap:20px;align-items:start;position:relative}.logo{width:230px;max-width:55%;height:auto;object-fit:contain}.eyebrow{font-size:10px;font-weight:750;letter-spacing:2px;color:#027bbb;text-transform:uppercase}.topright{text-align:right;font-size:12px;color:#254867;font-weight:700}.rule{height:1px;background:#e1e9f0;margin:30px 0 26px}.hero h1{font-size:30px;font-weight:650;letter-spacing:-.7px;margin:8px 0 12px;color:#103c65}.desc{color:#536c85;font-size:14px;line-height:1.6}.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}.chip{border:1px solid #cfdce7;border-radius:7px;padding:8px 11px;background:#f8fbff;font-size:11px}.chip.warning{background:#fff0d6;color:#99610f;border-color:#fff0d6}.note{margin:20px 0;padding:14px 16px;border-radius:12px;background:#fff9e8;border:1px solid #f4d995;color:#835918;font-size:12px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:18px 0}.metric,.panel{background:white;border:1px solid #e1e8f1;border-radius:15px;padding:20px}.metric small{font-size:10px;color:#778da4;letter-spacing:.4px;text-transform:uppercase}.metric strong{font-size:36px;display:block;margin:20px 0 3px;font-weight:600;color:#173a59}.metric em{font-style:normal;font-size:11px;color:#778da4}.metric.green strong{color:#069775}.metric.amber strong{color:#ce861a}.grid{display:grid;grid-template-columns:1.1fr 1fr;gap:14px}.panel h2{font-size:17px;color:#173a59;font-weight:600;margin:5px 0 15px}.panel h3{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#7a92a6;margin:0}.panel p{color:#53687b;line-height:1.6}.bar{height:13px;background:#edf2f7;border-radius:20px;display:flex;overflow:hidden;margin:21px 0 15px}.bar>span{height:100%}.item{padding:12px 0;border-bottom:1px solid #ecf1f6;display:flex;justify-content:space-between;gap:15px}.item:last-child{border-bottom:0}.item span{color:#71879c;font-size:12px}.risk-tag{display:inline-block;font-size:10px;font-weight:700;border-radius:6px;background:#fff1d5;color:#8a5b12;padding:4px 6px;margin-right:5px}.empty{font-size:12px;color:#60788b;background:#f3f6fa;border-radius:9px;padding:15px}.foot{font-size:10px;color:#8498ad;display:flex;justify-content:space-between;border-top:1px solid #dce5ef;padding-top:16px;margin-top:22px}.actions{display:flex;justify-content:flex-end;margin:18px 0}.actions button{background:#19364d;color:white;border:0;border-radius:8px;padding:12px 16px;cursor:pointer}@media(max-width:750px){.wrap{padding:12px}.hero{padding:25px 20px}.logo{width:180px}.metrics{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}.hero h1{font-size:24px}}@media print{@page{size:A4;margin:12mm}body{background:white}.wrap{padding:0}.hero{box-shadow:none;border:1px solid #d9e4ed}.actions{display:none}.panel,.metric{break-inside:avoid}}
`;
type AiAnalysis = { executiveSummary:string; riskAnalysis:string; nextSteps:string };
type PeriodMetrics = { tasksCreated:number; risksRegistered:number; decisionsRegistered:number; activityEvents:number };
function reportDocument(project:Project, cards:Card[], risks:Risk[], decisions:Decision[], period:string, issueDate:string, analysis:AiAnalysis|null, periodEvents:number|null, periodMetrics:PeriodMetrics|null, audience:ReportAudience, scrum:ReportData|null) {
  const done=cards.filter(x=>x.columnKey==="done").length, doing=cards.filter(x=>x.columnKey==="doing").length, todo=cards.filter(x=>x.columnKey==="todo").length;
  const atRisk=risks.filter(x=>x.status==="aberto"||x.status==="em_mitigacao");
  const undecided=decisions.filter(x=>x.status==="aberta"||x.status==="em_andamento");
  const total=cards.length;
  const completed=cards.filter(x=>x.columnKey==="done").slice(0,10);
  const list=(rows:Array<{title:string;note:string}>,missing:string)=>rows.length?rows.map(x=>`<div class="item"><div>${htmlEscape(x.title)}</div><span>${htmlEscape(x.note)}</span></div>`).join(""):`<p class="empty">${missing}</p>`;
  const logo=htmlEscape(BRAND_LOGO_URL);
  const isInternal=audience==="internal";
  const scrumSection=scrum?.scrum.enabled?`
   <section class="panel" style="margin:16px 0"><h3>07 · Scrum</h3><h2>Panorama de Sprints</h2>
   <p class="empty">Indicadores calculados a partir do estado atual das US. Não representam a situação histórica do período escolhido.</p>
   <div class="metrics" style="margin:12px 0"><div class="metric"><small>SPRINTS</small><strong>${scrum.scrum.sprints.length}</strong></div>
   <div class="metric"><small>US NO BACKLOG</small><strong>${scrum.scrum.backlog_stories}</strong></div>
   <div class="metric"><small>TASKS CONCLUÍDAS</small><strong>${scrum.scrum.tasks_done}/${scrum.scrum.tasks_total}</strong></div></div>
   ${scrum.scrum.sprints.map(sp=>`<div class="item"><div><b>${htmlEscape(sp.name)}</b><p style="font-size:12px;margin:5px 0">Meta: ${htmlEscape(sp.goal||"Não definida")} · ${htmlEscape(sp.start_date)} a ${htmlEscape(sp.end_date)}</p><p style="font-size:12px;margin:5px 0">US: ${sp.closed}/${sp.stories} concluídas · Pontos: ${sp.points_done}/${sp.points_planned} · Atrasadas: ${sp.overdue} · Bloqueadas: ${sp.blocked}</p><p style="font-size:12px;margin:5px 0">Entregas realizadas: ${sp.delivery_actual}/${sp.delivery_planned} previstas · No prazo: ${sp.delivery_on_time} · Fora do prazo: ${sp.delivery_late}</p></div><span>${htmlEscape(sp.status)}</span></div>`).join("")}
   </section>`: "";
  const internalSection=isInternal&&scrum?.internal?`
   <section class="panel" style="margin:16px 0"><h3>08 · Operação interna</h3><h2>US, Tasks e impedimentos</h2>
   ${list(scrum.internal.stories.slice(0,35).map(st=>({title:st.title,note:st.workflow_stage.toUpperCase()+" · "+(st.responsible||"Sem responsável")+" · Prazo: "+(st.due_date||"Não definido")+(st.blocked?" · IMPEDIDA: "+st.blocker_reason:"")})),"Sem US cadastradas.")}
   <h2 style="margin-top:18px">Tasks de desenvolvimento</h2>
   ${list(scrum.internal.tasks.slice(0,35).map(t=>({title:t.title,note:t.state.toUpperCase()+" · "+(t.responsible||"Sem responsável")})),"Sem Tasks de desenvolvimento.")}
   </section>`: "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Status Report — ${htmlEscape(project.name)}</title><style>${css}</style></head><body><main class="wrap">
  <header class="hero"><div class="top"><img class="logo" src="${logo}" alt="Consult Services Tecnologia"><div class="topright">RELATÓRIO ${isInternal?"GERENCIAL":"EXECUTIVO"}<br><small style="font-weight:400">MODELO INSTITUCIONAL · V1.1</small></div></div><p class="eyebrow" style="margin-top:24px">TECNOLOGIA & INTELIGÊNCIA DE PROJETOS</p><div class="rule"></div><span class="eyebrow">PROJECT INTELLIGENCE · STATUS REPORT</span><h1>${htmlEscape(project.name)}</h1><p class="desc">${htmlEscape(project.objective||"Objetivo do projeto não registrado.")}</p><div class="chips"><span class="chip">Período: ${htmlEscape(period)}</span><span class="chip">Emitido: ${htmlEscape(issueDate)}</span><span class="chip">Público: ${isInternal?"Equipe interna":"Cliente"}</span><span class="chip warning">Riscos ativos: ${atRisk.length}</span></div></header>
  <div class="note">RELATÓRIO EXTRAÍDO DE DADOS CADASTRADOS. Contagens representam registros Kanban disponíveis no momento da geração, não o percentual físico de conclusão do projeto. Ausência de registros não comprova ausência de riscos ou impedimentos. O Kanban e a lista de riscos representam o estado atual, não um retrato retrospectivo. ${periodEvents===null?"Não há recorte temporal de eventos.":`Eventos registrados no período selecionado: ${periodEvents}. Esses eventos não equivalem a entregas concluídas.`}</div>
  <section class="metrics"><div class="metric"><small>ITENS NO QUADRO</small><strong>${total}</strong><em>Cards registrados</em></div><div class="metric green"><small>CONCLUÍDOS</small><strong>${done}</strong><em>Coluna DONE</em></div><div class="metric"><small>EM EXECUÇÃO</small><strong>${doing}</strong><em>WIP atual</em></div><div class="metric amber"><small>RISCOS ABERTOS</small><strong>${atRisk.length}</strong><em>Em aberto / mitigação</em></div></section>
  ${periodMetrics?`<section class="panel" style="margin-bottom:14px"><h3>Registros do período</h3><h2>Movimentação documentada</h2><div class="item">Atividades criadas <span>${periodMetrics.tasksCreated}</span></div><div class="item">Riscos registrados <span>${periodMetrics.risksRegistered}</span></div><div class="item">Decisões registradas <span>${periodMetrics.decisionsRegistered}</span></div><div class="item">Eventos de tarefas no histórico <span>${periodMetrics.activityEvents}</span></div><p class="empty">Datas filtram a criação de registros e os eventos registrados; situação de cartões, riscos e decisões é atual, não reconstrução histórica.</p></section>`:""}
  <div class="grid"><section class="panel"><h3>01 · Leitura gerencial</h3><h2>Resumo executivo</h2>${analysis?`<div class="report-ai-text">${safeMarkdownHtml(analysis.executiveSummary)}</div><p class="empty">Análise Kairos baseada nos registros autorizados. Os indicadores abaixo são apenas uma fotografia operacional.</p>`:`<p class="empty">Análise inteligente não disponível; somente leitura factual.</p>`}<p>O Kanban registra ${total} atividades, sendo ${done} concluídas, ${doing} em execução e ${todo} a fazer. Há ${atRisk.length} riscos abertos ou em mitigação e ${undecided.length} decisões não concluídas. O grau de avanço de escopo e tendências de prazo não podem ser inferidos apenas dessas contagens.</p><p><strong>Para decisão:</strong> revisar os riscos e decisões pendentes abaixo antes de assumir compromissos com o próximo ciclo.</p></section>
  <section class="panel"><h3>02 · Fluxo de trabalho</h3><h2>Distribuição das entregas</h2><div class="bar"><span style="width:${total?done/total*100:0}%;background:#11a47f"></span><span style="width:${total?doing/total*100:0}%;background:#4689d9"></span><span style="width:${total?todo/total*100:0}%;background:#e5a23f"></span></div><div class="item">Concluídas <span>${done} · ${total?Math.round(done/total*100):0}% dos cards</span></div><div class="item">Em andamento <span>${doing}</span></div><div class="item">A fazer <span>${todo}</span></div><p class="empty">Métricas históricas como throughput, lead time e cycle time não são inferidas deste retrato.</p></section>
  <section class="panel"><h3>03 · Entregas</h3><h2>Cards concluídos</h2>${list(completed.map(x=>({title:x.title,note:"Concluída"})),"Nenhum card em DONE.")}</section>
  <section class="panel"><h3>04 · Atenção</h3><h2>Riscos e impedimentos</h2>${analysis?`<div class="report-ai-text">${safeMarkdownHtml(analysis.riskAnalysis)}</div>`:`<p class="empty">Sem avaliação inteligente nesta emissão.</p>`}${atRisk.length?atRisk.map((x,i)=>{const details=(x.impact||"").split(/\s*Título:\s*/i);const riskTitle=details[1]?.trim()||x.title;return `<div class="item"><div><span class="risk-tag">RISCO ${i+1}</span> <strong>${htmlEscape(riskTitle)}</strong> <p style="margin:5px 0 0;font-size:12px"><b>Impacto:</b> ${htmlEscape(details[0]?.trim()||"Não informado")} · <b>Probabilidade:</b> ${htmlEscape(x.probability?.trim()||"Não informada")} · <b>Classificação:</b> ${htmlEscape(x.title)}</p>${x.mitigation?`<p style="margin:5px 0 0;font-size:12px">Mitigação: ${htmlEscape(x.mitigation)}</p>`:""}</div><span>${htmlEscape(x.status.replaceAll("_"," "))}${x.owner?" · "+htmlEscape(x.owner):""}</span></div>`}).join(""):`<p class="empty">Nenhum risco ativo registrado; validar cobertura do cadastro.</p>`}</section>
  <section class="panel"><h3>05 · Governança</h3><h2>Decisões necessárias</h2>${list(undecided.map(x=>({title:x.title,note:x.status})),"Nenhuma decisão pendente registrada.")}</section>
  <section class="panel"><h3>06 · Perspectiva</h3><h2>Próximos passos</h2>${analysis?`<div class="report-ai-text">${safeMarkdownHtml(analysis.nextSteps)}</div>`:`<p class="empty">Recomendações do Kairos indisponíveis; nenhuma conclusão automática foi produzida.</p>`}<p>[AUSENTE] Sem uma linha de base e série histórica confiáveis, não há previsão executiva de custo, prazo ou tendência.</p></section></div>
  ${scrumSection}${internalSection}
  <footer class="foot"><span>CONSULT SERVICES TECNOLOGIA · 7Commander / Kairos Executive Reporting</span><span>Registro gerado em ${htmlEscape(issueDate)}</span></footer>
  <div class="actions"><button onclick="window.print()">Salvar como PDF / Imprimir</button></div>
  </main></body></html>`;
}
function historicalDocument(data:ReportData,audience:ReportAudience,narrative:AiAnalysis|null,issued:string){
 const rows=data.scrum.sprints.map(sp=>'<div class="item"><div><b>'+htmlEscape(sp.name)+'</b><p>Período: '+htmlEscape(sp.start_date)+' a '+htmlEscape(sp.end_date)+'</p><p>US concluídas: '+sp.closed+'/'+sp.stories+' · Story points: '+sp.points_done+'/'+sp.points_planned+' · Atrasadas: '+sp.overdue+'</p></div><span>'+htmlEscape(sp.status)+'</span></div>').join("");
 const internal=audience==="internal"&&data.internal?'<section class="panel"><h2>Detalhamento interno</h2>'+data.internal.stories.map(st=>'<div class="item"><div>'+htmlEscape(st.title)+'</div><span>'+htmlEscape(st.workflow_stage)+' · '+htmlEscape(st.responsible||"Não atribuído")+'</span></div>').join("")+'</section>':"";
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Emissão arquivada · '+htmlEscape(data.project.name)+'</title><style>'+css+'</style></head><body><main class="wrap"><header class="hero"><h3>7COMMANDER · EMISSÃO ARQUIVADA</h3><h1>'+htmlEscape(data.project.name)+'</h1><p>'+htmlEscape(audience==="internal"?"Status Report Gerencial":"Status Report Executivo")+'</p><p>Emitido: '+htmlEscape(issued)+'</p></header><div class="note">Documento histórico. Os dados abaixo são aqueles preservados na emissão e não serão recalculados ao abrir este arquivo.</div><section class="metrics"><div class="metric"><small>ATIVIDADES</small><strong>'+data.kanban.total+'</strong></div><div class="metric"><small>CONCLUÍDAS</small><strong>'+data.kanban.done+'</strong></div><div class="metric"><small>RISCOS ATIVOS</small><strong>'+data.governance.risks_open+'</strong></div><div class="metric"><small>DECISÕES PENDENTES</small><strong>'+data.governance.decisions_pending+'</strong></div></section><section class="panel"><h2>Histórico das Sprints</h2>'+(rows||'<p>Projeto sem Sprints registradas.</p>')+'</section><section class="panel"><h2>Entregas operacionais</h2>'+data.kanban.completed_titles.map(t=>'<div class="item">'+htmlEscape(t)+'</div>').join("")+'</section><section class="panel"><h2>Riscos e decisões</h2>'+data.governance.client_risks.map(r=>'<div class="item">'+htmlEscape(r.title)+' · '+htmlEscape(r.status)+'</div>').join("")+data.governance.client_decisions.map(d=>'<div class="item">'+htmlEscape(d.title)+' · '+htmlEscape(d.status)+'</div>').join("")+'</section>'+(narrative?'<section class="panel"><h2>Leitura Kairos registrada</h2><p>'+htmlEscape(narrative.executiveSummary)+'</p><p>'+htmlEscape(narrative.riskAnalysis)+'</p><p>'+htmlEscape(narrative.nextSteps)+'</p></section>':"")+internal+'<footer class="foot">7Commander · Emissão registrada</footer><div class="actions"><button onclick="window.print()">Imprimir ou salvar PDF</button></div></main></body></html>';
}
export default function StatusReportPage() {
 const [projects,setProjects]=useState<Project[]>([]);
 const [projectId,setProjectId]=useState("");
 const [board,setBoard]=useState<Board|null>(null);
 const [audience,setAudience]=useState<ReportAudience>("client");
 const [scrumReport,setScrumReport]=useState<ReportData|null>(null);
 const [scrumStatus,setScrumStatus]=useState("Consultando indicadores do projeto...");
 const [history,setHistory]=useState<Array<{id:string;audience:string;created_at:string;generated_by_email:string|null}>>([]);
 const [historyId,setHistoryId]=useState("");
 const [historyData,setHistoryData]=useState<ReportData|null>(null);
 const [historyAudience,setHistoryAudience]=useState<ReportAudience>("client");
 const [historyNarrative,setHistoryNarrative]=useState<AiAnalysis|null>(null);
 const [historyIssued,setHistoryIssued]=useState("");
 const [issuing,setIssuing]=useState(false);
 const [risks,setRisks]=useState<Risk[]>([]);
 const [decisions,setDecisions]=useState<Decision[]>([]);
 const [status,setStatus]=useState("Selecione um projeto para gerar um relatório.");
 const [busy,setBusy]=useState(false);
 const [periodMode,setPeriodMode]=useState<"current"|"period">("current");
 const [start,setStart]=useState(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),"01"].join("-")});
 const [end,setEnd]=useState(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")});
 const [analysis,setAnalysis]=useState<AiAnalysis|null>(null);
 const [analysisStatus,setAnalysisStatus]=useState("Selecione um projeto para solicitar a análise do Kairos.");
 const [periodEvents,setPeriodEvents]=useState<number|null>(null);
 const [periodMetrics,setPeriodMetrics]=useState<PeriodMetrics|null>(null);
 const period=periodMode==="current"?"Situação atual":`${start} a ${end}`;
 useEffect(()=>{if(!projectId){setScrumReport(null);return}let live=true;setScrumReport(null);setScrumStatus("Consultando indicadores do projeto...");
  void fetch("/api/status-report/scrum?projectId="+encodeURIComponent(projectId)+"&audience="+audience,{headers:getClientAuthHeaders(),cache:"no-store"})
   .then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||"Consulta indisponível");if(live){setScrumReport(j.data);setScrumStatus("Indicadores operacionais consultados.")}})
   .catch(e=>{if(live)setScrumStatus(e instanceof Error?e.message:"Falha ao consultar Scrum.")});
  return()=>{live=false};
 },[projectId,audience]);
 useEffect(()=>{if(!projectId)return;let live=true;void fetch("/api/status-report/history?projectId="+encodeURIComponent(projectId),{headers:getClientAuthHeaders(),cache:"no-store"})
  .then(r=>r.json()).then(j=>{if(live)setHistory(j.data||[])}).catch(()=>{});return()=>{live=false};},[projectId]);
 useEffect(()=>{let mounted=true;void (async()=>{try{
  const res=await fetch("/api/projects",{headers:getClientAuthHeaders(),cache:"no-store"});if(!res.ok)throw Error("Sem acesso à lista de projetos.");
  const payload=await res.json();if(mounted){const projects=(payload.data??[]) as Project[];setProjects(projects);setProjectId(payload.meta?.activeProjectId??projects[0]?.id??"");}
 }catch(e){if(mounted)setStatus(e instanceof Error?e.message:"Falha ao carregar projetos.");}})();return()=>{mounted=false}},[]);
 useEffect(()=>{if(!projectId)return;let cancelled=false;void(async()=>{setBusy(true);setBoard(null);try{
   const endpoints=["tasks","risks","decisions"].map(x=>fetch(`/api/projects/${encodeURIComponent(projectId)}/${x}`,{headers:getClientAuthHeaders(),cache:"no-store"}));
   const responses=await Promise.all(endpoints);if(responses.some(x=>!x.ok))throw Error("Não foi possível consultar todos os registros do projeto. Relatório não gerado.");
   const payloads=await Promise.all(responses.map(x=>x.json()));if(cancelled)return;
   setBoard(payloads[0].data);setRisks(payloads[1].data??[]);setDecisions(payloads[2].data??[]);setStatus("Dados consultados; relatório pronto para exportação.");
  }catch(e){if(!cancelled)setStatus(e instanceof Error?e.message:"Erro ao consolidar dados.");}finally{if(!cancelled)setBusy(false);}})();return()=>{cancelled=true}},[projectId]);
 useEffect(()=>{if(!projectId){setAnalysis(null);setPeriodEvents(null);setPeriodMetrics(null);return;}if(periodMode==="period"&&(!start||!end||start>end)){setAnalysis(null);setAnalysisStatus("Corrija as datas do período.");return;}let cancelled=false;setAnalysis(null);setPeriodEvents(null);setPeriodMetrics(null);setAnalysisStatus("Kairos analisando os registros autorizados...");void(async()=>{try{const response=await fetch("/api/status-report/analysis",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({projectId,mode:periodMode,start,end,audience}),cache:"no-store"});const payload=await response.json();if(!response.ok)throw Error(payload.error||"Falha na análise.");if(!cancelled){setAnalysis(payload.data?.analysis??null);setPeriodEvents(payload.data?.periodEvents??null);setPeriodMetrics(payload.data?.periodMetrics??null);setAnalysisStatus(payload.data?.source==="ai"?"Análise Kairos gerada. Revise antes de enviar ao cliente.":payload.warning||"Análise de IA indisponível.");}}catch(e){if(!cancelled){setAnalysisStatus(e instanceof Error?e.message:"Falha na análise.");setAnalysis(null);}}})();return()=>{cancelled=true};},[projectId,periodMode,start,end,audience]);
 const project=projects.find(x=>x.id===projectId);
 const cards=useMemo(()=>board?.columns.flatMap(x=>x.cards)||[],[board]);
 const issueDate=new Date().toLocaleDateString("pt-BR");
 const documentHtml=project&&board&&scrumReport?reportDocument(project,cards,audience==="client"?risks.map(r=>({...r,owner:null,mitigation:null})):risks,decisions,period,issueDate,analysis,periodEvents,periodMetrics,audience,scrumReport):"";
 async function issue():Promise<string|null>{
  if(!projectId||!scrumReport||!documentHtml||issuing)return null;
  setIssuing(true);setStatus("Registrando emissão...");
  try{
   const r=await fetch("/api/status-report/history",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({projectId,audience,mode:periodMode,start,end,narrative:analysis}),cache:"no-store"});
   const j=await r.json();if(!r.ok)throw Error(j.error||"Falha ao registrar emissão.");
   setStatus("Emissão registrada no histórico: "+j.data.id);
   setHistory(h=>[j.data,...h]);setHistoryId(j.data.id);
   return j.data.id as string;
  }catch(e){setStatus(e instanceof Error?e.message:"Falha ao registrar emissão.");return null;}finally{setIssuing(false)}
 }
 async function openHistory(id:string){
  setHistoryId(id);setHistoryData(null);setHistoryNarrative(null);
  if(!id)return;
  try{const r=await fetch("/api/status-report/history?projectId="+encodeURIComponent(projectId)+"&id="+encodeURIComponent(id),{headers:getClientAuthHeaders(),cache:"no-store"});
  const j=await r.json();if(!r.ok)throw Error(j.error||"Emissão indisponível.");
  setHistoryData(j.data?.report_data||null);
  setHistoryAudience(j.data?.audience==="internal"?"internal":"client");
  setHistoryNarrative(j.data?.narrative||null);
  setHistoryIssued(j.data?.created_at||"");
  }catch(e){setStatus(e instanceof Error?e.message:"Falha ao consultar histórico.");}
 }
 async function exportHistory(){
  if(!historyData)return;
  const html=historicalDocument(historyData,historyAudience,historyNarrative,historyIssued);
  const blob=new Blob([html],{type:"text/html;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=url;link.download="status-report-arquivado-"+historyId+".html";link.click();URL.revokeObjectURL(url);
 }
 async function download(){if(!documentHtml||!project)return;const issuedId=await issue();if(!issuedId)return;let html=documentHtml;try {const image=await fetch("/api/status-report/logo",{headers:getClientAuthHeaders()});if(!image.ok)throw Error("Não foi possível incorporar a logo.");const {dataUri}=await image.json();if(typeof dataUri!=="string"||!dataUri.startsWith("data:image/"))throw Error("Logo indisponível.");html=html.replace(BRAND_LOGO_URL,dataUri);}catch{setStatus("Falha ao incorporar a logo. Exportação interrompida para evitar documento incompleto.");return;}const blob=new Blob([html],{type:"text/html;charset=utf-8"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`status-report-${project.id}-${new Date().toISOString().slice(0,10)}.html`;link.click();URL.revokeObjectURL(url);}
 return <main className="space-y-4">
 <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-(--text-secondary)">7Commander · Kairos</p><h1 className="text-2xl font-semibold">Status Report do Projeto</h1><p className="text-sm text-(--text-secondary)">Relatório executivo para cliente ou gerencial para equipe, com dados de Scrum e Kanban.</p></div><Link className="rounded-lg border border-(--border) px-3 py-2 text-sm" href="/projects">Voltar aos projetos</Link></header>
 <section className="grid gap-3 rounded-xl border border-(--border) bg-(--bg-surface) p-4 md:grid-cols-[2fr_1fr_auto]">
 <label className="text-sm">Projeto<select className="mt-1 block w-full rounded-lg border border-(--border) bg-(--bg-surface) px-3 py-2" value={projectId} onChange={e=>setProjectId(e.target.value)}>{projects.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
 <div className="text-sm"><label className="block">Período de referência<select className="mt-1 block w-full rounded-lg border border-(--border) bg-(--bg-surface) px-3 py-2" value={periodMode} onChange={e=>setPeriodMode(e.target.value==="period"?"period":"current")}><option value="current">Situação atual</option><option value="period">Período personalizado</option></select></label>{periodMode==="period"&&<div className="mt-2 grid grid-cols-2 gap-2"><label>Início<input type="date" className="mt-1 block w-full rounded border p-2" value={start} max={end} onChange={e=>setStart(e.target.value)}/></label><label>Fim<input type="date" className="mt-1 block w-full rounded border p-2" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></label></div>}</div>
 <button type="button" onClick={download} disabled={!documentHtml||busy} className="self-end rounded-lg bg-(--accent) px-4 py-2 text-sm text-white disabled:opacity-50">Baixar HTML</button>
 </section>
 <section className="grid gap-3 rounded-xl border border-(--border) bg-(--bg-surface) p-4 md:grid-cols-[1fr_auto]">
 <label className="text-sm">Tipo de relatório<select className="mt-1 block w-full rounded-lg border border-(--border) bg-(--bg-surface) px-3 py-2" value={audience} onChange={e=>setAudience(e.target.value==="internal"?"internal":"client")}><option value="client">Executivo · Cliente</option><option value="internal">Gerencial · Equipe interna</option></select></label>
 <button type="button" className="self-end rounded-lg bg-(--accent) px-4 py-2 text-sm text-white disabled:opacity-50" disabled={!documentHtml||issuing} onClick={()=>void issue()}>{issuing?"Registrando...":"Registrar emissão no histórico"}</button>
 </section>
 <p role="status" className="text-xs text-(--text-secondary)">{scrumStatus}</p>
 <section className="rounded-xl border border-(--border) bg-(--bg-surface) p-4"><h2 className="font-semibold">Histórico de emissões</h2><p className="mt-1 text-xs text-(--text-secondary)">Os indicadores são preservados no momento da emissão. A visualização histórica abaixo resume o snapshot armazenado.</p>
 <select aria-label="Consultar emissão" className="mt-2 w-full rounded border border-(--border) p-2 text-sm" value={historyId} onChange={e=>void openHistory(e.target.value)}><option value="">Selecione uma emissão anterior</option>{history.map(h=><option value={h.id} key={h.id}>{new Date(h.created_at).toLocaleString("pt-BR")} · {h.audience==="client"?"Cliente":"Interno"} · {h.generated_by_email||"Usuário"}</option>)}</select>
 {historyData&&<div className="mt-3 rounded-lg bg-(--bg-muted) p-3 text-sm"><p><b>Projeto:</b> {historyData.project.name} · <b>Emitido:</b> {new Date(historyData.generated_at).toLocaleString("pt-BR")}</p><p><b>Kanban:</b> {historyData.kanban.done} concluídas de {historyData.kanban.total} atividades</p><p><b>Sprints:</b> {historyData.scrum.sprints.length} · <b>US:</b> {historyData.scrum.stories_total} · <b>Tasks concluídas:</b> {historyData.scrum.tasks_done}/{historyData.scrum.tasks_total}</p><button type="button" onClick={()=>void exportHistory()} className="workspace-button-secondary mt-3 rounded-lg px-3 py-2 text-sm">Exportar emissão arquivada</button></div>}
 </section>
 <p role="status" className="text-sm text-(--text-secondary)">{busy?"Consolidando dados...":status}</p><p role="status" className="text-sm text-(--text-secondary)">{analysisStatus}</p>
 {documentHtml?<iframe title="Prévia do Status Report" srcDoc={documentHtml} sandbox="allow-scripts" className="h-[900px] w-full rounded-xl border border-(--border) bg-white"/>:<div className="rounded-xl border border-(--border) p-10 text-center text-sm">Nenhuma prévia disponível.</div>}
 <p className="text-xs text-(--text-secondary)">O download registra automaticamente uma emissão no histórico. Revise as informações antes de compartilhar o HTML com o cliente, pois ele conterá os registros autorizados. A logo é incorporada ao HTML durante o download, permitindo abertura offline.</p>
 </main>
}
