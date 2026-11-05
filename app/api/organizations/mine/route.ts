import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { authorizeCentralPilot } from "@/lib/central-runtime";
import { recordCentralDecision } from "@/lib/central-decision-audit";
export const dynamic = "force-dynamic";
/** Read-only membership discovery. Never grants access through a client-selected tenant. */
export async function GET(request: NextRequest) {
 const auth=await requireApiAuth(request);
 if(!auth.ok)return auth.response;
 if(auth.context.authMode!=="supabase")return NextResponse.json({error:"Sessão autenticada obrigatória."},{status:403});
 const db=getSupabaseServerClient();
 if(!db)return NextResponse.json({error:"Serviço indisponível."},{status:503});
 const members=await db.from("organization_members").select("organization_id,role,status,organizations!inner(id,name,slug,status,branding)").eq("user_id",auth.context.userId).eq("status","active").eq("organizations.status","active");
 if(members.error)return NextResponse.json({error:"Falha ao consultar organizações."},{status:500});
 let visible=members.data??[];
 if (process.env.SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS==="true") {
   const [admin,internal]=await Promise.all([
     db.from("platform_admins").select("user_id").eq("user_id",auth.context.userId)
       .eq("active",true).maybeSingle(),
     db.from("internal_user_access").select("active").eq("user_id",auth.context.userId)
       .maybeSingle(),
   ]);
   if(admin.error||internal.error)return NextResponse.json({error:"Autorização indisponível"},{status:503});
   if(!admin.data&&!internal.data?.active) {
     // Bounded batch prevents 50-company accounts from overwhelming 7Service.
     if(visible.length>50)return NextResponse.json({error:"Muitas empresas vinculadas"},{status:409});
     const result:typeof visible=[];
     for(let offset=0;offset<visible.length;offset+=5) {
       const part=visible.slice(offset,offset+5);
       const checked=await Promise.all(part.map(async row=>{
         const decision=await authorizeCentralPilot(request,auth.context.userId,row.organization_id);
         const logged=await recordCentralDecision({
           userId:auth.context.userId,companyId:row.organization_id,
           route:request.nextUrl.pathname,method:request.method,
           allowed:decision.allowed,reasonCode:decision.reasonCode,
         });
         if(decision.allowed&&!logged)return {row,allowed:false,auditError:true};
         return {row,allowed:decision.allowed,auditError:false};
       }));
       if(checked.some(item=>item.auditError))
         return NextResponse.json({error:"Auditoria indisponível"},{status:503});
       result.push(...checked.filter(item=>item.allowed).map(item=>item.row));
     }
     visible=result;
   }
 }
 return NextResponse.json({data:visible.map(row=>({id:row.organization_id,role:row.role,organization:row.organizations}))},{headers:{"Cache-Control":"no-store"}});
}
