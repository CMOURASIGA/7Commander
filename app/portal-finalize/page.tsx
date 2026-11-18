"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { setClientAuthToken } from "@/lib/client-auth";

export default function PortalFinalizePage() {
  const [message, setMessage] = useState("Confirmando seu acesso ao Commander...");
  useEffect(() => {
    let cancelled = false;
    async function complete() {
      try {
        const ticket = await fetch("/api/auth/portal-finalize", {
          method: "POST", credentials: "same-origin", cache: "no-store",
        });
        const payload = await ticket.json().catch(() => null) as
          | {ok?: boolean; tokenHash?: string; localUserId?: string} | null;
        if (!ticket.ok || !payload?.ok || !payload.tokenHash || !payload.localUserId)
          throw new Error("A confirmação de acesso expirou. Entre novamente pelo Meu Portal.");
        const auth = getSupabaseBrowserClient();
        if (!auth) throw new Error("O serviço de autenticação local está indisponível.");
        const verified = await auth.auth.verifyOtp({ token_hash: payload.tokenHash, type: "magiclink" });
        if (verified.error || !verified.data.session?.access_token ||
            verified.data.user?.id !== payload.localUserId) {
          await auth.auth.signOut().catch(() => {});
          throw new Error("A sessão vinculada não foi confirmada. Solicite a revisão do acesso.");
        }
        const accessToken = verified.data.session.access_token;
        setClientAuthToken(accessToken, verified.data.user.email ?? null);
        const sync = await fetch("/api/auth/local-session", {
          method: "POST", credentials: "same-origin",
          headers: { Authorization: "Bearer " + accessToken },
        });
        if (!sync.ok) throw new Error("Falha ao confirmar a sessão do Commander.");
        if (!cancelled) window.location.replace("/");
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Falha ao entrar no Commander.");
      }
    }
    void complete();
    return () => { cancelled = true; };
  }, []);
  return (
    <main className="mx-auto mt-12 max-w-lg rounded-xl border p-8">
      <h1 className="text-xl font-semibold">Acesso pelo Access Management Service</h1>
      <p role="status" className="mt-4 text-sm">{message}</p>
      <p className="mt-5 text-xs">Não envie senhas ou códigos de autenticação ao suporte.</p>
    </main>
  );
}
