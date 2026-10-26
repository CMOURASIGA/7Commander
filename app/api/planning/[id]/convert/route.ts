import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {CONSULT_ORG_ID,consultMemberRole} from "@/lib/consult-workspace";
export async function POST(req:NextRequest,context:{params:Promise<{id:string}>}){
 const auth=await requireApiAuth(req);if(!auth.ok)return auth.response;
 if(auth.context.authMode!=="supabase")return NextResponse.json({error:"Sessão Supabase necessária"},{status:403});
 const role=await consultMemberRole(auth.context.userId);
 if(!role||role==="member")return NextResponse.json({error:"Somente gestão pode converter prospects"},{status:403});
 const db=getSupabaseServerClient();if(!db)return NextResponse.json({error:"Banco indisponível"},{status:503});
 const {id}=await context.params;
 const item=await db.from("commander_planning_records").select("id,kind,status,organization_id")
 .eq("id",id).eq("organization_id",CONSULT_ORG_ID).maybeSingle();
 if(item.error||!item.data)return NextResponse.json({error:"Prospect não encontrado"},{status:404});
 if(item.data.kind!=="prospect"||item.data.status!=="won")
  return NextResponse.json({error:"O prospect deve estar na etapa Ganho"},{status:409});
 const result=await db.rpc("convert_commander_prospect",{p_record_id:id,p_actor_id:auth.context.userId});
 if(result.error)return NextResponse.json({error:result.error.message},{status:409});
 return NextResponse.json({data:result.data});
}
