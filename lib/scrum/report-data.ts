import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProjectAccessRole, getProjectById } from "@/services/project-service";
import { requireEffectiveTenant, TENANT_SCHEMA_READY } from "@/lib/tenant-runtime";
import { CONSULT_ORG_ID } from "@/lib/consult-workspace";

export type ReportAudience="client"|"internal";
export type ScrumReportStory={id:string;sprint_id:string|null;title:string;workflow_stage:string;story_points:number|null;due_date:string|null;actual_end_date:string|null;blocked:boolean;blocker_reason:string;responsible:string|null};
export type ScrumReportTask={id:string;story_id:string|null;title:string;state:string;responsible:string|null};
export type ScrumReportSprint={id:string;name:string;goal:string;status:string;start_date:string;end_date:string;stories:number;closed:number;resolved:number;active:number;blocked:number;overdue:number;points_planned:number;points_done:number;delivery_planned:number;delivery_actual:number;delivery_on_time:number;delivery_late:number};
export type ReportData={project:{id:string;name:string};generated_at:string;scope:"current_snapshot";kanban:{total:number;todo:number;doing:number;done:number;overdue:number};scrum:{enabled:boolean;sprints:ScrumReportSprint[];backlog_stories:number;stories_total:number;tasks_total:number;tasks_done:number};internal?:{stories:ScrumReportStory[];tasks:ScrumReportTask[]}};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type DB=NonNullable<ReturnType<typeof getSupabaseServerClient>>;
export async function getReportScope(auth:{userId:string;userEmail:string},projectId:string,write=false){
 if(!uuid.test(projectId))return {error:"Projeto inválido.",status:400} as const;
 const project=await getProjectById({projectId,userId:auth.userId,userEmail:auth.userEmail});
 if(!project)return {error:"Projeto indisponível.",status:404} as const;
 const role=await getProjectAccessRole({projectId,userId:auth.userId,userEmail:auth.userEmail});
 if(role==="none"||(write&&!["owner","editor"].includes(role)))return {error:"Permissão insuficiente.",status:403} as const;
 const db=getSupabaseServerClient();if(!db)return {error:"Banco indisponível.",status:503} as const;
 const organizationId=TENANT_SCHEMA_READY?await requireEffectiveTenant(auth.userId):CONSULT_ORG_ID;
 return {db,organizationId,project} as const;
}
export async function loadReportData(db:DB,org:string,projectId:string,audience:ReportAudience):Promise<ReportData>{
 const [project,sprints,stories,tasks,kanban]=await Promise.all([
  db.from("projects").select("id,nome").eq("id",projectId).eq("organization_id",org).single(),
  db.from("scrum_sprints").select("id,name,goal,status,start_date,end_date").eq("project_id",projectId).eq("organization_id",org).order("start_date",{ascending:false}).limit(100),
  db.from("scrum_user_stories").select("id,sprint_id,title,workflow_stage,story_points,due_date,actual_end_date,blocked,blocker_reason,responsible").eq("project_id",projectId).eq("organization_id",org).limit(1000),
  db.from("scrum_backlog_items").select("id,story_id,title,state,responsible").eq("project_id",projectId).eq("organization_id",org).eq("item_type","task").limit(2000),
  db.from("tasks").select("id,status,due_date").eq("project_id",projectId).eq("organization_id",org).limit(2000),
 ]);
 if([project,sprints,stories,tasks,kanban].some(r=>r.error))throw Error("Dados de projetos, Scrum ou Kanban indisponíveis.");
 const allStories=(stories.data||[]) as ScrumReportStory[];
 const allTasks=(tasks.data||[]) as ScrumReportTask[];
 const kanbanRows=kanban.data||[];
 const now=new Date().toISOString().slice(0,10);
 const metrics=(sprints.data||[]).map(s=>{
  const assigned=allStories.filter(st=>st.sprint_id===s.id);
  const done=assigned.filter(st=>st.workflow_stage==="closed");
  const delivered=assigned.filter(st=>Boolean(st.actual_end_date));
  const planned=assigned.filter(st=>Boolean(st.due_date));
  return {
   id:s.id,name:s.name,goal:s.goal||"",status:s.status,start_date:s.start_date,end_date:s.end_date,
   stories:assigned.length,closed:done.length,resolved:assigned.filter(st=>st.workflow_stage==="resolved").length,
   active:assigned.filter(st=>st.workflow_stage==="active").length,blocked:assigned.filter(st=>st.blocked).length,
   overdue:assigned.filter(st=>st.workflow_stage!=="closed"&&st.due_date&&st.due_date<now).length,
   points_planned:assigned.reduce((sum,st)=>sum+Number(st.story_points||0),0),
   points_done:done.reduce((sum,st)=>sum+Number(st.story_points||0),0),
   delivery_planned:planned.length,delivery_actual:delivered.length,
   delivery_on_time:delivered.filter(st=>st.due_date&&st.actual_end_date!<=st.due_date).length,
   delivery_late:delivered.filter(st=>st.due_date&&st.actual_end_date!>st.due_date).length
  };
 });
 return {
  project:{id:projectId,name:project.data?.nome||"Projeto"},
  generated_at:new Date().toISOString(),scope:"current_snapshot",
  kanban:{
   total:kanbanRows.length,
   todo:kanbanRows.filter(t=>t.status==="aberta"||t.status==="todo"||t.status==="to_do").length,
   doing:kanbanRows.filter(t=>t.status==="em_andamento"||t.status==="doing").length,
   done:kanbanRows.filter(t=>t.status==="concluida"||t.status==="done").length,
   overdue:kanbanRows.filter(t=>t.due_date&&t.due_date<now&&!["concluida","done"].includes(t.status)).length
  },
  scrum:{enabled:metrics.length>0,sprints:metrics,backlog_stories:allStories.filter(st=>!st.sprint_id).length,stories_total:allStories.length,tasks_total:allTasks.length,tasks_done:allTasks.filter(t=>t.state==="done").length},
  ...(audience==="internal"?{internal:{stories:allStories,tasks:allTasks}}:{})
 };
}
