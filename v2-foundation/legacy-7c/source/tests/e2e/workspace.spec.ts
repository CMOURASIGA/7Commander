import { expect, test, type Page } from '@playwright/test';
import { createE2EData } from '../fixtures/e2e-data';
import { bootLocalSession } from '../helpers/auth';
import { createClient, deleteClient } from '../helpers/clientes';
import { createProject, deleteProject, openWorkspaceFromProject } from '../helpers/projetos';

const parseRgb = (value: string) => {
  const matches = value.match(/[\d.]+/g);
  if (!matches || matches.length < 3) return { r: 0, g: 0, b: 0 };
  return {
    r: Number(matches[0]),
    g: Number(matches[1]),
    b: Number(matches[2]),
  };
};

const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const normalize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  const nr = normalize(r);
  const ng = normalize(g);
  const nb = normalize(b);
  return 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
};

const contrastRatio = (a: number, b: number) => {
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
};

const getWorkspaceContrastTargets = async (page: Page) =>
  page.evaluate(() => {
    const isTransparent = (color: string) => {
      if (!color || color === 'transparent') return true;
      const rgba = color.match(/rgba?\(([^)]+)\)/i);
      if (!rgba) return false;
      const parts = rgba[1].split(',').map((item) => item.trim());
      if (parts.length < 4) return false;
      return Number(parts[3]) === 0;
    };

    const resolveEffectiveBackground = (element: HTMLElement) => {
      let current: HTMLElement | null = element;
      while (current) {
        const color = window.getComputedStyle(current).backgroundColor;
        if (!isTransparent(color)) return color;
        current = current.parentElement;
      }
      return 'rgb(255, 255, 255)';
    };

    const targets = Array.from(
      document.querySelectorAll('[data-testid="project-info-badge-value"], [data-testid="workspace-overview-info-card-value"]')
    ) as HTMLElement[];

    return targets.map((node) => {
      const container =
        (node.closest('[data-testid="project-info-badge"], [data-testid="workspace-overview-info-card"]') as HTMLElement | null) ||
        (node.parentElement as HTMLElement | null) ||
        node;
      const fg = window.getComputedStyle(node).color;
      const bg = resolveEffectiveBackground(container);
      return { text: node.innerText, fg, bg };
    });
  });

const ensureTheme = async (page: Page, target: 'light' | 'dark') => {
  const button = page.getByTestId('theme-toggle-button');
  const label = (await button.innerText()).toLowerCase();
  const current = label.includes('tema escuro') ? 'light' : 'dark';

  if (current !== target) {
    await button.click();
  }

  await expect.poll(async () => page.evaluate(() => document.documentElement.className)).toContain(
    target === 'light' ? 'light-theme' : 'dark-theme'
  );
};

test.describe('E2E - Workspace e tema', () => {
  test('deve validar destaque dos cards e contraste em tema claro/escuro', async ({ page }) => {
    const data = createE2EData('workspace');

    await bootLocalSession(page);
    await createClient(page, data.client);
    await createProject(page, data.project, data.client.name);
    await openWorkspaceFromProject(page, data.project.name);

    await expect(page.getByTestId('project-info-badge')).toHaveCount(8);
    await expect(page.getByTestId('workspace-overview-info-card')).toHaveCount(4);

    await ensureTheme(page, 'dark');
    const darkTargets = await getWorkspaceContrastTargets(page);
    expect(darkTargets.length).toBeGreaterThan(10);
    for (const target of darkTargets) {
      const ratio = contrastRatio(luminance(parseRgb(target.fg)), luminance(parseRgb(target.bg)));
      expect(ratio, `Dark contrast too low for "${target.text}"`).toBeGreaterThanOrEqual(3);
    }

    await ensureTheme(page, 'light');
    const lightTargets = await getWorkspaceContrastTargets(page);
    expect(lightTargets.length).toBeGreaterThan(10);
    for (const target of lightTargets) {
      const ratio = contrastRatio(luminance(parseRgb(target.fg)), luminance(parseRgb(target.bg)));
      expect(ratio, `Light contrast too low for "${target.text}"`).toBeGreaterThanOrEqual(3);
    }

    await deleteProject(page, data.project.name);
    await deleteClient(page, data.client.name);
  });
});
