import { NextRequest,NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CONSULT_ORG_ID } from "@/lib/consult-workspace";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const auth=await requireApiAuth(request);if(!auth.ok)return auth.response;
 const db=getSupabaseServerClient();if(!db)return NextResponse.json({error:"Banco indisponível"},{status:503});
 const member=await db.from("organization_members").select("id").eq("organization_id",CONSULT_ORG_ID).eq("user_id",auth.context.userId).eq("status","active").maybeSingle();
 if(member.error)return NextResponse.json({error:"Falha ao verificar equipe"},{status:503});
 if(!member.data)return NextResponse.json({error:"Sem acesso à equipe"},{status:403});
 const members=await db.from("organization_members").select("user_id,role").eq("organization_id",CONSULT_ORG_ID).eq("status","active");
 if(members.error)return NextResponse.json({error:"Falha ao listar equipe"},{status:503});
 const ids=(members.data??[]).map(m=>m.user_id);
 const users=await db.from("internal_user_access").select("user_id,nome,email,active").in("user_id",ids).eq("active",true);
 if(users.error)return NextResponse.json({error:"Falha ao listar usuários"},{status:503});
 const list=(users.data??[]).map(u=>({id:u.user_id,name:u.nome,email:u.email}));
 for(const m of members.data??[]){
  if(list.some(u=>u.id===m.user_id))continue;
  const account=await db.auth.admin.getUserById(m.user_id);
  if(account.error||!account.data.user?.email)continue;
  const user=account.data.user;
  list.push({id:user.id,name:typeof user.user_metadata?.full_name==="string"?user.user_metadata.full_name:user.email,email:user.email});
 }
 return NextResponse.json({data:list.sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"))},{headers:{"Cache-Control":"no-store"}});
}
