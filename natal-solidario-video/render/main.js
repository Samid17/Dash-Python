// Motor de animação determinístico: window.renderAt(t) desenha o quadro do instante t (s).
const STAGE = document.getElementById('stage');
const FXC = document.getElementById('fx'); const fx = FXC.getContext('2d');
const SUBS = document.getElementById('subs'); const FADE = document.getElementById('fade');
const TLs = window.TL.scenes; const TOTAL = window.TL.total;
const W = 1080, H = 1920, XF = 0.5;

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eio = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const eout = t => 1 - Math.pow(1 - t, 3);
const eback = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function el(tag, cls, parent, style = {}, html) { const e = document.createElement(tag); if (cls) e.className = cls; Object.assign(e.style, style); if (html !== undefined) e.innerHTML = html; parent.appendChild(e); return e; }
const IMGS = [];
function img(src, parent, cls = 'ph', style = {}) { const i = el('img', cls, parent, style); i.src = src; IMGS.push(i); return i; }
function pop(e, t, t0, dur = .45, base = '') { const p = prog(t, t0, t0 + dur); e.style.opacity = clamp(p * 3); e.style.transform = `${base} scale(${p <= 0 ? .4 : lerp(.4, 1, eback(p))})`; e.style.visibility = p <= 0 ? 'hidden' : 'visible'; return p; }
function hide(e, t, t0, dur = .3) { const p = prog(t, t0, t0 + dur); if (p > 0) { e.style.opacity = 1 - p; } }
function cam(e, u, d, a, b, easing = eio) { const k = easing(clamp(u / d)); const s = lerp(a[0], b[0], k), x = lerp(a[1], b[1], k), y = lerp(a[2], b[2], k); e.style.transform = `translate(${x}px,${y}px) scale(${s})`; }

