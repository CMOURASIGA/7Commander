import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
export async function POST(request:NextRequest){
 const auth=await requireApiAuth(request);
 if(!auth.ok)return auth.response;
 if(auth.context.authMode!=="supabase")return NextResponse.json({error:"Sessão Supabase obrigatória"},{status:401});
 const db=getSupabaseServerClient();
 if(!db)return NextResponse.json({error:"Banco indisponível"},{status:503});
 const admin=await db.from("platform_admins").select("user_id").eq("user_id",auth.context.userId).eq("role","superadmin").eq("active",true).maybeSingle();
 if(admin.error)return NextResponse.json({error:"Falha de autorização"},{status:503});
 if(!admin.data)return NextResponse.json({error:"Apenas superadmin"},{status:403});
 const body=await request.json().catch(()=>null);
 if(!body||typeof body.organizationId!=="string"||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.organizationId))return NextResponse.json({error:"Empresa inválida"},{status:400});
 const org=await db.from("organizations").select("id").eq("id",body.organizationId).eq("status","active").maybeSingle();
 if(org.error||!org.data)return NextResponse.json({error:"Empresa não encontrada"},{status:404});
 const existing=await db.from("organization_members").select("id").eq("organization_id",body.organizationId).eq("user_id",auth.context.userId).maybeSingle();
 if(existing.error)return NextResponse.json({error:"Falha ao verificar vínculo"},{status:503});
 const result=existing.data
 ?await db.from("organization_members").update({status:"active"}).eq("id",existing.data.id).select("id,organization_id,role,status").single()
 :await db.from("organization_members").insert({organization_id:body.organizationId,user_id:auth.context.userId,role:"owner",status:"active"}).select("id,organization_id,role,status").single();
 if(result.error)return NextResponse.json({error:"Falha ao vincular a conta"},{status:409});
 return NextResponse.json({data:result.data,operationalIsolationReady:false},{headers:{"Cache-Control":"no-store"}});
}
