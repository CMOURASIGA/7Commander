'use client';
import { FormEvent, useEffect, useState } from 'react';
import { getClientAuthHeaders } from '@/lib/client-auth';
import { useKairosAuth } from '@/components/auth/kairos-auth-provider';

/** Explicit second-factor-like central sign-in; never store central JWT in JS storage. */
export default function CentralAccessPage(){
 const auth=useKairosAuth();const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{if(!auth.loading&&!auth.user)window.location.replace('/login?next=/central-access');},[auth.loading,auth.user]);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage('');try{
   const r=await fetch('/api/auth/central-session',{method:'POST',headers:getClientAuthHeaders({'Content-Type':'application/json'}),credentials:'same-origin',body:JSON.stringify({email,password})});
   setPassword('');
   if(!r.ok){setMessage('Autenticação central não autorizada.');return;}
   window.location.assign('/');
  }catch{setMessage('Serviço temporariamente indisponível.');}finally{setBusy(false);}
 }
 return <main className="mx-auto max-w-md space-y-5 p-8"><h1 className="text-xl font-semibold">Autorizar acesso pelo 7Service</h1>
  <p>Após entrar no Commander, autentique-se também no 7Service. O acesso depende de vínculos e permissões já aprovados.</p>
  <form onSubmit={submit} className="grid gap-3">
   <input type="email" autoComplete="username" required placeholder="E-mail da identidade central" value={email} onChange={e=>setEmail(e.target.value)} className="rounded border p-3" />
   <input type="password" autoComplete="current-password" required placeholder="Senha central" value={password} onChange={e=>setPassword(e.target.value)} className="rounded border p-3" />
   {message?<p role="alert">{message}</p>:null}
   <button disabled={busy} className="rounded bg-blue-800 p-3 text-white">{busy?'Validando...':'Validar acesso'}</button>
  </form>
 </main>;
}
