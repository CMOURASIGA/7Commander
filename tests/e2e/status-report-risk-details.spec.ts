import {expect,test} from "@playwright/test";
const projectId="47e1f15e-92df-49a7-8c5b-fc6d6299aa01";
test.describe("Quadro 4 — riscos reais representados sem inferência",()=>{
 test("Exibe classificação, impacto e ausência de probabilidade sem inventar valores",async({page})=>{
  await page.route("**/api/projects",r=>r.fulfill({json:{data:[{id:projectId,name:"Projeto QA",objective:"Verificação do quadro 4"}]}}));
  await page.route(`**/api/projects/${projectId}/tasks`,r=>r.fulfill({json:{data:{columns:[{key:"todo",cards:[]},{key:"done",cards:[]}]}}}));
  await page.route(`**/api/projects/${projectId}/risks`,r=>r.fulfill({json:{data:[{id:"r1",title:"Problema",status:"aberto",impact:"Integração pode atrasar atendimento. Título: Dificuldades na integração dos módulos",probability:null,mitigation:"Validar fluxo",owner:"Equipe QA"}]}}));
  await page.route(`**/api/projects/${projectId}/decisions`,r=>r.fulfill({json:{data:[]}}));
  await page.route("**/api/status-report/analysis",r=>r.fulfill({json:{data:{analysis:null,periodEvents:0,periodMetrics:null},warning:"Sem IA"}}));
  await page.goto("/status-report");
  const preview=page.frameLocator('iframe[title="Prévia do Status Report"]');
  await expect(preview.getByText("Dificuldades na integração dos módulos")).toBeVisible();
  await expect(preview.getByText(/Probabilidade:/)).toBeVisible();
  await expect(preview.getByText(/Não informada/)).toBeVisible();
  await expect(preview.getByText(/Classificação:/)).toBeVisible();
  await expect(preview.getByText(/Problema/)).toBeVisible();
 });
});
