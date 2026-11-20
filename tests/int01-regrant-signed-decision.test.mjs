import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac, timingSafeEqual } from 'node:crypto';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('regrant uses the established signed channel without legacy machine-token dependency',()=>{
  const receiver=read('app/api/integrations/7service/revocation/route.ts');
  const src=read('lib/central-runtime.ts');
  assert.match(receiver,/CHECK_REGRANT/);
  assert.match(receiver,/createHmac\('sha256',secret\)/);
  assert.match(receiver,/x-7service-signature/);
  assert.match(receiver,/Central grant and local role must match/);
  assert.match(receiver,/CENTRAL_REVOCATION_SYNC/);
  assert.match(receiver,/Central confirmation unavailable/);
  assert.doesNotMatch(receiver,/query7ServiceUserAccess/);
  assert.match(src,/checkCentralProductAccess/);
});
test('signed timestamp and body resist tampering and stale requests',()=>{
  const secret='contract-only-secret-that-is-not-production';
  const body=JSON.stringify({identityId:'00000000-0000-0000-0000-000000000001',clientId:'00000000-0000-0000-0000-000000000002',productCode:'COMMANDER7',operation:'CHECK_REGRANT'});
  const now=Date.now();
  const sign=(time,payload)=>createHmac('sha256',secret).update(String(time)+'.'+payload).digest();
  const signature=sign(now,body);
  assert.ok(timingSafeEqual(signature,sign(now,body)));
  assert.ok(!timingSafeEqual(signature,sign(now,body.replace('CHECK_REGRANT','SUSPEND'))));
  assert.ok(!timingSafeEqual(signature,sign(now-61000,body)));
  assert.ok(Math.abs(now-(now-61000))>60000);
});