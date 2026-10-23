"use client";
import {useCallback,useEffect,useState} from "react";
import {getClientAuthHeaders} from "@/lib/client-auth";
type Kind="prospect"|"opportunity"|"requirement"|"research"|"assessment"|"decision_gate";
type RecordItem={id:string;kind:Kind;title:string;description:string;status:string;version:number;project_id:string|null;source_url:string|null;payload:Record<string,string|number|boolean>;updated_at:string};
type Project={id:string;name:string};
const kinds:{value:Kind;label:string;help:string}[]=[
 {value:"prospect",label:"Prospects",help:"Cadastro inicial e qualificação de potenciais clientes"},
 {value:"opportunity",label:"Oportunidades",help:"Acompanhamento de negociações e propostas"},
 {value:"requirement",label:"Requisitos",help:"Registro e revisão de requisitos do projeto"},
 {value:"research",label:"Pesquisa e evidências",help:"Registro manual de fontes externas verificáveis"},
 {value:"assessment",label:"Matriz de aderência",help:"Parecer e evidências de aderência das alternativas"},
 {value:"decision_gate",label:"Decisões e aprovação",help:"Registro de recomendações e aprovação humana"}
];
export default function PlanningPage(){
 const[kind,setKind]=useState<Kind>("prospect"),[items,setItems]=useState<RecordItem[]>([]);
 const[projects,setProjects]=useState<Project[]>([]),[projectId,setProjectId]=useState("");
 const[title,setTitle]=useState(""),[description,setDescription]=useState(""),[sourceUrl,setSourceUrl]=useState("");
 const[owner,setOwner]=useState(""),[nextAction,setNextAction]=useState("");
 const[active,setActive]=useState<RecordItem|null>(null),[status,setStatus]=useState<string|null>(null);
 const[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[page,setPage]=useState(1),[total,setTotal]=useState(0);
 const load=useCallback(async()=>{setLoading(true);try{
  const query=new URLSearchParams({kind,page:String(page)});if(projectId&&kind!=="prospect"&&kind!=="opportunity")query.set("projectId",projectId);
  const r=await fetch("/api/planning?"+query,{headers:getClientAuthHeaders(),cache:"no-store"});const json=await r.json();
  if(!r.ok)throw Error(json.error||"Falha na consulta");
  setItems(json.data||[]);setTotal(json.meta?.total||0);
 }catch(e){setStatus(e instanceof Error?e.message:"Falha ao carregar");}finally{setLoading(false)}},[kind,page,projectId]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{let mounted=true;async function fetchProjects(){try{
  const r=await fetch("/api/projects",{headers:getClientAuthHeaders(),cache:"no-store"});const j=await r.json();
  if(mounted&&r.ok)setProjects((j.data??[]).map((p:{id:string;name:string})=>({id:p.id,name:p.name})));
 }catch{}}void fetchProjects();return()=>{mounted=false}},[]);
 function reset(){setActive(null);setTitle("");setDescription("");setSourceUrl("");setOwner("");setNextAction("");}
 function edit(item:RecordItem){setActive(item);setTitle(item.title);setDescription(item.description);setSourceUrl(item.source_url||"");setOwner(String(item.payload.owner||""));setNextAction(String(item.payload.nextAction||""));setStatus(null);}
 async function convertProspect(){
  if(!active||kind!=="prospect"||active.status!=="won")return;
  if(!window.confirm(`Converter "${active.title}" em cliente? Esta ação cria um registro na base de clientes da Consult Services.`))return;
  setBusy(true);setStatus("Convertendo prospect...");
  try{
   const r=await fetch(`/api/planning/${active.id}/convert`,{method:"POST",headers:getClientAuthHeaders()});
   const j=await r.json();if(!r.ok)throw Error(j.error||"Falha na conversão");
   setStatus(j.data?.already_converted?"Prospect já convertido.":"Cliente criado com sucesso.");
   reset();await load();
  }catch(e){setStatus(e instanceof Error?e.message:"Falha na conversão");}finally{setBusy(false);}
 }
 async function save(action:"draft"|"review"|"approved"|"rejected"|"won"|"lost"){
  if(title.trim().length<3){setStatus("Informe um título de pelo menos 3 caracteres.");return;}
  if(!active&&!projectId&&!["prospect","opportunity"].includes(kind)){setStatus("Selecione o projeto deste registro.");return;}
  setBusy(true);setStatus("Salvando...");
  try{
   const editing=Boolean(active);const r=await fetch("/api/planning",{method:editing?"PATCH":"POST",
    headers:getClientAuthHeaders({"Content-Type":"application/json"}),
    body:JSON.stringify(editing?
      {id:active!.id,version:active!.version,title,description,status:action,payload:{owner,nextAction}}:
      {kind,projectId:projectId||null,title,description,sourceUrl,payload:{owner,nextAction}})
   });const j=await r.json();
   if(!r.ok)throw Error(j.error||"Não foi possível salvar");
   setStatus(editing?"Registro atualizado.":"Registro criado como rascunho. Para aprovação, revise o item.");
   reset();await load();
  }catch(e){setStatus(e instanceof Error?e.message:"Erro de gravação");}
  finally{setBusy(false);}
 }
 const info=kinds.find(x=>x.value===kind)!;
 return <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
  <header><p className="text-sm text-(--text-secondary)">Consult Services · Workspace compartilhado</p>
   <h1 className="text-2xl font-semibold">Planejamento e oportunidades</h1>
   <p className="mt-1 text-sm text-(--text-secondary)">Prospects, requisitos e análise de soluções com revisão humana e histórico versionado.</p>
  </header>
  <div className="flex flex-wrap gap-2" role="group" aria-label="Módulos de planejamento">{kinds.map(k=><button key={k.value} type="button"
   onClick={()=>{setKind(k.value);setPage(1);reset();setStatus(null)}}
   aria-pressed={kind===k.value}
   className={kind===k.value?"rounded-lg bg-(--accent) px-3 py-2 text-sm font-semibold text-white":"rounded-lg border border-(--border) px-3 py-2 text-sm"}>{k.label}</button>)}</div>
  <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
   <section className="rounded-xl border border-(--border) bg-white p-4">
    <h2 className="text-lg font-semibold">{active?"Editar registro":"Novo registro"} · {info.label}</h2>
    <p className="mb-4 text-sm text-(--text-secondary)">{info.help}</p>
    <div className="space-y-3">
     <label className="block text-sm">Projeto {kind==="prospect"||kind==="opportunity"?"(opcional)":"(obrigatório)"}
      <select className="workspace-select mt-1 w-full" value={active?.project_id||projectId} disabled={Boolean(active)} onChange={e=>setProjectId(e.target.value)}>
       <option value="">Sem projeto associado</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
     </label>
     <label className="block text-sm">Título<input maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} className="workspace-input mt-1 w-full" placeholder="Nome do prospect, requisito ou alternativa"/></label>
     <label className="block text-sm">Descrição e contexto<textarea rows={5} maxLength={10000} value={description} onChange={e=>setDescription(e.target.value)} className="workspace-input mt-1 w-full" placeholder="Registre fatos, necessidades e hipóteses separadamente."/></label>
     {kind==="research"?<label className="block text-sm">Fonte externa (HTTPS)
       <input value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://..." className="workspace-input mt-1 w-full" disabled={Boolean(active)}/>
       <span className="text-xs text-(--text-secondary)">A fonte é registrada para verificação humana. O sistema não acessa a URL nem confirma automaticamente seu conteúdo.</span>
      </label>:null}
     <label className="block text-sm">Responsável (referência)
       <input value={owner} onChange={e=>setOwner(e.target.value)} className="workspace-input mt-1 w-full"/>
     </label>
     <label className="block text-sm">Próxima ação
       <input value={nextAction} onChange={e=>setNextAction(e.target.value)} className="workspace-input mt-1 w-full"/>
     </label>
     {active?<p className="text-xs text-(--text-secondary)">Versão atual: {active.version} · Status: {active.status}</p>:null}
     <div className="flex flex-wrap gap-2">
      <button disabled={busy} className="workspace-button-primary px-4 py-2" onClick={()=>void save("draft")}>{busy?"Salvando...":active?"Salvar edição":"Criar rascunho"}</button>
      {active?<><button disabled={busy} className="workspace-button-secondary px-3 py-2" onClick={()=>void save("review")}>Enviar à revisão</button>
      <button disabled={busy} className="workspace-button-secondary px-3 py-2" onClick={()=>void save("approved")}>Aprovar</button>
      <button disabled={busy} className="workspace-button-secondary px-3 py-2" onClick={()=>void save("rejected")}>Rejeitar</button>
      {(kind==="opportunity"||kind==="prospect")?<button disabled={busy} className="workspace-button-secondary px-3 py-2" onClick={()=>void save("won")}>Marcar ganho</button>:null}</>:null}
      {active&&kind==="prospect"&&active.status==="won"?<button disabled={busy} className="workspace-button-primary px-3 py-2" onClick={()=>void convertProspect()}>Converter em cliente</button>:null}
      {active?<button className="workspace-button-secondary px-3 py-2" disabled={busy} onClick={reset}>Cancelar edição</button>:null}
     </div>
     {status?<p role="status" aria-live="polite" className="rounded-lg border border-(--border) p-3 text-sm">{status}</p>:null}
    </div>
   </section>
   <section className="rounded-xl border border-(--border) bg-white p-4">
    <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">Registros</h2>
     <button onClick={()=>void load()} className="workspace-button-secondary px-3 py-2 text-xs" disabled={loading}>{loading?"Carregando...":"Atualizar"}</button></div>
    <p className="mb-3 text-xs text-(--text-secondary)">{total} registro(s), página {page}. A consulta é sob demanda e limitada a 25 itens.</p>
    <div className="space-y-2">{items.map(item=><button key={item.id} type="button" onClick={()=>edit(item)}
      className="block w-full rounded-lg border border-(--border) p-3 text-left hover:bg-(--bg-muted)">
      <span className="block font-medium">{item.title}</span>
      <span className="text-xs text-(--text-secondary)">{item.status} · v{item.version} · {new Date(item.updated_at).toLocaleDateString("pt-BR")}</span>
      <p className="mt-1 line-clamp-2 text-sm text-(--text-secondary)">{item.description||"Sem descrição"}</p>
     </button>)}{!loading&&!items.length?<p className="text-sm text-(--text-secondary)">Nenhum registro encontrado nesta categoria.</p>:null}</div>
    <div className="mt-4 flex gap-2">
     <button type="button" disabled={page===1} onClick={()=>setPage(p=>p-1)} className="workspace-button-secondary px-3 py-2 text-xs disabled:opacity-40">Anterior</button>
     <button type="button" disabled={page*25>=total} onClick={()=>setPage(p=>p+1)} className="workspace-button-secondary px-3 py-2 text-xs disabled:opacity-40">Próxima</button>
    </div>
   </section>
  </div>
 </div>;
}
