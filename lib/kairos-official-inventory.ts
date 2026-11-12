/**
 * Deterministic read-only inventories: official titles and codes never pass through
 * generative rephrasing. The caller must supply already authorized tenant-scoped data.
 */
export type InventoryRisk = {
  id:string; title:string; status:string; probability:string; impact:string; owner?:string;
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
  // A complete, wide technical listing is opt-in, never the default chat experience.
  return /\b(inventario tecnico|auditoria tecnica|tabela completa|listagem completa de ids|listagem tecnica)\b/.test(value)
    && !/\b(crie|criar|cadastre|cadastrar|registre|registrar|altere|exclua|apague|mova)\b/.test(value);
}
export function requestsProjectManagementSummary(message:string):boolean {
  const value=normalize(message);
  return /\b(auditoria|auditar|consistencia|confiabilidade|diagnostico|panorama)\b/.test(value)
    && /\b(projeto|riscos?|kanban|backlog|decisoes|dados oficiais)\b/.test(value)
    && !/\b(crie|criar|cadastre|cadastrar|registre|registrar|altere|exclua|apague|mova)\b/.test(value);
}
export function renderProjectManagementSummary(params:{
  projectName:string;
  risks:InventoryRisk[];
  riskCodes:ReadonlyMap<string,string>|null;
  tasks:InventorySnapshot|null;
  decisions:Array<{id:string;title:string;status:string}>;
}):string{
  const {projectName,risks,riskCodes,tasks,decisions}=params;
  const openRisks=risks.filter(risk=>!["mitigado","encerrado"].includes(normalize(risk.status)));
  const lines=[
    "## Análise do projeto "+projectName,
    "",
    "Consultei "+risks.length+" risco(s) cadastrado(s), dos quais "+openRisks.length+" ainda não estão encerrados ou mitigados.",
  ];
  for(const risk of openRisks.slice(0,6)){
    const code=riskCodes?.get(risk.id);
    lines.push("- "+(code?code+" · ":"")+risk.title+".");
  }
  if(risks.length>6)lines.push("Há outros "+(risks.length-6)+" risco(s) no cadastro; peça o inventário técnico para visualizar todos.");
  if(!riskCodes||risks.some(risk=>!riskCodes.has(risk.id)))
    lines.push("Os códigos de parte dos riscos não foram confirmados; não é possível validar toda a rastreabilidade.");
  if(!tasks){
    lines.push("**Kanban:** consulta indisponível. Não é possível afirmar quantas atividades existem.");
  }else{
    const total=tasks.totalAvailable;
    lines.push("**Kanban:** "+tasks.loadedCount+" atividade(s) recuperada(s)"+(total===null?" (total não verificável).":" de "+total+"."));
    if(tasks.truncated)lines.push("A consulta do Kanban é parcial.");
    const suspicious=tasks.cards.filter(card=>/respeitando as seguintes diretrizes|regras de cria[cç][aã]o|s abaixo no kanban/i.test(card.title));
    if(suspicious.length)lines.push("**Qualidade do cadastro:** "+suspicious.length+" atividade(s) têm título possivelmente derivado de instruções. Recomendo revisão manual, sem exclusão automática.");
    const meaningful=tasks.cards.filter(card=>!suspicious.includes(card)).slice(0,4);
    if(meaningful.length)lines.push("Atividades identificadas: "+meaningful.map(card=>card.title+" ("+card.status+")").join("; ")+".");
  }
  lines.push("**Decisões:** "+decisions.length+" registro(s) recuperado(s) pela consulta de contexto.");
  for(const decision of decisions.slice(0,3))lines.push("- "+decision.title+" ("+decision.status+").");
  lines.push("","### Avaliação gerencial",
    "Os riscos merecem acompanhamento, mas os registros, por si só, não comprovam execução, atraso ou conclusão de entregas.",
    "Sugiro revisar a atividade com título incorreto e confirmar as responsabilidades e próximos passos dos riscos abertos.",
    "",
    "Posso detalhar os riscos prioritários ou abrir um inventário técnico com IDs completos. Nenhum registro foi alterado.");
  return lines.join("\n");
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
    "| Código oficial | ID | Título literal | Probabilidade | Impacto | Situação | Responsável |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for(const risk of risks){
    lines.push("| "+[
      riskCodes?.get(risk.id)??"Não disponível",risk.id,risk.title,
      risk.probability||"Não avaliada",risk.impact||"Não avaliado",risk.status,risk.owner||"Não informado",
    ].map(literal).join(" | ")+" |");
  }
  if(!risks.length)lines.push("| Não disponível | - | Nenhum risco retornado; confirmar sucesso da consulta antes de concluir que está vazio | - | - | - | - |");
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
