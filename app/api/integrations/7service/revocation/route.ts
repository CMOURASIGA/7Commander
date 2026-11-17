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
  if (data.operation !== 'SUSPEND' || data.productCode !== 'COMMANDER7' ||
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
  const current = await db.from('organization_members').select('id,status')
    .eq('user_id', userId).eq('organization_id', organizationId).maybeSingle();
  if (current.error) return json({ error: 'Membership unavailable' }, 503);
  if (!current.data) return json({ error: 'Membership not found' }, 409);
  if (current.data.status === 'active') {
    const changed = await db.from('organization_members')
      .update({ status: 'suspended' })
      .eq('id', current.data.id).eq('status', 'active').select('id');
    if (changed.error) return json({ error: 'Suspension not confirmed' }, 503);
  }
  const confirmed = await db.from('organization_members').select('status')
    .eq('user_id', userId).eq('organization_id', organizationId).maybeSingle();
  if (confirmed.error || confirmed.data?.status !== 'suspended')
    return json({ error: 'Suspension not confirmed' }, 503);
  return json({ confirmed: true }, 200);
}
