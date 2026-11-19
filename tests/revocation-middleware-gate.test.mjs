import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('server-to-server revocation POST bypasses only local-session middleware', () => {
  const middleware = read('middleware.ts');
  const endpoint = read('app/api/integrations/7service/revocation/route.ts');
  assert.match(middleware, /const signedRevocationRoute = request\.nextUrl\.pathname==="\/api\/integrations\/7service\/revocation" &&\s*request\.method==="POST"/);
  assert.match(middleware, /publicPage\(request\.nextUrl\.pathname\)\|\|authBootstrapRoute\|\|signedRevocationRoute/);
  assert.match(endpoint, /timingSafeEqual/);
  assert.match(endpoint, /createHmac\('sha256', secret\)/);
  assert.match(endpoint, /\.eq\('status', 'ACTIVE'\)/);
  assert.match(endpoint, /data\.operation !== 'SUSPEND'/);
  assert.match(endpoint, /data\.productCode !== 'COMMANDER7'/);
});
