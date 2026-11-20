import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("JIT must not default new linked-tenant viewers to pilot company", () => {
  const broker = source("app/api/auth/central-exchange/route.ts");
  const provisioner = source("lib/central-customer-provision.ts");
  // The server verifies the authenticated identity's entitlement for each
  // explicitly linked company. A separate membership-list endpoint is not
  // required and must never become a source of implicit tenant access.
  assert.doesNotMatch(broker, /\/api\/v1\/authorization\/memberships/);
  assert.match(broker, /checkCentralProductAccess\(/);
  assert.match(broker, /entitlement\.identityId !== identityId/);
  assert.match(broker, /\["VIEWER","MEMBER","ADMIN"\]\.includes\(entitlement\.roleCodes\[0\]\)/);
  assert.match(broker, /\.eq\("status","ACTIVE"\)\.limit\(51\)/);
  assert.match(broker, /companyId:company\.commander_company_id/);
  assert.match(provisioner, /COMMANDER_CENTRAL_BROKER_MULTITENANT_ENABLED/);
  assert.match(provisioner, /SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS/);
  assert.match(provisioner, /decision\.roleCodes\[0\] !== input\.roleCode/);
  assert.match(provisioner, /central_identity_user_links/);
  assert.match(provisioner, /provision_central_customer_atomic/);
});


test("JIT never provisions OWNER and requires exact role code mapping", () => {
  const broker = source("app/api/auth/central-exchange/route.ts");
  const provisioner = source("lib/central-customer-provision.ts");
  const migration = source("database/migrations/077_int01_customer_multirole_jit.sql");
  assert.match(broker, /\["VIEWER","MEMBER","ADMIN"\]/);
  assert.doesNotMatch(broker, /\["VIEWER","MEMBER","ADMIN","OWNER"\]/);
  assert.match(provisioner, /decision\.roleCodes\[0\] !== input\.roleCode/);
  assert.match(provisioner, /existing-auth-requires-review/);
  assert.match(migration, /Active central role mapping required/);
  assert.match(migration, /p_role NOT IN \('member','manager','admin'\)/);
});
