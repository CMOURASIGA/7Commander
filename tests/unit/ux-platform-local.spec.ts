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
