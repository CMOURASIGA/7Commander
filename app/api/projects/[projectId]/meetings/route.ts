import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getProjectById,getProjectAccessRole} from "@/services/project-service";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {TENANT_SCHEMA_READY,requireEffectiveTenant} from "@/lib/tenant-runtime";
import {CONSULT_ORG_ID} from "@/lib/consult-workspace";
import {localWriteGuardEnabled} from "@/lib/local-write-guard";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private,no-store"}});
const error=(message:string,status=400)=>reply({error:message},status);
type MeetingInput={title?:unknown;heldAt?:unknown;participants?:unknown;objective?:unknown;summary?:unknown;advances?:unknown;decisions?:unknown;commitments?:unknown;pendingItems?:unknown;risks?:unknown;nextFollowUp?:unknown;sourceConversationId?:unknown;sourceArtifactId?:unknown};
const bounded=(value:unknown,limit:number)=>typeof value==="string"?value.trim().slice(0,limit):"";
function validTimestamp(value:unknown){return typeof value==="string"&&Number.isFinite(Date.parse(value))&&Math.abs(Date.parse(value)-Date.now())<10*365*24*60*60*1000}
async function scope(request:NextRequest,projectId:string,write=false){
 const auth=await requireApiAuth(request);if(!auth.ok)return {error:auth.response} as const;
 if(!uuid.test(projectId))return {error:error("Projeto inválido.",400)} as const;
 const project=await getProjectById({projectId,userId:auth.context.userId,userEmail:auth.context.userEmail});
 if(!project)return {error:error("Projeto não encontrado.",404)} as const;
 const role=await getProjectAccessRole({projectId,userId:auth.context.userId,userEmail:auth.context.userEmail,verifiedProject:project});
 if(role==="none"||(write&&!["owner","editor"].includes(role)))return {error:error("Sem autorização para registrar reunião.",403)} as const;
 const db=getSupabaseServerClient();if(!db)return {error:error("Banco indisponível.",503)} as const;
 const org=TENANT_SCHEMA_READY?await requireEffectiveTenant(auth.context.userId):CONSULT_ORG_ID;
 if(!org)return {error:error("Empresa indisponível.",403)} as const;
 return {db,org,userId:auth.context.userId} as const;
}
type RouteContext={params:Promise<{projectId:string}>};
export async function GET(request:NextRequest,{params}:RouteContext){
 const {projectId}=await params;
 const ctx=await scope(request,projectId);if("error" in ctx)return ctx.error;
 const list=await ctx.db.from("project_meetings")
  .select("id,title,held_at,participants,objective,summary,advances,decisions,commitments,pending_items,risks,next_follow_up,source_conversation_id,source_artifact_id,created_at")
  .eq("organization_id",ctx.org).eq("project_id",projectId).order("held_at",{ascending:false}).limit(100);
 if(list.error){
  console.error("[project meetings] SELECT failed",{code:list.error.code,projectId});
  const code=list.error.code;
  if(code==="42501")return error("Sem permissão para consultar reuniões neste ambiente. Verifique as credenciais do backend e a política RLS; nenhuma migração deve ser aplicada automaticamente.",403);
  if(code==="42P01"||code==="PGRST205")return error("Tabela de reuniões não disponível neste ambiente. Verifique se as migrações de reuniões foram aplicadas.",503);
  return error("Não foi possível consultar as reuniões. Verifique o log do servidor e o acesso à base.",503);
 }
 const ids=(list.data??[]).map(x=>x.id);
 if(!ids.length)return reply({data:[]});
 const links=await ctx.db.from("project_meeting_links").select("meeting_id,record_type,record_id")
   .eq("organization_id",ctx.org).eq("project_id",projectId).in("meeting_id",ids);
 if(links.error){
  console.error("[project meetings] link SELECT failed",{code:links.error.code,projectId});
  if(links.error.code==="42501")return error("Sem permissão para consultar vínculos das reuniões neste ambiente. Confira as credenciais do backend e a RLS.",403);
  return error("Vínculos das reuniões indisponíveis. Verifique logs e esquema.",503);
 }
 return reply({data:(list.data??[]).map(meeting=>({...meeting,links:(links.data??[]).filter(link=>link.meeting_id===meeting.id)}))});
}
export async function POST(request:NextRequest,{params}:RouteContext){
 if(localWriteGuardEnabled())return error("Ambiente local somente leitura: reunião não pode ser gravada.",403);
 const {projectId}=await params;
 const ctx=await scope(request,projectId,true);if("error" in ctx)return ctx.error;
 const body=await request.json().catch(()=>null) as MeetingInput|null;
 if(!body||typeof body!=="object"||Array.isArray(body))return error("Dados inválidos.");
 const title=bounded(body.title,181);
 if(title.length<3||title.length>180)return error("Título obrigatório, até 180 caracteres.");
 if(!validTimestamp(body.heldAt))return error("Data e horário da reunião inválidos.");
 if(body.nextFollowUp&&!validTimestamp(body.nextFollowUp))return error("Data do próximo acompanhamento inválida.");
 if(body.sourceConversationId&&(!uuid.test(String(body.sourceConversationId))))return error("Conversa de origem inválida.");
 // An exact duplicate cannot be silently recreated by repeated submissions.
 const existing=await ctx.db.from("project_meetings").select("id")
  .eq("organization_id",ctx.org).eq("project_id",projectId).eq("title",title)
  .eq("held_at",new Date(String(body.heldAt)).toISOString()).maybeSingle();
 if(existing.error){
  // Do not bypass duplicate checking when SELECT fails: a retry could create
  // duplicate official meetings or hide an authorization/schema problem.
  console.error("[project meetings] duplicate verification failed",{
   code:existing.error.code,projectId,tenantChecked:true,
   details:existing.error.details?.slice(0,200),
  });
  const code=existing.error.code;
  if(code==="42501"||code==="PGRST301")return error(
   "Não foi possível consultar reuniões para verificar duplicidade. Confira a permissão de leitura da tabela project_meetings e as políticas RLS para a empresa ativa. Nada foi gravado.",403);
  if(code==="42P01"||code==="PGRST205"||code==="PGRST204"||code==="42703")return error(
   "O banco deste ambiente não possui a estrutura de reuniões esperada. Confira as migrações e as colunas da tabela project_meetings antes de cadastrar. Nada foi gravado.",503);
  return error("A consulta de duplicidade da reunião falhou no banco (código "+(code||"indisponível")+"). Verifique os logs do servidor e a conexão com project_meetings. Nada foi gravado.",503);
 }
 if(existing.data)return reply({error:"Esta reunião já está cadastrada.",meetingId:existing.data.id},409);
 const record={
  organization_id:ctx.org,project_id:projectId,created_by:ctx.userId,
  title,held_at:new Date(String(body.heldAt)).toISOString(),
  participants:bounded(body.participants,4000),objective:bounded(body.objective,8000),
  summary:bounded(body.summary,12000),advances:bounded(body.advances,8000),
  decisions:bounded(body.decisions,8000),commitments:bounded(body.commitments,8000),
  pending_items:bounded(body.pendingItems,8000),risks:bounded(body.risks,8000),
  next_follow_up:body.nextFollowUp?new Date(String(body.nextFollowUp)).toISOString():null,
  source_conversation_id:body.sourceConversationId||null,
  source_artifact_id:bounded(body.sourceArtifactId,500)||null,
 };
 const inserted=await ctx.db.from("project_meetings").insert(record).select("id,title,held_at,created_at").single();
 if(inserted.error)return error("Não foi possível salvar a reunião.",503);
 return reply({data:inserted.data},201);
}
