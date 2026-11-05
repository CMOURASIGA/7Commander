/** INT-01 CP-01. Server-only adapter for the existing 7Commander integration.
 * This module does not provide a central session or bypass Commander RLS.
 * Call it only after verifying the central session and resolving clientId from
 * an explicit, active organization mapping on the server.
 */
export type CentralAccessDecision =
  | { allowed: true; identityId: string; clientId: string; roleCodes: string[] }
  | { allowed: false; reasonCode: string };

type Input = {
  centralUrl: string;
  centralAccessToken: string;
  clientId: string;
  productCode: string;
  fetchImpl?: typeof fetch;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const code = /^[A-Za-z0-9_-]{2,100}$/;

export async function checkCentralProductAccess(input: Input): Promise<CentralAccessDecision> {
  if (process.env.COMMANDER_CENTRAL_AUTH_ENABLED !== 'true') {
    return { allowed: false, reasonCode: 'CENTRAL_AUTH_DISABLED' };
  }
  const { centralUrl, centralAccessToken, clientId, productCode, fetchImpl = fetch } = input;
  if (!uuid.test(clientId) || !code.test(productCode) ||
    !/^[A-Za-z0-9._~-]+$/.test(centralAccessToken || '')) {
    return { allowed: false, reasonCode: 'CENTRAL_CONFIG_INVALID' };
  }
  try {
    const origin = new URL(centralUrl);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.port ||
      origin.pathname !== '/' || origin.search || origin.hash) {
      return { allowed: false, reasonCode: 'CENTRAL_CONFIG_INVALID' };
    }
    const url = new URL('/api/v1/authorization/decision', origin);
    url.searchParams.set('clientId', clientId);
    url.searchParams.set('productCode', productCode);
    url.searchParams.set('action', 'product.access');
    const response = await fetchImpl(url.toString(), {
      headers: { Authorization: `Bearer ${centralAccessToken}`, Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(3000),
    });
    if (response.status !== 200 || !response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      return { allowed: false, reasonCode: 'CENTRAL_UNAVAILABLE' };
    }
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') return { allowed: false, reasonCode: 'CENTRAL_PROTOCOL_ERROR' };
    const value = body as Record<string, unknown>;
    if (value.version !== '1' || typeof value.allowed !== 'boolean' || typeof value.reasonCode !== 'string') {
      return { allowed: false, reasonCode: 'CENTRAL_PROTOCOL_ERROR' };
    }
    if (value.allowed === false) return { allowed: false, reasonCode: value.reasonCode };
    if (value.reasonCode !== 'ACCESS_GRANTED' || typeof value.identityId !== 'string' || !uuid.test(value.identityId) ||
      value.clientId !== clientId || value.productCode !== productCode ||
      !Array.isArray(value.roleCodes) || !value.roleCodes.every((role: unknown) => typeof role === 'string' && code.test(role))) {
      return { allowed: false, reasonCode: 'CENTRAL_PROTOCOL_ERROR' };
    }
    return { allowed: true, identityId: value.identityId, clientId, roleCodes: value.roleCodes as string[] };
  } catch {
    return { allowed: false, reasonCode: 'CENTRAL_UNAVAILABLE' };
  }
}
