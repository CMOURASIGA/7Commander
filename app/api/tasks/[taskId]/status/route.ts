import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {localWriteGuardEnabled} from "@/lib/local-write-guard";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {TENANT_SCHEMA_READY,requireEffectiveTenant} from "@/lib/tenant-runtime";
import {CONSULT_ORG_ID} from "@/lib/consult-workspace";
import {updateTaskCard} from "@/services/task-board-service";

const reject=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"private,no-store"}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Target="todo"|"doing"|"done";
export async function PATCH(request:NextRequest,{params}:{params:Promise<{taskId:string}>}){
 const auth=await requireApiAuth(request);if(!auth.ok)return auth.response;
 if(localWriteGuardEnabled())return reject("Ambiente local somente leitura. Alteração de status bloqueada.",403);
 const {taskId}=await params;
 if(!uuid.test(taskId))return reject("Card inválido.",400);
 const body=await request.json().catch(()=>null) as {projectId?:unknown;columnKey?:unknown}|null;
 const target=body?.columnKey;
 if(!body||typeof body.projectId!=="string"||!uuid.test(body.projectId)
  ||(target!=="todo"&&target!=="doing"&&target!=="done"))return reject("Projeto ou status inválido.",400);
 const db=getSupabaseServerClient();if(!db)return reject("Banco indisponível.",503);
 try{
  const organizationId=TENANT_SCHEMA_READY?await requireEffectiveTenant(auth.context.userId):CONSULT_ORG_ID;
  const task=await db.from("tasks").select("id,project_id,board_id,column_id,status")
   .eq("id",taskId).eq("project_id",body.projectId).eq("organization_id",organizationId).maybeSingle();
  if(task.error)return reject("Não foi possível verificar o card.",503);
  if(!task.data?.board_id)return reject("Card não localizado no projeto autorizado.",404);
  const destination=await db.from("task_columns").select("id,column_key")
   .eq("board_id",task.data.board_id).eq("column_key",target).eq("organization_id",organizationId).maybeSingle();
  if(destination.error)return reject("Não foi possível verificar a coluna.",503);
  if(!destination.data)return reject("Coluna de destino indisponível.",409);
  if(task.data.column_id===destination.data.id)return NextResponse.json({data:{columnKey:target,unchanged:true}});
  // updateTaskCard checks owner/editor server-side, updates status and logs movement.
  const updated=await updateTaskCard({
   userId:auth.context.userId,userEmail:auth.context.userEmail,
   taskId,columnId:destination.data.id,actionSource:"user"
  });
  if(!updated)return reject("Mudança de status não autorizada ou não aplicada.",403);
  return NextResponse.json({data:{columnKey:updated.columnKey,status:updated.status,unchanged:false}},
   {headers:{"Cache-Control":"private,no-store"}});
 }catch(error){
  console.error("[task status] update failed",error);
  return reject("Não foi possível alterar o status. Nenhuma conclusão foi confirmada.",500);
 }
}
