import { expect, test } from '@playwright/test';
import { createE2EData } from '../fixtures/e2e-data';
import { bootLocalSession } from '../helpers/auth';
import { createArtifactFromWorkspaceDrawer, createArtifactNewVersion, deleteArtifact, editArtifactCurrentVersion, openArtifactExternalLink, openWorkspaceArtifactsTab } from '../helpers/artefatos';
import { createClient, deleteClient } from '../helpers/clientes';
import { createProject, deleteProject, openWorkspaceFromProject } from '../helpers/projetos';

test.describe('E2E - Artefatos no workspace', () => {
  test('deve criar, editar, versionar, excluir e abrir link externo de artefato', async ({ page }) => {
    const data = createE2EData('artefatos');

    await bootLocalSession(page);
    await createClient(page, data.client);
    await createProject(page, data.project, data.client.name);
    await openWorkspaceFromProject(page, data.project.name);
    await openWorkspaceArtifactsTab(page);

    await createArtifactFromWorkspaceDrawer(page, data.artifact);
    await editArtifactCurrentVersion(page, data.artifact.name, data.artifact.editedContent);
    await createArtifactNewVersion(page, data.artifact.name, data.artifact.versionedContent);
    await openArtifactExternalLink(page, data.artifact.name, 'https://example.com');

    await createArtifactFromWorkspaceDrawer(page, data.artifactToDelete);
    await deleteArtifact(page, data.artifactToDelete.name);
    await expect(page.locator('tr[data-testid="artifact-row"]').filter({ hasText: data.artifactToDelete.name })).toHaveCount(0);

    await deleteProject(page, data.project.name);
    await deleteClient(page, data.client.name);
  });
});
