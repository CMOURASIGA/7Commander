import test from "node:test";
import assert from "node:assert/strict";
import {permissionForRoute, localRolePermissions} from "../lib/central-route-policy.mjs";

test("centrally linked VIEWER may read the exact Scrum data endpoints", () => {
  for (const route of [
    "/api/scrum", "/api/scrum/backlog-items", "/api/scrum/stories",
    "/api/scrum/project-members", "/api/scrum/notifications",
  ]) {
    assert.equal(permissionForRoute(route, "GET"), "planning.view", route);
  }
  assert.ok(localRolePermissions.member.includes("planning.view"));
});

test("Scrum writes require a central planning.write entitlement, never VIEWER", () => {
  for (const route of ["/api/scrum", "/api/scrum/backlog-items", "/api/scrum/stories"]) {
    assert.equal(permissionForRoute(route,"POST"),"planning.write");
  }
  assert.ok(localRolePermissions.admin.includes("planning.write"));
  assert.ok(localRolePermissions.manager.includes("planning.write"));
  assert.ok(!localRolePermissions.member.includes("planning.write"));
  assert.equal(permissionForRoute("/api/scrum/kairos-insights","POST"),null);
  assert.equal(permissionForRoute("/api/scrum/private","POST"),null);
});

test("Scrum route whitelist is exact and does not grant unrelated endpoints", () => {
  assert.equal(permissionForRoute("/api/scrum/private", "GET"), null);
  assert.equal(permissionForRoute("/api/scrum/backlog-items/private", "GET"), null);
  assert.equal(permissionForRoute("/api/scrum2", "GET"), null);
});
