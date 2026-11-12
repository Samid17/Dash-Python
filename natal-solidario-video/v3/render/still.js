// Uso: node still.js <saida_dir> t1 t2 ...  — salva quadros JPEG para revisão
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.error('[pageerror]', e.message)); p.on('console', m => console.error('[console]', m.text()));
  await p.goto('file://' + path.join(__dirname, 'index.html')); await p.evaluate(() => window.ready);
  const out = process.argv[2];
  for (const t of process.argv.slice(3)) { const t0 = Date.now(); await p.evaluate(t => window.renderAt(+t), t); await p.screenshot({ path: path.join(out, 'f_' + (+t).toFixed(2) + '.jpg'), type: 'jpeg', quality: 85 }); console.log('t', t, Date.now() - t0, 'ms'); }
  await b.close();
})();
