import { test, expect } from "@playwright/test";

test.describe("Commander Demo LocalStorage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("autentica localmente, mostra identificação e carrega dashboard", async ({ page }) => {
    await expect(page.getByText(/Ambiente demonstrativo, dados fictícios/i)).toBeVisible();
    await expect(page.getByText("Nuvora Educação", { exact:false }).first()).toBeVisible();
    await expect(page.getByText(/projetos? ativos? em acompanhamento/i)).toBeVisible();
  });

  test("cria cliente e persiste após recarregar", async ({ page }) => {
    await page.goto("/clients");
    await page.getByLabel(/Nome/i).fill("Cliente persistente Demo");
    const create = page.getByRole("button", { name:/Adicionar|Criar|Cadastrar/i }).last();
    await create.click();
    await expect(page.getByText("Cliente persistente Demo")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Cliente persistente Demo")).toBeVisible();
  });

  test("isola empresas e permite alternância", async ({ page }) => {
    await page.goto("/organizations");
    await expect(page.getByText("Nuvora Educação")).toBeVisible();
    await page.getByText("Vértice Logística").click();
    await page.getByRole("button", { name:"Selecionar" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Vértice Logística", {exact:false}).first()).toBeVisible();
  });

  test("restaura a massa original mediante confirmação", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("commander:demo:v2", JSON.stringify({organizations:[],users:[],projects:[]})));
    await page.goto("/settings");
    await page.getByRole("button", {name:"Restaurar dados originais"}).click();
    await page.getByRole("button", {name:"Restaurar dados"}).click();
    await expect(page).toHaveURL(/\/$/);
    const count=await page.evaluate(()=>JSON.parse(localStorage.getItem("commander:demo:v2")||"{}").organizations?.length);
    expect(count).toBe(3);
  });
});
