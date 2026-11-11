import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");

test("ícones de CRUD usam componente comum e não elementos duplicados",()=>{
  const icon=source("components/ui/icon-action-button.tsx");
  const css=source("app/globals.css");
  expect(icon).toContain("aria-label={label}");
  expect(icon).toContain('type={type}');
  expect(icon).toContain('width={20} height={20}');
  expect(css).toContain("width: 40px;");
  expect(css).toContain("height: 40px;");
  expect(css).toContain("@media (pointer: coarse)");
  expect(css).toContain("width: 44px;");
  expect(css).toContain(".cs-icon-action:focus-visible");
});

test("modelo equilibrado usa whitelabel no hover e diferencia exclusão",()=>{
  const css=source("app/globals.css");
  const component=source("components/ui/icon-action-button.tsx");
  expect(css).toContain("var(--accent-strong)");
  expect(css).toContain("var(--accent-soft)");
  expect(css).toContain(".cs-icon-action--danger:hover:not(:disabled)");
  expect(css).toContain("var(--danger-soft)");
  expect(css).toContain(".cs-icon-action--success:hover:not(:disabled)");
  expect(css).not.toContain(".cs-icon-action--edit { border-color: #93c5fd");
  expect(component).toContain("cs-icon-action--edit");
});

test("UX-ICON-02 presente nas telas com ações individuais",()=>{
  for(const path of [
    "app/clients/page.tsx",
    "app/projects/page.tsx",
    "components/projects/project-stakeholders-editor.tsx",
    "app/scrum/backlog/page.tsx",
    "app/scrum/kanban/page.tsx",
    "app/activities/page.tsx",
    "app/memory/page.tsx",
    "app/planning/page.tsx",
    "app/planning/workflows/page.tsx",
    "app/decisions/page.tsx",
    "app/operational-decisions/page.tsx",
    "components/status-report/public-facts-editor.tsx",
    "app/admin/usuarios/page.tsx",
    "app/platform/companies/page.tsx",
    "components/notifications/task-alerts.tsx"
  ]){
    expect(source(path),path).toContain("<IconActionButton");
  }
});

test("exclusões mantêm suas confirmações e suas regras",()=>{
  expect(source("app/clients/page.tsx")).toContain('confirm({title:`Excluir cliente');
  expect(source("app/activities/page.tsx")).toContain("Excluir comentario?");
  expect(source("app/platform/companies/page.tsx")).toContain('Digite DESATIVAR para confirmar:');
  expect(source("app/scrum/backlog/page.tsx")).toContain('r.story.has_history');
});

test("botões primários de cadastro continuam explícitos",()=>{
  expect(source("app/projects/page.tsx")).toContain("Criar projeto");
  expect(source("app/scrum/page.tsx")).toContain("Criar Sprint");
  expect(source("app/status-report/page.tsx")).toContain("Registrar emissão no histórico");
  expect(source("app/clients/page.tsx")).toContain("Adicionar cliente");
});

test("componente de visualização não altera dados",()=>{
  const clients=source("app/clients/page.tsx");
  expect(clients).toContain('icon="eye" tone="neutral"');
  expect(clients).toContain('onClick={()=>setViewClient(client)}');
  expect(clients).toContain('icon="trash" tone="danger"');
  const docs=source("app/projects/page.tsx");
  expect(docs).toContain('icon="eye" tone="neutral" label={"Visualizar conteúdo');
  expect(docs).toContain('icon="trash" tone="danger" label={"Excluir registro');
});
