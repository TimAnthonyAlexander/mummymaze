// Headless bake: spin up the Vite dev server in-process, drive the page with
// Playwright, call window.__generateSheets(), and write the PNGs + JSON to out/.
//
// Playwright is optional (kept out of package.json to keep `npm install` light).
// If it isn't present, this prints how to enable it — the in-browser Export
// button is the always-available path.
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../out');

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(
    '\n[bake] Playwright is not installed. Either:\n' +
      '  1) Use the in-browser Export button (npm run dev → Export), or\n' +
      '  2) npm i -D playwright && npx playwright install chromium && npm run bake\n',
  );
  process.exit(1);
}

const server = await createServer({ root: resolve(__dirname, '..'), server: { port: 5181, strictPort: true } });
await server.listen();
const url = server.resolvedUrls.local[0];
console.log(`[bake] dev server at ${url}`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.__spriteReady === true', { timeout: 20000 });

  const result = await page.evaluate('window.__generateSheets()');
  await mkdir(outDir, { recursive: true });

  const writePng = async (name, dataUrl) => {
    const b64 = dataUrl.split(',')[1];
    await writeFile(resolve(outDir, name), Buffer.from(b64, 'base64'));
  };
  await writePng('mummy_white.png', result.white);
  await writePng('mummy_red.png', result.red);
  await writeFile(resolve(outDir, 'mummy.meta.json'), JSON.stringify(result.meta, null, 2));

  if (errors.length) console.warn('[bake] page errors:\n' + errors.join('\n'));
  console.log(`[bake] wrote mummy_white.png, mummy_red.png, mummy.meta.json → ${outDir}`);
} finally {
  await browser.close();
  await server.close();
}
