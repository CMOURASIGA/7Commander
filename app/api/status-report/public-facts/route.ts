import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getReportScope} from "@/lib/scrum/report-data";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const out=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private,no-store"}});
const kinds=["objective","benefit","deliverable","milestone","risk","next_step"];
const states=["confirmed","in_progress","hypothesis","ai_recommendation"];
export async function GET(request:NextRequest){
 const auth=await requireApiAuth(request);if(!auth.ok)return auth.response;
 const projectId=request.nextUrl.searchParams.get("projectId")||"";
 const scope=await getReportScope(auth.context,projectId);if("error" in scope)return out({error:scope.error},scope.status);
 const manage=request.nextUrl.searchParams.get("manage")==="1";
 const suggestions=request.nextUrl.searchParams.get("suggestions")==="1";
 const editor=["owner","editor"].includes(scope.role);
 if((manage||suggestions)&&!editor)return out({error:"Classificação de divulgação restrita à gestão do projeto."},403);
 if(suggestions){
  // Existing operational data is a private REVIEW QUEUE, never an approved client feed.
  // All rows are scoped to the authenticated project's server-verified tenant.
  const [project,tasks,stories,risks,decisions]=await Promise.all([
   scope.db.from("projects").select("id,nome,objetivo,descricao").eq("id",projectId).eq("organization_id",scope.organizationId).maybeSingle(),
   scope.db.from("tasks").select("id,titulo,descricao,status,due_date").eq("project_id",projectId).eq("organization_id",scope.organizationId).order("created_at",{ascending:false}).limit(80),
   scope.db.from("scrum_user_stories").select("id,title,description,workflow_stage,due_date").eq("project_id",projectId).eq("organization_id",scope.organizationId).order("created_at",{ascending:false}).limit(80),
   scope.db.from("risks").select("id,titulo,impacto,status").eq("project_id",projectId).eq("organization_id",scope.organizationId).order("created_at",{ascending:false}).limit(40),
   scope.db.from("decisions").select("id,titulo,status").eq("project_id",projectId).eq("organization_id",scope.organizationId).order("created_at",{ascending:false}).limit(40),
  ]);
  if([project,tasks,stories,risks,decisions].some(r=>r.error))
    return out({error:"Não foi possível consultar os registros operacionais para revisão."},503);
  const entries:Array<{kind:string;title:string;description:string;classification:string;dueDate:string;sourceReference:string;origin:string}>=[];
  const add=(kind:string,title:string,description:string,classification:string,dueDate:string,sourceReference:string,origin:string)=>{
   const cleanTitle=title.trim().slice(0,180);if(cleanTitle.length<3)return;
   entries.push({kind,title:cleanTitle,description:description.trim().slice(0,3000),classification,dueDate:dueDate.slice(0,10),sourceReference,origin});
  };
  if(project.data?.objetivo) add("objective",String(project.data.nome||"Objetivo do projeto"),String(project.data.objetivo),"in_progress","","project:"+projectId,"Projeto");
  for(const row of tasks.data||[]){
   const done=["concluida","done"].includes(row.status);
   add(done?"deliverable":"next_step",row.titulo,row.descricao||"",done?"in_progress":"in_progress",row.due_date||"","task:"+row.id,"Atividade");
  }
  for(const row of stories.data||[]){
   add(row.workflow_stage==="closed"?"deliverable":"next_step",row.title,row.description||"","in_progress",row.due_date||"","story:"+row.id,"User Story");
  }
  for(const row of risks.data||[])add("risk",row.titulo,row.impacto||"","in_progress","","risk:"+row.id,"Risco");
  for(const row of decisions.data||[])add("next_step",row.titulo,"Decisão registrada, validar contexto e divulgação.","in_progress","","decision:"+row.id,"Decisão");
  // Public facts and proposed drafts are managed separately; suggestions are never persisted.
  return out({data:entries.slice(0,160)});
 }
 const cols=manage?"id,kind,title,description,classification,due_date,source_reference,approved_for_client,approved_at,created_at":
    "id,kind,title,description,classification,due_date,approved_for_client,approved_at";
 const query=scope.db.from("project_report_public_facts").select(cols)
  .eq("project_id",projectId).eq("organization_id",scope.organizationId)
  .order("created_at",{ascending:false}).limit(200);
 const records=manage?query:query.eq("approved_for_client",true);
 const result=await records;
 if(result.error)return out({error:"Classificações públicas ainda não disponíveis. Verifique a migration REP-01."},503);
 return out({data:result.data||[]});
}
export async function POST(request:NextRequest){
 const auth=await requireApiAuth(request);if(!auth.ok)return auth.response;
 const data=await request.json().catch(()=>null) as Record<string,unknown>|null;
 if(!data||Array.isArray(data)||typeof data!=="object")return out({error:"Dados inválidos."},400);
 const projectId=String(data.projectId||"");
 const scope=await getReportScope(auth.context,projectId,true);if("error" in scope)return out({error:scope.error},scope.status);
 if(!["owner","editor"].includes(scope.role))return out({error:"Aprovação pública restrita ao responsável do projeto."},403);
 const action=String(data.action||"");
 if(action==="create"){
  const kind=String(data.kind||""),classification=String(data.classification||"");
  const title=String(data.title||"").trim(),description=String(data.description||"").trim();
  const due=String(data.dueDate||"");
  if(!kinds.includes(kind)||!states.includes(classification)||title.length<3||title.length>180||description.length>3000
     ||due&&!/^\d{4}-\d{2}-\d{2}$/.test(due))return out({error:"Classificação, título, descrição ou prazo inválidos."},400);
  const record={
   organization_id:scope.organizationId,project_id:projectId,kind,title,description,classification,
   due_date:due||null,source_reference:String(data.sourceReference||"").trim().slice(0,500)||null,
   approved_for_client:false,created_by:auth.context.userId
  };
  const existing=await scope.db.from("project_report_public_facts").select("id")
   .eq("organization_id",scope.organizationId).eq("project_id",projectId)
   .eq("kind",kind).ilike("title",title).limit(1);
  if(existing.error)return out({error:"Não foi possível verificar duplicidade."},503);
  if(existing.data?.length)return out({error:"Já existe uma classificação com esse título e tipo."},409);
  const added=await scope.db.from("project_report_public_facts").insert(record).select("id,kind,title,approved_for_client").single();
  return added.error?out({error:"Falha ao registrar classificação."},503):out({data:added.data},201);
 }
 if(action!=="approve"&&action!=="withdraw")return out({error:"Operação desconhecida."},400);
 const recordId=String(data.id||"");
 if(!uuid.test(recordId))return out({error:"Registro inválido."},400);
 const previous=await scope.db.from("project_report_public_facts").select("id,title,approved_for_client")
  .eq("id",recordId).eq("project_id",projectId).eq("organization_id",scope.organizationId).maybeSingle();
 if(previous.error||!previous.data)return out({error:"Classificação não encontrada."},404);
 if(action==="approve"&&String(data.confirmTitle||"").trim()!==previous.data.title)
  return out({error:"Confirme o título exato antes de liberar a divulgação externa."},400);
 const enabled=action==="approve";
 if(previous.data.approved_for_client===enabled)return out({data:{id:recordId,approved_for_client:enabled}});
 const changed=await scope.db.from("project_report_public_facts").update({
  approved_for_client:enabled,approved_by:enabled?auth.context.userId:null,
  approved_at:enabled?new Date().toISOString():null,updated_by:auth.context.userId,
  updated_at:new Date().toISOString()
 }).eq("id",recordId).eq("organization_id",scope.organizationId).eq("project_id",projectId)
  .eq("approved_for_client",!enabled).select("id,approved_for_client").single();
 return changed.error?out({error:"Falha na alteração de visibilidade."},409):out({data:changed.data});
}
