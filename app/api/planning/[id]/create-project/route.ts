import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {requireEffectiveTenant,getTenantRole} from "@/lib/tenant-runtime";
import {createProject} from "@/services/project-service";
import {ensureProjectOwnerMembership} from "@/services/project-sharing-service";

export async function POST(req:NextRequest,context:{params:Promise<{id:string}>}) {
 const auth=await requireApiAuth(req);if(!auth.ok)return auth.response;
 if(auth.context.authMode!=="supabase")return NextResponse.json({error:"Entre com sua conta para concluir o planejamento."},{status:401});
 const role=await getTenantRole(auth.context.userId);
 if(!role||role==="member")return NextResponse.json({error:"Somente gestores podem criar projetos a partir do planejamento."},{status:403});
 const organizationId=await requireEffectiveTenant(auth.context.userId);
 const db=getSupabaseServerClient();if(!db)return NextResponse.json({error:"Banco indisponível."},{status:503});
 const {id}=await context.params;
 const item=await db.from("commander_planning_records")
  .select("id,title,description,kind,status,project_id,organization_id,version")
  .eq("id",id).eq("organization_id",organizationId).maybeSingle();
 if(item.error||!item.data)return NextResponse.json({error:"Planejamento não encontrado nesta empresa."},{status:404});
 const row=item.data;
 if(row.kind!=="opportunity"||!["approved","won"].includes(row.status))
  return NextResponse.json({error:"A oportunidade deve estar aprovada ou ganha para gerar um projeto."},{status:409});
 if(row.project_id)return NextResponse.json({data:{projectId:row.project_id,alreadyCreated:true}});
 const project=await createProject({userId:auth.context.userId,name:row.title,description:row.description??"",status:"ativo",isActive:false,tags:[]});
 const linked=await db.from("commander_planning_records").update({project_id:project.id,updated_by:auth.context.userId,updated_at:new Date().toISOString()})
  .eq("id",row.id).eq("organization_id",organizationId).is("project_id",null).select("project_id").maybeSingle();
 if(linked.error||!linked.data){
  return NextResponse.json({error:"O projeto foi criado, mas o vínculo ao planejamento não foi confirmado. Verifique os projetos antes de repetir.",projectId:project.id},{status:409});
 }
 await ensureProjectOwnerMembership({ownerUserId:auth.context.userId,ownerEmail:auth.context.userEmail,projectId:project.id});
 return NextResponse.json({data:{projectId:project.id,alreadyCreated:false}},{status:201});
}
