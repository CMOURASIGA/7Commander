import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CONSULT_ORG_ID, consultMemberRole } from "@/lib/consult-workspace";
import { getProjectAccessRole } from "@/services/project-service";
export const dynamic = "force-dynamic";
const KINDS = ["prospect","opportunity","requirement","research","assessment","decision_gate"] as const;
const STATUSES = ["draft","review","approved","rejected","won","lost","archived"] as const;
type Kind=typeof KINDS[number];
function err(message:string,status=400){return NextResponse.json({error:message},{status});}
async function context(req:NextRequest,write=false){
 const auth=await requireApiAuth(req);if(!auth.ok)return {response:auth.response};
 if(auth.context.authMode!=="supabase")return {response:err("É necessária uma sessão Supabase.",403)};
 const role=await consultMemberRole(auth.context.userId);
 if(!role)return {response:err("Usuário sem vínculo ativo com a Consult Services.",403)};
 if(write && role==="member")return {response:err("Seu perfil não pode alterar registros de planejamento.",403)};
 const db=getSupabaseServerClient();if(!db)return {response:err("Banco indisponível.",503)};
 return {db,user:auth.context,role};
}
function cleanPayload(data:unknown){
 if(!data || typeof data!=="object"||Array.isArray(data))return {};
 const input=data as Record<string,unknown>;const out:Record<string,string|number|boolean>={};
 for(const key of ["source","owner","nextAction","acceptance","priority","category","supplier","coverage","evidence","confidence","estimatedValue","currency","reason","stage","baseline","recommendation","prospectId","estimatedCloseDate","legalBasis"]){
  const value=input[key];
  if(typeof value==="string")out[key]=value.slice(0,1500);
  if(typeof value==="number"&&Number.isFinite(value))out[key]=value;
  if(typeof value==="boolean")out[key]=value;
 }
 return out;
}
export async function GET(req:NextRequest){
 const c=await context(req);if("response"in c)return c.response!;
 const url=req.nextUrl.searchParams;
 const rawKind=url.get("kind");if(rawKind && !KINDS.includes(rawKind as Kind))return err("Categoria inválida");
 const page=Math.min(1000,Math.max(1,Number(url.get("page"))||1));
 const projectId=url.get("projectId");
 let query=c.db!.from("commander_planning_records").select("id,kind,title,description,status,project_id,payload,source_url,source_checked_at,version,updated_at,created_by",{count:"exact"})
  .eq("organization_id",CONSULT_ORG_ID).order("updated_at",{ascending:false}).range((page-1)*25,page*25-1);
 if(rawKind)query=query.eq("kind",rawKind);
 if(projectId)query=query.eq("project_id",projectId);
 const data=await query;
 if(data.error)return err("Não foi possível consultar o planejamento. Confira a migration 048.",503);
 return NextResponse.json({data:data.data??[],meta:{total:data.count,page,pageSize:25}},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:NextRequest){
 const c=await context(req,true);if("response"in c)return c.response!;
 const body=await req.json().catch(()=>null);
 if(!body || !KINDS.includes(body.kind))return err("Categoria inválida.");
 const title=typeof body.title==="string"?body.title.trim():"";
 if(title.length<3||title.length>180)return err("Título deve ter entre 3 e 180 caracteres.");
 const projectId=typeof body.projectId==="string"&&body.projectId?body.projectId:null;
 if(projectId){
  const role=await getProjectAccessRole({userId:c.user!.userId,userEmail:c.user!.userEmail,projectId});
  if(role!=="owner"&&role!=="editor")return err("Projeto sem permissão de edição.",403);
 }
 if(body.kind!=="prospect"&&body.kind!=="opportunity"&&!projectId)return err("Selecione um projeto para este registro.");
 if(body.kind==="opportunity"&&typeof body.payload?.prospectId==="string"&&body.payload.prospectId){
  const linked=await c.db!.from("commander_planning_records").select("id").eq("id",body.payload.prospectId)
   .eq("kind","prospect").eq("organization_id",CONSULT_ORG_ID).maybeSingle();
  if(linked.error||!linked.data)return err("Prospect informado não pertence à Consult Services.",403);
 }
 const sourceUrl=typeof body.sourceUrl==="string"&&/^https:\/\//i.test(body.sourceUrl)?body.sourceUrl.slice(0,2000):null;
 const insert=await c.db!.from("commander_planning_records").insert({
  organization_id:CONSULT_ORG_ID,project_id:projectId,kind:body.kind,title,
  description:typeof body.description==="string"?body.description.slice(0,10000):"",
  status:"draft",payload:cleanPayload(body.payload),source_url:sourceUrl,
  source_checked_at:sourceUrl?new Date().toISOString():null,created_by:c.user!.userId,updated_by:c.user!.userId
 }).select("*").single();
 if(insert.error||!insert.data)return err("Falha ao registrar item.",503);
 const audit=await c.db!.from("commander_planning_audit").insert({record_id:insert.data.id,version:1,actor_id:c.user!.userId,action:"created",snapshot:insert.data});
 if(audit.error)return err("Registro criado, mas auditoria falhou. Não repita sem conferir a lista.",503);
 return NextResponse.json({data:insert.data},{status:201});
}
export async function PATCH(req:NextRequest){
 const c=await context(req,true);if("response"in c)return c.response!;
 const body=await req.json().catch(()=>null);
 if(!body?.id||!Number.isInteger(body.version))return err("ID e versão são obrigatórios.");
 const current=await c.db!.from("commander_planning_records").select("*").eq("id",body.id).eq("organization_id",CONSULT_ORG_ID).maybeSingle();
 if(current.error||!current.data)return err("Registro não localizado.",404);
 const row=current.data;
 if(row.project_id){
  const role=await getProjectAccessRole({userId:c.user!.userId,userEmail:c.user!.userEmail,projectId:row.project_id});
  if(role!=="owner"&&role!=="editor")return err("Sem permissão de edição.",403);
 }
 if(row.version!==body.version)return err("Registro alterado por outra pessoa. Atualize antes de salvar.",409);
 const nextStatus=body.status??row.status;
 if(!STATUSES.includes(nextStatus))return err("Status inválido.");
 if(["approved","won"].includes(nextStatus)&&!["owner","admin","manager"].includes(c.role!))return err("Aprovação exige perfil de gestão.",403);
 const title=typeof body.title==="string"?body.title.trim():row.title;
 if(title.length<3||title.length>180)return err("Título inválido.");
 if(row.kind==="opportunity"&&typeof body.payload?.prospectId==="string"&&body.payload.prospectId){
  const linked=await c.db!.from("commander_planning_records").select("id").eq("id",body.payload.prospectId)
   .eq("kind","prospect").eq("organization_id",CONSULT_ORG_ID).maybeSingle();
  if(linked.error||!linked.data)return err("Prospect de origem não encontrado nesta organização.",403);
 }
 const changes={title,description:typeof body.description==="string"?body.description.slice(0,10000):row.description,
  payload:body.payload!==undefined?cleanPayload(body.payload):row.payload,status:nextStatus,version:row.version+1,
  updated_by:c.user!.userId,updated_at:new Date().toISOString()};
 const saved=await c.db!.from("commander_planning_records").update(changes).eq("id",row.id).eq("version",row.version).select("*").maybeSingle();
 if(saved.error)return err("Não foi possível salvar.",503);
 if(!saved.data)return err("Conflito de edição: recarregue o registro.",409);
 const audit=await c.db!.from("commander_planning_audit").insert({record_id:row.id,version:changes.version,actor_id:c.user!.userId,action:"updated",snapshot:saved.data});
 if(audit.error)return err("Alteração salva, mas houve falha de auditoria. Recarregue antes de repetir.",503);
 return NextResponse.json({data:saved.data});
}
