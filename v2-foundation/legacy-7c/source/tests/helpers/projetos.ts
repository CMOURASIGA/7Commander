import { expect, Locator, Page } from '@playwright/test';
import { ProjectFixture } from '../fixtures/e2e-data';
import { gotoRoute } from './auth';

export const gotoProjects = async (page: Page) => {
  await gotoRoute(page, '/projects');
  await expect(page.getByTestId('nav-projetos')).toBeVisible();
  await expect(page.getByTestId('projects-new-button')).toBeVisible();
};

export const projectCard = (page: Page, projectName: string): Locator =>
  page.getByTestId('project-card').filter({ hasText: projectName }).first();

export const createProject = async (page: Page, project: ProjectFixture, clientName: string) => {
  await gotoProjects(page);
  await page.getByTestId('projects-new-button').click();

  await expect(page.getByTestId('project-form')).toBeVisible();
  await page.getByLabel('Nome do projeto').fill(project.name);
  await page.getByLabel('Cliente').selectOption({ label: clientName });
  await page.getByLabel('Objetivo').fill(project.objective);
  await page.getByLabel('Descricao').fill(project.description);
  await page.getByLabel('Responsavel').fill(project.responsible);
  await page.getByLabel('Metodologia').selectOption(project.methodology);
  await page.getByLabel('Status').selectOption(project.status);
  await page.getByLabel('Saude').selectOption(project.health);

  const startInput = page.getByTestId('project-start-date-input');
  const endInput = page.getByTestId('project-end-date-input');
  const startBefore = await startInput.inputValue();
  const endBefore = await endInput.inputValue();

  await page.getByTestId('project-start-date-picker-button').click();
  await startInput.focus();
  await startInput.press('ArrowUp');

  await page.getByTestId('project-end-date-picker-button').click();
  await endInput.focus();
  await endInput.press('ArrowUp');

  let startAfter = await startInput.inputValue();
  let endAfter = await endInput.inputValue();

  if (startAfter === startBefore) {
    await startInput.press('ArrowDown');
    startAfter = await startInput.inputValue();
  }

  if (endAfter === endBefore) {
    await endInput.press('ArrowDown');
    endAfter = await endInput.inputValue();
  }

  if (!startAfter) {
    await startInput.fill(project.startDateInput);
    startAfter = await startInput.inputValue();
  }

  if (!endAfter) {
    await endInput.fill(project.endDateInput);
    endAfter = await endInput.inputValue();
  }

  expect(startAfter).not.toBe(startBefore);
  expect(endAfter).not.toBe(endBefore);
  await page.getByLabel('Fase').fill(project.phase);
  await page.getByLabel('Proximo passo').fill(project.nextStep);
  await page.getByLabel('Stakeholders (separados por virgula)').fill(project.stakeholders);
  await page.getByTestId('project-form-submit').click();

  await expect(projectCard(page, project.name)).toBeVisible();
};

export const editProjectNextStep = async (page: Page, projectName: string, nextStep: string) => {
  const card = projectCard(page, projectName);
  await expect(card).toBeVisible();

  await card.getByTestId('project-edit-button').click();
  await expect(page.getByTestId('project-form')).toBeVisible();
  await page.getByLabel('Proximo passo').fill(nextStep);
  await page.getByTestId('project-form-submit').click();

  await card.getByTestId('project-view-button').click();
  const modal = page.locator('div.fixed.inset-0').first();
  await expect(modal).toContainText(nextStep);
  await modal.getByRole('button', { name: 'Fechar' }).click();
};

export const openWorkspaceFromProject = async (page: Page, projectName: string) => {
  const card = projectCard(page, projectName);
  await expect(card).toBeVisible();

  await card.getByTestId('project-open-workspace-button').click();
  await expect(page.getByTestId('workspace-tab-overview')).toBeVisible();
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
};

export const deleteProject = async (page: Page, projectName: string) => {
  await gotoProjects(page);
  await page.getByTestId('projects-search-input').fill(projectName);
  const card = projectCard(page, projectName);
  await expect(card).toBeVisible();

  await card.getByTestId('project-delete-button').click();
  await page.getByTestId('confirm-dialog-confirm-button').click();

  await expect(projectCard(page, projectName)).toHaveCount(0);
};
