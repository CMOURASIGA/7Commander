import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {CONSULT_ORG_ID,consultMemberRole} from "@/lib/consult-workspace";
import {getProjectAccessRole} from "@/services/project-service";
export const dynamic="force-dynamic";
const next:Record<string,string[]>={
 iniciada:["requisitos","pausada","cancelada"],
 requisitos:["pesquisa","matriz","pausada","falhou","cancelada"],
 pesquisa:["matriz","pausada","falhou","cancelada"],
 matriz:["revisao","pausada","falhou","cancelada"],
 revisao:["aprovada","rejeitada","matriz","pausada","cancelada"],
 pausada:["requisitos","pesquisa","matriz","revisao","cancelada"],
 falhou:["requisitos","pesquisa","matriz","cancelada"],
 aprovada:[],rejeitada:[],cancelada:[]
};
function fail(error:string,status=400){return NextResponse.json({error},{status});}
async function access(req:NextRequest,projectId:string){
 const auth=await requireApiAuth(req);if(!auth.ok)return {response:auth.response};
 if(auth.context.authMode!=="supabase")return {response:fail("JWT requerido",403)};
 const role=await consultMemberRole(auth.context.userId);if(!role)return {response:fail("Sem vínculo na organização",403)};
 const projectRole=await getProjectAccessRole({userId:auth.context.userId,userEmail:auth.context.userEmail,projectId});
 if(!["owner","editor"].includes(projectRole))return {response:fail("Sem acesso editorial a este projeto",403)};
 const db=getSupabaseServerClient();if(!db)return {response:fail("Banco indisponível",503)};
 return {db,user:auth.context,role};
}
export async function GET(req:NextRequest){
 const projectId=req.nextUrl.searchParams.get("projectId")||"";if(!projectId)return fail("Projeto obrigatório");
 const c=await access(req,projectId);if("response"in c)return c.response!;
 const result=await c.db!.from("commander_analysis_runs").select("id,project_id,status,checkpoint,baseline_version,input_fingerprint,updated_at")
 .eq("project_id",projectId).eq("organization_id",CONSULT_ORG_ID).order("updated_at",{ascending:false}).limit(30);
 if(result.error)return fail("Falha na consulta. Verifique migration 050.",503);
 return NextResponse.json({data:result.data??[]},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>null);if(!body?.projectId||!Number.isInteger(body.baselineVersion)||body.baselineVersion<1)return fail("Projeto e versão baseline obrigatórios");
 const c=await access(req,body.projectId);if("response"in c)return c.response!;
 const input=String(body.fingerprint||"");
 if(!/^[a-zA-Z0-9:_-]{10,120}$/.test(input))return fail("Identificador estável de entrada inválido");
 const existing=await c.db!.from("commander_analysis_runs").select("*").eq("project_id",body.projectId)
 .eq("organization_id",CONSULT_ORG_ID).eq("input_fingerprint",input).maybeSingle();
 if(existing.error)return fail("Erro ao conferir idempotência",503);
 if(existing.data)return NextResponse.json({data:existing.data,alreadyExists:true});
 const created=await c.db!.from("commander_analysis_runs").insert({
 organization_id:CONSULT_ORG_ID,project_id:body.projectId,baseline_version:body.baselineVersion,
 input_fingerprint:input,status:"iniciada",created_by:c.user!.userId,updated_by:c.user!.userId
 }).select("*").single();
 if(created.error)return fail("Não foi possível iniciar análise. Pode existir outra execução para este identificador.",409);
 return NextResponse.json({data:created.data},{status:201});
}
export async function PATCH(req:NextRequest){
 const body=await req.json().catch(()=>null);
 if(!body?.id||!body?.projectId||typeof body.status!=="string")return fail("Execução, projeto e estado obrigatórios");
 const c=await access(req,body.projectId);if("response"in c)return c.response!;
 const current=await c.db!.from("commander_analysis_runs").select("*")
 .eq("id",body.id).eq("project_id",body.projectId).eq("organization_id",CONSULT_ORG_ID).maybeSingle();
 if(current.error||!current.data)return fail("Execução não encontrada",404);
 if(!next[current.data.status]?.includes(body.status))return fail("Transição de etapa não permitida",409);
 if(body.status==="aprovada"&&!["owner","admin","manager"].includes(c.role!))return fail("Aprovação exige gestão",403);
 const checkpoint=body.checkpoint&&typeof body.checkpoint==="object"&&!Array.isArray(body.checkpoint)
 ?Object.fromEntries(Object.entries(body.checkpoint as Record<string,unknown>).filter(([k,v])=>/^[a-zA-Z0-9_]{1,50}$/.test(k)&&typeof v==="string").map(([k,v])=>[k,String(v).slice(0,2000)])):{};
 const updated=await c.db!.from("commander_analysis_runs").update({
 status:body.status,checkpoint,updated_by:c.user!.userId,updated_at:new Date().toISOString()
 }).eq("id",body.id).eq("status",current.data.status).select("*").maybeSingle();
 if(updated.error)return fail("Erro de atualização",503);
 if(!updated.data)return fail("A etapa foi alterada por outra sessão. Atualize.",409);
 return NextResponse.json({data:updated.data});
}
