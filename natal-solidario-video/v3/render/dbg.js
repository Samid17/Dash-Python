const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('[pageerror]', e.message));
  await p.goto('file://' + path.join(__dirname, 'index.html')); await p.evaluate(() => window.ready);
  const jobs = JSON.parse(process.argv[3]);
  for (const [name, eyes, pose, tag] of jobs) { await p.evaluate(([n, e, po]) => window.debugPuppet(n, e, po), [name, eyes, pose]); await p.screenshot({ path: path.join(process.argv[2], `dbg_${name}_${tag}.jpg`), type: 'jpeg', quality: 85 }); }
  await b.close();
})();
