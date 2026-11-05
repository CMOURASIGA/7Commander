import test from 'node:test';
import assert from 'node:assert/strict';
import { permissionForRoute } from '../lib/central-route-policy.mjs';
test('Kairos profile PUT maps to explicit permission',()=>{
 assert.equal(permissionForRoute('/api/kairos/profile','PUT'),'kairos.profile.write');
});
test('Unknown APIs and methods fail closed',()=>{
 assert.equal(permissionForRoute('/api/kairos/profile','DELETE'),null);
 assert.equal(permissionForRoute('/api/unknown','POST'),null);
});
