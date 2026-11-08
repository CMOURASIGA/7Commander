import {NextRequest,NextResponse} from "next/server";
import {requireApiAuth} from "@/lib/api-auth";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {TENANT_SCHEMA_READY,requireEffectiveTenant} from "@/lib/tenant-runtime";
import {CONSULT_ORG_ID} from "@/lib/consult-workspace";
export const dynamic="force-dynamic";
const out=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private,no-store"}});
async function identity(req:NextRequest){
 const auth=await requireApiAuth(req);if(!auth.ok)return {error:auth.response} as const;
 const email=auth.context.userEmail?.trim().toLowerCase();
 if(!email)return {error:out({error:"Identidade sem email."},403)} as const;
 const db=getSupabaseServerClient();
 if(!db)return {error:out({error:"Banco indisponível."},503)} as const;
 const organizationId=TENANT_SCHEMA_READY?await requireEffectiveTenant(auth.context.userId):CONSULT_ORG_ID;
 return {db,email,organizationId} as const;
}
export async function GET(req:NextRequest){
 const a=await identity(req);if("error" in a)return a.error;
 const r=await a.db.from("scrum_notifications").select("id,story_id,project_id,message,event_type,actor_email,created_at,read_at")
 .eq("organization_id",a.organizationId).eq("recipient_email",a.email).is("read_at",null)
 .order("created_at",{ascending:false}).limit(80);
 if(r.error)return out({error:"Não foi possível consultar notificações Scrum."},503);
 return out({data:r.data||[]});
}
export async function POST(req:NextRequest){
 const a=await identity(req);if("error" in a)return a.error;
 const json=await req.json().catch(()=>({})) as {id?:string};
 if(typeof json.id!=="string"||!/^[0-9a-f-]{36}$/i.test(json.id))return out({error:"Notificação inválida."},400);
 const r=await a.db.from("scrum_notifications").update({read_at:new Date().toISOString()}).eq("id",json.id)
 .eq("organization_id",a.organizationId).eq("recipient_email",a.email).is("read_at",null).select("id");
 if(r.error)return out({error:"Não foi possível marcar como lida."},503);
 return out({data:{updated:Boolean(r.data?.length)}});
}
