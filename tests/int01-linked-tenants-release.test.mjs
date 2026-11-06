import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("single login never selects a tenant in the browser",()=>{
 const login=source("app/login/page.tsx");
 const broker=source("app/api/auth/central-exchange/route.ts");
 assert.match(login,/\/api\/auth\/central-exchange/);
 assert.doesNotMatch(login,/organizationId:selected|CLIENT_ORG_ID|selectedCompany/);
 assert.match(broker,/\/api\/v1\/identity\/self/);
 assert.match(broker,/central_identity_user_links/);
 assert.match(broker,/central_client_company_links/);
 assert.match(broker,/SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS/);
 assert.match(broker,/SERVICE_7SERVICE_PILOT_ORG_ID/);
 assert.match(broker,/checkCentralProductAccess/);
 assert.match(broker,/evaluateCommanderCentralAccess/);
 assert.match(broker,/localAccess\.data\?\.active===false/);
 assert.match(broker,/link\.data\.user\?\.id !== localUserId/);
});
test("production authorization checks linked company on each API request",()=>{
 const auth=source("lib/api-auth.ts");
 const middleware=source("middleware.ts");
 assert.match(auth,/SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS/);
 assert.match(auth,/const customerCentral = customerPilot \|\| linkedTenant/);
 assert.match(auth,/authorizeCentralPilot\(request, userId, organizationId\)/);
 assert.match(middleware,/SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS/);
 assert.match(middleware,/platform_admins/);
 assert.match(middleware,/central_client_company_links/);
});
test("viewer company switch is explicit, target-checked and audited",()=>{
 const select=source("app/api/organizations/select/route.ts");
 const list=source("app/api/organizations/mine/route.ts");
 const ui=source("app/organizations/page.tsx");
 assert.match(select,/resolveTenantMembership\(auth\.context\.userId, body\.organizationId\)/);
 assert.match(select,/authorizeCentralPilot\(request,auth\.context\.userId,/);
 assert.match(select,/recordCentralDecision/);
 assert.match(list,/authorizeCentralPilot\(request,auth\.context\.userId,row\.organization_id\)/);
 assert.match(ui,/Pesquisar empresa/);
 assert.match(ui,/canSwitchCompany/);
});
test("UI capabilities fail closed and never grant API permissions",()=>{
 const ui=source("lib/use-central-pilot-read-only.ts");
 const caps=source("app/api/auth/ui-capabilities/route.ts");
 assert.match(ui,/\/api\/auth\/ui-capabilities/);
 assert.match(ui,/readOnly:true,checking:false,canSwitchCompany:false/);
 assert.match(caps,/requireApiAuth\(request\)/);
 assert.match(caps,/authorizeCentralPilot/);
 assert.match(caps,/readOnly:!canWrite/);
});
test("productive readiness rejects the QA pilot configuration",()=>{
 const ready=source("app/api/health/ready/route.ts");
 assert.match(ready,/VERCEL_ENV === "production"/);
 assert.match(ready,/SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS/);
 assert.match(ready,/!process\.env\.SERVICE_7SERVICE_PILOT_ORG_ID/);
 assert.match(ready,/status:503/);
});

test("logout revokes both local and central browser sessions",()=>{
 const auth=source("components/auth/kairos-auth-provider.tsx");
 assert.match(auth,/event === 'SIGNED_OUT'/);
 assert.match(auth,/\/api\/auth\/local-session/);
 assert.match(auth,/\/api\/auth\/central-session/);
 assert.match(auth,/method:'DELETE'/);
});
