import { expect, test } from '@playwright/test';
import { bootLocalSession } from '../helpers/auth';

test.describe('E2E - Login e acesso inicial', () => {
  test('deve autenticar no ambiente local e exibir menu principal', async ({ page }) => {
    await bootLocalSession(page);

    await expect(page.getByTestId('nav-inicio')).toBeVisible();
    await expect(page.getByTestId('nav-clientes')).toBeVisible();
    await expect(page.getByTestId('nav-projetos')).toBeVisible();
    await expect(page.getByTestId('nav-artefatos')).toBeVisible();
    await expect(page.getByTestId('nav-agentes')).toBeVisible();
    await expect(page.getByTestId('nav-ajuda')).toBeVisible();
    await expect(page.getByTestId('nav-configuracoes')).toBeVisible();
    await expect(page.getByTestId('theme-toggle-button')).toBeVisible();
  });
});
