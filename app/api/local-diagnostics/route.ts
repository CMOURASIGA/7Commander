import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getEffectiveTenantForUser } from "@/lib/tenant-runtime";
import { listProjects } from "@/services/project-service";
import { localWriteGuardEnabled } from "@/lib/local-write-guard";
import { LOCAL_ACCESS_COOKIE } from "@/lib/local-ssr-cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Local, authenticated, read-only diagnostic. No tokens, emails or IDs returned. */
export async function GET(request:NextRequest) {
  if (!localWriteGuardEnabled() || !["localhost","127.0.0.1"].includes(request.nextUrl.hostname)) {
    return NextResponse.json({error:"Not found"},{status:404});
  }
  const cookieToken=request.cookies.get(LOCAL_ACCESS_COOKIE)?.value??"";
  // Direct navigation works without JavaScript and bypasses the broken
  // service worker installed on localhost:3000 when a new port is used.
  const headers=new Headers(request.headers);
  if (!headers.has("authorization") && cookieToken && cookieToken.length<=10000) {
    headers.set("authorization","Bearer "+cookieToken);
  }
  const authenticatedRequest=new NextRequest(request.url,{method:"GET",headers});
  const auth = await requireApiAuth(authenticatedRequest);
  if (!auth.ok) return auth.response;
  const db = getSupabaseServerClient();
  if (!db) return NextResponse.json({error:"Cliente Supabase indisponível."},{status:503});
  const userId=auth.context.userId;
  const profile=await db.from("profiles").select("active_organization_id").eq("user_id",userId).maybeSingle();
  const membership=await db.from("organization_members").select("organization_id")
    .eq("user_id",userId).eq("status","active");
  const tenant=await getEffectiveTenantForUser(userId);
  const company=tenant ? await db.from("organizations").select("name").eq("id",tenant).maybeSingle() : null;
  const visible=tenant ? await db.from("projects").select("id",{count:"exact",head:true}).eq("organization_id",tenant) : null;
  let serviceCount:number|null=null;
  let serviceError=false;
  try {serviceCount=(await listProjects(userId,auth.context.userEmail)).length}
  catch {serviceError=true}
  return NextResponse.json({
    mode:"local-read-only",
    tenantFlags:{
      schema:process.env.SEVEN_COMMANDER_TENANT_SCHEMA_READY==="true",
      multiTenant:process.env.SEVEN_COMMANDER_MULTI_TENANT_READY==="true",
    },
    profileStatus:profile.error ? "error" : profile.data?.active_organization_id ? "active" : "unset",
    profileError:profile.error?.code??null,
    activeMemberships:membership.data?.length??null,
    membershipsError:membership.error?.code??null,
    tenantResolved:Boolean(tenant),
    organization:company?.data?.name??null,
    organizationError:company?.error?.code??null,
    directProjectsCount:visible?.count??null,
    directProjectsError:visible?.error?.code??null,
    serviceProjectsCount:serviceCount,
    serviceError,
  },{headers:{"Cache-Control":"no-store"}});
}
