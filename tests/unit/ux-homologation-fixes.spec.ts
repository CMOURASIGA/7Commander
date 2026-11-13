import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
const file=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");

test("cliente tem ações em ícones, alinhadas e exclusão confirmada",()=>{
 const src=file("app/clients/page.tsx");
 expect(src).toContain('icon="eye" tone="neutral" label={"Visualizar "+client.name}');
 expect(src).toContain('icon="pencil" tone="edit" label={"Editar "+client.name}');
 expect(src).toContain('icon="trash" tone="danger" label={"Excluir "+client.name}');
 expect(file("components/ui/icon-action-button.tsx")).toContain('className={`cs-icon-action');
 expect(src).toContain('tone:"danger"');
});

test("status report tem apenas um controle de público e exibe erros de dados",()=>{
 const src=file("app/status-report/page.tsx");
 expect(src).toContain('aria-pressed={audience==="client"}');
 expect(src).toContain('aria-pressed={audience==="internal"}');
 expect(src).not.toContain('>Tipo de relatório<select');
 expect(src).toContain('Reconsultar dados');
 expect(src).toContain('status}');
});

test("Scrum consulta Sprints mesmo quando as US e o histórico falham",()=>{
 const src=file("components/scrum/scrum-common.tsx");
 expect(src).toContain("Promise.allSettled");
 expect(src).toContain('if(sprintResult.status==="fulfilled")');
 expect(src).toContain('if(storyResult.status==="fulfilled")');
 expect(src).toContain("US e histórico:");
});

test("whitelabel tem fonte visual única e empresa é confirmada no servidor",()=>{
 const sidebar=file("components/layout/sidebar.tsx");
 const sync=file("components/brand/organization-brand-sync.tsx");
 const select=file("app/organizations/page.tsx");
 expect(sidebar).toContain("client-brand-updated");
 expect(sidebar).not.toContain('fetch("/api/organizations/branding"');
 expect(sync).toContain("if(previous===serialized)return;");
 expect(sync).not.toContain('if(alive)publishBrand(DEFAULT_CLIENT_BRAND);');
 expect(select).toContain('confirmation.data?.id!==selected');
});

test("scripts de permissão no Supabase são propostas, nunca automações no runtime",()=>{
 const review=file("docs/sql/RLS_AUTHENTICATED_SCRUM_REPORT_REVIEW_20261111.sql");
 expect(review).toContain("DO NOT apply");
 expect(review).toContain("public.is_organization_member(organization_id)");
 expect(review).toContain("int01_is_central_readonly_member");
 expect(review).not.toContain("DISABLE ROW LEVEL SECURITY");
});

test("UX-REP-04 shows approved facts and report preview side-by-side while preserving mobile tabs",()=>{
 const page=file("app/status-report/page.tsx");
 expect(page).toContain('xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]');
 expect(page).toContain('aria-label="Seleção e aprovação do conteúdo"');
 expect(page).toContain('aria-label="Prévia do Status Report"');
 expect(page).toContain('aria-pressed={mobileReportPane==="content"}');
 expect(page).toContain('aria-pressed={mobileReportPane==="preview"}');
 expect(page).toContain('xl:max-h-[calc(100vh-2rem)]');
 expect(page).toContain('xl:h-[calc(100vh-15rem)]');
 expect(page).toContain('sandbox="allow-scripts"');
 expect(page).toContain('<PublicFactsEditor projectId={projectId}');
 expect(page).toContain('onChange={()=>setFactsRevision(n=>n+1)}');
 expect(page).toContain('Registrar emissão no histórico');
 expect(page).toContain('documentHtml');
 expect(page).toContain('Baixar PDF');
 expect(page).toContain('Baixar HTML');
 expect(page).toContain('Histórico de emissões');
});
