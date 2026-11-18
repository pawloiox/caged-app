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
