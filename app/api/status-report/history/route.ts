import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getReportScope,loadReportData,ReportAudience} from "@/lib/scrum/report-data";
import {applyInternalReportSelection,parseInternalReportSelection} from "@/lib/reports/internal-report-selection";
export const dynamic="force-dynamic";
const res=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private,no-store"}});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(req:NextRequest){
 const auth=await requireApiAuth(req);if(!auth.ok)return auth.response;
 const projectId=req.nextUrl.searchParams.get("projectId")||"";
 const context=await getReportScope(auth.context,projectId);
 if("error" in context)return res({error:context.error},context.status);
 const id=req.nextUrl.searchParams.get("id");
 const internalAccess=["owner","editor"].includes(context.role);
 if(id&&!UUID.test(id))return res({error:"Identificador inválido."},400);
 const query=context.db.from("project_report_snapshots").select(id?"id,audience,period_mode,period_start,period_end,generated_by_email,created_at,report_data,narrative":"id,audience,period_mode,period_start,period_end,generated_by_email,created_at")
 .eq("project_id",projectId).eq("organization_id",context.organizationId);
 const scopedQuery=internalAccess?query:query.eq("audience","client");
 const r=id?await scopedQuery.eq("id",id).maybeSingle():await scopedQuery.order("created_at",{ascending:false}).limit(30);
 if(r.error)return res({error:"Falha ao consultar emissões."},503);
 if(!internalAccess){
  const redact=(record:Record<string,unknown>)=>{
   const snapshot=record.report_data as Record<string,unknown>|undefined;
   if(!snapshot)return {...record,generated_by_email:null};
   const kanban=(snapshot.kanban||{}) as Record<string,unknown>;
   const governance=(snapshot.governance||{}) as Record<string,unknown>;
   const scrum=(snapshot.scrum||{}) as Record<string,unknown>;
   const publicData={
    ...snapshot,internal:undefined,
    kanban:{...kanban,completed_titles:[]},
    governance:{...governance,client_risks:[],client_decisions:[]},
    scrum:{...scrum,sprints:[]}
   };
   // Old client snapshots may contain free-text narratives that were never
   // reviewed for public disclosure. Do not return them to read-only clients.
   return {...record,generated_by_email:null,report_data:publicData,narrative:{
    executiveSummary:"Resumo do período disponível apenas por indicadores registrados.",
    riskAnalysis:"Consultar riscos aprovados para divulgação.",
    nextSteps:"Confirmar marcos e compromissos com a gestão do projeto."
   }};
  };
  return res({data:Array.isArray(r.data)?r.data.map(item=>redact(item as unknown as Record<string,unknown>)):r.data?redact(r.data as unknown as Record<string,unknown>):null});
 }
 return res({data:r.data});
}
export async function POST(req:NextRequest){
 const auth=await requireApiAuth(req);if(!auth.ok)return auth.response;
 const body=await req.json().catch(()=>null) as Record<string,unknown>|null;
 if(!body||Array.isArray(body)||typeof body!=="object")return res({error:"Corpo inválido."},400);
 const projectId=String(body.projectId||"");
 const audience:ReportAudience=body.audience==="internal"?"internal":"client";
 if(body.audience!=="client"&&body.audience!=="internal")return res({error:"Público inválido."},400);
 const mode=body.mode==="period"?"period":"current";
 const start=String(body.start||""),end=String(body.end||"");
 if(mode==="period"&&(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end))return res({error:"Período inválido."},400);
 const selection=body.internalSelection===undefined?null:parseInternalReportSelection(body.internalSelection);
 if(audience==="internal"&&body.internalSelection!==undefined&&!selection)return res({error:"Seleção de conteúdo inválida."},400);
 if(audience==="client"&&body.internalSelection!==undefined)return res({error:"Seleção interna não permitida no relatório Cliente."},400);
 const clientFactIds=body.clientFactIds;
 if(audience==="client"&&clientFactIds!==undefined&&
   (!Array.isArray(clientFactIds)||clientFactIds.length>150||!clientFactIds.every((id:unknown)=>typeof id==="string"&&UUID.test(id))))
   return res({error:"Seleção pública inválida."},400);
 if(audience==="internal"&&clientFactIds!==undefined)return res({error:"Seleção de cliente inválida no relatório Equipe."},400);
 const context=await getReportScope(auth.context,projectId,true);
 if("error" in context)return res({error:context.error},context.status);
 // Recompute on the server. Never store user-supplied report content or unrestricted AI output.
 try{
  const rawReport=await loadReportData(context.db,context.organizationId,projectId,audience);
  const report=audience==="internal"&&selection?applyInternalReportSelection(rawReport,selection):rawReport;
  if(audience==="client"&&Array.isArray(clientFactIds)){
   const chosen=new Set(clientFactIds as string[]);
   // Approved facts ONLY. Do not accept free-text or internal records from the browser.
   report.publicFacts=(report.publicFacts||[]).filter(fact=>chosen.has(fact.id));
   const selectedRiskIds=new Set((rawReport.publicFacts||[]).filter(fact=>fact.kind==="risk"&&chosen.has(fact.id))
    .map(fact=>(fact.source_reference||"").replace(/^risk:/,"")));
   report.riskAssessments=(report.riskAssessments||[]).filter(risk=>selectedRiskIds.has(risk.id));
   report.governance.risks_open=report.riskAssessments.filter(risk=>["aberto","em_mitigacao"].includes(risk.status)).length;
  }
  if(audience==="internal"&&selection){
   // Resolve selected record IDs server-side. Titles are never trusted from the browser.
   const [decisionRows,cardRows]=await Promise.all([
    selection.decisions.length
     ?context.db.from("decisions").select("id,titulo").eq("project_id",projectId).eq("organization_id",context.organizationId).in("id",selection.decisions)
     :Promise.resolve({data:[],error:null}),
    selection.cards.length
     ?context.db.from("tasks").select("id,titulo").eq("project_id",projectId).eq("organization_id",context.organizationId).in("id",selection.cards)
     :Promise.resolve({data:[],error:null}),
   ]);
   if(decisionRows.error||cardRows.error)return res({error:"Registros selecionados indisponíveis."},503);
   const decisionNames=new Set((decisionRows.data||[]).map(row=>row.titulo));

   report.governance.client_decisions=report.governance.client_decisions.filter(row=>decisionNames.has(row.title));
   report.kanban.completed_titles=[]; // recomputed from selected, verified card IDs below
   const rows=cardRows.data||[];
   // The report is an editorial selection, so count only selected, verified cards.
   const statusRows=rows.length?await context.db.from("tasks").select("id,status,due_date").eq("project_id",projectId)
    .eq("organization_id",context.organizationId).in("id",rows.map(row=>row.id)):{data:[],error:null};
   if(statusRows.error)return res({error:"Não foi possível calcular as atividades selecionadas."},503);
   const cards=statusRows.data||[];
   report.kanban.total=cards.length;
   report.kanban.todo=cards.filter(card=>["aberta","todo","to_do"].includes(card.status)).length;
   report.kanban.doing=cards.filter(card=>["em_andamento","doing"].includes(card.status)).length;
   report.kanban.done=cards.filter(card=>["concluida","done"].includes(card.status)).length;
   report.kanban.completed_titles=cards.filter(card=>["concluida","done"].includes(card.status)).slice(0,12).map(card=>rows.find(row=>row.id===card.id)?.titulo||"").filter(Boolean);
   report.kanban.overdue=cards.filter(card=>card.due_date&&card.due_date<new Date().toISOString().slice(0,10)&&!["concluida","done"].includes(card.status)).length;
   report.governance.decisions_pending=report.governance.client_decisions.filter(row=>["aberta","em_andamento"].includes(row.status)).length;
  }
  const narrative=body.narrative&&typeof body.narrative==="object"&&!Array.isArray(body.narrative)?body.narrative as Record<string,unknown>:{};
  // A client snapshot must not accept an arbitrary narrative submitted by the
  // browser, since an editor could accidentally archive internal discussion
  // in an externally visible report. Public narratives are derived server-side.
  const safeNarrative=audience==="internal"?{
   executiveSummary:typeof narrative.executiveSummary==="string"?narrative.executiveSummary.slice(0,3000):"",
   riskAnalysis:typeof narrative.riskAnalysis==="string"?narrative.riskAnalysis.slice(0,3000):"",
   nextSteps:typeof narrative.nextSteps==="string"?narrative.nextSteps.slice(0,3000):""
  }:{
   executiveSummary:`O projeto possui ${report.kanban.total} registros de atividades, com ${report.kanban.done} marcados como concluídos no sistema. O aceite externo não foi comprovado por esses indicadores.`,
   riskAnalysis:`${report.governance.risks_open} riscos ativos constam nos registros autorizados. A ausência de registros não comprova ausência de riscos.`,
   nextSteps:"Os próximos passos constam exclusivamente das informações selecionadas e aprovadas para este relatório."
  };
  const created=await context.db.from("project_report_snapshots").insert({
   organization_id:context.organizationId,project_id:projectId,audience,
   period_mode:mode,period_start:mode==="period"?start:null,period_end:mode==="period"?end:null,
   generated_by:auth.context.userId,generated_by_email:auth.context.userEmail,
   report_data:report,narrative:safeNarrative
  }).select("id,created_at,audience").single();
  return created.error?res({error:"Não foi possível registrar a emissão."},503):res({data:created.data},201);
 }catch{return res({error:"Dados incompletos: relatório não registrado."},503)}
}
