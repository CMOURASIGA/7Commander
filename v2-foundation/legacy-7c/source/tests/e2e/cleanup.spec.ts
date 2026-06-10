import { expect, test } from '@playwright/test';
import { createE2EData } from '../fixtures/e2e-data';
import { bootLocalSession } from '../helpers/auth';
import { createClient, deleteClient, gotoClients } from '../helpers/clientes';
import { createProject, deleteProject, gotoProjects } from '../helpers/projetos';

test.describe('E2E - Cleanup final', () => {
  test('deve excluir projeto e cliente de teste ao final do fluxo', async ({ page }) => {
    const data = createE2EData('cleanup');

    await bootLocalSession(page);
    await createClient(page, data.client);
    await createProject(page, data.project, data.client.name);

    await deleteProject(page, data.project.name);
    await deleteClient(page, data.client.name);

    await gotoProjects(page);
    await page.getByTestId('projects-search-input').fill(data.project.name);
    await expect(page.getByText(data.project.name)).toHaveCount(0);

    await gotoClients(page);
    await page.getByTestId('clients-search-input').fill(data.client.name);
    await expect(page.getByText(data.client.name)).toHaveCount(0);
  });
});
