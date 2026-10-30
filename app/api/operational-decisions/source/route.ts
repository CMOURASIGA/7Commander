import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getTenantRole,requireEffectiveTenant} from "@/lib/tenant-runtime";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {simulationProvider,intelligenceMode} from "@/lib/operational-provider";
import {MODULES,validInput} from "@/lib/operational-intelligence";
import {loadOperationalSource} from "@/services/operational-source-service";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 const auth=await requireApiAuth(request);if(!auth.ok)return auth.response;
 if(auth.context.authMode!=="supabase")return NextResponse.json({error:"Sessão Supabase necessária"},{status:403});
 const role=await getTenantRole(auth.context.userId);
 if(!role||role==="member")return NextResponse.json({error:"Somente gestão pode avaliar registros"},{status:403});
 if(intelligenceMode()==="disabled")return NextResponse.json({error:"Recurso desligado"},{status:503});
 const body=await request.json().catch(()=>null);
 const module=body?.module;
 const id=body?.id;
 if(!MODULES.includes(module)||typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  return NextResponse.json({error:"Módulo ou identificador inválido"},{status:400});
 // Real organization data never goes to the external provider from this endpoint.
 // AI observation requires separate privacy assessment and explicit approval.
 const organizationId=await requireEffectiveTenant(auth.context.userId);
 let input;
 try{input=await loadOperationalSource(module,id,organizationId);}
 catch{return NextResponse.json({error:"Não foi possível consultar registro autorizado"},{status:503});}
 if(!input)return NextResponse.json({error:"Registro não encontrado nesta organização"},{status:404});
 if(!validInput(input))return NextResponse.json({error:"Registro sem informações suficientes para classificação"},{status:422});
 const verdict=await simulationProvider.evaluate(input);
 const db=getSupabaseServerClient();if(!db)return NextResponse.json({error:"Banco indisponível"},{status:503});
 // Atomic, tenant-scoped quota is reserved before any evaluation call.
 const quota=await db.rpc("reserve_operational_decision_quota",{p_org:organizationId,p_limit:10});
 if(quota.error)return NextResponse.json({error:"Cotas indisponíveis; migration 069 necessária"},{status:503});
 if(quota.data!==true)return NextResponse.json({error:"Limite de avaliações por empresa atingido"},{status:429});
 const stored=await db.from("operational_decision_evaluations").insert({
  organization_id:organizationId,module,entity_type:"source_record",source_id:id,
  verdict,provider:"simulation-v1",status:"pending_review",created_by:auth.context.userId
 }).select("id,module,source_id,verdict,status,created_at").single();
 if(stored.error)return NextResponse.json({error:"Não foi possível persistir avaliação"},{status:503});
 return NextResponse.json({data:stored.data,mode:"simulation",externalProviderCalled:false},{status:201,headers:{"Cache-Control":"no-store"}});
}
