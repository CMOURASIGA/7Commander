import { expect, test } from '@playwright/test';
import { createE2EData } from '../fixtures/e2e-data';
import { bootLocalSession, gotoRoute } from '../helpers/auth';
import { createArtifactFromWorkspaceDrawer, editArtifactCurrentVersion, openWorkspaceArtifactsTab } from '../helpers/artefatos';
import { createClient, deleteClient } from '../helpers/clientes';
import { createProject, deleteProject, openWorkspaceFromProject } from '../helpers/projetos';

test.describe('E2E - Biblioteca de artefatos', () => {
  test('deve organizar artefatos por projeto e abrir detalhe do projeto', async ({ page }) => {
    const data = createE2EData('biblioteca');

    await bootLocalSession(page);
    await createClient(page, data.client);
    await createProject(page, data.project, data.client.name);
    await openWorkspaceFromProject(page, data.project.name);
    await openWorkspaceArtifactsTab(page);
    await createArtifactFromWorkspaceDrawer(page, data.artifact);

    await gotoRoute(page, '/artifacts');
    await expect(page.getByRole('heading', { name: 'Biblioteca por projeto' })).toBeVisible();

    await page.getByTestId('artifacts-project-search-input').fill(data.project.name);
    const projectCard = page.getByTestId('artifacts-project-card').filter({ hasText: data.project.name }).first();
    await expect(projectCard).toBeVisible();
    await projectCard.getByTestId('artifacts-open-project-button').click();

    await expect(page.getByRole('heading', { name: data.project.name })).toBeVisible();
    await expect(page.locator('tr[data-testid="artifact-row"]').filter({ hasText: data.artifact.name }).first()).toBeVisible();
    await editArtifactCurrentVersion(page, data.artifact.name, data.artifact.editedContent);
    await expect(page.locator('pre').filter({ hasText: data.artifact.editedContent }).first()).toBeVisible();

    await deleteProject(page, data.project.name);
    await deleteClient(page, data.client.name);
  });
});
