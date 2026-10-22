"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
export default function LoginPage() {
  const auth=useKairosAuth();const router=useRouter();
  const [email,setEmail]=useState("");const [password,setPassword]=useState("");
  const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const [nextPath,setNextPath]=useState("/");
  useEffect(()=>{const value=new URLSearchParams(window.location.search).get("next")||"/";setNextPath(value.startsWith("/")&&!value.startsWith("//")?value:"/")},[]);
  useEffect(()=>{if(!auth.loading&&auth.user)router.replace(nextPath)},[auth.loading,auth.user,nextPath,router]);
  async function submit(e:React.FormEvent){e.preventDefault();setError("");setBusy(true);try{await auth.signInWithPassword(email,password);router.replace(nextPath)}catch(e){setError(e instanceof Error?e.message:"Falha de acesso")}finally{setBusy(false)}}
  return <section className="mx-auto max-w-xl rounded-[1.8rem] border border-(--border) bg-(--bg-surface) p-8 shadow-[var(--shadow-card)]">
    <div className="flex justify-center"><BrandLockup align="center" size="lg"/></div>
    <div className="mt-6 text-center"><h1 className="text-2xl font-semibold">Entrar no 7Commander</h1><p className="mt-3 text-sm">Use o e-mail e a senha fornecidos pelo administrador da Consult Services.</p></div>
    <form onSubmit={submit} className="mt-6 grid gap-4 rounded-xl border p-5">
      <label className="grid gap-1 text-sm">E-mail<input type="email" autoComplete="username" required className="rounded border p-3" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label className="grid gap-1 text-sm">Senha<input type="password" autoComplete="current-password" required className="rounded border p-3" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      {error?<p role="alert" className="text-red-600">{error}</p>:null}
      <button type="submit" disabled={busy||auth.loading} className="rounded-xl bg-blue-800 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy?"Entrando...":"Entrar"}</button>
    </form>
  </section>;
}