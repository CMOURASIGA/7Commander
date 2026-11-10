import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProjectAccessRole, getProjectById } from "@/services/project-service";
import { requireEffectiveTenant, TENANT_SCHEMA_READY } from "@/lib/tenant-runtime";
import { CONSULT_ORG_ID } from "@/lib/consult-workspace";

export type ReportAudience="client"|"internal";
export type ScrumReportStory={id:string;sprint_id:string|null;title:string;workflow_stage:string;story_points:number|null;due_date:string|null;actual_end_date:string|null;blocked:boolean;blocker_reason:string;responsible:string|null};
export type ScrumReportTask={id:string;story_id:string|null;title:string;state:string;responsible:string|null};
export type ScrumReportSprint={id:string;name:string;goal:string;status:string;start_date:string;end_date:string;stories:number;closed:number;resolved:number;active:number;blocked:number;overdue:number;points_planned:number;points_done:number;delivery_planned:number;delivery_actual:number;delivery_on_time:number;delivery_late:number};
export type ClientReportFact={kind:"objective"|"benefit"|"deliverable"|"milestone"|"risk"|"next_step";title:string;description:string;classification:"confirmed"|"in_progress"|"hypothesis"|"ai_recommendation";due_date:string|null;source_reference?:string|null};
export type ReportRiskAssessment={id:string;code:string;title:string;description:string;status:string;probability:number|null;impact:number|null;score:number|null;severity:"Baixo"|"Moderado"|"Alto"|"Crítico"|"Não avaliado";mitigation:string|null;owner:string|null;decisionId:string|null;taskId:string|null;lastUpdated:string|null};
export type ReportData={project:{id:string;name:string};generated_at:string;scope:"current_snapshot";publicFacts?:ClientReportFact[];publicFactsAvailable?:boolean;riskAssessments?:ReportRiskAssessment[];kanban:{total:number;todo:number;doing:number;done:number;overdue:number;completed_titles:string[]};governance:{risks_open:number;decisions_pending:number;client_risks:{title:string;status:string}[];client_decisions:{title:string;status:string}[]};scrum:{enabled:boolean;sprints:ScrumReportSprint[];backlog_stories:number;stories_total:number;tasks_total:number;tasks_done:number};internal?:{stories:ScrumReportStory[];tasks:ScrumReportTask[]}};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type DB=NonNullable<ReturnType<typeof getSupabaseServerClient>>;
export async function getReportScope(auth:{userId:string;userEmail:string|null},projectId:string,write=false){
 if(!uuid.test(projectId))return {error:"Projeto inválido.",status:400} as const;
 const project=await getProjectById({projectId,userId:auth.userId,userEmail:auth.userEmail});
 if(!project)return {error:"Projeto indisponível.",status:404} as const;
 const role=await getProjectAccessRole({projectId,userId:auth.userId,userEmail:auth.userEmail});
 if(role==="none"||(write&&!["owner","editor"].includes(role)))return {error:"Permissão insuficiente.",status:403} as const;
 const db=getSupabaseServerClient();if(!db)return {error:"Banco indisponível.",status:503} as const;
 const organizationId=TENANT_SCHEMA_READY?await requireEffectiveTenant(auth.userId):CONSULT_ORG_ID;
 return {db,organizationId,project,role} as const;
}
export async function loadReportData(db:DB,org:string,projectId:string,audience:ReportAudience):Promise<ReportData>{
 const [project,sprints,stories,tasks,kanban,risks,decisions,approvedFacts]=await Promise.all([
  db.from("projects").select("id,nome").eq("id",projectId).eq("organization_id",org).single(),
  db.from("scrum_sprints").select("id,name,goal,status,start_date,end_date").eq("project_id",projectId).eq("organization_id",org).order("start_date",{ascending:false}).limit(100),
  db.from("scrum_user_stories").select("id,sprint_id,title,workflow_stage,story_points,due_date,actual_end_date,blocked,blocker_reason,responsible").eq("project_id",projectId).eq("organization_id",org).limit(1000),
  db.from("scrum_backlog_items").select("id,story_id,title,state,responsible").eq("project_id",projectId).eq("organization_id",org).eq("item_type","task").limit(2000),
  db.from("tasks").select("id,titulo,status,due_date").eq("project_id",projectId).eq("organization_id",org).limit(2000),
  db.from("risks").select("id,titulo,status,probabilidade,impacto,mitigacao,responsavel,decision_id,task_id,updated_at").eq("project_id",projectId).eq("organization_id",org).limit(500),
  db.from("decisions").select("titulo,status").eq("project_id",projectId).eq("organization_id",org).limit(500),
  db.from("project_report_public_facts").select("kind,title,description,classification,due_date,source_reference").eq("project_id",projectId).eq("organization_id",org).eq("approved_for_client",true).order("created_at",{ascending:false}).limit(150),
 ]);
 if([project,sprints,stories,tasks,kanban,risks,decisions].some(r=>r.error))throw Error("Dados de projetos, Scrum ou Kanban indisponíveis.");
 // Resolve displayed owners only from profiles belonging to the effective tenant.
 const memberQuery=await db.from("organization_members").select("user_id").eq("organization_id",org).limit(500);
 const memberIds=(memberQuery.data||[]).map(m=>m.user_id).filter(Boolean);
 const profileQuery=memberIds.length?await db.from("profiles").select("user_id,email,nome").in("user_id",memberIds):null;
 const emailNames=new Map<string,string>();
 for(const person of (profileQuery?.data||[])){
  if(person.email&&person.nome?.trim())emailNames.set(person.email.trim().toLowerCase(),person.nome.trim());
 }
 const displayOwner=(value:string|null)=>value&&emailNames.has(value.toLowerCase())?emailNames.get(value.toLowerCase())!:value;
 const approvedRiskFacts=(approvedFacts.data||[]).filter(item=>item.kind==="risk"&&/^risk:[0-9a-f-]{36}$/i.test(item.source_reference||""));
 const riskPublicMap=new Map(approvedRiskFacts.map(item=>[item.source_reference?.slice(5),item]));
 const norm=(value:string|null):number|null=>{
  const normalized=String(value||"").trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  if(["1","baixa","baixo"].includes(normalized))return 1;
  if(["2","media","medio"].includes(normalized))return 2;
  if(["3","alta","alto"].includes(normalized))return 3;
  return null;
 };
 const riskAssessments:ReportRiskAssessment[]=(risks.data||[]).filter(r=>audience==="internal"||riskPublicMap.has(r.id)).map(r=>{
  const probability=norm(r.probabilidade);
  const impact=norm(r.impacto);
  const score=probability&&impact?probability*impact:null;
  const severity=score===null?"Não avaliado":score===9?"Crítico":score===6?"Alto":score>=3?"Moderado":"Baixo";
  const approved=riskPublicMap.get(r.id);
  return {
   id:r.id,code:"R-"+r.id.slice(0,12).toUpperCase(),
   title:audience==="client"?(approved?.title||"Risco autorizado"):r.titulo,
   description:audience==="client"?(approved?.description||""):(r.impacto||""),
   status:r.status,probability,impact,score,severity,
   mitigation:audience==="client"?null:r.mitigacao,
   owner:audience==="client"?null:displayOwner(r.responsavel),
   decisionId:audience==="client"?null:r.decision_id,
   taskId:audience==="client"?null:r.task_id,
   lastUpdated:r.updated_at||null
  } as ReportRiskAssessment;
 });
 const allStories=(stories.data||[]) as ScrumReportStory[];
 for(const story of allStories){if(story.responsible)story.responsible=displayOwner(story.responsible)||story.responsible;}
 const allTasks=(tasks.data||[]) as ScrumReportTask[];
 for(const task of allTasks){if(task.responsible)task.responsible=displayOwner(task.responsible)||task.responsible;}
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
  publicFacts:approvedFacts.error?[]:(approvedFacts.data||[]).map(fact=>audience==="client"?{kind:fact.kind,title:fact.title,description:fact.description,classification:fact.classification,due_date:fact.due_date}:fact) as ClientReportFact[],
  publicFactsAvailable:!approvedFacts.error,
  riskAssessments,
  kanban:{
   total:kanbanRows.length,
   completed_titles:audience==="internal"?kanbanRows.filter(t=>["concluida","done"].includes(t.status)).slice(0,12).map(t=>t.titulo):[],
   todo:kanbanRows.filter(t=>t.status==="aberta"||t.status==="todo"||t.status==="to_do").length,
   doing:kanbanRows.filter(t=>t.status==="em_andamento"||t.status==="doing").length,
   done:kanbanRows.filter(t=>t.status==="concluida"||t.status==="done").length,
   overdue:kanbanRows.filter(t=>t.due_date&&t.due_date<now&&!["concluida","done"].includes(t.status)).length
  },
  governance:{
   risks_open:(audience==="internal"?(risks.data||[]):riskAssessments).filter(r=>["aberto","em_mitigacao"].includes(r.status)).length,
   decisions_pending:(decisions.data||[]).filter(d=>["aberta","em_andamento"].includes(d.status)).length,
   client_risks:audience==="internal"?(risks.data||[]).filter(r=>["aberto","em_mitigacao"].includes(r.status)).slice(0,15).map(r=>({title:r.titulo,status:r.status})):[],
   client_decisions:audience==="internal"?(decisions.data||[]).filter(d=>["aberta","em_andamento"].includes(d.status)).slice(0,15).map(d=>({title:d.titulo,status:d.status})):[]
  },
  scrum:{enabled:metrics.length>0,sprints:audience==="internal"?metrics:[],backlog_stories:allStories.filter(st=>!st.sprint_id).length,stories_total:allStories.length,tasks_total:allTasks.length,tasks_done:allTasks.filter(t=>t.state==="done").length},
  ...(audience==="internal"?{internal:{stories:allStories,tasks:allTasks}}:{})
 };
}
