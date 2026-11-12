/**
 * Deterministic read-only inventories: official titles and codes never pass through
 * generative rephrasing. The caller must supply already authorized tenant-scoped data.
 */
export type InventoryRisk = {
  id:string; title:string; status:string; probability:string; impact:string;
};
export type InventoryTask = {id:string;title:string;status:string;priority:string};
export type InventorySnapshot = {
  totalAvailable:number|null;loadedCount:number;truncated:boolean;
  openCardsTotal:number;cards:InventoryTask[];openCards:InventoryTask[];
};
function normalize(text:string):string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}
export function requestsOfficialProjectInventory(message:string):boolean {
  const value=normalize(message);
  return /\b(riscos|risco)\b/.test(value)
    && /\b(kanban|atividades|cards|tarefas)\b/.test(value)
    && /\b(codigos?|identificadores?|titulos? literais?|registros oficiais|todos os riscos|auditoria|consistencia|confiabilidade|dados oficiais)\b/.test(value)
    && !/\b(crie|criar|cadastre|cadastrar|registre|registrar|altere|exclua|apague|mova)\b/.test(value);
}
function literal(text:string):string {
  // Prevent titles from introducing Markdown control structures.
  return text.replace(/\\/g,"\\\\").replace(/\|/g,"\\|").replace(/\r?\n/g," ⏎ ").replace(/\x60/g,"'");
}
export function renderOfficialProjectInventory(params:{
  risks:InventoryRisk[];
  riskCodes:ReadonlyMap<string,string>|null;
  tasks:InventorySnapshot|null;
}):string {
  const {risks,riskCodes,tasks}=params;
  const lines=[
    "## Riscos oficiais do projeto",
    "",
    "| Código oficial | ID | Título literal | Probabilidade | Impacto | Situação |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for(const risk of risks){
    lines.push("| "+[
      riskCodes?.get(risk.id)??"Não disponível",risk.id,risk.title,
      risk.probability||"Não avaliada",risk.impact||"Não avaliado",risk.status,
    ].map(literal).join(" | ")+" |");
  }
  if(!risks.length)lines.push("| Não disponível | - | Nenhum risco retornado; confirmar sucesso da consulta antes de concluir que está vazio | - | - | - |");
  lines.push("","**Riscos retornados pela consulta:** "+risks.length+".",
    "","## Atividades oficiais do Kanban","");
  if(!tasks){
    lines.push("Consulta indisponível. Não é possível afirmar que não há atividades.");
  }else{
    lines.push("| Identificador | Título literal | Estado | Prioridade |",
      "| --- | --- | --- | --- |");
    for(const task of tasks.cards){
      lines.push("| "+[task.id,task.title,task.status,task.priority].map(literal).join(" | ")+" |");
    }
    if(!tasks.cards.length)lines.push("| - | Nenhuma atividade retornada | - | - |");
    lines.push("", "**Registros consultados no Kanban:** "+tasks.loadedCount+
      (tasks.totalAvailable===null?" (total existente não disponível).":" de "+tasks.totalAvailable+"."));
    lines.push("**Atividades exibidas (incluindo concluídas):** "+tasks.cards.length+".");
    if(tasks.truncated||tasks.cards.length<tasks.loadedCount){
      lines.push("**Limitação:** o inventário de atividades está parcial. Não considere esta lista completa.");
    }else{
      lines.push("**Truncamento:** não identificado na consulta de atividades.");
    }
  }
  lines.push("","**Limites de confiabilidade:** este inventário não comprova a completude dos riscos nem verifica Backlog, Sprints ou Decisões. Não classifique fontes não consultadas como vazias. Associações temáticas não comprovam vínculos formais. Sem IDs ou códigos disponíveis, a confiabilidade é indeterminada.","","Os títulos exibidos foram preservados literalmente, inclusive registros possivelmente malformados. Nenhuma atividade ou risco foi alterado.");
  return lines.join("\n");
}
