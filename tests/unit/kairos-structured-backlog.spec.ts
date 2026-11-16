import {test,expect} from "@playwright/test";
import {parseStructuredBacklog} from "../../lib/kairos-structured-backlog";
import {parseInternalReportSelection,applyInternalReportSelection} from "../../lib/reports/internal-report-selection";
import type {ReportData} from "../../lib/scrum/report-data";

test("Kairos Markdown table preserves separate Epics, Features and ten US",()=>{
 const headings="| Épico | Feature | Código da US | Título | Descrição | Correção | Prioridade | Critérios de aceite |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |";
 const rows=[
 ["EP01: Conciliação","F001: Vínculo NF-e","US-001","Vínculo entrada e saída","Como fiscal, quero rastrear.","C01","P0"],
 ["","F002: Classificação","US-002","Classificação fiscal","Como fiscal, quero classificar.","C02","P0"],
 ["","F003: De/para","US-003","Mapeamento de produtos","Como fiscal, quero mapear.","C03","P0"],
 ["","F004: Unidades","US-004","Conversão de unidades","Como fiscal, quero converter.","C04","P0"],
 ["EP02: Validação","F005: EFD","US-005","Conciliação EFD","Como fiscal, quero comparar.","C05","P1"],
 ["","F006: Eventos","US-006","Eventos fiscais","Como fiscal, quero tratar.","C06","P1"],
 ["","F007: Duplicidade","US-007","Controle duplicidade","Como fiscal, quero impedir.","C07","P1"],
 ["EP03: Retornos","F008: SEFAZ","US-008","Retorno SEFAZ","Como fiscal, quero ler.","C08","P1"],
 ["","F009: Painel","US-009","Painel pré-validação","Como fiscal, quero ver.","C09","P2"],
 ["EP04: Aquisição","F010: DF-e","US-010","Importação DF-e","Como técnico, quero investigar.","C10","P2"]
 ];
 const table=headings+"\n"+rows.map(row=>"| "+[...row,"Dado um documento, quando validado, então registrar evidência."].join(" | ")+" |").join("\n");
 const parsed=parseStructuredBacklog(table);
 expect(parsed?.epics).toHaveLength(4);
 expect(parsed?.features).toHaveLength(10);
 expect(parsed?.stories).toHaveLength(10);
 expect(parsed?.stories[7].epicCode).toBe("EP003");
 expect(parsed?.stories[7].featureCode).toBe("F008");
 expect(parsed?.stories[0].priority).toBe("alta");
 expect(parsed?.stories[9].priority).toBe("baixa");
});
test("unstructured narrative never produces fabricated single US",()=>{
 expect(parseStructuredBacklog("É importante revisar os riscos e decidir o planejamento.")).toBeNull();
});
test("internal report selection validates IDs and excludes unselected records",()=>{
 const selection=parseInternalReportSelection({cards:[],risks:[],decisions:[],sprints:[],stories:["story-1"],tasks:[],meetings:[]});
 expect(selection).not.toBeNull();
 expect(parseInternalReportSelection({cards:["x"],risks:"bad",decisions:[],sprints:[],stories:[],tasks:[],meetings:[]})).toBeNull();
 const report={
  scrum:{enabled:true,sprints:[],backlog_stories:0,stories_total:2,tasks_total:1,tasks_done:0},
  governance:{risks_open:0,decisions_pending:0,client_risks:[],client_decisions:[]},
  internal:{stories:[{id:"story-1"},{id:"story-2"}],tasks:[{id:"task-1"}],meetingLines:[]}
 } as unknown as ReportData;
 const filtered=applyInternalReportSelection(report,selection!);
 expect(filtered.internal?.stories).toHaveLength(1);
 expect(filtered.internal?.tasks).toHaveLength(0);
});
