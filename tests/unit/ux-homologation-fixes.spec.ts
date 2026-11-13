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

test("REP-MEET-01 team report includes meeting follow-ups only in internal projection",()=>{
 const data=file("lib/scrum/report-data.ts");
 const report=file("app/status-report/page.tsx");
 const service=file("services/meeting-report-context.ts");
 expect(data).toContain('const meetings=audience==="internal"?await loadProjectMeetingReport');
 expect(data).toContain('...(audience==="internal"?{internal:{stories:allStories,tasks:allTasks,meetingLines:');
 expect(report).toContain('Compromissos e pendências');
 expect(report).toContain('meetingSource==="local"');
 expect(report).toContain('meetingHistory+internal');
 expect(service).toContain('listSandboxMeetings(org,projectId)');
 expect(service).toContain('.eq("organization_id",org).eq("project_id",projectId)');
 expect(service).toContain('sourceReference:"meeting:"+meeting.id+":"+category+":"+index');
});

test("REP-MEET-02 client meeting candidates require editorial authorization and real tenant source",()=>{
 const api=file("app/api/status-report/public-facts/route.ts");
 const data=file("lib/scrum/report-data.ts");
 const report=file("app/status-report/page.tsx");
 expect(api).toContain("loadProjectMeetingReport(scope.db,scope.organizationId,projectId,15)");
 expect(api).toContain('add("next_step",item.title');
 expect(api).toContain('if(localMeetingReportEnabled())return out(');
 expect(api).toContain('if(kind!=="next_step")');
 expect(api).toContain('if(!lines.some(item=>item.sourceReference===sourceReference))');
 expect(api).toContain('.eq("organization_id",scope.organizationId).maybeSingle()');
 expect(api).toContain('approved_for_client:true');
 expect(data).toContain('approved_for_client",true');
 const clientSection=report.slice(report.indexOf('if(audience==="client"){'),report.indexOf("const scrumSection="));
 expect(clientSection).toContain("scrum?.publicFacts");
 expect(clientSection).not.toContain("meetingLines");
});

test("REP-MEET-03 Kairos internal analysis includes meeting lines and never sends them to client",()=>{
 const analysis=file("app/api/status-report/analysis/route.ts");
 expect(analysis).toContain('reunioesEEncaminhamentos:audience==="internal"?');
 expect(analysis).toContain("scrum.internal?.meetingLines");
 expect(analysis).toContain("registroDeTeste:item.localOnly");
 expect(analysis).toContain("Registros de teste locais nunca são evidência oficial");
 expect(analysis).toContain('fatosAprovadosCliente:audience==="client"?');
});
