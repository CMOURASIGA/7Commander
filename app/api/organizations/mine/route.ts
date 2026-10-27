import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
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
 return NextResponse.json({data:(members.data??[]).map(row=>({id:row.organization_id,role:row.role,organization:row.organizations}))},{headers:{"Cache-Control":"no-store"}});
}
