import fs from "node:fs/promises";
import path from "node:path";

export type CapabilityModuleId =
 | "project_diagnosis" | "risk_analysis" | "kanban_execution" | "backlog_planning"
 | "scrum_management" | "decision_governance" | "executive_report"
 | "integrations_and_data" | "process_bpmn" | "stakeholder_governance"
 | "meeting_followup" | "quality_review" | "document_analysis" | "writing_support" | "study_translation"
 | "tailoring_methodology" | "product_vision_roadmap" | "flow_metrics_forecasting"
 | "team_health_retro" | "change_control" | "charter_business_case"
 | "scope_wbs" | "schedule_management";

type ModuleSelection = {id:CapabilityModuleId;prompt:string};
const MODULE_PATHS:Record<CapabilityModuleId,string[]>={
 project_diagnosis:["project-diagnosis"],risk_analysis:["risk-analysis"],
 kanban_execution:["kanban-execution"],backlog_planning:["backlog-planning"],
 scrum_management:["scrum-management"],decision_governance:["decision-governance"],
 executive_report:["executive-report"],integrations_and_data:["integrations-and-data"],
 process_bpmn:["process-bpmn"],stakeholder_governance:["stakeholder-governance"],
 meeting_followup:["meeting-followup"],quality_review:["quality-review"],
 document_analysis:["document-analysis"],writing_support:["writing-support"],study_translation:["study-and-translation"],
 tailoring_methodology:["tailoring-methodology"],product_vision_roadmap:["product-vision-roadmap"],
 flow_metrics_forecasting:["flow-metrics-forecasting"],team_health_retro:["team-health-retro"],
 change_control:["change-control"],charter_business_case:["charter-business-case"],
 scope_wbs:["scope-wbs"],schedule_management:["schedule-management"]
} as Record<CapabilityModuleId,string[]>;
const CORE_PROMPT_PATHS = [path.join(process.cwd(), "prompts/core/pm-ai-partner.md")];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function pickModulesByIntent(message:string):CapabilityModuleId[]{
 const input=normalizeText(message);
 const selected=new Set<CapabilityModuleId>();
 const add=(regex:RegExp,id:CapabilityModuleId)=>{if(regex.test(input))selected.add(id);};
 add(/projeto|diagnostic|analise geral|escopo|situacao|maturidade|estrategia|valor/, "project_diagnosis");
 add(/risco|mitig|ameaca|contingenc|exposic|probabilidade|impacto/, "risk_analysis");
 add(/kanban|card|atividade|tarefa|to do|doing|done|quadro|wip|aging/, "kanban_execution");
 add(/backlog|epico|feature|user stor|historia|criterio de aceite|invest|roadmap|planejamento/, "backlog_planning");
 add(/scrum|sprint|daily|velocity|burn.down|impedimento/, "scrum_management");
 add(/decis|trade.off|governanca|alternativa|aprovacao/, "decision_governance");
 add(/status report|relatorio|dashboard|indicador|apresentacao executiva/, "executive_report");
 add(/integr|api|endpoint|sistema|http|persist|banco de dados|arquitetura|get\/post|post|patch|payload|autentic/, "integrations_and_data");
 add(/bpmn|fluxo|processo|gateway|handoff|regras de negocio/, "process_bpmn");
 add(/stakeholder|parte interessada|raci|responsabilid/, "stakeholder_governance");
 add(/reuniao|ata|encaminhamento|follow.up|compromisso/, "meeting_followup");
 add(/qualidade|homolog|testes|deploy|producao|aceite|validac/, "quality_review");
 add(/documento|storyboard|transcricao|arquivo|discovery|briefing|leitura estruturada/, "document_analysis");
 add(/escrever|redigir|texto|comunicado|mensagem|proposta|post|artigo/, "writing_support");
 add(/explicar|estudar|prova|revisao didat|traduz|translation|idioma|ingles|espanhol/, "study_translation");
 // Methodology routing complements existing domain skills; it never grants tools or permissions.
 add(/tailoring|preditiv|adaptativ|hibrid|ciclo de vida|metodologia|abordagem de gestao/, "tailoring_methodology");
 add(/product goal|product vision|visao de produto|hipotese de valor|roadmap|release planning|beneficio esperado|resultado de negocio/, "product_vision_roadmap");
 add(/throughput|cycle time|lead time|work item age|aging|wip|cfd|fluxo acumulado|monte carlo|previsao probabilistica|previsao de fluxo/, "flow_metrics_forecasting");
 add(/retrospectiva|retrospective|saude da equipe|lideranca servidora|facilitac|colaborac|sobrecarga do time/, "team_health_retro");
 add(/controle de mudanca|solicitacao de mudanca|change request|baseline alterad|linha de base afetad|impacto da mudanca/, "change_control");
 add(/termo de abertura|business case|charter|justificativa do projeto|criterios de sucesso|viabilidade do projeto/, "charter_business_case");
 add(/eap|wbs|fora de escopo|dicionario da eap|decomposicao de entregaveis|linha de base do escopo/, "scope_wbs");
 add(/cronograma|caminho critico|dependencias de prazo|estimativa de tres pontos|marcos do projeto|planejamento em ondas/, "schedule_management");
 if(!selected.size)selected.add("project_diagnosis");
 return Array.from(selected).slice(0,5);
}

async function safeReadFile(filePath: string): Promise<string> {
  try {
    return (await fs.readFile(filePath, "utf-8")).trim();
  } catch {
    return "";
  }
}

export async function loadCorePrompt(): Promise<string> {
  const parts: string[] = [];
  for (const filePath of CORE_PROMPT_PATHS) {
    const prompt = await safeReadFile(filePath);
    if (prompt) parts.push(prompt);
  }
  if (parts.length) return parts.join("\n\n");

  return [
    "Voce e o Kairos Core: uma inteligencia operacional central, contextual e orientada a projetos.",
    "A voz e interface principal, o texto e modo de apoio/auditoria.",
    "Responda com clareza, objetividade e foco em decisao e execucao.",
  ].join(" ");
}

export async function loadCapabilityModulesForMessage(message: string): Promise<ModuleSelection[]> {
  const selectedIds = pickModulesByIntent(message);
  const result: ModuleSelection[] = [];

  for (const id of selectedIds) {
    for (const slug of MODULE_PATHS[id]) {
      const modulePath=path.join(process.cwd(),"prompts","skills",slug,"SKILL.md");
      const prompt = await safeReadFile(modulePath);
      if (prompt) {
        result.push({ id, prompt });
        break;
      }
    }
  }

  return result;
}
