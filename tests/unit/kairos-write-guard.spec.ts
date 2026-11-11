import {test,expect} from "@playwright/test";
import {detectCreateTaskIntent,detectMoveTaskIntent,detectConfirmRiskIntent} from "../../services/kairos-core";

test("risk review with tasks and explicit negative instruction never creates cards or risks",()=>{
 const prompt="Kairos, realize uma análise completa dos riscos do projeto Prosperitá | Experiência Digital e Integração de Sistemas.\n\nConsulte primeiro os riscos oficialmente cadastrados no Commander e, em seguida, avalie riscos adicionais com base no contexto, atividades, decisões, backlog e dependências técnicas e operacionais.\n\nPara cada risco, apresente: 1. Título e identificação real, quando cadastrado. 2. Classificação: [CONFIRMADO] risco oficial ou [HIPÓTESE] risco sugerido. Não crie nem modifique riscos automaticamente.";
 expect(detectCreateTaskIntent(prompt)).toBeNull();
 expect(detectMoveTaskIntent(prompt)).toBeNull();
 expect(detectConfirmRiskIntent(prompt)).toBeNull();
});
test("long analytical instructions mentioning creation never execute",()=>{
 const messages=["Analise os riscos e crie sugestões de atividades, mas não crie registros.","Para criar uma atividade, primeiro consulte as decisões.", "Quais são os riscos? Não crie nem modifique atividades.","Liste tarefas que devemos criar na fase 2.", "Avalie e crie um plano, sem cadastrar atividade."];
 for(const message of messages){expect(detectCreateTaskIntent(message)).toBeNull();expect(detectConfirmRiskIntent(message)).toBeNull();}
});
test("explicit quoted single task command remains supported",()=>{
 expect(detectCreateTaskIntent('Kairos, crie uma tarefa "Validar protótipo" em TO DO')).toEqual({title:"Validar protótipo",columnKey:"todo"});
 expect(detectMoveTaskIntent('Mova a tarefa "Validar protótipo" para DOING')).toEqual({title:"Validar protótipo",columnKey:"doing"});
 expect(detectConfirmRiskIntent('Registre o risco "Indisponibilidade da API Vita Primo"')).toEqual({title:"Indisponibilidade da API Vita Primo"});
});
test("never turn a free-form pasted risk analysis into a title",()=>{
 expect(detectCreateTaskIntent('Crie uma tarefa no futuro, mas primeiro analise o contexto: atividades, decisões, backlog e riscos.')).toBeNull();
 expect(detectCreateTaskIntent("Kairos, crie atividade: analise riscos, decisões e dependências")).toBeNull();
});
