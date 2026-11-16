import type {ClientReportFact} from "@/lib/scrum/report-data";
import {executiveRiskTitle} from "@/lib/reports/risk-editorial";
import {getSupabaseServerClient} from "@/lib/supabase/server";

type DB=NonNullable<ReturnType<typeof getSupabaseServerClient>>;
type Candidate=ClientReportFact;
const text=(value:unknown,max=180)=>String(value||"").trim().slice(0,max);
const status=(state:unknown):ClientReportFact["classification"]=>
 ["closed","done","concluida","resolved","concluido"].includes(String(state).toLowerCase())?"confirmed":
 ["active","doing","em_andamento","in_progress"].includes(String(state).toLowerCase())?"in_progress":"hypothesis";
export async function getClientReportCandidates(db:DB,org:string,projectId:string):Promise<Candidate[]>{
 const [project,epics,stories,sprints,tasks,risks,decisions,approvedFacts]=await Promise.all([
  db.from("projects").select("id,nome,objetivo").eq("id",projectId).eq("organization_id",org).maybeSingle(),
  db.from("scrum_backlog_items").select("id,title,item_type,state").eq("project_id",projectId).eq("organization_id",org).in("item_type",["epic","feature"]).limit(300),
  db.from("scrum_user_stories").select("id,title,workflow_stage").eq("project_id",projectId).eq("organization_id",org).limit(500),
  db.from("scrum_sprints").select("id,name,status,start_date,end_date").eq("project_id",projectId).eq("organization_id",org).limit(120),
  db.from("tasks").select("id,titulo,status").eq("project_id",projectId).eq("organization_id",org).limit(500),
  db.from("risks").select("id,titulo,status").eq("project_id",projectId).eq("organization_id",org).limit(200),
  db.from("decisions").select("id,titulo,status").eq("project_id",projectId).eq("organization_id",org).limit(200),
  db.from("project_report_public_facts").select("id,kind,title,description,classification,due_date,source_reference").eq("project_id",projectId).eq("organization_id",org).eq("approved_for_client",true).limit(200),
 ]);
 if([project,epics,stories,sprints,tasks,risks,decisions,approvedFacts].some(x=>x.error))throw Error("Fontes de conteúdo do Cliente indisponíveis.");
 const candidates:Candidate[]=[];
 const add=(id:string,kind:ClientReportFact["kind"],title:string,classification:ClientReportFact["classification"],description="",source_reference?:string)=>{
  if(!title.trim())return;
  candidates.push({id,kind,title:text(title),description:text(description,350),classification,due_date:null,source_reference:source_reference||id});
 };
 // Only public-oriented summaries. Never copy internal descriptions, notes, comments,
 // responsible names, impediments, risk mitigations or meeting transcripts.
 if(project.data?.objetivo)add("project:"+projectId,"objective",text(project.data.objetivo,180),"in_progress","Objetivo cadastrado no projeto.");
 for(const x of epics.data||[])add(x.item_type+":"+x.id,"deliverable",x.title,status(x.state),x.item_type==="epic"?"Épico do escopo do projeto.":"Feature do escopo do projeto.");
 for(const x of stories.data||[])add("story:"+x.id,"deliverable",x.title,status(x.workflow_stage),"História de Usuário · "+text(x.workflow_stage));
 for(const x of sprints.data||[])add("sprint:"+x.id,"milestone",x.name,status(x.status),"Sprint · "+text(x.status)+" · "+text(x.start_date)+" a "+text(x.end_date));
 for(const x of tasks.data||[])add("task:"+x.id,"deliverable",x.titulo,status(x.status),"Atividade · "+text(x.status));
 for(const x of risks.data||[])add("risk:"+x.id,"risk",executiveRiskTitle(x.titulo),status(x.status),"Ponto de atenção cadastrado no projeto.");
 for(const x of decisions.data||[])add("decision:"+x.id,"next_step",x.titulo,status(x.status),"Decisão registrada · "+text(x.status));
 for(const x of approvedFacts.data||[])candidates.push({...x,id:"fact:"+x.id,source_reference:x.source_reference||null});
 return candidates;
}
