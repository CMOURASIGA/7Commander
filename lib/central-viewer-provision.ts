import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkCentralProductAccess } from '@/lib/7service-authorization';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Provision only a centrally verified VIEWER. No password or local role escalation. */
export async function provisionCentralViewerOnLogin(input: {
  db: SupabaseClient;
  origin: string;
  accessToken: string;
  identityId: string;
  email: string;
  emailVerified: boolean;
  companyId: string;
}): Promise<string | null> {
  if (process.env.COMMANDER_CENTRAL_JIT_VIEWER_ENABLED !== 'true' ||
    !uuid.test(input.identityId) || !uuid.test(input.companyId) || !input.emailVerified) return null;
  const pilotId = process.env.SERVICE_7SERVICE_PILOT_ORG_ID ?? '';
  const actorId = process.env.COMMANDER_CENTRAL_PROVISION_ACTOR_ID ?? '';
  if (input.companyId !== pilotId || !uuid.test(pilotId) || !uuid.test(actorId)) return null;
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null;

  const company = await input.db.from('central_client_company_links')
    .select('central_client_id').eq('commander_company_id',input.companyId)
    .eq('status','ACTIVE').maybeSingle();
  if (company.error || !company.data) return null;
  const decision = await checkCentralProductAccess({
    centralUrl:input.origin, centralAccessToken:input.accessToken,
    clientId:company.data.central_client_id,productCode:'COMMANDER7',
  });
  if (!decision.allowed || decision.identityId !== input.identityId ||
      decision.roleCodes.length !== 1 || decision.roleCodes[0] !== 'VIEWER') return null;
  const role = await input.db.from('central_product_role_links')
    .select('id').eq('central_product_code','COMMANDER7')
    .eq('central_role_code','VIEWER').eq('commander_role','member')
    .eq('status','ACTIVE').maybeSingle();
  if (role.error || !role.data) return null;
  const linked = await input.db.from('central_identity_user_links')
    .select('id').eq('central_identity_id',input.identityId).limit(1);
  if (linked.error || linked.data?.length) return null;

  // Existing local accounts require manual identity verification; never
  // claim them by matching an email address.
  for (let page=1;page<=20;page++) {
    const users=await input.db.auth.admin.listUsers({page,perPage:500});
    if (users.error || !users.data || users.data.users.some(
      user=>user.email?.toLowerCase()===email)) return null;
    if (users.data.users.length<500) break;
    if(page===20)return null;
  }
  const created=await input.db.auth.admin.createUser({email,email_confirm:true});
  if(created.error || !created.data.user?.id)return null;
  const result=await input.db.rpc('provision_central_viewer_atomic',{
    p_identity:input.identityId,p_user:created.data.user.id,p_company:input.companyId,
    p_actor:actorId,p_email:email,
  });
  // Never delete an Auth user in error recovery: concurrent logins may use it.
  return result.error || result.data!==created.data.user.id ? null : created.data.user.id;
}
