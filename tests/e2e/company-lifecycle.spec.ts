import {expect,test} from "@playwright/test";
const id="83b2f42a-7ef3-4236-9d32-8f261a419aaa";
test("Desativação e reativação preservam o cadastro na administração",async({page})=>{
 let status="active";
 const methods:string[]=[];
 await page.route("**/api/platform/companies",async route=>{
  const method=route.request().method();methods.push(method);
  if(method==="DELETE"){const body=route.request().postDataJSON();expect(body).toMatchObject({id,confirmation:"DESATIVAR"});status="inactive";}
  if(method==="PUT"){const body=route.request().postDataJSON();expect(body).toMatchObject({id,confirmation:"REATIVAR"});status="active";}
  await route.fulfill({json:method==="GET"?{data:[{id,name:"Empresa QA",slug:"empresa-qa",status,branding:{displayName:"Empresa QA",primaryColor:"#003B73",secondaryColor:"#00AEEF"}}]}:{data:{id,status}}});
 });
 await page.goto("/platform/companies");
 await page.getByRole("button",{name:/Empresa QA/}).click();
 page.once("dialog",dialog=>dialog.accept());
 page.once("dialog",dialog=>dialog.accept("DESATIVAR"));
 await page.getByRole("button",{name:"Desativar empresa"}).click();
 await expect(page.getByText("Empresa desativada sem excluir dados.")).toBeVisible();
 await page.getByRole("button",{name:/Empresa QA/}).click();
 page.once("dialog",dialog=>dialog.accept());
 await page.getByRole("button",{name:"Reativar empresa"}).click();
 await expect(page.getByText("Empresa reativada sem perder os dados.")).toBeVisible();
 expect(methods).toContain("DELETE");expect(methods).toContain("PUT");
});
