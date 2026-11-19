import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Scrum assignment writes reject non-active cross-company assignees", () => {
  const guard = source("lib/tenant-assignee-authorization.ts");
  assert.match(guard, /organization_members/);
  assert.match(guard, /project_members/);
  assert.match(guard, /\.eq\("organization_id", input\.organizationId\)/);
  assert.match(guard, /\.eq\("status", "active"\)/);
  assert.match(guard, /activeProjectStates/);
  assert.match(guard, /internal_user_access/);
  assert.match(guard, /row\.active === false/);
  for (const path of ["app/api/scrum/stories/route.ts", "app/api/scrum/backlog-items/route.ts"]) {
    const route = source(path);
    assert.match(route, /isEligibleProjectAssignee\(\{organizationId:org,projectId,email:responsible\}\)/);
    assert.match(route, /Responsável sem vínculo ativo/);
  }
});
