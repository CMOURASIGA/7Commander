"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { handleDemoFetch } from "@/lib/demo-store";

type KairosAuthState = { loading: boolean; required: boolean; user: User | null; signInWithGoogle: (nextPath?: string) => Promise<void>; signOut: () => Promise<void> };
const KairosAuthContext = createContext<KairosAuthState | null>(null);
const DEMO_USER = { id: "demo-user-7commander", aud: "authenticated", role: "authenticated", email: "demo@7commander.com.br", user_metadata: { full_name: "Usuário Demonstração", name: "Usuário Demonstração" }, app_metadata: { provider: "demo", providers: ["demo"] }, created_at: "2026-08-01T00:00:00.000Z" } as unknown as User;

export function KairosAuthProvider({ required, children }: { required: boolean; children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => (await handleDemoFetch(input, init)) ?? nativeFetch(input, init);
    setUser(DEMO_USER);
    setLoading(false);
    return () => { window.fetch = nativeFetch; };
  }, []);
  const value = useMemo<KairosAuthState>(() => ({ loading, required, user, signInWithGoogle: async () => setUser(DEMO_USER), signOut: async () => setUser(null) }), [loading, required, user]);
  return <KairosAuthContext.Provider value={value}>{children}</KairosAuthContext.Provider>;
}

export function useKairosAuth(): KairosAuthState {
  const context = useContext(KairosAuthContext);
  if (!context) throw new Error("useKairosAuth deve ser usado dentro de KairosAuthProvider.");
  return context;
}
