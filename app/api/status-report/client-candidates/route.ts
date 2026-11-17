import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getReportScope} from "@/lib/scrum/report-data";
import {getClientReportCandidates} from "@/lib/reports/client-report-candidates";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const auth=await requireApiAuth(req);if(!auth.ok)return auth.response;
 const projectId=req.nextUrl.searchParams.get("projectId")||"";
 const scope=await getReportScope(auth.context,projectId,true);
 if("error" in scope)return NextResponse.json({error:scope.error},{status:scope.status});
 try{return NextResponse.json({data:await getClientReportCandidates(scope.db,scope.organizationId,projectId,auth.context)},{headers:{"Cache-Control":"private,no-store"}})}
 catch{return NextResponse.json({error:"Conteúdo do Cliente indisponível."},{status:503})}
}
