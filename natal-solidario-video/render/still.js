// node still.js t1 t2 ... -> stills/t.jpg
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  page.on('console', m => { if (m.type() !== 'log') console.error('[page]', m.text()); });
  await page.goto('file://' + path.join(__dirname, 'index.html')); await page.evaluate(() => window.ready);
  fs.mkdirSync(path.join(__dirname, '../stills'), { recursive: true });
  for (const t of process.argv.slice(2)) { await page.evaluate(t => window.renderAt(t), +t); await page.screenshot({ path: path.join(__dirname, `../stills/${t}.jpg`), type: 'jpeg', quality: 80 }); }
  await browser.close();
})();
