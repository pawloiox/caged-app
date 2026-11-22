import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { noSeriousA11y, settled } from './helpers';

const ROUTES = [
  '/learn/1',
  '/learn/2',
  '/learn/3',
  '/learn/4',
  '/learn/5',
  '/explore',
  '/scales',
  '/scales?scale=lydian&key=6&p=4',
  '/practice',
  '/train/shape',
  '/train/chord',
  '/train/roots',
  '/train/build',
  '/train/recall',
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
  await expect(page.getByRole('link', { name: /Open chords \(completed\)/ })).toBeVisible();
});

test('headings never skip a level', async ({ page }) => {
  for (const r of ['/learn/1', '/learn/3', '/learn/5', '/explore', '/scales', '/practice', '/train/shape', '/tuner']) {
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
    '/scales',
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

test('pearl inlays shimmer, and stay still with reduced motion', async ({ page }) => {
  await page.goto('/learn/3');
  await expect(page.locator('svg.fb g.pearl').first()).toBeAttached();
  expect(await page.locator('svg.fb animate, svg.fb animateTransform').count()).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('svg.fb g.pearl').first()).toBeAttached();
  expect(await page.locator('svg.fb animate, svg.fb animateTransform').count()).toBe(0);
});

test('the guitar drops in and the page settles under it when the site opens, not on page changes or with reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/learn/3');
  const banner = page.getByRole('banner');
  const drops = () => banner.evaluate((el) => el.getAnimations().length);
  // It starts above the window: pause at the start and the neck is out of sight.
  await banner.evaluate((el) => {
    const a = el.getAnimations()[0]!;
    a.pause();
    a.currentTime = 100;
  });
  expect((await page.locator('nav.neck').boundingBox())!.y).toBeLessThan(-150);
  await banner.evaluate((el) => el.getAnimations()[0]!.finish());
  expect((await page.locator('nav.neck').boundingBox())!.y).toBeCloseTo(6, 0);
  // At rest the header has no transform (the fixed wood behind it depends on that).
  expect(await banner.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  // The page settles in as the guitar lands: the title waits, hidden, then falls into place.
  await expect(page.locator('main h1')).toHaveCSS('opacity', '1');
  await settled(page);
  // Moving between pages keeps the guitar and the page still.
  await page.waitForFunction(() => !('intro' in document.documentElement.dataset));
  await page.locator('nav.neck').getByRole('link', { name: 'Explorer' }).click();
  await expect(page).toHaveURL(/\/explore$/);
  expect(await drops()).toBe(0);
  expect(await page.locator('main').evaluate((m) => m.getAnimations({ subtree: true }).length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
  expect(await drops()).toBe(0);
  await expect(page.locator('main h1')).toHaveCSS('opacity', '1');
  expect(await page.locator('main').evaluate((m) => m.getAnimations({ subtree: true }).length)).toBe(0);
});

test('the wood theme is the default, and the light page stays available and accessible', async ({ page }) => {
  await page.goto('/learn/3');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'View and sound settings' }).click();
  await page.getByRole('radio', { name: 'Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.keyboard.press('Escape');
  await noSeriousA11y(page, 'light /learn/3');
  // The choice holds on the next visit, from the very first paint.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('printing is on white paper without the navigation, whatever the theme', async ({ page }) => {
  await page.goto('/print?key=7');
  await expect(page.locator('h1')).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('nav.neck')).toBeHidden();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe(
    'rgb(255, 255, 255)',
  );
});

test('the navigation is a pinned guitar cut by the window: headstock home, steps and tools on the frets', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/learn/3');
  const banner = page.getByRole('banner');
  // Measure the guitar at rest, after it has dropped in.
  await banner.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  // Headstock, neck and body sit on one line, the neck between the other two. The window's top edge cuts the
  // headstock at the spike of its tip, 6 px above the neck, and the headstock and body art hang from the neck's line.
  const head = await banner.locator('.headstock-art').boundingBox();
  const neck = await page.locator('nav.neck').boundingBox();
  const body = await banner.locator('.body-art').boundingBox();
  expect(head!.x + head!.width).toBeLessThanOrEqual(neck!.x + 1);
  expect(body!.x).toBeLessThan(neck!.x + neck!.width);
  expect(neck!.y).toBeCloseTo(6, 0);
  expect(head!.y).toBeCloseTo(neck!.y - 80, 0);
  expect(body!.y).toBeCloseTo(neck!.y - 120, 0);
  // The controls sit off the art, in a strip below the neck.
  const controls = await banner.locator('.controls').boundingBox();
  expect(controls!.y).toBeGreaterThanOrEqual(neck!.y + neck!.height);
  // The guitar stays pinned while the page scrolls.
  // Retry the scroll: the page may still be growing (fretboards draw after load) when it is first asked.
  await expect
    .poll(() =>
      page.evaluate(() => {
        window.scrollTo(0, 600);
        return window.scrollY;
      }),
    )
    .toBeGreaterThan(300);
  expect((await page.locator('nav.neck').boundingBox())!.y).toBeCloseTo(6, 0);
  // Every fret is visible on a wide screen (nothing hidden under the body).
  const tuner = await page.locator('nav.neck').getByRole('link', { name: 'Tuner' }).boundingBox();
  expect(tuner!.x + tuner!.width).toBeLessThanOrEqual(body!.x + 60);
  await expect(page.locator('nav.neck').getByRole('link', { name: /Open chords/ })).toContainText('Next up');
  // Sound toggles, and View opens the settings.
  const sound = banner.getByRole('button', { name: /Sound (on|off)/ });
  const before = await sound.getAttribute('aria-pressed');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
  await banner.getByRole('button', { name: 'View and sound settings' }).click();
  await expect(page.getByRole('radiogroup', { name: 'Theme' })).toBeVisible();
  await page.keyboard.press('Escape');
  await banner.getByRole('link', { name: 'CAGED Lab home' }).click();
  await expect(page).toHaveURL(/\/(learn\/1)?$/);
});

test('scale library: 2NPS pentatonic boxes and 3NPS patterns, in any key, linkable and playable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/learn/1');
  await page.locator('nav.neck').getByRole('link', { name: 'Scales' }).click();
  await expect(page).toHaveURL(/\/scales$/);
  await expect(page.locator('h1')).toHaveText('Scale patterns');
  const board = page.locator('#scale-board svg.fb');
  // A minor pentatonic, pattern 1: the E-shape box at the 5th fret, two notes on each string.
  await expect(board).toHaveAttribute('aria-label', 'A minor pentatonic, pattern 1, frets 5–8');
  await expect(board.locator('.dot:not(.dim)')).toHaveCount(12);
  await expect(page.getByRole('table', { name: /E frets 5 8; A frets 5 7/ })).toBeVisible();
  // Pattern 3 is the C-shape box; the arrow key walks to the next box up the neck.
  await page.getByRole('radio', { name: '3, C-shape' }).click();
  await expect(board).toHaveAttribute('aria-label', 'A minor pentatonic, pattern 3, frets 9–13');
  await page.locator('h1').click();
  await page.keyboard.press('ArrowLeft');
  await expect(board).toHaveAttribute('aria-label', 'A minor pentatonic, pattern 2, frets 7–10');
  // Three per string: the seven-note scales, seven patterns of eighteen notes.
  await page.getByRole('radio', { name: 'Three (seven-note)' }).click();
  await page.getByRole('radio', { name: 'Dorian' }).click();
  await expect(page.getByRole('radiogroup', { name: 'Pattern' }).getByRole('radio')).toHaveCount(7);
  await expect(board).toHaveAttribute('aria-label', 'A dorian, pattern 1, frets 5–10');
  await expect(board.locator('.dot:not(.dim)')).toHaveCount(18);
  await page.getByRole('radio', { name: 'C♯' }).click();
  await expect(board).toHaveAttribute('aria-label', /^C♯ dorian, pattern 1/);
  await expect(page).toHaveURL(/scale=dorian/);
  await expect(page).toHaveURL(/key=1/);
  // The rest of the neck can be hidden.
  await page.getByLabel('The rest of the neck').uncheck();
  await expect(board.locator('.dot.dim')).toHaveCount(0);
  // Play runs the pattern on the click, and Stop ends it.
  await page.getByRole('button', { name: /Play it up and down/ }).click();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByRole('button', { name: /Play it up and down/ })).toBeVisible();
  // A link opens the same pattern.
  await page.goto('/scales?scale=harmonic-minor&key=9&p=7');
  await expect(board).toHaveAttribute('aria-label', /^A harmonic minor, pattern 7, /);
});
