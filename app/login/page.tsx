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
  const [clientMode,setClientMode]=useState(false);
  useEffect(()=>{const params=new URLSearchParams(window.location.search);const value=params.get("next")||"/";setNextPath(value.startsWith("/")&&!value.startsWith("//")?value:"/");setClientMode(params.get("mode")==="client")},[]);
  useEffect(()=>{if(!auth.loading&&auth.user)router.replace(clientMode?"/central-access":nextPath)},[auth.loading,auth.user,clientMode,nextPath,router]);
  async function submit(e:React.FormEvent){e.preventDefault();setError("");setBusy(true);try{await auth.signInWithPassword(email,password);router.replace(clientMode?"/central-access":nextPath)}catch(e){setError(clientMode?"O acesso ao Commander precisa ser ativado pelo administrador antes de vincular sua identidade do 7Service. Se sua conta já estiver ativa, confirme as credenciais locais.":(e instanceof Error?e.message:"Falha de acesso"))}finally{setBusy(false)}}
  return <section className="mx-auto max-w-xl rounded-[1.8rem] border border-(--border) bg-(--bg-surface) p-8 shadow-[var(--shadow-card)]">
    <div className="flex justify-center"><BrandLockup align="center" size="lg"/></div>
    <div className="mt-6 text-center"><h1 className="text-2xl font-semibold">Entrar no 7Commander</h1><p className="mt-3 text-sm">Use o e-mail e a senha fornecidos pelo administrador da Consult Services.</p></div>
    <div className="mt-6 flex gap-2 rounded-xl border p-2 text-sm"><button type="button" aria-pressed={!clientMode} onClick={()=>{setClientMode(false);setError("")}} className={`flex-1 rounded-lg p-2 ${!clientMode?"bg-blue-800 font-semibold text-white":"bg-transparent"}`}>Equipe Consult Services</button><button type="button" aria-pressed={clientMode} onClick={()=>{setClientMode(true);setError("")}} className={`flex-1 rounded-lg p-2 ${clientMode?"bg-blue-800 font-semibold text-white":"bg-transparent"}`}>Cliente 7Service</button></div>
    {clientMode?<p className="mt-3 rounded-lg border p-3 text-sm">Para acessar como cliente, primeiro entre com a conta local habilitada no 7Commander. Em seguida, confirme sua identidade no 7Service. A senha do 7Service, sozinha, não substitui a ativação local necessária para as regras de segurança do Commander.</p>:null}
    <form onSubmit={submit} className="mt-4 grid gap-4 rounded-xl border p-5">
      <label className="grid gap-1 text-sm">E-mail<input type="email" autoComplete="username" required className="rounded border p-3" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label className="grid gap-1 text-sm">Senha<input type="password" autoComplete="current-password" required className="rounded border p-3" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      {error?<p role="alert" className="text-red-600">{error}</p>:null}
      <button type="submit" disabled={busy||auth.loading} className="rounded-xl bg-blue-800 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy?"Entrando...":"Entrar"}</button>
    </form>
  </section>;
}