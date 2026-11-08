import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getProjectAccessRole,getProjectById,listProjects} from "@/services/project-service";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {TENANT_SCHEMA_READY,requireEffectiveTenant} from "@/lib/tenant-runtime";
import {CONSULT_ORG_ID} from "@/lib/consult-workspace";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validDate=(s:unknown):s is string=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s+"T12:00:00Z"))&&new Date(s+"T12:00:00Z").toISOString().slice(0,10)===s;
const response=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private,no-store"}});
const fail=(error:string,status=400)=>response({error},status);
async function context(request:NextRequest,projectId:string,edit=false){
 const auth=await requireApiAuth(request);
 if(!auth.ok)return {error:auth.response} as const;
 if(!uuid.test(projectId))return {error:fail("Projeto inválido.")} as const;
 const project=await getProjectById({userId:auth.context.userId,userEmail:auth.context.userEmail,projectId});
 if(!project)return {error:fail("Projeto não encontrado.",404)} as const;
 const access=await getProjectAccessRole({userId:auth.context.userId,userEmail:auth.context.userEmail,projectId});
 if(access==="none"||edit&&!["owner","editor"].includes(access))return {error:fail("Acesso negado.",403)} as const;
 const db=getSupabaseServerClient();
 if(!db)return {error:fail("Banco indisponível.",503)} as const;
 const org=TENANT_SCHEMA_READY?await requireEffectiveTenant(auth.context.userId):CONSULT_ORG_ID;
 return {db,org} as const;
}
export async function GET(req:NextRequest){
 const projectId=req.nextUrl.searchParams.get("projectId")||"";
 if(!projectId){
   const auth=await requireApiAuth(req);
   if(!auth.ok)return auth.response;
   const projects=await listProjects(auth.context.userId,auth.context.userEmail);
   return response({data:projects.filter(p=>p.status==="ativo").map(p=>({id:p.id,name:p.name}))});
 }
 const ctx=await context(req,projectId);
 if("error" in ctx)return ctx.error;
 const {db,org}=ctx;
 const result=await db.from("scrum_sprints").select("id,name,goal,status,start_date,end_date,created_at").eq("project_id",projectId).eq("organization_id",org).order("start_date",{ascending:false});
 return result.error?fail("Não foi possível consultar Sprints: "+result.error.code,503):response({data:{sprints:result.data||[]}});
}
export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>null) as Record<string,unknown>|null;
 if(!body||typeof body!=="object"||Array.isArray(body))return fail("Dados inválidos.");
 const projectId=String(body.projectId||"");
 const ctx=await context(req,projectId,true);
 if("error" in ctx)return ctx.error;
 const {db,org}=ctx;
 if(body.action==="create_sprint"){
   const name=typeof body.name==="string"?body.name.trim():"";
   if(name.length<2||name.length>140||!validDate(body.startDate)||!validDate(body.endDate)||body.endDate<body.startDate)return fail("Nome ou datas da Sprint inválidos.");
   const inserted=await db.from("scrum_sprints").insert({organization_id:org,project_id:projectId,name,goal:typeof body.goal==="string"?body.goal.slice(0,2000):"",start_date:body.startDate,end_date:body.endDate}).select("id").single();
   return inserted.error?fail("Não foi possível criar Sprint: "+inserted.error.code,409):response({data:inserted.data},201);
 }
 if(body.action==="update_sprint"){
   const id=String(body.sprintId||""),status=String(body.status||"");
   if(!uuid.test(id)||!["planned","active","closed"].includes(status))return fail("Sprint ou estado inválido.");
   const existing=await db.from("scrum_sprints").select("id,status").eq("id",id).eq("project_id",projectId).eq("organization_id",org).maybeSingle();
   if(existing.error||!existing.data)return fail("Sprint não encontrada.",404);
   if(existing.data.status==="closed")return fail("Sprint encerrada: histórico imutável.",409);
   if(status==="closed"&&existing.data.status!=="active")return fail("A Sprint deve estar ativa antes de encerrar.",409);
   const changed=await db.from("scrum_sprints").update({status,updated_at:new Date().toISOString()}).eq("id",id).eq("project_id",projectId).eq("organization_id",org).select("id").single();
   return changed.error?fail("Não foi possível atualizar Sprint: "+changed.error.code,409):response({data:changed.data});
 }
 return fail("Operação descontinuada: User Stories são exclusivas do Scrum. Use a API /api/scrum/stories.",410);
}
