import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getTenantRole,requireEffectiveTenant} from "@/lib/tenant-runtime";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {intelligenceMode} from "@/lib/operational-provider";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiAuth(request);if(!auth.ok)return auth.response;
 if(auth.context.authMode!=="supabase")return NextResponse.json({error:"Sessão obrigatória"},{status:403});
 const role=await getTenantRole(auth.context.userId);
 if(!role||role==="member")return NextResponse.json({error:"Revisão exige gestão"},{status:403});
 if(intelligenceMode()==="disabled")return NextResponse.json({error:"Recurso desativado"},{status:503});
 const body=await request.json().catch(()=>null);
 if(!["accepted","rejected","review_requested"].includes(body?.decision)||typeof body?.reason!=="string"||body.reason.trim().length<5||body.reason.length>1000)
 return NextResponse.json({error:"Decisão ou motivo inválido"},{status:400});
 const id=(await params).id;
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id))return NextResponse.json({error:"ID inválido"},{status:400});
 const organizationId=await requireEffectiveTenant(auth.context.userId);
 const db=getSupabaseServerClient();if(!db)return NextResponse.json({error:"Banco indisponível"},{status:503});
 const result=await db.from("operational_decision_evaluations").update({
  status:body.decision,reviewed_by:auth.context.userId,review_reason:body.reason.trim(),reviewed_at:new Date().toISOString()
 }).eq("organization_id",organizationId).eq("id",id).eq("status","pending_review").select("id,status").maybeSingle();
 if(result.error)return NextResponse.json({error:"Falha no registro da revisão"},{status:503});
 if(!result.data)return NextResponse.json({error:"Avaliação não localizada, já revisada ou de outra empresa"},{status:409});
 return NextResponse.json({data:result.data},{headers:{"Cache-Control":"no-store"}});
}
