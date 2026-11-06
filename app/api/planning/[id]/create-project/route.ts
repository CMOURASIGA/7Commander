import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {requireEffectiveTenant,getTenantRole} from "@/lib/tenant-runtime";
import {ensureProjectOwnerMembership} from "@/services/project-sharing-service";

export async function POST(req:NextRequest,context:{params:Promise<{id:string}>}) {
 const auth=await requireApiAuth(req);if(!auth.ok)return auth.response;
 if(auth.context.authMode!=="supabase")return NextResponse.json({error:"Entre com sua conta para concluir o planejamento."},{status:401});
 const role=await getTenantRole(auth.context.userId);
 if(!role||role==="member")return NextResponse.json({error:"Somente gestores podem criar projetos a partir do planejamento."},{status:403});
 const organizationId=await requireEffectiveTenant(auth.context.userId);
 const db=getSupabaseServerClient();if(!db)return NextResponse.json({error:"Banco indisponível."},{status:503});
 const {id}=await context.params;
 const completed=await db.rpc("commander_complete_opportunity",{
  p_record_id:id,p_actor_id:auth.context.userId,p_organization_id:organizationId
 });
 if(completed.error)return NextResponse.json({error:"Não foi possível concluir esta oportunidade: "+completed.error.message},{status:409});
 const result=Array.isArray(completed.data)?completed.data[0]:null;
 if(!result?.project_id)return NextResponse.json({error:"O banco não confirmou o projeto."},{status:503});
 await ensureProjectOwnerMembership({ownerUserId:auth.context.userId,ownerEmail:auth.context.userEmail,projectId:result.project_id});
 return NextResponse.json({data:{projectId:result.project_id,alreadyCreated:Boolean(result.already_created)}},{status:result.already_created?200:201});
}
