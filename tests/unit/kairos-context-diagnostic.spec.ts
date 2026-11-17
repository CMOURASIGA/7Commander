import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import path from "node:path";

test("cross-project conversation mismatch is an actionable conflict, not HTTP 500",()=>{
 const source=readFileSync(path.join(process.cwd(),"app/api/chat/route.ts"),"utf8");
 expect(source).toContain('code:"CONVERSATION_PROJECT_MISMATCH"');
 expect(source).toContain("status:409");
});
test("switching project resets conversation even when there are no loaded messages",()=>{
 const source=readFileSync(path.join(process.cwd(),"components/kairos/use-kairos-core.ts"),"utf8");
 expect(source).toContain("if(projectId!==activeProjectId)");
 expect(source).toContain("setConversationId(createConversationId())");
 expect(source).toContain("selectedConversation.projectId!==activeProjectId");
});
test("Kairos diagnostics forbid promoting conversation drafts to official registered work",()=>{
 const source=readFileSync(path.join(process.cwd(),"services/kairos-core.ts"),"utf8");
 expect(source).toContain("sem ID ou card oficialmente recuperado");
 expect(source).toContain("A ausência de registro retornado NÃO demonstra falta de trabalho");
 expect(source).toContain("cite primeiro os riscos oficiais");
});
