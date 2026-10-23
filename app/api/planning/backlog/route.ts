import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {CONSULT_ORG_ID,consultMemberRole} from "@/lib/consult-workspace";
import {getProjectAccessRole} from "@/services/project-service";
import {createTaskCard} from "@/services/task-board-service";
function fail(error:string,status=400){return NextResponse.json({error},{status});}
export async function POST(req:NextRequest){
 const auth=await requireApiAuth(req);if(!auth.ok)return auth.response;
 if(auth.context.authMode!=="supabase")return fail("JWT obrigatório",403);
 const role=await consultMemberRole(auth.context.userId);
 if(!role||!["owner","admin","manager"].includes(role))return fail("Geração de backlog exige aprovação da gestão",403);
 const body=await req.json().catch(()=>null);
 const projectId=String(body?.projectId||""),decisionId=String(body?.decisionId||""),requirementId=String(body?.requirementId||"");
 const uuid=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
 if(![projectId,decisionId,requirementId].every(x=>uuid.test(x)))return fail("IDs inválidos");
 const access=await getProjectAccessRole({userId:auth.context.userId,userEmail:auth.context.userEmail,projectId});
 if(!["owner","editor"].includes(access))return fail("Sem permissão no projeto",403);
 const db=getSupabaseServerClient();if(!db)return fail("Banco indisponível",503);
 const validatedDb=db;
 const sourceRef="planning:"+decisionId+":"+requirementId;
 const records=await db.from("commander_planning_records").select("id,title,description,kind,status,project_id")
  .eq("organization_id",CONSULT_ORG_ID).in("id",[decisionId,requirementId]);
 if(records.error||records.data?.length!==2)return fail("Requisito ou decisão não encontrados",404);
 const decision=records.data.find(r=>r.id===decisionId),requirement=records.data.find(r=>r.id===requirementId);
 if(!decision||decision.kind!=="decision_gate"||decision.project_id!==projectId||decision.status!=="approved")
  return fail("A decisão precisa estar formalmente aprovada para este projeto",409);
 if(!requirement||requirement.kind!=="requirement"||requirement.project_id!==projectId||requirement.status!=="approved")
  return fail("O requisito precisa estar aprovado para este projeto",409);
 async function existing(){
  const result=await validatedDb.from("tasks").select("id,titulo").eq("project_id",projectId).eq("source_ref",sourceRef).maybeSingle();
  return result.data;
 }
 const before=await existing();
 if(before)return NextResponse.json({data:before,alreadyCreated:true});
 const task=await createTaskCard({
  userId:auth.context.userId,userEmail:auth.context.userEmail,projectId,
  title:requirement.title,description:`${requirement.description||""}\nOrigem: requisito ${requirementId}; decisão aprovada ${decisionId}`,
  priority:"media",columnKey:"todo",actionSource:"user",sourceRef
 });
 if(!task){
  const after=await existing();
  if(after)return NextResponse.json({data:after,alreadyCreated:true});
  return fail("Não foi possível criar a tarefa com integridade de origem. Verifique migration 053 e configuração do quadro.",503);
 }
 return NextResponse.json({data:{id:task.id,title:task.title},alreadyCreated:false},{status:201});
}
