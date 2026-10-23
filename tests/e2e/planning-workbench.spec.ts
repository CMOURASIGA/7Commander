import {expect,test} from "@playwright/test";

test.describe("SPEC 01–05 — UI de planejamento (dados sintéticos)",()=>{
 test("Prospect e oportunidade sem exposição de fonte externa",async({page})=>{
  const received:unknown[]=[];
  await page.route("**/api/projects",route=>route.fulfill({json:{data:[{id:"47e1f15e-92df-49a7-8c5b-fc6d6299aa01",name:"Projeto QA"}]}}));
  await page.route("**/api/planning?*",route=>route.fulfill({json:{data:[],meta:{total:0,page:1,pageSize:25}}}));
  await page.route("**/api/planning",async(route)=>{
   if(route.request().method()==="POST"){received.push(route.request().postDataJSON());await route.fulfill({status:201,json:{data:{id:"qa",status:"draft"}}});return;}
   await route.fulfill({json:{data:[],meta:{total:0,page:1}}});
  });
  await page.goto("/planning");
  await expect(page.getByRole("heading",{name:"Planejamento e oportunidades"})).toBeVisible();
  await page.getByLabel("Título").fill("Prospect QA sintético");
  await page.getByLabel("Descrição e contexto").fill("Teste sem informação real de cliente.");
  await page.getByRole("button",{name:"Criar rascunho"}).click();
  await expect.poll(()=>received.length).toBe(1);
  expect(received[0]).toMatchObject({kind:"prospect",title:"Prospect QA sintético"});
  await page.getByRole("button",{name:"Oportunidades"}).click();
  await expect(page.getByText("Prospect vinculado")).toBeVisible();
 });
 test("A matriz não apresenta score sem evidência",async({page})=>{
  await page.route("**/api/projects",route=>route.fulfill({json:{data:[{id:"47e1f15e-92df-49a7-8c5b-fc6d6299aa01",name:"Projeto QA"}]}}));
  await page.route("**/api/planning/coverage?*",route=>route.fulfill({json:{data:[],meta:{score:null}}}));
  await page.route("**/api/planning?*",route=>route.fulfill({json:{data:[],meta:{total:0}}}));
  await page.goto("/planning/coverage");
  await expect(page.getByRole("heading",{name:"Matriz de aderência"})).toBeVisible();
  await page.getByLabel("Projeto").selectOption("47e1f15e-92df-49a7-8c5b-fc6d6299aa01");
  await expect(page.getByText("Sem pontuação verificada")).toBeVisible();
 });
});
