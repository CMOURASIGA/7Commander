import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import { readOnlySupabaseFetch } from "@/lib/local-supabase-fetch";
import { DEMO_MODE } from "@/lib/demo/config";
import { createDemoAuthClient } from "@/lib/demo/auth-client";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (DEMO_MODE) return createDemoAuthClient() as unknown as ReturnType<typeof createClient>;
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv();

  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: process.env.NEXT_PUBLIC_COMMANDER_LOCAL_READ_ONLY === "true"
        ? {fetch:readOnlySupabaseFetch(fetch)} : undefined,
      auth: {
        flowType: "pkce",
        autoRefreshToken: true,
        persistSession: true,
        // The callback page exchanges the OAuth code explicitly. Letting the
        // client detect it here would consume the PKCE verifier a second time.
        detectSessionInUrl: false,
      },
    });
  }

  return browserClient;
}
