/**
 * 7Service authorization adapter — integration foundation only.
 *
 * DO NOT wire into requireApiAuth until identity origin is unified: a JWT
 * minted by 7Commander's own Supabase is not a 7Service central Auth token.
 * This helper never grants access on transport or protocol failure.
 */
export type CentralAccessDecision =
  | { allowed: true; identityId: string; clientId: string; roleCodes: string[] }
  | { allowed: false; reasonCode: string };

export async function checkCentralProductAccess(input: {
  centralUrl: string;
  centralAccessToken: string;
  clientId: string;
  productCode: string;
}): Promise<CentralAccessDecision> {
  const { centralUrl, centralAccessToken, clientId, productCode } = input;
  if (!/^https:\/\//.test(centralUrl) || !centralAccessToken ||
      !/^[a-f0-9-]{36}$/i.test(clientId) || !/^[a-zA-Z0-9_.-]{2,100}$/.test(productCode))
    return { allowed: false, reasonCode: "CENTRAL_CONFIG_INVALID" };
  try {
    const origin = new URL(centralUrl);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.port || origin.pathname !== "/" || origin.search || origin.hash)
      return { allowed: false, reasonCode: "CENTRAL_CONFIG_INVALID" };
    const url = new URL("/api/v1/authorization/decision", origin);
    url.searchParams.set("clientId", clientId);
    url.searchParams.set("productCode", productCode);
    url.searchParams.set("action", "product.access");
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${centralAccessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return { allowed: false, reasonCode: "CENTRAL_UNAVAILABLE" };
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") return { allowed: false, reasonCode: "CENTRAL_PROTOCOL_ERROR" };
    const value = body as Record<string, unknown>;
    if (value.version !== "1" || value.allowed !== true ||
        typeof value.identityId !== "string" || value.clientId !== clientId ||
        value.productCode !== productCode || !Array.isArray(value.roleCodes) ||
        !value.roleCodes.every((role: unknown) => typeof role === "string"))
      return { allowed: false, reasonCode: "CENTRAL_ACCESS_DENIED" };
    return { allowed: true, identityId: value.identityId, clientId, roleCodes: value.roleCodes as string[] };
  } catch {
    return { allowed: false, reasonCode: "CENTRAL_UNAVAILABLE" };
  }
}
