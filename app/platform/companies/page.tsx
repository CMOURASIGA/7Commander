"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getClientAuthHeaders } from "@/lib/client-auth";

type Company = { id: string; name: string; slug: string; status: string; branding?: { displayName?: string; primaryColor?: string; secondaryColor?: string; logoUrl?: string } };
export default function CompaniesAdminPage() {
  const [companies,setCompanies] = useState<Company[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [name,setName] = useState("");
  const [slug,setSlug] = useState("");
  const [selected,setSelected] = useState("");
  const [brandName,setBrandName] = useState("");
  const [primary,setPrimary] = useState("#003B73");
  const [secondary,setSecondary] = useState("#00AEEF");
  const [logo,setLogo] = useState("");
  const [busy,setBusy] = useState(false);
  async function load() {
    const r=await fetch("/api/platform/companies",{headers:getClientAuthHeaders(),cache:"no-store"});
    const p=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(p.error || "Não foi possível listar empresas.");
    setCompanies(p.data||[]);
  }
  useEffect(()=>{void load().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
  function edit(company:Company) {
    setSelected(company.id);setBrandName(company.branding?.displayName||company.name);
    setPrimary(company.branding?.primaryColor||"#003B73");
    setSecondary(company.branding?.secondaryColor||"#00AEEF");
    setLogo(company.branding?.logoUrl||"");
  }
  async function save(endpointMethod:"POST"|"PATCH",body:unknown) {
    setBusy(true);setError("");
    try {
      const response=await fetch("/api/platform/companies",{method:endpointMethod,headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify(body)});
      const json=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(json.error||"Falha ao salvar.");
      await load();
      if(endpointMethod==="POST"){setName("");setSlug("");edit(json.data);}
    } catch(e) {setError(e instanceof Error?e.message:"Falha inesperada.");}
    finally{setBusy(false);}
  }
  return <main className="mx-auto max-w-5xl space-y-5">
    <header><p className="text-xs font-semibold uppercase tracking-widest text-(--text-secondary)">Administração da plataforma</p><h1 className="mt-2 text-2xl font-semibold">Empresas e marcas</h1><p className="mt-2 text-sm text-(--text-secondary)">Área exclusiva de superadmin. Criar empresa não habilita a operação multitenant até os testes de isolamento.</p></header>
    {error&&<p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}
    <section className="rounded-xl border border-(--border) bg-(--bg-surface) p-5"><h2 className="font-semibold">Cadastrar empresa</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm">Nome<input className="workspace-input mt-1" value={name} onChange={e=>setName(e.target.value)} placeholder="Nome da empresa"/></label><label className="text-sm">Identificador<input className="workspace-input mt-1" value={slug} onChange={e=>setSlug(e.target.value)} placeholder="empresa-exemplo"/></label></div>
      <button type="button" disabled={busy||name.trim().length<3||!slug.trim()} onClick={()=>void save("POST",{name,slug})} className="workspace-button-primary mt-3 disabled:opacity-50">Cadastrar empresa</button>
    </section>
    <section className="rounded-xl border border-(--border) bg-(--bg-surface) p-5"><h2 className="font-semibold">Empresas cadastradas</h2>{loading?<p className="mt-3">Carregando...</p>:companies.length===0?<p className="mt-3 text-sm">Nenhuma empresa cadastrada.</p>:<div className="mt-3 grid gap-2">{companies.map(c=><button type="button" key={c.id} onClick={()=>edit(c)} className={"flex items-center justify-between rounded-lg border p-3 text-left text-sm "+(selected===c.id?"border-blue-600 bg-blue-50":"border-(--border)")}><span><strong>{c.name}</strong> <small className="ml-2 text-(--text-secondary)">{c.slug}</small></span><span>{c.status}</span></button>)}</div>}</section>
    {selected&&<section className="rounded-xl border border-(--border) bg-(--bg-surface) p-5"><h2 className="font-semibold">White label da empresa selecionada</h2><div className="mt-4 grid gap-3 md:grid-cols-2">
      <label className="text-sm md:col-span-2">Nome exibido<input className="workspace-input mt-1" value={brandName} onChange={e=>setBrandName(e.target.value)}/></label>
      <label className="text-sm">Cor principal<input type="color" className="mt-1 block h-10 w-full" value={primary} onChange={e=>setPrimary(e.target.value)}/></label>
      <label className="text-sm">Cor secundária<input type="color" className="mt-1 block h-10 w-full" value={secondary} onChange={e=>setSecondary(e.target.value)}/></label>
      <label className="text-sm md:col-span-2">URL HTTPS do logotipo<input className="workspace-input mt-1" value={logo} onChange={e=>setLogo(e.target.value)} placeholder="https://..."/></label>
      </div><button type="button" disabled={busy} onClick={()=>void save("PATCH",{id:selected,branding:{displayName:brandName,primaryColor:primary,secondaryColor:secondary,logoUrl:logo}})} className="workspace-button-primary mt-4">Salvar marca da empresa</button><p className="mt-2 text-xs text-(--text-secondary)">Esta configuração fica armazenada na organização. Sua aplicação automática após troca de empresa depende da ativação multitenant.</p></section>}
    <Link href="/organizations" className="inline-block text-sm underline">Ver minhas empresas</Link>
  </main>;
}