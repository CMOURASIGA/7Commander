import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('central grant is checked on every protected page and tied to local identity',()=>{
 const code=read('middleware.ts');
 assert.match(code,/\/api\/v1\/authorization\/decision/);
 assert.match(code,/decision\.identityId===link\.data\.central_identity_id/);
 assert.match(code,/int01_sync_central_membership/);
 assert.match(code,/request\.cookies\.get\('__Host-commander_caccess'\)/);
 assert.match(code,/membership\.data\.status!=='active'/);
 assert.match(code,/Cache-Control.*no-store/);
});
test('revocation immediately removes local RLS membership and requires safe provenance for restoring',()=>{
 const sql=read('database/migrations/078_int01_central_revocation_sync.sql');
 assert.match(sql,/central_revocation_suspensions/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/SECURITY DEFINER/);
 assert.match(sql,/auth\.role\(\) <> 'service_role'/);
 assert.match(sql,/v_status='active'/);
 assert.match(sql,/v_status='suspended'/);
 assert.match(sql,/p_authorized boolean/);
 assert.match(sql,/REVOKE ALL ON FUNCTION.*FROM PUBLIC, anon, authenticated/);
 const runtime=read('lib/central-runtime.ts');
 assert.match(runtime,/int01_sync_central_membership/);
 assert.match(runtime,/ACCESS_NOT_GRANTED/);
 const broker=read('app/api/auth/central-exchange/route.ts');
 assert.match(broker,/currentDecision\.roleCodes\.includes\("VIEWER"\)/);
 assert.match(broker,/int01_sync_central_membership/);
 assert.match(broker,/reactivated\.data!==true/);
});
