import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {allowedMeetingFile,normalizeMeetingDraft} from "../../services/meeting-transcript-draft";
import {chunkTranscript,mergeEvidence,normalizeBlockEvidence,formatApprovedMeetingActions} from "../../services/meeting-evidence";
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

test("transcript upload exposes clear action, selected filename and accessible validation",()=>{
 const ui=source("components/projects/meeting-transcript-import.tsx");
 expect(ui).toContain("Selecionar arquivo");
 expect(ui).toContain("Substituir arquivo");
 expect(ui).toContain("Nenhum arquivo selecionado");
 expect(ui).toContain("meeting-transcript-file");
 expect(ui).toContain('aria-label="Selecionar arquivo de transcrição"');
 expect(ui).toContain("8*1024*1024");
 expect(ui).toContain("Preparar prévia com Kairos");
 expect(ui).toContain("Remover");
});

test("long Teams transcription is chunked without silently losing the final minutes",()=>{
 const transcript=Array.from({length:85},(_,i)=>"00:"+String(Math.floor(i%60)).padStart(2,"0")+":00 Palestrante "+(i%4+1)+"\\n"+("Discussão fiscal, XML e validações de NF-e. ".repeat(5))).join("\\n");
 const blocks=chunkTranscript(transcript,12000);
 expect(blocks.length).toBeGreaterThan(1);
 expect(blocks.every(block=>block.length<=12000)).toBe(true);
 expect(blocks.join("\\n")).toContain("validações de NF-e.");
 expect(blocks.join("\\n")).toContain("00:00:00");
 const pipeline=source("services/meeting-transcript-draft.ts");
 expect(pipeline).toContain("for(let i=0;i<blocks.length;i++)");
 expect(pipeline).toContain("mergeEvidence(extracted)");
 expect(pipeline).toContain("Nenhuma reunião foi gravada.");
});

test("individual meeting actions retain time, proposed owner, status and original evidence",()=>{
 const part=normalizeBlockEvidence({actions:[
  {title:"Compartilhar relatório detalhado de erros",owner:"Equipe fiscal",status:"assumido",time:"00:42:25",evidence:"envia essa planilha"},
  {title:"Validar regra de seleção de entradas",owner:"Equipe técnica",status:"proposta",time:"00:24:00",evidence:"a gente pode rever"}
 ],participantsMentioned:["Christian","Edson"],notes:["Data da reunião não indicada"]},1);
 const combined=mergeEvidence([part]);
 expect(combined.coverage).toEqual({blocks:1,processed:1,notes:["Data da reunião não indicada"]});
 expect(combined.actions).toHaveLength(2);
 expect(combined.actions[0].time).toBe("00:42:25");
 expect(combined.actions[1].status).toBe("proposta");
 expect(combined.participantsMentioned).toEqual(["Christian","Edson"]);
 const text=formatApprovedMeetingActions(combined.actions);
 expect(text.commitments).toContain("Compartilhar relatório");
 expect(text.pendingItems).toContain("Validar regra");
 expect(text.pendingItems).toContain("00:24:00");
});

test("human deselection prevents an extracted action from being recorded in the meeting",()=>{
 const block=normalizeBlockEvidence({actions:[
  {title:"Enviar documentação do piloto",status:"assumido",evidence:"vou encaminhar"},
  {title:"Investigar operações canceladas",status:"pendente",evidence:"vamos olhar"}
 ]},2);
 const actions=block.actions.map((action,i)=>({...action,included:i===1}));
 const approved=formatApprovedMeetingActions(actions);
 expect(approved.commitments).toBe("");
 expect(approved.pendingItems).toContain("Investigar operações");
 expect(approved.pendingItems).not.toContain("Enviar documentação");
 const ui=source("components/projects/meeting-transcript-import.tsx");
 expect(ui).toContain('role="tablist"');
 expect(ui).toContain("Conferência da fonte");
 expect(ui).toContain('editAction(action.id,{included:e.target.checked})');
 expect(ui).toContain("formatApprovedMeetingActions(selectedActions)");
 expect(ui).toContain("Aprovar e registrar reunião");
});
