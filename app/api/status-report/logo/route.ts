import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getEffectiveTenantForUser } from "@/lib/tenant-runtime";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CONSULT_ORG_ID } from "@/lib/consult-workspace";
import { BRAND_LOGO_URL } from "@/lib/brand";

export const dynamic="force-dynamic";
const error=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});

export async function GET(request:NextRequest) {
 const auth=await requireApiAuth(request);
 if(!auth.ok)return auth.response;
 if(auth.context.authMode!=="supabase")return error("Sessão autenticada necessária.",401);
 const tenant=await getEffectiveTenantForUser(auth.context.userId);
 const db=getSupabaseServerClient();
 if(!tenant||!db)return error("Empresa não autorizada.",403);
 const organization=await db.from("organizations").select("name,branding").eq("id",tenant).maybeSingle();
 if(organization.error||!organization.data)return error("Empresa indisponível.",404);
 const branding=organization.data.branding as {logoUrl?:unknown;displayName?:unknown}|null;
 const companyName=typeof branding?.displayName==="string"&&branding.displayName.trim()?branding.displayName.trim():organization.data.name;
 const configured=typeof branding?.logoUrl==="string"?branding.logoUrl.trim():"";
 // A missing customer's logo must never silently become Consult Services.
 const logo=configured||(tenant===CONSULT_ORG_ID?BRAND_LOGO_URL:"");
 if(!logo)return error("Empresa sem logo cadastrada no whitelabel.",404);
 const MAX_IMAGE_BYTES=1024*1024;
 const match=/^data:(image\/(?:png|jpeg|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(logo);
 if(match) {
  const bytes=Buffer.from(match[2],"base64");
  if(!bytes.length||bytes.byteLength>MAX_IMAGE_BYTES)return error("Logo excede o limite para exportação.",422);
  return NextResponse.json({companyName,dataUri:`data:${match[1]};base64,${bytes.toString("base64")}`},{headers:{"Cache-Control":"private,no-store"}});
 }
 let remote:URL;
 try {remote=new URL(logo);}catch{return error("Logo do whitelabel inválida.",422)}
 // Protect server-side fetch against SSRF and unapproved private hosts.
 const hostname=remote.hostname.toLowerCase();
 if(remote.protocol!=="https:"||remote.username||remote.password||remote.port||
    !(hostname==="i.imgur.com"||hostname.endsWith(".supabase.co")))
   return error("Provedor de logo não permitido.",422);
 try{
  const response=await fetch(remote.toString(),{signal:AbortSignal.timeout(5000),cache:"no-store",redirect:"error"});
  if(!response.ok)return error("Logo do whitelabel indisponível.",502);
  const type=(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  if(!["image/png","image/jpeg","image/webp"].includes(type))return error("Tipo de imagem não suportado.",422);
  if(Number(response.headers.get("content-length")||0)>MAX_IMAGE_BYTES)return error("Logo excede o limite.",422);
  const buffer=await response.arrayBuffer();
  if(!buffer.byteLength||buffer.byteLength>MAX_IMAGE_BYTES)return error("Logo excede o limite.",422);
  return NextResponse.json({companyName,dataUri:`data:${type};base64,${Buffer.from(buffer).toString("base64")}`},{headers:{"Cache-Control":"private,no-store"}});
 }catch{return error("Não foi possível incorporar a marca ativa ao relatório.",502)}
}
