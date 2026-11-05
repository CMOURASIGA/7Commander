import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCommanderCentralAccess } from "../lib/commander-central-policy.mjs";
import { permissionForRoute, localRolePermissions } from "../lib/central-route-policy.mjs";

const id = {
 company: "5339d662-4e58-4300-8f68-e95c14e7bc97",
 other: "11111111-1111-4111-8111-111111111111",
 user: "a4797166-ba79-4f4d-8639-3bdd20118ba4",
 identity: "46f954fd-8f5c-4a14-a619-ffed3be11d39",
 otherIdentity: "22222222-2222-4222-8222-222222222222",
 client: "9809eae5-8c9e-4ac1-9578-46a653e192c4",
};
const centralRole = "VIEWER";
function granted(permission = "projects.view") {
 return {
  enabled: true, productCode: "COMMANDER7",
  requestedCompanyId: id.company, requiredLocalPermission: permission,
  central: {
   verified: true, accessTokenVerified: true, identityId: id.identity,
   clientId: id.client, decision: {
    allowed: true, reasonCode: "ACCESS_GRANTED", identityId: id.identity,
    clientId: id.client, productCode: "COMMANDER7", roleCodes: [centralRole],
   },
  },
  local: {
   verified: true, userId: id.user, companyId: id.company,
   membershipActive: true, role: "member",
   permissions: [...localRolePermissions.member],
  },
  mapping: {
   status: "ACTIVE", companyStatus: "ACTIVE", identityStatus: "ACTIVE",
   clientId: id.client, companyId: id.company,
   identityId: id.identity, userId: id.user,
  },
  roleLinks: [{
   status: "ACTIVE", productCode: "COMMANDER7", centralRoleCode: centralRole,
   commanderRole: "member", allowedPermissions: [...localRolePermissions.member],
  }],
 };
}
test("R5: viewer reads only mapped resources", () => {
 for (const permission of ["clients.view", "projects.view", "tasks.view", "organizations.view"]) {
  assert.equal(evaluateCommanderCentralAccess(granted(permission)).allowed, true, permission);
 }
});
test("R5: viewer cannot mutate even with forged central permission", () => {
 for (const path of ["/api/clients", "/api/projects", "/api/organizations/select"]) {
  const permission = permissionForRoute(path, "POST");
  assert.ok(permission, path);
  const input = granted(permission);
  input.roleLinks[0].allowedPermissions.push(permission);
  const verdict = evaluateCommanderCentralAccess(input);
  assert.equal(verdict.allowed, false, path);
  assert.equal(verdict.reasonCode, "LOCAL_PERMISSION_DENIED");
 }
});
test("R5: tenant and identity substitutions always fail closed", () => {
 const cases = [
  x => { x.requestedCompanyId = id.other; },
  x => { x.local.companyId = id.other; },
  x => { x.mapping.companyId = id.other; },
  x => { x.mapping.identityId = id.otherIdentity; },
  x => { x.central.identityId = id.otherIdentity; },
  x => { x.central.decision.identityId = id.otherIdentity; },
  x => { x.mapping.status = "REVOKED"; },
  x => { x.mapping.identityStatus = "REVOKED"; },
  x => { x.local.membershipActive = false; },
  x => { x.central.accessTokenVerified = false; },
  x => { x.central.decision.allowed = false; },
  x => { x.roleLinks[0].status = "REVOKED"; },
  x => { x.enabled = false; },
 ];
 for (const mutate of cases) {
  const input = granted();
  mutate(input);
  assert.equal(evaluateCommanderCentralAccess(input).allowed, false, mutate.toString());
 }
});
test("R5: every sensitive operation has explicit fail-closed policy", () => {
 assert.equal(permissionForRoute("/api/clients", "POST"), "clients.write");
 assert.equal(permissionForRoute("/api/organizations/select", "POST"), "organizations.select");
 assert.equal(permissionForRoute("/api/projects", "DELETE"), "projects.delete");
 assert.equal(permissionForRoute("/api/my-tasks", "GET"), "tasks.view");
 assert.equal(permissionForRoute("/api/unknown-new-endpoint", "POST"), null);
 assert.equal(permissionForRoute("/api/organizations/select", "GET"), null);
 assert.equal(permissionForRoute("/api/auth/internal-user-admin", "POST"), null);
});
test("R5: admin tenant role does not override a central viewer ceiling", () => {
 const input = granted("projects.write");
 input.local.role = "admin";
 input.local.permissions = [...localRolePermissions.admin];
 input.roleLinks = [{
  status: "ACTIVE", productCode: "COMMANDER7", centralRoleCode: centralRole,
  commanderRole: "admin", allowedPermissions: ["projects.view"],
 }];
 const decision = evaluateCommanderCentralAccess(input);
 assert.equal(decision.allowed, false);
 assert.equal(decision.reasonCode, "CENTRAL_ROLE_PERMISSION_DENIED");
});
