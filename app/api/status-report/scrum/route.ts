import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getReportScope,loadReportData,ReportAudience} from "@/lib/scrum/report-data";
export const dynamic="force-dynamic";
const out=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private,no-store"}});
export async function GET(req:NextRequest){
 const auth=await requireApiAuth(req);if(!auth.ok)return auth.response;
 const projectId=req.nextUrl.searchParams.get("projectId")||"";
 const audience:ReportAudience=req.nextUrl.searchParams.get("audience")==="internal"?"internal":"client";
 const context=await getReportScope(auth.context,projectId);
 if("error" in context)return out({error:context.error},context.status);
 if(audience==="internal"&&!["owner","editor"].includes(context.role))return out({error:"Relatório interno restrito."},403);
 try{return out({data:await loadReportData(context.db,context.organizationId,projectId,audience)})}
 catch{return out({error:"Dados de Scrum e Kanban indisponíveis; relatório não gerado."},503)}
}
