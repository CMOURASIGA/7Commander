"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
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
 const[stage,setStage]=useState("novo"),[prospectId,setProspectId]=useState(""),[prospects,setProspects]=useState<Array<{id:string;title:string}>>([]);
 const[active,setActive]=useState<RecordItem|null>(null),[status,setStatus]=useState<string|null>(null);
 const[publicQuery,setPublicQuery]=useState(""),[publicConfirmed,setPublicConfirmed]=useState(false);
 const[reqCategory,setReqCategory]=useState("funcional"),[reqAcceptance,setReqAcceptance]=useState(""),[reqSource,setReqSource]=useState(""),[reqPriority,setReqPriority]=useState("media");
 const[findings,setFindings]=useState<Array<{recordId:string;severity:string;detail:string}>>([]);
 const[searchResults,setSearchResults]=useState<Array<{title:string;url:string;snippet:string;consultedAt:string}>>([]);
 const[searchBusy,setSearchBusy]=useState(false);
 const[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[page,setPage]=useState(1),[total,setTotal]=useState(0);
 const load=useCallback(async()=>{setLoading(true);try{
  const query=new URLSearchParams({kind,page:String(page)});if(projectId&&kind!=="prospect"&&kind!=="opportunity")query.set("projectId",projectId);
  const r=await fetch("/api/planning?"+query,{headers:getClientAuthHeaders(),cache:"no-store"});const json=await r.json();
  if(!r.ok)throw Error(json.error||"Falha na consulta");
  setItems(json.data||[]);setTotal(json.meta?.total||0);
 }catch(e){setStatus(e instanceof Error?e.message:"Falha ao carregar");}finally{setLoading(false)}},[kind,page,projectId]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{let live=true;async function loadProspects(){try{const r=await fetch("/api/planning?kind=prospect",{headers:getClientAuthHeaders(),cache:"no-store"});if(!r.ok)return;const j=await r.json();if(live)setProspects((j.data||[]).map((p:{id:string;title:string})=>({id:p.id,title:p.title})));}catch{}}if(kind==="opportunity")void loadProspects();return()=>{live=false}},[kind]);
 useEffect(()=>{let mounted=true;async function fetchProjects(){try{
  const r=await fetch("/api/projects",{headers:getClientAuthHeaders(),cache:"no-store"});const j=await r.json();
  if(mounted&&r.ok)setProjects((j.data??[]).map((p:{id:string;name:string})=>({id:p.id,name:p.name})));
 }catch{}}void fetchProjects();return()=>{mounted=false}},[]);
 function reset(){setActive(null);setTitle("");setDescription("");setSourceUrl("");setOwner("");setNextAction("");setStage("novo");setProspectId("");setReqCategory("funcional");setReqAcceptance("");setReqSource("");setReqPriority("media");}
 function edit(item:RecordItem){setActive(item);setTitle(item.title);setDescription(item.description);setSourceUrl(item.source_url||"");setOwner(String(item.payload.owner||""));setNextAction(String(item.payload.nextAction||""));setStage(String(item.payload.stage||"novo"));setProspectId(String(item.payload.prospectId||""));setReqCategory(String(item.payload.category||"funcional"));setReqAcceptance(String(item.payload.acceptance||""));setReqSource(String(item.payload.source||""));setReqPriority(String(item.payload.priority||"media"));setStatus(null);}
 async function reviewRequirements(){
  if(!projectId){setStatus("Selecione um projeto para revisar requisitos.");return;}
  setBusy(true);setStatus("Analisando requisitos por regras determinísticas...");
  try{
   const r=await fetch("/api/planning/requirements/review",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),body:JSON.stringify({projectId})});
   const j=await r.json();if(!r.ok)throw Error(j.error||"Falha na análise");
   setFindings(j.data||[]);setStatus(`${(j.data||[]).length} ponto(s) para revisão humana. Nenhum requisito foi alterado.`);
  }catch(e){setStatus(e instanceof Error?e.message:"Erro na revisão");}finally{setBusy(false)}
 }
 async function searchExternal(){
  setSearchBusy(true);setStatus("Buscando fontes públicas...");
  try{
   const r=await fetch("/api/planning/research",{method:"POST",headers:getClientAuthHeaders({"Content-Type":"application/json"}),
    body:JSON.stringify({projectId,publicQuery,confirmPublicQuery:publicConfirmed})});
   const j=await r.json();if(!r.ok)throw Error(j.error||"Falha na pesquisa");
   setSearchResults(j.data||[]);setStatus(`${(j.data||[]).length} fonte(s) recuperada(s). Nenhuma está verificada. Consulte a fonte antes de registrar.`);
  }catch(e){setStatus(e instanceof Error?e.message:"Pesquisa indisponível")}finally{setSearchBusy(false)}
 }
 async function convertProspect(){
  if(!active||kind!=="prospect"||active.status!=="won")return;
  if(!window.confirm(`Converter "${active.title}" em cliente? Esta ação cria um cliente na empresa atualmente selecionada.`))return;
  setBusy(true);setStatus("Convertendo prospect...");
  try{
   const r=await fetch(`/api/planning/${active.id}/convert`,{method:"POST",headers:getClientAuthHeaders()});
   const j=await r.json();if(!r.ok)throw Error(j.error||"Falha na conversão");
   setStatus(j.data?.already_converted?"Prospect já convertido.":"Cliente criado com sucesso.");
   reset();await load();
  }catch(e){setStatus(e instanceof Error?e.message:"Falha na conversão");}finally{setBusy(false);}
 }
 async function createProjectFromPlanning(){
  if(!active||kind!=="opportunity"||!["approved","won"].includes(active.status))return;
  if(!window.confirm("Criar um projeto a partir desta oportunidade aprovada?"))return;
  setBusy(true);setStatus("Criando projeto...");
  try{
   const r=await fetch(`/api/planning/${active.id}/create-project`,{method:"POST",headers:getClientAuthHeaders()});
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(j.error||"Não foi possível criar o projeto.");
   setStatus(j.data?.alreadyCreated?"Este planejamento já possui um projeto.":"Projeto criado e vinculado ao planejamento.");
   if (typeof j.data?.projectId === "string") {
     setActive(current=>current?{...current,project_id:j.data.projectId}:current);
   }
   await load();
  }catch(e){setStatus(e instanceof Error?e.message:"Falha ao concluir o planejamento.");}
  finally{setBusy(false);}
 }
 async function save(action:"draft"|"review"|"approved"|"rejected"|"won"|"lost"){
  if(title.trim().length<3){setStatus("Informe um título de pelo menos 3 caracteres.");return;}
  if(!active&&!projectId&&!["prospect","opportunity"].includes(kind)){setStatus("Selecione o projeto deste registro.");return;}
  setBusy(true);setStatus("Salvando...");
  try{
   const editing=Boolean(active);const r=await fetch("/api/planning",{method:editing?"PATCH":"POST",
    headers:getClientAuthHeaders({"Content-Type":"application/json"}),
    body:JSON.stringify(editing?
      {id:active!.id,version:active!.version,title,description,status:action,payload:{owner,nextAction,stage,prospectId,category:reqCategory,acceptance:reqAcceptance,source:reqSource,priority:reqPriority}}:
      {kind,projectId:projectId||null,title,description,sourceUrl,payload:{owner,nextAction,stage,prospectId,category:reqCategory,acceptance:reqAcceptance,source:reqSource,priority:reqPriority}})
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
   <div className="mt-3 flex flex-wrap gap-4"><Link className="text-sm underline" href="/planning/workflows">Fluxo de análise e checkpoints →</Link><Link className="text-sm underline" href="/planning/coverage">Matriz requisito × alternativa →</Link><Link className="text-sm underline" href="/planning/backlog">Backlog aprovado →</Link></div>
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
     {kind==="requirement"?<section className="rounded-lg border border-(--border) bg-(--bg-muted) p-3 space-y-2">
       <h3 className="text-sm font-semibold">Qualificação do requisito</h3>
       <div className="grid gap-2 sm:grid-cols-2">
         <label className="text-sm">Categoria<select className="workspace-select mt-1 w-full" value={reqCategory} onChange={e=>setReqCategory(e.target.value)}>
           {["funcional","nao_funcional","legal","operacional"].map(x=><option key={x} value={x}>{x}</option>)}
         </select></label>
         <label className="text-sm">Prioridade<select className="workspace-select mt-1 w-full" value={reqPriority} onChange={e=>setReqPriority(e.target.value)}>
           {["baixa","media","alta","critica"].map(x=><option key={x} value={x}>{x}</option>)}
         </select></label>
       </div>
       <label className="block text-sm">Critério de aceite<textarea className="workspace-input mt-1 w-full" rows={2} value={reqAcceptance} onChange={e=>setReqAcceptance(e.target.value)}/></label>
       <label className="block text-sm">Fonte / proveniência<input className="workspace-input mt-1 w-full" value={reqSource} onChange={e=>setReqSource(e.target.value)}/></label>
       <button type="button" disabled={!projectId||busy} onClick={()=>void reviewRequirements()} className="workspace-button-secondary px-3 py-2 text-xs">Revisar lacunas e redundâncias</button>
       {findings.length?<ul className="space-y-1">{findings.map((x,i)=><li key={i} className="text-xs">{x.severity==="warning"?"Atenção":"Pergunta"} · {x.detail}</li>)}</ul>:null}
     </section>:null}
     {kind==="research"?<section className="rounded-lg border border-(--border) bg-(--bg-muted) p-3 space-y-3">
      <h3 className="font-semibold text-sm">Pesquisa externa opcional</h3>
      <p className="text-xs text-(--text-secondary)">Apenas uma consulta pública digitada manualmente é enviada ao provedor. Não inclua requisitos internos, dados de clientes, pacientes ou informações pessoais.</p>
      <label className="block text-sm">Consulta pública
       <input className="workspace-input mt-1 w-full" value={publicQuery} onChange={e=>setPublicQuery(e.target.value)} placeholder="Ex.: sistemas de gestão clínica funcionalidades públicas"/>
      </label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={publicConfirmed} onChange={e=>setPublicConfirmed(e.target.checked)}/> Confirmo que a consulta é pública e não contém informações confidenciais.</label>
      <button type="button" className="workspace-button-secondary px-3 py-2 text-xs"
       disabled={!projectId||!publicConfirmed||searchBusy} onClick={()=>void searchExternal()}>
       {searchBusy?"Pesquisando...":"Pesquisar fontes externas"}</button>
      <div className="space-y-2">{searchResults.map(r=><article key={r.url} className="rounded-lg border border-(--border) bg-white p-3">
       <strong className="block text-sm">{r.title}</strong><p className="text-xs">{r.snippet}</p>
       <a className="text-xs underline" href={r.url} target="_blank" rel="noopener noreferrer">Abrir fonte para conferência</a>
       <button type="button" className="ml-3 text-xs underline" onClick={()=>{setTitle(r.title);setDescription(r.snippet);setSourceUrl(r.url);setStatus("Fonte inserida no formulário. Confira antes de criar o registro.");}}>Usar como rascunho</button>
      </article>)}</div>
     </section>:null}
     <label className="block text-sm">Projeto {kind==="prospect"||kind==="opportunity"?"(opcional)":"(obrigatório)"}
      <select className="workspace-select mt-1 w-full" value={active?.project_id||projectId} disabled={Boolean(active)} onChange={e=>setProjectId(e.target.value)}>
       <option value="">Sem projeto associado</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
     </label>
     {kind==="prospect"||kind==="opportunity"?<label className="block text-sm">Etapa comercial
      <select className="workspace-select mt-1 w-full" value={stage} onChange={e=>setStage(e.target.value)}>
       {["novo","qualificacao","diagnostico","proposta","negociacao","ganho","perdido"].map(v=><option key={v} value={v}>{v}</option>)}
      </select></label>:null}
     {kind==="opportunity"?<label className="block text-sm">Prospect vinculado
      <select className="workspace-select mt-1 w-full" value={prospectId} onChange={e=>setProspectId(e.target.value)}>
       <option value="">Sem vínculo</option>{prospects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
      </select></label>:null}
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
      {active&&kind==="opportunity"&&["approved","won"].includes(active.status)&&!active.project_id?<button disabled={busy} className="workspace-button-primary px-3 py-2" onClick={()=>void createProjectFromPlanning()}>Concluir planejamento e gerar projeto</button>:null}
      {active&&kind==="opportunity"&&active.project_id?<Link href="/projects" className="workspace-button-secondary px-3 py-2">Ver projeto vinculado</Link>:null}
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
