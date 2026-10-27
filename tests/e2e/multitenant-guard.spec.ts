import { expect, test } from "@playwright/test";

const CONSULT = "43973606-0c05-4934-a057-9f2710899eba";
const FOREIGN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

test.describe("Multiempresa — UX com dados sintéticos, sem banco de produção", () => {
 test("não ativa empresa diferente antes de isolamento completo", async ({page}) => {
  await page.route("**/api/organizations/mine", route => route.fulfill({json:{data:[
   {id:CONSULT,role:"owner",organization:{id:CONSULT,name:"Consult Services",slug:"consult-services",status:"active"}},
   {id:FOREIGN,role:"member",organization:{id:FOREIGN,name:"Empresa QA Sintética",slug:"qa",status:"active"}},
  ]}}));
  await page.route("**/api/organizations/select", route => route.fulfill({json:{data:{organizationId:FOREIGN,role:"member",operationalIsolationReady:false}}}));
  await page.goto("/organizations");
  await expect(page.getByRole("heading",{name:"Selecionar empresa"})).toBeVisible();
  await page.getByText("Empresa QA Sintética").click();
  await page.getByRole("button",{name:"Selecionar",exact:true}).click();
  await expect(page.getByText(/troca operacional bloqueada/i)).toBeVisible();
  const selected = await page.evaluate(()=>sessionStorage.getItem("7commander:active-organization"));
  expect(selected).toBeNull();
 });
 test("nega seleção não autorizada sem atualizar sessão", async ({page}) => {
  await page.route("**/api/organizations/mine", route => route.fulfill({json:{data:[
   {id:CONSULT,role:"owner",organization:{id:CONSULT,name:"Consult Services",slug:"consult-services",status:"active"}},
  ]}}));
  await page.route("**/api/organizations/select", route => route.fulfill({status:403,json:{error:"Sem acesso à organização."}}));
  await page.goto("/organizations");
  await page.getByRole("button",{name:"Selecionar",exact:true}).click();
  await expect(page.getByText(/Sem acesso à organização/i)).toBeVisible();
  const selected = await page.evaluate(()=>sessionStorage.getItem("7commander:active-organization"));
  expect(selected).toBeNull();
 });
});
