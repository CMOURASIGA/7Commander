import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sameOriginMutation } from "@/lib/central-local-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { checkCentralProductAccess } from "@/lib/7service-authorization";
import { evaluateCommanderCentralAccess } from "@/lib/commander-central-policy.mjs";
import { localRolePermissions } from "@/lib/central-route-policy.mjs";
import { resolveTenantMembership } from "@/lib/tenant-context";
import { setCentralCookies } from "@/lib/central-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const deny = () => NextResponse.json({ ok: false, code: "ACCESS_NOT_AUTHORIZED" }, { status: 403, headers: noStore });

/**
 * Explicitly linked central identity => existing Commander Auth account.
 * No local password and no self-provisioning. The returned one-time hash is
 * redeemed with the Commander Supabase Auth server, which issues its normal
 * JWT with local auth.uid() and retains RLS.
 *
 * Feature-flagged OFF by default, and restricted to the INT-01 QA tenant.
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

  const pilot = process.env.SERVICE_7SERVICE_PILOT_ORG_ID ?? "";
  if (!uuid.test(pilot)) return deny();
  const centralUrl = process.env.SERVICE_7SERVICE_SUPABASE_URL;
  const centralKey = process.env.SERVICE_7SERVICE_SUPABASE_ANON_KEY;
  if (!centralUrl || !centralKey) return deny();

  try {
    const auth = createClient(centralUrl, centralKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const result = await auth.auth.signInWithPassword({ email: input.email.trim(), password: input.password });
    const session = result.data.session;
    if (result.error || !session?.access_token || !session.user) return deny();

    const db = getSupabaseServerClient();
    if (!db) return deny();
    const company = await db.from("central_client_company_links")
      .select("central_client_id,commander_company_id,status")
      .eq("commander_company_id", pilot).eq("status", "ACTIVE").maybeSingle();
    if (company.error || !company.data?.central_client_id) return deny();

    // Central decision derives central identity from the independently verified
    // Supabase JWT, not from the request email or a caller-supplied UUID.
    const decision = await checkCentralProductAccess({
      centralUrl: process.env.SERVICE_7SERVICE_ORIGIN ?? "",
      centralAccessToken: session.access_token,
      clientId: company.data.central_client_id,
      productCode: "COMMANDER7",
    });
    if (!decision.allowed || !uuid.test(decision.identityId)) return deny();

    const links = await db.from("central_identity_user_links")
      .select("central_identity_id,commander_user_id,status")
      .eq("central_identity_id", decision.identityId).eq("status", "ACTIVE").limit(2);
    if (links.error || links.data?.length !== 1) return deny();
    const localUserId = links.data[0].commander_user_id;
    if (!uuid.test(localUserId)) return deny();

    const member = await resolveTenantMembership(localUserId, pilot);
    if (!member) return deny();
    const roleLinks = await db.from("central_product_role_links")
      .select("central_product_code,central_role_code,commander_role,allowed_permissions,status")
      .eq("central_product_code", "COMMANDER7").eq("status", "ACTIVE")
      .in("central_role_code", decision.roleCodes);
    if (roleLinks.error) return deny();

    const policy = evaluateCommanderCentralAccess({
      enabled: true, productCode: "COMMANDER7",
      requestedCompanyId: pilot, requiredLocalPermission: "organizations.view",
      central: {
        verified:true, accessTokenVerified:true, identityId:decision.identityId,
        clientId:decision.clientId, decision: {
          allowed:true, reasonCode:"ACCESS_GRANTED", identityId:decision.identityId,
          clientId:decision.clientId, productCode:"COMMANDER7", roleCodes:decision.roleCodes,
        },
      },
      local: {
        verified:true, userId:localUserId, companyId:pilot,
        membershipActive:true, role:member.role,
        permissions:[...localRolePermissions[member.role]],
      },
      mapping: {
        status:"ACTIVE", companyStatus: company.data.status, identityStatus:links.data[0].status,
        clientId:company.data.central_client_id, companyId:pilot,
        identityId:decision.identityId, userId:localUserId,
      },
      roleLinks: (roleLinks.data ?? []).map(row => ({
        status:row.status, productCode:row.central_product_code,
        centralRoleCode:row.central_role_code, commanderRole:row.commander_role,
        allowedPermissions:row.allowed_permissions,
      })),
    });
    if (!policy.allowed) return deny();

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
    return deny(); // no raw provider errors or identity details
  }
}
