/**
 * Application-level guard for writes through configured Supabase clients.
 * Not a database permission boundary. Never expose service_role to browsers.
 */
export function isSupabaseDataMutation(input: string | URL | Request, init?: RequestInit): boolean {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(raw);
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (!["https:", "http:"].includes(url.protocol)) return true;
  // Permit only established-session authentication calls; registration and
  // administrative Auth writes stay blocked even with a valid browser session.
  if (url.pathname.startsWith("/auth/v1/")) {
    const allowedAuthMethods = ["/auth/v1/token", "/auth/v1/logout", "/auth/v1/verify"];
    return !["GET", "HEAD", "OPTIONS"].includes(method)
      && !allowedAuthMethods.includes(url.pathname);
  }
  // SQL RPCs must be denied regardless of HTTP verb, since functions may write.
  if (url.pathname.startsWith("/rest/v1/rpc/")) return true;
  return !["GET", "HEAD", "OPTIONS"].includes(method);
}

export function readOnlySupabaseFetch(baseFetch: typeof fetch): typeof fetch {
  return (input, init) => {
    if (isSupabaseDataMutation(input, init)) {
      return Promise.resolve(new Response(
        JSON.stringify({ code:"COMMANDER_LOCAL_READ_ONLY", message:"Gravação Supabase bloqueada no modo local." }),
        {status:403,headers:{"Content-Type":"application/json"}},
      ));
    }
    return baseFetch(input, init);
  };
}
