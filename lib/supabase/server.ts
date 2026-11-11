import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import { localWriteGuardEnabled } from "@/lib/local-write-guard";
import { readOnlySupabaseFetch } from "@/lib/local-supabase-fetch";
import { getLocalIdentity } from "@/lib/local-request-identity";

export function getSupabaseServerClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  if (!NEXT_PUBLIC_SUPABASE_URL) return null;

  if (localWriteGuardEnabled()) {
    // Never use service_role locally: it bypasses Postgres RLS. A verified
    // request token must be bound before any database access is possible.
    const identity = getLocalIdentity();
    if (!identity?.token || !NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
    return createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
      global:{
        headers:{Authorization:`Bearer ${identity.token}`},
        fetch:readOnlySupabaseFetch(fetch),
      },
    });
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}
