import type {ClientReportFact} from "@/lib/scrum/report-data";
import {executiveRiskTitle} from "@/lib/reports/risk-editorial";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {listTaskBoard} from "@/services/task-board-service";
import {loadReportData} from "@/lib/scrum/report-data";
import {listDecisions} from "@/services/decision-service";

type DB=NonNullable<ReturnType<typeof getSupabaseServerClient>>;
type Candidate=ClientReportFact;
const text=(value:unknown,max=180)=>String(value||"").trim().slice(0,max);
const status=(state:unknown):ClientReportFact["classification"]=>
 ["closed","done","concluida","resolved","concluido"].includes(String(state).toLowerCase())?"confirmed":
 ["active","doing","em_andamento","in_progress"].includes(String(state).toLowerCase())?"in_progress":"hypothesis";
export async function getClientReportCandidates(db:DB,org:string,projectId:string,actor:{userId:string;userEmail:string|null}):Promise<Candidate[]>{
 const [project,risks,decisions,approvedFacts,board,report]=await Promise.all([
  db.from("projects").select("id,nome,objetivo").eq("id",projectId).eq("organization_id",org).maybeSingle(),
  db.from("risks").select("id,titulo,status").eq("project_id",projectId).eq("organization_id",org).limit(200),
  listDecisions(actor.userId,projectId),
  db.from("project_report_public_facts").select("id,kind,title,description,classification,due_date,source_reference").eq("project_id",projectId).eq("organization_id",org).limit(200),
  listTaskBoard({projectId,userId:actor.userId,userEmail:actor.userEmail}),
  loadReportData(db,org,projectId,"internal"),
 ]);
 if([project,risks,approvedFacts].some(x=>x.error)||!board)throw Error("Fontes de conteúdo do Cliente indisponíveis.");
 const candidates:Candidate[]=[];
 const add=(id:string,kind:ClientReportFact["kind"],title:string,classification:ClientReportFact["classification"],description="",source_reference?:string)=>{
  if(!title.trim())return;
  candidates.push({id,kind,title:text(title),description:text(description,350),classification,due_date:null,source_reference:source_reference||id});
 };
 // Only public-oriented summaries. Never copy internal descriptions, notes, comments,
 // responsible names, impediments, risk mitigations or meeting transcripts.
 if(project.data?.objetivo)add("project:"+projectId,"objective",text(project.data.objetivo,180),"in_progress","Objetivo cadastrado no projeto.");
 // Entregas pertencem exclusivamente ao Kanban do Projeto (tasks), nunca ao Scrum.
 for(const x of board.columns.flatMap(column=>column.cards))add("task:"+x.id,"deliverable",x.title,status(x.columnKey),"Atividade do Kanban do Projeto · "+({todo:"A fazer",doing:"Em andamento",done:"Concluída"} as Record<string,string>)[x.columnKey]);
 // US são detalhes automáticos do marco escolhido, não entregas do Kanban.
 for(const sprint of report.scrum.sprints){
  add("sprint:"+sprint.id,"milestone",sprint.name,status(sprint.status),"Sprint · "+text(sprint.status)+" · "+text(sprint.start_date)+" a "+text(sprint.end_date));
  for(const story of report.internal?.stories||[]){
   if(story.sprint_id!==sprint.id)continue;
   const stage=String(story.workflow_stage||"new").toLowerCase();
   const stageLabel=({new:"Nova",ready:"Pronta",active:"Em execução",resolved:"Aguardando validação",closed:"Concluída"} as Record<string,string>)[stage]||text(stage);
   const stageClassification=stage==="closed"?"confirmed":stage==="active"||stage==="resolved"?"in_progress":"hypothesis";
   add("story:"+story.id,"milestone","US: "+story.title,stageClassification,"Status da US: "+stageLabel,"sprint:"+sprint.id);
  }
 }
 for(const x of risks.data||[])add("risk:"+x.id,"risk",executiveRiskTitle(x.titulo),status(x.status),"Ponto de atenção cadastrado no projeto.");
 for(const x of decisions)add("decision:"+x.id,"next_step",x.title,status(x.status),"Decisão registrada · "+text(x.status));
 // Somente objetivos, benefícios e riscos editoriais complementam as fontes oficiais.\n // Entregas, Sprints e decisões são sempre lidas de seus próprios cadastros.
 for(const x of approvedFacts.data||[]){
  if(!["objective","benefit","risk"].includes(x.kind))continue;
  const classification=String(x.classification);
  candidates.push({
   id:"fact:"+x.id,kind:x.kind as ClientReportFact["kind"],title:text(x.title),
   description:text(x.description,3000),
   classification:(["confirmed","in_progress","hypothesis","ai_recommendation"].includes(classification)?classification:"hypothesis") as ClientReportFact["classification"],
   due_date:x.due_date||null,source_reference:x.source_reference||null
  });
 }
 // A versão editorial substitui a síntese automática da mesma origem, evitando duplicidade.
 const editorialSources=new Set((approvedFacts.data||[]).filter(x=>["objective","benefit","risk"].includes(x.kind)).map(x=>x.source_reference).filter(Boolean));
 return candidates.filter(item=>item.id.startsWith("fact:")||!editorialSources.has(item.source_reference));
}
