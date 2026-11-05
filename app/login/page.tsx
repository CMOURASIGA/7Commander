"use client";
import { useEffect, useState } from "react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { setClientAuthToken } from "@/lib/client-auth";
export default function LoginPage() {
  const auth=useKairosAuth();
  const [email,setEmail]=useState("");const [password,setPassword]=useState("");
  const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const [nextPath,setNextPath]=useState("/");
  useEffect(()=>{const value=new URLSearchParams(window.location.search).get("next")||"/";setNextPath(value.startsWith("/")&&!value.startsWith("//")?value:"/")},[]);
  async function submit(e:React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // Central identity first: establish BOTH central cookies and the linked local
      // Supabase session in one login. Internal users without a central link
      // retain the existing local login as a fallback.
      const response = await fetch("/api/auth/central-exchange", {
        method:"POST",
        credentials:"same-origin",
        cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email:email.trim(),password}),
      });
      if (!response.ok) {
        // The broker is fail-closed. A fallback local session for a linked
        // customer still cannot access protected pages without central cookies.
        await auth.signInWithPassword(email,password);
        setPassword("");
        window.location.assign(nextPath);
        return;
      }
      const payload = await response.json().catch(()=>null) as
        | {ok?:boolean;tokenHash?:string;localUserId?:string} | null;
      if (!payload?.ok || !payload.tokenHash || !payload.localUserId)
        throw new Error("Não foi possível estabelecer a sessão do Commander.");
      const client = getSupabaseBrowserClient();
      if (!client) throw new Error("Autenticação do Commander indisponível.");
      const exchange = await client.auth.verifyOtp({
        token_hash:payload.tokenHash, type:"magiclink",
      });
      if (exchange.error || !exchange.data.session?.access_token ||
          exchange.data.user?.id !== payload.localUserId) {
        await client.auth.signOut().catch(()=>{});
        throw new Error("Não foi possível validar a sessão local vinculada.");
      }
      const token = exchange.data.session.access_token;
      setClientAuthToken(token,exchange.data.user?.email??null);
      const sync = await fetch("/api/auth/local-session", {
        method:"POST",
        credentials:"same-origin",
        headers:{Authorization:"Bearer "+token},
      });
      if (!sync.ok) throw new Error("Não foi possível confirmar a sessão de acesso.");
      setPassword("");
      window.location.assign(nextPath);
    } catch(e) {
      setError(e instanceof Error?e.message:"Falha de acesso");
    } finally {
      setBusy(false);
    }
  }
  return <section className="mx-auto max-w-xl rounded-[1.8rem] border border-(--border) bg-(--bg-surface) p-8 shadow-[var(--shadow-card)]">
    <div className="flex justify-center"><BrandLockup align="center" size="lg"/></div>
    <div className="mt-6 text-center"><h1 className="text-2xl font-semibold">Entrar no 7Commander</h1><p className="mt-3 text-sm">Use suas credenciais autorizadas. A empresa será selecionada dentro do sistema.</p></div>
    <form onSubmit={submit} className="mt-6 grid gap-4 rounded-xl border p-5">
      <label className="grid gap-1 text-sm">E-mail<input type="email" autoComplete="username" required className="rounded border p-3" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label className="grid gap-1 text-sm">Senha<input type="password" autoComplete="current-password" required className="rounded border p-3" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      {error?<p role="alert" className="text-red-600">{error}</p>:null}
      <button type="submit" disabled={busy||auth.loading} className="rounded-xl bg-blue-800 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy?"Entrando...":"Entrar"}</button>
    </form>
  </section>;
}