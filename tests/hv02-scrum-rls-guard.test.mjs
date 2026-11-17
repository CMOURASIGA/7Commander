import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("HV-02 Scrum RLS requires project company to equal item company", () => {
  const sql = readFileSync(new URL("../database/migrations/079_hv02_scrum_project_tenant_rls_guard.sql", import.meta.url), "utf8");
  assert.match(sql, /pr\.organization_id\s*=\s*scrum_backlog_items\.organization_id/);
  assert.match(sql, /pr\.organization_id\s*=\s*scrum_user_stories\.organization_id/);
  assert.doesNotMatch(sql, /pr\.organization_id\s*=\s*pr\.organization_id/);
  assert.match(sql, /expected Scrum RLS policies are missing/);
});
