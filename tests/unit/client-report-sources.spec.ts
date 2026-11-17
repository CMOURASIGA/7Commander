import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {clientSelectableFacts,selectClientReportFacts} from "../../lib/reports/client-report-selection";
import type {ClientReportFact} from "../../lib/scrum/report-data";
const file=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");
const make=(id:string,kind:ClientReportFact["kind"],source_reference=id):ClientReportFact=>({id,kind,title:id,description:"",classification:"in_progress",due_date:null,source_reference});

test("Client deliverables come from project Kanban, not Scrum backlog",()=>{
 const source=file("lib/reports/client-report-candidates.ts");
 expect(source).toContain('listTaskBoard({projectId,userId:actor.userId,userEmail:actor.userEmail})');
 expect(source).toContain('board.columns.flatMap(column=>column.cards)');
 expect(source).toContain('add("task:"+x.id,"deliverable"');
 expect(source).not.toContain('db.from("scrum_backlog_items")');
 expect(source).not.toContain('add("story:"+x.id,"deliverable"');
 expect(source).toContain('if(!["objective","benefit","risk"].includes(x.kind))continue;');
});

test("Sprint selection automatically includes only linked US, with no separate US checkbox",()=>{
 const facts=[
  make("sprint:s1","milestone"),make("story:a","milestone","sprint:s1"),
  make("story:b","milestone","sprint:s2"),make("sprint:s2","milestone"),
  make("task:t1","deliverable"),make("decision:d1","next_step")
 ];
 expect(clientSelectableFacts(facts).map(x=>x.id)).toEqual(["sprint:s1","sprint:s2","task:t1","decision:d1"]);
 expect(selectClientReportFacts(facts,["sprint:s1"]).map(x=>x.id)).toEqual(["sprint:s1","story:a"]);
 expect(selectClientReportFacts(facts,["sprint:s2"]).map(x=>x.id)).toEqual(["story:b","sprint:s2"]);
 expect(selectClientReportFacts(facts,[])).toEqual([]);
 const page=file("app/status-report/page.tsx");
 expect(page).toContain('publicFacts:selectClientReportFacts(clientCandidates||[],chosenClientFactIds)');
 expect(page).toContain('Sprints e suas US');
 expect(file("app/api/status-report/history/route.ts")).toContain('report.publicFacts=selectClientReportFacts(options,[...selected]);');
});

test("Client decisions only come from the official Decisions register",()=>{
 const source=file("lib/reports/client-report-candidates.ts");
 expect(source).toContain('listDecisions(actor.userId,projectId)');
 expect(source).toContain('add("decision:"+x.id,"next_step"');
 expect(source).toContain('if(!["objective","benefit","risk"].includes(x.kind))continue;');
});

test("Client selections match Kanban board across all three columns",()=>{
 const source=file("lib/reports/client-report-candidates.ts");
 expect(source).toContain('board.columns.flatMap(column=>column.cards)');
 expect(source).toContain('({todo:"A fazer",doing:"Em andamento",done:"Concluída"}');
 const page=file("app/status-report/page.tsx");
 expect(page).toContain('Sprints e suas US');
 expect(page).toContain('Nenhum registro disponível nesta categoria.');
});

test("Archived editorial milestones never remove Sprint candidates from the Client preview",()=>{
 const source=file("lib/reports/client-report-candidates.ts");
 // Legacy published milestones and deliveries are no longer eligible as editorial replacements.
 expect(source).toContain('filter(x=>["objective","benefit","risk"].includes(x.kind)).map(x=>x.source_reference)');
 expect(source).toContain('for(const sprint of report.scrum.sprints)');
 expect(source).toContain('add("sprint:"+sprint.id,"milestone"');
 expect(source).toContain('add("story:"+story.id,"milestone"');
 const ui=file("app/status-report/page.tsx");
 expect(ui).toContain('publicFacts:selectClientReportFacts(clientCandidates||[],chosenClientFactIds)');
 expect(ui).toContain('publicFacts:selectClientReportFacts(clientCandidates||[],chosenClientFactIds)');
 expect(file("app/api/status-report/history/route.ts")).toContain('report.publicFacts=selectClientReportFacts(options,[...selected]);');
});
