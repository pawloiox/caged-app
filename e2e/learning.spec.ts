import { expect, test, type Page } from '@playwright/test';
import { MAJOR_NAMES, instances, posName } from '../src/theory';
import { wantedNotes } from '../src/train/questions';
import { noSeriousA11y } from './helpers';

const DAY = 86_400_000;

/** Seed progress through the legacy import (used only when the device has no saved progress yet). */
async function seed(page: Page, progress: object) {
  await page.addInitScript((json) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.setItem('caged-lab:progress', json);
    sessionStorage.setItem('seeded', '1');
  }, JSON.stringify(progress));
}
const now = Date.now();

test('Play from memory: mark the shape on a blank neck, at either of its places', async ({ page }) => {
  await page.goto('/train/recall');
  const quiz = page.getByRole('region', { name: 'Quiz' });
  const prompt = (await quiz.getByRole('heading', { level: 2 }).textContent()) ?? '';
  const m = /Play the ([CAGED])-shape of (\S+) major/.exec(prompt);
  expect(m, prompt).not.toBeNull();
  const shape = m![1]!;
  const pc = MAJOR_NAMES.indexOf(m![2]! as (typeof MAJOR_NAMES)[number]);
  // The board starts blank: no note dots.
  await expect(quiz.locator('.dot')).toHaveCount(0);
  const inst = instances(pc, 'major').filter((x) => x.shape === shape).at(-1)!;
  for (const k of wantedNotes(inst).want) {
    const [s, f] = k.split(':').map(Number) as [number, number];
    await quiz.getByRole('button', { name: new RegExp(`^${posName(s, f)}(,|$)`) }).click();
  }
  await quiz.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(quiz.locator('.feedback.ok')).toContainText('Correct');
  await noSeriousA11y(page, '/train/recall');
});

test('Your own song: type chords, plan them in a zone, no key picker or ear check', async ({ page }) => {
  await page.goto('/learn/5');
  await page.locator('#prog').selectOption('own');
  const field = page.getByLabel("Your song's chords");
  await field.fill('Am F C G Bdim');
  await expect(page.getByText(/Not chords this app can play: Bdim/)).toBeVisible();
  const cards = page.getByRole('group', { name: 'Chords' }).getByRole('button');
  await expect(cards).toHaveCount(4);
  await expect(cards.nth(0)).toContainText('Am');
  await expect(cards.nth(3)).toContainText('G');
  await expect(cards.nth(1)).toContainText('Bar 2');
  await expect(page.getByRole('radiogroup', { name: 'Key' })).toHaveCount(0);
  await noSeriousA11y(page, '/learn/5 own song');
  // Saved: it is still there after a reload.
  await page.waitForTimeout(400);
  await page.reload();
  await page.locator('#prog').selectOption('own');
  await expect(page.getByLabel("Your song's chords")).toHaveValue('Am F C G Bdim');
});

test('Fading: while the loop plays with "Nothing", the neck is blank; stopped, it shows the chord', async ({ page }) => {
  await page.goto('/learn/5');
  const board = page.locator('#p5-board');
  await expect(board.locator('.dot').first()).toBeAttached();
  await page.getByRole('radiogroup', { name: 'While it plays, show' }).getByRole('radio', { name: 'Nothing' }).click();
  await page.getByRole('button', { name: /Play the loop/ }).click();
  await expect(board.locator('.dot')).toHaveCount(0);
  await page.getByRole('button', { name: /^Stop/ }).first().click();
  await expect(board.locator('.dot').first()).toBeAttached();
});

test('A finished step comes back a day later: dull inlay, then a step check in review', async ({ page }) => {
  await seed(page, {
    steps: { 'step-1': true, 'step-3': true },
    seen: { s1: ['C', 'A', 'G', 'E', 'D'] },
    stats: {
      'step:1': { r: 1, w: 0, box: 1, last: now - 2 * DAY, first: now - 2 * DAY },
      'step:3': { r: 1, w: 0, box: 1, last: now, first: now },
    },
    drills: { major0: 60 },
  });
  await page.goto('/practice');
  await expect(page.getByRole('link', { name: /Open chords \(completed, check due\)/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /C up the neck \(completed\)/ })).toBeVisible();
  await expect(page.locator('.neck .inlay.due')).toHaveCount(1);
  // The routine starts with the review and says why.
  const blocks = page.locator('.blocks li');
  await expect(blocks.first()).toContainText('Clear what is due');
  await expect(blocks.first()).toContainText(/Step 1/);
  await expect(page.getByRole('heading', { name: 'Your learning record' })).toBeVisible();
  await page.goto('/train/review');
  await expect(page.getByRole('region', { name: 'Quiz' }).getByRole('heading', { level: 2 })).toContainText(
    'Step 1 check',
  );
});

test('A linking drill due for review links to its drill at the best tempo', async ({ page }) => {
  await seed(page, {
    steps: {},
    stats: { 'link:major7': { r: 1, w: 0, box: 1, last: now - 2 * DAY } },
    drills: { major0: 80, major7: 80 },
  });
  await page.goto('/train/review');
  const link = page.getByRole('link', { name: /G linking drill at 80 BPM/ });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/learn\/4\?key=7&q=major&bpm=80#drill/);
  await expect(
    page.getByRole('radiogroup', { name: 'Drill tempo' }).getByRole('radio', { name: '80 BPM' }),
  ).toBeChecked();
});
