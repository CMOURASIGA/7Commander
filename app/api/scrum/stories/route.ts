import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getProjectAccessRole,getProjectById} from "@/services/project-service";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {TENANT_SCHEMA_READY,requireEffectiveTenant} from "@/lib/tenant-runtime";
import {CONSULT_ORG_ID} from "@/lib/consult-workspace";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const stages=["new","review","rework","ready","active","resolved","closed","rejected"];
const transitions:Record<string,string[]>={new:["ready"],ready:["active","review"],review:["ready"],active:["resolved"],resolved:["closed","rejected"],rejected:["ready"],closed:[],rework:["ready"]};
const validDate=(x:unknown)=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(Date.parse(x+"T12:00:00Z"))&&new Date(x+"T12:00:00Z").toISOString().slice(0,10)===x;
const respond=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private,no-store"}});
const fail=(error:string,status=400)=>respond({error},status);
async function scope(request:NextRequest,projectId:string,write=false){
  const auth=await requireApiAuth(request);
  if(!auth.ok)return {error:auth.response} as const;
  if(!uuid.test(projectId))return {error:fail("Projeto inválido.")} as const;
  const project=await getProjectById({projectId,userId:auth.context.userId,userEmail:auth.context.userEmail});
  if(!project)return {error:fail("Projeto não encontrado.",404)} as const;
  const role=await getProjectAccessRole({projectId,userId:auth.context.userId,userEmail:auth.context.userEmail,verifiedProject:project});
  if(role==="none" || write&&!["owner","editor"].includes(role))return {error:fail("Acesso negado.",403)} as const;
  const db=getSupabaseServerClient();if(!db)return {error:fail("Banco indisponível.",503)} as const;
  const org=TENANT_SCHEMA_READY?await requireEffectiveTenant(auth.context.userId):CONSULT_ORG_ID;
  return {db,org,auth:auth.context} as const;
}
async function sprintState(db:NonNullable<ReturnType<typeof getSupabaseServerClient>>,org:string,projectId:string,sprintId:string|null){
  if(!sprintId)return {status:null};
  const r=await db.from("scrum_sprints").select("id,status").eq("id",sprintId).eq("organization_id",org).eq("project_id",projectId).maybeSingle();
  if(r.error||!r.data)return {error:"Sprint inexistente ou não autorizada."};
  return {status:r.data.status};
}
export async function GET(req:NextRequest){
  const projectId=req.nextUrl.searchParams.get("projectId")||"";
  const context=await scope(req,projectId);
  if("error" in context)return context.error;
  const {db,org}=context;
  const [stories,comments,events]=await Promise.all([
    db.from("scrum_user_stories").select("*").eq("organization_id",org).eq("project_id",projectId).order("created_at",{ascending:false}).limit(500),
    db.from("scrum_story_comments").select("id,story_id,author_email,content,created_at").eq("organization_id",org).eq("project_id",projectId).order("created_at",{ascending:true}).limit(1000),
    db.from("scrum_story_events").select("story_id,event_type,from_sprint,to_sprint").eq("organization_id",org).eq("project_id",projectId).limit(2000)
  ]);
  if(stories.error||comments.error||events.error){
    const failed=stories.error?{name:"User Stories",code:stories.error.code}:comments.error?{name:"Comentários",code:comments.error.code}:{name:"Histórico",code:events.error!.code};
    // Postgres error codes may be shown; never return database details or SQL.
    return fail(`Consulta de ${failed.name} indisponível (código ${failed.code||"DB_ERROR"}). Verifique as permissões RLS do usuário autenticado.`,503);
  }
  const history=new Set((events.data||[]).filter(e=>e.event_type!=="created"||e.from_sprint!==null||e.to_sprint!==null).map(e=>e.story_id));
  return respond({data:{stories:(stories.data||[]).map(st=>({...st,has_history:history.has(st.id)})),comments:comments.data}});
}
export async function POST(req:NextRequest){
  const perfStart=performance.now();
  const body=await req.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body||Array.isArray(body)||typeof body!=="object")return fail("Payload inválido.");
  const projectId=String(body.projectId||"");
  const context=await scope(req,projectId,true);
  if("error" in context)return context.error;
  const perfAuth=performance.now();
  const {db,org,auth}=context;
  const action=String(body.action||"");
  const storyId=String(body.storyId||"");
  const existing=action==="create"?null:uuid.test(storyId)?await db.from("scrum_user_stories").select("*").eq("id",storyId).eq("organization_id",org).eq("project_id",projectId).maybeSingle():null;
  if(action!=="create"&&(!existing||existing.error||!existing.data))return fail("US não encontrada.",404);
  const current=existing?.data;
  const locked=await sprintState(db,org,projectId,current?.sprint_id||null);
  if(locked.error)return fail(locked.error,409);
  if(locked.status==="closed")return fail("US de Sprint encerrada: histórico protegido.",409);

  if(action==="delete"){
    if(current?.sprint_id)return fail("Remova a US da Sprint antes de excluir. Sprints encerradas não permitem remoção.",409);
    if(current.workflow_stage!=="new")return fail("US com execução iniciada não pode ser excluída.",409);
    const history=await db.from("scrum_story_events").select("event_type,from_stage,to_stage,from_sprint,to_sprint").eq("story_id",storyId).eq("organization_id",org);
    if(history.error)return fail("Histórico indisponível: exclusão bloqueada por segurança.",503);
    if((history.data||[]).some(e=>e.event_type!=="created"||e.to_sprint!==null||e.from_sprint!==null))return fail("US com movimentação ou vínculo anterior não pode ser excluída.",409);
    if(String(body.confirmTitle||"").trim()!==current.title)return fail("Confirmação divergente.",400);
    const deleted=await db.from("scrum_user_stories").delete().eq("id",storyId).eq("project_id",projectId).eq("organization_id",org).select("id");
    return deleted.error?fail("Exclusão bloqueada: "+deleted.error.code,409):respond({data:{deleted:Boolean(deleted.data?.length)}});
  }
  if(action==="comment"){
    const content=String(body.content||"").trim();
    if(!content||content.length>4000)return fail("Comentário inválido.");
    const added=await db.from("scrum_story_comments").insert({story_id:storyId,organization_id:org,project_id:projectId,author_user_id:auth.userId,author_email:auth.userEmail,content}).select("id").single();
    return added.error?fail("Falha ao comentar.",409):respond({data:added.data},201);
  }
  if(action!=="create"&&action!=="update")return fail("Ação não reconhecida.");
  const title=typeof body.title==="string"?body.title.trim():current?.title||"";
  if(action==="create"&&body.fromKairos===true){
    const duplicate=await db.from("scrum_user_stories").select("id").eq("organization_id",org).eq("project_id",projectId).ilike("title",title).limit(1);
    if(duplicate.error)return fail("Não foi possível verificar duplicidade da US.",503);
    if(duplicate.data?.length)return fail("US do Kairos já cadastrada com este título.",409);
  }
  if(!title||title.length>180)return fail("Título obrigatório (até 180 caracteres).");
  const priority=body.priority===undefined?current?.priority||"media":String(body.priority);
  if(!["baixa","media","alta","critica"].includes(priority))return fail("Prioridade inválida.");
  const stage=body.stage===undefined?current?.workflow_stage||"new":String(body.stage);
  if(!stages.includes(stage))return fail("Etapa inválida.");
  if(current&&stage!==current.workflow_stage&&!transitions[current.workflow_stage]?.includes(stage))return fail("Transição não permitida: "+current.workflow_stage+" para "+stage,409);
  const start=body.startDate===undefined?current?.start_date||null:body.startDate||null;
  const due=body.dueDate===undefined?current?.due_date||null:body.dueDate||null;
  if(start!==null&&!validDate(start)||due!==null&&!validDate(due)||start&&due&&String(due)<String(start))return fail("Datas inválidas.");
  const days=body.durationDays===undefined?current?.duration_days??null:body.durationDays===""||body.durationDays===null?null:Number(body.durationDays);
  const points=body.storyPoints===undefined?current?.story_points??null:body.storyPoints===""||body.storyPoints===null?null:Number(body.storyPoints);
  if(days!==null&&(!Number.isInteger(days)||days<1||days>3650))return fail("Duração inválida.");
  if(start&&due&&days!==null&&(action==="create"||body.startDate!==undefined||body.dueDate!==undefined||body.durationDays!==undefined)){
    const calculated=new Date(String(start)+"T12:00:00Z");
    calculated.setUTCDate(calculated.getUTCDate()+days-1);
    if(calculated.toISOString().slice(0,10)!==due)return fail("Início, prazo em dias corridos e data de entrega são inconsistentes.",400);
  }
  if(points!==null&&![1,2,3,4].includes(points))return fail("Story points devem ser 1, 2, 3 ou 4.");
  const actualEnd=body.actualEndDate===undefined?current?.actual_end_date||null:body.actualEndDate||null;
  if(actualEnd!==null&&!validDate(actualEnd))return fail("Data real inválida.");
  const responsible=String(body.responsible===undefined?current?.responsible||"":body.responsible||"").trim().toLowerCase();
  if(responsible){
    const members=await db.from("project_members").select("id").eq("project_id",projectId).eq("organization_id",org).ilike("member_email",responsible).limit(1);
    if(members.error||!members.data?.length)return fail("Responsável não tem acesso ao projeto.",400);
  }
  const requestedSprint=body.sprintId===undefined?current?.sprint_id||null:body.sprintId||null;
  const featureId=body.featureId===undefined?current?.feature_id||null:body.featureId||null;
  if(featureId!==null){
    if(!uuid.test(String(featureId)))return fail("Feature inválida.");
    const feature=await db.from("scrum_backlog_items").select("id").eq("id",featureId).eq("item_type","feature").eq("project_id",projectId).eq("organization_id",org).maybeSingle();
    if(feature.error||!feature.data)return fail("Feature não encontrada no projeto.",404);
  }
  const transitionComment=typeof body.transitionComment==="string"?body.transitionComment.trim():"";
  if(transitionComment.length>4000)return fail("Comentário excede 4000 caracteres.");
  if(stage==="review"&&stage!==current?.workflow_stage&&!transitionComment)return fail("Informe o motivo da solicitação de REVIEW.",400);
  if(requestedSprint!==null&&!uuid.test(String(requestedSprint)))return fail("Identificador da Sprint inválido.");
  if(current?.sprint_id&&requestedSprint!==null&&requestedSprint!==current.sprint_id)return fail("Uma US já vinculada deve retornar ao backlog antes de mudar de Sprint.",409);
  const target=await sprintState(db,org,projectId,requestedSprint?String(requestedSprint):null);
  if(target.error||target.status==="closed")return fail("A Sprint selecionada está encerrada ou indisponível.",409);
  const sortOrder=body.sortOrder===undefined?Number(current?.sort_order||0):Number(body.sortOrder);
  if(!Number.isInteger(sortOrder)||sortOrder<0||sortOrder>1000000)return fail("Ordem inválida.");
  const perfValidation=performance.now();
  const patch={
    title,description:String(body.description===undefined?current?.description||"":body.description||"").slice(0,10000),
    acceptance_criteria:String(body.acceptanceCriteria===undefined?current?.acceptance_criteria||"":body.acceptanceCriteria||"").slice(0,10000),
    feature_id:featureId,sort_order:sortOrder,priority,responsible:responsible||null,actual_end_date:stage==="closed"||stage==="resolved"?actualEnd||new Date().toISOString().slice(0,10):actualEnd,
    workflow_stage:stage,start_date:start,due_date:due,duration_days:days,story_points:points,
    sprint_id:requestedSprint,blocked:body.blocked===undefined?Boolean(current?.blocked):body.blocked===true,
    blocker_reason:String(body.blockerReason===undefined?current?.blocker_reason||"":body.blockerReason||"").slice(0,1500),
    last_actor_email:auth.userEmail||"",transition_comment:transitionComment,
    updated_at:new Date().toISOString()
  };
  const result=action==="create"?
    await db.from("scrum_user_stories").insert({...patch,project_id:projectId,organization_id:org,created_by_email:auth.userEmail||"",workflow_stage:"new"}).select("id").single():
    await db.from("scrum_user_stories").update(patch).eq("id",storyId).eq("organization_id",org).eq("project_id",projectId).select("id,workflow_stage,actual_end_date,updated_at").single();
  if(result.error)return fail("Não foi possível salvar a US: "+result.error.code,409);
  const perfEnd=performance.now();
  const millis=(v:number)=>Math.max(0,Math.round(v*10)/10);
  return NextResponse.json({data:result.data},{status:action==="create"?201:200,headers:{
    "Cache-Control":"private,no-store",
    "Server-Timing":`auth;dur=${millis(perfAuth-perfStart)},validate;dur=${millis(perfValidation-perfAuth)},write;dur=${millis(perfEnd-perfValidation)},total;dur=${millis(perfEnd-perfStart)}`
  }});
}
