// Uso: node render.js <inicio_s> <fim_s> <saida.mp4> [fps]  — renderiza quadros e codifica com ffmpeg
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const [a, b, out, fpsArg] = process.argv.slice(2); const fps = +(fpsArg || 30);
  const browser = await chromium.launch({ args: ['--disable-web-security', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() !== 'log') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.evaluate(() => window.ready);
  const f0 = Math.round(+a * fps), f1 = Math.round(+b * fps);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const stage = await page.$('#stage');
  for (let f = f0; f < f1; f++) {
    await page.evaluate(t => window.renderAt(t), f / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 60 === 0) process.stderr.write(`${out}: ${f - f0}/${f1 - f0}\n`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close();
})();
