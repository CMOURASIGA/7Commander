import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
const reply = (data: object, status = 200) => NextResponse.json(data, { status, headers: noStore });

type Check = { identityId: string; clientId: string; roleCode: string };
type Result = { identityId: string; clientId: string; state: 'CONFIRMED' | 'PENDING' | 'MISMATCH' };

/**
 * INT01 destination readback for a central administrative dashboard.
 * HMAC signed, read-only, strict mapping and role checks. No account creation,
 * no invitations, no changes to memberships or authorization.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SERVICE_7SERVICE_REVOCATION_SECRET;
  const stamp = request.headers.get('x-7service-timestamp') ?? '';
  const signature = request.headers.get('x-7service-signature') ?? '';
  if (!secret || secret.length < 32 || !/^\d{13}$/.test(stamp) ||
      Math.abs(Date.now() - Number(stamp)) > 60_000 ||
      !/^[0-9a-f]{64}$/i.test(signature)) return reply({ error: 'Unauthorized' }, 401);
  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > 12_000) return reply({ error: 'Payload too large' }, 413);
  const expected = createHmac('sha256', secret).update(stamp + '.' + raw).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex')))
    return reply({ error: 'Unauthorized' }, 401);
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply({ error: 'Invalid JSON' }, 400); }
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return reply({ error: 'Invalid request' }, 400);
  const payload = input as Record<string, unknown>;
  if (payload.operation !== 'CHECK_ACCOUNTS' || !Array.isArray(payload.checks) ||
      payload.checks.length < 1 || payload.checks.length > 40)
    return reply({ error: 'Invalid checks' }, 400);
  const checks: Check[] = [];
  for (const item of payload.checks) {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      return reply({ error: 'Invalid check' }, 400);
    const v = item as Record<string, unknown>;
    if (typeof v.identityId !== 'string' || !uuid.test(v.identityId) ||
        typeof v.clientId !== 'string' || !uuid.test(v.clientId) ||
        typeof v.roleCode !== 'string' || !['VIEWER','MEMBER','ADMIN','OWNER'].includes(v.roleCode))
      return reply({ error: 'Invalid check' }, 400);
    checks.push({ identityId: v.identityId, clientId: v.clientId, roleCode: v.roleCode });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return reply({ error: 'Destination unavailable' }, 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const roleMap: Record<string, string> = { VIEWER: 'member', MEMBER: 'manager', ADMIN: 'admin', OWNER: 'owner' };
  const identities = [...new Set(checks.map(x => x.identityId))];
  const clients = [...new Set(checks.map(x => x.clientId))];
  const [links, companies] = await Promise.all([
    db.from('central_identity_user_links')
      .select('central_identity_id,commander_user_id,status')
      .in('central_identity_id', identities),
    db.from('central_client_company_links')
      .select('central_client_id,commander_company_id,status')
      .in('central_client_id', clients),
  ]);
  if (links.error || companies.error) return reply({ error: 'Readback unavailable' }, 503);
  const linkById = new Map((links.data ?? []).map(x => [x.central_identity_id, x]));
  const companyById = new Map((companies.data ?? []).map(x => [x.central_client_id, x]));
  const localIds = [...new Set((links.data ?? []).filter(x => x.status === 'ACTIVE').map(x => x.commander_user_id))];
  const orgIds = [...new Set((companies.data ?? []).filter(x => x.status === 'ACTIVE').map(x => x.commander_company_id))];
  const memberships = localIds.length && orgIds.length
    ? await db.from('organization_members')
      .select('user_id,organization_id,status,role')
      .in('user_id', localIds).in('organization_id',orgIds)
    : { data: [], error: null };
  if (memberships.error) return reply({ error: 'Membership readback unavailable' }, 503);
  const byPair = new Map((memberships.data ?? []).map(x => [x.user_id + ':' + x.organization_id,x]));
  const verified = new Map<string, boolean>();
  for (const id of localIds) {
    const auth = await db.auth.admin.getUserById(id);
    // An existing local membership without a confirmed auth account is not a confirmed product account.
    if (auth.error) return reply({ error: 'Auth readback unavailable' }, 503);
    verified.set(id, Boolean(auth.data.user?.email && auth.data.user.email_confirmed_at &&
      !auth.data.user.deleted_at && !auth.data.user.banned_until));
  }
  const results: Result[] = checks.map(check => {
    const link = linkById.get(check.identityId), company = companyById.get(check.clientId);
    if (!link || link.status !== 'ACTIVE' || !company || company.status !== 'ACTIVE')
      return { identityId: check.identityId, clientId: check.clientId, state: 'PENDING' };
    const member = byPair.get(link.commander_user_id + ':' + company.commander_company_id);
    if (!member) return { identityId: check.identityId, clientId: check.clientId, state: 'PENDING' };
    if (member.status !== 'active' || member.role !== roleMap[check.roleCode] ||
        !verified.get(link.commander_user_id))
      return { identityId: check.identityId, clientId: check.clientId, state: 'MISMATCH' };
    return { identityId: check.identityId, clientId: check.clientId, state: 'CONFIRMED' };
  });
  return reply({ results });
}
