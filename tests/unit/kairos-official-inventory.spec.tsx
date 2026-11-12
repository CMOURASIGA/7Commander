import {test,expect} from "@playwright/test";
import {parseMarkdown} from "../../components/ui/markdown-content";
import {requestsOfficialProjectInventory,requestsProjectManagementSummary,renderOfficialProjectInventory,renderProjectManagementSummary} from "../../lib/kairos-official-inventory";

test("Kairos parses multiline Markdown tables into structured headers and rows",()=>{
  const content=[
    "## Atividades do Kanban",
    "| Identificador | Título literal | Estado |",
    "| --- | --- | --- |",
    "| abc-123 | Definir matriz GET/POST | aberta |",
  ].join("\n");
  const blocks=parseMarkdown(content);
  const table=blocks.find(block=>block.type==="table");
  expect(table?.type).toBe("table");
  if(table?.type!=="table")throw new Error("Expected parsed Markdown table");
  expect(table.headers).toEqual(["Identificador","Título literal","Estado"]);
  expect(table.rows).toEqual([["abc-123","Definir matriz GET/POST","aberta"]]);
});

test("official inventory preserves the complete malformed title without LLM paraphrase",()=>{
  const malformed="s abaixo no Kanban, respeitando as seguintes diretrizes:  **Regras de criação** - Criar as atividades somente no projeto Prosperitá. - Todas devem iniciar no status **TO DO**, salv";
  const result=renderOfficialProjectInventory({
    risks:[{id:"risk-6",title:"Aprovação do protótipo sem validação operacional",status:"aberto",probability:"Alto",impact:"Alto"}],
    riskCodes:new Map([["risk-6","R006"]]),
    tasks:{totalAvailable:2,loadedCount:2,truncated:false,openCardsTotal:2,cards:[
      {id:"task-1",title:"Definir matriz GET/POST das integrações",status:"aberta",priority:"media"},
      {id:"task-2",title:malformed,status:"em_andamento",priority:"baixa"},
    ],openCards:[
      {id:"task-1",title:"Definir matriz GET/POST das integrações",status:"aberta",priority:"media"},
      {id:"task-2",title:malformed,status:"em_andamento",priority:"baixa"},
    ]},
  });
  expect(result).toContain(malformed);
  expect(result).toContain("R006");
  expect(result).toContain("de 2.");
  expect(requestsOfficialProjectInventory("Consulte os riscos e atividades do Kanban com códigos oficiais e títulos literais")).toBe(false);
});

test("missing coverage is never described as complete",()=>{
  const rendered=renderOfficialProjectInventory({
    risks:[],riskCodes:null,
    tasks:{totalAvailable:35,loadedCount:30,truncated:true,openCardsTotal:20,cards:[],openCards:[]},
  });
  expect(rendered).toContain("inventário de atividades está parcial");
  expect(rendered).toContain("30 de 35");
});

test("explicit creation request does not enter inventory route",()=>{
  expect(requestsOfficialProjectInventory("Crie riscos e atividades e mostre seus códigos")).toBe(false);
});

test("ordinary management audit stays conversational, technical inventory remains opt-in",()=>{
  const request="Kairos, execute auditoria de consistência dos dados oficiais do projeto: riscos e atividades Kanban";
  expect(requestsOfficialProjectInventory(request)).toBe(false);
  expect(requestsProjectManagementSummary(request)).toBe(true);
  expect(requestsOfficialProjectInventory("Faça uma auditoria técnica completa dos riscos e Kanban")).toBe(true);
  expect(requestsProjectManagementSummary("Crie atividades no Kanban após a auditoria do projeto")).toBe(false);
});

test("management response contains useful evidence without wide UUID tables",()=>{
  const answer=renderProjectManagementSummary({
    projectName:"Prosperitá",risks:[{id:"risk-id",title:"Limitação da API",status:"aberto",probability:"alto",impact:"alto"}],
    riskCodes:new Map([["risk-id","R002"]]),
    tasks:{totalAvailable:2,loadedCount:2,truncated:false,openCardsTotal:2,
      cards:[{id:"task-id",title:"Definir matriz GET/POST",status:"aberta",priority:"media"},
      {id:"malformed",title:"s abaixo no Kanban, respeitando as seguintes diretrizes:",status:"em_andamento",priority:"media"}],
      openCards:[]},
  });
  expect(answer).toContain("R002");
  expect(answer).toContain("Definir matriz GET/POST");
  expect(answer).toContain("título possivelmente derivado de instruções");
  expect(answer).not.toContain("risk-id");
  expect(answer).not.toContain("| ---");
});

test("management summary avoids technical wording and emphasizes next actions",()=>{
  const answer=renderProjectManagementSummary({
    projectName:"Projeto Exemplo",risks:[{id:"risk-1",title:"Ambiente de teste indisponível",status:"aberto",probability:"alta",impact:"alto"}],
    riskCodes:new Map([["risk-1","R001"]]),
    tasks:{totalAvailable:0,loadedCount:0,truncated:false,openCardsTotal:0,cards:[],openCards:[]},
  });
  expect(answer).toContain("Próximos passos");
  expect(answer).toContain("R001");
  expect(answer).not.toContain("consulta de contexto");
  expect(answer).not.toContain("completude dessa fonte");
});
