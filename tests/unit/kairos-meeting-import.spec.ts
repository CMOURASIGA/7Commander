import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {allowedMeetingFile,normalizeMeetingDraft} from "../../services/meeting-transcript-draft";
import {chunkTranscript,mergeEvidence,normalizeBlockEvidence,formatApprovedMeetingActions,markMeetingDuplicateCandidates} from "../../services/meeting-evidence";
import {guardMeetingNarrative,reviewMeetingEvidence} from "../../services/meeting-review-guard";
import {groundEvidenceItem,verifyMeetingEvidence} from "../../services/meeting-grounding";
import {semanticContext,parseSemanticAudit,applySemanticAudit} from "../../services/meeting-semantic-review";
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
  {title:"Compartilhar relatório detalhado de erros",owner:"Equipe fiscal",kind:"operational",status:"assumido",time:"00:42:25",evidence:"envia essa planilha"},
  {title:"Validar regra de seleção de entradas",owner:"Equipe técnica",kind:"operational",status:"proposta",time:"00:24:00",evidence:"a gente pode rever"}
 ],participantsMentioned:["Christian","Edson"],notes:["Data da reunião não indicada"]},1);
 const combined=mergeEvidence([part]);
 expect(combined.coverage).toEqual({blocks:1,processed:1,notes:["Data da reunião não indicada"]});
 expect(combined.actions).toHaveLength(2);
 expect(combined.actions[0].time).toBe("00:42:25");
 expect(combined.actions[1].status).toBe("proposta");
 expect(combined.participantsMentioned).toEqual(["Christian","Edson"]);
 expect(combined.participantsConfirmed).toEqual([]);
 const text=formatApprovedMeetingActions(combined.actions.map(action=>({...action,included:true})));
 expect(text.commitments).toContain("Compartilhar relatório");
 expect(text.pendingItems).toContain("Validar regra");
 expect(text.pendingItems).toContain("00:24:00");
});

