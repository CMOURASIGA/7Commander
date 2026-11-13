import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path:string):string {
  return readFileSync(resolve(process.cwd(),path),"utf8");
}

test("projeto mostra a visão gerencial sem eliminar as abas operacionais",()=>{
  const page=source("app/projects/page.tsx");
  expect(page).toContain('activeTab==="overview"');
  expect(page).toContain("ProjectOverview");
  expect(page).toContain("Trocar projeto (");
  for(const tab of ['"project","Projeto"','"risks"','"decisions"','"documents"','"members"'])
    expect(page).toContain(tab);
});

test("fluxos scrum, daily e atividades compartilham navegação, sem trocar endpoints",()=>{
  for(const file of [
    "app/scrum/page.tsx","app/scrum/backlog/page.tsx",
    "app/scrum/kanban/page.tsx","components/daily/daily-client.tsx",
    "app/activities/page.tsx"
  ]) expect(source(file)).toContain("<AgileWorkspaceNav");
  expect(source("app/scrum/kanban/page.tsx")).toContain('transition.stage==="review"');
});

test("governança conserva as duas centrais com finalidade distinta",()=>{
  expect(source("components/layout/sidebar.tsx")).toContain('href: "/decisions"');
  expect(source("components/layout/sidebar.tsx")).toContain('href: "/operational-decisions"');
  expect(source("app/decisions/page.tsx")).toContain("/api/decisions");
  expect(source("app/operational-decisions/page.tsx")).toContain("/api/operational-decisions");
});

test("UX não habilita gravações automáticas em Kairos ou upload documental",()=>{
  const page=source("app/projects/page.tsx");
  expect(page).toContain("Não é armazenamento do arquivo original");
  expect(source("app/chat/page.tsx")).toContain("Contexto do Kairos");
  expect(source("app/status-report/page.tsx")).toContain('audience==="client"');
  expect(source("app/status-report/page.tsx")).toContain('audience==="internal"');
});

test("Prospect e Memória oferecem navegação de consulta sem remover CRUD",()=>{
  const planning=source("app/planning/page.tsx");
  expect(planning).toContain('aria-label={active?"Editar registro":"Adicionar registro"}');
  expect(planning).toContain('void save("draft")');
  const memory=source("app/memory/page.tsx");
  expect(memory).toContain("filteredMemories.map");
  expect(memory).toContain('priorityFilter==="all"');
});

test("UX-NAV-01 keeps desktop sidebar reflow, compact icons, rounded logo and persisted preference",()=>{
  const sidebar=source("components/layout/sidebar.tsx");
  const shell=source("components/layout/app-shell.tsx");
  const styles=source("app/globals.css");
  expect(sidebar).toContain('commander-sidebar-compact');
  expect(sidebar).toContain('commander-sidebar-expanded');
  expect(sidebar).toContain('aria-label={item.label}');
  expect(sidebar).toContain('commander-sidebar-logo-frame');
  expect(sidebar).toContain('aria-expanded={expanded}');
  expect(shell).toContain('7commander:sidebar-expanded');
  expect(shell).toContain('expanded={sidebarExpanded}');
  expect(styles).toContain('.commander-sidebar-expanded');
  expect(styles).toContain('border-radius: 16px');
  expect(styles).toContain('prefers-reduced-motion: reduce');
});

test("UX-NAV-01 project tabs support deep links, browser history and narrow screens",()=>{
  const page=source("app/projects/page.tsx");
  expect(page).toContain('searchParams.set("tab",tab)');
  expect(page).toContain('window.addEventListener("popstate",sync)');
  expect(page).toContain('overflow-x-auto p-3');
  expect(page).toContain('shrink-0 whitespace-nowrap');
});

test("UX-PROSPECT-01 uses full-width shell and same URL-backed horizontal tabs as Projects",()=>{
 const page=source("app/planning/page.tsx");
 expect(page).toContain('max-w-[1600px]');
 expect(page).toContain('role="tablist"');
 expect(page).toContain('role="tabpanel"');
 expect(page).toContain('overflow-x-auto p-3');
 expect(page).toContain('searchParams.set("tab",next)');
 expect(page).toContain('window.addEventListener("popstate",syncTab)');
 expect(page).toContain("<PageIntro");
});

test("planning distinguishes database failure from empty results and uses red danger action",()=>{
 const page=source("app/planning/page.tsx");
 expect(page).toContain("setLoadError(e instanceof Error");
 expect(page).toContain("Atenção: consulta indisponível");
 expect(page).toContain("Isso não significa que a base esteja vazia");
 expect(page).toContain('!loading&&!loadError&&!items.length');
 expect(page).toContain('className="workspace-button-danger px-3 py-2"');
 expect(page).toContain("text-(--danger)");
});

