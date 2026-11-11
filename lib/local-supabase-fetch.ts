/**
 * Defense in depth for Supabase calls made by the application in local
 * read-only mode. Does not replace database RLS / a read-only DB role.
 * Supabase Auth must remain available so existing users can sign in.
 */
export function isSupabaseDataMutation(
  input: string | URL | Request,
  init?: RequestInit,
): boolean {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (!["https:", "http:"].includes(url.protocol)) return true;
  const dataEndpoint = ["/rest/v1/", "/storage/v1/", "/functions/v1/"].some(
    (prefix) => url.pathname.startsWith(prefix),
  );
  // PostgREST RPC uses POST even when conceptually reading. Deny it by default:
  // we cannot prove a SQL function is side-effect free.
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
