/**
 * One-time, idempotent QA provisioning for the already-authorized central identity.
 * Run only in a protected operator environment. Never expose service-role keys.
 *
 * Required environment:
 *   QA_PROVISION_CONFIRM=QA_ONLY
 *   SERVICE_SUPABASE_URL, SERVICE_SUPABASE_SERVICE_ROLE_KEY
 *   COMMANDER_SUPABASE_URL, COMMANDER_SUPABASE_SERVICE_ROLE_KEY
 *   QA_EMAIL, QA_CENTRAL_IDENTITY_ID, QA_COMMANDER_ORG_ID, QA_APPROVED_BY_LOCAL_USER_ID
 *
 * Does NOT issue a second password, change production, or reassign any existing link.
 */
import { createClient } from '@supabase/supabase-js';

const required = [
  'SERVICE_SUPABASE_URL','SERVICE_SUPABASE_SERVICE_ROLE_KEY',
  'COMMANDER_SUPABASE_URL','COMMANDER_SUPABASE_SERVICE_ROLE_KEY',
  'QA_EMAIL','QA_CENTRAL_IDENTITY_ID','QA_COMMANDER_ORG_ID',
  'QA_APPROVED_BY_LOCAL_USER_ID',
];
function ensure(value, message) { if (!value) throw new Error(message); }
function uuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || ''); }
function exactQaProject(value, projectRef) {
  const u = new URL(value);
  ensure(u.protocol === 'https:' && u.hostname === projectRef + '.supabase.co'
    && u.pathname === '/' && !u.username && !u.password && !u.search && !u.hash,
    'QA project URL mismatch');
}
function db(url, key) {
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
async function row(query, label) {
  const {data,error} = await query.maybeSingle();
  ensure(!error && data, label);
  return data;
}
function check(result,label) { ensure(!result.error,label); return result.data; }

async function main() {
  ensure(process.env.QA_PROVISION_CONFIRM === 'QA_ONLY','QA confirmation missing');
  for (const name of required) ensure(process.env[name], name + ' missing');
  const e=process.env;
  exactQaProject(e.SERVICE_SUPABASE_URL,'mwsqzumudqoqlhwlwquf');
  exactQaProject(e.COMMANDER_SUPABASE_URL,'pmituaahaqimvhzhqsry');
  for (const value of [e.QA_CENTRAL_IDENTITY_ID,e.QA_COMMANDER_ORG_ID,e.QA_APPROVED_BY_LOCAL_USER_ID])
    ensure(uuid(value),'Invalid UUID');
  ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.QA_EMAIL),'Invalid QA email');
  const service=db(e.SERVICE_SUPABASE_URL,e.SERVICE_SUPABASE_SERVICE_ROLE_KEY);
  const commander=db(e.COMMANDER_SUPABASE_URL,e.COMMANDER_SUPABASE_SERVICE_ROLE_KEY);
  const identity=await row(service.from('identities').select('id,email,status,auth_user_id')
    .eq('id',e.QA_CENTRAL_IDENTITY_ID),'Central identity not found');
  ensure(identity.status==='ACTIVE' && identity.auth_user_id,'Central identity inactive');
  ensure(identity.email?.toLowerCase()===e.QA_EMAIL.toLowerCase(),'Identity email mismatch');
  const centralAuth=await service.auth.admin.getUserById(identity.auth_user_id);
  ensure(!centralAuth.error && centralAuth.data.user?.email?.toLowerCase()===e.QA_EMAIL.toLowerCase()
    && !!centralAuth.data.user.email_confirmed_at,'Central email ownership not confirmed');

  const company=await row(commander.from('central_client_company_links')
    .select('central_client_id,commander_company_id,status')
    .eq('commander_company_id',e.QA_COMMANDER_ORG_ID),'Missing company link');
  ensure(company.status==='ACTIVE','Company link not active');
  const member=await row(service.from('client_memberships')
    .select('id,status').eq('identity_id',identity.id)
    .eq('client_id',company.central_client_id),'Central membership missing');
  ensure(member.status==='ACTIVE','Central membership inactive');
  const product=await row(service.from('products').select('id,status')
    .eq('code','COMMANDER7'),'Product missing');
  ensure(product.status==='ACTIVE','Commander product inactive');
  const subscriptions=check(await service.from('subscriptions')
    .select('id,status,start_date,end_date,grace_days')
    .eq('client_id',company.central_client_id).eq('product_id',product.id),'Subscriptions lookup failed');
  const today=new Date().toISOString().slice(0,10);
  const activeSubs=subscriptions.filter(s=>s.status==='ACTIVE' && s.start_date<=today &&
    (!s.end_date || Date.parse(today+'T00:00:00Z')<=Date.parse(s.end_date+'T00:00:00Z')+(s.grace_days||0)*86400000));
  ensure(activeSubs.length>0,'No active Commander subscription');
  const grants=check(await service.from('user_product_access').select('id,subscription_id,product_role_id,status,valid_from,valid_until')
    .eq('identity_id',identity.id).eq('client_id',company.central_client_id).eq('membership_id',member.id)
    .eq('status','ACTIVE').in('subscription_id',activeSubs.map(s=>s.id)),'Central grant query failed');
  const activeGrants=grants.filter(g=>g.valid_from<=today && (!g.valid_until || g.valid_until>=today));
  ensure(activeGrants.length>0,'Central Commander grant missing');
  const role=await row(service.from('product_roles').select('id,code,status,product_id')
    .eq('id',activeGrants[0].product_role_id),'Product role missing');
  ensure(role.code==='VIEWER' && role.status==='ACTIVE' && role.product_id===product.id,
    'QA role not VIEWER');

  const existingLinks=check(await commander.from('central_identity_user_links')
    .select('id,central_identity_id,commander_user_id,status')
    .eq('central_identity_id',identity.id),'Identity link lookup failed');
  ensure(existingLinks.every(l=>l.status!=='ACTIVE') || existingLinks.filter(l=>l.status==='ACTIVE').length===1,
    'Ambiguous active identity links');
  let userId=existingLinks.find(l=>l.status==='ACTIVE')?.commander_user_id;
  if (userId) {
    const auth=await commander.auth.admin.getUserById(userId);
    ensure(!auth.error && auth.data.user?.email?.toLowerCase()===e.QA_EMAIL.toLowerCase(),
      'Existing link belongs to another local identity');
  } else {
    let found=null,page=1;
    // Find an existing same-email QA account without issuing another password.
    while (page<=20) {
      const result=await commander.auth.admin.listUsers({page,perPage:100});
      ensure(!result.error,'Unable to inspect Commander Auth');
      found=result.data.users.find(u=>u.email?.toLowerCase()===e.QA_EMAIL.toLowerCase());
      if (found || result.data.users.length<100) break;
      page++;
    }
    ensure(found || page<=20,'User list too large for safe provisioning');
    if (found) userId=found.id;
    else {
      const created=await commander.auth.admin.createUser({email:e.QA_EMAIL,email_confirm:true});
      ensure(!created.error && created.data.user?.id,'Commander Auth creation failed');
      userId=created.data.user.id;
    }
  }
  const other=check(await commander.from('central_identity_user_links')
    .select('id').eq('commander_user_id',userId).eq('status','ACTIVE'),'Other link lookup failed');
  ensure(other.length===0 || !!existingLinks.find(l=>l.status==='ACTIVE' && l.commander_user_id===userId),
    'Local Auth account already linked to a different central identity');

  const existingMember=await commander.from('organization_members')
    .select('id,role,status').eq('user_id',userId).eq('organization_id',e.QA_COMMANDER_ORG_ID).maybeSingle();
  ensure(!existingMember.error,'Local membership query failed');
  if (!existingMember.data) {
    const made=await commander.from('organization_members').insert({
      user_id:userId,organization_id:e.QA_COMMANDER_ORG_ID,role:'member',status:'active',
    });
    ensure(!made.error,'Local membership creation failed');
  } else ensure(existingMember.data.status==='active' && existingMember.data.role==='member',
    'Existing local membership requires administrator review');

  const profile=await commander.from('profiles').select('user_id,active_organization_id')
    .eq('user_id',userId).maybeSingle();
  ensure(!profile.error,'Profile lookup failed');
  if (!profile.data) {
    const made=await commander.from('profiles').insert({
      user_id:userId,email:e.QA_EMAIL,provider:'email',active_organization_id:e.QA_COMMANDER_ORG_ID,
    });
    ensure(!made.error,'Profile creation failed');
  } else if (!profile.data.active_organization_id) {
    const updated=await commander.from('profiles')
      .update({active_organization_id:e.QA_COMMANDER_ORG_ID}).eq('user_id',userId);
    ensure(!updated.error,'Active organization assignment failed');
  } else ensure(profile.data.active_organization_id===e.QA_COMMANDER_ORG_ID,
    'Existing profile belongs to another active organization');

  if (!existingLinks.some(l=>l.status==='ACTIVE' && l.commander_user_id===userId)) {
    const approver=await commander.auth.admin.getUserById(e.QA_APPROVED_BY_LOCAL_USER_ID);
    ensure(!approver.error && approver.data.user,'Approver not a local Auth user');
    const admin=await row(commander.from('platform_admins').select('user_id,active')
      .eq('user_id',e.QA_APPROVED_BY_LOCAL_USER_ID),'Approver is not a platform administrator');
    ensure(admin.active===true,'Approver administrator inactive');
    const inserted=await commander.from('central_identity_user_links').insert({
      central_identity_id:identity.id,commander_user_id:userId,status:'ACTIVE',
      proof_method:'ADMIN_REVIEWED',approved_by:e.QA_APPROVED_BY_LOCAL_USER_ID,
      approved_at:new Date().toISOString(),
    });
    ensure(!inserted.error,'Central identity link creation failed');
  }
  const verified=await row(commander.from('central_identity_user_links')
    .select('commander_user_id,status').eq('central_identity_id',identity.id).eq('status','ACTIVE'),
    'Final identity link verification failed');
  ensure(verified.commander_user_id===userId,'Final user mismatch');
  console.log('PASS: QA central grant, local Auth account, tenant membership and identity link verified.');
  console.log('No password created or logged. Repeat login E2E in Preview.');
}
main().catch(error=>{ console.error('QA provisioning failed:',error.message); process.exitCode=1; });
