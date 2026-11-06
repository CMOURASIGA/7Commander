/** Server-side authorization decision against 7Service.
 * The email must come from a locally VERIFIED Supabase Auth user, never
 * from a browser payload. Any protocol/transport failure fails closed.
 */
export async function query7ServiceUserAccess(
  organizationId: string,
  verifiedEmail: string,
): Promise<{ allowed: boolean; roleCodes: string[] }> {
  const origin = process.env.SERVICE_7SERVICE_ORIGIN;
  const token = process.env.SERVICE_7SERVICE_TOKEN;
  if (!origin || !token || token.length < 32)
    throw new Error("7Service integration not configured");
  if (!organizationId || organizationId.length > 200 || !verifiedEmail.includes("@"))
    throw new Error("Invalid central identity context");
  const base = new URL(origin);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash)
    throw new Error("Invalid 7Service origin");
  const url = new URL(
    "/api/integrations/7commander/access/" + encodeURIComponent(organizationId),
    base,
  );
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ verifiedEmail }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json"))
    throw new Error("7Service user access unavailable");
  const data: unknown = await response.json();
  if (
    !data || typeof data !== "object" ||
    !("allowed" in data) || typeof data.allowed !== "boolean" ||
    !("roleCodes" in data) || !Array.isArray(data.roleCodes) ||
    !data.roleCodes.every((code: unknown) => typeof code === "string")
  ) throw new Error("7Service authorization response invalid");
  return { allowed: data.allowed, roleCodes: data.roleCodes as string[] };
}
