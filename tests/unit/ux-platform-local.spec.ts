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
