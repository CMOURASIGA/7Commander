import { expect, test } from '@playwright/test';
import { createE2EData } from '../fixtures/e2e-data';
import { bootLocalSession } from '../helpers/auth';
import { createClient, deleteClient } from '../helpers/clientes';
import { createProject, deleteProject, editProjectNextStep, openWorkspaceFromProject } from '../helpers/projetos';

test.describe('E2E - Projetos', () => {
  test('deve executar CRUD por icones, validar data por calendario e abrir workspace', async ({ page }) => {
    const data = createE2EData('projetos');

    await bootLocalSession(page);
    await createClient(page, data.client);
    await createProject(page, data.project, data.client.name);

    await editProjectNextStep(page, data.project.name, data.project.updatedNextStep);
    await openWorkspaceFromProject(page, data.project.name);

    await expect(page.getByRole('heading', { name: data.project.name })).toBeVisible();
    await expect(page.getByTestId('workspace-tab-overview')).toBeVisible();

    await deleteProject(page, data.project.name);
    await deleteClient(page, data.client.name);
  });
});
