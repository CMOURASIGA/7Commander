import {test,expect} from "@playwright/test";
import {pickModulesByIntent} from "../../services/capability-modules";
import {parseKanbanActivityBatch,hasExplicitBatchCreationRequest} from "../../services/kairos-activity-batch";
const batch=[
 'Kairos, crie as 2 atividades abaixo no Kanban do projeto **Prosperitá | Experiência Digital**, vinculado à 7Consulting.',
 '**ATV-01 | Validar protótipo**',
 'Prioridade: Alta',
 'Data-alvo: 13/11/2026',
 'Descrição: Demonstrar e validar protótipo com a cliente.',
 'Critério de aceite: Feedback documentado.',
 '**ATV-02 | Definir matriz GET/POST**',
 'Prioridade: Crítica',
 'Descrição: Identificar sistemas e métodos HTTP.',
 'Critério de aceite: Matriz registrada e revisada.'
].join("\n\n");
test("skill routing considers multiple project domains",()=>{
 const selected=pickModulesByIntent("Analise riscos, Scrum e integrações do projeto Prosperitá");
 expect(selected).toContain("project_diagnosis");
 expect(selected).toContain("risk_analysis");
 expect(selected).toContain("scrum_management");
 expect(selected).toContain("integrations_and_data");
 expect(pickModulesByIntent("Quais são os riscos?")).toContain("risk_analysis");
 expect(pickModulesByIntent("Crie atividades no Kanban")).toContain("kanban_execution");
});
test("explicit ATV batch parses metadata, date, priority and acceptance",()=>{
 expect(hasExplicitBatchCreationRequest(batch)).toBe(true);
 const rows=parseKanbanActivityBatch(batch);
 expect(rows).toHaveLength(2);
 expect(rows[0].dueDate).toBe("2026-11-13");
 expect(rows[0].priority).toBe("alta");
 expect(rows[0].description).toContain("Referência funcional: ATV-01");
 expect(rows[0].description).toContain("Critério de aceite:");
 expect(rows[1].priority).toBe("critica");
 expect(rows[1].dueDate).toBeNull();
});
test("batch creation refuses invalid or duplicate functional IDs",()=>{
 expect(hasExplicitBatchCreationRequest(batch.replace("crie as 2 atividades","avalie as 2 atividades"))).toBe(false);
 expect(parseKanbanActivityBatch(batch.replace("ATV-02","ATV-01"))).toEqual([]);
 expect(parseKanbanActivityBatch(batch.replace("13/11/2026","31/02/2026"))).toEqual([]);
 expect(parseKanbanActivityBatch(batch.replace("Feedback documentado.",""))).toEqual([]);
});
