import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getProjectAccessRole, getProjectById, listProjects } from "@/services/project-service";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { updateTaskCard, listTaskBoard } from "@/services/task-board-service";
import { TENANT_SCHEMA_READY, requireEffectiveTenant } from "@/lib/tenant-runtime";
import { CONSULT_ORG_ID } from "@/lib/consult-workspace";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: unknown): s is string => typeof s === "string" && datePattern.test(s) && !Number.isNaN(Date.parse(s + "T12:00:00Z")) && new Date(s + "T12:00:00Z").toISOString().slice(0,10) === s;
const response = (data: unknown, status=200) => NextResponse.json(data,{status,headers:noStore});
const invalid = (message: string, status=400) => response({error:message},status);
const stages = ["new","review","rework","ready","active","resolved","closed","rejected"];
const transitions:Record<string,string[]>={
  new:["review"],review:["ready","rework"],rework:["review"],
  ready:["active","rejected","rework"],active:["resolved","rework"],
  resolved:["closed","rework","rejected"],closed:[],rejected:[]
};
const states = ["planned","active","closed"];

async function context(request: NextRequest, projectId: string, edit = false) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return {error:auth.response} as const;
  if (!uuid.test(projectId)) return {error:invalid("Projeto inválido.")} as const;
  const project = await getProjectById({userId:auth.context.userId,userEmail:auth.context.userEmail,projectId});
  if (!project) return {error:invalid("Projeto não encontrado.",404)} as const;
  const role = await getProjectAccessRole({userId:auth.context.userId,userEmail:auth.context.userEmail,projectId});
  if (role==="none" || edit && !["owner","editor"].includes(role)) return {error:invalid("Operação não autorizada.",403)} as const;
  const organizationId = TENANT_SCHEMA_READY ? await requireEffectiveTenant(auth.context.userId) : CONSULT_ORG_ID;
  const db = getSupabaseServerClient();
  if (!db) return {error:invalid("Banco indisponível.",503)} as const;
  return {db, auth:auth.context, organizationId, project} as const;
}

export async function GET(request:NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId") || "";
  if (!projectId) {
    const auth=await requireApiAuth(request); if(!auth.ok)return auth.response;
    const projects=await listProjects(auth.context.userId,auth.context.userEmail);
    return response({data:projects.filter(p=>p.status==="ativo").map(p=>({id:p.id,name:p.name}))});
  }
  const ctx=await context(request,projectId);
  if("error" in ctx)return ctx.error;
  const {db,organizationId}=ctx;
  const [sprints,boardTasks]=await Promise.all([
    db.from("scrum_sprints").select("id,name,goal,status,start_date,end_date,created_at").eq("project_id",projectId).eq("organization_id",organizationId).order("start_date",{ascending:false}),
    db.from("tasks").select("id,titulo,descricao,status,prioridade,responsavel,due_date,created_at").eq("project_id",projectId).eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(500)
  ]);
  if(sprints.error)return invalid("Estrutura Scrum indisponível. Verifique a migration de Sprints: "+sprints.error.code,503);
  if(boardTasks.error)return invalid("Não foi possível carregar as atividades do projeto.",503);
  const ids=(sprints.data||[]).map(s=>s.id);
  const linked=ids.length ? await db.from("scrum_sprint_tasks").select("sprint_id,task_id,planned_start_date,planned_end_date,duration_days,story_points,workflow_stage,blocked,blocker_reason").eq("organization_id",organizationId).eq("project_id",projectId).in("sprint_id",ids) : {data:[],error:null};
  if(linked.error)return invalid("Falha ao consultar as US da Sprint.",503);
  return response({data:{sprints:sprints.data||[],tasks:boardTasks.data||[],items:linked.data||[]}});
}

