import { expect, Page } from '@playwright/test';

export const gotoRoute = async (page: Page, route: string) => {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  await page.goto(`/#${normalizedRoute}`);
};

export const clearWorkspaceState = async (page: Page) => {
  await page.goto('/#/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
};

const installDialogMocks = async (page: Page) => {
  await page.addInitScript(() => {
    (window as any).__e2eDialogs = [];

    window.confirm = (message?: string) => {
      (window as any).__e2eDialogs.push({ type: 'confirm', message: String(message || '') });
      return true;
    };

    window.alert = (message?: string) => {
      (window as any).__e2eDialogs.push({ type: 'alert', message: String(message || '') });
    };
  });
};

export const getDialogEvents = async (page: Page): Promise<Array<{ type: string; message: string }>> =>
  page.evaluate(() => (window as any).__e2eDialogs || []);

export const clearDialogEvents = async (page: Page) => {
  await page.evaluate(() => {
    (window as any).__e2eDialogs = [];
  });
};

export const loginLocal = async (page: Page) => {
  await page.goto('/#/');
  const appShellMarker = page.getByTestId('nav-inicio');
  if ((await appShellMarker.count()) === 0) {
    await page.evaluate(() => {
      localStorage.setItem(
        '7c-commander-auth',
        JSON.stringify({
          state: {
            user: {
              email: 'e2e.local@7c.test',
              name: 'E2E Local',
              provider: 'google',
            },
            loadingSession: false,
          },
          version: 0,
        })
      );
    });
    await page.reload();
  }

  await expect(page.getByTestId('nav-inicio')).toBeVisible();
};

export const bootLocalSession = async (page: Page) => {
  await installDialogMocks(page);
  await clearWorkspaceState(page);
  await loginLocal(page);
};
