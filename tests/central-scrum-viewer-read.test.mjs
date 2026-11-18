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

test("central VIEWER has no Scrum mutation permissions or AI generation privilege", () => {
  for (const route of [
    "/api/scrum", "/api/scrum/backlog-items", "/api/scrum/stories",
    "/api/scrum/project-members", "/api/scrum/notifications",
    "/api/scrum/kairos-insights",
  ]) {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      assert.equal(permissionForRoute(route, method), null, route + " " + method);
    }
  }
  assert.ok(!localRolePermissions.member.includes("planning.write"));
  assert.equal(permissionForRoute("/api/scrum/kairos-insights", "GET"), null);
});

test("Scrum route whitelist is exact and does not grant unrelated endpoints", () => {
  assert.equal(permissionForRoute("/api/scrum/private", "GET"), null);
  assert.equal(permissionForRoute("/api/scrum/backlog-items/private", "GET"), null);
  assert.equal(permissionForRoute("/api/scrum2", "GET"), null);
});
