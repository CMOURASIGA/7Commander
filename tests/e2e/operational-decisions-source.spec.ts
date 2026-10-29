import {expect,test} from "@playwright/test";
const source="47e1f15e-92df-49a7-8c5b-fc6d6299aa01";
test("Central avalia registro de origem via serviço isolado, sem IA externa",async({page})=>{
 let sourceCalls=0;
 await page.route("**/api/operational-decisions/source",async route=>{
   sourceCalls++;
   expect(route.request().postDataJSON()).toMatchObject({module:"projects",id:source});
   await route.fulfill({status:201,json:{data:{id:"synthetic-eval"},mode:"simulation",externalProviderCalled:false}});
 });
 await page.route("**/api/operational-decisions",route=>route.fulfill({json:{mode:"simulation",data:[]}}));
 await page.goto("/operational-decisions");
 await page.getByLabel("ID do registro").fill(source);
 await page.getByRole("button",{name:"Avaliar registro sem IA externa"}).click();
 await expect.poll(()=>sourceCalls).toBe(1);
});
test("Feature flag desativada não mostra ação de avaliação de origem",async({page})=>{
 await page.route("**/api/operational-decisions",route=>route.fulfill({json:{mode:"disabled",data:[]}}));
 await page.goto("/operational-decisions");
 await expect(page.getByRole("button",{name:"Avaliar registro sem IA externa"})).toHaveCount(0);
});
