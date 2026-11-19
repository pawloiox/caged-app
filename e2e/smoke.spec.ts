import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { noSeriousA11y } from './helpers';

const ROUTES = [
  '/learn/1',
  '/learn/2',
  '/learn/3',
  '/learn/4',
  '/learn/5',
  '/explore',
  '/practice',
  '/train/shape',
  '/train/chord',
  '/train/roots',
  '/train/build',
  '/train/octaves',
  '/train/ear',
  '/train/earhand',
  '/train/order',
  '/train/review',
  '/tuner',
  '/print?key=7',
  '/diagnostics',
];

for (const r of ROUTES) {
  test(`${r} renders without errors and passes axe`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(r);
    await expect(page.locator('h1')).toBeVisible();
    await noSeriousA11y(page, r);
    expect(errors).toEqual([]);
  });
}

test('dark theme passes axe too', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  for (const r of ['/learn/3', '/learn/5', '/train/shape']) {
    await page.goto(r);
    await noSeriousA11y(page, 'dark ' + r);
  }
});

test('offline: the service worker serves the app', async ({ page, context }) => {
  await page.goto('/learn/1');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.goto('/explore');
  await expect(page.locator('h1')).toHaveText('Every chord, every shape');
  await context.setOffline(false);
});

test('audio timing is drift-free over 5 minutes at 140 BPM', async ({ page }) => {
  await page.goto('/diagnostics');
  await page.getByRole('button', { name: 'Run the 5-minute test' }).click();
  const res = page.getByTestId('timing-result');
  await expect(res).toContainText('beats', { timeout: 45_000 });
  const ms = Number(/Worst deviation: ([\d.]+) ms/.exec((await res.textContent()) ?? '')![1]);
  expect(ms).toBeLessThan(1);
  await expect(res).toContainText('700 beats');
});

test('v5 localStorage progress is imported', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(
        'caged-lab:progress',
        JSON.stringify({
          steps: { 'step-1': true },
          xp: 123,
          days: [],
          seen: { s1: ['C', 'A', 'G', 'E', 'D'] },
          stats: {},
          drills: {},
        }),
      );
      sessionStorage.setItem('seeded', '1');
    }
  });
  await page.goto('/learn/2');
  await expect(page.getByText('123', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open chords and roots \(completed\)/ })).toBeVisible();
});

test('headings never skip a level', async ({ page }) => {
  for (const r of ['/learn/1', '/learn/3', '/learn/5', '/explore', '/practice', '/train/shape', '/tuner']) {
    await page.goto(r);
    await expect(page.locator('h1')).toBeVisible();
    const res = await new AxeBuilder({ page }).withRules(['heading-order']).analyze();
    expect(res.violations.map((v) => `${r}: ${v.id}`)).toEqual([]);
  }
});

test('Practice and progress chips lay out as rows, not stacked bars', async ({ page }) => {
  await page.goto('/practice');
  const days = await page.getByRole('list', { name: 'Last 14 days' }).boundingBox();
  expect(days!.height).toBeLessThan(60);
  await page.goto('/learn/1');
  const chips = await page.getByRole('list', { name: 'Chords passed' }).boundingBox();
  expect(chips!.height).toBeLessThan(60);
  await page.goto('/learn/5');
  const zones = await page.getByRole('list', { name: 'Zones confirmed' }).boundingBox();
  expect(zones!.height).toBeLessThan(100);
});

test('exactly one live region on every page', async ({ page }) => {
  for (const r of [
    '/learn/1',
    '/learn/2',
    '/learn/3',
    '/learn/4',
    '/learn/5',
    '/explore',
    '/practice',
    '/train/shape',
    '/train/review',
    '/tuner',
  ]) {
    await page.goto(r);
    await expect(page.locator('h1')).toBeVisible();
    const n = await page
      .locator('[role="status"], [role="alert"], [aria-live="polite"], [aria-live="assertive"]')
      .count();
    expect(n, r).toBe(1);
  }
});

test('7th chords offer no linking drill (their forms do not always share a root)', async ({ page }) => {
  await page.goto('/explore?key=0&q=dom7');
  await expect(page.getByRole('radio', { name: '7th' })).toBeChecked();
  await expect(page.getByText('Linking drill')).toHaveCount(0);
  await page.getByRole('radio', { name: 'Major' }).click();
  await expect(page.getByText('Linking drill')).toBeVisible();
});

test('no fret-cell label ends with a stray comma', async ({ page }) => {
  for (const r of ['/train/build', '/train/octaves', '/learn/1']) {
    await page.goto(r);
    await expect(page.locator('svg.fb').first()).toBeVisible();
    const bad = await page.$$eval('svg.fb .hit', (els) =>
      els.map((e) => e.getAttribute('aria-label') ?? '').filter((l) => /,\s*$/.test(l)),
    );
    expect(bad, r).toEqual([]);
  }
});
