import fs from 'node:fs';
import path from 'node:path';

const repo=process.argv[2];
if(!repo || !fs.existsSync(path.join(repo,'lib/api-auth.ts'))) throw new Error('Pass the checked-out 7Commander root as an argument');
const file=path.join(repo,'lib/api-auth.ts');
let src=fs.readFileSync(file,'utf8');
if(src.includes('authorizeCentralPilot('))throw new Error('Already patched. Stop and review the existing integration.');
const importMark='import { shouldEnforceCustomerPilot } from "@/lib/customer-pilot";';
if(!src.includes(importMark))throw new Error('Repo source changed; manual merge required');
src=src.replace(importMark,importMark+'\nimport { authorizeCentralPilot } from "@/lib/central-runtime";\nimport { recordCentralDecision } from "@/lib/central-decision-audit";');
const begin='          if (customerPilot) {\n            const verifiedEmail = userResult.data.user.email;';
const end='\n        }\n        const isPrivileged = Boolean(admin.data);';
const start=src.indexOf(begin),stop=src.indexOf(end,start);
if(start<0 || stop<0)throw new Error('The original pilot branch changed; abort without writing');
const replacement=`          if (customerPilot) {
            // The old email-based authorization endpoint is forbidden in INT-01.
            // These inputs are all derived from verified local and central sessions.
            const decision = await authorizeCentralPilot(request, userId, organizationId);
            const logged = await recordCentralDecision({
              userId, companyId: organizationId,
              route: request.nextUrl.pathname, method: request.method,
              allowed: decision.allowed, reasonCode: decision.reasonCode,
            });
            // Failure to audit any positive decision fails closed.
            if (!logged && decision.allowed) return {
              ok: false,
              response: NextResponse.json({ error: "Auditoria central indisponível." }, {status:503}),
            };
            if (!decision.allowed) return {
              ok: false,
              response: NextResponse.json({ error: "Acesso central negado.", code: decision.reasonCode },
                {status:decision.status, headers:{"Cache-Control":"no-store"}}),
            };
          }`;
src=src.slice(0,start)+replacement+src.slice(stop);
if(src.includes('query7ServiceUserAccess(organizationId, verifiedEmail)'))throw new Error('Unsafe email decision remains');
src=src.replace('import { query7ServiceUserAccess } from "@/lib/7service-user-access";\n','');
// central pilot must have BOTH switches, never legacy email path.
src=src.replace('enabled: process.env.SERVICE_7SERVICE_ENFORCE_USER_ACCESS === "true",',
'enabled: process.env.SERVICE_7SERVICE_ENFORCE_USER_ACCESS === "true" && process.env.COMMANDER_CENTRAL_AUTH_ENABLED === "true",');
fs.writeFileSync(file,src);
console.log('Applied INT-01 guarded replacement to lib/api-auth.ts. Do not deploy before review and tests.');
