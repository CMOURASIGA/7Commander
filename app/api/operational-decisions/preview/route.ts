import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getTenantRole,requireEffectiveTenant} from "@/lib/tenant-runtime";
import {MODULES,ModuleName,validInput} from "@/lib/operational-intelligence";
import {loadOperationalSource,listOperationalSources} from "@/services/operational-source-service";
import {simulationProvider} from "@/lib/operational-provider";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Read only: no INSERT/UPDATE/DELETE, quota reservation or external Jev request. */
export async function GET(request:NextRequest){
 const auth=await requireApiAuth(request);if(!auth.ok)return auth.response;
 if(auth.context.authMode!=="supabase")return NextResponse.json({error:"Sessão Supabase necessária"},{status:403,headers});
 const role=await getTenantRole(auth.context.userId);
 if(!role||role==="member")return NextResponse.json({error:"Somente gestão pode realizar prévias"},{status:403,headers});
 const moduleName=request.nextUrl.searchParams.get("module");
 if(!MODULES.includes(moduleName as ModuleName))return NextResponse.json({error:"Módulo inválido"},{status:400,headers});
 const module=moduleName as ModuleName;
 const id=request.nextUrl.searchParams.get("id");
 if(id!==null&&!UUID.test(id))return NextResponse.json({error:"Identificador inválido"},{status:400,headers});
 let organizationId:string;
 try{organizationId=await requireEffectiveTenant(auth.context.userId);}
 catch{return NextResponse.json({error:"Empresa ativa indisponível"},{status:403,headers});}
 try{
  if(id===null){
   const data=await listOperationalSources(module,organizationId);
   return NextResponse.json({data,readOnly:true},{headers});
  }
  const source=await loadOperationalSource(module,id,organizationId);
  if(!source)return NextResponse.json({error:"Registro não encontrado na empresa ativa"},{status:404,headers});
  if(!validInput(source))return NextResponse.json({error:"Registro sem dados suficientes para avaliação"},{status:422,headers});
  const verdict=await simulationProvider.evaluate(source);
  return NextResponse.json({data:{module,sourceId:id,sourceTitle:source.title,verdict},readOnly:true,persisted:false,externalProviderCalled:false,quotaConsumed:false},{headers});
 }catch{return NextResponse.json({error:"Falha na consulta autorizada"},{status:503,headers});}
}
