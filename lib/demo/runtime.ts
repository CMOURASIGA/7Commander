import seed from "@/fixtures/demo/production-parity-seed.json";
import { DEMO_ORG_KEY, DEMO_STORAGE_KEY } from "./config";

type Row = Record<string, unknown>;
type Store = Record<string, unknown> & { organizations: Row[]; users: Row[]; projects: Row[] };

declare global { interface Window { __COMMANDER_DEMO_INSTALLED__?: boolean } }

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Commander-Demo": "local" },
});

function load(): Store {
  const raw = localStorage.getItem(DEMO_STORAGE_KEY);
  if (raw) try {
    const current=JSON.parse(raw) as Store;
    const defaults=(seed as unknown as Store).organizations;
    let changed=false;
    current.organizations=current.organizations.map(organization=>{
      const fallback=defaults.find(item=>item.id===organization.id);
      const branding=organization.branding as Row|undefined;
      if(branding?.logoUrl||!fallback?.branding)return organization;
      changed=true;return {...organization,branding:copy(fallback.branding)};
    });
    if(changed)localStorage.setItem(DEMO_STORAGE_KEY,JSON.stringify(current));
    return current;
  } catch {}
  const initial = copy(seed) as unknown as Store;
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(initial));
  return initial;
}
function save(store: Store) { localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(store)); }
function rows(store: Store, key: string): Row[] {
  const value = store[key]; return Array.isArray(value) ? value as Row[] : [];
}
function activeOrg(store: Store) {
  const selected = localStorage.getItem(DEMO_ORG_KEY);
  const found = store.organizations.find(item => item.id === selected);
  const org = found ?? store.organizations[0];
  if (org?.id) localStorage.setItem(DEMO_ORG_KEY, String(org.id));
  return String(org?.id ?? "");
}
const bodyOf = async (init?: RequestInit) => {
  if (!init?.body || typeof init.body !== "string") return {} as Row;
  try { return JSON.parse(init.body) as Row; } catch { return {} as Row; }
};
const projectView = (p: Row) => ({ ...p, userId: "d0000000-0000-4000-8000-000000000001", createdAt: p.createdAt ?? now() });
const clientView = (c: Row) => ({ ...c, contactInfo: c.contact ?? "", createdAt: c.createdAt ?? now() });
const taskView = (t: Row): Row => ({ ...t, status: t.columnKey === "done" ? "concluida" : t.columnKey === "doing" ? "em_andamento" : "aberta" });

