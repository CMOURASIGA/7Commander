import {test} from 'node:test';
import assert from 'node:assert/strict';
import {permissionForRoute,localRolePermissions} from '../lib/central-route-policy.mjs';
const cases=[
 ['/api/chat','POST','chat.use'],['/api/conversations','GET','conversations.view'],
 ['/api/conversations/a/messages','POST','conversations.write'],
 ['/api/memories/a','DELETE','memories.delete'],['/api/voice/transcribe','POST','voice.use'],
 ['/api/daily','GET','daily.view'],['/api/integrations/n8n/flows','POST','integrations.execute'],
 ['/api/integrations/gmail/messages','GET','integrations.read'],
 ['/api/kairos/profile','PATCH','kairos.profile.write'],['/api/auth/profile','POST','profile.write'],
 ['/api/platform/companies','POST',null],['/api/admin/users','POST',null],
 ['/api/auth/central-session','POST',null],['/api/health/env','GET',null],
 ['/api/projects','TRACE',null],['/api/surprise','GET',null]
];
for(const [path,method,expected] of cases)test(`${method} ${path}`,()=>assert.equal(permissionForRoute(path,method),expected));
test('new high-risk modules not implicitly granted to existing roles',()=>{
 for(const perms of Object.values(localRolePermissions)){
  assert.equal(perms.includes('integrations.execute'),false);
  assert.equal(perms.includes('chat.use'),false);
  assert.equal(perms.includes('voice.use'),false);
 }
});
