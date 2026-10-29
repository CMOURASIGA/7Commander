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
  const [notice,setNotice] = useState("");
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
  async function linkMyAccount() {
    if(!selected)return;
    setBusy(true);setError("");setNotice("");setNotice("");
    try{
      const r=await fetch("/api/platform/companies/members",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({organizationId:selected})});
      const p=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(p.error||"Falha ao vincular conta.");
      setNotice("Sua conta foi vinculada à empresa. A troca operacional continua bloqueada até a homologação de segurança.");
    }catch(e){setError(e instanceof Error?e.message:"Falha no vínculo.");}
    finally{setBusy(false);}
  }
  async function deactivateCompany(){
    const company=companies.find(c=>c.id===selected);
    if(!company)return;
    if(!window.confirm(`Desativar "${company.name}"? A empresa deixará de estar disponível, mas seus dados não serão excluídos.`))return;
    const confirmation=window.prompt('Digite DESATIVAR para confirmar:');
    if(confirmation!=="DESATIVAR")return;
    setBusy(true);setError("");setNotice("");
    try{
      const r=await fetch("/api/platform/companies",{method:"DELETE",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({id:selected,confirmation})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(j.error||"Não foi possível desativar a empresa.");
      setSelected("");await load();setNotice("Empresa desativada sem excluir dados.");
    }catch(e){setError(e instanceof Error?e.message:"Falha ao desativar empresa.");}
    finally{setBusy(false);}
  }
  function uploadLogo(file:File|null) {
    if(!file)return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>350000){setError("Use PNG, JPG ou WEBP com até 350 KB.");return;}
    const reader=new FileReader();
    reader.onload=()=>{
      const data=String(reader.result??"");
      if(!data.startsWith("data:image/"))return;
      setLogo(data);setError("");
      const image=new Image();
      image.onload=()=>{
        const canvas=document.createElement("canvas");canvas.width=canvas.height=48;
        const context=canvas.getContext("2d");if(!context)return;
        context.drawImage(image,0,0,48,48);
        const pixels=context.getImageData(0,0,48,48).data;
        const counts=new Map<string,number>();
        for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<180)continue;const rgb=[0,1,2].map(j=>Math.min(255,Math.round(pixels[i+j]/32)*32));const key=rgb.map(n=>n.toString(16).padStart(2,"0")).join("");counts.set(key,(counts.get(key)||0)+1);}
        const colors=[...counts.entries()].sort((a,b)=>b[1]-a[1]).map(x=>"#"+x[0]).filter(x=>x!=="#ffffff"&&x!=="#000000");
        if(colors[0])setPrimary(colors[0]);if(colors[1])setSecondary(colors[1]);
      };
      image.src=data;
    };
    reader.readAsDataURL(file);
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
    {notice&&<p role="status" className="rounded-lg border border-green-300 bg-green-50 p-3 text-green-800">{notice}</p>}
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
      <label className="text-sm md:col-span-2">Logotipo (PNG, JPG ou WEBP, até 350 KB)<input className="workspace-input mt-1" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadLogo(e.target.files?.[0]||null)}/></label>
      {logo&&<div className="md:col-span-2 flex items-center gap-3 rounded-lg border bg-white p-3"><img src={logo} alt="Prévia do logotipo" className="max-h-24 max-w-48 object-contain"/><span className="text-xs text-gray-600">Prévia da marca selecionada</span></div>}
      <label className="text-sm md:col-span-2">Ou informe URL HTTPS<input className="workspace-input mt-1" value={logo.startsWith("data:")?"":logo} onChange={e=>setLogo(e.target.value)} placeholder="https://..."/></label>
      </div><button type="button" disabled={busy} onClick={()=>void save("PATCH",{id:selected,branding:{displayName:brandName,primaryColor:primary,secondaryColor:secondary,logoUrl:logo}})} className="workspace-button-primary mt-4">Salvar marca da empresa</button><div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy} className="workspace-button-secondary" onClick={()=>{setBrandName("Consult Services Tecnologia");setPrimary("#003B73");setSecondary("#00AEEF");setLogo("https://i.imgur.com/gxXnYsA.png");}}>Restaurar padrão Consult Services</button><button type="button" disabled={busy} className="workspace-button-secondary" onClick={()=>void linkMyAccount()}>Vincular minha conta à empresa</button></div><p className="mt-2 text-xs text-(--text-secondary)">A identidade visual é aplicada quando a empresa está ativa.</p><div className="mt-5 border-t border-(--border) pt-4"><h3 className="font-semibold">Administração da empresa</h3><p className="mt-1 text-sm text-(--text-secondary)">Desativar impede novas operações sem apagar o histórico. Empresas principais e empresas com projetos não podem ser desativadas por esta tela.</p><button type="button" disabled={busy||companies.find(c=>c.id===selected)?.status!=="active"} onClick={()=>void deactivateCompany()} className="workspace-button-secondary mt-3 disabled:opacity-50">Desativar empresa</button></div></section>}
    <Link href="/organizations" className="inline-block text-sm underline">Ver minhas empresas</Link>
  </main>;
}