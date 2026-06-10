"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { setClientAuthToken } from "@/lib/client-auth";

function readHashParams() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash);
}

function readSearchParams() {
  return new URLSearchParams(window.location.search);
}

export function AuthCallbackClient() {
  const router = useRouter();
  const [message, setMessage] = useState("Concluindo autenticacao...");

  useEffect(() => {
    let active = true;
    async function resolveCallback() {
      const client = getSupabaseBrowserClient();
      if (!client) {
        setMessage("Falha de configuracao do cliente Supabase.");
        return;
      }

      const queryParams = readSearchParams();
      const code = queryParams.get("code");
      if (code) {
        const exchanged = await client.auth.exchangeCodeForSession(code).catch(() => null);
        if (!exchanged || exchanged.error) {
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

      const sessionResult = await client.auth.getSession().catch(() => null);
      const token = sessionResult?.data?.session?.access_token ?? "";
      const email = sessionResult?.data?.session?.user?.email ?? null;
      if (token) {
        setClientAuthToken(token, email);
      }

      if (!active) return;
      const next = queryParams.get("next") || "/";
      router.replace(next);
    }

    void resolveCallback();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <section className="rounded-xl border border-(--border) bg-(--bg-surface) p-6 text-sm text-(--text-primary)">
      {message}
    </section>
  );
}
