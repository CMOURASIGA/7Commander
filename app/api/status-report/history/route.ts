import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getReportScope,loadReportData,ReportAudience} from "@/lib/scrum/report-data";
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
 const context=await getReportScope(auth.context,projectId,true);
 if("error" in context)return res({error:context.error},context.status);
 // Recompute on the server. Never store user-supplied report content or unrestricted AI output.
 try{
  const report=await loadReportData(context.db,context.organizationId,projectId,audience);
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
   nextSteps:"Confirmar com a gestão do projeto os próximos marcos, responsáveis, prazos acordados e compromissos antes de comunicá-los como definitivos."
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
