import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCommanderCentralAccess as evaluate } from '../lib/commander-central-policy.mjs';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const valid = () => ({
 enabled:true, productCode:'7commander', requestedCompanyId:id(1), requiredLocalPermission:'projects.view',
 central:{verified:true,accessTokenVerified:true,identityId:id(2),clientId:id(3),decision:{allowed:true,reasonCode:'ACCESS_GRANTED',identityId:id(2),clientId:id(3),productCode:'7commander',roleCodes:['GESTOR']}},
 local:{verified:true,userId:id(4),companyId:id(1),membershipActive:true,role:'manager',permissions:['projects.view','projects.delete']},
 mapping:{status:'ACTIVE',companyStatus:'ACTIVE',identityStatus:'ACTIVE',clientId:id(3),companyId:id(1),identityId:id(2),userId:id(4)},
 roleLinks:[{status:'ACTIVE',productCode:'7commander',centralRoleCode:'GESTOR',commanderRole:'manager',allowedPermissions:['projects.view']}],
});
test('valid mapping allows only explicitly permitted operation',()=>assert.equal(evaluate(valid()).allowed,true));
const cases = [
 ['flag off',x=>x.enabled=false], ['central unverified',x=>x.central.verified=false],
 ['central JWT not verified',x=>x.central.accessTokenVerified=false],['local unverified',x=>x.local.verified=false],
 ['membership inactive',x=>x.local.membershipActive=false],['company spoof',x=>x.requestedCompanyId=id(9)],
 ['company mapping revoked',x=>x.mapping.companyStatus='REVOKED'],
 ['identity mapping revoked',x=>x.mapping.identityStatus='REVOKED'],
 ['mapping revoked',x=>x.mapping.status='REVOKED'],['mapping missing',x=>x.mapping=null],
 ['identity differs',x=>x.mapping.identityId=id(9)],['user differs',x=>x.mapping.userId=id(9)],
 ['client differs',x=>x.mapping.clientId=id(9)],['company differs',x=>x.mapping.companyId=id(9)],
 ['central denied',x=>x.central.decision.allowed=false],['wrong reason code',x=>x.central.decision.reasonCode='DENIED'],
 ['wrong product',x=>x.central.decision.productCode='7clinic'],['wrong central identity',x=>x.central.decision.identityId=id(9)],
 ['wrong central client',x=>x.central.decision.clientId=id(9)],['roles missing',x=>x.central.decision.roleCodes=[]],
 ['links missing',x=>x.roleLinks=null],['link revoked',x=>x.roleLinks[0].status='REVOKED'],
 ['role link for different product',x=>x.roleLinks[0].productCode='7clinic'],
 ['central role mismatch',x=>x.roleLinks[0].centralRoleCode='LEITOR'],
 ['local role privilege escalation',x=>x.local.role='owner'],
 ['required permission absent locally',x=>x.local.permissions=[]],
 ['permission not allowed by central role',x=>x.requiredLocalPermission='projects.delete'],
 ['central read role cannot inherit owner permissions',x=>{x.central.decision.roleCodes=['LEITOR'];x.local.role='owner';x.roleLinks=[{status:'ACTIVE',productCode:'7commander',centralRoleCode:'LEITOR',commanderRole:'member',allowedPermissions:['projects.view']}];x.requiredLocalPermission='projects.delete';}],
];
for (const [name, mutate] of cases) test(name,()=>{const x=valid();mutate(x);assert.equal(evaluate(x).allowed,false,name)});
