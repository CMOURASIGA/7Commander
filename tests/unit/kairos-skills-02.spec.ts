import {test,expect} from "@playwright/test";
import {pickModulesByIntent,loadCapabilityModulesForMessage,loadCorePrompt} from "../../services/capability-modules";
import {readFileSync} from "node:fs";
import {join} from "node:path";
const root=process.cwd();
test("skills 02 route distinct project management intents",()=>{
 const cases: Array<[string,string]>=[
 ["Qual abordagem híbrida combina contrato e Sprints?","tailoring_methodology"],
 ["Definir Product Goal e visão de produto","product_vision_roadmap"],
 ["Calcule throughput e cycle time sem inventar histórico","flow_metrics_forecasting"],
 ["Prepare uma retrospectiva para a saúde da equipe","team_health_retro"],
 ["Avalie uma solicitação de mudança na linha de base","change_control"],
 ["Estruture o business case e termo de abertura","charter_business_case"],
 ["Monte uma EAP WBS com entregáveis","scope_wbs"],
 ["Quais dependências definem o caminho crítico do cronograma?","schedule_management"],
 ];
 for(const [message,id] of cases)expect(pickModulesByIntent(message),message).toContain(id);
});
test("existing skills keep loading with new domains",async()=>{
 const modules=await loadCapabilityModulesForMessage("Qual metodologia híbrida?");
 expect(modules.some(module=>module.id==="tailoring_methodology")).toBeTruthy();
 const core=await loadCorePrompt();
 expect(core).toContain("Não execute escrita por inferência");
 expect(core).toContain("JEV é avaliador consultivo opcional");
});
test("all new skills use distinct frontmatter names, references and LF",()=>{
 const names=["tailoring-methodology","product-vision-roadmap","flow-metrics-forecasting","team-health-retro","change-control","charter-business-case","scope-wbs","schedule-management"];
 for(const name of names){
  const content=readFileSync(join(root,"prompts","skills",name,"SKILL.md"),"utf8");
  expect(content.startsWith("---\nname: "+name+"\ndescription:")).toBeTruthy();
  expect(content.includes("\r")).toBeFalsy();
  expect(content.length).toBeGreaterThan(300);
 }
});