// ---------- sprites ----------
function mk(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
const SPR_DOT = mk(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const tint = (spr, col) => mk(spr.width, spr.height, g => { g.drawImage(spr, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, spr.width, spr.height); });
const DOT_GOLD = tint(SPR_DOT, 'rgb(255,214,140)');
const SPR_STAR = mk(128, 128, (g) => { g.translate(64, 64); const gl = g.createRadialGradient(0, 0, 0, 0, 0, 30); gl.addColorStop(0, 'rgba(255,255,255,.9)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill(); g.fillStyle = '#fff'; for (let k = 0; k < 2; k++) { g.save(); g.rotate(k * Math.PI / 2); g.beginPath(); g.moveTo(0, -62); g.quadraticCurveTo(4, -4, 62, 0); g.quadraticCurveTo(4, 4, 0, 62); g.quadraticCurveTo(-4, 4, -62, 0); g.quadraticCurveTo(-4, -4, 0, -62); g.fill(); g.restore(); } });
function heartPath(g, s) { g.beginPath(); g.moveTo(0, s * .35); g.bezierCurveTo(-s * 1.1, -s * .35, -s * .45, -s * 1.05, 0, -s * .45); g.bezierCurveTo(s * .45, -s * 1.05, s * 1.1, -s * .35, 0, s * .35); g.closePath(); }
const SPR_HEART = mk(120, 120, g => { g.translate(60, 66); g.shadowColor = 'rgba(160,0,60,.35)'; g.shadowBlur = 8; g.fillStyle = '#E5156B'; heartPath(g, 52); g.fill(); g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-20, -22, 10, 6, -.6, 0, 7); g.fill(); });
const SPR_HEART_Y = tint(SPR_HEART, '#FFD21F');

function motes(t, n, seed, spr, area, size = [6, 18], alpha = .7, speed = 18) {
  const r = rng(seed); const [x0, y0, w, h] = area;
  for (let i = 0; i < n; i++) {
    const bx = r() * w, by = r() * h, sz = lerp(size[0], size[1], r()), ph = r() * 6.28, sp = lerp(.5, 1.4, r()) * speed;
    const x = x0 + ((bx + Math.sin(t * .6 + ph) * 30) % w + w) % w, y = y0 + ((by - t * sp) % h + h) % h;
    const a = alpha * (.45 + .55 * Math.sin(t * 1.7 + ph * 3) ** 2);
    fx.globalAlpha = a; fx.drawImage(spr, x - sz, y - sz, sz * 2, sz * 2);
  }
  fx.globalAlpha = 1;
}
function star(x, y, s, a, rot = 0) { if (a <= 0) return; fx.save(); fx.globalAlpha = a; fx.translate(x, y); fx.rotate(rot); fx.drawImage(SPR_STAR, -s, -s, s * 2, s * 2); fx.restore(); fx.globalAlpha = 1; }
function twinkles(t, pts, seed, s = 26) { const r = rng(seed); for (const [x, y] of pts) { const ph = r() * 6.28, f = lerp(1.5, 3, r()); const a = Math.max(0, Math.sin(t * f + ph)); star(x, y, s * (.6 + .4 * a), a * .95, t * .5); } }
function hearts(t, t0, n, seed, from, to, dur = 1.6, spread = 160, spr = SPR_HEART, size = 44, arc = 120) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const st = t0 + i * (dur / 2.2) / n * 2 + r() * .2; const p = prog(t, st, st + dur); if (p <= 0 || p >= 1) { r(); r(); continue; }
    const off = (r() - .5) * spread, wob = r() * 6.28; const e = eio(p);
    const x = lerp(from[0], to[0], e) + Math.sin(p * Math.PI) * off + Math.sin(p * 9 + wob) * 10, y = lerp(from[1], to[1], e) - Math.sin(p * Math.PI) * arc;
    const s = size * (p < .15 ? eback(p / .15) : 1) * (1 - .4 * Math.max(0, p - .8) / .2);
    fx.globalAlpha = p > .85 ? (1 - p) / .15 : 1; fx.drawImage(spr, x - s, y - s, s * 2, s * 2);
  }
  fx.globalAlpha = 1;
}
function risingHearts(t, n, seed, area, size = 34) { const r = rng(seed); const [x0, y0, w, h] = area; for (let i = 0; i < n; i++) { const bx = r() * w, ph = r(), sp = lerp(70, 140, r()), sz = size * lerp(.6, 1.2, r()); const cyc = h / sp; const p = ((t / cyc + ph) % 1); const x = x0 + bx + Math.sin(t * 2 + ph * 9) * 18, y = y0 + h - p * h; fx.globalAlpha = Math.sin(p * Math.PI) * .9; fx.drawImage(i % 3 ? SPR_HEART : SPR_HEART_Y, x - sz, y - sz, sz * 2, sz * 2); } fx.globalAlpha = 1; }
const FW_COLS = ['#FF4D8D', '#FFD21F', '#7CF0FF', '#FFFFFF', '#B7FF5A', '#FF8A3D'];
function fireworks(t, t0, seed, bursts) {
  const r = rng(seed);
  fx.globalCompositeOperation = 'lighter';
  for (let b = 0; b < bursts; b++) {
    const bt = t0 + b * .55 + r() * .3, cx = lerp(120, 960, r()), cy = lerp(160, 700, r()), col = FW_COLS[Math.floor(r() * FW_COLS.length)], n = 46, spd = lerp(260, 380, r());
    const tau = t - bt; if (tau < -.5 || tau > 2.2) { continue; }
    if (tau < 0) { const p = 1 + tau / .5; fx.globalAlpha = .9; fx.drawImage(DOT_GOLD, cx - 10, cy + (1 - p) * 500 - 10, 20, 20); continue; }
    const tc = tint(SPR_DOT, col);
    for (let i = 0; i < n; i++) {
      const ang = i / n * 6.283 + b, v = spd * (.75 + .25 * Math.sin(i * 7.1 + b));
      const pos = tt => [cx + Math.cos(ang) * v * tt * Math.exp(-tt * 1.2), cy + Math.sin(ang) * v * tt * Math.exp(-tt * 1.2) + 60 * tt * tt];
      const [x, y] = pos(tau), [x2, y2] = pos(Math.max(0, tau - .09));
      const a = Math.max(0, 1 - tau / 2.0);
      fx.globalAlpha = a * .8; fx.strokeStyle = col; fx.lineWidth = 3; fx.beginPath(); fx.moveTo(x2, y2); fx.lineTo(x, y); fx.stroke();
      fx.globalAlpha = a; fx.drawImage(tc, x - 9, y - 9, 18, 18);
    }
    if (tau < .25) { fx.globalAlpha = (1 - tau / .25) * .8; const s = 160; fx.drawImage(tc, cx - s, cy - s, s * 2, s * 2); }
  }
  fx.globalAlpha = 1; fx.globalCompositeOperation = 'source-over';
}

// ---------- fundo estilo card (creme com corações e patinhas) ----------
const PATTERN = mk(W, H, (g) => {
  g.fillStyle = '#FFF7EC'; g.fillRect(0, 0, W, H);
  const r = rng(7);
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = r() * H, s = lerp(18, 44, r()), rot = (r() - .5);
    g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = .55;
    if (r() < .5) { g.strokeStyle = '#F8CFDD'; g.lineWidth = 5; heartPath(g, s); g.stroke(); }
    else { g.fillStyle = '#F9DDE7'; g.beginPath(); g.ellipse(0, s * .35, s * .42, s * .34, 0, 0, 7); g.fill(); for (const [dx, dy] of [[-.42, -.12], [-.15, -.42], [.15, -.42], [.42, -.12]]) { g.beginPath(); g.ellipse(dx * s, dy * s, s * .15, s * .19, 0, 0, 7); g.fill(); } }
    g.restore();
  }
  const v = g.createRadialGradient(W / 2, H * .45, 300, W / 2, H * .45, 1200); v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(252,215,228,.55)'); g.globalAlpha = 1; g.fillStyle = v; g.fillRect(0, 0, W, H);
}).toDataURL('image/jpeg', .92);
function creamBg(parent) { const d = el('div', 'cream', parent); d.style.background = `url(${PATTERN})`; return d; }

// ---------- mapa estilizado ----------
const drawMap = () => mk(W + 200, H + 200, (g, w, h) => {
  g.fillStyle = '#FFF3E6'; g.fillRect(0, 0, w, h);
  const r = rng(11);
  g.fillStyle = '#DDF2C9'; g.beginPath(); g.ellipse(260, 560, 210, 150, .3, 0, 7); g.fill(); g.beginPath(); g.ellipse(900, 1380, 260, 170, -.2, 0, 7); g.fill();
  g.fillStyle = '#CDEBFA'; g.beginPath(); g.ellipse(980, 300, 260, 120, .5, 0, 7); g.fill();
  g.strokeStyle = '#FFFFFF'; g.lineCap = 'round';
  for (let i = 0; i < 9; i++) { g.lineWidth = i % 3 === 0 ? 34 : 18; g.beginPath(); const y = 80 + i * 250 + r() * 40; g.moveTo(-50, y); g.bezierCurveTo(w * .3, y + (r() - .5) * 140, w * .7, y + (r() - .5) * 140, w + 50, y + (r() - .5) * 80); g.stroke(); }
  for (let i = 0; i < 7; i++) { g.lineWidth = i % 3 === 1 ? 34 : 18; g.beginPath(); const x = 60 + i * 190 + r() * 30; g.moveTo(x, -50); g.bezierCurveTo(x + (r() - .5) * 120, h * .35, x + (r() - .5) * 120, h * .65, x + (r() - .5) * 60, h + 50); g.stroke(); }
  g.strokeStyle = '#FBD9E5'; g.lineWidth = 10; g.setLineDash([2, 22]); g.beginPath(); g.moveTo(0, 1060); g.bezierCurveTo(400, 980, 700, 1160, w, 1040); g.stroke(); g.setLineDash([]);
  g.font = '600 40px Fredoka'; g.fillStyle = 'rgba(120,80,70,.35)'; g.textAlign = 'center'; g.fillText('Ponta Negra', 300, 1700); g.fillText('Lagoa Nova', 900, 460); g.fillText('Neópolis', 250, 300);
});

// ---------- cenas ----------
const SC = [];
function scene(id, build, update, trans = 'fade') { const root = el('div', 'scene', STAGE); root.style.zIndex = 1 + SC.length; const s = { id, root, a: TLs[id][0], b: TLs[id][1], trans, update }; build(s, root); SC.push(s); return s; }
function photo(parent, src) { const w = el('div', 'abs', parent, { left: 0, top: 0, width: W + 'px', height: H + 'px', transformOrigin: '50% 50%' }); const i = img(src, w); return { w, i }; }
function sub(parent, a, b, u) { /* opacidade de sub-plano dentro da cena */ return clamp(Math.min(prog(u, a - .2, a + .2), 1 - prog(u, b - .2, b + .2))); }
function label(parent, text, icon, top = 260, cls = 'pill') { const p = el('div', cls, parent, { top: top + 'px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }); if (icon) { const i = img(icon, p, ''); } el('span', '', p, {}, text); return p; }
function heartSvg(col = '#E5156B', s = 84) { return `<svg width="${s}" height="${s}" viewBox="-60 -66 120 120"><path d="M0 18 C-57 -18 -23 -55 0 -23 C23 -55 57 -18 0 18Z" fill="${col}" stroke="#fff" stroke-width="6"/></svg>`; }

// S1 — calor
scene('s1', (s, r) => {
  s.A = photo(r, 'img/s01a.jpg'); s.B = photo(r, 'img/s01b.jpg');
  s.glare = el('div', 'abs', r, { inset: 0, background: 'radial-gradient(circle at 88% 6%, rgba(255,250,220,.95) 0, rgba(255,214,120,.55) 9%, rgba(255,170,60,.18) 30%, rgba(255,150,50,0) 55%)', mixBlendMode: 'screen' });
  s.grade = el('div', 'abs', r, { inset: 0, background: 'linear-gradient(180deg, rgba(255,150,40,.18), rgba(255,120,40,.05))', mixBlendMode: 'soft-light' });
  el('div', 'vign', r); el('div', 'botshade', r);
}, (s, u, d, t) => {
  cam(s.A.w, u, d * .6, [1.06, 0, 30], [1.18, 0, -20]);
  const k = prog(u, d * .46, d * .56); s.B.w.style.opacity = k; cam(s.B.w, Math.max(0, u - d * .46), d * .54, [1.14, 30, 10], [1.04, 0, 0]);
  s.glare.style.opacity = .75 + .25 * Math.sin(u * 2.2);
  motes(t, 26, 3, DOT_GOLD, [0, 0, W, H * .8], [4, 12], .55, 14);
  star(950, 120, 120 + 20 * Math.sin(u * 3), .55, u * .3);
});
// S2 — sede
scene('s2', (s, r) => { s.A = photo(r, 'img/s02.jpg'); s.grade = el('div', 'abs', r, { inset: 0, background: 'linear-gradient(180deg, rgba(255,150,40,.12), rgba(255,120,40,.0))', mixBlendMode: 'soft-light' }); el('div', 'vign', r); el('div', 'botshade', r); },
  (s, u, d, t) => { cam(s.A.w, u, d, [1.03, 0, 0], [1.16, -70, -110]); s.A.i.style.filter = `saturate(${lerp(1, .82, u / d)})`; motes(t, 16, 5, DOT_GOLD, [0, 0, W, H * .7], [3, 10], .4, 10); });
// S3 — ninguém para / olho marejado
scene('s3', (s, r) => { s.A = photo(r, 'img/s03a.jpg'); s.B = photo(r, 'img/s03b.jpg'); s.dark = el('div', 'abs', r, { inset: 0, background: '#0a0612' }); el('div', 'vign', r); el('div', 'botshade', r); },
  (s, u, d, t) => {
    cam(s.A.w, u, d * .55, [1.1, 40, 0], [1.12, -40, -10], x => x);
    const k = prog(u, d * .5, d * .6); s.B.w.style.opacity = k;
    cam(s.B.w, Math.max(0, u - d * .5), d * .5, [1.02, 0, 0], [1.2, 40, 60]);
    s.B.i.style.filter = `saturate(${lerp(1, .82, prog(u, d * .5, d))}) brightness(${lerp(1, .92, prog(u, d * .7, d))})`;
    s.dark.style.opacity = .0;
    if (k > .9) { const P = window.POS.tear; const sc = s.B.w.style.transform; const g = prog(u, d * .68, d * .78); const tw = Math.sin((u - d * .68) * 5); star(...camPoint(s.B.w, P), 34 + 10 * tw, g * (.6 + .4 * tw), u); }
  });
// S4 — ASPAN
scene('s4', (s, r) => {
  s.A = photo(r, 'img/s04.jpg'); el('div', 'vign', r); el('div', 'botshade', r);
  s.logo = img('ui/logo_aspan.png', r, 'abs', { width: '280px', left: '60px', top: '130px', filter: 'drop-shadow(0 12px 18px rgba(0,0,0,.35))' });
  s.badge = el('div', 'card', r, { left: '370px', top: '150px', width: '650px', padding: '22px 0 26px', textAlign: 'center', borderColor: '#B7D532', borderWidth: '8px' });
  s.num = el('div', '', s.badge, { fontWeight: 700, fontSize: '170px', lineHeight: '1', color: '#0B5A1F' }, '+0');
  el('div', '', s.badge, { fontWeight: 600, fontSize: '60px', color: '#E5156B', marginTop: '4px' }, 'cães e gatos');
}, (s, u, d, t) => {
  cam(s.A.w, u, d, [1.16, 0, 60], [1.02, 0, 0], eout);
  pop(s.logo, u, d * .26, .5);
  if (u > d * .26) twinkles(t, [[70, 150], [330, 200], [300, 420]], 4, 30);
  pop(s.badge, u, d * .6, .5);
  const c = Math.round(500 * eout(prog(u, d * .64, d * .86)));
  s.num.textContent = '+' + c;
  if (c === 500) { const q = Math.sin(prog(u, d * .86, d * .93) * Math.PI); s.badge.style.transform = `scale(${1 + .06 * q})`; if (u < d * .99) twinkles(t, [[400, 170], [990, 200], [960, 400]], 9, 34); }
});
// S5 — cuidados (montagem)
scene('s5', (s, r) => {
  s.shots = [['img/s05a.jpg', 'Ração', 'ui/ic_racao.png', [1.12, 0, 0], [1.0, 0, 0]],
  ['img/s05c.jpg', 'Remédios', 'ui/ic_remedio.png', ...window.POS.remedios],
  ['img/s05b.jpg', 'Banho', 'ui/ic_higiene.png', [1.0, 0, 0], [1.12, 0, -40]],
  ['img/s05c.jpg', 'Consultas', null, ...window.POS.consultas],
  [window.POS.carinhoImg, 'Carinho', null, ...window.POS.carinho]];
  s.P = s.shots.map(([src, txt, ic]) => { const P = photo(r, src); P.w.style.opacity = 0; return P; });
  el('div', 'vign', r); el('div', 'botshade', r);
  s.L = s.shots.map(([src, txt, ic]) => { const L = label(r, txt, ic, 1225); if (!ic) { L.insertAdjacentHTML('afterbegin', heartSvg('#FFD21F', 84)); } L.style.fontSize = '66px'; return L; });
}, (s, u, d, t) => {
  const n = s.shots.length, seg = d / n;
  s.shots.forEach((sh, i) => {
    const a = i * seg, b = (i + 1) * seg, P = s.P[i], L = s.L[i];
    const op = i === 0 ? (u < b + .1 ? 1 : 0) : prog(u, a - .1, a + .1); P.w.style.opacity = u > b + .25 && i < n - 1 ? 0 : op;
    cam(P.w, clamp(u - a + .1, 0, seg + .2), seg + .2, sh[3], sh[4], x => x);
    const lp = prog(u, a + .05, a + .4); L.style.opacity = u > b - .05 && i < n - 1 ? 0 : clamp(lp * 3); L.style.transform = `translateX(-50%) scale(${lp <= 0 ? .5 : lerp(.5, 1, eback(lp))})`;
  });
  if (u > seg * 4) risingHearts(t, 10, 21, [140, 500, 800, 800], 30);
});
// S6 — a luta
scene('s6', (s, r) => { s.A = photo(r, 'img/s06.jpg'); s.glow = el('div', 'abs', s.A.w, { width: '420px', height: '420px', borderRadius: '50%', left: (window.POS.monitor[0] - 210) + 'px', top: (window.POS.monitor[1] - 210) + 'px', background: 'radial-gradient(circle, rgba(120,255,170,.55), rgba(120,255,170,0) 65%)', mixBlendMode: 'screen' }); el('div', 'vign', r); el('div', 'botshade', r); s.dim = el('div', 'abs', r, { inset: 0, background: '#000' }); },
  (s, u, d, t) => {
    const per = 60 / 72, ph = (u % per) / per, beat = Math.exp(-ph * 9);
    cam(s.A.w, u, d, [1.02, 0, 0], [1.12, 30, 40]);
    s.A.i.style.filter = `brightness(${1 + .05 * beat}) saturate(.92)`;
    s.glow.style.opacity = .25 + .75 * beat;
    s.dim.style.opacity = .28 * prog(u, d * .62, d * .9);
  });
// S7 — Dog Sweet Home acende as luzes
scene('s7', (s, r) => {
  s.Off = photo(r, 'img/s07off.jpg'); s.On = photo(r, 'img/s07on.jpg');
  s.bloom = img('img/s07on.jpg', s.On.w, 'ph', { filter: 'blur(18px) brightness(1.3)', mixBlendMode: 'screen', opacity: 0 });
  s.sign = img('ui/logo_dsh.png', s.On.w, 'abs', { width: window.POS.sign[2] + 'px', left: (window.POS.sign[0] - window.POS.sign[2] / 2) + 'px', top: window.POS.sign[1] + 'px' });
  el('div', 'vign', r); el('div', 'botshade', r);
  s.card = el('div', 'card', r, { left: '50%', top: '230px', padding: '26px 40px', borderRadius: '40px' }); img('ui/logo_dsh.png', s.card, '', { width: '720px', display: 'block' });
}, (s, u, d, t) => {
  cam(s.Off.w, u, d, [1.0, 0, 0], [1.09, 0, 30]); s.On.w.style.transform = s.Off.w.style.transform;
  const t1 = .45; let on = 0;
  if (u > t1) on = 1; if (u > t1 + .07 && u < t1 + .16) on = .25; if (u > t1 + .16) on = prog(u, t1 + .16, t1 + .3);
  s.On.w.style.opacity = on; s.bloom.style.opacity = on * (.28 + .12 * Math.sin(u * 4));
  s.sign.style.opacity = on;
  pop(s.card, u, t1 + .35, .5, 'translateX(-50%)');
  if (u > t1) twinkles(t, window.POS.lights.map(p => camPoint(s.On.w, p)), 13, 28);
});
// S8 — arrecadação (estilo card)
scene('s8', (s, r) => {
  creamBg(r);
  s.pill = label(r, 'O que doar?', null, 250); s.pill.insertAdjacentHTML('afterbegin', heartSvg('#fff', 70));
  // caixa de doações
  s.box = el('div', 'abs', r, { left: '270px', top: '930px', width: '540px', height: '400px' });
  s.box.innerHTML = `<svg width="540" height="400" viewBox="0 0 540 400"><defs><linearGradient id="bx" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#D9A066"/><stop offset="1" stop-color="#B9783E"/></linearGradient></defs>
    <path d="M30 70 L-20 10 L250 10 L270 70Z" fill="#E6B47E"/><path d="M510 70 L560 10 L290 10 L270 70Z" fill="#E6B47E"/>
    <rect x="30" y="70" width="480" height="320" rx="26" fill="url(#bx)"/><rect x="30" y="70" width="480" height="26" fill="rgba(0,0,0,.12)"/>
    <rect x="95" y="150" width="350" height="170" rx="26" fill="#fff"/></svg>`;
  img('ui/logo_dsh.png', s.box, 'abs', { left: '112px', top: '200px', width: '316px' });
  s.items = [['ui/ic_racao.png', 'Ração'], ['ui/ic_remedio.png', 'Medicamentos'], ['ui/ic_higiene.png', 'Higiene']].map(([src, txt], i) => {
    const g = el('div', 'abs', r, { left: 0, top: 0 }); const im = img(src, g, 'chipimg', { width: '220px', left: '-110px', top: '-110px' });
    const tx = el('div', 'pill y', g, { left: '50%', top: '125px', transform: 'translateX(-50%)', padding: '8px 26px 10px', fontSize: '44px', whiteSpace: 'nowrap' }, txt); return { g, tx };
  });
  // calendário
  s.cal = el('div', 'card', r, { left: '50%', top: '330px', width: '420px', height: '470px', overflow: 'hidden', borderColor: '#fff' });
  el('div', '', s.cal, { height: '120px', background: '#E5156B', color: '#fff', fontSize: '76px', fontWeight: 700, textAlign: 'center', lineHeight: '120px', letterSpacing: '4px' }, 'DEZ');
  s.day = el('div', '', s.cal, { fontSize: '250px', fontWeight: 700, textAlign: 'center', lineHeight: '320px', color: '#2A140C' }, '29');
  s.calTx = el('div', 'pill y', r, { top: '830px', left: '50%', transform: 'translateX(-50%)', padding: '12px 40px 14px', fontSize: '60px', whiteSpace: 'nowrap' }, 'Até 31 de dezembro');
}, (s, u, d, t) => {
  pop(s.pill, u, .05, .45, 'translateX(-50%)'); if (u > d * .55) hide(s.pill, u, d * .55, .25);
  pop(s.box, u, .15, .5);
  s.items.forEach((it, i) => {
    const sx = [215, 540, 865][i], sy = 600;
    const ap = prog(u, .25 + i * .15, .7 + i * .15);
    const f0 = d * (.26 + i * .09), p = prog(u, f0, f0 + .75);
    const x = lerp(sx, 540, eio(p)), y = p <= 0 ? sy : lerp(sy, 1010, p * p) - Math.sin(p * Math.PI) * 140;
    const sc = (ap <= 0 ? 0 : eback(ap)) * lerp(1, .4, prog(p, .55, 1));
    it.g.style.transform = `translate(${x}px,${y}px) scale(${sc})`; it.g.style.opacity = p >= 1 ? 0 : 1; it.tx.style.opacity = 1 - prog(p, .05, .25);
  });
  // caixa "engole" cada item
  const bumps = [0, 1, 2].map(i => { const l = d * (.26 + i * .09) + .75; return u > l ? Math.exp(-(u - l) * 8) : 0; }).reduce((a, b) => a + b, 0);
  s.box.style.transform = `scale(${1 + .04 * bumps})`;
  const cp = pop(s.cal, u, d * .58, .5, 'translateX(-50%)');
  const dd = u < d * .66 ? 29 : u < d * .72 ? 30 : 31; s.day.textContent = dd;
  if (dd === 31) { const q = Math.sin(prog(u, d * .72, d * .8) * Math.PI); s.day.style.color = '#E5156B'; s.cal.style.transform = `translateX(-50%) scale(${1 + .07 * q})`; twinkles(t, [[360, 360], [740, 420], [700, 760]], 31, 32); }
  else s.day.style.color = '#2A140C';
  pop(s.calTx, u, d * .74, .45, 'translateX(-50%)');
}, 'circle');
// S9 — ponto de coleta + busca em casa
scene('s9', (s, r) => {
  s.map = el('div', 'abs', r, { left: '-100px', top: '-100px', width: (W + 200) + 'px', height: (H + 200) + 'px' }); s.mapImg = el('img', 'ph', s.map, { width: (W + 200) + 'px', height: (H + 200) + 'px' }); window.MAPIMG = s.mapImg;
  s.mapLabel = el('div', 'abs', r, { left: '0', right: '0', top: '420px', textAlign: 'center', fontWeight: 700, fontSize: '54px', color: '#8a5a4a' }, 'Capim Macio');
  s.ring = el('div', 'abs', r, { left: '540px', top: '760px', width: '0', height: '0' });
  s.pin = img('ui/ic_pin.png', r, 'chipimg', { width: '200px', left: '440px', top: '560px' });
  s.addr = el('div', 'card', r, { left: '50%', top: '840px', width: '880px', padding: '34px 36px 38px', textAlign: 'center' });
  el('div', 'pill', s.addr, { position: 'relative', display: 'inline-flex', padding: '10px 36px 12px', fontSize: '50px' }, 'Ponto de coleta');
  el('div', '', s.addr, { fontWeight: 700, fontSize: '74px', marginTop: '18px' }, 'Dog Sweet Home');
  el('div', '', s.addr, { fontWeight: 500, fontSize: '46px', marginTop: '10px', color: '#5b3a2e', lineHeight: '1.2' }, 'Rua Vicente Egberto Cavalcante, 76<br>Capim Macio · Natal/RN');
  s.V = photo(r, 'img/s09.jpg'); s.V.w.style.opacity = 0;
  s.vshade = el('div', 'botshade', r); s.vshade.style.opacity = 0;
  s.vpill = label(r, 'Buscamos na sua casa!', 'ui/ic_pin.png', 240); s.vpill.style.fontSize = '58px';
  s.insta = el('div', 'card', r, { left: '50%', top: '390px', padding: '16px 40px 20px', fontSize: '56px', fontWeight: 700, color: '#E5156B', whiteSpace: 'nowrap', borderRadius: '999px' }, 'Agende: @dogsweethome_natal');
}, (s, u, d, t) => {
  const cut = d * .5;
  s.map.style.transform = `scale(${lerp(1.0, 1.12, eio(clamp(u / cut)))})`;
  s.mapLabel.style.opacity = prog(u, .3, .7) * (1 - prog(u, cut - .2, cut));
  const pp = prog(u, .25, .85); const y = pp < .6 ? lerp(-300, 560, Math.pow(pp / .6, 2)) : 560 - Math.sin(prog(pp, .6, 1) * Math.PI) * 60 * (1 - prog(pp, .6, 1));
  s.pin.style.top = y + 'px'; s.pin.style.opacity = pp > 0 ? 1 : 0;
  // ondas no chão
  fx.save(); for (let k = 0; k < 3; k++) { const q = ((u - .85 - k * .45) % 1.35) / 1.35; if (u < .85 || q < 0) continue; fx.globalAlpha = (1 - q) * .7 * (u < cut ? 1 : 0); fx.strokeStyle = '#E5156B'; fx.lineWidth = 8; fx.beginPath(); fx.ellipse(540, 760, 60 + q * 260, 18 + q * 80, 0, 0, 7); fx.stroke(); } fx.restore();
  pop(s.addr, u, .9, .5, 'translateX(-50%)');
  const v = prog(u, cut - .15, cut + .2); s.V.w.style.opacity = v; s.vshade.style.opacity = v;
  cam(s.V.w, Math.max(0, u - cut), d - cut, [1.12, 60, 0], [1.04, -20, 0], eout);
  pop(s.vpill, u, cut + .3, .45, 'translateX(-50%)'); pop(s.insta, u, cut + .55, .45, 'translateX(-50%)');
  if (u < cut + .3) { s.vpill.style.visibility = 'hidden'; }
});
// S10 — PIX
scene('s10', (s, r) => {
  creamBg(r);
  s.pill = label(r, 'Doe via PIX', 'ui/ic_money.png', 230);
  s.card = el('div', 'card', r, { left: '50%', top: '420px', width: '900px', padding: '40px 0 50px', textAlign: 'center' });
  img('ui/ic_pix.png', s.card, '', { width: '190px', display: 'block', margin: '0 auto' });
  el('div', '', s.card, { fontWeight: 600, fontSize: '52px', color: '#E5156B', marginTop: '14px' }, 'Chave PIX (CNPJ)');
  s.key = el('div', '', s.card, { fontWeight: 700, fontSize: '96px', marginTop: '6px', letterSpacing: '1px', whiteSpace: 'pre' }, '');
  s.aspan = img('ui/logo_aspan.png', r, 'chipimg', { width: '300px', left: '390px', top: '1040px' });
  s.to = el('div', 'abs', r, { left: '0', right: '0', top: '985px', textAlign: 'center', fontWeight: 600, fontSize: '46px', color: '#0B5A1F' }, 'direto para a ASPAN');
}, (s, u, d, t) => {
  pop(s.pill, u, .05, .45, 'translateX(-50%)'); pop(s.card, u, .3, .5, 'translateX(-50%)');
  const K = '03.399.956/0001-04'; const n = Math.round(K.length * prog(u, .7, 2.0)); s.key.textContent = K.slice(0, n).padEnd(K.length, ' ');
  pop(s.aspan, u, d * .42, .5); s.to.style.opacity = prog(u, d * .45, d * .55);
  if (u > d * .5) hearts(t, TLs.s10[0] + d * .5, 9, 41, [540, 905], [540, 1175], 1.2, 420, SPR_HEART, 40, 0);
  if (u > 2.0 && u < 2.6) twinkles(t, [[150, 700], [930, 690]], 5, 34);
}, 'circle');
// S11 — a virada
scene('s11', (s, r) => {
  s.A = photo(r, 'img/s11a.jpg'); s.B = photo(r, 'img/s11b.jpg'); s.C = photo(r, 'img/s11c.jpg');
  s.warm = el('div', 'abs', r, { inset: 0, background: 'radial-gradient(circle at 50% 40%, rgba(255,220,150,.55), rgba(255,200,120,0) 60%)', mixBlendMode: 'screen' });
  el('div', 'vign', r); el('div', 'botshade', r);
}, (s, u, d, t) => {
  cam(s.A.w, u, d * .4, [1.04, 0, 0], [1.14, -40, -60]);
  s.B.w.style.opacity = prog(u, d * .34, d * .4); cam(s.B.w, Math.max(0, u - d * .34), d * .36, [1.06, 0, -20], [1.14, 0, -60]);
  s.C.w.style.opacity = prog(u, d * .64, d * .7); cam(s.C.w, Math.max(0, u - d * .64), d * .36, [1.14, 0, -30], [1.02, 0, 0], eout);
  s.warm.style.opacity = .15 + .6 * prog(u, d * .64, d);
  if (u < d * .4) twinkles(t, [camPoint(s.A.w, window.POS.water[0]), camPoint(s.A.w, window.POS.water[1]), camPoint(s.A.w, window.POS.water[2])], 51, 26);
  if (u > d * .36 && u < d * .68) twinkles(t, [camPoint(s.B.w, window.POS.splash[0]), camPoint(s.B.w, window.POS.splash[1])], 52, 24);
  if (u > d * .66) { risingHearts(t, 12, 53, [100, 300, 880, 1000], 34); motes(t, 22, 54, DOT_GOLD, [0, 0, W, H * .75], [4, 12], .6, 22); }
});
// S12 — final festivo
scene('s12', (s, r) => {
  s.A = photo(r, 'img/s12.jpg'); el('div', 'vign', r); el('div', 'botshade', r);
  s.title = img('ui/title_panel.png', r, 'chipimg', { width: '820px', left: '130px', top: '150px', borderRadius: '40px' });
  s.lock = el('div', 'card', r, { left: '50%', top: '650px', padding: '18px 34px', display: 'flex', alignItems: 'center', gap: '22px', borderRadius: '999px', whiteSpace: 'nowrap' });
  img('ui/logo_dsh.png', s.lock, '', { width: '440px' }); el('div', '', s.lock, { fontSize: '80px', fontWeight: 700, color: '#E5156B' }, '×'); img('ui/logo_aspan.png', s.lock, '', { width: '150px' });
}, (s, u, d, t) => {
  cam(s.A.w, u, d, [1.12, 0, 40], [1.0, 0, 0], eout);
  fireworks(t, TLs.s12[0] + .1, 77, 14);
  pop(s.title, u, .5, .6); pop(s.lock, u, 1.6, .5, 'translateX(-50%)');
  if (u > 1.1) twinkles(t, [[150, 200], [940, 230], [930, 560], [160, 600]], 61, 36);
});
// S13 — tela final com informações
scene('s13', (s, r) => {
  creamBg(r);
  s.title = img('ui/title_panel.png', r, 'chipimg', { width: '700px', left: '190px', top: '70px', borderRadius: '36px' });
  s.date = el('div', 'pill y', r, { top: '490px', left: '50%', transform: 'translateX(-50%)', padding: '10px 40px 12px', fontSize: '56px', whiteSpace: 'nowrap' }, 'Doe até 31/12');
  s.icons = el('div', 'abs', r, { left: '60px', right: '60px', top: '600px', display: 'flex', justifyContent: 'space-around' });
  s.ic = [['ui/ic_racao.png', 'Ração'], ['ui/ic_remedio.png', 'Medicamentos'], ['ui/ic_higiene.png', 'Higiene']].map(([src, tx]) => { const c = el('div', '', s.icons, { textAlign: 'center', width: '300px' }); img(src, c, '', { width: '150px' }); el('div', '', c, { fontWeight: 700, fontSize: '42px' }, tx); return c; });
  s.coleta = el('div', 'card', r, { left: '60px', right: '60px', top: '840px', padding: '22px 30px', display: 'flex', gap: '24px', alignItems: 'center' });
  img('ui/ic_pin.png', s.coleta, '', { width: '120px' });
  el('div', '', s.coleta, { fontSize: '36px', lineHeight: '1.25' }, '<b style="color:#E5156B;font-size:40px">Ponto de coleta: Dog Sweet Home</b><br>Rua Vicente Egberto Cavalcante, 76 · Capim Macio<br><b>Buscamos em casa:</b> <span style="color:#E5156B;font-weight:700">@dogsweethome_natal</span>');
  s.pix = el('div', 'card', r, { left: '60px', right: '60px', top: '1080px', padding: '22px 30px', display: 'flex', gap: '24px', alignItems: 'center' });
  img('ui/ic_pix.png', s.pix, '', { width: '120px' });
  el('div', '', s.pix, { fontSize: '38px', lineHeight: '1.2', flex: '1' }, '<b style="color:#E5156B">Doe via PIX direto para a ASPAN</b><br>Chave PIX (CNPJ):<br><b style="font-size:58px">03.399.956/0001-04</b>');
  img('ui/logo_aspan.png', s.pix, '', { width: '170px' });
  s.foot = el('div', 'abs', r, { left: '0', right: '0', top: '1380px', height: '190px', background: '#E5156B', color: '#fff', textAlign: 'center', fontWeight: 600, fontSize: '42px', lineHeight: '1.25', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 70px' }, 'Sua solidariedade ajuda a garantir mais cuidado,<br>proteção e dignidade aos nossos animais.');
}, (s, u, d, t) => {
  pop(s.title, u, .1, .5); pop(s.date, u, .4, .4, 'translateX(-50%)');
  s.ic.forEach((c, i) => pop(c, u, .6 + i * .12, .4));
  pop(s.coleta, u, 1.0, .45); pop(s.pix, u, 1.25, .45);
  s.foot.style.transform = `translateY(${(1 - eout(prog(u, 1.5, 2.0))) * 260}px)`;
  if (u > 2) twinkles(t, [[120, 150], [960, 140], [980, 470]], 71, 30);
}, 'circle');

// posição de um ponto da imagem depois da transformação da câmera
function camPoint(w, p) { const m = new DOMMatrix(getComputedStyle(w).transform); const x = p[0] - W / 2, y = p[1] - H / 2; return [m.a * x + m.c * y + m.e + W / 2, m.b * x + m.d * y + m.f + H / 2]; }

// ---------- legendas ----------
let curSub = null;
function updSubs(t) {
  const s = window.TL.subs.find(x => t >= x.t0 && t < x.t1);
  if (!s) { SUBS.style.opacity = 0; return; }
  if (s !== curSub) { SUBS.innerHTML = s.html; curSub = s; }
  const p = prog(t, s.t0, s.t0 + .16), q = prog(t, s.t1 - .08, s.t1);
  SUBS.style.opacity = clamp(p * 2) * (1 - q);
  SUBS.style.transform = `scale(${lerp(.9, 1, eback(p))})`;
}

// ---------- quadro ----------
window.sfxTimes = function () {
  const r = rng(77), t0 = TLs.s12[0] + .1, fw = [];
  for (let b = 0; b < 14; b++) { const bt = t0 + b * .55 + r() * .3; r(); r(); r(); r(); fw.push(bt); }
  return { fireworks: fw };
};
window.renderAt = function (t) {
  fx.clearRect(0, 0, W, H);
  SC.forEach((s, i) => {
    const nxt = SC[i + 1];
    const start = i === 0 ? -1 : s.a - XF / 2, end = nxt ? nxt.a + XF / 2 : TOTAL + 1;
    const vis = t >= start && t <= end;
    s.root.style.display = vis ? 'block' : 'none';
    if (!vis) return;
    const ip = i === 0 ? 1 : prog(t, s.a - XF / 2, s.a + XF / 2);
    if (s.trans === 'circle') { s.root.style.opacity = 1; s.root.style.clipPath = ip >= 1 ? 'none' : `circle(${eio(ip) * 120}% at 50% 50%)`; }
    else s.root.style.opacity = ip;
    const u = t - s.a, d = s.b - s.a;
    s.update(s, Math.max(u, 0), d, t);
  });
  updSubs(t);
  FADE.style.opacity = 1 - prog(t, 0, .6);
};
window.ready = (async () => {
  await document.fonts.ready;
  await Promise.all(['500','600','700'].map(w=>document.fonts.load(w+' 40px Fredoka'))); await document.fonts.load('900 40px Nunito');
  window.MAPIMG.src = drawMap().toDataURL('image/jpeg', .92); IMGS.push(window.MAPIMG);
  await Promise.all(IMGS.map(i => i.decode().catch(() => console.warn('falhou', i.src))));
  return true;
})();
