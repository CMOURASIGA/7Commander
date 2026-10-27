import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getEffectiveTenantForUser } from "@/lib/tenant-runtime";

export const dynamic = "force-dynamic";
export async function GET(request:NextRequest){
 const auth=await requireApiAuth(request);
 if(!auth.ok)return auth.response;
 if(auth.context.authMode!=="supabase")return NextResponse.json({error:"Sessão autenticada obrigatória."},{status:401});
 const db=getSupabaseServerClient();
 const tenant=await getEffectiveTenantForUser(auth.context.userId);
 if(!db||!tenant)return NextResponse.json({error:"Empresa sem acesso."},{status:403});
 const result=await db.from("organizations").select("id,name,branding").eq("id",tenant).maybeSingle();
 if(result.error||!result.data)return NextResponse.json({error:"Empresa indisponível."},{status:404});
 return NextResponse.json({data:result.data},{headers:{"Cache-Control":"no-store"}});
}