export async function POST(request:NextRequest) {
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body || typeof body!=="object" || Array.isArray(body))return invalid("Dados inválidos.");
  const projectId=String(body.projectId||"");
  const ctx=await context(request,projectId,true);
  if("error" in ctx)return ctx.error;
  const {db,organizationId}=ctx;
  if(body.action==="create_sprint"){
    const name=typeof body.name==="string"?body.name.trim():"";
    if(name.length<2||name.length>140||!validDate(body.startDate)||!validDate(body.endDate)||body.endDate<body.startDate)return invalid("Nome ou período da Sprint inválido.");
    const added=await db.from("scrum_sprints").insert({organization_id:organizationId,project_id:projectId,name,goal:typeof body.goal==="string"?body.goal.slice(0,2000):"",start_date:body.startDate,end_date:body.endDate}).select("id").single();
    return added.error?invalid("Não foi possível cadastrar Sprint: "+added.error.code,409):response({data:added.data},201);
  }
  if(body.action==="update_sprint"){
    if(!uuid.test(String(body.sprintId||"")) || !states.includes(String(body.status||"")))return invalid("Sprint ou status inválido.");
    const id=String(body.sprintId);
    const current=await db.from("scrum_sprints").select("status").eq("id",id).eq("project_id",projectId).eq("organization_id",organizationId).maybeSingle();
    if(current.error||!current.data)return invalid("Sprint não encontrada.",404);
    if(current.data.status==="closed")return invalid("Sprint encerrada não pode ser reaberta ou modificada.",409);
    if(body.status==="closed"&&current.data.status!=="active")return invalid("Ative a Sprint antes de encerrá-la.",409);
    const changed=await db.from("scrum_sprints").update({status:body.status,updated_at:new Date().toISOString()}).eq("id",id).eq("project_id",projectId).eq("organization_id",organizationId).select("id").maybeSingle();
    return changed.error?invalid("Erro ao atualizar Sprint: "+changed.error.code,409):!changed.data?invalid("Sprint não encontrada.",404):response({data:changed.data});
  }
  if(body.action==="unlink_task"){
    const sprintId=String(body.sprintId||""),taskId=String(body.taskId||"");
    if(!uuid.test(sprintId)||!uuid.test(taskId))return invalid("IDs inválidos.");
    const guard=await db.from("scrum_sprints").select("status").eq("id",sprintId).eq("organization_id",organizationId).eq("project_id",projectId).maybeSingle();
    if(guard.error||!guard.data)return invalid("Sprint não encontrada.",404);
    if(guard.data.status==="closed")return invalid("Sprint encerrada: não é permitido remover suas US.",409);
    const deleted=await db.from("scrum_sprint_tasks").delete().eq("organization_id",organizationId).eq("project_id",projectId).eq("sprint_id",sprintId).eq("task_id",taskId).select("task_id");
    return deleted.error?invalid("Falha ao remover US da Sprint.",409):response({data:deleted.data});
  }
  if(body.action==="upsert_task"){
    const sprintId=String(body.sprintId||""),taskId=String(body.taskId||"");
    if(!uuid.test(sprintId)||!uuid.test(taskId))return invalid("IDs inválidos.");
    const [sprint,task]=await Promise.all([
      db.from("scrum_sprints").select("id,status,start_date,end_date").eq("id",sprintId).eq("organization_id",organizationId).eq("project_id",projectId).maybeSingle(),
      db.from("tasks").select("id,project_id").eq("id",taskId).eq("organization_id",organizationId).eq("project_id",projectId).maybeSingle()
    ]);
    if(sprint.error||task.error||!sprint.data||!task.data)return invalid("Sprint ou atividade não pertence ao projeto.",404);
    if(sprint.data.status==="closed")return invalid("Sprint encerrada não pode receber alterações.",409);
    if(body.workflowStage!==undefined && !stages.includes(String(body.workflowStage)))return invalid("Etapa da US inválida.");
    const previous=await db.from("scrum_sprint_tasks").select("workflow_stage")
      .eq("sprint_id",sprintId).eq("task_id",taskId).eq("organization_id",organizationId).eq("project_id",projectId).maybeSingle();
    if(previous.error)return invalid("Falha ao verificar etapa atual da US.",503);
    if(body.workflowStage!==undefined){
      const current=previous.data?.workflow_stage||"new",next=String(body.workflowStage);
      if(!previous.data && next!=="new" || previous.data && next!==current && !transitions[current]?.includes(next))
        return invalid("Transição Scrum não permitida: "+current+" → "+next,409);
    }
    const start=body.startDate===undefined||body.startDate===null||body.startDate===""?null:body.startDate;
    const end=body.endDate===undefined||body.endDate===null||body.endDate===""?null:body.endDate;
    const duration=body.durationDays===undefined||body.durationDays===null||body.durationDays===""?null:Number(body.durationDays);
    if(start!==null&&!validDate(start)||end!==null&&!validDate(end)||start&&end&&end<start)return invalid("Datas de execução inválidas.");
    if(duration!==null&&(!Number.isInteger(duration)||duration<1||duration>3650))return invalid("Prazo deve ser de 1 a 3650 dias.");
    const points=body.storyPoints===null||body.storyPoints===""||body.storyPoints===undefined?null:Number(body.storyPoints);
    if(points!==null&&(!Number.isFinite(points)||points<0||points>9999))return invalid("Pontos inválidos.");
    const row:Record<string,unknown>={sprint_id:sprintId,task_id:taskId,project_id:projectId,organization_id:organizationId,updated_at:new Date().toISOString()};
    if(body.startDate!==undefined)row.planned_start_date=start;
    if(body.endDate!==undefined)row.planned_end_date=end;
    if(body.durationDays!==undefined)row.duration_days=duration;
    if(body.storyPoints!==undefined)row.story_points=points;
    if(body.workflowStage!==undefined)row.workflow_stage=body.workflowStage;
    if(body.blocked!==undefined)row.blocked=body.blocked===true;
    if(body.blockerReason!==undefined)row.blocker_reason=typeof body.blockerReason==="string"?body.blockerReason.slice(0,1500):"";
    // Scrum acceptance changes the original Kanban task, never a duplicate record.
    const nextStage=String(body.workflowStage||"");
    const priorStage=previous.data?.workflow_stage||"";
    const statusColumn:Record<string,"todo"|"doing"|"done">={
      active:"doing",closed:"done",rejected:"todo",rework:"todo"
    };
    if(nextStage && nextStage!==priorStage && statusColumn[nextStage]){
      const board=await listTaskBoard({userId:ctx.auth.userId,userEmail:ctx.auth.userEmail,projectId});
      const target=board?.columns.find(c=>c.key===statusColumn[nextStage]);
      if(!target)return invalid("Coluna necessária indisponível no Kanban.",409);
      const moved=await updateTaskCard({
        userId:ctx.auth.userId,userEmail:ctx.auth.userEmail,
        taskId,columnId:target.id,position:target.cards.length
      });
      if(!moved)return invalid("Não foi possível sincronizar o status com o Kanban.",409);
    }
    // Persist dates in one shared Kanban record, not in a duplicated Scrum card.
    // A failure here prevents reporting the item as successfully planned.
    if(end!==null&&body.endDate!==undefined){
      const updated=await updateTaskCard({userId:ctx.auth.userId,userEmail:ctx.auth.userEmail,taskId,dueDate:end});
      if(!updated)return invalid("Não foi possível atualizar o prazo no Kanban.",409);
    }
    const saved=await db.from("scrum_sprint_tasks").upsert(row,{onConflict:"sprint_id,task_id"}).select("task_id").single();
    return saved.error?invalid("Falha ao vincular US: "+saved.error.code,409):response({data:saved.data});
  }
  return invalid("Operação desconhecida.");
}
