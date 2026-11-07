import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sameOriginMutation } from "@/lib/central-local-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { checkCentralProductAccess } from "@/lib/7service-authorization";
import { evaluateCommanderCentralAccess } from "@/lib/commander-central-policy.mjs";
import { localRolePermissions } from "@/lib/central-route-policy.mjs";
import { resolveTenantMembership } from "@/lib/tenant-context";
import { setCentralCookies } from "@/lib/central-session";
import { provisionCentralViewerOnLogin } from "@/lib/central-viewer-provision";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const deny = (stage = 'policy') => { console.warn('[INT01 BROKER] denied:', stage); return NextResponse.json({ ok: false, code: 'ACCESS_NOT_AUTHORIZED' }, { status: 403, headers: noStore }); };

/**
 * Explicitly linked central identity => existing Commander Auth account.
 * No local password and no self-provisioning. The returned one-time hash is
 * redeemed with the Commander Supabase Auth server, which issues its normal
 * JWT with local auth.uid() and retains RLS.
 *
 * Feature-flagged OFF by default. QA remains pinned to its pilot tenant;
 * linked-tenant mode requires an independent feature flag.
 * Not a generic token exchange / not an Auth bypass.
 */
export async function POST(request: NextRequest) {
  if (process.env.COMMANDER_CENTRAL_BROKER_ENABLED !== "true" ||
      process.env.COMMANDER_CENTRAL_AUTH_ENABLED !== "true" ||
      process.env.SERVICE_7SERVICE_ENFORCE_USER_ACCESS !== "true")
    return NextResponse.json({ ok:false, code:"BROKER_DISABLED" }, {status:404, headers:noStore});
  if (!sameOriginMutation(request)) return deny();
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 4096) return deny();

  let body: unknown;
  try { body = await request.json(); } catch { return deny(); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return deny();
  const input = body as Record<string, unknown>;
  if (typeof input.email !== "string" || typeof input.password !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) ||
      input.email.length > 320 || input.password.length < 1 || input.password.length > 2048)
    return deny();

  const linkedMode = process.env.COMMANDER_CENTRAL_BROKER_MULTITENANT_ENABLED === "true"
    && process.env.SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS === "true";
  const pilot = process.env.SERVICE_7SERVICE_PILOT_ORG_ID ?? "";
  if (!linkedMode && !uuid.test(pilot)) return deny();
  const centralUrl = process.env.SERVICE_7SERVICE_SUPABASE_URL;
  const centralKey = process.env.SERVICE_7SERVICE_SUPABASE_ANON_KEY;
  if (!centralUrl || !centralKey) return deny();

  try {
    const auth = createClient(centralUrl, centralKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const result = await auth.auth.signInWithPassword({ email: input.email.trim(), password: input.password });
    const session = result.data.session;
    if (result.error || !session?.access_token || !session.user) return deny('central-login');

    const db = getSupabaseServerClient();
    if (!db) return deny('local-db-unavailable');
    const centralOrigin = process.env.SERVICE_7SERVICE_ORIGIN ?? "";
    let localUserId = "";
    let identityId = "";
    let candidateOrgIds: string[] = [];
    if (linkedMode) {
      // Identify the central user without asking them to choose any company.
      const verifiedOrigin = new URL(centralOrigin);
      if (verifiedOrigin.protocol !== "https:" || verifiedOrigin.username ||
          verifiedOrigin.password || verifiedOrigin.port || verifiedOrigin.pathname !== "/" ||
          verifiedOrigin.search || verifiedOrigin.hash) return deny();
      const self = await fetch(new URL("/api/v1/identity/self", verifiedOrigin), {
        headers: { Authorization: "Bearer " + session.access_token },
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
      });
      const identity = await self.json().catch(() => null) as
        | {authorized?:boolean;identityId?:string} | null;
      if (!self.ok || !identity?.authorized || !uuid.test(identity.identityId ?? "")) return deny('central-identity-self-' + self.status);
      identityId = identity.identityId!;
      const linked = await db.from("central_identity_user_links")
        .select("central_identity_id,commander_user_id,status")
        .eq("central_identity_id",identityId).eq("status","ACTIVE").limit(2);
      if (linked.error || (linked.data?.length ?? 0) > 1) return deny();
      localUserId = linked.data?.[0]?.commander_user_id ?? "";
      if (!localUserId) localUserId = await provisionCentralViewerOnLogin({
        db,origin:centralOrigin,accessToken:session.access_token,
        identityId,email:session.user.email??"",
        emailVerified:Boolean(session.user.email_confirmed_at),
        companyId:process.env.SERVICE_7SERVICE_PILOT_ORG_ID??"",
      }) ?? "";
      if (!uuid.test(localUserId)) return deny('jit-user-not-provisioned');
      const [memberships, profile] = await Promise.all([
        db.from("organization_members").select("organization_id,status")
          .eq("user_id",localUserId).in("status",["active","suspended"]).limit(51),
        db.from("profiles").select("active_organization_id")
          .eq("user_id",localUserId).maybeSingle(),
      ]);
      if (memberships.error || profile.error || !memberships.data?.length || memberships.data.length > 50)
        return deny();
      const current = profile.data?.active_organization_id;
      candidateOrgIds = memberships.data.map(row => row.organization_id)
        .filter((value):value is string=>typeof value==="string"&&uuid.test(value));
      // Current active company first, then stable order. A company must also
      // pass the product entitlement decision before it can be selected.
      candidateOrgIds.sort((a,b)=>a===current?-1:b===current?1:a.localeCompare(b));
    } else {
      candidateOrgIds = [pilot];
    }

    let selectedOrg = "";
    let decision: Awaited<ReturnType<typeof checkCentralProductAccess>> | null = null;
    let matchedCompany: {central_client_id:string;commander_company_id:string;status:string} | null = null;
    let matchedRole = "";
    for (const orgId of candidateOrgIds) {
      const company = await db.from("central_client_company_links")
        .select("central_client_id,commander_company_id,status")
        .eq("commander_company_id",orgId).eq("status","ACTIVE").maybeSingle();
      if (company.error) return deny();
      if (!company.data?.central_client_id) continue;
      const currentDecision = await checkCentralProductAccess({
        centralUrl:centralOrigin,centralAccessToken:session.access_token,
        clientId:company.data.central_client_id,productCode:"COMMANDER7",
      });
      if (!currentDecision.allowed || !uuid.test(currentDecision.identityId)) continue;
      if (linkedMode && currentDecision.identityId !== identityId) continue;

      const links = linkedMode ? null : await db.from("central_identity_user_links")
        .select("central_identity_id,commander_user_id,status")
        .eq("central_identity_id",currentDecision.identityId).eq("status","ACTIVE").limit(2);
      if (!linkedMode) {
        if (!links || links.error || (links.data?.length??0)>1) continue;
        identityId = currentDecision.identityId;
        localUserId = links.data?.[0]?.commander_user_id ?? "";
        if (!localUserId) localUserId = await provisionCentralViewerOnLogin({
          db,origin:centralOrigin,accessToken:session.access_token,
          identityId,email:session.user.email??"",
          emailVerified:Boolean(session.user.email_confirmed_at),
          companyId:orgId,
        }) ?? "";
      }
      if (!uuid.test(localUserId)) continue;
      // Reinstatement requires an ACTIVE central product grant and a suspension
      // previously created by INT-01 itself. Manual suspensions are never undone.
      const suspended=await db.from("organization_members").select("status")
        .eq("user_id",localUserId).eq("organization_id",orgId).maybeSingle();
      if (suspended.error || !suspended.data) continue;
      if (suspended.data.status === "suspended") {
        if (!currentDecision.roleCodes.includes("VIEWER")) continue;
        const reactivated=await db.rpc("int01_sync_central_membership",{
          p_user:localUserId,p_company:orgId,p_authorized:true,
        });
        if (reactivated.error || reactivated.data!==true) continue;
      }
      const member = await resolveTenantMembership(localUserId,orgId);
      if (!member) continue;
      const roleLinks = await db.from("central_product_role_links")
        .select("central_product_code,central_role_code,commander_role,allowed_permissions,status")
        .eq("central_product_code","COMMANDER7").eq("status","ACTIVE")
        .in("central_role_code",currentDecision.roleCodes);
      if (roleLinks.error) return deny();
      const policy = evaluateCommanderCentralAccess({
        enabled:true,productCode:"COMMANDER7",requestedCompanyId:orgId,
        requiredLocalPermission:"organizations.view",
        central:{verified:true,accessTokenVerified:true,identityId:currentDecision.identityId,
          clientId:currentDecision.clientId,
          decision:{...currentDecision,reasonCode:"ACCESS_GRANTED",productCode:"COMMANDER7"}},
        local:{verified:true,userId:localUserId,companyId:orgId,
          membershipActive:true,role:member.role,
          permissions:[...localRolePermissions[member.role]]},
        mapping:{status:"ACTIVE",companyStatus:company.data.status,identityStatus:"ACTIVE",
          clientId:company.data.central_client_id,companyId:orgId,
          identityId:currentDecision.identityId,userId:localUserId},
        roleLinks:(roleLinks.data??[]).map(row=>({
          status:row.status,productCode:row.central_product_code,
          centralRoleCode:row.central_role_code,commanderRole:row.commander_role,
          allowedPermissions:row.allowed_permissions,
        })),
      });
      if (!policy.allowed) continue;
      selectedOrg=orgId;
      decision=currentDecision;
      matchedCompany=company.data;
      matchedRole=member.role;
      break;
    }
    if (!selectedOrg || !decision || !matchedCompany || !matchedRole) return deny('central-local-policy');

    // A suspended local user may never be revived by a central grant.
    const localAccess=await db.from("internal_user_access")
      .select("active").eq("user_id",localUserId).maybeSingle();
    if (localAccess.error || localAccess.data?.active===false) return deny();

    // The target company is server-selected from a currently authorized product
    // grant, never from the login form. Users may switch inside the workspace.
    if (linkedMode) {
      const updated = await db.from("profiles")
        .update({active_organization_id:selectedOrg})
        .eq("user_id",localUserId).select("user_id").maybeSingle();
      if (updated.error || !updated.data) return deny();
    }

    const local = await db.auth.admin.getUserById(localUserId);
    if (local.error || !local.data.user || !local.data.user.email ||
        local.data.user.banned_until &&
        new Date(local.data.user.banned_until).getTime() > Date.now()) return deny();

    // generateLink never sends a recovery email. Its token is single-use,
    // and the resulting session is issued by the Commander's own Auth server.
    const link = await db.auth.admin.generateLink({
      type:"magiclink", email:local.data.user.email,
    });
    if (link.error || link.data.user?.id !== localUserId ||
        !link.data.properties?.hashed_token) return deny();

    const response = NextResponse.json({
      ok:true, tokenHash: link.data.properties.hashed_token, localUserId,
    }, { headers:noStore });
    setCentralCookies(response, session);
    return response;
  } catch {
    return deny('unexpected'); // no raw provider errors or identity details
  }
}
