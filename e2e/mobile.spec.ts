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
      'main .btn, main [role=radio], main .shape-btn, .nav-item, .chip, main .chord-card, main .check',
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

test('390px phone: Step 5 keeps one transport bar while playing (no mini-player on top)', async ({ page }) => {
  await page.goto('/learn/5');
  await page.getByRole('button', { name: /Play the loop/ }).click();
  await expect(page.getByRole('button', { name: /^Stop/ }).first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Now playing' })).toHaveCount(0);
  await page.getByRole('button', { name: /^Stop/ }).first().click();
});

test('390px phone: open-string cells on the upright neck are 44px tall', async ({ page }) => {
  await page.goto('/learn/1');
  const box = await page.getByRole('button', { name: /^high e string, open/ }).boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});
