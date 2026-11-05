import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getEffectiveTenantForUser } from "@/lib/tenant-runtime";
import { authorizeCentralPilot } from "@/lib/central-runtime";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0" };

/** Display hints only. Mutations always reauthorize in their own API routes. */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.context.authMode !== "supabase")
    return NextResponse.json({readOnly:true,canSwitchCompany:false},{headers});
  const db=getSupabaseServerClient();
  const orgId=await getEffectiveTenantForUser(auth.context.userId);
  if (!db || !orgId) return NextResponse.json(
    {readOnly:true,canSwitchCompany:false},{status:403,headers});
  const [admin, access, link]=await Promise.all([
    db.from("platform_admins").select("user_id").eq("user_id",auth.context.userId)
      .eq("active",true).maybeSingle(),
    db.from("internal_user_access").select("active,role")
      .eq("user_id",auth.context.userId).maybeSingle(),
    db.from("central_client_company_links").select("commander_company_id")
      .eq("commander_company_id",orgId).eq("status","ACTIVE").maybeSingle(),
  ]);
  if (admin.error || access.error || link.error) return NextResponse.json(
    {readOnly:true,canSwitchCompany:false},{status:503,headers});
  const privileged=Boolean(admin.data);
  const central= !privileged &&
    process.env.SERVICE_7SERVICE_ENFORCE_USER_ACCESS==="true" &&
    process.env.COMMANDER_CENTRAL_AUTH_ENABLED==="true" &&
    Boolean(link.data);
  const locallyWritable=privileged || (
    access.data?.active===true &&
    !["leitor","colaborador"].includes(access.data?.role??"")
  );
  let canWrite=locallyWritable;
  if (central && locallyWritable) {
    const [clients,projects]=await Promise.all([
      authorizeCentralPilot(request,auth.context.userId,orgId,"clients.write"),
      authorizeCentralPilot(request,auth.context.userId,orgId,"projects.write"),
    ]);
    canWrite=clients.allowed && projects.allowed;
  }
  const canSwitchCompany=privileged || (
    central && process.env.SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS==="true"
  ) || (access.data?.active===true);
  return NextResponse.json({readOnly:!canWrite,canSwitchCompany},{headers});
}
