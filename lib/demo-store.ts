"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

const STORAGE_KEY = "7commander-demo-v1";
const USER_ID = "demo-user-7commander";
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

type DemoState = Record<string, any>;

const seed: DemoState = {
  activeProjectId: "project-crm",
  clients: [
    { id: "client-taven", userId: USER_ID, name: "Taven Educação", description: "Grupo educacional em expansão", contact: "diretoria@taven.demo", status: "ativo", createdAt: "2026-06-02T12:00:00Z", updatedAt: now() },
    { id: "client-alvorada", userId: USER_ID, name: "Grupo Alvorada", description: "Cliente de consultoria e processos", contact: "projetos@alvorada.demo", status: "ativo", createdAt: "2026-05-14T12:00:00Z", updatedAt: now() },
  ],
  projects: [
    { id: "project-crm", userId: USER_ID, clientId: "client-taven", clientName: "Taven Educação", name: "Implantação CRM Taven", description: "Implantação de seis ambientes CRM", tags: ["CRM", "SaaS", "Prioridade"], context: "Padronizar o atendimento e integrar a visão comercial das unidades.", objective: "Entregar os seis ambientes até dezembro com operação assistida.", stakeholders: "Diretoria, Comercial, Atendimento e Consult Services", maturity: "Execução", status: "ativo", isActive: true, createdAt: "2026-06-10T12:00:00Z" },
    { id: "project-data", userId: USER_ID, clientId: "client-alvorada", clientName: "Grupo Alvorada", name: "Integração de Dados Educacionais", description: "Consolidação de dados acadêmicos e financeiros", tags: ["Dados", "Integração"], context: "Fontes distribuídas entre unidades.", objective: "Criar visão única dos indicadores.", stakeholders: "TI, Financeiro e Acadêmico", maturity: "Planejamento", status: "ativo", isActive: false, createdAt: "2026-07-01T12:00:00Z" },
  ],
  boards: {
    "project-crm": { id: "board-crm", projectId: "project-crm", name: "Implantação CRM", columns: [
      { id: "col-crm-todo", key: "todo", title: "TO DO", position: 0, cards: [
        { id: "task-training", title: "Preparar treinamento dos usuários", description: "Criar roteiro e material por perfil.", priority: "alta", status: "aberta", responsible: "Mariana Costa", dueDate: "2026-08-20", position: 0, columnId: "col-crm-todo", columnKey: "todo", labels: [{id:"label-training",name:"Treinamento",color:"#7c3aed"}], createdAt: now(), updatedAt: now() },
        { id: "task-import", title: "Validar importação de clientes", description: "Conferir amostra e campos obrigatórios.", priority: "media", status: "aberta", responsible: "Lucas Almeida", dueDate: "2026-08-18", position: 1, columnId: "col-crm-todo", columnKey: "todo", labels: [{id:"label-data",name:"Dados",color:"#0284c7"}], createdAt: now(), updatedAt: now() }
      ]},
      { id: "col-crm-doing", key: "doing", title: "DOING", position: 1, cards: [
        { id: "task-workflow", title: "Configurar funil comercial", description: "Ajustar etapas e regras de passagem.", priority: "critica", status: "em_andamento", responsible: "Christian Moura", dueDate: "2026-08-15", position: 0, columnId: "col-crm-doing", columnKey: "doing", labels: [{id:"label-priority",name:"Prioridade",color:"#dc2626"}], createdAt: now(), updatedAt: now() }
      ]},
      { id: "col-crm-done", key: "done", title: "DONE", position: 2, cards: [
        { id: "task-kickoff", title: "Realizar kickoff executivo", description: "Escopo e governança aprovados.", priority: "alta", status: "concluida", responsible: "Christian Moura", dueDate: "2026-08-05", position: 0, columnId: "col-crm-done", columnKey: "done", labels: [], createdAt: now(), updatedAt: now() }
      ]}
    ]},
    "project-data": { id: "board-data", projectId: "project-data", name: "Integração de Dados", columns: [
      { id: "col-data-todo", key: "todo", title: "TO DO", position: 0, cards: [{ id: "task-mapping", title: "Mapear fontes de dados", description: "Inventariar sistemas e responsáveis.", priority: "alta", status: "aberta", responsible: "Ana Souza", dueDate: "2026-08-25", position: 0, columnId: "col-data-todo", columnKey: "todo", labels: [], createdAt: now(), updatedAt: now() }] },
      { id: "col-data-doing", key: "doing", title: "DOING", position: 1, cards: [] },
      { id: "col-data-done", key: "done", title: "DONE", position: 2, cards: [] }
    ]}
  },
  taskDetails: {},
  dailySelected: ["task-workflow", "task-training"],
  decisions: [
    { id: "decision-1", userId: USER_ID, title: "Implantar em ondas de duas unidades", context: "Prazo até dezembro", reason: "Reduzir risco e incorporar aprendizados", impact: "Entrega progressiva e suporte focado", status: "em_andamento", projectId: "project-crm", conversationId: null, artifactId: null, createdAt: "2026-08-04T14:00:00Z" }
  ],
  decisionHistory: {},
  risks: [{ id: "risk-1", userId: USER_ID, projectId: "project-crm", title: "Atraso na entrega dos dados", impact: "Compromete a primeira onda", probability: "media", mitigation: "Checkpoint semanal e carga por amostra", owner: "Lucas Almeida", status: "em_mitigacao", decisionId: null, taskId: "task-import", createdAt: now(), updatedAt: now() }],
  knowledge: [{ id: "knowledge-1", userId: USER_ID, projectId: "project-crm", title: "Ata do kickoff", content: "Escopo, responsáveis, marcos e critérios de aceite aprovados.", category: "Ata", source: "Demonstração", createdAt: "2026-08-05T14:00:00Z" }],
  members: { "project-crm": [{ id: "member-1", projectId: "project-crm", memberEmail: "mariana@consult.demo", role: "editor", createdAt: now() }, { id: "member-2", projectId: "project-crm", memberEmail: "lucas@consult.demo", role: "viewer", createdAt: now() }], "project-data": [] },
  memories: [{ id: "memory-1", userId: USER_ID, content: "A diretoria prefere acompanhamento executivo às sextas-feiras.", priority: "P1", type: "context", usefulness: "useful", createdAt: now(), updatedAt: now() }, { id: "memory-2", userId: USER_ID, content: "A primeira onda contempla duas unidades piloto.", priority: "P0", type: "fixed", usefulness: null, createdAt: now(), updatedAt: now() }],
  conversations: [{ id: "conversation-demo", title: "Planejamento da implantação", projectId: "project-crm", createdAt: now(), updatedAt: now() }],
  messages: { "conversation-demo": [{ id: "message-1", conversationId: "conversation-demo", role: "assistant", content: "Olá, Christian. Posso apoiar a análise dos riscos, atividades e próximos passos deste projeto de demonstração.", createdAt: now() }] },
  kairosProfile: { assistantName: "Kairos", communicationStyle: "objetivo", responseDepth: "equilibrado", focusAreas: ["Projetos", "Riscos", "Decisões"] },
};

