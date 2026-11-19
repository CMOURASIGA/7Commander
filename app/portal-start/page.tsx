"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { setClientAuthToken } from "@/lib/client-auth";

/**
 * An ordinary GET is necessary for Vercel-protected previews. Once the page
 * is authenticated at the preview host, the central portal transfers its
 * session through an origin-checked window message, never via URL or storage.
 */
export default function PortalStartPage() {
  const [message, setMessage] = useState("Conectando ao Meu Portal do Access Management Service...");
  useEffect(() => {
    const origin = process.env.NEXT_PUBLIC_7SERVICE_PORTAL_ORIGIN;
    const opener = window.opener;
    if (!origin || !opener || !/^https:\/\/[^/]+$/.test(origin)) {
      setMessage("Abra o Commander diretamente pelo Meu Portal do Access Management Service.");
      return;
    }
    let active = true;
    let started = false;
    async function receive(event: MessageEvent) {
      if (!active || started || event.origin !== origin ||
          event.source !== opener || event.data?.type !== "SEVENSERVICE_CENTRAL_SESSION") return;
      started = true;
      const token = event.data.accessToken;
      if (typeof token !== "string" || !/^[-A-Za-z0-9_.~]{50,10000}$/.test(token)) {
        setMessage("Sessão central inválida. Reabra pelo Meu Portal.");
        return;
      }
      try {
        setMessage("Validando autorização no Access Management Service...");
        const response = await fetch("/api/auth/central-exchange", {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ centralAccessToken: token }),
        });
        if (!response.ok) throw new Error("A autorização da sua empresa ou produto não foi confirmada.");
        const payload = await response.json().catch(() => null) as
          | { ok?:boolean; tokenHash?:string; localUserId?:string } | null;
        if (!payload?.ok || !payload.tokenHash || !payload.localUserId)
          throw new Error("Não foi possível vincular a identidade ao Commander.");
        const client = getSupabaseBrowserClient();
        if (!client) throw new Error("Serviço de autenticação local indisponível.");
        const session = await client.auth.verifyOtp({
          token_hash: payload.tokenHash, type: "magiclink",
        });
        if (session.error || !session.data.session?.access_token ||
            session.data.user?.id !== payload.localUserId) {
          await client.auth.signOut().catch(() => {});
          throw new Error("Falha ao confirmar a sessão local do Commander.");
        }
        const localToken = session.data.session.access_token;
        setClientAuthToken(localToken, session.data.user.email ?? null);
        const sync = await fetch("/api/auth/local-session", {
          method: "POST", credentials: "same-origin",
          headers: { Authorization: "Bearer " + localToken },
        });
        if (!sync.ok) throw new Error("Não foi possível concluir a autenticação local.");
        if (active) window.location.replace("/");
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Falha de autenticação.");
      }
    }
    window.addEventListener("message", receive);
    opener.postMessage({ type: "COMMANDER_PORTAL_READY" }, origin);
    return () => {
      active = false;
      window.removeEventListener("message", receive);
    };
  }, []);

  return (
    <main className="mx-auto mt-12 max-w-lg rounded-xl border p-8">
      <h1 className="text-xl font-semibold">Acesso ao Commander pelo Access Management Service</h1>
      <p role="status" className="mt-4 text-sm">{message}</p>
      <p className="mt-4 text-xs">O acesso depende de identidade, licença e empresa autorizadas.</p>
    </main>
  );
}
