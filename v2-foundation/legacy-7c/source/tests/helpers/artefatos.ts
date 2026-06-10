import { expect, Locator, Page } from '@playwright/test';
import { ArtifactFixture } from '../fixtures/e2e-data';

export const openWorkspaceArtifactsTab = async (page: Page) => {
  await page.getByTestId('workspace-tab-artifacts').click();
  await expect(page.getByTestId('workspace-new-artifact-button')).toBeVisible();
};

export const artifactRow = (page: Page, artifactName: string): Locator =>
  page.locator('tr[data-testid="artifact-row"]').filter({ hasText: artifactName }).first();

export const createArtifactFromWorkspaceDrawer = async (page: Page, artifact: ArtifactFixture) => {
  await page.getByTestId('workspace-new-artifact-button').click();
  await expect(page.getByTestId('artifact-editor-drawer')).toBeVisible();

  await page.getByTestId('artifact-drawer-name').fill(artifact.name);
  await page.getByTestId('artifact-drawer-type').selectOption(artifact.type);
  await page.getByTestId('artifact-drawer-scope').selectOption(artifact.scope);
  await page.getByTestId('artifact-drawer-format').selectOption(artifact.format);
  await page.getByTestId('artifact-drawer-status').selectOption(artifact.status);
  await page.getByTestId('artifact-drawer-link').fill(artifact.link);
  await page.getByTestId('artifact-drawer-content').fill(artifact.content);
  await page.getByTestId('artifact-drawer-note').fill('Criado pelo teste automatizado');
  await page.getByTestId('artifact-drawer-submit').click();

  await expect(artifactRow(page, artifact.name)).toBeVisible();
};

export const editArtifactCurrentVersion = async (page: Page, artifactName: string, content: string) => {
  const row = artifactRow(page, artifactName);
  await expect(row).toBeVisible();

  await row.getByTestId('artifact-edit-button').click();
  await expect(page.getByTestId('artifact-editor-drawer')).toBeVisible();

  await page.getByTestId('artifact-drawer-content').fill(content);
  await page.getByTestId('artifact-drawer-note').fill('Edicao da versao atual');
  await page.getByTestId('artifact-drawer-submit').click();

  await row.getByTestId('artifact-view-button').click();
  await expect(page.locator('pre').filter({ hasText: content }).first()).toBeVisible();
};

export const createArtifactNewVersion = async (page: Page, artifactName: string, content: string) => {
  const row = artifactRow(page, artifactName);
  await expect(row).toBeVisible();

  await row.getByTestId('artifact-new-version-button').click();
  await expect(page.getByTestId('artifact-editor-drawer')).toBeVisible();

  await page.getByTestId('artifact-drawer-content').fill(content);
  await page.getByTestId('artifact-drawer-note').fill('Nova versao criada pelo teste');
  await page.getByTestId('artifact-drawer-submit').click();

  await expect(row).toContainText('v2');
};

export const openArtifactExternalLink = async (page: Page, artifactName: string, expectedUrl: string) => {
  const row = artifactRow(page, artifactName);
  await expect(row).toBeVisible();

  const popupPromise = page.context().waitForEvent('page');
  await row.getByTestId('artifact-open-link-button').click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  expect(popup.url()).toContain(expectedUrl);
  await popup.close();
};

export const deleteArtifact = async (page: Page, artifactName: string) => {
  const row = artifactRow(page, artifactName);
  await expect(row).toBeVisible();

  await row.getByTestId('artifact-delete-button').click();
  await page.getByTestId('confirm-dialog-confirm-button').click();

  await expect(artifactRow(page, artifactName)).toHaveCount(0);
};
