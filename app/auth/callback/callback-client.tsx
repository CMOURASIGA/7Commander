"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { setClientAuthToken } from "@/lib/client-auth";

function readHashParams() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash);
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Concluindo autenticacao...");

  useEffect(() => {
    let active = true;
    async function resolveCallback() {
      const client = getSupabaseBrowserClient();
      if (!client) {
        setMessage("Falha de configuracao do cliente Supabase.");
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const exchanged = await client.auth.exchangeCodeForSession(code);
        if (exchanged.error) {
          setMessage("Falha ao validar login Google.");
          return;
        }
      } else {
        const hashParams = readHashParams();
        const accessToken = hashParams.get("access_token")?.trim() ?? "";
        const refreshToken = hashParams.get("refresh_token")?.trim() ?? "";

        if (accessToken && refreshToken) {
          const restored = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (restored.error) {
            setMessage("Falha ao restaurar a sessao autenticada.");
            return;
          }
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        } else if (accessToken) {
          setClientAuthToken(accessToken, null);
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }

      const { data } = await client.auth.getSession();
      const token = data.session?.access_token ?? "";
      const email = data.session?.user?.email ?? null;
      if (token) {
        setClientAuthToken(token, email);
      }

      if (!active) return;
      const next = searchParams.get("next") || "/";
      router.replace(next);
    }

    void resolveCallback();
    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <section className="rounded-xl border border-(--border) bg-(--bg-surface) p-6 text-sm text-(--text-primary)">
      {message}
    </section>
  );
}
