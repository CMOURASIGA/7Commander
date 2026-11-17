import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("JIT must not default new linked-tenant viewers to pilot company", () => {
  const broker = source("app/api/auth/central-exchange/route.ts");
  const provisioner = source("lib/central-viewer-provision.ts");
  assert.match(broker, /\/api\/v1\/authorization\/memberships/);
  assert.match(broker, /\.in\("central_client_id",clientIds\)/);
  assert.match(broker, /companyId:company\.commander_company_id/);
  assert.match(provisioner, /COMMANDER_CENTRAL_BROKER_MULTITENANT_ENABLED/);
  assert.match(provisioner, /SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS/);
  assert.match(provisioner, /decision\.roleCodes\[0\] !== 'VIEWER'/);
  assert.match(provisioner, /central_identity_user_links/);
  assert.match(provisioner, /provision_central_viewer_atomic/);
});
