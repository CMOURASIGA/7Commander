import { expect, test } from '@playwright/test';
import { createE2EData } from '../fixtures/e2e-data';
import { bootLocalSession, gotoRoute } from '../helpers/auth';
import { clientCard, createClient, deleteClient, editClientDescription, gotoClients } from '../helpers/clientes';
import { createProject, deleteProject, gotoProjects } from '../helpers/projetos';

test.describe('E2E - Clientes', () => {
  test('deve executar CRUD por icones e bloquear exclusao com projeto vinculado', async ({ page }) => {
    const data = createE2EData('clientes');

    await bootLocalSession(page);
    await createClient(page, data.client);

    await page.getByTestId('clients-search-input').fill(data.client.name);
    await expect(clientCard(page, data.client.name)).toBeVisible();

    const card = clientCard(page, data.client.name);
    await card.getByTestId('client-view-button').click();
    const modal = page.locator('div.fixed.inset-0').first();
    await expect(modal).toContainText(data.client.name);
    await modal.getByRole('button', { name: 'Fechar' }).click();

    await editClientDescription(page, data.client.name, data.client.updatedDescription);

    await createProject(page, data.project, data.client.name);

    await gotoClients(page);
    const blockedDeleteCard = clientCard(page, data.client.name);
    await expect(blockedDeleteCard).toBeVisible();

    await blockedDeleteCard.getByTestId('client-delete-button').click();
    await page.getByTestId('confirm-dialog-confirm-button').click();
    await expect(page.getByTestId('clients-delete-error-banner')).toBeVisible();
    await expect(page.getByTestId('clients-delete-error-banner')).toContainText('projetos vinculados');

    await expect(clientCard(page, data.client.name)).toBeVisible();

    await deleteProject(page, data.project.name);
    await gotoRoute(page, '/clients');
    await deleteClient(page, data.client.name);

    await gotoProjects(page);
    await expect(page.getByText(data.project.name)).toHaveCount(0);
  });
});
