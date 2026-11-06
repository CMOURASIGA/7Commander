"use client";

import { FormEvent, useEffect, useState } from "react";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
import { getClientAuthHeaders } from "@/lib/client-auth";

/**
 * Customer onboarding is intentionally two-stage: first a verified Commander
 * user, then a verified 7Service identity. Never synthesize a local JWT from
 * a central login; Commander RLS depends on the local auth.uid().
 */
export default function ClientAccessPage() {
  const auth = useKairosAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<"idle"|"authenticating"|"confirming"|"redirecting">("idle");

  useEffect(() => {
    if (!auth.loading && !auth.user) window.location.replace("/login");
  }, [auth.loading, auth.user]);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !auth.user) return;
    setBusy(true);
    setPhase("authenticating");
    setMessage("Confirmando sua identidade no 7Service...");
    try {
      const headers = getClientAuthHeaders({ "Content-Type": "application/json" });
      const response = await fetch("/api/auth/central-session", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers,
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = await response.json().catch(() => ({})) as { code?: string };
      if (!response.ok) {
        const code = payload.code ?? "";
        if (code === "DISABLED") throw new Error("Integração central não habilitada neste ambiente.");
        if (code === "LOCAL_AUTH_REQUIRED") throw new Error("Sua sessão do Commander expirou. Faça novamente o login local.");
        if (code === "CENTRAL_LOGIN_DENIED") throw new Error("Não foi possível autenticar sua identidade no 7Service. Confira as credenciais centrais.");
        if (code === "CSRF_DENIED") throw new Error("Validação de segurança da origem recusada. Reabra a página pelo endereço oficial.");
        throw new Error("Não foi possível confirmar o vínculo com o 7Service.");
      }
      setPassword("");
      setPhase("confirming");
      setMessage("Identidade confirmada. Verificando sessão central...");
      const check = await fetch("/api/auth/central-session", {
        credentials: "same-origin",
        cache: "no-store",
        headers: getClientAuthHeaders(),
      });
      const verified = await check.json().catch(() => ({})) as { ok?: boolean };
      if (!check.ok || verified.ok !== true) {
        throw new Error("A sessão central não foi confirmada. Tente novamente.");
      }
      setPhase("redirecting");
      setMessage("Acesso validado. Abrindo seu workspace...");
      // Full navigation ensures the server middleware sees the freshly set
      // central session cookie, without Next Router cache retaining this page.
      window.location.assign("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha de conexão central.");
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  }

  return <main className="mx-auto max-w-xl rounded-2xl border border-(--border) bg-(--bg-surface) p-7 shadow-[var(--shadow-card)]">
    <h1 className="text-2xl font-semibold">Conectar acesso do cliente</h1>
    <p className="mt-3 text-sm">A identidade local do 7Commander já foi validada. Agora confirme a identidade vinculada no 7Service para consultar os produtos e permissões contratados.</p>
    <p className="mt-3 rounded-lg border p-3 text-sm">Essa segunda confirmação não cria nem altera usuários. Sua conta local precisa ter sido ativada previamente e vinculada à identidade central pelo administrador.</p>
    {auth.loading ? <p className="mt-4 text-sm">Verificando sessão local...</p> :
      !auth.user ? <p className="mt-4 text-sm">É necessário entrar primeiro com uma conta local habilitada no 7Commander.</p> :
      <form onSubmit={connect} className="mt-5 grid gap-4">
        <label className="grid gap-1 text-sm">E-mail da identidade 7Service
          <input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="rounded-lg border p-3"/>
        </label>
        <label className="grid gap-1 text-sm">Senha do 7Service
          <input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="rounded-lg border p-3"/>
        </label>
        {message ? <p role="status" aria-live="polite" className={`text-sm ${message.includes("Acesso validado") || message.includes("Identidade confirmada") || message.includes("Confirmando") ? "text-(--text-primary)" : "text-red-600"}`}>{message}</p> : null}
        <button type="submit" disabled={busy} className="rounded-lg bg-blue-800 p-3 font-semibold text-white disabled:opacity-60">{phase==="authenticating"?"Autenticando no 7Service...":phase==="confirming"?"Confirmando sessão...":phase==="redirecting"?"Abrindo workspace...":"Confirmar acesso central"}</button>
      </form>}
    <button type="button" onClick={() => window.location.assign("/login")} className="mt-5 text-sm underline">Voltar ao login</button>
  </main>;
}
