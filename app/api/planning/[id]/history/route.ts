import { NextRequest,NextResponse } from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {CONSULT_ORG_ID,consultMemberRole} from "@/lib/consult-workspace";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest,context:{params:Promise<{id:string}>}){
 const auth=await requireApiAuth(req);if(!auth.ok)return auth.response;
 if(auth.context.authMode!=="supabase"||!await consultMemberRole(auth.context.userId))
  return NextResponse.json({error:"Sem permissão."},{status:403});
 const db=getSupabaseServerClient();if(!db)return NextResponse.json({error:"Banco indisponível"},{status:503});
 const {id}=await context.params;
 const item=await db.from("commander_planning_records").select("id").eq("organization_id",CONSULT_ORG_ID).eq("id",id).maybeSingle();
 if(item.error||!item.data)return NextResponse.json({error:"Registro não encontrado"},{status:404});
 const history=await db.from("commander_planning_audit")
  .select("version,actor_id,action,snapshot,created_at").eq("record_id",id).order("version",{ascending:false}).limit(100);
 if(history.error)return NextResponse.json({error:"Falha ao consultar histórico"},{status:503});
 return NextResponse.json({data:history.data??[]},{headers:{"Cache-Control":"no-store"}});
}
