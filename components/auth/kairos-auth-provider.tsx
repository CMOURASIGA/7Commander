"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getClientAuthHeaders, clearClientAuthToken, setClientAuthToken } from "@/lib/client-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type KairosAuthState = {
  loading: boolean;
  required: boolean;
  user: User | null;
  signInWithGoogle: (nextPath?: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const KairosAuthContext = createContext<KairosAuthState | null>(null);

type ProviderProps = {
  required: boolean;
  children: React.ReactNode;
};

/** Best-effort SSR synchronization; middleware fails closed if session cannot be validated. */
async function syncServerLocalSession(accessToken: string) {
  const result=await fetch('/api/auth/local-session',{
    method:'POST',credentials:'same-origin',
    headers:{Authorization:'Bearer '+accessToken},
  });
  if(!result.ok && result.status!==404)throw new Error('LOCAL_SSR_COOKIE_SYNC_FAILED');
}

async function syncProfile(user: User) {
  try {
    await fetch("/api/auth/profile", {
      method: "POST",
      headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        nome: user.user_metadata?.full_name ?? user.user_metadata?.name ?? "",
        avatarUrl: user.user_metadata?.avatar_url ?? "",
        provider: user.app_metadata?.provider ?? "email",
      }),
    });
  } catch {
    // best effort
  }
}

export function KairosAuthProvider({ required, children }: ProviderProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setLoading(false);
      return;
    }

    let mounted = true;
    void client.auth.getSession().then(async (result) => {
      if (!mounted) return;
      const sessionUser = result?.data?.session?.user ?? null;
      const token = result?.data?.session?.access_token ?? "";
      setUser(sessionUser);
      if (sessionUser && token) {
        setClientAuthToken(token, sessionUser.email ?? null);
        await syncServerLocalSession(token);
        // Profile metadata is best-effort and must never block navigation.
        if (syncedUserIdRef.current !== sessionUser.id) {
          syncedUserIdRef.current = sessionUser.id;
          void syncProfile(sessionUser);
        }
      } else {
        clearClientAuthToken();
        syncedUserIdRef.current = null;
      }
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      clearClientAuthToken();
      syncedUserIdRef.current = null;
      setUser(null);
      setLoading(false);
    });

    const subscription = client.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      const token = session?.access_token ?? "";
      setUser(currentUser);
      if (currentUser && token) {
        setClientAuthToken(token, currentUser.email ?? null);
        await syncServerLocalSession(token);
        if (syncedUserIdRef.current !== currentUser.id) {
          syncedUserIdRef.current = currentUser.id;
          void syncProfile(currentUser);
        }
      } else {
        clearClientAuthToken();
        if (event === 'SIGNED_OUT') {
          void fetch('/api/auth/local-session',{method:'DELETE',credentials:'same-origin'}).catch(()=>{});
          void fetch('/api/auth/central-session',{method:'DELETE',credentials:'same-origin'}).catch(()=>{});
        }
        syncedUserIdRef.current = null;
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.data?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo<KairosAuthState>(() => {
    return {
      loading,
      required,
      user,
      signInWithGoogle: async (nextPath?: string) => {
        const client = getSupabaseBrowserClient();
        if (!client) throw new Error("Cliente Supabase indisponivel no navegador.");

        // The OAuth round-trip must stay on the same host that started it.
        // This keeps Vercel Preview deployments independent from production.
        const redirectUrl = new URL("/auth/callback", window.location.origin);
        if (nextPath?.trim()) {
          redirectUrl.searchParams.set("next", nextPath.trim());
        }
        const result = await client.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: redirectUrl.toString() },
        });
        if (result.error) {
          throw new Error(result.error.message || "Falha ao iniciar login Google.");
        }
      },
      signInWithPassword: async (email: string, password: string) => {
        const client = getSupabaseBrowserClient();
        if (!client) throw new Error("Cliente Supabase indisponivel.");
        const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error || !data.session?.access_token) throw new Error("E-mail ou senha incorretos, ou conta nao habilitada.");
        // Use the returned session directly. A second getSession() during
        // SIGNED_IN listeners can contend with Supabase's auth lock.
        setClientAuthToken(data.session.access_token, data.user?.email ?? null);
        await syncServerLocalSession(data.session.access_token);
      },
      signOut: async () => {
        const client = getSupabaseBrowserClient();
        if (!client) return;
        await client.auth.signOut();
        await Promise.all([
          fetch('/api/auth/local-session',{method:'DELETE',credentials:'same-origin'}).catch(()=>{}),
          fetch('/api/auth/central-session',{method:'DELETE',credentials:'same-origin'}).catch(()=>{}),
        ]);
        clearClientAuthToken();
        setUser(null);
      },
    };
  }, [loading, required, user]);

  return <KairosAuthContext.Provider value={value}>{children}</KairosAuthContext.Provider>;
}

export function useKairosAuth(): KairosAuthState {
  const context = useContext(KairosAuthContext);
  if (!context) {
    throw new Error("useKairosAuth deve ser usado dentro de KairosAuthProvider.");
  }
  return context;
}