function demoReport(store: Store, org: string, projectId: string, audience: "client" | "internal") {
  const scoped = (key: string) => rows(store, key).filter(r => r.organization_id === org || !r.organization_id);
  const project = scoped("projects").find(p => p.id === projectId);
  const sprints = scoped("scrum_sprints").filter(s => s.project_id === projectId);
  const stories = scoped("scrum_user_stories").filter(s => s.project_id === projectId);
  const scrumTasks = scoped("scrum_backlog_items").filter(t => t.project_id === projectId && t.item_type === "task");
  const cards = scoped("tasks").filter(t => t.project_id === projectId).map(taskView);
  const risks = scoped("risks").filter(r => r.project_id === projectId);
  const decisions = scoped("decisions").filter(d => d.project_id === projectId);
  const today = new Date().toISOString().slice(0, 10);
  const sprintMetrics = sprints.map(sprint => {
    const assigned = stories.filter(story => story.sprint_id === sprint.id);
    const closed = assigned.filter(story => story.workflow_stage === "closed");
    const delivered = assigned.filter(story => Boolean(story.actual_end_date));
    const planned = assigned.filter(story => Boolean(story.due_date));
    return {
      id:String(sprint.id), name:String(sprint.name || "Sprint"), goal:String(sprint.goal || ""), status:String(sprint.status || "planned"),
      start_date:String(sprint.start_date || today), end_date:String(sprint.end_date || today), stories:assigned.length,
      closed:closed.length, resolved:assigned.filter(story => story.workflow_stage === "resolved").length,
      active:assigned.filter(story => story.workflow_stage === "active").length,
      blocked:assigned.filter(story => Boolean(story.blocked)).length,
      overdue:assigned.filter(story => story.workflow_stage !== "closed" && story.due_date && String(story.due_date) < today).length,
      points_planned:assigned.reduce((sum, story) => sum + Number(story.story_points || 0), 0),
      points_done:closed.reduce((sum, story) => sum + Number(story.story_points || 0), 0),
      delivery_planned:planned.length, delivery_actual:delivered.length,
      delivery_on_time:delivered.filter(story => story.due_date && String(story.actual_end_date) <= String(story.due_date)).length,
      delivery_late:delivered.filter(story => story.due_date && String(story.actual_end_date) > String(story.due_date)).length,
    };
  });
  const report = {
    project:{id:projectId,name:String(project?.name || "Projeto demonstrativo")}, generated_at:now(), scope:"current_snapshot" as const,
    publicFacts:[], publicFactsAvailable:true, riskAssessments:[],
    kanban:{total:cards.length,todo:cards.filter(t=>t.status==="aberta").length,doing:cards.filter(t=>t.status==="em_andamento").length,done:cards.filter(t=>t.status==="concluida").length,overdue:cards.filter(t=>t.dueDate&&String(t.dueDate)<today&&t.status!=="concluida").length,completed_titles:cards.filter(t=>t.status==="concluida").map(t=>String(t.title)).slice(0,12),...(audience==="internal"?{items:cards.map(t=>({id:String(t.id),title:String(t.title),status:String(t.status),dueDate:t.dueDate?String(t.dueDate):null}))}:{})},
    governance:{risks_open:risks.filter(r=>["aberto","em_mitigacao"].includes(String(r.status))).length,decisions_pending:decisions.filter(d=>["aberta","em_andamento"].includes(String(d.status))).length,client_risks:audience==="internal"?risks.map(r=>({title:String(r.title),status:String(r.status)})):[],client_decisions:audience==="internal"?decisions.map(d=>({title:String(d.title),status:String(d.status)})):[]},
    scrum:{enabled:sprintMetrics.length>0,sprints:audience==="internal"?sprintMetrics:[],backlog_stories:stories.filter(story=>!story.sprint_id).length,stories_total:stories.length,tasks_total:scrumTasks.length,tasks_done:scrumTasks.filter(task=>task.state==="done").length},
    ...(audience==="internal"?{internal:{stories:stories.map(story=>({id:String(story.id),sprint_id:story.sprint_id?String(story.sprint_id):null,title:String(story.title),description:String(story.description||""),workflow_stage:String(story.workflow_stage||"new"),story_points:story.story_points==null?null:Number(story.story_points),due_date:story.due_date?String(story.due_date):null,actual_end_date:story.actual_end_date?String(story.actual_end_date):null,blocked:Boolean(story.blocked),blocker_reason:String(story.blocker_reason||""),responsible:story.responsible?String(story.responsible):null})),tasks:scrumTasks.map(task=>({id:String(task.id),story_id:task.story_id?String(task.story_id):null,title:String(task.title),state:String(task.state||"todo"),responsible:task.responsible?String(task.responsible):null})),meetingLines:[],meetingSource:"local" as const}}:{})
  };
  return {report,project,sprints:sprintMetrics,stories,cards,risks,decisions};
}

