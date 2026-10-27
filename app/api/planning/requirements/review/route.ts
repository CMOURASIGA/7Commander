import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {consultMemberRole} from "@/lib/consult-workspace";
import { TENANT_SCHEMA_READY, getTenantRole, requireEffectiveTenant } from "@/lib/tenant-runtime";
import {getProjectAccessRole} from "@/services/project-service";
type Finding={recordId:string;severity:"warning"|"question";type:string;detail:string};
const norm=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
export async function POST(req:NextRequest){
 const auth=await requireApiAuth(req);if(!auth.ok)return auth.response;
 const organizationId=await requireEffectiveTenant(auth.context.userId);
 if(auth.context.authMode!=="supabase"||!(TENANT_SCHEMA_READY ? await getTenantRole(auth.context.userId) : await consultMemberRole(auth.context.userId)))
  return NextResponse.json({error:"Sem acesso à equipe"},{status:403});
 const body=await req.json().catch(()=>null);
 const projectId=typeof body?.projectId==="string"?body.projectId:"";
 if(!projectId)return NextResponse.json({error:"Projeto obrigatório"},{status:400});
 const access=await getProjectAccessRole({userId:auth.context.userId,userEmail:auth.context.userEmail,projectId});
 if(access==="none")return NextResponse.json({error:"Projeto sem acesso"},{status:403});
 const db=getSupabaseServerClient();if(!db)return NextResponse.json({error:"Banco indisponível"},{status:503});
 const rows=await db.from("commander_planning_records").select("id,title,description,payload,version")
 .eq("organization_id",organizationId).eq("project_id",projectId).eq("kind","requirement").limit(200);
 if(rows.error)return NextResponse.json({error:"Falha ao consultar requisitos"},{status:503});
 const seen=new Map<string,string>();const findings:Finding[]=[];
 for(const row of rows.data??[]){
  const title=String(row.title||"");const payload=(row.payload||{}) as Record<string,unknown>;
  const normalized=norm(title);
  if(seen.has(normalized))findings.push({recordId:row.id,severity:"warning",type:"duplicate_title",detail:"Título semelhante ao requisito "+seen.get(normalized)+". Revisar redundância."});
  else seen.set(normalized,row.id);
  if(!String(payload.acceptance||"").trim())findings.push({recordId:row.id,severity:"question",type:"missing_acceptance",detail:"Qual critério objetivo demonstra que este requisito foi atendido?"});
  if(!String(payload.category||"").trim())findings.push({recordId:row.id,severity:"question",type:"missing_category",detail:"Este requisito é funcional, não funcional, legal ou operacional?"});
  if(!String(payload.source||"").trim())findings.push({recordId:row.id,severity:"question",type:"missing_source",detail:"Qual documento ou interlocutor fundamenta este requisito?"});
  if(/\b(facil|rapido|adequado|eficiente|intuitivo|robusto|seguro|facilmente)\b/i.test(norm(title+" "+row.description)))
   findings.push({recordId:row.id,severity:"question",type:"ambiguous_wording",detail:"Definir métrica objetiva para termo potencialmente subjetivo."});
 }
 return NextResponse.json({data:findings,meta:{requirements:rows.data?.length||0,reviewMode:"deterministic",generatedAt:new Date().toISOString()},
  notice:"As constatações são sugestões de revisão, não alterações automáticas."},{headers:{"Cache-Control":"no-store"}});
}
