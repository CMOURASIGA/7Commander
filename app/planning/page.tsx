"use client";
import {IconActionButton} from "@/components/ui/icon-action-button";
import {useCallback,useEffect,useState} from "react";
import {PageIntro} from "@/components/ui/workspace-primitives";
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
 const[loadError,setLoadError]=useState<string|null>(null);
 const[editorOpen,setEditorOpen]=useState(false);
 const[history,setHistory]=useState<Array<{version:number;action:string;created_at:string;actor_id:string}>>([]);
 const[publicQuery,setPublicQuery]=useState(""),[publicConfirmed,setPublicConfirmed]=useState(false);
 const[reqCategory,setReqCategory]=useState("funcional"),[reqAcceptance,setReqAcceptance]=useState(""),[reqSource,setReqSource]=useState(""),[reqPriority,setReqPriority]=useState("media");
 const[findings,setFindings]=useState<Array<{recordId:string;severity:string;detail:string}>>([]);
 const[searchResults,setSearchResults]=useState<Array<{title:string;url:string;snippet:string;consultedAt:string}>>([]);
 const[searchBusy,setSearchBusy]=useState(false);
 const[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[page,setPage]=useState(1),[total,setTotal]=useState(0);
 const load=useCallback(async()=>{setLoading(true);setLoadError(null);try{
  const query=new URLSearchParams({kind,page:String(page)});if(projectId&&kind!=="prospect"&&kind!=="opportunity")query.set("projectId",projectId);
  const r=await fetch("/api/planning?"+query,{headers:getClientAuthHeaders(),cache:"no-store"});const json=await r.json();
  if(!r.ok)throw Error(json.error||"Falha na consulta");
  setItems(json.data||[]);setTotal(json.meta?.total||0);
 }catch(e){setLoadError(e instanceof Error?e.message:"Falha ao carregar");setItems([]);setTotal(0);}finally{setLoading(false)}},[kind,page,projectId]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{let live=true;async function loadProspects(){try{const r=await fetch("/api/planning?kind=prospect",{headers:getClientAuthHeaders(),cache:"no-store"});if(!r.ok)return;const j=await r.json();if(live)setProspects((j.data||[]).map((p:{id:string;title:string})=>({id:p.id,title:p.title})));}catch{}}if(kind==="opportunity")void loadProspects();return()=>{live=false}},[kind]);
 useEffect(()=>{let mounted=true;async function fetchProjects(){try{
  const r=await fetch("/api/projects",{headers:getClientAuthHeaders(),cache:"no-store"});const j=await r.json();
  if(mounted&&r.ok)setProjects((j.data??[]).map((p:{id:string;name:string})=>({id:p.id,name:p.name})));
 }catch{}}void fetchProjects();return()=>{mounted=false}},[]);
 function reset(){setHistory([]);setActive(null);setTitle("");setDescription("");setSourceUrl("");setOwner("");setNextAction("");setStage("novo");setProspectId("");setReqCategory("funcional");setReqAcceptance("");setReqSource("");setReqPriority("media");}
 function edit(item:RecordItem){setEditorOpen(true);setHistory([]);setActive(item);setTitle(item.title);setDescription(item.description);setSourceUrl(item.source_url||"");setOwner(String(item.payload.owner||""));setNextAction(String(item.payload.nextAction||""));setStage(String(item.payload.stage||"novo"));setProspectId(String(item.payload.prospectId||""));setReqCategory(String(item.payload.category||"funcional"));setReqAcceptance(String(item.payload.acceptance||""));setReqSource(String(item.payload.source||""));setReqPriority(String(item.payload.priority||"media"));setStatus(null);}
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
   reset();setEditorOpen(false);await load();
  }catch(e){setStatus(e instanceof Error?e.message:"Falha na conversão");}finally{setBusy(false);}
 }
 async function showHistory(){
  if(!active)return;
  setBusy(true);setStatus("");
  try{
   const r=await fetch(`/api/planning/${active.id}/history`,{headers:getClientAuthHeaders(),cache:"no-store"});
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(j.error||"Falha ao consultar o histórico.");
   setHistory(j.data||[]);
  }catch(e){setStatus(e instanceof Error?e.message:"Falha no histórico.");}
  finally{setBusy(false);}
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
 const changeKind=(next:Kind)=>{
  setKind(next);setPage(1);reset();setStatus(null);setLoadError(null);
  const url=new URL(window.location.href);url.searchParams.set("tab",next);
  window.history.pushState({planningTab:next},"",url.toString());
 };
 useEffect(()=>{
  const syncTab=()=>{
   const requested=new URL(window.location.href).searchParams.get("tab");
   const next=kinds.find(item=>item.value===requested)?.value??"prospect";
   setKind(next);setPage(1);setEditorOpen(false);
  };
  syncTab();window.addEventListener("popstate",syncTab);
  return()=>window.removeEventListener("popstate",syncTab);
 },[]);
 return <div className="w-full min-w-0 max-w-[1600px] space-y-4 px-3 py-4 md:px-6 md:py-6 2xl:mx-auto">
  <PageIntro eyebrow="Planejamento / Empresa ativa" title="Planejamento e oportunidades"
   description="Gerencie prospects, oportunidades, requisitos e evidências. Revisões e aprovações permanecem sob controle humano." />
  <nav className="workspace-card flex min-w-0 gap-2 overflow-x-auto p-3" role="tablist" aria-label="Módulos de planejamento">
   {kinds.map(k=><button key={k.value} type="button" role="tab"
    aria-selected={kind===k.value} aria-controls="planning-active-panel"
    onClick={()=>changeKind(k.value)}
    className={kind===k.value
      ?"shrink-0 whitespace-nowrap border-b-2 border-(--accent) px-3 py-2 text-xs font-semibold text-(--accent)"
      :"shrink-0 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-xs font-medium text-(--text-secondary) hover:text-(--accent)"}>{k.label}</button>)}
  </nav>
  <nav className="flex flex-wrap gap-2 text-xs" aria-label="Etapas do planejamento">
   <Link className="workspace-button-secondary px-3 py-2 text-xs" href="/planning/workflows">Fluxo de análise e checkpoints</Link>
   <Link className="workspace-button-secondary px-3 py-2 text-xs" href="/planning/coverage">Matriz requisito × alternativa</Link>
   <Link className="workspace-button-secondary px-3 py-2 text-xs" href="/planning/backlog">Backlog aprovado</Link>
  </nav>
  {loadError?<div role="alert" aria-live="assertive" className="rounded-xl border border-(--danger) bg-(--danger-soft) px-4 py-3 text-sm text-(--danger)">
   <strong className="block">Atenção: consulta indisponível</strong>
   <p className="mt-1">{loadError}</p>
   <p className="mt-1 text-xs">Os registros não puderam ser consultados. Isso não significa que a base esteja vazia. Verifique a migração indicada e tente novamente.</p>
  </div>:null}
  {status&&!editorOpen?<p role="status" aria-live="polite"
   className={/falha|erro|indispon[ií]vel|n[aã]o foi poss[ií]vel|aten[cç][aã]o|selecione|informe/i.test(status)
     ?"rounded-xl border border-(--danger) bg-(--danger-soft) p-3 text-sm font-medium text-(--danger)"
     :"workspace-card border-l-4 border-(--accent) p-3 text-sm"}>{status}</p>:null}
  <section className="workspace-card overflow-hidden p-0" aria-label="Resumo operacional de planejamento">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-(--border) p-4 md:p-5">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">Carteira de planejamento</p>
        <h2 className="text-xl font-semibold text-(--text-primary)">{info.label}</h2>
        <p className="max-w-3xl text-sm text-(--text-secondary)">{info.help}</p>
      </div>
      <button className="workspace-button-primary shrink-0 px-4 py-2 text-sm font-semibold" type="button"
        onClick={()=>{reset();setEditorOpen(true)}}>+ {kind==="prospect"?"Novo prospect":"Novo registro"}</button>
    </div>
    <div className="grid grid-cols-1 divide-y divide-(--border) sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div className="p-4">
        <p className="text-xs font-semibold text-(--text-secondary)">Registros na categoria</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{loadError?"Indisponível":loading?"...":total}</p>
        <p className="mt-1 text-xs text-(--text-secondary)">Fonte: registros do planejamento</p>
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold text-(--text-secondary)">Página atual</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{loadError?"-":page}</p>
        <p className="mt-1 text-xs text-(--text-secondary)">Até 25 registros por página</p>
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold text-(--text-secondary)">Registros em exibição</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{loadError?"Indisponível":loading?"...":items.length}</p>
        <p className="mt-1 text-xs text-(--text-secondary)">Não inclui páginas não carregadas</p>
      </div>
    </div>
  </section>
  <div id="planning-active-panel" role="tabpanel" className="min-w-0 space-y-4">
   {editorOpen?<div className="fixed inset-0 z-50">
     <button type="button" aria-label="Fechar editor" className="absolute inset-0 bg-black/35" onClick={()=>setEditorOpen(false)}/>
     <aside role="dialog" aria-modal="true" aria-label={active?"Editar registro":"Adicionar registro"} className="relative ml-auto h-dvh w-full max-w-2xl overflow-y-auto bg-(--bg-surface) p-4 shadow-2xl">
       <div className="mb-3 flex justify-end"><button type="button" className="workspace-button-secondary px-3 py-2 text-xs" onClick={()=>setEditorOpen(false)}>Fechar</button></div>
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
       {findings.length?<ul className="space-y-1">{findings.map((x,i)=><li key={i} className={x.severity==="warning"?"text-xs font-semibold text-(--danger)":"text-xs text-(--text-secondary)"}>{x.severity==="warning"?"Atenção":"Pergunta"} · {x.detail}</li>)}</ul>:null}
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
      <button disabled={busy} className="workspace-button-danger px-3 py-2" onClick={()=>void save("rejected")}>Rejeitar</button>
      {(kind==="opportunity"||kind==="prospect")?<button disabled={busy} className="workspace-button-secondary px-3 py-2" onClick={()=>void save("won")}>Marcar ganho</button>:null}</>:null}
      {active&&kind==="opportunity"&&["approved","won"].includes(active.status)&&!active.project_id?<button disabled={busy} className="workspace-button-primary px-3 py-2" onClick={()=>void createProjectFromPlanning()}>Concluir planejamento e gerar projeto</button>:null}
      {active&&kind==="opportunity"&&active.project_id?<><Link href="/projects" className="workspace-button-secondary px-3 py-2">Ver projeto vinculado</Link><Link href={`/planning/backlog?projectId=${encodeURIComponent(active.project_id)}`} className="workspace-button-secondary px-3 py-2">Preparar Kanban deste projeto</Link></>:null}
      {active&&kind==="prospect"&&active.status==="won"?<button disabled={busy} className="workspace-button-primary px-3 py-2" onClick={()=>void convertProspect()}>Converter em cliente</button>:null}
      {active?<button type="button" className="workspace-button-secondary px-3 py-2" disabled={busy} onClick={()=>void showHistory()}>Ver histórico e aprovações</button>:null}
      {active?<button className="workspace-button-secondary px-3 py-2" disabled={busy} onClick={()=>{reset();setEditorOpen(false)}}>Cancelar edição</button>:null}
     </div>
     {history.length>0?<div className="rounded-lg border border-(--border) p-3"><h3 className="font-semibold">Histórico de alterações e aprovações</h3><ul className="mt-2 space-y-1 text-sm">{history.map((h,i)=><li key={h.version+"-"+i}>Versão {h.version} · {h.action} · {new Date(h.created_at).toLocaleString("pt-BR")}</li>)}</ul></div>:null}
     {status?<p role="status" aria-live="polite" className={/falha|erro|indispon[ií]vel|n[aã]o foi poss[ií]vel|aten[cç][aã]o|selecione|informe/i.test(status)?"rounded-lg border border-(--danger) bg-(--danger-soft) p-3 text-sm font-medium text-(--danger)":"rounded-lg border border-(--border) p-3 text-sm"}>{status}</p>:null}
    </div>
   </section>
     </aside>
   </div>:null}
   <section className="workspace-card min-w-0 p-4 md:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-(--border) pb-4"><div><h2 className="text-base font-semibold">Registros de {info.label}</h2><p className="mt-1 text-sm text-(--text-secondary)">Acompanhe a situação, o responsável e a próxima ação sem perder o contexto.</p></div>
     <button onClick={()=>void load()} className="workspace-button-secondary px-4 py-2 text-sm" disabled={loading}>{loading?"Atualizando...":"Atualizar lista"}</button></div>
    <p className="mb-3 text-xs text-(--text-secondary)">{loadError?"Consulta indisponível":`${total} registro(s), página ${page} · 25 itens por página`}</p>
    <div className="grid gap-3 xl:grid-cols-2">{items.map(item=><article key={item.id}
      className="flex min-w-0 flex-col justify-between gap-3 rounded-xl border border-(--border) bg-(--bg-surface) p-4 transition-colors hover:border-(--accent)">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 break-words text-base font-semibold text-(--text-primary)">{item.title}</h3>
          <span className="rounded-full border border-(--border) bg-(--bg-muted) px-2.5 py-1 text-xs font-semibold text-(--text-primary)">{item.status}</span>
        </div>
        <p className="line-clamp-3 text-sm leading-6 text-(--text-secondary)">{item.description||"Descrição não informada"}</p>
        {item.payload.nextAction?<p className="rounded-lg bg-(--bg-muted) p-3 text-sm"><strong className="font-semibold">Próxima ação:</strong> {String(item.payload.nextAction)}</p>:null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--border) pt-3">
        <div className="space-y-1 text-xs text-(--text-secondary)">
          <p>Responsável: {item.payload.owner?String(item.payload.owner):"Não informado"}</p>
          <p>Atualizado: {new Date(item.updated_at).toLocaleDateString("pt-BR")} · Versão {item.version}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-(--text-secondary)">Abrir e editar</span>
          <IconActionButton icon="pencil" tone="edit" label={"Abrir registro "+item.title} onClick={()=>edit(item)}/>
        </div>
      </div>
    </article>)}{!loading&&!loadError&&!items.length?<div className="col-span-full rounded-xl border border-dashed border-(--border) bg-(--bg-muted) p-6">
      <p className="font-semibold">Nenhum registro nesta categoria</p>
      <p className="mt-1 text-sm text-(--text-secondary)">Você pode criar o primeiro registro pelo botão Novo, no resumo acima.</p>
    </div>:null}</div>
    <div className="mt-4 flex gap-2">
     <button type="button" disabled={page===1} onClick={()=>setPage(p=>p-1)} className="workspace-button-secondary px-3 py-2 text-xs disabled:opacity-40">Anterior</button>
     <button type="button" disabled={page*25>=total} onClick={()=>setPage(p=>p+1)} className="workspace-button-secondary px-3 py-2 text-xs disabled:opacity-40">Próxima</button>
    </div>
   </section>
  </div>
 </div>;
}
