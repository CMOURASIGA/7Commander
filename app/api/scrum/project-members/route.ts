import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getProjectAccessRole,getProjectById} from "@/services/project-service";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {TENANT_SCHEMA_READY,requireEffectiveTenant} from "@/lib/tenant-runtime";
import {CONSULT_ORG_ID} from "@/lib/consult-workspace";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const auth=await requireApiAuth(req);if(!auth.ok)return auth.response;
 const projectId=req.nextUrl.searchParams.get("projectId")||"";
 if(!uuid.test(projectId))return NextResponse.json({error:"Projeto inválido."},{status:400});
 const project=await getProjectById({userId:auth.context.userId,userEmail:auth.context.userEmail,projectId});
 const role=await getProjectAccessRole({userId:auth.context.userId,userEmail:auth.context.userEmail,projectId});
 if(!project||role==="none")return NextResponse.json({error:"Acesso negado."},{status:403});
 const db=getSupabaseServerClient();if(!db)return NextResponse.json({error:"Banco indisponível."},{status:503});
 const org=TENANT_SCHEMA_READY?await requireEffectiveTenant(auth.context.userId):CONSULT_ORG_ID;
 const members=await db.from("project_members").select("member_email,status").eq("project_id",projectId).eq("organization_id",org);
 if(members.error)return NextResponse.json({error:"Falha ao consultar membros."},{status:503});
 const emails=[...new Set([auth.context.userEmail,...(members.data||[]).filter(m=>["active","accepted","ativo"].includes(String(m.status||"").toLowerCase())).map(m=>m.member_email)].filter((e):e is string=>typeof e==="string"&&e.includes("@")).map(e=>e.trim().toLowerCase()))];
 const profiles=emails.length?await db.from("profiles").select("email,nome").in("email",emails):{data:[],error:null};
 if(profiles.error)return NextResponse.json({error:"Falha ao consultar nomes dos membros."},{status:503});
 const nameMap=new Map((profiles.data||[]).map(p=>[String(p.email||"").toLowerCase(),p.nome]));
 return NextResponse.json({data:emails.map(email=>({email,name:String(nameMap.get(email)||email)}))},{headers:{"Cache-Control":"private,no-store"}});
}
