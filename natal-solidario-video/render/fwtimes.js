const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.join(__dirname, 'index.html')); await p.evaluate(() => window.ready);
  console.log(JSON.stringify(await p.evaluate(() => window.sfxTimes()))); await b.close(); })();
