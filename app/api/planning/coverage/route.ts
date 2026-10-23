import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {CONSULT_ORG_ID,consultMemberRole} from "@/lib/consult-workspace";
import {getProjectAccessRole} from "@/services/project-service";
export const dynamic="force-dynamic";
const STATES=["atende","parcial","nao_atende","desconhecido"] as const;
function failure(error:string,status=400){return NextResponse.json({error},{status});}
async function authProject(req:NextRequest,projectId:string,write:boolean){
 const auth=await requireApiAuth(req);if(!auth.ok)return {response:auth.response};
 const role=await consultMemberRole(auth.context.userId);
 if(auth.context.authMode!=="supabase"||!role)return {response:failure("Sem acesso à organização",403)};
 if(write&&role==="member")return {response:failure("Sem permissão de edição",403)};
 const access=await getProjectAccessRole({userId:auth.context.userId,userEmail:auth.context.userEmail,projectId});
 if(access==="none"||(write&&access==="viewer"))return {response:failure("Sem acesso ao projeto",403)};
 const db=getSupabaseServerClient();if(!db)return {response:failure("Banco indisponível",503)};
 return {db,user:auth.context};
}
export async function GET(req:NextRequest){
 const projectId=req.nextUrl.searchParams.get("projectId");if(!projectId)return failure("Informe o projeto");
 const c=await authProject(req,projectId,false);if("response"in c)return c.response!;
 const result=await c.db!.from("commander_coverage_matrix")
 .select("id,requirement_id,alternative_id,status,justification,evidence_url,evidence_checked_at,verified,updated_at")
 .eq("project_id",projectId).eq("organization_id",CONSULT_ORG_ID).limit(500);
 if(result.error)return failure("Erro ao consultar matriz ou migration 051 pendente",503);
 const rows=result.data??[];
 const scored=rows.filter(r=>r.verified&&r.status!=="desconhecido");
 const weight:Record<string,number>={atende:1,parcial:0.5,nao_atende:0};
 const score=scored.length?Math.round(100*scored.reduce((v,r)=>v+(weight[r.status]||0),0)/scored.length):null;
 return NextResponse.json({data:rows,meta:{items:rows.length,verified:scored.length,unverified:rows.length-scored.length,score,
  warning:"Score considera apenas relações verificadas. Não equivale à cobertura integral dos requisitos."}},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:NextRequest){
 const b=await req.json().catch(()=>null);
 if(!b?.projectId||!b?.requirementId||!b?.alternativeId||!STATES.includes(b.status))return failure("Projeto, requisito, alternativa e status são obrigatórios");
 const c=await authProject(req,b.projectId,true);if("response"in c)return c.response!;
 const records=await c.db!.from("commander_planning_records").select("id,kind,project_id").eq("organization_id",CONSULT_ORG_ID).in("id",[b.requirementId,b.alternativeId]);
 if(records.error||records.data?.length!==2)return failure("Registros de referência não encontrados",404);
 const requirement=records.data.find(r=>r.id===b.requirementId);
 const alternative=records.data.find(r=>r.id===b.alternativeId);
 if(requirement?.kind!=="requirement"||requirement.project_id!==b.projectId||
    alternative?.kind!=="research"||alternative.project_id!==b.projectId)return failure("Requisito ou alternativa fora do projeto",403);
 const evidence=typeof b.evidenceUrl==="string"&&/^https:\/\//i.test(b.evidenceUrl)?b.evidenceUrl.slice(0,2000):null;
 if(b.verified&&!evidence)return failure("Evidência verificável (HTTPS) obrigatória para pontuar.");
 const row={organization_id:CONSULT_ORG_ID,project_id:b.projectId,requirement_id:b.requirementId,
 alternative_id:b.alternativeId,status:b.status,justification:typeof b.justification==="string"?b.justification.slice(0,4000):"",
 evidence_url:evidence,evidence_checked_at:b.verified?new Date().toISOString():null,verified:Boolean(b.verified),
 created_by:c.user!.userId,updated_by:c.user!.userId,updated_at:new Date().toISOString()};
 const saved=await c.db!.from("commander_coverage_matrix").upsert(row,{onConflict:"organization_id,project_id,requirement_id,alternative_id"})
 .select("id").single();
 if(saved.error)return failure("Falha ao salvar matriz",503);
 return NextResponse.json({data:saved.data});
}
