// Silhouette of a guitar photo on a white background, row by row: for each row, the runs of non-white pixels.
// Usage (from the repo root, with Playwright's Chromium available): node scripts/guitar-trace/rows.mjs photo.png rows.json
// The photo must show the guitar upright (headstock at the top) on white. See HANDOFF section 15.
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
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const rows = [];
    for (let y = 0; y < c.height; y++) {
      const segs = [];
      let start = -1;
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        const dark = (d[i] + d[i + 1] + d[i + 2]) / 3 < 225;
        if (dark && start < 0) start = x;
        if ((!dark || x === c.width - 1) && start >= 0) {
          if (x - start > 2) segs.push([start, x - 1]);
          start = -1;
        }
      }
      rows.push(segs);
    }
    return { w: c.width, h: c.height, rows };
  },
  'data:image/png;base64,' + readFileSync(img).toString('base64'),
);
writeFileSync(out, JSON.stringify(res));
await b.close();
