import { getSupabaseServerClient } from "@/lib/supabase/server";
import { listProjects } from "@/services/project-service";
import { TENANT_SCHEMA_READY, requireEffectiveTenant } from "@/lib/tenant-runtime";
import { CONSULT_ORG_ID } from "@/lib/consult-workspace";

export type DailyTask = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  priority: "baixa" | "media" | "alta" | "critica";
  status: "aberta" | "em_andamento" | "concluida";
  responsible: string | null;
  dueDate: string | null;
  selectedAt: string;
  source: "daily" | "sprint" | "both";
  blocked: boolean;
  workflowStage: string | null;
};
export type DailySnapshot = { tasks: DailyTask[] };

const normalizePriority=(v:string):DailyTask["priority"]=>v==="baixa"||v==="alta"||v==="critica"?v:"media";
const normalizeStatus=(v:string):DailyTask["status"]=>v==="concluida"||v==="em_andamento"?v:"aberta";

export async function getDailySnapshot(userId:string,userEmail?:string|null):Promise<DailySnapshot>{
  const db=getSupabaseServerClient();
  if(!db)throw new Error("Banco indisponível para consulta da Daily.");
  // Never trust task_daily_selections alone: scope results to current authorized tenant/projects.
  const projects=(await listProjects(userId,userEmail)).filter(p=>p.status==="ativo");
  if(!projects.length)return {tasks:[]};
  const ids=projects.map(p=>p.id);
  const orgId=TENANT_SCHEMA_READY?await requireEffectiveTenant(userId):CONSULT_ORG_ID;
  const selected=await db.from("task_daily_selections").select("task_id,selected_at")
    .eq("user_id",userId).order("selected_at",{ascending:true}).limit(500);
  if(selected.error)throw new Error("Falha ao consultar seleções da Daily.");
  const selectedAt=new Map((selected.data||[]).map(r=>[r.task_id,r.selected_at]));
  // Daily acompanha exclusivamente as atividades do Kanban operacional selecionadas pelo usuário.
  // User Stories de Scrum são geridas no Kanban de US, sem misturar as duas bases.
  const wanted=new Set(selectedAt.keys());
  if(!wanted.size)return {tasks:[]};
  const authorized=await db.from("tasks")
    .select("id,project_id,titulo,descricao,prioridade,status,responsavel,due_date")
    .eq("organization_id",orgId).in("project_id",ids).in("id",Array.from(wanted)).limit(1000);
  if(authorized.error)throw new Error("Falha ao buscar tarefas autorizadas da Daily.");
  const names=new Map(projects.map(p=>[p.id,p.name]));
  const tasks=(authorized.data||[]).map(t=>{
    return {
      id:t.id,projectId:t.project_id,projectName:names.get(t.project_id)||"Projeto",
      title:t.titulo,description:t.descricao||"",priority:normalizePriority(t.prioridade),
      status:normalizeStatus(t.status),responsible:t.responsavel||null,dueDate:t.due_date||null,
      selectedAt:selectedAt.get(t.id)||"",source:"daily",
      blocked:false,workflowStage:null
    } as DailyTask;
  });
  tasks.sort((a,b)=>a.projectName.localeCompare(b.projectName)||a.title.localeCompare(b.title));
  return {tasks};
}
