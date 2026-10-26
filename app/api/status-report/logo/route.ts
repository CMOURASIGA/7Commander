import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { BRAND_LOGO_URL } from "@/lib/brand";
export async function GET(request: NextRequest) {
 const auth=await requireApiAuth(request);
 if(!auth.ok)return auth.response;
 try {
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),5000);
  let response:Response;
  try {response=await fetch(BRAND_LOGO_URL,{signal:controller.signal,cache:"force-cache"});} finally {clearTimeout(timeout);}
  if(!response.ok) throw Error("Logo não disponível.");
  const buffer=await response.arrayBuffer();
  if(buffer.byteLength>1024*1024)throw Error("Arquivo de marca excedeu o limite.");
  const type=response.headers.get("content-type")||"";
  if(!["image/png","image/jpeg","image/webp"].some(prefix=>type.startsWith(prefix))) throw Error("Tipo de imagem não suportado.");
  return NextResponse.json({dataUri:`data:${type.split(";")[0]};base64,${Buffer.from(buffer).toString("base64")}`});
 }catch{return NextResponse.json({error:"Não foi possível incorporar a logo ao documento."},{status:502});}
}
