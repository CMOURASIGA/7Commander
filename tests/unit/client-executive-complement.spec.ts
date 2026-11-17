import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
const read=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");

test("client report shows approved executive complement, not internal Sprint or risks",()=>{
 const page=read("app/status-report/page.tsx");
 const segment=page.slice(page.indexOf('if(audience==="client"){'),page.indexOf('const scrumSection='));
 expect(segment).toContain("scrum?.clientExecutiveComplement?.trim()");
 expect(segment).toContain("Evolução e principais alinhamentos");
 expect(segment).not.toContain('<h2>Sprints selecionadas e respectivas US</h2>');
 expect(segment).not.toContain('<h2>Pontos de atenção selecionados</h2>');
 expect(segment).toContain("ATIVIDADES SELECIONADAS");
 expect(segment).toContain("CONCLUÍDAS");
 expect(segment).toContain("EM ANDAMENTO");
});

test("manual edit and Kairos suggestion require explicit renewed approval",()=>{
 const page=read("app/status-report/page.tsx");
 expect(page).toContain('aria-label="Complemento Executivo do Cliente"');
 expect(page).toContain('Kairos: resumir última reunião');
 expect(page).toContain('setClientExecutiveApproved(false);');
 expect(page).toContain('clientExecutiveApproved?clientExecutiveComplement.trim():""');
 expect(page).toContain('clientExecutiveComplement:clientExecutiveComplement.trim(),clientExecutiveApproved');
 const history=read("app/api/status-report/history/route.ts");
 expect(history).toContain('body.clientExecutiveApproved!==true');
 expect(history).toContain('report.clientExecutiveComplement=complement.trim().slice(0,3000)');
 expect(page).toContain('data.clientExecutiveComplement?.trim()');
});

test("Kairos latest-meeting suggestion is scoped to official tenant and editor",()=>{
 const endpoint=read("app/api/status-report/client-executive-suggestion/route.ts");
 expect(endpoint).toContain('["owner","editor"].includes(ctx.role)');
 expect(endpoint).toContain('.eq("project_id",projectId).eq("organization_id",ctx.organizationId)');
 expect(endpoint).toContain('.order("held_at",{ascending:false}).limit(1)');
 expect(endpoint).toContain('requiresReview:true');
 expect(endpoint).not.toContain("project_meeting_transcripts");
});