test("UX-NAV-02 keeps collapse toggle icon-only and automatically yields workspace space",()=>{
 const sidebar=source("components/layout/sidebar.tsx");
 const shell=source("components/layout/app-shell.tsx");
 expect(sidebar).toContain('aria-label={expanded ? "Recolher menu lateral" : "Expandir menu lateral"}');
 expect(sidebar).not.toContain('<span className="commander-sidebar-expanded-content">{expanded ? "Recolher menu"');
 expect(shell).toContain('setSidebarExpanded(false)');
 expect(shell).toContain('onPointerDown={()=>{if(sidebarExpanded)setSidebarExpanded(false)}}');
});

test("UX-ALERT-02 highlights attention and failed Kanban deletion in red",()=>{
 const home=source("app/page.tsx");
 const activities=source("app/activities/page.tsx");
 expect(home).toContain('"Atenção": "bg-(--danger-soft) text-(--danger)');
 expect(activities).toContain("exclus[aã]o bloqueada");
 expect(activities).toContain("text-(--danger)");
});

test("UX-NOTIFY-02 links notifications to their original Scrum stories and operational cards",()=>{
 const notifications=source("components/notifications/task-alerts.tsx");
 expect(notifications).toContain('storyId=');
 expect(notifications).toContain('taskId=');
 expect(notifications).toContain('Origem:');
 expect(notifications).toContain('Abrir US para revisar');
 expect(notifications).toContain('Abrir card');
});

test("Kanban author attribution is based on verified organization users and creation audit",()=>{
 const svc=source("services/task-board-service.ts");
 const page=source("app/activities/page.tsx");
 expect(svc).toContain('creatorName?: string | null;');
 expect(svc).toContain('.from("organization_members")');
 expect(svc).toContain('.from("internal_user_access")');
 expect(svc).toContain('actor_email');
 expect(page).toContain('card.creatorName||"Usuário não identificado"');
});

test("Kanban deletion checks task-linked Sprint without assuming join table project_id",()=>{
 const svc=source("services/task-board-service.ts");
 expect(svc).toContain('from("scrum_sprint_tasks").select("task_id").eq("task_id",params.taskId).eq("project_id",row.project_id).eq("organization_id",organizationId).limit(1)');
 expect(svc).toContain("Consulta de vínculos com Sprints indisponível");
 expect(svc).toContain("Auditoria da exclusão indisponível");
});

test("local safe mode clearly prevents Kanban deletion and preserves authorized tenant checks",()=>{
 const tasks=source("app/activities/page.tsx");
 const route=source("app/api/tasks/[taskId]/route.ts");
 expect(tasks).toContain("useCentralPilotReadOnly");
 expect(tasks).toContain("!environmentReadOnly");
 expect(route).toContain("localWriteGuardEnabled()");
 expect(route).toContain("somente leitura");
});

test("UX-NOTIFY-03 opens notification center drawer with direct deep links and safe actions",()=>{
 const c=source("components/notifications/task-alerts.tsx");
 expect(c).toContain('id="commander-notification-drawer"');
 expect(c).toContain('role="dialog"');
 expect(c).toContain('aria-modal="true"');
 expect(c).toContain("Central de notificações");
 expect(c).toContain('storyId=');
 expect(c).toContain('taskId=');
 expect(c).toContain("Marcar como lida");
 expect(c).toContain("Abrir card e trabalhar");
 expect(c).toContain("Atividades continuam pendentes");
 expect(c).not.toContain('mt-2 w-80 max-w-[90vw]');
});

test("Kanban comments reject local writes explicitly and surface error without losing draft",()=>{
 const route=source("app/api/tasks/[taskId]/details/route.ts");
 const svc=source("services/task-card-detail-service.ts");
 const ui=source("app/activities/page.tsx");
 expect(route).toContain("LOCAL_READ_ONLY");
 expect(route).toContain("INVALID_COMMENT");
 expect(route).toContain("ACTION_NOT_APPLIED");
 expect(svc).toContain('from("task_comments").insert({');
 expect(svc).toContain('organization_id:await requireEffectiveTenant(params.userId)');
 expect(ui).toContain("async function submitComment()");
 expect(ui).toContain("setCommentError(");
 expect(ui).toContain("Registrando...");
});
