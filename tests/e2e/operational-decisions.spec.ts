import {expect,test} from "@playwright/test";
test("Central nativa mostra estado desativado sem chamar provedor externo",async({page})=>{
 await page.route("**/api/operational-decisions",route=>route.fulfill({json:{mode:"disabled",data:[]}}));
 await page.goto("/operational-decisions");
 await expect(page.getByRole("heading",{name:"Central de Decisões Operacionais"})).toBeVisible();
 await expect(page.getByText(/Funcionalidade desativada por padrão/)).toBeVisible();
 await expect(page.getByText(/Nenhuma avaliação registrada/)).toBeVisible();
});
test("Central simula dados fictícios com revisão humana",async({page})=>{
 let created=false;
 await page.route("**/api/operational-decisions",route=>{
  if(route.request().method()==="POST"){created=true;return route.fulfill({status:201,json:{data:{id:"qa"}}});}
  return route.fulfill({json:{mode:"simulation",data:created?[{id:"qa",module:"projects",entity_type:"synthetic",status:"pending_review",provider:"simulation-v1",created_at:new Date().toISOString(),verdict:{category:"acompanhamento de projeto",severity:"medium",score:52,criteria:[],evidence:["Fato sintético"],limitations:["Sem modelo externo"]}}]:[]}});
 });
 await page.goto("/operational-decisions");
 await page.getByLabel("Título fictício").fill("Projeto QA sintético");
 await page.getByLabel("Contexto fictício").fill("Falta atualização do responsável para a tarefa fictícia.");
 await page.getByRole("button",{name:"Simular avaliação"}).click();
 await expect(page.getByText("Fato sintético")).toBeVisible();
 await expect(page.getByRole("button",{name:"Aceitar"})).toBeVisible();
});
