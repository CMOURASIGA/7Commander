import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
const page=()=>readFileSync(resolve(process.cwd(),"app/status-report/page.tsx"),"utf8");
test("one project content selection is available for either audience",()=>{
 const s=page();
 expect(s).toContain('aria-label="Seleção única de conteúdo do projeto"');
 expect(s).toContain('const chosenInternal=internalSelection??availableInternal');
 expect(s).toContain('const isClientFactSelected=(fact:ClientReportFact)');
 expect(s).toContain('const chosenClientFactIds=clientItems.filter(isClientFactSelected)');
 expect(s).toContain('publicFacts:selectClientReportFacts(clientCandidates||[],chosenClientFactIds)');
 expect(s).toContain('applyInternalReportSelection(scrumReport,chosenInternal)');
 expect(s).not.toContain('audience==="client"&&<section className="workspace-card space-y-3 p-4" aria-label="Gestão do conteúdo Cliente"');
 expect(s).not.toContain('audience==="internal"&&<section className="workspace-card space-y-3 p-4" aria-label="Curadoria do relatório Equipe"');
});
test("client-safe catalog is matched against the same project board and Scrum source",()=>{
 const s=readFileSync(resolve(process.cwd(),"lib/reports/client-report-candidates.ts"),"utf8");
 expect(s).toContain('listTaskBoard({projectId,userId:actor.userId,userEmail:actor.userEmail})');
 expect(s).toContain('loadReportData(db,org,projectId,"internal")');
 expect(s).toContain('listDecisions(actor.userId,projectId)');
});
