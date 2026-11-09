import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getProjectById,getProjectAccessRole} from "@/services/project-service";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {TENANT_SCHEMA_READY,requireEffectiveTenant} from "@/lib/tenant-runtime";
import {CONSULT_ORG_ID} from "@/lib/consult-workspace";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Kind="decision"|"risk"|"story"|"task"|"scrum_task"|"sprint"|"knowledge";
const tables:Record<Kind,string>={decision:"decisions",risk:"risks",story:"scrum_user_stories",task:"tasks",scrum_task:"scrum_backlog_items",sprint:"scrum_sprints",knowledge:"knowledge_base"};
const answer=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private,no-store"}});
type Context={params:Promise<{projectId:string}>};
export async function POST(req:NextRequest,{params}:Context){
 const auth=await requireApiAuth(req);if(!auth.ok)return auth.response;
 const {projectId}=await params;
 if(!uuid.test(projectId))return answer({error:"Projeto inválido."},400);
 const project=await getProjectById({projectId,userId:auth.context.userId,userEmail:auth.context.userEmail});
 if(!project)return answer({error:"Projeto indisponível."},404);
 const role=await getProjectAccessRole({projectId,userId:auth.context.userId,userEmail:auth.context.userEmail,verifiedProject:project});
 if(!["owner","editor"].includes(role))return answer({error:"Sem permissão."},403);
 const body=await req.json().catch(()=>null) as {meetingId?:unknown;recordId?:unknown;recordType?:unknown}|null;
 const meetingId=String(body?.meetingId??""),recordId=String(body?.recordId??"");
 const type=String(body?.recordType??"") as Kind;
 if(!uuid.test(meetingId)||!uuid.test(recordId)||!Object.hasOwn(tables,type))
  return answer({error:"Referência inválida."},400);
 const db=getSupabaseServerClient(),org=TENANT_SCHEMA_READY?await requireEffectiveTenant(auth.context.userId):CONSULT_ORG_ID;
 if(!db||!org)return answer({error:"Empresa indisponível."},503);
 const [meeting,linked]=await Promise.all([
  db.from("project_meetings").select("id").eq("id",meetingId).eq("project_id",projectId).eq("organization_id",org).maybeSingle(),
  db.from(tables[type]).select("id").eq("id",recordId).eq("project_id",projectId).eq("organization_id",org).maybeSingle()
 ]);
 if(type==="scrum_task"){
  const subtype=await db.from("scrum_backlog_items").select("item_type").eq("id",recordId).eq("project_id",projectId).eq("organization_id",org).maybeSingle();
  if(subtype.error||subtype.data?.item_type!=="task")return answer({error:"Task Scrum não encontrada."},404);
 }
 if(meeting.error||linked.error)return answer({error:"Não foi possível validar os vínculos."},503);
 if(!meeting.data||!linked.data)return answer({error:"Registro não encontrado nesta empresa/projeto."},404);
 const inserted=await db.from("project_meeting_links").upsert({
  organization_id:org,project_id:projectId,meeting_id:meetingId,
  record_type:type,record_id:recordId,created_by:auth.context.userId
 },{onConflict:"meeting_id,record_type,record_id"}).select("id,meeting_id,record_type,record_id").single();
 return inserted.error?answer({error:"Não foi possível vincular o registro."},503):answer({data:inserted.data},201);
}
