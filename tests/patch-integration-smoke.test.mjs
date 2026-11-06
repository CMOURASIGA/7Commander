import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {execFileSync} from 'node:child_process';
const appRoot=path.resolve(import.meta.dirname,'..');
test('patch replaces legacy email-based central permission check only',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'int01-'));
 try {
  fs.mkdirSync(path.join(dir,'lib'));
  fs.writeFileSync(path.join(dir,'lib/api-auth.ts'), `import { shouldEnforceCustomerPilot } from "@/lib/customer-pilot";\nimport { query7ServiceUserAccess } from "@/lib/7service-user-access";\nconst customerPilot=shouldEnforceCustomerPilot({enabled: process.env.SERVICE_7SERVICE_ENFORCE_USER_ACCESS === "true",});\n          if (customerPilot) {\n            const verifiedEmail = userResult.data.user.email;\n            if (!verifiedEmail) return {};\n            const decision = await query7ServiceUserAccess(organizationId, verifiedEmail);\n          }\n        }\n        const isPrivileged = Boolean(admin.data);\n`);
  execFileSync('node',[path.join(appRoot,'scripts/apply-int01-to-repo.mjs'),dir]);
  const result=fs.readFileSync(path.join(dir,'lib/api-auth.ts'),'utf8');
  assert.match(result,/authorizeCentralPilot\(request, userId, organizationId\)/);
  assert.match(result,/recordCentralDecision/);
  assert.doesNotMatch(result,/query7ServiceUserAccess\(organizationId, verifiedEmail\)/);
  assert.match(result,/COMMANDER_CENTRAL_AUTH_ENABLED/);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