test("human deselection prevents an extracted action from being recorded in the meeting",()=>{
 const block=normalizeBlockEvidence({actions:[
  {title:"Enviar documentação do piloto",kind:"operational",status:"assumido",evidence:"vou encaminhar"},
  {title:"Investigar operações canceladas",kind:"operational",status:"pendente",evidence:"vamos olhar"}
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

test("meeting import emits true streaming progress after each completed source block",()=>{
 const service=source("services/meeting-transcript-draft.ts");
 const api=source("app/api/projects/[projectId]/meetings/draft/route.ts");
 expect(service).toContain('onProgress?:(progress:MeetingExtractionProgress)=>void');
 expect(service).toContain('completed:i+1,total:blocks.length');
 expect(service).toContain('stage:"consolidating"');
 expect(service).toContain('stage:"completed"');
 expect(api).toContain('application/x-ndjson');
 expect(api).toContain('start(controller){');
 expect(api).toContain('void (async()=>{');
 expect(api).toContain('JSON.stringify(value)+"\\n"');
 expect(api).toContain('type:"result"');
 expect(api).toContain('type:"error"');
 expect(api).not.toContain(".insert(");
});

test("meeting importer shows processing progress and warns on delayed replies without inventing remaining time",()=>{
 const ui=source("components/projects/meeting-transcript-import.tsx");
 expect(ui).toContain('role="progressbar"');
 expect(ui).toContain('progress.completed/progress.total*100');
 expect(ui).toContain('45 segundos');
 expect(ui).toContain('Cancelar análise');
 expect(ui).toContain('controllerRef.current?.abort()');
 expect(ui).toContain('Processamento encerrado sem gerar a prévia');
 expect(ui).toContain('barra mostra blocos concluídos, não uma estimativa de tempo restante');
});

test("MEET-R3 separates work from business rules, offers and technical explanation",()=>{
 const part=normalizeBlockEvidence({actions:[
  {title:"Enviar relatório de inconsistências para o desenvolvimento",kind:"operational",status:"assumido",evidence:"eu vou enviar"},
  {title:"Nota de entrada precisa destacar substituição tributária",kind:"business_rule",status:"assumido",evidence:"tem que ter ST"},
  {title:"Conte comigo se precisarem",kind:"offer",status:"assumido",evidence:"podem contar"},
  {title:"Sistema depende de obrigações acessórias",kind:"context",status:"assumido",evidence:"depende de dados"},
  {title:"Planilha já foi enviada",kind:"completed",status:"realizado",evidence:"já mandei"}
 ],participantsConfirmed:["Palestrante 1","Christian","Speaker 2","Edson"],
 participantsMentioned:["Marcelo","Jefferson"]},1);
 expect(part.actions).toHaveLength(5);
 expect(part.actions.every(action=>!action.included)).toBe(true);
 expect(part.participantsConfirmed).toEqual(["Christian","Edson"]);
 const approved=formatApprovedMeetingActions(part.actions.map(action=>({...action,included:true})));
 expect(approved.commitments).toContain("Enviar relatório");
 expect(approved.commitments).not.toContain("Nota de entrada");
 expect(approved.commitments).not.toContain("Conte comigo");
 expect(approved.commitments).not.toContain("Planilha já foi enviada");
 expect(approved.pendingItems).not.toContain("Sistema depende");
});

test("MEET-R3 defaults unclassified extraction to review, never to official work",()=>{
 const part=normalizeBlockEvidence({actions:[{title:"A gente precisa andar com isso",status:"assumido"}]},1);
 expect(part.actions[0].kind).toBe("review");
 expect(part.actions[0].included).toBe(false);
 const preview=normalizeMeetingDraft({participants:"Palestrante 1; Christian; Orador 4; Edson",title:"Mardisa",summary:"Piloto"});
 expect(preview.participants).toBe("Christian; Edson");
 const ui=source("components/projects/meeting-transcript-import.tsx");
 expect(ui).toContain("Ações para acompanhamento");
 expect(ui).toContain("Regras, fatos e outras ocorrências");
 expect(ui).toContain('disabled={action.kind!=="operational"}');
 expect(ui).toContain('included:false');
});

test("MEET-R4 preserves literal evidence for review but not colloquial quotations in official minutes",()=>{
 const block=normalizeBlockEvidence({actions:[
  {title:"Disponibilizar relatório de inconsistências para análise técnica",kind:"operational",status:"assumido",owner:"Equipe responsável",time:"00:42:25",evidence:"Ah, eu vou mandar aí, tá bom?"}
 ]},1);
 const record=formatApprovedMeetingActions(block.actions.map(action=>({...action,included:true})));
 expect(record.commitments).toContain("Disponibilizar relatório");
 expect(record.commitments).toContain("00:42:25");
 expect(record.commitments).not.toContain("Ah, eu vou mandar aí");
 expect(block.actions[0].evidence).toBe("Ah, eu vou mandar aí, tá bom?");
 const prompt=source("services/meeting-transcript-draft.ts");
 expect(prompt).toContain("REDAÇÃO PROFISSIONAL DA ATA");
 expect(prompt).toContain("evidence deve preservar o trecho original");
 expect(prompt).toContain("title deve ser uma frase de trabalho formal");
});

test("MEET-R5 neutralizes unsupported identity of new project leader",()=>{
 const summary=guardMeetingNarrative("Durante a reunião, Marcelo assumiu a liderança do projeto em substituição a Varela. Foram debatidos documentos fiscais.");
 expect(summary.flagged).toBe(true);
 expect(summary.text).not.toContain("Marcelo assumiu");
 expect(summary.text).toContain("identidade do novo responsável exige confirmação");
 expect(summary.text).toContain("Foram debatidos documentos fiscais");
 const advances=guardMeetingNarrative("Definida substituição da liderança do projeto por Marcelo em lugar de Varela.");
 expect(advances.flagged).toBe(true);
 expect(advances.text).not.toContain("por Marcelo");
 const ordinary=guardMeetingNarrative("Foram avaliados os registros C100, C170 e 0200.");
 expect(ordinary.flagged).toBe(false);
});

test("MEET-R5 clears uncertain leader attribution and in-meeting demonstrations",()=>{
 const b=normalizeBlockEvidence({actions:[
  {title:"Assumir liderança do projeto em substituição a Varela",owner:"Marcelo",kind:"operational",status:"assumido",evidence:"eu vou estar assumindo o projeto na substituição do Varela"},
  {title:"Compartilhar a tela durante a reunião",owner:"Edson",kind:"operational",status:"proposta",evidence:"Eu posso compartilhar aqui, só um segundo aqui"},
  {title:"Enviar relatório de inconsistências",owner:"Edson",kind:"operational",status:"assumido",evidence:"Vou enviar o relatório"}
 ]},1);
 const merged=mergeEvidence([b]);
 const flags=reviewMeetingEvidence(merged);
 expect(flags.some(flag=>flag.code==="LEADERSHIP_IDENTITY")).toBe(true);
 expect(merged.actions[0].owner).toBe("");
 expect(merged.actions[0].kind).toBe("context");
 expect(merged.actions[1].kind).toBe("context");
 expect(merged.actions[2].kind).toBe("operational");
 const importer=source("components/projects/meeting-transcript-import.tsx");
 expect(importer).toContain("criticalReviewConfirmed");
 expect(importer).toContain("Revise e confirme a atribuição de responsabilidades");
 expect(importer).toContain("Conferi a fonte original");
});

test("MEET-R5 permission denial for meeting list is not misreported as missing migration",()=>{
 const api=source("app/api/projects/[projectId]/meetings/route.ts");
 expect(api).toContain('code==="42501"');
 expect(api).toContain("Sem permissão para consultar reuniões neste ambiente");
 expect(api).toContain('code==="42P01"');
 expect(api).toContain("Tabela de reuniões não disponível");
});

test("MEET-R6 avoids operational cards from in-meeting screen sharing or isolated questions",()=>{
 const block=normalizeBlockEvidence({actions:[
  {title:"Disponibilizar compartilhamento de tela do sistema para acompanhamento",kind:"operational",status:"proposta",evidence:"Eu posso compartilhar aqui, só um segundo aqui."},
  {title:"Apresentar processamento e análise do piloto de setembro de 2020",kind:"operational",status:"assumido",evidence:"O sistema ficou com setembro de 20 como piloto né?"},
  {title:"Ajustar o XML e os arquivos fiscais do pedido piloto",kind:"operational",status:"proposta",evidence:"A gente precisava ajustar o XML do pedido e os arquivos de produtos."}
 ]},1);
 const review=mergeEvidence([block]);
 reviewMeetingEvidence(review);
 expect(review.actions[0].kind).toBe("context");
 expect(review.actions[1].kind).toBe("context");
 expect(review.actions[2].kind).toBe("operational");
 expect(review.actions.filter(a=>a.kind==="operational")).toHaveLength(1);
 expect(review.actions.every(a=>!a.included)).toBe(true);
});

test("MEET-02 verifies an exact source excerpt and retains review provenance",()=>{
 const sourceText="00:42:25 Edson: Vou encaminhar o relatório detalhado de inconsistências.\n";
 const item=normalizeBlockEvidence({actions:[{title:"Encaminhar relatório detalhado de inconsistências",kind:"operational",status:"assumido",owner:"Edson",evidence:"Vou encaminhar o relatório detalhado de inconsistências."}]},1).actions[0];
 const checked=groundEvidenceItem(item,sourceText);
 expect(checked.grounding).toBe("exact");
 expect(checked.sourceOffset).toBeGreaterThan(0);
 expect(checked.kind).toBe("operational");
});

test("MEET-02 rejects fabricated evidence as proof of commitments or responsibilities",()=>{
 const sourceText="Palestrante 1: A equipe discutiu os erros de XML e notas fiscais.";
 const item=normalizeBlockEvidence({actions:[{title:"Marcelo decidiu liberar o sistema amanhã",kind:"operational",owner:"Marcelo",status:"assumido",evidence:"Marcelo decidiu liberar o sistema amanhã"}]},1).actions[0];
 const checked=groundEvidenceItem(item,sourceText);
 expect(checked.grounding).toBe("unverified");
 expect(checked.kind).toBe("review");
 expect(checked.owner).toBe("");
 expect(checked.included).toBe(false);
 expect(checked.verificationNotes.length).toBeGreaterThan(0);
});

test("MEET-02 evidence statistics count only located excerpts, preserving human approval",()=>{
 const transcript="00:14:56 Temos que listar as notas de entrada com substituição tributária.";
 const evidence=mergeEvidence([normalizeBlockEvidence({actions:[
  {title:"Documentar critério tributário das notas",kind:"business_rule",status:"proposta",evidence:"Temos que listar as notas de entrada com substituição tributária."},
  {title:"Publicar release amanhã",kind:"operational",status:"assumido",owner:"Marcelo",evidence:"Marcelo confirmou publicação amanhã."}
 ]},1)]);
 const result=verifyMeetingEvidence(evidence,[transcript]);
 expect(result.total).toBe(2);
 expect(result.verified).toBe(1);
 expect(result.unverified).toBe(1);
 expect(result.actions[0].kind).toBe("business_rule");
 expect(result.actions[1].kind).toBe("review");
 const importer=source("components/projects/meeting-transcript-import.tsx");
 expect(importer).toContain("Verificação independente das evidências");
});

test("MEET-02 duplicate detection flags similar work but retains both source passages",()=>{
 const block=normalizeBlockEvidence({actions:[
  {title:"Revisar e corrigir relatório detalhado de inconsistências fiscais",kind:"operational",status:"proposta",evidence:"Vamos revisar o relatório de inconsistências."},
  {title:"Corrigir e revisar relatório detalhado de inconsistências fiscais",kind:"operational",status:"proposta",evidence:"Podemos corrigir o relatório."}
 ]},1);
 const reviewed=markMeetingDuplicateCandidates(block.actions);
 expect(reviewed).toHaveLength(2);
 expect(reviewed[1].duplicateCandidateOf).toBe(reviewed[0].id);
 expect(reviewed[0].evidence).not.toEqual(reviewed[1].evidence);
 expect(reviewed.every(item=>item.included===false)).toBe(true);
 const ui=source("components/projects/meeting-transcript-import.tsx");
 expect(ui).toContain("Possível duplicidade com");
});

test("MEET-03 independent semantic assessor demotes fiscal requirements but keeps concrete follow-ups",()=>{
 const sourceText="00:02:00 Palestrante 2: No pedido você tem que listar todas as notas de entrada. 00:04:00 Palestrante 3: Vou enviar o relatório para vocês.";
 const rules=normalizeBlockEvidence({actions:[
  {title:"Listar todas as notas de entrada",kind:"operational",status:"assumido",evidence:"No pedido você tem que listar todas as notas de entrada."},
  {title:"Enviar relatório de erros",kind:"operational",status:"assumido",evidence:"Vou enviar o relatório para vocês."}
 ]},1);
 const evidence=mergeEvidence([rules]);
 expect(semanticContext(evidence.actions[0],sourceText)).toContain("No pedido você tem que listar");
 const decisions=parseSemanticAudit({decisions:[
  {id:evidence.actions[0].id,kind:"business_rule",status:"a_confirmar",evidenceSupports:true,commitmentConfirmed:false,reason:"A fala descreve requisito fiscal, sem entrega assumida."},
  {id:evidence.actions[1].id,kind:"operational",status:"assumido",evidenceSupports:true,commitmentConfirmed:true,reason:"Há promessa explícita de enviar o relatório."}
 ]},evidence.actions.map(a=>a.id));
 const report=applySemanticAudit(evidence,decisions);
 expect(report.demoted).toBe(1);
 expect(evidence.actions[0].kind).toBe("business_rule");
 expect(evidence.actions[0].status).toBe("a_confirmar");
 expect(evidence.actions[1].kind).toBe("operational");
 expect(evidence.actions[1].status).toBe("assumido");
 expect(evidence.actions.every(a=>!a.included)).toBe(true);
 expect(evidence.actions[0].semanticReason).toContain("requisito fiscal");
});

test("MEET-03 rejects incomplete second opinion and does not accept unsupported assertions",()=>{
 const part=normalizeBlockEvidence({actions:[{title:"Marcar apresentação do piloto",kind:"operational",status:"assumido",owner:"Marcelo",evidence:"O piloto foi setembro, né?"}]},1);
 const evidence=mergeEvidence([part]);
 expect(()=>parseSemanticAudit({decisions:[]},[evidence.actions[0].id])).toThrow();
 const review=applySemanticAudit(evidence,[{id:evidence.actions[0].id,kind:"review",status:"a_confirmar",
  evidenceSupports:false,commitmentConfirmed:false,reason:"Pergunta sem aceitação de entrega futura."}]);
 expect(review.uncertain).toBe(1);
 expect(evidence.actions[0].kind).toBe("review");
 expect(evidence.actions[0].owner).toBe("");
 const pipeline=source("services/meeting-transcript-draft.ts");
 expect(pipeline).toContain("parseSemanticAudit(data,group.map(item=>item.id))");
 expect(pipeline).toContain("applySemanticAudit(evidence,decisions)");
 expect(pipeline).toContain("KAIROS_SEMANTIC_MODEL");
});
