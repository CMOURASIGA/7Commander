"use client";
import { useEffect, useState } from "react";
import { getClientAuthHeaders } from "@/lib/client-auth";
type Entry = { user_id: string; email: string; nome: string; role: string; active: boolean };
export default function AdminUsers() {
  const [entries,setEntries] = useState<Entry[]>([]);
  const [message,setMessage] = useState("");
  const [loading,setLoading] = useState(true);
  const [nome,setNome] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [role,setRole] = useState("colaborador");
  async function load() {
    const r=await fetch("/api/admin/users",{headers:getClientAuthHeaders()});
    const j=await r.json();
    if(!r.ok) { setMessage(j.error||"Nao autorizado"); setLoading(false); return; }
    setEntries(j.data||[]); setLoading(false);
  }
  useEffect(()=>{void load()},[]);
  async function create(e: React.FormEvent) {
    e.preventDefault();setMessage("");
    const r=await fetch("/api/admin/users",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({nome,email,password,role})});
    const j=await r.json();setMessage(r.ok?"Usuario criado. Oriente a troca da senha inicial.":j.error||"Falha");
    if(r.ok){setPassword("");setNome("");setEmail("");await load();}
  }
  async function update(userId:string,patch:{role?:string;active?:boolean}) {
    const r=await fetch("/api/admin/users",{method:"PATCH",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({userId,...patch})});
    const j=await r.json();setMessage(r.ok?"Acesso atualizado":j.error||"Falha");if(r.ok)await load();
  }
  return <main className="mx-auto max-w-4xl space-y-6 p-6"><h1 className="text-2xl font-bold">Administração de usuários</h1><p>Somente administradores podem criar usuários e conceder perfis. Senhas são armazenadas pelo Supabase Auth, nunca pelo 7Commander.</p>
    <form onSubmit={create} className="grid gap-3 rounded-xl border p-5">
      <h2 className="font-semibold">Novo acesso</h2>
      <input className="rounded border p-3" placeholder="Nome completo" value={nome} onChange={e=>setNome(e.target.value)} required/>
      <input className="rounded border p-3" type="email" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} required/>
      <input className="rounded border p-3" type="password" autoComplete="new-password" placeholder="Senha inicial (12+ caracteres)" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} required/>
      <select className="rounded border p-3" value={role} onChange={e=>setRole(e.target.value)}><option value="admin">Administrador</option><option value="gestor">Gestor</option><option value="colaborador">Colaborador</option><option value="leitor">Leitor</option></select>
      <button className="rounded bg-blue-800 p-3 font-semibold text-white" type="submit">Criar usuário</button>
    </form>
    {message&&<p role="status">{message}</p>}
    <section className="space-y-3"><h2 className="text-xl font-semibold">Usuários</h2>
      {loading?<p>Carregando...</p>:entries.map(u=><article key={u.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div><strong>{u.nome}</strong><p>{u.email}</p><p>{u.active?"Ativo":"Suspenso"} {u.role==="superadmin"?" · Conta principal protegida":""}</p></div><div className="flex gap-2"><select aria-label={"Perfil de "+u.nome} value={u.role} onChange={e=>void update(u.user_id,{role:e.target.value})} disabled={u.role==="superadmin"} className="rounded border p-2"><option value="superadmin">Superadmin</option><option value="admin">Admin</option><option value="gestor">Gestor</option><option value="colaborador">Colaborador</option><option value="leitor">Leitor</option></select><button disabled={u.role==="superadmin"} className="rounded border p-2 disabled:opacity-50" onClick={()=>void update(u.user_id,{active:!u.active})}>{u.active?"Suspender":"Ativar"}</button></div></article>)}
    </section></main>;
}