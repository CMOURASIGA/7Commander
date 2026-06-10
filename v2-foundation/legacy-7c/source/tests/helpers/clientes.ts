import { expect, Locator, Page } from '@playwright/test';
import { ClientFixture } from '../fixtures/e2e-data';
import { gotoRoute } from './auth';

export const gotoClients = async (page: Page) => {
  await gotoRoute(page, '/clients');
  await expect(page.getByRole('heading', { name: 'Gestao de clientes' })).toBeVisible();
};

export const clientCard = (page: Page, clientName: string): Locator =>
  page.getByTestId('client-card').filter({ hasText: clientName }).first();

export const createClient = async (page: Page, client: ClientFixture) => {
  await gotoClients(page);
  await page.getByTestId('clients-new-button').click();

  await expect(page.getByTestId('client-form')).toBeVisible();
  await page.getByLabel('Nome').fill(client.name);
  await page.getByLabel('Descricao').fill(client.description);
  await page.getByLabel('Responsavel').fill(client.owner);
  await page.getByLabel('Observacoes').fill(client.notes);
  await page.getByTestId('client-form-submit').click();

  await expect(clientCard(page, client.name)).toBeVisible();
};

export const editClientDescription = async (page: Page, clientName: string, description: string) => {
  const card = clientCard(page, clientName);
  await expect(card).toBeVisible();

  await card.getByTestId('client-edit-button').click();
  await expect(page.getByTestId('client-form')).toBeVisible();
  await page.getByLabel('Descricao').fill(description);
  await page.getByTestId('client-form-submit').click();

  await expect(card).toContainText(description);
};

export const deleteClient = async (page: Page, clientName: string) => {
  await gotoClients(page);
  await page.getByTestId('clients-search-input').fill(clientName);

  const card = clientCard(page, clientName);
  await expect(card).toBeVisible();

  await card.getByTestId('client-delete-button').click();
  await page.getByTestId('confirm-dialog-confirm-button').click();

  await expect(clientCard(page, clientName)).toHaveCount(0);
};
