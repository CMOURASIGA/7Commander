import {test,expect} from "@playwright/test";
import {parseMarkdown} from "../../components/ui/markdown-content";
import {requestsOfficialProjectInventory,renderOfficialProjectInventory} from "../../lib/kairos-official-inventory";

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
  expect(requestsOfficialProjectInventory("Consulte os riscos e atividades do Kanban com códigos oficiais e títulos literais")).toBe(true);
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

test("consistency audit request resolves to deterministic read-only inventory",()=>{
  expect(requestsOfficialProjectInventory("Kairos, execute auditoria de consistência dos dados oficiais do projeto: riscos e atividades Kanban")).toBe(true);
});
