import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
const code=readFileSync(new URL('../app/api/integrations/7service/account-status/route.ts',import.meta.url),'utf8');
test('account readback is HMAC signed, read-only, tenant scoped and fail closed',()=>{
  assert.match(code,/createHmac\('sha256', secret\)/);
  assert.match(code,/timingSafeEqual/);
  assert.match(code,/CHECK_ACCOUNTS/);
  assert.match(code,/payload\.checks\.length > 40/);
  assert.match(code,/central_identity_user_links/);
  assert.match(code,/central_client_company_links/);
  assert.match(code,/organization_members/);
  assert.match(code,/getUserById/);
  assert.match(code,/member\.role !== roleMap\[check\.roleCode\]/);
  assert.doesNotMatch(code,/createUser|db\.from\([^)]*\)\.update\(|db\.from\([^)]*\)\.insert\(|db\.from\([^)]*\)\.delete\(/);
});
test('the shared timestamp/body signing contract is tamper evident',()=>{
 const secret='test-example-secret-very-long-not-a-production-key';
 const stamp=String(Date.now());
 const body=JSON.stringify({operation:'CHECK_ACCOUNTS',checks:[{identityId:'00000000-0000-0000-0000-000000000001',clientId:'00000000-0000-0000-0000-000000000002',roleCode:'ADMIN'}]});
 const sign=(v)=>createHmac('sha256',secret).update(stamp+'.'+v).digest('hex');
 assert.notEqual(sign(body),sign(body.replace('ADMIN','OWNER')));
});

test('middleware allows only signed POST readback without browser cookie',()=>{
 const middleware=readFileSync(new URL('../middleware.ts',import.meta.url),'utf8');
 assert.match(middleware,/request\.nextUrl\.pathname==="\/api\/integrations\/7service\/account-status"/);
 assert.match(middleware,/request\.method==="POST"/);
 assert.match(middleware,/signedRevocationRoute\) return NextResponse\.next\(\)/);
});
