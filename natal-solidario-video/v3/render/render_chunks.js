// Uso: node render_chunks.js <dir_saida> <worker> <n_workers> [fps] [chunk_s] [total_s]
// Renderiza o vídeo em blocos (c_XX.mp4); blocos já prontos são pulados (retomável).
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs');
(async () => {
  const [dir, wi, nw, fpsA, chA, totA] = process.argv.slice(2); const fps = +(fpsA || 30), ch = +(chA || 5), total = +(totA || 88.5);
  const nf = Math.round(total * fps), cf = Math.round(ch * fps), chunks = [];
  for (let k = 0, f = 0; f < nf; k++, f += cf) chunks.push([k, f, Math.min(nf, f + cf)]);
  const mine = chunks.filter(([k]) => k % +nw === +wi && !fs.existsSync(path.join(dir, `c_${String(k).padStart(2, '0')}.mp4`)));
  if (!mine.length) { console.error('nada a fazer'); return; }
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto('file://' + path.join(__dirname, 'index.html')); await page.evaluate(() => window.ready);
  for (const [k, f0, f1] of mine) {
    const name = `c_${String(k).padStart(2, '0')}`, tmp = path.join(dir, name + '.tmp.mp4'), T0 = Date.now();
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(fps), tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = f0; f < f1; f++) {
      await page.evaluate(t => window.renderAt(t), f / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 94, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r)); fs.renameSync(tmp, path.join(dir, name + '.mp4'));
    console.error(`${name} pronto (${f1 - f0} quadros, ${((Date.now() - T0) / 1000).toFixed(0)} s)`);
  }
  await browser.close();
})();
