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

// ---------- clipes animados (opcional): render/clips/<nome>/0001.jpg … + clips.js ----------
const CLIPS = window.CLIPS || {};
const PENDING = [];
function photo(parent, name) {
  const w = el('div', 'abs', parent, { left: 0, top: 0, width: W + 'px', height: H + 'px', transformOrigin: '50% 50%' });
  const i = img(`img/${name}.jpg`, w);
  return { w, i, name, clip: CLIPS[name] || null, last: -1 };
}
function play(P, lu, dur) {
  if (!P.clip) return;
  const n = P.clip.n, fps = P.clip.fps || 30, len = n / fps;
  const rate = dur > len ? Math.max(.6, len / dur) : 1;
  const f = Math.min(n - 1, Math.max(0, Math.floor(lu * fps * rate)));
  if (f !== P.last) { P.i.src = `clips/${P.name}/${String(f + 1).padStart(4, '0')}.jpg`; P.last = f; PENDING.push(P.i.decode().catch(() => { })); }
}
// câmera + quadro do clipe de um plano que começa em `start` e dura `dur` (u = tempo local da cena)
function shot(P, u, start, dur, a, b, keep = false, easing = eio) {
  const lu = Math.max(0, u - start);
  if (P.clip && !keep) { const k = .3; a = [1 + (a[0] - 1) * k, a[1] * k, a[2] * k]; b = [1 + (b[0] - 1) * k, b[1] * k, b[2] * k]; }
  cam(P.w, lu, dur, a, b, easing); play(P, lu, dur);
}
function camPoint(w, p) { const m = new DOMMatrix(getComputedStyle(w).transform); const x = p[0] - W / 2, y = p[1] - H / 2; return [m.a * x + m.c * y + m.e + W / 2, m.b * x + m.d * y + m.f + H / 2]; }
function heartSvg(col = '#E5156B', s = 84) { return `<svg width="${s}" height="${s}" viewBox="-60 -66 120 120"><path d="M0 18 C-57 -18 -23 -55 0 -23 C23 -55 57 -18 0 18Z" fill="${col}" stroke="#fff" stroke-width="6"/></svg>`; }
function label(parent, text, icon, top = 260, cls = 'pill') { const p = el('div', cls, parent, { top: top + 'px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }); if (icon) img(icon, p, ''); el('span', '', p, {}, text); return p; }
const POS = window.POS;

// ---------- cenas ----------
const SC = [];
function scene(id, build, update, trans = 'fade') { const root = el('div', 'scene', STAGE); root.style.zIndex = 1 + SC.length; const s = { id, root, a: TLs[id][0], b: TLs[id][1], trans, update }; build(s, root); SC.push(s); return s; }
const shade = r => { el('div', 'vign', r); el('div', 'botshade', r); };

// S1 — enquanto muitos celebram / sozinho
scene('s1', (s, r) => {
  s.A = photo(r, 'n01'); s.B = photo(r, 's01b');
  s.glare = el('div', 'abs', r, { inset: 0, background: 'radial-gradient(circle at 88% 6%, rgba(255,250,220,.9) 0, rgba(255,214,120,.5) 9%, rgba(255,170,60,.15) 30%, rgba(255,150,50,0) 55%)', mixBlendMode: 'screen' });
  shade(r);
}, (s, u, d, t) => {
  const cut = d * .55;
  shot(s.A, u, 0, cut + .3, [1.12, 60, 0], [1.02, -40, 0]);
  s.B.w.style.opacity = prog(u, cut - .2, cut + .2); shot(s.B, u, cut - .2, d - cut + .2, [1.12, 30, 10], [1.03, 0, 0]);
  s.glare.style.opacity = prog(u, cut, cut + .6) * (.7 + .3 * Math.sin(u * 2.2));
  if (u < cut) twinkles(t, [[180, 260], [620, 180], [900, 420], [380, 520]], 3, 26);
  else motes(t, 22, 3, DOT_GOLD, [0, 0, W, H * .8], [4, 12], .5, 14);
});
// S2 — falta água e alimento
scene('s2', (s, r) => { s.A = photo(r, 's02'); s.B = photo(r, 'n02'); shade(r); },
  (s, u, d, t) => {
    const cut = d * .52;
    shot(s.A, u, 0, cut + .3, [1.03, 0, 0], [1.14, -60, -100]);
    s.B.w.style.opacity = prog(u, cut - .2, cut + .2); shot(s.B, u, cut - .2, d - cut + .2, [1.02, 0, 0], [1.12, 40, -60]);
    s.A.i.style.filter = s.B.i.style.filter = `saturate(${lerp(1, .85, u / d)})`;
    motes(t, 14, 5, DOT_GOLD, [0, 0, W, H * .7], [3, 10], .35, 10);
  });
// S3 — ninguém parece enxergar / esperando por alguém
scene('s3', (s, r) => { s.A = photo(r, 's03a'); s.B = photo(r, 's03b'); shade(r); },
  (s, u, d, t) => {
    const cut = d * .52;
    shot(s.A, u, 0, cut + .3, [1.1, 40, 0], [1.12, -40, -10], false, x => x);
    s.B.w.style.opacity = prog(u, cut - .25, cut + .25); shot(s.B, u, cut - .25, d - cut + .25, [1.02, 0, 0], [1.2, 40, 60]);
    s.B.i.style.filter = `saturate(${lerp(1, .85, prog(u, cut, d))}) brightness(${lerp(1, .93, prog(u, d * .75, d))})`;
    if (u > cut + .4 && !s.B.clip) { const g = prog(u, d * .7, d * .8), tw = Math.sin((u - d * .7) * 5); star(...camPoint(s.B.w, POS.tear), 34 + 10 * tw, g * (.6 + .4 * tw), u); }
  });
// S4 — ASPAN
scene('s4', (s, r) => {
  s.A = photo(r, 's04'); shade(r);
  s.logo = img('ui/logo_aspan.png', r, 'abs', { width: '280px', left: '60px', top: '130px', filter: 'drop-shadow(0 14px 18px rgba(0,0,0,.4))' });
  s.badge = el('div', 'card', r, { left: '370px', top: '150px', width: '650px', padding: '20px 0 24px', textAlign: 'center' });
  s.num = el('div', '', s.badge, { fontWeight: 700, fontSize: '170px', lineHeight: '1', color: '#0B5A1F', textShadow: '0 6px 0 #C9E86A' }, '+0');
  el('div', '', s.badge, { fontWeight: 600, fontSize: '60px', color: '#E5156B', marginTop: '4px' }, 'cães e gatos');
}, (s, u, d, t) => {
  shot(s.A, u, 0, d, [1.16, 0, 60], [1.02, 0, 0], false, eout);
  pop(s.logo, u, d * .26, .5);
  if (u > d * .26) twinkles(t, [[70, 150], [330, 200], [300, 420]], 4, 30);
  pop(s.badge, u, d * .6, .5);
  const c = Math.round(500 * eout(prog(u, d * .64, d * .86)));
  s.num.textContent = '+' + c;
  if (c === 500) { const q = Math.sin(prog(u, d * .86, d * .93) * Math.PI); s.badge.style.transform = `scale(${1 + .06 * q})`; if (u < d * .99) twinkles(t, [[400, 170], [990, 200], [960, 400]], 9, 34); }
});
// S5 — ração, medicamentos, higiene, consultas, amor e cuidado
scene('s5', (s, r) => {
  s.shots = [['s05a', 'Ração', 'ui/ic_racao.png', [1.12, 0, 0], [1.0, 0, 0]],
  ['s05c', 'Medicamentos', 'ui/ic_remedio.png', ...POS.remedios],
  ['s05b', 'Higiene', 'ui/ic_higiene.png', [1.0, 0, 0], [1.12, 0, -40]],
  ['s05c', 'Consultas', null, ...POS.consultas],
  ['s05d', 'Amor e cuidado', null, ...POS.carinho]];
  s.P = s.shots.map(([name]) => { const P = photo(r, name); P.w.style.opacity = 0; return P; });
  shade(r);
  s.L = s.shots.map(([name, txt, ic]) => { const L = label(r, txt, ic, 1225); if (!ic) L.insertAdjacentHTML('afterbegin', heartSvg('#FFD21F', 84)); L.style.fontSize = '66px'; return L; });
}, (s, u, d, t) => {
  const n = s.shots.length, seg = d / n;
  s.shots.forEach((sh, i) => {
    const a = i * seg, b = (i + 1) * seg, P = s.P[i], L = s.L[i];
    const op = i === 0 ? 1 : prog(u, a - .1, a + .1); P.w.style.opacity = u > b + .25 && i < n - 1 ? 0 : op;
    shot(P, u, a - .1, seg + .2, sh[3], sh[4], i === 1 || i === 3, x => x);
    const lp = prog(u, a + .05, a + .4); L.style.opacity = u > b - .05 && i < n - 1 ? 0 : clamp(lp * 3); L.style.transform = `translateX(-50%) scale(${lp <= 0 ? .5 : lerp(.5, 1, eback(lp))})`;
  });
  if (u > seg * 4) risingHearts(t, 10, 21, [140, 400, 800, 800], 30);
});
// S6 — a luta
scene('s6', (s, r) => { s.A = photo(r, 's06'); s.glow = el('div', 'abs', s.A.w, { width: '420px', height: '420px', borderRadius: '50%', left: (POS.monitor[0] - 210) + 'px', top: (POS.monitor[1] - 210) + 'px', background: 'radial-gradient(circle, rgba(120,255,170,.55), rgba(120,255,170,0) 65%)', mixBlendMode: 'screen' }); shade(r); s.dim = el('div', 'abs', r, { inset: 0, background: '#000' }); },
  (s, u, d, t) => {
    const per = 60 / 72, ph = (u % per) / per, beat = Math.exp(-ph * 9);
    shot(s.A, u, 0, d, [1.02, 0, 0], [1.12, 30, 40]);
    s.A.i.style.filter = `brightness(${1 + .05 * beat}) saturate(.92)`;
    s.glow.style.opacity = (s.A.clip ? .12 : .25) + .75 * beat * (s.A.clip ? .4 : 1);
    s.dim.style.opacity = .28 * prog(u, d * .62, d * .92);
  });
// S7 — Dog Sweet Home acende as luzes
scene('s7', (s, r) => {
  s.Off = photo(r, 's07off'); s.On = photo(r, 's07on');
  s.bloom = img('img/s07on.jpg', s.On.w, 'ph', { filter: 'blur(18px) brightness(1.3)', mixBlendMode: 'screen', opacity: 0 });
  shade(r);
  s.card = el('div', 'card', r, { left: '50%', top: '230px', padding: '26px 40px', borderRadius: '40px' }); img('ui/logo_dsh.png', s.card, '', { width: '720px', display: 'block' });
}, (s, u, d, t) => {
  shot(s.Off, u, 0, d, [1.0, 0, 0], [1.09, 0, 30]);
  const t1 = .45; let on = 0;
  if (!s.Off.clip) { if (u > t1) on = 1; if (u > t1 + .07 && u < t1 + .16) on = .25; if (u > t1 + .16) on = prog(u, t1 + .16, t1 + .3); }
  s.On.w.style.transform = s.Off.w.style.transform; s.On.w.style.opacity = on; s.bloom.style.opacity = on * (.28 + .12 * Math.sin(u * 4));
  pop(s.card, u, t1 + .35, .5, 'translateX(-50%)');
  if (u > t1) twinkles(t, POS.lights.map(p => camPoint(s.Off.w, p)), 13, 28);
});
// S8 — o que doar + até 31 de dezembro (cenário 3D)
scene('s8', (s, r) => {
  s.A = photo(r, 'n08a'); s.B = photo(r, 'n08b'); shade(r);
  s.pill = label(r, 'O que doar?', null, 120); s.pill.insertAdjacentHTML('afterbegin', heartSvg('#fff', 70));
  s.row = el('div', 'abs', r, { left: '40px', right: '40px', top: '245px', display: 'flex', justifyContent: 'center', gap: '18px' });
  s.items = ['Rações', 'Medicamentos', 'Higiene'].map(tx => el('div', 'pill y', s.row, { position: 'relative', padding: '10px 30px 12px', fontSize: '46px' }, tx));
  s.date = label(r, 'Até 31 de dezembro', null, 130, 'pill y'); s.date.style.fontSize = '64px';
  s.help = el('div', 'card', r, { left: '50%', top: '1185px', padding: '14px 34px 14px 18px', display: 'flex', alignItems: 'center', gap: '18px', borderRadius: '999px', whiteSpace: 'nowrap' });
  img('ui/logo_aspan.png', s.help, '', { width: '120px' }); el('div', '', s.help, { fontSize: '50px', fontWeight: 700, color: '#0B5A1F' }, 'para ajudar a ASPAN');
}, (s, u, d, t) => {
  const cut = d * .55;
  shot(s.A, u, 0, cut + .3, [1.1, 0, 40], [1.0, 0, 0], false, eout);
  s.B.w.style.opacity = prog(u, cut - .2, cut + .2); shot(s.B, u, cut - .2, d - cut + .2, [1.0, 0, 0], [1.1, 0, 40]);
  pop(s.pill, u, .15, .45, 'translateX(-50%)');
  s.items.forEach((it, i) => pop(it, u, .55 + i * .2, .45));
  const h = prog(u, cut - .3, cut); s.pill.style.opacity *= 1 - h; s.row.style.opacity = 1 - h;
  pop(s.date, u, cut + .25, .5, 'translateX(-50%)');
  pop(s.help, u, d * .8, .45, 'translateX(-50%)');
  if (u > cut + .2) twinkles(t, [[300, 520], [800, 560], [760, 980]], 31, 30);
});
// S9 — ponto de coleta (maquete) + busca em casa (van)
scene('s9', (s, r) => {
  s.A = photo(r, 'n09'); s.B = photo(r, 's09'); s.B.w.style.opacity = 0; shade(r);
  s.tag = el('div', 'pill', r, { left: (POS.pin[0]) + 'px', top: (POS.pin[1] - 250) + 'px', transform: 'translateX(-50%)', fontSize: '54px', padding: '10px 36px 12px', whiteSpace: 'nowrap' }, 'Capim Macio');
  s.addr = el('div', 'card', r, { left: '50%', top: '960px', width: '880px', padding: '26px 36px 32px', textAlign: 'center' });
  el('div', 'pill', s.addr, { position: 'relative', display: 'inline-flex', padding: '8px 34px 10px', fontSize: '46px' }, 'Ponto de coleta');
  el('div', '', s.addr, { fontWeight: 700, fontSize: '70px', marginTop: '14px' }, 'Dog Sweet Home');
  el('div', '', s.addr, { fontWeight: 500, fontSize: '44px', marginTop: '8px', color: '#5b3a2e', lineHeight: '1.2' }, 'Rua Vicente Egberto Cavalcante, 76<br>Capim Macio · Natal/RN');
  s.vpill = label(r, 'Buscamos na sua casa!', 'ui/ic_pin.png', 200); s.vpill.style.fontSize = '58px';
  s.insta = el('div', 'card', r, { left: '50%', top: '345px', padding: '14px 40px 18px', fontSize: '54px', fontWeight: 700, color: '#E5156B', whiteSpace: 'nowrap', borderRadius: '999px' }, 'Agende: @dogsweethome_natal');
}, (s, u, d, t) => {
  const cut = d * .52;
  shot(s.A, u, 0, cut + .3, [1.0, 0, 0], [1.14, 0, 80]);
  pop(s.tag, u, .35, .45, 'translateX(-50%)'); pop(s.addr, u, .8, .5, 'translateX(-50%)');
  const h = prog(u, cut - .3, cut); s.tag.style.opacity *= 1 - h; s.addr.style.opacity *= 1 - h;
  if (u < cut) { const [px, py] = camPoint(s.A.w, POS.pin); fx.save(); for (let k = 0; k < 3; k++) { const q = ((u - .3 - k * .45) % 1.35) / 1.35; if (u < .3 || q < 0) continue; fx.globalAlpha = (1 - q) * .8; fx.strokeStyle = '#FF4D8D'; fx.lineWidth = 8; fx.beginPath(); fx.ellipse(px, py + 90, 50 + q * 220, 16 + q * 70, 0, 0, 7); fx.stroke(); } fx.restore(); }
  s.B.w.style.opacity = prog(u, cut - .2, cut + .2); shot(s.B, u, cut - .2, d - cut + .2, [1.12, 60, 0], [1.04, -20, 0], false, eout);
  pop(s.vpill, u, cut + .3, .45, 'translateX(-50%)'); pop(s.insta, u, cut + .55, .45, 'translateX(-50%)');
});
// S10 — PIX no celular
scene('s10', (s, r) => {
  s.A = photo(r, 'n10');
  s.scr = el('div', 'abs', s.A.w, { left: POS.phone.x + 'px', top: POS.phone.y + 'px', width: POS.phone.w + 'px', height: POS.phone.h + 'px', textAlign: 'center', overflow: 'hidden', borderRadius: '46px' });
  img('ui/ic_pix.png', s.scr, '', { width: '150px', marginTop: '40px' });
  el('div', '', s.scr, { fontWeight: 700, fontSize: '40px', color: '#E5156B', marginTop: '10px' }, 'Chave PIX (CNPJ)');
  s.key1 = el('div', '', s.scr, { fontWeight: 700, fontSize: '60px', lineHeight: '1.08', marginTop: '6px', whiteSpace: 'pre', color: '#2A140C' }, '');
  s.key2 = el('div', '', s.scr, { fontWeight: 700, fontSize: '60px', lineHeight: '1.08', whiteSpace: 'pre', color: '#2A140C' }, '');
  s.asp = el('div', '', s.scr, { marginTop: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' });
  img('ui/logo_aspan.png', s.asp, '', { width: '96px' }); el('div', '', s.asp, { fontWeight: 700, fontSize: '36px', color: '#0B5A1F', textAlign: 'left', lineHeight: '1.05' }, 'direto para<br>a ASPAN');
  shade(r);
  s.pill = label(r, 'Doe via PIX', 'ui/ic_money.png', 120);
}, (s, u, d, t) => {
  shot(s.A, u, 0, d, [1.0, 0, 0], [1.05, 0, -20], true);
  pop(s.pill, u, .1, .45, 'translateX(-50%)');
  s.scr.style.opacity = prog(u, .25, .5);
  const K1 = '03.399.956/', K2 = '0001-04', n = Math.round(18 * prog(u, .6, 1.9));
  s.key1.textContent = K1.slice(0, Math.min(n, 11)).padEnd(11, ' '); s.key2.textContent = K2.slice(0, Math.max(0, n - 11)).padEnd(7, ' ');
  pop(s.asp, u, 2.0, .45);
  if (u > 1.0) hearts(t, TLs.s10[0] + 1.0, 14, 41, camPoint(s.A.w, [517, 800]), [560, 330], 1.4, 380, SPR_HEART, 42, 140);
});
// S11 — a virada e a nova chance
scene('s11', (s, r) => {
  s.P = ['s11a', 's11b', 's11c', 'n11'].map(n => photo(r, n));
  s.warm = el('div', 'abs', r, { inset: 0, background: 'radial-gradient(circle at 50% 40%, rgba(255,220,150,.55), rgba(255,200,120,0) 60%)', mixBlendMode: 'screen' });
  shade(r);
}, (s, u, d, t) => {
  const cuts = [0, d * .27, d * .5, d * .7, d];
  const moves = [[[1.04, 0, 0], [1.14, -40, -60]], [[1.06, 0, -20], [1.14, 0, -60]], [[1.14, 0, -30], [1.02, 0, 0]], [[1.12, 0, 40], [1.0, 0, 0]]];
  s.P.forEach((P, i) => { if (i) P.w.style.opacity = prog(u, cuts[i] - .2, cuts[i] + .2); shot(P, u, Math.max(0, cuts[i] - .2), cuts[i + 1] - cuts[i] + .2, ...moves[i], false, i >= 2 ? eout : eio); });
  s.warm.style.opacity = .1 + .6 * prog(u, d * .5, d);
  if (u < cuts[1] && !s.P[0].clip) twinkles(t, POS.water.map(p => camPoint(s.P[0].w, p)), 51, 26);
  if (u > cuts[2]) { risingHearts(t, 12, 53, [100, 300, 880, 1000], 34); motes(t, 22, 54, DOT_GOLD, [0, 0, W, H * .75], [4, 12], .6, 22); }
});
// S12 — final festivo
scene('s12', (s, r) => {
  s.A = photo(r, 's12'); shade(r);
  s.title = img('ui/title_panel.png', r, 'chipimg', { width: '820px', left: '130px', top: '150px', borderRadius: '40px' });
  s.lock = el('div', 'card', r, { left: '50%', top: '650px', padding: '18px 34px', display: 'flex', alignItems: 'center', gap: '22px', borderRadius: '999px', whiteSpace: 'nowrap' });
  img('ui/logo_dsh.png', s.lock, '', { width: '440px' }); el('div', '', s.lock, { fontSize: '80px', fontWeight: 700, color: '#E5156B' }, '×'); img('ui/logo_aspan.png', s.lock, '', { width: '150px' });
}, (s, u, d, t) => {
  shot(s.A, u, 0, d, [1.12, 0, 40], [1.0, 0, 0], false, eout);
  fireworks(t, TLs.s12[0] + .1, 77, Math.round(d / .55));
  pop(s.title, u, .5, .6); pop(s.lock, u, 1.6, .5, 'translateX(-50%)');
  if (u > 1.1) twinkles(t, [[150, 200], [940, 230], [930, 560], [160, 600]], 61, 36);
});
// S13 — tela final: informações no painel de madeira
scene('s13', (s, r) => {
  s.A = photo(r, 'n13');
  s.title = img('ui/title_panel.png', r, 'chipimg', { width: '560px', left: '260px', top: '14px', borderRadius: '30px' });
  const B = POS.board;
  s.board = el('div', 'abs board', s.A.w, { left: B.x + 'px', top: B.y + 'px', width: B.w + 'px', height: B.h + 'px', textAlign: 'center' });
  s.lines = [
    el('div', 'pill y', s.board, { position: 'relative', display: 'inline-flex', padding: '6px 38px 10px', fontSize: '58px', marginTop: '22px' }, 'Doe até 31/12'),
    el('div', 'bt', s.board, { fontSize: '42px', marginTop: '18px' }, 'Ração · Medicamentos · Higiene'),
    el('div', 'bt', s.board, { fontSize: '37px', marginTop: '24px', lineHeight: '1.22' }, '<span class="bp">Ponto de coleta: Dog Sweet Home</span><br>Rua Vicente Egberto Cavalcante, 76<br>Capim Macio · Natal/RN<br>Buscamos em casa: <span class="bp">@dogsweethome_natal</span>'),
    el('div', 'bt', s.board, { fontSize: '38px', marginTop: '24px', lineHeight: '1.12' }, '<span class="bp">PIX direto para a ASPAN (CNPJ)</span><br><span style="font-size:68px">03.399.956/0001-04</span>'),
  ];
}, (s, u, d, t) => {
  shot(s.A, u, 0, d, [1.04, 0, 0], [1.0, 0, 0], false, eout);
  pop(s.title, u, .1, .5);
  s.lines.forEach((e, i) => { const p = prog(u, .5 + i * .25, .9 + i * .25); e.style.opacity = p; e.style.transform = `translateY(${(1 - eout(p)) * 30}px)`; });
  if (u > 1.5) twinkles(t, [[120, 120], [960, 140], [980, 600], [100, 640]], 71, 30);
}, 'fade');

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
  const r = rng(77), t0 = TLs.s12[0] + .1, fw = [], nb = Math.round((TLs.s12[1] - TLs.s12[0]) / .55);
  for (let b = 0; b < nb; b++) { const bt = t0 + b * .55 + r() * .3; r(); r(); r(); r(); fw.push(bt); }
  return { fireworks: fw };
};
window.renderAt = async function (t) {
  fx.clearRect(0, 0, W, H); PENDING.length = 0;
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
  if (PENDING.length) await Promise.all(PENDING);
};
window.ready = (async () => {
  await document.fonts.ready;
  await Promise.all(['500', '600', '700'].map(w => document.fonts.load(w + ' 40px Fredoka'))); await document.fonts.load('900 40px Nunito');
  await Promise.all(IMGS.map(i => i.decode().catch(() => console.warn('falhou', i.src))));
  return true;
})();
