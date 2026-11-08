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
 if(id&&!UUID.test(id))return res({error:"Identificador inválido."},400);
 const query=context.db.from("project_report_snapshots").select(id?"id,audience,period_mode,period_start,period_end,generated_by_email,created_at,report_data,narrative":"id,audience,period_mode,period_start,period_end,generated_by_email,created_at")
 .eq("project_id",projectId).eq("organization_id",context.organizationId);
 const r=id?await query.eq("id",id).maybeSingle():await query.order("created_at",{ascending:false}).limit(30);
 return r.error?res({error:"Falha ao consultar emissões."},503):res({data:r.data});
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
  const safeNarrative={
   executiveSummary:typeof narrative.executiveSummary==="string"?narrative.executiveSummary.slice(0,3000):"",
   riskAnalysis:typeof narrative.riskAnalysis==="string"?narrative.riskAnalysis.slice(0,3000):"",
   nextSteps:typeof narrative.nextSteps==="string"?narrative.nextSteps.slice(0,3000):""
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