async function handle(input: RequestInfo | URL, init?: RequestInit): Promise<Response | null> {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const url = new URL(raw, location.origin);
  if (url.origin !== location.origin || !url.pathname.startsWith("/api/")) return null;
  const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  const body = await bodyOf(init);
  const store = load(); const org = activeOrg(store);
  const scoped = (key: string) => rows(store, key).filter(r => r.organization_id === org || !r.organization_id);
  const projectId = url.searchParams.get("projectId") || String(body.projectId || "");
  const match = (pattern: RegExp) => url.pathname.match(pattern);

  if (url.pathname === "/api/auth/local-session" || url.pathname === "/api/auth/central-session") return json({ ok: true });
  if (url.pathname === "/api/auth/central-exchange") return json({ ok: true, tokenHash: "demo", localUserId: store.users[0]?.id });
  if (url.pathname === "/api/auth/profile") return json({ data: { displayName: "Pessoa Demonstração", email: "apresentacao@example.invalid", provider: "demo" } });
  if (url.pathname === "/api/auth/ui-capabilities") return json({ readOnly:false, canSwitchCompany:true, role:"owner", canManage:true, canEdit:true, demo:true });
  if (url.pathname === "/api/organizations/mine") return json({ data: store.organizations.map(o => ({ id:o.id, role:"owner", organization:o })) });
  if (url.pathname === "/api/organizations/select") {
    const target = String(body.organizationId || "");
    if (!store.organizations.some(o => o.id === target)) return json({ error:"Empresa inválida." }, 404);
    localStorage.setItem(DEMO_ORG_KEY, target);
    return json({ data:{ organizationId:target, role:"owner", operationalIsolationReady:true } });
  }
  if (url.pathname === "/api/organizations/branding") { const organization=store.organizations.find(o=>o.id===org); return json({ data:{ id:org, organizationId:org, name:organization?.name, branding:organization?.branding ?? {} } }); }

  if (url.pathname === "/api/clients") {
    if (method === "GET") return json({ data: scoped("clients").map(clientView) });
    const created = { id:id(), organization_id:org, name:String(body.name||"Novo cliente"), contact:String(body.contactInfo||body.contact||""), status:String(body.status||"ativo"), createdAt:now() };
    rows(store,"clients").unshift(created); save(store); return json({ data:clientView(created) },201);
  }
  const clientMatch = match(/^\/api\/clients\/([^/]+)$/);
  if (clientMatch) {
    const list=rows(store,"clients"), index=list.findIndex(r=>r.id===clientMatch[1]&&r.organization_id===org);
    if(index<0)return json({error:"Cliente não encontrado."},404);
    if(method==="DELETE"){list.splice(index,1);save(store);return json({data:{deleted:true}});}
    if(method==="PATCH"||method==="PUT"){list[index]={...list[index],...body,contact:body.contactInfo??body.contact??list[index].contact};save(store);return json({data:clientView(list[index])});}
    return json({data:clientView(list[index])});
  }

  if (url.pathname === "/api/projects" || url.pathname === "/api/projects/active") {
    if (method === "GET") return json({ data:scoped("projects").map(projectView) });
    const client=rows(store,"clients").find(c=>c.id===body.clientId);
    const created={id:id(),organization_id:org,clientId:body.clientId||null,clientName:client?.name||null,name:String(body.name||"Novo projeto"),description:String(body.description||""),objective:String(body.objective||""),context:String(body.context||""),stakeholders:String(body.stakeholders||""),maturity:String(body.maturity||""),tags:Array.isArray(body.tags)?body.tags:[],status:String(body.status||"ativo"),isActive:Boolean(body.isActive),createdAt:now()};
    rows(store,"projects").unshift(created);save(store);return json({data:projectView(created)},201);
  }
  const projectMatch=match(/^\/api\/projects\/([^/]+)$/);
  if(projectMatch){const list=rows(store,"projects"),i=list.findIndex(r=>r.id===projectMatch[1]&&r.organization_id===org);if(i<0)return json({error:"Projeto não encontrado."},404);if(method==="DELETE"){list.splice(i,1);save(store);return json({data:{deleted:true}});}if(method!=="GET"){list[i]={...list[i],...body,updatedAt:now()};save(store);}return json({data:projectView(list[i])});}

  const taskBoard=match(/^\/api\/projects\/([^/]+)\/tasks$/);
  if(taskBoard){const pid=taskBoard[1];if(method==="GET"){const tasks=scoped("tasks").filter(t=>t.project_id===pid).map(taskView);return json({data:{projectId:pid,columns:[{id:"todo",key:"todo",title:"A fazer",cards:tasks.filter(t=>t.columnKey==="todo")},{id:"doing",key:"doing",title:"Em andamento",cards:tasks.filter(t=>t.columnKey==="doing")},{id:"done",key:"done",title:"Concluído",cards:tasks.filter(t=>t.columnKey==="done")} ]}});}const created={id:id(),organization_id:org,project_id:pid,title:String(body.title||"Nova atividade"),description:String(body.description||""),columnKey:String(body.columnKey||"todo"),priority:String(body.priority||"media"),responsible:String(body.responsible||""),dueDate:body.dueDate||null,createdAt:now(),updatedAt:now()};rows(store,"tasks").unshift(created);save(store);return json({data:taskView(created)},201);}
  const taskMatch=match(/^\/api\/tasks\/([^/]+)(?:\/status|\/details)?$/);
  if(taskMatch){const list=rows(store,"tasks"),i=list.findIndex(t=>t.id===taskMatch[1]&&t.organization_id===org);if(i<0)return json({error:"Atividade não encontrada."},404);if(method==="DELETE"){list.splice(i,1);save(store);return json({data:{deleted:true}});}if(method!=="GET"){const status=String(body.status||"");list[i]={...list[i],...body,columnKey:body.columnKey||(status==="concluida"?"done":status==="em_andamento"?"doing":list[i].columnKey),updatedAt:now()};save(store);}return json({data:taskView(list[i])});}

  const riskProject=match(/^\/api\/projects\/([^/]+)\/risks$/);
  if(riskProject){const pid=riskProject[1];if(method==="GET")return json({data:scoped("risks").filter(r=>r.project_id===pid)});const created={id:id(),organization_id:org,project_id:pid,title:String(body.title||"Novo risco"),impact:String(body.impact||""),probability:String(body.probability||"media"),mitigation:String(body.mitigation||""),owner:String(body.owner||""),status:String(body.status||"aberto"),createdAt:now()};rows(store,"risks").unshift(created);save(store);return json({data:created},201);}
  const riskMatch=match(/^\/api\/risks\/([^/]+)$/); if(riskMatch){const list=rows(store,"risks"),i=list.findIndex(r=>r.id===riskMatch[1]&&r.organization_id===org);if(i<0)return json({error:"Risco não encontrado."},404);if(method==="DELETE"){list.splice(i,1);save(store);return json({data:{deleted:true}});}if(method!=="GET"){list[i]={...list[i],...body};save(store);}return json({data:list[i]});}

  if(url.pathname==="/api/decisions"){const filtered=scoped("decisions").filter(d=>!projectId||d.project_id===projectId);if(method==="GET")return json({data:filtered});const created={id:id(),organization_id:org,project_id:projectId,...body,createdAt:now()};rows(store,"decisions").unshift(created);save(store);return json({data:created},201);}
  const decisionMatch=match(/^\/api\/decisions\/([^/]+)(?:\/status|\/history)?$/);if(decisionMatch){const list=rows(store,"decisions"),i=list.findIndex(d=>d.id===decisionMatch[1]&&d.organization_id===org);if(i<0)return json({error:"Decisão não encontrada."},404);if(url.pathname.endsWith("/history"))return json({data:[]});if(method==="DELETE"){list.splice(i,1);save(store);return json({data:{deleted:true}});}if(method!=="GET"){list[i]={...list[i],...body};save(store);}return json({data:list[i]});}

  if(url.pathname==="/api/scrum"){if(!projectId)return json({data:scoped("projects").filter(p=>p.status==="ativo").map(p=>({id:p.id,name:p.name}))});const list=rows(store,"scrum_sprints");if(method==="GET")return json({data:{sprints:list.filter(s=>s.organization_id===org&&s.project_id===projectId)}});const action=String(body.action||"");if(action==="create_sprint"){const created={id:id(),organization_id:org,project_id:projectId,name:body.name,goal:body.goal||"",status:"planned",start_date:body.startDate,end_date:body.endDate,created_at:now()};list.unshift(created);save(store);return json({data:created},201);}const i=list.findIndex(s=>s.id===body.sprintId&&s.organization_id===org);if(i>=0){list[i]={...list[i],name:body.name??list[i].name,goal:body.goal??list[i].goal,status:body.status??list[i].status,start_date:body.startDate??list[i].start_date,end_date:body.endDate??list[i].end_date};save(store);return json({data:list[i]});}return json({error:"Sprint não encontrada."},404);}
  if(url.pathname==="/api/scrum/stories"){const list=rows(store,"scrum_user_stories");if(method==="GET")return json({data:{stories:list.filter(s=>s.organization_id===org&&(!projectId||s.project_id===projectId)),comments:[]}});if(body.action==="delete"){const i=list.findIndex(s=>s.id===body.storyId);if(i>=0)list.splice(i,1);save(store);return json({data:{deleted:i>=0}});}const target=String(body.storyId||body.id||"");const i=list.findIndex(s=>s.id===target);if(i>=0){list[i]={...list[i],...body,workflow_stage:body.workflowStage??body.status??list[i].workflow_stage};save(store);return json({data:list[i]});}const created={id:id(),organization_id:org,project_id:projectId,...body,title:String(body.title||"Nova User Story"),workflow_stage:String(body.workflowStage||"new"),created_at:now()};list.unshift(created);save(store);return json({data:created},201);}
  if(url.pathname==="/api/scrum/backlog-items"){const list=scoped("scrum_backlog_items").filter(r=>!projectId||r.project_id===projectId);return json({data:list});}
  if(url.pathname==="/api/scrum/project-members"||url.pathname==="/api/team/assignees")return json({data:scoped("organization_members").map(m=>{const u=store.users.find(x=>x.id===m.user_id);return{id:u?.id,email:u?.email,name:u?.name,role:m.role};})});
  if(url.pathname==="/api/scrum/notifications")return json({data:scoped("notifications")});
  if(url.pathname==="/api/scrum/kairos-insights")return json({data:{simulated:true,summary:"Análise simulada com base na massa local da demonstração.",recommendations:["Revisar itens atrasados","Tratar riscos de alta probabilidade"]}});

  const meetings=match(/^\/api\/projects\/([^/]+)\/meetings(?:\/links|\/draft)?$/);if(meetings){const pid=meetings[1];if(url.pathname.endsWith("/draft"))return json({data:{simulated:true,title:"Reunião de acompanhamento",summary:"Rascunho simulado a partir dos dados locais."}});if(url.pathname.endsWith("/links"))return json({data:scoped("project_meeting_links").filter(r=>r.project_id===pid)});if(method==="GET")return json({data:scoped("project_meetings").filter(r=>r.project_id===pid).map(m=>({...m,links:scoped("project_meeting_links").filter(l=>l.meeting_id===m.id)}))});const created={id:id(),organization_id:org,project_id:pid,...body,created_at:now()};rows(store,"project_meetings").unshift(created);save(store);return json({data:created},201);}
  if(url.pathname==="/api/knowledge"){const list=scoped("knowledge").filter(k=>!projectId||k.project_id===projectId);return json({data:list});}
  if(url.pathname==="/api/daily")return json({data:{projects:scoped("projects"),tasks:scoped("tasks").map(taskView),risks:scoped("risks"),generatedAt:now()}});
  if(url.pathname==="/api/admin/users")return json({data:scoped("organization_members").map(m=>({...m,user:store.users.find(u=>u.id===m.user_id)}))});
  if(url.pathname==="/api/platform/companies")return json({data:store.organizations});
  if(url.pathname==="/api/platform/companies/members")return json({data:scoped("organization_members")});
  if(url.pathname==="/api/status-report/history")return json({data:[]});
  if(url.pathname==="/api/status-report/logo"){
    const organization=store.organizations.find(item=>item.id===org);
    const branding=(organization?.branding||{}) as Row;
    const logoUrl=typeof branding.logoUrl==="string"?branding.logoUrl:"";
    const companyName=String(branding.displayName||organization?.name||"Empresa demonstrativa");
    if(!logoUrl.startsWith("data:image/png;base64,"))return json({error:"Empresa demonstrativa sem logo configurada."},404);
    return json({companyName,dataUri:logoUrl,simulated:true});
  }
  if(url.pathname==="/api/status-report/scrum"){
    const audience=url.searchParams.get("audience")==="client"?"client":"internal";
    return json({data:demoReport(store,org,projectId,audience).report,simulated:true});
  }
  if(url.pathname==="/api/status-report/client-candidates"){
    const data=demoReport(store,org,projectId,"internal");
    const classify=(value:unknown)=>["closed","done","concluida","resolved"].includes(String(value))?"confirmed":["active","doing","em_andamento"].includes(String(value))?"in_progress":"hypothesis";
    const candidates:Row[]=[];
    if(data.project?.objective)candidates.push({id:"project:"+projectId,kind:"objective",title:String(data.project.objective),description:"Objetivo cadastrado no projeto demonstrativo.",classification:"in_progress",due_date:null,source_reference:"project:"+projectId});
    for(const card of data.cards)candidates.push({id:"task:"+card.id,kind:"deliverable",title:String(card.title),description:"Atividade do Kanban do Projeto.",classification:classify(card.status),due_date:card.dueDate||null,source_reference:"task:"+card.id});
    for(const sprint of data.sprints)candidates.push({id:"sprint:"+sprint.id,kind:"milestone",title:sprint.name,description:`Sprint · ${sprint.status} · ${sprint.start_date} a ${sprint.end_date}`,classification:classify(sprint.status),due_date:sprint.end_date,source_reference:"sprint:"+sprint.id});
    for(const risk of data.risks)candidates.push({id:"risk:"+risk.id,kind:"risk",title:String(risk.title),description:"Ponto de atenção cadastrado no projeto demonstrativo.",classification:classify(risk.status),due_date:null,source_reference:"risk:"+risk.id});
    for(const decision of data.decisions)candidates.push({id:"decision:"+decision.id,kind:"next_step",title:String(decision.title),description:"Decisão registrada no projeto demonstrativo.",classification:classify(decision.status),due_date:null,source_reference:"decision:"+decision.id});
    return json({data:candidates,simulated:true});
  }
  if(url.pathname==="/api/status-report/analysis")return json({data:{analysis:null,periodEvents:null,periodMetrics:null,source:"rules"},warning:"Análise simulada localmente com os dados fictícios da demonstração.",simulated:true});
  if(url.pathname.startsWith("/api/status-report/"))return json({data:null,simulated:true});
  if(url.pathname.startsWith("/api/integrations/"))return json({data:[],simulated:true,message:"Integração simulada no ambiente demonstrativo."});
  if(url.pathname==="/api/local-diagnostics"||url.pathname.startsWith("/api/health/"))return json({ok:true,mode:"demo-localstorage",productionIsolated:true});
  if(url.pathname==="/api/chat"||url.pathname==="/api/voice")return json({data:{message:"Resposta simulada pelo Kairos Demo com base nos dados locais.",simulated:true}});
  return json({data:[],simulated:true,message:"Recurso executado localmente no ambiente demonstrativo."});
}

export function installDemoRuntime() {
  if (typeof window === "undefined" || window.__COMMANDER_DEMO_INSTALLED__) return;
  window.__COMMANDER_DEMO_INSTALLED__ = true;
  load();
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => (await handle(input, init)) ?? nativeFetch(input, init);
  window.addEventListener("commander-demo-reset", () => { localStorage.removeItem(DEMO_STORAGE_KEY); localStorage.removeItem(DEMO_ORG_KEY); load(); location.assign("/"); });
}

