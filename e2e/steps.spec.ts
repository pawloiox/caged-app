import { expect, test, type Page } from '@playwright/test';
import { ORDER, instances, openChord, posName, rootsOf, chordLabel } from '../src/theory';
import { stepDone } from './helpers';

test.describe.configure({ mode: 'serial' });

async function passRootTest(page: Page, c: string) {
  await page.getByRole('radio', { name: new RegExp(`^${c} major`) }).click();
  for (const r of rootsOf(openChord(c as 'C')))
    await page.getByRole('button', { name: `${posName(r.s, r.f)}, press to mark as a root` }).click();
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback.ok')).toContainText('Correct');
}

test('Step 1: the no-labels root test completes the step (and the answer is hidden)', async ({ page }) => {
  await page.goto('/learn/1');
  await page.getByRole('button', { name: 'Test yourself on C' }).click();
  await expect(page.getByText('Roots hidden during the test.')).toBeVisible();
  await expect(page.getByText(/^Roots:/)).toHaveCount(0);
  for (const c of ORDER) await passRootTest(page, c);
  await stepDone(page, 1);
});

test('Step 1 by keyboard only: arrows walk the frets, Enter marks', async ({ page }) => {
  await page.goto('/learn/1');
  await page.getByRole('button', { name: 'Test yourself on C' }).focus();
  await page.keyboard.press('Enter');
  const start = page.getByRole('button', { name: 'A string, fret 3, press to mark as a root' });
  await start.focus();
  await page.keyboard.press('Enter');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowUp');
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('button', { name: 'B string, fret 1, press to mark as a root' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Check', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.feedback.ok')).toContainText('Correct');
  // Focus moves to the next action.
  await expect(page.getByRole('button', { name: /Test the next chord|Done/ })).toBeFocused();
});

test('Step 2: three slide challenges, counted only after resting on the target', async ({ page }) => {
  await page.goto('/learn/2');
  const slider = page.getByLabel('Where your index finger sits (fret)');
  for (let k = 0; k < 3; k++) {
    const target = ((await page.locator('.callout strong').nth(1).textContent()) ?? '').replace(' major', '');
    await slider.focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < 12; i++) {
      if ((await page.locator('.chord-big').textContent()) === target) break;
      await page.keyboard.press('ArrowRight');
    }
    await expect(page.locator('.chord-big')).toHaveText(target);
    await expect(page.getByText("That's it:")).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Next challenge' }).click();
  }
  await stepDone(page, 2);
});

test('Step 3: shape check level 1 and a linking drill complete the step', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/learn/3');
  const sec = page.getByRole('region', { name: 'Shape check' });
  await sec.getByRole('button', { name: /Start level 1/ }).click();
  const list = instances(0, 'major');
  for (let i = 0; i < 10; i++) {
    const pos = await sec.locator('g.dot').evaluateAll((els) =>
      els
        .map((e) => `${e.getAttribute('data-s')}:${e.getAttribute('data-f')}`)
        .sort()
        .join(','),
    );
    const inst = list.find(
      (x) =>
        x.frets
          .map((f, s) => (f == null ? null : `${s}:${f}`))
          .filter(Boolean)
          .sort()
          .join(',') === pos,
    )!;
    await sec.getByRole('button', { name: `${inst.shape}-shape`, exact: true }).click();
    if (i < 9) await sec.getByRole('button', { name: 'Next' }).click();
  }
  await expect(sec.getByText(/Level 1 passed/)).toBeVisible();
  await page.getByRole('radio', { name: '100 BPM' }).click();
  await page.getByRole('button', { name: 'Start drill' }).click();
  await expect(page.locator('.mini')).toBeVisible();
  await page.getByRole('button', { name: 'Yes, clean' }).click({ timeout: 60_000 });
  await stepDone(page, 3);
});

test('Step 4: three predictions and a drill in another key', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/learn/4');
  for (const key of [7, 9, 2]) {
    await page
      .getByRole('radiogroup', { name: 'Key' })
      .getByRole('radio', { name: chordLabel(key, 'major'), exact: true })
      .click();
    const first = instances(key, 'major')[0]!;
    await page
      .getByRole('group', { name: 'Your prediction' })
      .getByRole('button', { name: `${first.shape}-shape`, exact: true })
      .click();
    await page.getByRole('button', { name: `Fret ${first.minF}`, exact: true }).click();
    await expect(page.locator('.callout', { hasText: 'Spot on' })).toBeVisible();
  }
  await page.getByRole('radio', { name: '100 BPM' }).click();
  await page.getByRole('button', { name: 'Start drill' }).click();
  await page.getByRole('button', { name: 'Yes, clean' }).click({ timeout: 60_000 });
  await stepDone(page, 4);
});

test('Step 5: confirmed loops in two zones; chord cards explain each voicing; ear check runs', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/learn/5');
  await expect(page.locator('.chord-card .why').first()).toContainText(/shape|Open/);
  await page.getByLabel('Tempo').fill('140');
  for (const zone of ['Frets 3–7', 'Frets 5–9']) {
    await page.getByRole('radio', { name: zone }).click();
    await page.getByRole('button', { name: /Play the loop/ }).click();
    await page.getByRole('button', { name: 'Yes, I did' }).click({ timeout: 30_000 });
    await page.getByRole('button', { name: /^Stop/ }).first().click();
  }
  await stepDone(page, 5);
  await page.getByRole('button', { name: 'Take the check' }).click();
  await page.getByRole('group', { name: 'Roman numerals' }).getByRole('button').first().click();
  await expect(page.getByText(/Now find its root inside your zone/).first()).toBeVisible();
});

test('Train: answer by keyboard, then the review queue serves the miss', async ({ page }) => {
  await page.goto('/train/order');
  await page.getByRole('heading', { level: 2 }).waitFor();
  await page.keyboard.press('c');
  await expect(page.locator('.feedback')).not.toBeEmpty();
  await page.goto('/train/shape');
  // Answer wrong on purpose: pick a shape that is not the answer by trying until a miss.
  for (let i = 0; i < 5; i++) {
    await page.getByRole('group', { name: 'Answers' }).getByRole('button').first().click();
    if (await page.locator('.feedback.no').count()) break;
    await page.keyboard.press('Enter');
  }
  await page.goto('/train/review');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Clear what is due');
  await expect(page.getByText(/Due now/)).toBeVisible();
});
