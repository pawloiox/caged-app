import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function fresh(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.locator('h1')).toBeVisible();
}

/** axe: zero serious or critical issues. */
export async function noSeriousA11y(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    bad.map(
      (v) =>
        `${label}: ${v.id} (${v.impact}) ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(' '))
          .join(' | ')}`,
    ),
  ).toEqual([]);
}

export async function stepDone(page: Page, n: number) {
  await expect(
    page.getByRole('link', {
      name: new RegExp(
        `${['Open chords', 'Movable shapes', 'C up the neck', 'Any key', 'Make it musical'][n - 1]} \\(completed\\)`,
      ),
    }),
  ).toBeVisible({ timeout: 10_000 });
}
