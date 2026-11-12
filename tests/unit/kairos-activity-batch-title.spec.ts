import {test,expect} from "@playwright/test";
import {parseKanbanActivityBatch} from "../../services/kairos-activity-batch";

test("instrucoes nao podem virar titulo de card",()=>{
 const input=[
  "Crie atividades:",
  "ATV-01 | Regras de criação, respeitando as seguintes diretrizes",
  "Descrição: texto de instrução.",
  "Critério de aceite: não persistir.",
 ].join("\n");
 expect(parseKanbanActivityBatch(input)).toEqual([]);
});

test("atividade bem formada permanece válida",()=>{
 const input=[
  "Crie atividades:",
  "ATV-01 | Validar matriz GET/POST",
  "Descrição: confrontar fluxos com a documentação de APIs.",
  "Critério de aceite: matriz revisada e aprovada.",
  "Prioridade: Alta",
 ].join("\n");
 const rows=parseKanbanActivityBatch(input);
 expect(rows).toHaveLength(1);
 expect(rows[0].title).toBe("Validar matriz GET/POST");
});
