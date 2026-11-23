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

test('390px phone: the guitar is a drawer from the right, opened with Menu', async ({ page }) => {
  await page.goto('/scales');
  await expect(page.locator('h1')).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Lessons and tools' });
  const menu = page.getByRole('button', { name: 'Menu' });
  // Closed: the frets are out of sight and out of reach.
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  // It waits drawn just off the right edge, so it slides in at once, and inert, so nothing in it can be reached.
  await expect(nav.getByRole('link', { name: 'Explorer' })).not.toBeInViewport();
  await expect(nav).toHaveJSProperty('inert', true);
  const mb = (await menu.boundingBox())!;
  expect(mb.height).toBeGreaterThanOrEqual(44);
  // Menu sits at the right end of the top row, on the side the drawer comes from.
  expect(mb.x + mb.width).toBeGreaterThan(390 - 24);
  // Open: it slides in from the right edge, on the frets, with the current page's focused.
  await menu.tap();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  const scales = nav.getByRole('link', { name: 'Scales' });
  await expect(scales).toBeFocused();
  await expect(nav).toHaveClass(/open/);
  await expect.poll(async () => Math.round((await nav.boundingBox())!.x + (await nav.boundingBox())!.width)).toBe(390);
  expect((await nav.boundingBox())!.height).toBeGreaterThanOrEqual(800);
  // It opens on the frets: the first step is in view and the headstock is mostly above, there for scrolling up to.
  await expect(nav.getByRole('link', { name: /Step 1/ })).toBeInViewport();
  const head = (await nav.locator('.drawer-headstock').boundingBox())!;
  expect(head.y + head.height).toBeLessThanOrEqual(80);
  // The whole guitar is there: scrolled to the top, the headstock is all in view; to the end, the body.
  await nav.evaluate((e) => (e.scrollTop = 0));
  await expect(nav.locator('.drawer-headstock .headstock-art')).toBeInViewport({ ratio: 0.99 });
  await nav.evaluate((e) => (e.scrollTop = e.scrollHeight));
  await expect(nav.locator('.drawer-body .body-art')).toBeInViewport({ ratio: 0.99 });
  // Close stays at the top however far it is scrolled.
  const close = nav.getByRole('button', { name: 'Close' });
  await expect(close).toBeInViewport();
  // Every fret is a full tap target.
  for (const l of await nav.getByRole('link').all()) expect((await l.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await noSeriousA11y(page, 'mobile drawer');
  // Tab stays in the drawer: from the last fret it goes round to Close, then the home headstock.
  await nav.getByRole('link', { name: 'Tuner' }).focus();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(nav.getByRole('link', { name: 'CAGED Lab home' })).toBeFocused();
  // Escape closes it, back on Menu.
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
  // Tapping the page beside it closes it too.
  await menu.tap();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.mouse.click(20, 600);
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  // A fret goes to its page and the drawer closes, with focus on the new heading.
  await menu.tap();
  await nav.getByRole('link', { name: 'Explorer' }).tap();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('h1')).toBeFocused();
});

test('390px phone: the metronome is an icon in the top row, and plays on through the drawer to another page', async ({
  page,
}) => {
  await page.goto('/learn/1');
  const knob = page.getByRole('button', { name: /^Metronome/ });
  const box = (await knob.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.y).toBeLessThan(60);
  await knob.tap();
  const pop = page.getByRole('dialog', { name: 'Metronome' });
  // Everything in it fits the screen, and the beats per bar sit in one row.
  const pb = (await pop.boundingBox())!;
  expect(pb.x).toBeGreaterThanOrEqual(0);
  expect(pb.x + pb.width).toBeLessThanOrEqual(390);
  const ys = await pop.getByRole('radio').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().y)));
  expect(new Set(ys).size).toBe(1);
  for (const b of await pop.getByRole('button').all())
    expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await pop.getByRole('button', { name: 'Start' }).tap();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Menu' }).tap();
  await page.getByRole('navigation', { name: 'Lessons and tools' }).getByRole('link', { name: 'Tuner' }).tap();
  await expect(page).toHaveURL(/\/tuner$/);
  await expect(knob).toHaveAccessibleName(/^Metronome, playing at \d+ BPM$/);
  await page.getByRole('region', { name: 'Now playing' }).getByRole('button', { name: 'Stop' }).tap();
  await expect(knob).toHaveAccessibleName('Metronome');
});
