import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../database/migrations/077_int01_central_viewer_rls_write_guard.sql', import.meta.url), 'utf8');
const policy = await import('../lib/central-route-policy.mjs');

test('central VIEWER direct database writes fail closed across 24 tenant tables', () => {
  for (const name of [
    'agent_runs','conversations','decision_status_history','decisions',
    'integration_executions','integration_logs','kairos_profiles',
    'knowledge_base','knowledge_chunks','knowledge_embeddings',
    'memories','messages','project_invites','project_members','risks',
    'task_activity_log','task_attachments','task_boards','task_checklist_items',
    'task_checklists','task_columns','task_comments','task_daily_selections','task_labels',
  ]) assert.ok(migration.includes("'" + name + "'"), name);
  assert.match(migration, /table_count <> 24/);
  for (const method of ['INSERT','UPDATE','DELETE']) {
    assert.match(migration, new RegExp('AS RESTRICTIVE FOR ' + method));
  }
  assert.match(migration, /NOT \(SELECT public\.int01_is_central_readonly_member\(\)\)/);
  assert.match(migration, /central_identity_user_links/);
  assert.match(migration, /m\.role = 'member'/);
  assert.match(migration, /l\.status = 'ACTIVE'/);
  assert.match(migration, /m\.status = 'active'/);
  assert.match(migration, /REVOKE ALL ON FUNCTION.*FROM PUBLIC, anon/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION.*TO authenticated/);
});

test('central HTTP route permission ceiling denies writes for local member', () => {
  const cases = ['/api/projects','/api/tasks','/api/risks','/api/decisions',
    '/api/clients','/api/planning','/api/status-report','/api/knowledge','/api/activities'];
  const perms = new Set(policy.localRolePermissions.member);
  for (const path of cases) {
    for (const verb of ['POST','PATCH','PUT','DELETE']) {
      const required = policy.permissionForRoute(path,verb);
      assert.ok(!required || !perms.has(required), path + ' ' + verb);
    }
  }
  assert.equal(policy.permissionForRoute('/api/projects','GET'),'projects.view');
  assert.equal(policy.permissionForRoute('/api/risks','GET'),'risks.view');
});
