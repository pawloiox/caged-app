// Dump a photo's pixels as JSON ({w, h, px: [r, g, b, ...]}) so outline scripts can work in plain Python.
// Usage (from the repo root, with Playwright's Chromium available): node scripts/guitar-trace/pixels.mjs photo.png px.json
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const [img, out] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage();
const res = await p.evaluate(
  async (src) => {
    const im = new Image();
    im.src = src;
    await im.decode();
    const c = document.createElement('canvas');
    c.width = im.width;
    c.height = im.height;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const px = [];
    for (let i = 0; i < d.length; i += 4) px.push(d[i], d[i + 1], d[i + 2]);
    return { w: c.width, h: c.height, px };
  },
  'data:image/png;base64,' + readFileSync(img).toString('base64'),
);
writeFileSync(out, JSON.stringify(res));
await b.close();
