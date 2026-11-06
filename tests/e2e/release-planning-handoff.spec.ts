import {expect,test} from "@playwright/test";
const projectId="47e1f15e-92df-49a7-8c5b-fc6d6299aa01";
const opportunityId="f4f1e0e7-935e-49a7-8c5b-fc6d6299aa02";
test.describe("Release 7Commander — rastreabilidade do planejamento",()=>{
 test("Oportunidade aprovada cria projeto e conduz ao backlog sem repetir",async({page})=>{
  let linked=false;
  await page.route("**/api/projects",r=>r.fulfill({json:{data:[{id:projectId,name:"Projeto QA"}]}}));
  await page.route("**/api/planning?*",r=>r.fulfill({json:{data:[{
   id:opportunityId,kind:"opportunity",title:"Oportunidade QA",description:"Origem de projeto",
   status:"approved",version:2,project_id:linked?projectId:null,source_url:null,payload:{},updated_at:new Date().toISOString()
  }],meta:{total:1,page:1,pageSize:25}}}));
  await page.route("**/api/planning/"+opportunityId+"/create-project",r=>{
   linked=true;return r.fulfill({status:201,json:{data:{projectId,alreadyCreated:false}}});
  });
  await page.goto("/planning");
  await page.getByRole("button",{name:"Oportunidades"}).click();
  await page.getByRole("button",{name:/Oportunidade QA/}).click();
  await expect(page.getByRole("button",{name:"Concluir planejamento e gerar projeto"})).toBeVisible();
  page.once("dialog",dialog=>dialog.accept());
  await page.getByRole("button",{name:"Concluir planejamento e gerar projeto"}).click();
  await expect(page.getByRole("link",{name:"Preparar Kanban deste projeto"})).toHaveAttribute("href",`/planning/backlog?projectId=${projectId}`);
  await expect(page.getByRole("button",{name:"Concluir planejamento e gerar projeto"})).toHaveCount(0);
 });
 test("Handoff para backlog seleciona somente projeto autorizado da lista",async({page})=>{
  await page.route("**/api/projects",r=>r.fulfill({json:{data:[{id:projectId,name:"Projeto QA"}]}}));
  await page.route("**/api/planning?*",r=>r.fulfill({json:{data:[],meta:{total:0}}}));
  await page.goto(`/planning/backlog?projectId=${projectId}`);
  await expect(page.getByRole("combobox",{name:"Projeto"})).toHaveValue(projectId);
 });
});
