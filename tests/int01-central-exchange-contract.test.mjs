import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const load = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
test("central broker must be off by default and only run with complete pilot flags", () => {
 const route = load("app/api/auth/central-exchange/route.ts");
 for (const flag of ["COMMANDER_CENTRAL_BROKER_ENABLED", "COMMANDER_CENTRAL_AUTH_ENABLED",
   "SERVICE_7SERVICE_ENFORCE_USER_ACCESS", "SERVICE_7SERVICE_PILOT_ORG_ID"])
   assert.ok(route.includes(flag), flag);
 assert.match(route, /sameOriginMutation\(request\)/);
});
test("central broker requires verified token decision, explicit link and active tenant", () => {
 const route = load("app/api/auth/central-exchange/route.ts");
 for (const check of ["checkCentralProductAccess", "central_identity_user_links",
  "central_client_company_links", "central_product_role_links", "resolveTenantMembership",
  "evaluateCommanderCentralAccess", "getUserById", "getSupabaseServerClient"])
  assert.ok(route.includes(check), check);
 assert.match(route, /\(links\.data\?\.length\?\?0\)>1/);
 assert.match(route, /provisionCentralViewerOnLogin/);
 assert.match(route, /link\.data\.user\?\.id !== localUserId/);
});
test("central broker does not mint a JWT or create local users", () => {
 const route = load("app/api/auth/central-exchange/route.ts");
 assert.doesNotMatch(route, /createUser\(|signJwt\(|jsonwebtoken|jwt\.sign/);
 assert.match(route, /admin\.generateLink/);
 assert.match(route, /setCentralCookies/);
 assert.match(route, /no-store/);
});
test("browser obtains native local Auth JWT from one-time token before navigating", () => {
 const page = load("app/login/page.tsx");
 assert.match(page, /auth\.verifyOtp\(/);
 assert.match(page, /token_hash:payload\.tokenHash/);
 assert.match(page, /exchange\.data\.user\?\.id !== payload\.localUserId/);
 assert.match(page, /\/api\/auth\/local-session/);
 assert.match(page, /window\.location\.assign\(nextPath\)/);
 assert.doesNotMatch(page, /Cliente 7Service.*Equipe Consult Services|clientMode/);
});

test("VIEWER first-login provisioning requires central grant, pilot flag and service-only RPC", () => {
 const provision = load("lib/central-viewer-provision.ts");
 const migration = load("database/migrations/076_int01_viewer_jit_provision.sql");
 assert.match(provision, /COMMANDER_CENTRAL_JIT_VIEWER_ENABLED/);
 assert.match(provision, /SERVICE_7SERVICE_PILOT_ORG_ID/);
 assert.match(provision, /decision\.roleCodes\[0\] !== 'VIEWER'/);
 assert.match(provision, /checkCentralProductAccess/);
 assert.match(provision, /existing local accounts|Existing local accounts/i);
 assert.match(provision, /provision_central_viewer_atomic/);
 assert.match(migration, /REVOKE ALL ON FUNCTION/);
 assert.match(migration, /FROM PUBLIC, anon, authenticated/);
 assert.match(migration, /GRANT EXECUTE ON FUNCTION/);
 assert.match(migration, /TO service_role/);
});
