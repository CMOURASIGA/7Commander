import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {CONSULT_ORG_ID,consultMemberRole} from "@/lib/consult-workspace";
import {getProjectAccessRole} from "@/services/project-service";
export const runtime="nodejs";
function fail(error:string,status=400){return NextResponse.json({error},{status});}
export async function POST(req:NextRequest){
 const auth=await requireApiAuth(req);if(!auth.ok)return auth.response;
 const role=await consultMemberRole(auth.context.userId);
 if(auth.context.authMode!=="supabase"||!role||role==="member")return fail("Sem permissão de pesquisa",403);
 if(process.env.RESEARCH_EXTERNAL_ENABLED!=="true"||!process.env.BRAVE_SEARCH_API_KEY)
  return fail("Pesquisa externa desabilitada. Configure explicitamente RESEARCH_EXTERNAL_ENABLED e BRAVE_SEARCH_API_KEY.",503);
 const body=await req.json().catch(()=>null);
 if(!body||body.confirmPublicQuery!==true||typeof body.publicQuery!=="string")return fail("Confirme que a consulta não contém dados confidenciais.");
 const query=body.publicQuery.trim();
 if(query.length<5||query.length>180)return fail("Informe uma consulta pública entre 5 e 180 caracteres.");
 if(/@|\b\d{8,}\b|\b(?:cpf|cnpj|prontuário|paciente|telefone|endereço pessoal)\b/i.test(query))
  return fail("Consulta contém possível dado identificável ou sensível. Generalize a pesquisa.");
 const projectId=typeof body.projectId==="string"?body.projectId:"";
 if(!projectId)return fail("Selecione um projeto.");
 const access=await getProjectAccessRole({userId:auth.context.userId,userEmail:auth.context.userEmail,projectId});
 if(access!=="owner"&&access!=="editor")return fail("Sem acesso de edição ao projeto",403);
 const db=getSupabaseServerClient();if(!db)return fail("Banco indisponível",503);
 const reserved=await db.rpc("reserve_commander_research_request",{p_org_id:CONSULT_ORG_ID,p_actor_id:auth.context.userId});
 if(reserved.error)return fail("Limite de pesquisa ou verificação de acesso: "+reserved.error.message,429);
 const url=new URL("https://api.search.brave.com/res/v1/web/search");
 url.searchParams.set("q",query);url.searchParams.set("count","6");url.searchParams.set("country","BR");url.searchParams.set("search_lang","pt");url.searchParams.set("safesearch","strict");
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
 try {
  const response=await fetch(url.toString(),{headers:{"Accept":"application/json","X-Subscription-Token":process.env.BRAVE_SEARCH_API_KEY},redirect:"error",cache:"no-store",signal:controller.signal});
  if(!response.ok)return fail("Provedor de pesquisa temporariamente indisponível ("+response.status+").",502);
  const json=await response.json();
  const results=(Array.isArray(json?.web?.results)?json.web.results:[]).slice(0,6).flatMap((r:unknown)=>{
   if(!r||typeof r!=="object")return [];
   const item=r as Record<string,unknown>;
   try{
    const destination=new URL(String(item.url||""));
    if(destination.protocol!=="https:")return [];
    return [{title:String(item.title||"Fonte sem título").slice(0,180),
      url:destination.toString(),snippet:String(item.description||"").replace(/<[^>]*>/g,"").slice(0,1200),
      verified:false,consultedAt:new Date().toISOString()}];
   }catch{return []}
  });
  return NextResponse.json({data:results,meta:{remainingToday:reserved.data,provider:"brave_web",verification:"not_verified"}},
   {headers:{"Cache-Control":"no-store"}});
 }catch{
  return fail("Não foi possível pesquisar. Nenhum resultado foi registrado automaticamente.",502);
 }finally{clearTimeout(timer)}
}
