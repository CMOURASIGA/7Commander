import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("JIT must not default new linked-tenant viewers to pilot company", () => {
  const broker = source("app/api/auth/central-exchange/route.ts");
  const provisioner = source("lib/central-viewer-provision.ts");
  // The server verifies the authenticated identity's entitlement for each
  // explicitly linked company. A separate membership-list endpoint is not
  // required and must never become a source of implicit tenant access.
  assert.doesNotMatch(broker, /\/api\/v1\/authorization\/memberships/);
  assert.match(broker, /checkCentralProductAccess\(/);
  assert.match(broker, /entitlement\.identityId !== identityId/);
  assert.match(broker, /entitlement\.roleCodes\[0\] !== "VIEWER"/);
  assert.match(broker, /\.eq\("status","ACTIVE"\)\.limit\(51\)/);
  assert.match(broker, /companyId:company\.commander_company_id/);
  assert.match(provisioner, /COMMANDER_CENTRAL_BROKER_MULTITENANT_ENABLED/);
  assert.match(provisioner, /SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS/);
  assert.match(provisioner, /decision\.roleCodes\[0\] !== 'VIEWER'/);
  assert.match(provisioner, /central_identity_user_links/);
  assert.match(provisioner, /provision_central_viewer_atomic/);
});
