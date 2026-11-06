import 'server-only';

/** Call with the authenticated organization's ID, never a browser-supplied tenant. */
export async function query7ServiceLicense(organizationId: string): Promise<{
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  licenseLimit: number;
}> {
  const origin = process.env.SERVICE_7SERVICE_ORIGIN;
  const token = process.env.SERVICE_7SERVICE_TOKEN;
  if (!origin || !token || token.length < 32) throw new Error('7Service not configured');
  if (!organizationId || organizationId.length > 200) throw new Error('Invalid organization');
  const url = new URL('/api/integrations/7commander/entitlements/' +
    encodeURIComponent(organizationId), origin);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
    throw new Error('HTTPS required');
  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('7Service licensing unavailable');
  const result: unknown = await response.json();
  if (!result || typeof result !== 'object' ||
      !('status' in result) || !('licenseLimit' in result)) throw new Error('Bad licensing response');
  const data = result as { status: string; licenseLimit: number };
  if (!['ACTIVE', 'INACTIVE', 'EXPIRED'].includes(data.status) ||
      !Number.isSafeInteger(data.licenseLimit) || data.licenseLimit < 0)
    throw new Error('Invalid license response');
  return { status: data.status as 'ACTIVE' | 'INACTIVE' | 'EXPIRED',
    licenseLimit: data.licenseLimit };
}
