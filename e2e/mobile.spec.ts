import { expect, test } from '@playwright/test';
import { noSeriousA11y } from './helpers';

for (const r of ['/learn/1', '/learn/2', '/learn/3', '/learn/5', '/explore', '/practice', '/train/shape', '/tuner']) {
  test(`390px phone: ${r} fits, uses the upright neck and 44px targets`, async ({ page }) => {
    await page.goto(r);
    await expect(page.locator('h1')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const boards = await page.locator('.board-wrap').count();
    if (boards) expect(await page.locator('.board-wrap.vertical').count()).toBe(boards);
    const small = await page.$$eval(
      'main .btn, main [role=radio], main .shape-btn, .nav-item, .chip, .knob-btn, .mic-led, main .chord-card, main .check, main .rowbtn, main .tap-link',
      (els) =>
        els
          .filter((e) => (e as HTMLElement).offsetParent !== null)
          .map((e) => ({ t: (e.textContent ?? '').trim().slice(0, 30), h: e.getBoundingClientRect().height }))
          .filter((x) => x.h < 43.5),
    );
    expect(small).toEqual([]);
    await noSeriousA11y(page, 'mobile ' + r);
  });
}

test('390px phone: Step 5 always has a Stop control in view, and never two', async ({ page }) => {
  await page.goto('/learn/5');
  await page.getByRole('button', { name: /Play the loop/ }).click();
  // The page's own bar is on screen: no floating mini-player on top of it.
  await expect(page.getByRole('region', { name: 'Now playing' })).toHaveCount(0);
  // Scroll the bar away: the mini-player takes over.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole('region', { name: 'Now playing' })).toBeVisible();
  await page.getByRole('region', { name: 'Now playing' }).getByRole('button', { name: /Stop/ }).click();
});

test('390px phone: shapes are reached with 44px jump buttons, not thin zone bars', async ({ page }) => {
  await page.goto('/learn/3');
  const jump = page.getByRole('group', { name: 'Jump to a shape' }).getByRole('button');
  await expect(jump.first()).toBeVisible();
  expect(await jump.count()).toBeGreaterThanOrEqual(5);
  await expect(jump.first()).toHaveAccessibleName(/^C\s+shape, frets\s*0–3$/);
  await jump.nth(3).click();
  await expect(jump.nth(3)).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('svg.fb g.zone[role="button"]').count()).toBe(0);
});

test('390px phone: open-string cells on the upright neck are 44px tall', async ({ page }) => {
  await page.goto('/learn/1');
  const box = await page.getByRole('button', { name: /^high e string, open/ }).boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test('390px phone: Step 5 draws only the zone on the upright neck', async ({ page }) => {
  await page.goto('/learn/5');
  const board = page.locator('#p5-board svg');
  await expect(board).toBeVisible();
  // Default zone is frets 3–7: the window covers about frets 2–8, not the whole 15-fret neck.
  expect(await board.getByRole('button', { name: /fret 15,/ }).count()).toBe(0);
  expect(await board.getByRole('button', { name: /fret 5,/ }).count()).toBe(6);
  const vb = (await board.getAttribute('viewBox'))!.split(' ').map(Number);
  expect(vb[3]!).toBeLessThan(500);
});

test('390px phone: Train Ear + hand draws only the zone on the upright neck', async ({ page }) => {
  await page.goto('/train/earhand');
  await page.getByRole('group', { name: 'Answers' }).getByRole('button').first().click();
  const board = page.locator('svg.fb');
  await expect(board).toBeVisible();
  expect(await board.getByRole('button', { name: /fret 15,/ }).count()).toBe(0);
});

test('390px phone: the neck is a drawer from the left, opened with Menu', async ({ page }) => {
  await page.goto('/scales');
  await expect(page.locator('h1')).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Lessons and tools' });
  const menu = page.getByRole('button', { name: 'Menu' });
  // Closed: the frets are out of sight and out of reach.
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(nav.getByRole('link', { name: 'Explorer' })).toBeHidden();
  expect((await menu.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  // Open: it slides in from the left edge, on the current page's fret.
  await menu.tap();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  const scales = nav.getByRole('link', { name: 'Scales' });
  await expect(scales).toBeFocused();
  await expect(nav).toHaveClass(/open/);
  await page.waitForTimeout(400);
  const box = (await nav.boundingBox())!;
  expect(box.x).toBe(0);
  expect(box.height).toBeGreaterThanOrEqual(800);
  // Every fret is a full tap target.
  for (const l of await nav.getByRole('link').all()) expect((await l.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await noSeriousA11y(page, 'mobile drawer');
  // Tab stays in the drawer: from the last fret it goes round to the home headstock.
  await nav.getByRole('link', { name: 'Tuner' }).focus();
  await page.keyboard.press('Tab');
  await expect(nav.getByRole('link', { name: 'CAGED Lab home' })).toBeFocused();
  // Escape closes it, back on Menu.
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
  // Tapping the page beside it closes it too.
  await menu.tap();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.mouse.click(370, 600);
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  // A fret goes to its page and the drawer closes, with focus on the new heading.
  await menu.tap();
  await nav.getByRole('link', { name: 'Explorer' }).tap();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('h1')).toBeFocused();
});
