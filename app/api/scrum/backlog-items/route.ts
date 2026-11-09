import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getProjectAccessRole,getProjectById} from "@/services/project-service";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {TENANT_SCHEMA_READY,requireEffectiveTenant} from "@/lib/tenant-runtime";
import {CONSULT_ORG_ID} from "@/lib/consult-workspace";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private,no-store"}});
const bad=(error:string,status=400)=>reply({error},status);
async function scope(req:NextRequest,projectId:string,write=false){
 const auth=await requireApiAuth(req);if(!auth.ok)return {error:auth.response} as const;
 if(!uuid.test(projectId))return {error:bad("Projeto inválido.")} as const;
 const project=await getProjectById({userId:auth.context.userId,userEmail:auth.context.userEmail,projectId});
 if(!project)return {error:bad("Projeto não encontrado.",404)} as const;
 const role=await getProjectAccessRole({userId:auth.context.userId,userEmail:auth.context.userEmail,projectId});
 if(role==="none"||write&&!["owner","editor"].includes(role))return {error:bad("Acesso negado.",403)} as const;
 const db=getSupabaseServerClient();if(!db)return {error:bad("Banco indisponível.",503)} as const;
 const org=TENANT_SCHEMA_READY?await requireEffectiveTenant(auth.context.userId):CONSULT_ORG_ID;
 return {db,org} as const;
}
export async function GET(req:NextRequest){
 const projectId=req.nextUrl.searchParams.get("projectId")||"";const ctx=await scope(req,projectId);
 if("error" in ctx)return ctx.error;
 const r=await ctx.db.from("scrum_backlog_items").select("*").eq("organization_id",ctx.org).eq("project_id",projectId).order("sort_order",{ascending:true}).order("created_at",{ascending:true}).limit(1000);
 return r.error?bad("Falha ao consultar hierarquia do backlog.",503):reply({data:r.data||[]});
}
export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>null) as Record<string,unknown>|null;
 if(!body||Array.isArray(body)||typeof body!=="object")return bad("Dados inválidos.");
 const projectId=String(body.projectId||"");const ctx=await scope(req,projectId,true);
 if("error" in ctx)return ctx.error;
 const {db,org}=ctx;const action=String(body.action||"");
 const type=String(body.itemType||""),id=String(body.id||"");
 if(action!=="create"&&(!uuid.test(id)))return bad("Item inválido.");
 const old=action==="create"?null:await db.from("scrum_backlog_items").select("*").eq("id",id).eq("project_id",projectId).eq("organization_id",org).maybeSingle();
 if(action!=="create"&&(old?.error||!old?.data))return bad("Item não encontrado.",404);
 const item=old?.data;
 if(action==="delete"){
  if(type==="feature"||item.item_type==="feature"){
   const stories=await db.from("scrum_user_stories").select("id").eq("organization_id",org).eq("project_id",projectId).eq("feature_id",id).limit(1);
   if(stories.error||stories.data?.length)return bad("Feature possui US vinculadas ou não pode ser verificada.",409);
  }
  const removed=await db.from("scrum_backlog_items").delete().eq("id",id).eq("project_id",projectId).eq("organization_id",org).select("id");
  return removed.error?bad("Item possui dependências e não pode ser excluído.",409):reply({data:{deleted:Boolean(removed.data?.length)}});
 }
 if(action!=="create"&&action!=="update")return bad("Operação não reconhecida.");
 const itemType=action==="create"?type:item.item_type;
 if(!["epic","feature","task"].includes(itemType))return bad("Tipo inválido.");
 const title=String(body.title??item?.title??"").trim();
 if(!title||title.length>180)return bad("Título obrigatório.");
 const parentId=body.parentId===undefined?item?.parent_id??null:body.parentId||null;
 const storyId=body.storyId===undefined?item?.story_id??null:body.storyId||null;
 if(itemType==="epic"&&(parentId||storyId)||itemType==="feature"&&(!parentId||storyId)||itemType==="task"&&(!storyId||parentId))return bad("Hierarquia inválida para este tipo.");
 if(parentId&& !uuid.test(String(parentId)) || storyId&&!uuid.test(String(storyId)))return bad("Vínculo inválido.");
 if(parentId){
  const p=await db.from("scrum_backlog_items").select("id").eq("id",parentId).eq("item_type","epic").eq("organization_id",org).eq("project_id",projectId).maybeSingle();
  if(p.error||!p.data)return bad("Epic não encontrado.",404);
 }
 if(storyId){
  const p=await db.from("scrum_user_stories").select("id,sprint_id").eq("id",storyId).eq("organization_id",org).eq("project_id",projectId).maybeSingle();
  if(p.error||!p.data)return bad("US não encontrada.",404);
 }
 const state=String(body.state??item?.state??(itemType==="task"?"todo":"new"));
 if(!(itemType==="task"?["todo","doing","done"]:["new","ready","active","resolved","closed","review","rejected"]).includes(state))return bad("Status inválido.");
 if(action==="create"&&itemType==="task"&&state!=="todo")return bad("Toda Task deve iniciar em TO DO.");
 const responsible=String(body.responsible??item?.responsible??"").trim().toLowerCase();
 if(responsible){
  const member=await db.from("project_members").select("id").eq("organization_id",org).eq("project_id",projectId).ilike("member_email",responsible).limit(1);
  if(member.error||!member.data?.length)return bad("Responsável não participa do projeto.");
 }

 const rank=body.sortOrder===undefined?Number(item?.sort_order||0):Number(body.sortOrder);
 if(!Number.isInteger(rank)||rank<0||rank>1000000)return bad("Ordem inválida.");
 const patch={title,responsible:responsible||null,actual_end_date:itemType==="task"&&state==="done"?new Date().toISOString().slice(0,10):state==="todo"||state==="doing"?null:item?.actual_end_date||null,description:String(body.description??item?.description??"").slice(0,10000),state,parent_id:parentId,story_id:storyId,sort_order:rank,updated_at:new Date().toISOString()};
 const result=action==="create"?
  await db.from("scrum_backlog_items").insert({...patch,organization_id:org,project_id:projectId,item_type:itemType}).select("id").single():
  await db.from("scrum_backlog_items").update(patch).eq("id",id).eq("organization_id",org).eq("project_id",projectId).select("id,state,actual_end_date,story_id,updated_at").single();
 if(result.error)return bad("Não foi possível salvar item: "+result.error.code,409);
 // Return the authoritative Task state and its synchronous story-progress
 // effect, avoiding a full board reload before another user interaction.
 if(action==="update"&&itemType==="task"&&storyId){
  const linked=await db.from("scrum_user_stories")
    .select("id,workflow_stage,actual_end_date,updated_at")
    .eq("id",String(storyId)).eq("project_id",projectId).eq("organization_id",org).maybeSingle();
  if(!linked.error&&linked.data)return reply({data:{...result.data,story:linked.data}});
 }
 return reply({data:result.data},action==="create"?201:200);
}
