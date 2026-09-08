/* Reusable verification harness for Projections-pattern artifacts.
   Usage: node verify.harness.js --root artifacts --file projections.html --port 8921
   Requires: playwright-core resolvable (local install or PLAYWRIGHT_CORE path)
   plus a Chromium executable (CHROME_EXE env or Playwright browsers).
   Gates: zero pageerrors + rendered rows + valid CSV download. */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1]] : [])).filter((x) => x.length)
);
const ROOT = path.resolve(args.root || 'artifacts');
const FILE = args.file || 'projections.html';
const PORT = Number(args.port || 8921);
const SHOT = args.shot || path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'proy-verify-')), 'verify.png');

function loadChromium() {
  const candidates = [
    process.env.PLAYWRIGHT_CORE,
    'playwright-core',
    path.join(process.cwd(), 'node_modules', 'playwright-core'),
  ].filter(Boolean);
  let lastErr = null;
  for (const c of candidates) {
    try {
      return require(c).chromium;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    'playwright-core not found. Install it (npm i -D playwright-core) or set PLAYWRIGHT_CORE. Last error: ' + lastErr
  );
}

const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  fs.readFile(f, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('nf');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

(async () => {
  const { chromium } = { chromium: loadChromium() };
  await new Promise((r) => server.listen(PORT, r));
  const launchOpts = { args: ['--no-sandbox'] };
  if (process.env.CHROME_EXE) launchOpts.executablePath = process.env.CHROME_EXE;
  const browser = await chromium.launch(launchOpts);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(`http://127.0.0.1:${PORT}/${FILE}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => ({
    fresh: document.getElementById('fresh') ? document.getElementById('fresh').textContent : 'NO-BADGE',
    rows: document.querySelectorAll('#body tr:not(.section)').length,
    sections: document.querySelectorAll('#body tr.section').length,
  }));
  console.log(JSON.stringify(info, null, 1));
  try {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#export'),
    ]);
    const csv = fs.readFileSync(await dl.path(), 'utf8');
    console.log('csv:', dl.suggestedFilename(), '| meta:', csv.split('\n')[1].trim());
  } catch (e) {
    console.log('csv: SKIP/FAIL', String(e).slice(0, 120));
  }
  await page.screenshot({ path: SHOT });
  console.log('pageerrors:', errs.length ? errs : 'none');
  const ok = errs.length === 0 && info.rows > 0;
  await browser.close();
  server.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error('HARNESS FAIL', e);
  process.exit(1);
});
