import { chromium, expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mulberry32, renderPluck } from '../src/audio/ks';

/**
 * Listening mode end to end: a synthesised WAV is fed to Chromium's fake microphone, so the real pipeline runs
 * (permission dialog → getUserMedia → AudioWorklet → pitch detection → the drill).
 */
const SR = 48000;

function writeWav(path: string, notes: Array<{ midi: number; at: number }>, seconds: number) {
  const pcm = new Float32Array(Math.floor(SR * seconds));
  notes.forEach(({ midi, at }, i) => {
    const p = renderPluck(midi, SR, { rng: mulberry32(i + 1), duration: 0.9, velocity: 0.9 });
    const o = Math.floor(at * SR);
    for (let n = 0; n < p.length && o + n < pcm.length; n++) pcm[o + n]! += p[n]! * 2.5;
  });
  const buf = Buffer.alloc(44 + pcm.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + pcm.length * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(pcm.length * 2, 40);
  pcm.forEach((v, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  writeFileSync(path, buf);
}

test.describe('listening mode with a fake microphone', () => {
  test.setTimeout(90_000);

  test('Step 1: playing the two roots of open C passes the root test on its own', async ({ baseURL }, info) => {
    // E3 (not a root), then C3 (A string, fret 3) and C4 (B string, fret 1), looped by Chromium.
    const wav = join(info.outputDir, 'c-roots.wav');
    mkdirSync(info.outputDir, { recursive: true });
    writeWav(
      wav,
      [
        // E3 first (D string, fret 2): a chord note, but not a root, as when checking a string.
        { midi: 52, at: 0.3 },
        { midi: 48, at: 1.3 },
        { midi: 60, at: 2.5 },
      ],
      3.8,
    );
    const browser = await chromium.launch({
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${wav}`,
        '--autoplay-policy=no-user-gesture-required',
      ],
    });
    const page = await browser.newPage({ baseURL });
    await page.goto('/learn/1');
    await page.getByRole('button', { name: 'Test yourself on C' }).click();
    await page.getByRole('button', { name: /Check me with the mic/ }).click();
    await page.getByRole('button', { name: 'Turn on listening' }).click();
    await expect(page.getByText('● Listening').first()).toBeVisible({ timeout: 10_000 });
    // No clicks on the board: the app hears both roots and checks the test by itself.
    await expect(page.locator('.feedback.ok')).toContainText('Correct', { timeout: 30_000 });
    // The non-root note was never marked: no ✗ on the board.
    await expect(page.locator('g.dot text', { hasText: '✗' })).toHaveCount(0);
    await expect(page.locator('[role="status"]')).not.toBeEmpty();
    await browser.close();
  });

  test('Tuner: a played note is identified and placed on the neck', async ({ baseURL }, info) => {
    const wav = join(info.outputDir, 'a2.wav');
    mkdirSync(info.outputDir, { recursive: true });
    writeWav(wav, [{ midi: 45, at: 0.3 }], 1.5);
    const browser = await chromium.launch({
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${wav}`,
      ],
    });
    const page = await browser.newPage({ baseURL });
    await page.goto('/tuner');
    await page.getByRole('button', { name: 'Turn on listening' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Turn on listening' }).click();
    await expect(page.locator('.heard .tag.ok').filter({ hasText: /A2/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/A string, open/).first()).toBeVisible();
    await browser.close();
  });

  test('a refused microphone keeps focus in the dialog and says why', async ({ baseURL }) => {
    const browser = await chromium.launch({ args: ['--deny-permission-prompts'] });
    const page = await browser.newPage({ baseURL });
    await page.goto('/learn/3');
    await page.getByRole('button', { name: /Check me with the mic/ }).click();
    const start = page.getByRole('dialog').getByRole('button', { name: /Turn on listening|Asking the browser/ });
    await start.click();
    await expect(page.getByRole('dialog').locator('.callout.warn')).toBeVisible({ timeout: 10_000 });
    // Focus is still inside the dialog, never on <body>.
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
    await expect(page.locator('[role="status"]')).not.toBeEmpty();
    await browser.close();
  });
});
