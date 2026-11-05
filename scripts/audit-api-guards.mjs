import fs from 'node:fs';import path from 'node:path';
const root=process.argv[2];if(!root)throw new Error('Usage: node scripts/audit-api-guards.mjs /path/to/7Commander');
const api=path.join(root,'app/api');let rows=[];
function visit(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 const f=path.join(dir,item.name);
 if(item.isDirectory())visit(f);
 else if(/route\.(ts|tsx|js|mjs)$/.test(f)){
  const body=fs.readFileSync(f,'utf8');
  const rel=path.relative(root,f).replaceAll('\\','/');
  rows.push({route:rel,hasRequireApiAuth:/\brequireApiAuth\s*\(/.test(body),hasOtherGuard:/\b(assertTenantMembership|resolveTenantMembership|verifiedCommanderUser)\s*\(/.test(body)});
 }
}}
visit(api);const unguarded=rows.filter(x=>!x.hasRequireApiAuth&&!x.hasOtherGuard);
for(const x of rows)console.log(`${x.hasRequireApiAuth?'GUARDED':x.hasOtherGuard?'REVIEW':'UNGUARDED'} ${x.route}`);
console.log(`TOTAL ${rows.length} | REQUIRE_API_AUTH ${rows.filter(x=>x.hasRequireApiAuth).length} | REVIEW ${rows.filter(x=>x.hasOtherGuard&&!x.hasRequireApiAuth).length} | UNGUARDED ${unguarded.length}`);
// All unguarded routes require documented exception, or a patch, before enabling INT01.
process.exitCode=unguarded.length?1:0;
