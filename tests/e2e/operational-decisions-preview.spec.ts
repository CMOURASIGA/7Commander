import {expect,test} from "@playwright/test";

test("prévia somente leitura de registro existente sem chamadas de gravação",async({page})=>{
 const writes:string[]=[];
 await page.route("**/api/operational-decisions/preview?*",async route=>{
  const req=route.request();if(req.method()!=="GET"){writes.push(req.method());return route.fulfill({status:405});}
  const u=new URL(req.url());
  if(!u.searchParams.has("id"))return route.fulfill({json:{data:[{id:"11111111-1111-4111-8111-111111111111",title:"Projeto QA existente"}],readOnly:true}});
  return route.fulfill({json:{data:{module:"projects",sourceId:"11111111-1111-4111-8111-111111111111",sourceTitle:"Projeto QA existente",verdict:{category:"acompanhamento de projeto",severity:"medium",score:52,criteria:["Regra determinística"],evidence:["Sem dados externos"],limitations:["Sem IA externa"]}},readOnly:true,persisted:false,externalProviderCalled:false,quotaConsumed:false}});
 });
 await page.route("**/api/operational-decisions",route=>route.fulfill({json:{data:[],mode:"disabled"}}));
 await page.goto("/operational-decisions");
 await expect(page.getByText("Prévia de registros existentes, sem gravação")).toBeVisible();
 await page.getByLabel("Registro para prévia").selectOption("11111111-1111-4111-8111-111111111111");
 await page.getByRole("button",{name:"Gerar prévia sem salvar"}).click();
 await expect(page.getByLabel("Resultado da prévia")).toContainText("Projeto QA existente");
 await expect(page.getByLabel("Resultado da prévia")).toContainText("Nenhum registro, auditoria, cota ou avaliação foi criado");
 expect(writes).toEqual([]);
});
