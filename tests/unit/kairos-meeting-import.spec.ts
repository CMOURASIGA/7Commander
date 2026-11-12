import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {allowedMeetingFile,normalizeMeetingDraft} from "../../services/meeting-transcript-draft";
const source=(file:string)=>readFileSync(resolve(process.cwd(),file),"utf8");

test("Teams, Gemini and text exports allow documented meeting formats only",()=>{
 for(const file of ["export.vtt","notes.docx","transcript.pdf","meeting.txt","summary.md","meeting.srt","meeting.csv"])
  expect(allowedMeetingFile(file)).toBe(true);
 for(const file of ["installer.exe","video.mp4","archive.zip","macro.docm"])expect(allowedMeetingFile(file)).toBe(false);
});

test("meeting preview does not invent missing date, participant or decisions",()=>{
 const draft=normalizeMeetingDraft({title:"Reunião de alinhamento",summary:"Discussão sobre integração",heldAt:"amanhã",
  decisions:null,suggestedActions:["Solicitar ambiente"],uncertainties:["Data não mencionada"]});
 expect(draft.heldAt).toBe("");
 expect(draft.participants).toBe("");
 expect(draft.decisions).toBe("");
 expect(draft.suggestedActions).toEqual(["Solicitar ambiente"]);
 expect(draft.uncertainties).toEqual(["Data não mencionada"]);
});

test("import endpoint is a read-only preview with tenant and project scoping",()=>{
 const route=source("app/api/projects/[projectId]/meetings/draft/route.ts");
 expect(route).toContain("requireApiAuth(request)");
 expect(route).toContain('eq("organization_id",tenant)');
 expect(route).toContain("prepareMeetingDraft(");
 expect(route).not.toContain(".insert(");
 expect(route).not.toContain(".upsert(");
});

test("human approval in chat and meeting screen controls official creation",()=>{
 const importer=source("components/projects/meeting-transcript-import.tsx");
 expect(importer).toContain("Aprovar e registrar reunião");
 expect(importer).toContain("if(!draft.heldAt)");
 expect(importer).toContain("Nenhuma decisão, risco ou atividade foi criada automaticamente");
 expect(source("app/chat/page.tsx")).toContain("<MeetingTranscriptImport");
 expect(source("app/projects/[projectId]/meetings/page.tsx")).toContain("<MeetingTranscriptImport");
 expect(source("app/api/projects/[projectId]/meetings/route.ts")).toContain("localWriteGuardEnabled()");
});

test("Kairos retrieves official meetings only with organization and project isolation",()=>{
 const svc=source("services/kairos-meeting-context.ts");
 expect(svc).toContain('eq("organization_id",organizationId)');
 expect(svc).toContain('eq("project_id",projectId)');
 expect(svc).toContain("não comprovam execução");
 expect(source("services/kairos-core.ts")).toContain("loadProjectMeetingContext");
});
