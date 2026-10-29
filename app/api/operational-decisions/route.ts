import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {requireEffectiveTenant,getTenantRole} from "@/lib/tenant-runtime";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {providerForMode,intelligenceMode} from "@/lib/operational-provider";
import {validInput} from "@/lib/operational-intelligence";
export const dynamic="force-dynamic";
const noStore={"Cache-Control":"no-store"};
export async function GET(request:NextRequest){
 const auth=await requireApiAuth(request);if(!auth.ok)return auth.response;
 if(auth.context.authMode!=="supabase")return NextResponse.json({error:"Sessão necessária"},{status:403});
 const role=await getTenantRole(auth.context.userId);if(!role)return NextResponse.json({error:"Empresa sem acesso"},{status:403});
 const organizationId=await requireEffectiveTenant(auth.context.userId);
 if(intelligenceMode()==="disabled")return NextResponse.json({data:[],mode:"disabled"},{headers:noStore});
 const db=getSupabaseServerClient();if(!db)return NextResponse.json({error:"Banco indisponível"},{status:503});
 const result=await db.from("operational_decision_evaluations").select("id,module,entity_type,source_id,verdict,status,provider,created_at").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(100);
 if(result.error)return NextResponse.json({error:"Persistência não preparada; migration 066 requerida"},{status:503});
 return NextResponse.json({data:result.data??[],mode:intelligenceMode()},{headers:noStore});
}
export async function POST(request:NextRequest){
 const auth=await requireApiAuth(request);if(!auth.ok)return auth.response;
 if(auth.context.authMode!=="supabase")return NextResponse.json({error:"Sessão necessária"},{status:403});
 const role=await getTenantRole(auth.context.userId);if(!role||role==="member")return NextResponse.json({error:"Somente gestores podem solicitar avaliações"},{status:403});
 const provider=providerForMode();if(!provider)return NextResponse.json({error:"Inteligência operacional desativada"},{status:503});
 const body=await request.json().catch(()=>null);
 if(!body||!validInput(body.input)||body.synthetic!==true||body.mode!==intelligenceMode())return NextResponse.json({error:"Entrada inválida; somente dados sintéticos e modo explicitamente habilitado"},{status:400});
 const organizationId=await requireEffectiveTenant(auth.context.userId);
 const db=getSupabaseServerClient();if(!db)return NextResponse.json({error:"Banco indisponível"},{status:503});
 // Hard per-tenant and per-user limit on writes / provider calls. Never accept caller-supplied tenant.
 const start=new Date(Date.now()-60*60*1000).toISOString();
 const quota=await db.from("operational_decision_evaluations").select("id,created_by",{count:"exact",head:true})
  .eq("organization_id",organizationId).gte("created_at",start);
 if(quota.error)return NextResponse.json({error:"Controle de limites indisponível"},{status:503});
 if((quota.count??0)>=10)return NextResponse.json({error:"Limite conservador de 10 avaliações por empresa/hora atingido"},{status:429});
 if(intelligenceMode()==="observation"&&process.env.SEVEN_COMMANDER_JEV_COST_APPROVED!=="true")
  return NextResponse.json({error:"Observação Jev aguarda autorização financeira"},{status:503});
 // Only user-confirmed synthetic input; no entity fetching, business mutation or secret is sent.
 let verdict;
 try{verdict=await provider.evaluate(body.input);}catch{
  return NextResponse.json({error:"Avaliação indisponível; nenhuma decisão executada"},{status:503});
 }
 const result=await db.from("operational_decision_evaluations").insert({
 organization_id:organizationId,module:body.input.module,entity_type:"synthetic",source_id:null,
 verdict,provider:provider.id,status:"pending_review",created_by:auth.context.userId
 }).select("id,module,verdict,status,created_at").single();
 if(result.error)return NextResponse.json({error:"Não foi possível registrar avaliação; verificar migration"},{status:503});
 return NextResponse.json({data:result.data},{status:201,headers:noStore});
}