function load(): DemoState {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || structuredClone(seed); } catch { return structuredClone(seed); }
}
function save(state: DemoState) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
async function body(init?: RequestInit) { try { return init?.body ? JSON.parse(String(init.body)) : {}; } catch { return {}; } }
function findCard(s: DemoState, taskId: string) { for (const board of Object.values(s.boards) as any[]) for (const column of board.columns) { const card = column.cards.find((x: any) => x.id === taskId); if (card) return { board, column, card }; } return null; }
function detail(s: DemoState, taskId: string) { const found = findCard(s, taskId); if (!found) return null; const stored = s.taskDetails[taskId] || {}; return { card: found.card, accessRole: "owner", dailySelected: s.dailySelected.includes(taskId), labels: found.card.labels || [], members: stored.members || [], checklists: stored.checklists || [], comments: stored.comments || [], attachments: stored.attachments || [], activity: stored.activity || [] }; }

export function resetDemoData() { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }

export async function handleDemoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response | null> {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const url = new URL(raw, window.location.origin);
  if (!url.pathname.startsWith("/api/")) return null;
  const method = (init?.method || (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET")).toUpperCase();
  const s = load(); const p = url.pathname; const payload = await body(init);

  if (p === "/api/auth/profile") return json({ data: { id: USER_ID, email: "demo@7commander.com.br", name: "Usuário Demonstração" } });
  if (p === "/api/projects" && method === "GET") return json({ data: s.projects, meta: { activeProjectId: s.activeProjectId } });
  if (p === "/api/projects" && method === "POST") { const client = s.clients.find((x:any)=>x.id===payload.clientId); const item = { id:id("project"), userId:USER_ID, clientId:payload.clientId||null, clientName:client?.name||null, name:payload.name, description:payload.description||"", tags:payload.tags||[], context:payload.context||"", objective:payload.objective||"", stakeholders:payload.stakeholders||"", maturity:payload.maturity||"", status:payload.status||"ativo", isActive:false, createdAt:now() }; s.projects.push(item); s.boards[item.id]={id:id("board"),projectId:item.id,name:item.name,columns:["todo","doing","done"].map((key,i)=>({id:`col-${item.id}-${key}`,key,title:key==="todo"?"TO DO":key==="doing"?"DOING":"DONE",position:i,cards:[]}))}; save(s); return json({data:item},201); }
  if (p === "/api/projects/active" && method === "GET") return json({ data: s.projects.find((x:any)=>x.id===s.activeProjectId)||null });
  if (p === "/api/projects/active" && method === "PATCH") { s.activeProjectId=payload.projectId; s.projects.forEach((x:any)=>x.isActive=x.id===payload.projectId); save(s); return json({data:s.projects.find((x:any)=>x.id===payload.projectId)}); }
  let m=p.match(/^\/api\/projects\/([^/]+)$/); if(m && method==="PATCH"){const x=s.projects.find((v:any)=>v.id===m![1]); Object.assign(x,payload,{updatedAt:now()}); save(s); return json({data:x});}
  m=p.match(/^\/api\/projects\/([^/]+)\/tasks$/); if(m){const projectId=m[1], board=s.boards[projectId]; if(method==="GET") return json({data:board,meta:{accessRole:"owner"}}); const col=board.columns.find((x:any)=>x.key===(payload.columnKey||"todo")); const card={id:id("task"),title:payload.title,description:payload.description||"",priority:payload.priority||"media",status:col.key==="done"?"concluida":col.key==="doing"?"em_andamento":"aberta",responsible:null,dueDate:payload.dueDate||null,position:col.cards.length,columnId:col.id,columnKey:col.key,labels:[],createdAt:now(),updatedAt:now()}; col.cards.push(card); save(s); return json({data:card},201);}
  m=p.match(/^\/api\/tasks\/([^/]+)$/); if(m&&method==="PATCH"){const f=findCard(s,m[1]); if(!f)return json({error:"Atividade não encontrada."},404); if(payload.columnId&&payload.columnId!==f.column.id){f.column.cards=f.column.cards.filter((x:any)=>x.id!==f.card.id); const target=f.board.columns.find((x:any)=>x.id===payload.columnId); Object.assign(f.card,{columnId:target.id,columnKey:target.key,status:target.key==="done"?"concluida":target.key==="doing"?"em_andamento":"aberta"}); target.cards.push(f.card);} Object.assign(f.card,payload,{updatedAt:now()}); save(s); return json({data:f.card});}
  m=p.match(/^\/api\/tasks\/([^/]+)\/details$/); if(m){const taskId=m[1]; if(method==="GET")return json({data:detail(s,taskId)}); const d=s.taskDetails[taskId] ||= {members:[],checklists:[],comments:[],attachments:[],activity:[]}; const f=findCard(s,taskId); const a=payload.action; if(a==="update_core")Object.assign(f?.card,{title:payload.title,description:payload.description,priority:payload.priority,dueDate:payload.dueDate,responsible:payload.responsible,updatedAt:now()}); if(a==="set_daily_selection")s.dailySelected=payload.selected?[...new Set([...s.dailySelected,taskId])]:s.dailySelected.filter((x:string)=>x!==taskId); if(a==="add_label")f?.card.labels.push({id:id("label"),name:payload.name,color:payload.color||"#2563eb"}); if(a==="remove_label"&&f)f.card.labels=f.card.labels.filter((x:any)=>x.id!==payload.labelId); if(a==="add_member")d.members.push({id:id("member"),memberEmail:payload.memberEmail,role:payload.role||"assignee",createdAt:now()}); if(a==="remove_member")d.members=d.members.filter((x:any)=>x.id!==payload.memberId); if(a==="add_checklist")d.checklists.push({id:id("checklist"),title:payload.title,position:d.checklists.length,items:[]}); if(a==="add_checklist_item"){const c=d.checklists.find((x:any)=>x.id===payload.checklistId);c?.items.push({id:id("item"),content:payload.content,done:false,position:c.items.length,createdAt:now()});} if(a==="toggle_checklist_item")for(const c of d.checklists){const i=c.items.find((x:any)=>x.id===payload.itemId);if(i)i.done=payload.done;} if(a==="add_comment")d.comments.push({id:id("comment"),authorEmail:"demo@7commander.com.br",content:payload.content,createdAt:now()}); if(a==="update_comment"){const c=d.comments.find((x:any)=>x.id===payload.commentId);if(c)c.content=payload.content;} if(a==="delete_comment")d.comments=d.comments.filter((x:any)=>x.id!==payload.commentId); if(a==="add_attachment")d.attachments.push({id:id("attachment"),fileName:payload.fileName,fileUrl:payload.fileUrl,mimeType:payload.mimeType||"",createdAt:now()}); save(s); return json({data:detail(s,taskId)});}
  if(p==="/api/daily")return json({data:{tasks:s.dailySelected.map((x:string)=>findCard(s,x)?.card).filter(Boolean).map((x:any)=>({...x,projectId:(Object.values(s.boards) as any[]).find((b:any)=>b.columns.some((c:any)=>c.cards.some((v:any)=>v.id===x.id)))?.projectId,selectedAt:now()}))}});
  if(p==="/api/clients"&&method==="GET")return json({data:s.clients}); if(p==="/api/clients"&&method==="POST"){const x={id:id("client"),userId:USER_ID,name:payload.name,description:payload.description||"",contact:payload.contact||"",status:payload.status||"ativo",createdAt:now(),updatedAt:now()};s.clients.push(x);save(s);return json({data:x},201);}
  m=p.match(/^\/api\/clients\/([^/]+)$/);if(m){const x=s.clients.find((v:any)=>v.id===m![1]);if(method==="PATCH"){Object.assign(x,payload,{updatedAt:now()});save(s);return json({data:x});}if(method==="DELETE"){s.clients=s.clients.filter((v:any)=>v.id!==m![1]);save(s);return json({ok:true});}return json({data:x});}
  if(p==="/api/decisions"&&method==="GET")return json({data:s.decisions.filter((x:any)=>!url.searchParams.get("projectId")||x.projectId===url.searchParams.get("projectId"))}); if(p==="/api/decisions"&&method==="POST"){const x={id:id("decision"),userId:USER_ID,...payload,context:payload.context||"",reason:payload.reason||"",impact:payload.impact||"",status:payload.status||"aberta",createdAt:now()};s.decisions.push(x);save(s);return json({data:x},201);}
  m=p.match(/^\/api\/decisions\/([^/]+)\/status$/);if(m){const x=s.decisions.find((v:any)=>v.id===m![1]);const previousStatus=x.status;x.status=payload.status||payload.newStatus;s.decisionHistory[x.id]||=[];s.decisionHistory[x.id].push({id:id("history"),decisionId:x.id,userId:USER_ID,previousStatus,newStatus:x.status,source:"demo",note:payload.note||"",createdAt:now()});save(s);return json({data:x});}
  m=p.match(/^\/api\/decisions\/([^/]+)\/history$/);if(m)return json({data:s.decisionHistory[m[1]]||[]});
  m=p.match(/^\/api\/projects\/([^/]+)\/risks$/);if(m){if(method==="GET")return json({data:s.risks.filter((x:any)=>x.projectId===m![1])});const x={id:id("risk"),userId:USER_ID,projectId:m[1],...payload,status:payload.status||"aberto",createdAt:now(),updatedAt:now()};s.risks.push(x);save(s);return json({data:x},201);}
  m=p.match(/^\/api\/risks\/([^/]+)$/);if(m){const x=s.risks.find((v:any)=>v.id===m![1]);Object.assign(x,payload,{updatedAt:now()});save(s);return json({data:x});}
  m=p.match(/^\/api\/projects\/([^/]+)\/members$/);if(m){if(method==="GET")return json({data:s.members[m[1]]||[],meta:{accessRole:"owner"}});const x={id:id("member"),projectId:m[1],memberEmail:payload.memberEmail||payload.email,role:payload.role||"viewer",createdAt:now()};(s.members[m[1]]||=[]).push(x);save(s);return json({data:x},201);}
  m=p.match(/^\/api\/projects\/([^/]+)\/members\/([^/]+)$/);if(m){const arr=s.members[m[1]]||[];if(method==="DELETE")s.members[m[1]]=arr.filter((x:any)=>x.id!==m![2]);else Object.assign(arr.find((x:any)=>x.id===m![2]),payload);save(s);return json({ok:true,data:arr.find((x:any)=>x.id===m![2])});}
  if(p==="/api/knowledge"&&method==="GET")return json({data:s.knowledge.filter((x:any)=>!url.searchParams.get("projectId")||x.projectId===url.searchParams.get("projectId"))});if(p==="/api/knowledge"&&method==="POST"){const x={id:id("knowledge"),userId:USER_ID,...payload,createdAt:now()};s.knowledge.push(x);save(s);return json({data:x},201);}if(p==="/api/knowledge"&&method==="DELETE"){s.knowledge=s.knowledge.filter((x:any)=>x.id!==url.searchParams.get("id"));save(s);return json({data:{id:url.searchParams.get("id")}});}
  if(p==="/api/knowledge/ingest"&&method==="POST"){const form=init?.body as FormData;const file=form?.get?.("file") as File|null;const projectId=String(form?.get?.("projectId")||s.activeProjectId);const x={id:id("knowledge"),userId:USER_ID,projectId,title:file?.name||"Documento de demonstração",content:"Arquivo registrado localmente para a demonstração.",category:"Arquivo",source:"Upload local",createdAt:now()};s.knowledge.push(x);save(s);return json({data:x,project:s.projects.find((v:any)=>v.id===projectId)});}
  if(p==="/api/memories"&&method==="GET")return json({data:s.memories});if(p==="/api/memories"&&method==="POST"){const x={id:id("memory"),userId:USER_ID,...payload,priority:payload.priority||"P2",type:payload.type||"manual",usefulness:null,createdAt:now(),updatedAt:now()};s.memories.push(x);save(s);return json({data:x},201);}
  m=p.match(/^\/api\/memories\/([^/]+)$/);if(m&&method==="DELETE"){s.memories=s.memories.filter((x:any)=>x.id!==m![1]);save(s);return json({ok:true});}
  m=p.match(/^\/api\/memories\/([^/]+)\/feedback$/);if(m){const x=s.memories.find((v:any)=>v.id===m![1]);x.usefulness=payload.useful===true?"useful":payload.useful===false?"not_useful":payload.feedback||null;save(s);return json({data:x});}
  if(p==="/api/memories/compress")return json({data:{compressed:true,archivedCount:1,summary:"Memórias locais revisadas para a demonstração."}});if(p==="/api/memories/prioritize")return json({data:{updated:s.memories.length}});
  if(p==="/api/conversations")return json({data:s.conversations});m=p.match(/^\/api\/conversations\/([^/]+)\/messages$/);if(m)return json({data:s.messages[m[1]]||[]});
  if(p==="/api/chat"&&method==="POST"){const conversationId=payload.conversationId||id("conversation");if(!s.conversations.some((x:any)=>x.id===conversationId))s.conversations.unshift({id:conversationId,title:String(payload.message||"Nova conversa").slice(0,48),projectId:payload.projectId||s.activeProjectId,createdAt:now(),updatedAt:now()});s.messages[conversationId]||=[];s.messages[conversationId].push({id:id("message"),conversationId,role:"user",content:payload.message,createdAt:now()});const answer=`Na demonstração, analisei o contexto do projeto. Recomendo priorizar as atividades críticas, revisar os riscos em mitigação e confirmar os responsáveis antes do próximo checkpoint.`;s.messages[conversationId].push({id:id("message"),conversationId,role:"assistant",content:answer,createdAt:now()});save(s);return json({data:{conversationId,message:answer,content:answer,response:answer}});}
  if(p==="/api/kairos/profile"&&method==="GET")return json({data:s.kairosProfile});if(p==="/api/kairos/profile"&&method==="PUT"){s.kairosProfile={...s.kairosProfile,...payload};save(s);return json({data:s.kairosProfile});}
  if(p.startsWith("/api/integrations/"))return json({data:[],meta:{demo:true},status:"demo",message:"Integração simulada no modo demonstração."});
  if(p==="/api/voice"||p==="/api/voice/transcribe")return json({error:"Áudio não é enviado a serviços externos no modo demonstração."},409);
  return json({error:"Recurso não disponível no modo demonstração.",path:p},404);
}
