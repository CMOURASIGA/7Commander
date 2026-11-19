import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: object, status: number) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Privileged server-to-server endpoint. Only a centrally signed suspension
 * for an explicitly linked identity and company is accepted.
 * No remote granting, deletion, or cross-tenant account changes.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SERVICE_7SERVICE_REVOCATION_SECRET;
  const timestamp = request.headers.get('x-7service-timestamp') ?? '';
  const signature = request.headers.get('x-7service-signature') ?? '';
  if (!secret || secret.length < 32 || !/^\d{13}$/.test(timestamp) ||
      Math.abs(Date.now() - Number(timestamp)) > 60000 ||
      !/^[a-f0-9]{64}$/i.test(signature)) return json({ error: 'Unauthorized' }, 401);
  const raw = await request.text();
  if (raw.length > 2000) return json({ error: 'Invalid payload' }, 400);
  const expected = createHmac('sha256', secret).update(timestamp + '.' + raw).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex')))
    return json({ error: 'Unauthorized' }, 401);
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return json({ error: 'Invalid payload' }, 400); }
  if (!payload || typeof payload !== 'object') return json({ error: 'Invalid payload' }, 400);
  const data = payload as Record<string, unknown>;
  if (!['SUSPEND','RESTORE'].includes(String(data.operation)) || data.productCode !== 'COMMANDER7' ||
      typeof data.eventId !== 'string' || !uuid.test(data.eventId) ||
      typeof data.identityId !== 'string' || !uuid.test(data.identityId) ||
      typeof data.clientId !== 'string' || !uuid.test(data.clientId))
    return json({ error: 'Unsupported operation' }, 400);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json({ error: 'Destination not configured' }, 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const [identity, company] = await Promise.all([
    db.from('central_identity_user_links')
      .select('commander_user_id').eq('central_identity_id', data.identityId)
      .eq('status', 'ACTIVE').maybeSingle(),
    db.from('central_client_company_links')
      .select('commander_company_id').eq('central_client_id', data.clientId)
      .eq('status', 'ACTIVE').maybeSingle(),
  ]);
  if (identity.error || company.error) return json({ error: 'Mapping unavailable' }, 503);
  if (!identity.data || !company.data)
    return json({ error: 'Approved mapping required' }, 409);

  const userId = identity.data.commander_user_id;
  const organizationId = company.data.commander_company_id;
  const current = await db.from('organization_members').select('id,status,role')
    .eq('user_id', userId).eq('organization_id', organizationId).maybeSingle();
  if (current.error) return json({ error: 'Membership unavailable' }, 503);
  if (!current.data) return json({ error: 'Membership not found' }, 409);
  if (data.operation === 'RESTORE') {
    // HMAC proves the sender, not the user's entitlement. Before lifting a
    // suspension, independently verify central ACTIVE product + membership +
    // license and check that its exact role matches the persisted local role.
    const user = await db.auth.admin.getUserById(userId);
    if (user.error || !user.data.user?.email || !user.data.user.email_confirmed_at)
      return json({ error: 'Verified local identity required' }, 403);
    let entitlement: { allowed:boolean; roleCodes:string[] };
    try {
      const origin = new URL(process.env.SERVICE_7SERVICE_ORIGIN ?? '');
      const token=process.env.SERVICE_7SERVICE_TOKEN ?? '';
      if(origin.protocol!=='https:' || origin.pathname!=='/' || origin.username ||
         origin.password || origin.search || origin.hash || token.length<32)
        return json({error:'Central configuration unavailable'},503);
      const result=await fetch(new URL('/api/integrations/7commander/regrant-decision',origin),{
        method:'POST',cache:'no-store',redirect:'error',
        headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({identityId:data.identityId,clientId:data.clientId}),
        signal:AbortSignal.timeout(5000),
      });
      if(!result.ok || !result.headers.get('content-type')?.includes('application/json'))
        return json({error:'Central confirmation unavailable'},503);
      entitlement=await result.json();
      if(typeof entitlement?.allowed!=='boolean'||!Array.isArray(entitlement.roleCodes))
        return json({error:'Central decision invalid'},503);
    } catch { return json({ error: 'Central confirmation unavailable' }, 503); }
    const expected = { VIEWER:'member', MEMBER:'manager', ADMIN:'admin', OWNER:'owner' } as const;
    const code = entitlement.roleCodes.length === 1 ? entitlement.roleCodes[0] as keyof typeof expected : null;
    if (!entitlement.allowed || !code || expected[code] !== current.data.role)
      return json({ error: 'Central grant and local role must match' }, 403);
    if (current.data.status === 'suspended') {
      // A customer regrant must not override an unrelated manual suspension.
      // Only reverse a block previously confirmed by the signed central sync.
      const suspendedByCentral = await db.from('central_access_decision_audit')
        .select('id').eq('commander_user_id',userId)
        .eq('commander_company_id',organizationId)
        .eq('reason_code','CENTRAL_REVOCATION_SYNC').order('created_at',{ascending:false}).limit(1);
      if (suspendedByCentral.error) return json({error:'Suspension provenance unavailable'},503);
      if (!suspendedByCentral.data?.length)
        return json({error:'No recorded central suspension to restore'},403);
      const updated = await db.from('organization_members').update({status:'active'})
        .eq('id',current.data.id).eq('status','suspended').select('id');
      if (updated.error || updated.data?.length !== 1)
        return json({ error:'Restoration not confirmed' },503);
    } else if (current.data.status !== 'active') {
      return json({ error: 'Membership state not restorable' }, 409);
    }
  } else {
    if (current.data.status === 'active') {
      const changed = await db.from('organization_members')
        .update({ status: 'suspended' })
        .eq('id', current.data.id).eq('status', 'active').select('id');
      if (changed.error) return json({ error: 'Suspension not confirmed' }, 503);
    }
  }
  const expectedStatus=data.operation === 'RESTORE' ? 'active' : 'suspended';
  const confirmed = await db.from('organization_members').select('status')
    .eq('user_id', userId).eq('organization_id', organizationId).maybeSingle();
  if (confirmed.error || confirmed.data?.status !== expectedStatus)
    return json({ error: 'Membership status not confirmed' }, 503);
  const audit = await db.from('central_access_decision_audit').insert({
    commander_user_id: userId,
    commander_company_id: organizationId,
    route: '/api/integrations/7service/revocation',
    method: 'POST',
    allowed: data.operation === 'RESTORE',
    reason_code: data.operation === 'RESTORE' ? 'CENTRAL_REGRANT_SYNC' : 'CENTRAL_REVOCATION_SYNC',
  });
  if (audit.error) return json({ error: 'Updated, audit confirmation pending' }, 503);
  return json({ confirmed: true }, 200);
}
