import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import { localWriteGuardEnabled } from "@/lib/local-write-guard";
import { readOnlySupabaseFetch } from "@/lib/local-supabase-fetch";

export function getSupabaseServerClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: localWriteGuardEnabled() ? {fetch:readOnlySupabaseFetch(fetch)} : undefined,
  });
}
