import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getReportScope} from "@/lib/scrum/report-data";
import {getApprovedRiskFields} from "@/lib/reports/risk-report-html";
import {isVagueNextStep} from "@/lib/reports/editorial-rules";

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
  const [project,tasks,stories,risks,decisions,epics,sprints]=await Promise.all([
   scope.db.from("projects").select("id,nome,objetivo,descricao").eq("id",projectId).eq("organization_id",scope.organizationId).maybeSingle(),
   scope.db.from("tasks").select("id,titulo,descricao,status,due_date").eq("project_id",projectId).eq("organization_id",scope.organizationId).order("created_at",{ascending:false}).limit(80),
   scope.db.from("scrum_user_stories").select("id,title,description,workflow_stage,due_date").eq("project_id",projectId).eq("organization_id",scope.organizationId).order("created_at",{ascending:false}).limit(80),
   scope.db.from("risks").select("id,titulo,impacto,mitigacao,probabilidade,status").eq("project_id",projectId).eq("organization_id",scope.organizationId).order("created_at",{ascending:false}).limit(40),
   scope.db.from("decisions").select("id,titulo,contexto,status").eq("project_id",projectId).eq("organization_id",scope.organizationId).order("created_at",{ascending:false}).limit(40),
   scope.db.from("scrum_backlog_items").select("id,title,description,state,actual_end_date").eq("project_id",projectId).eq("organization_id",scope.organizationId).eq("item_type","epic").order("created_at",{ascending:false}).limit(60),
   scope.db.from("scrum_sprints").select("id,name,goal,status,start_date,end_date").eq("project_id",projectId).eq("organization_id",scope.organizationId).order("start_date",{ascending:false}).limit(60),
  ]);
  if([project,tasks,stories,risks,decisions,epics,sprints].some(r=>r.error))
    return out({error:"Não foi possível consultar os registros operacionais para revisão."},503);
  const entries:Array<{kind:string;title:string;description:string;classification:string;dueDate:string;sourceReference:string;origin:string;internalContext?:string}>=[];
  const add=(kind:string,title:string,description:string,classification:string,dueDate:string,sourceReference:string,origin:string,internalContext?:string)=>{
   const cleanTitle=title.trim().slice(0,180);if(cleanTitle.length<3)return;
   entries.push({kind,title:cleanTitle,description:description.trim().slice(0,3000),classification,dueDate:dueDate.slice(0,10),sourceReference,origin,internalContext});
  };
  if(project.data?.objetivo) add("objective",String(project.data.nome||"Objetivo do projeto"),String(project.data.objetivo),"in_progress","","project:"+projectId,"Projeto");
  // An epic represents planned scope; it is not evidence of accepted delivery.
  for(const row of epics.data||[]){
   const completion=row.actual_end_date?"Conclusão registrada: "+row.actual_end_date+". ":"";
   add("deliverable",row.title,completion+(row.description||"Escopo do épico cadastrado. Confirmar o que foi efetivamente entregue."),"in_progress","","epic:"+row.id,"Épico · revisar entrega");
  }
  for(const row of sprints.data||[]){
   const period=(row.start_date||"A definir")+" a "+(row.end_date||"A definir");
   add("milestone",row.name,"Período: "+period+". Situação: "+row.status+". "+(row.goal||"Meta não cadastrada."),"in_progress",row.end_date||"","sprint:"+row.id,"Sprint · revisar marco");
  }
  for(const row of tasks.data||[]){
   const done=["concluida","done"].includes(row.status);
   add(done?"deliverable":"next_step",row.titulo,row.descricao||"","in_progress",row.due_date||"","task:"+row.id,"Atividade");
  }
  for(const row of stories.data||[]){
   add(row.workflow_stage==="closed"?"deliverable":"next_step",row.title,row.description||"","in_progress",row.due_date||"","story:"+row.id,"User Story");
  }
  for(const row of risks.data||[]){
   // Explicitly show the source information to the editor before authorization.
   // Impact may be a severity label, not a consequence: never invent one.
   const publicText="Ponto de atenção: "+row.titulo+
     (row.mitigacao?.trim()?"\\nMedida registrada: "+row.mitigacao.trim():"");
   add("risk",row.titulo,publicText,"in_progress","","risk:"+row.id,"Risco",
     "Avaliação: impacto "+(row.impacto||"não informado")+", probabilidade "+(row.probabilidade||"não informada")+
     ". Situação do risco: "+row.status+". A execução da mitigação não é confirmada por esses dados.");
  }
  // Decisões não representam automaticamente ações futuras. Próximos passos devem ser registrados com finalidade própria.
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
 if(action==="publish"){
  // One explicit click is authorization. Server checks both editor role and tenant-scoped source.
  const kind=String(data.kind||""),classification=String(data.classification||"");
  const title=String(data.title||"").trim(),description=String(data.description||"").trim();
  const due=String(data.dueDate||"");
  const sourceReference=String(data.sourceReference||"").trim();
  const id=String(data.id||"");
  if(!kinds.includes(kind)||!states.includes(classification)||title.length<3||title.length>180||
      description.length>3000||(due&&!/^\d{4}-\d{2}-\d{2}$/.test(due))||
      sourceReference.length>500||(id&&!uuid.test(id)))
    return out({error:"Campos de publicação inválidos."},400);
  if(kind==="risk"){
   if(!/^risk:[0-9a-f-]{36}$/i.test(sourceReference))return out({error:"Para publicar risco, vincule-o ao cadastro oficial do projeto."},400);
   // The source risk has already been checked against this project and tenant below.
   // One explicit publication action approves only the content shown to the editor.
   // Consequence and execution stage are optional, as they are not required fields
   // in the official risk registry. An absent field is never invented.
   if(!getApprovedRiskFields(description).point)
    return out({error:"Selecione o risco do projeto ou informe um ponto de atenção antes de publicar."},422);
  }
  if(kind==="next_step"&&isVagueNextStep(title,description))return out({error:"Descreva o próximo passo como ação objetiva e sua finalidade. Não informe prazo ou responsável sem confirmação."},422);
  // Untrusted source references cannot bypass tenant boundaries.
  if(sourceReference){
   const matched=/^(project|task|story|epic|sprint|risk|decision):([0-9a-f-]{36})$/i.exec(sourceReference);
   const kairos=sourceReference==="kairos:proposta:"+projectId;
   if(!matched&&!kairos)return out({error:"Origem da informação inválida."},400);
   if(matched){
    const tables:Record<string,string>={project:"projects",task:"tasks",story:"scrum_user_stories",epic:"scrum_backlog_items",sprint:"scrum_sprints",risk:"risks",decision:"decisions"};
    const source=await scope.db.from(tables[matched[1]]).select("id")
      .eq("id",matched[2]).eq("organization_id",scope.organizationId)
      .eq(matched[1]==="project"?"id":"project_id",projectId)
      .maybeSingle();
    if(source.error||!source.data)return out({error:"Origem não vinculada ao projeto selecionado."},403);
    if(matched[1]==="epic"){
     const epic=await scope.db.from("scrum_backlog_items").select("item_type").eq("id",matched[2])
       .eq("project_id",projectId).eq("organization_id",scope.organizationId).single();
     if(epic.error||epic.data?.item_type!=="epic")return out({error:"Origem não é um épico válido."},403);
    }
   }
  }
  const now=new Date().toISOString();
  const record={
   kind,title,description,classification,due_date:due||null,source_reference:sourceReference||null,
   approved_for_client:true,approved_by:auth.context.userId,approved_at:now,
   updated_by:auth.context.userId,updated_at:now
  };
  if(id){
   const current=await scope.db.from("project_report_public_facts").select("id,approved_for_client,source_reference")
     .eq("id",id).eq("project_id",projectId).eq("organization_id",scope.organizationId).maybeSingle();
   if(current.error||!current.data)return out({error:"Registro não encontrado neste projeto."},404);
   // An existing fact cannot be rebound to an unrelated operational record.
   if((current.data.source_reference||"")!==sourceReference)
    return out({error:"A referência original não pode ser alterada."},409);
   const changed=await scope.db.from("project_report_public_facts").update(record).eq("id",id)
     .eq("project_id",projectId).eq("organization_id",scope.organizationId).select("id,approved_for_client").single();
   return changed.error?out({error:"Não foi possível publicar a alteração."},503):out({data:changed.data});
  }
  if(sourceReference){
   const existing=await scope.db.from("project_report_public_facts").select("id")
     .eq("project_id",projectId).eq("organization_id",scope.organizationId)
     .eq("source_reference",sourceReference).limit(1);
   if(existing.error)return out({error:"Não foi possível verificar a origem."},503);
   if(existing.data?.length)return out({error:"Esta informação já está registrada. Use Publicar ou Editar no registro existente."},409);
  }
  const existingTitle=await scope.db.from("project_report_public_facts").select("id")
   .eq("project_id",projectId).eq("organization_id",scope.organizationId).eq("kind",kind).ilike("title",title).limit(1);
  if(existingTitle.error)return out({error:"Não foi possível verificar duplicidade."},503);
  if(existingTitle.data?.length)return out({error:"Já existe informação com esse título. Edite a existente."},409);
  const inserted=await scope.db.from("project_report_public_facts").insert({
   ...record,organization_id:scope.organizationId,project_id:projectId,created_by:auth.context.userId
  }).select("id,approved_for_client").single();
  return inserted.error?out({error:"Não foi possível publicar a informação."},503):out({data:inserted.data},201);
 }
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
