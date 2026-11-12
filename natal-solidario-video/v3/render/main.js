// Natal Solidário Pet: motor das cenas em 2D (canvas). window.renderAt(t) desenha o quadro do instante t (s).
// Personagens: recortes animados por malha com ossos (puppet.js + rigs.js).
(function () {
  const W = 1080, H = 1920;
  const cv = document.getElementById('c'); const ctx = cv.getContext('2d');

  // ---------- utilidades ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const eio = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const eout = t => 1 - Math.pow(1 - t, 3);
  const eback = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const TAU = Math.PI * 2;
  const osc = (u, f, ph = 0) => Math.sin(TAU * f * u + ph);
  const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function mk(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
  // piscadas determinísticas: 0 aberto, 1 fechado
  function blinkAt(u, seed, every = 3.2, dur = .18) {
    const r = rng(seed); let tb = .5 + r() * every * .6, b = 0;
    while (tb < u + 1) { const d = Math.abs(u - tb); if (d < dur / 2) b = Math.max(b, 1 - d / (dur / 2)); tb += every * lerp(.7, 1.3, r()); }
    return Math.min(1, b * 1.25);
  }
  const twitch = (u, t0, w = .07) => Math.exp(-Math.pow((u - t0) / w, 2));

  // ---------- recursos ----------
  const IM = {}, PUP = {};
  const load = (key, src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => { IM[key] = i; res(i); }; i.onerror = () => rej(new Error('falhou ' + src)); i.src = src; });
  const BGS = ['bg_rua_noite', 'bg_calcada_muro', 'bg_janela_familia', 'bg_abrigo_dia', 'bg_sala_noite', 'bg_vet', 'bg_dsh_fachada'];
  const CHS = ['caramelo_sentado_triste', 'caramelo_deitado', 'caramelo_farejando', 'caramelo_cobertor', 'caramelo_atadura', 'caramelo_gorro', 'caramelo_pe', 'gato_rua', 'gato_gorro', 'branco_gorro', 'filhote_gorro', 'voluntaria_abraco', 'mao_petisco', 'pedestre_A', 'pedestre_B'];
  const UIS = ['logo_dsh', 'logo_aspan', 'title', 'ic_pin', 'ic_pix', 'ic_racao', 'ic_remedio', 'ic_higiene', 'ic_cal'];

  // ---------- desenho de personagens ----------
  const NIGHT = [.74, .76, .9, 1], WARM = [1, .96, .88, 1], DAY = [1, 1, 1, 1];
  function pup(g, name, pose, eyes, o) {
    const P = PUP[name]; P.tint = o.tint || DAY; P.add = o.add || [0, 0, 0];
    P.draw(pose || {}, eyes || {});
    const iw = P.img.naturalWidth, ih = P.img.naturalHeight;
    const ax = (o.ax ?? iw / 2), ay = (o.ay ?? ih);
    g.save(); g.translate(o.x, o.y); if (o.rot) g.rotate(o.rot); g.scale(o.flip ? -o.s : o.s, o.s);
    if (o.shadow) {
      const rx = o.shw || iw * .4, ry = rx * .14, cx = (o.shx || 0);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, `rgba(25,12,6,${o.shadow})`); gr.addColorStop(.6, `rgba(25,12,6,${o.shadow * .5})`); gr.addColorStop(1, 'rgba(25,12,6,0)');
      g.save(); g.translate(cx, -4); g.scale(1, ry / rx); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
    }
    g.globalAlpha = o.a ?? 1; g.drawImage(P.canvas, -ax - P.m, -ay - P.m); g.restore();
  }
  // pose padrão de bichinho feliz (rabo, cabeça, orelhas, peito, gorro)
  function happyPose(u, ph = 0, k = 1, o = {}) {
    let f = o.f || 2.4; if (o.cat) { f = 1.1; k *= .45; }
    return {
      root: { sy: 1 + .012 * osc(u, .5, ph) },
      chest: { sx: 1 + .012 * osc(u, .5, ph), sy: 1 + .016 * osc(u, .5, ph) },
      tail: { r: .32 * k * osc(u, f, ph) }, tail1: { r: .28 * k * osc(u, f, ph) }, tail2: { r: .36 * k * osc(u, f, ph - .9) },
      head: { r: (o.tilt ?? .06) * osc(u, .55, ph + 1) },
      earL: { r: .1 * osc(u, 1.1, ph - .5) }, earR: { r: -.09 * osc(u, 1.1, ph - .3) },
      hat: { r: .1 * osc(u, 1.1, ph - 1.3) },
    };
  }

  // ---------- câmera e cenários ----------
  function withCam(g, cam, depth, fn) {
    const z = 1 + (cam.z - 1) * depth, cx = W / 2 + (cam.x - W / 2) * depth, cy = H / 2 + (cam.y - H / 2) * depth;
    g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-cx, -cy); fn(); g.restore();
  }
  function cover(im) { const s = Math.max(W / im.naturalWidth, H / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s; return { s, dw, dh, ox: (W - dw) / 2, oy: (H - dh) / 2 }; }
  function drawBg(g, name) { const im = IM[name], c = cover(im); g.drawImage(im, c.ox, c.oy, c.dw, c.dh); }
  // ponto do cenário (coordenadas da imagem original) no mundo da cena
  function bp(name, x, y) { const c = cover(IM[name]); return [c.ox + x * c.s, c.oy + y * c.s]; }

  // ---------- efeitos ----------
  let VIG;
  function vignette(g, a) { if (a <= 0) return; g.globalAlpha = a; g.drawImage(VIG, 0, 0); g.globalAlpha = 1; }
  function rain(g, t, k, seed = 1, wind = .13) {
    if (k <= 0.01) return;
    const layers = [[.20, 1.4, 150, 1500, 46], [.32, 2.0, 80, 1900, 70], [.42, 3.0, 26, 2500, 115]];
    g.save(); g.lineCap = 'round';
    layers.forEach(([al, lw, n, sp, len], L) => {
      const r = rng(seed * 31 + L); g.strokeStyle = `rgba(214,228,255,${al})`; g.lineWidth = lw; g.beginPath();
      for (let i = 0; i < n; i++) {
        const x0 = r() * (W + 500) - 250, ph = r(), s = sp * lerp(.85, 1.15, r()), span = H + 320;
        if (i / n > k) continue;
        const y = ((ph * span + t * s) % span) - 160, x = x0 + y * wind;
        g.moveTo(x, y); g.lineTo(x - len * wind, y - len);
      }
      g.stroke();
    });
    g.restore();
  }
  function splashes(g, t, k, y0, y1, seed = 5, n = 34) {
    if (k <= 0.01) return; const r = rng(seed); g.save(); g.strokeStyle = 'rgba(220,232,255,1)'; g.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const x = r() * W, yy = r(), per = lerp(.35, .75, r()), ph = r(); if (i / n > k) continue;
      const y = lerp(y0, y1, yy), p = ((t / per + ph) % 1); if (p > .4) continue; const q = p / .4;
      const rr = lerp(3, 20, eout(q)) * lerp(.6, 1.3, yy); g.globalAlpha = (1 - q) * .55;
      g.beginPath(); g.ellipse(x, y, rr, rr * .28, 0, 0, TAU); g.stroke();
    }
    g.restore();
  }
  function glow(g, x, y, r, rgb, a, op = 'screen') {
    if (a <= 0.003) return; const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(.45, `rgba(${rgb},${a * .45})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.save(); g.globalCompositeOperation = op; g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore();
  }
  // sprites
  const SPR_DOT = mk(64, 64, g => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const tint = (spr, col) => mk(spr.width, spr.height, g => { g.drawImage(spr, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, spr.width, spr.height); });
  const SPR_STAR = mk(128, 128, g => { g.translate(64, 64); const gl = g.createRadialGradient(0, 0, 0, 0, 0, 30); gl.addColorStop(0, 'rgba(255,255,255,.9)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill(); g.fillStyle = '#fff'; for (let k = 0; k < 2; k++) { g.save(); g.rotate(k * Math.PI / 2); g.beginPath(); g.moveTo(0, -62); g.quadraticCurveTo(4, -4, 62, 0); g.quadraticCurveTo(4, 4, 0, 62); g.quadraticCurveTo(-4, 4, -62, 0); g.quadraticCurveTo(-4, -4, 0, -62); g.fill(); g.restore(); } });
  const SPR_STAR_Y = tint(SPR_STAR, '#FFE58A');
  function heartPath(g, s) { g.beginPath(); g.moveTo(0, s * .35); g.bezierCurveTo(-s * 1.1, -s * .35, -s * .45, -s * 1.05, 0, -s * .45); g.bezierCurveTo(s * .45, -s * 1.05, s * 1.1, -s * .35, 0, s * .35); g.closePath(); }
  // corações no traço do desenho (contorno marrom)
  const mkHeart = col => mk(140, 140, g => { g.translate(70, 78); heartPath(g, 56); g.fillStyle = col; g.fill(); g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = '#3A1E0E'; g.stroke(); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(-22, -24, 11, 7, -.6, 0, 7); g.fill(); });
  const SPR_HEART = mkHeart('#E8336D'), SPR_HEART_Y = mkHeart('#FFC93C');
  function star(g, x, y, s, a, rot = 0, spr = SPR_STAR) { if (a <= 0) return; g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot); g.drawImage(spr, -s, -s, s * 2, s * 2); g.restore(); }
  function twinkles(g, t, pts, seed, s = 26, spr = SPR_STAR) { const r = rng(seed); for (const [x, y] of pts) { const ph = r() * 6.28, f = lerp(1.5, 3, r()); const a = Math.max(0, Math.sin(t * f + ph)); star(g, x, y, s * (.6 + .4 * a), a * .95, t * .5, spr); } }
  function popHearts(g, u, t0, n, seed, x, y, h = 260, size = 34) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const st = t0 + i * .22, dx = (r() - .5) * 160, sz = size * lerp(.75, 1.15, r()), wob = r() * 6;
      const p = prog(u, st, st + 1.5); if (p <= 0 || p >= 1) continue;
      const s = sz * (p < .2 ? eback(p / .2) : 1);
      g.globalAlpha = p > .75 ? (1 - p) / .25 : 1;
      const xx = x + dx * eout(p) + Math.sin(p * 8 + wob) * 8, yy = y - h * eout(p);
      g.drawImage(i % 3 === 2 ? SPR_HEART_Y : SPR_HEART, xx - s, yy - s, 2 * s, 2 * s);
    }
    g.globalAlpha = 1;
  }
  function risingHearts(g, t, n, seed, area, size = 30) {
    const r = rng(seed); const [x0, y0, w, h] = area;
    for (let i = 0; i < n; i++) {
      const bx = r() * w, ph = r(), sp = lerp(70, 130, r()), sz = size * lerp(.6, 1.2, r()); const cyc = h / sp; const p = ((t / cyc + ph) % 1);
      const x = x0 + bx + Math.sin(t * 2 + ph * 9) * 16, y = y0 + h - p * h;
      g.globalAlpha = Math.sin(p * Math.PI) * .95; g.drawImage(i % 3 ? SPR_HEART : SPR_HEART_Y, x - sz, y - sz, sz * 2, sz * 2);
    }
    g.globalAlpha = 1;
  }
  function snow(g, t, n, seed, a = .8) {
    const r = rng(seed); g.save(); g.fillStyle = '#fff';
    for (let i = 0; i < n; i++) {
      const bx = r() * W, ph = r(), sp = lerp(40, 110, r()), sz = lerp(3, 9, r()), sw = r() * 6;
      const y = ((ph * (H + 40) + t * sp) % (H + 40)) - 20, x = bx + Math.sin(t * .8 + sw) * 24;
      g.globalAlpha = a * lerp(.5, 1, sz / 9); g.beginPath(); g.arc(x, y, sz, 0, TAU); g.fill();
    }
    g.restore();
  }
  // tigela de ração no traço do desenho; part 'back' (interior) ou 'front' (parede)
  function bowl(g, x, y, sc, full, part) {
    g.save(); g.translate(x, y); g.scale(sc, sc); g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = '#3A1E0E';
    const rx = 100, ry = 27, ty = -66, bx = 74;
    if (part === 'back') {
      g.fillStyle = '#7E2620'; g.beginPath(); g.ellipse(0, ty, rx, ry, 0, 0, TAU); g.fill();
      if (full) {
        const r = rng(9), nIn = Math.round(70 * Math.min(1, full * 1.6)), nPile = Math.round(26 * Math.max(0, full * 1.6 - .6));
        g.save(); g.beginPath(); g.ellipse(0, ty, rx - 6, ry - 3, 0, 0, TAU); g.clip();
        for (let i = 0; i < 70; i++) {
          if (i >= nIn) break;
          const a = r() * TAU, d = Math.sqrt(r()), px = Math.cos(a) * d * (rx - 12), py = ty + Math.sin(a) * d * (ry - 6) - (1 - d) * 26 - 8;
          g.fillStyle = r() < .5 ? '#B8742F' : '#9A5A22'; g.beginPath(); g.ellipse(px, py, 11, 8, r() * 3, 0, TAU); g.fill(); g.lineWidth = 2.5; g.stroke();
        }
        g.restore();
        // pilha acima da borda
        const r2 = rng(13);
        for (let i = 0; i < 26; i++) {
          if (i >= nPile) break;
          const px = (r2() - .5) * 140, py = ty - 10 - r2() * 26 * (1 - Math.abs(px) / 80);
          g.fillStyle = r2() < .5 ? '#C27C34' : '#9F5E24'; g.beginPath(); g.ellipse(px, py, 11, 8, r2() * 3, 0, TAU); g.fill(); g.lineWidth = 2.5; g.stroke();
        }
      }
      g.lineWidth = 6; g.beginPath(); g.ellipse(0, ty, rx, ry, 0, Math.PI, TAU); g.stroke();
    } else {
      g.beginPath(); g.moveTo(-rx, ty); g.ellipse(0, ty, rx, ry, 0, Math.PI, 0, true); g.lineTo(bx, 0); g.ellipse(0, 0, bx, 16, 0, 0, Math.PI); g.closePath();
      const gr = g.createLinearGradient(0, ty, 0, 0); gr.addColorStop(0, '#E5473D'); gr.addColorStop(1, '#C23229'); g.fillStyle = gr; g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.ellipse(-52, -34, 9, 20, .5, 0, TAU); g.fill();
      // patinha na tigela
      g.fillStyle = '#FFE7C2'; g.beginPath(); g.ellipse(8, -30, 13, 11, 0, 0, TAU); g.fill();
      [[-10, -46], [4, -52], [20, -50], [30, -40]].forEach(([px, py]) => { g.beginPath(); g.ellipse(px, py, 5, 6, 0, 0, TAU); g.fill(); });
    }
    g.restore();
  }
  function foodBag(g, x, y, rot, sc) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc); g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = INK;
    g.fillStyle = '#D9A066'; g.beginPath(); g.moveTo(-95, -150); g.lineTo(95, -150); g.lineTo(110, 150); g.quadraticCurveTo(0, 168, -110, 150); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#C38448'; g.beginPath(); g.moveTo(-95, -150); g.lineTo(95, -150); g.lineTo(92, -118); g.lineTo(-92, -118); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#E5156B'; rrect(g, -78, -84, 156, 150, 22); g.fill(); g.stroke();
    g.fillStyle = '#FFF4DC'; g.beginPath(); g.ellipse(0, -2, 26, 22, 0, 0, TAU); g.fill();
    [[-30, -34], [-11, -46], [11, -46], [30, -34]].forEach(([a, b]) => { g.beginPath(); g.ellipse(a, b, 9, 11, 0, 0, TAU); g.fill(); });
    g.fillStyle = '#FFF4DC'; g.font = '700 30px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RAÇÃO', 0, 46);
    g.restore();
  }
  // fogos de artifício: horários fixos (também usados para o som)
  const FW_COLS = ['#FF5C93', '#FFD54A', '#86EEFF', '#FFFFFF', '#B9FF6A', '#FF9A4D'];
  const FW_SPR = {}; FW_COLS.forEach(c => FW_SPR[c] = tint(SPR_DOT, c));
  function fwBursts(t0, t1, seed, every = .62) {
    const r = rng(seed), out = [];
    for (let bt = t0; bt < t1; bt += every * lerp(.75, 1.25, r())) out.push({ bt, cx: lerp(110, 970, r()), cy: lerp(120, 470, r()), col: FW_COLS[Math.floor(r() * FW_COLS.length)], spd: lerp(250, 360, r()), n: 40 + Math.floor(r() * 14) });
    return out;
  }
  function fireworks(g, t, bursts, a = 1) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const b of bursts) {
      const tau = t - b.bt; if (tau < -.55 || tau > 2.3) continue;
      if (tau < 0) { const p = 1 + tau / .55; g.globalAlpha = .9 * a; g.drawImage(FW_SPR['#FFD54A'], b.cx - 9, b.cy + (1 - eout(p)) * 520 - 9, 18, 18); continue; }
      const tc = FW_SPR[b.col];
      for (let i = 0; i < b.n; i++) {
        const ang = i / b.n * TAU + b.bt, v = b.spd * (.75 + .25 * Math.sin(i * 7.1 + b.bt * 3));
        const pos = tt => [b.cx + Math.cos(ang) * v * tt * Math.exp(-tt * 1.2), b.cy + Math.sin(ang) * v * tt * Math.exp(-tt * 1.2) + 60 * tt * tt];
        const [x, y] = pos(tau), [x2, y2] = pos(Math.max(0, tau - .09)); const al = Math.max(0, 1 - tau / 2.1) * a;
        g.globalAlpha = al * .75; g.strokeStyle = b.col; g.lineWidth = 3; g.beginPath(); g.moveTo(x2, y2); g.lineTo(x, y); g.stroke();
        const tw = tau > 1 ? .6 + .4 * Math.sin(tau * 30 + i) : 1;
        g.globalAlpha = al * tw; g.drawImage(tc, x - 9, y - 9, 18, 18);
      }
      if (tau < .25) { g.globalAlpha = (1 - tau / .25) * .8 * a; const s = 150; g.drawImage(tc, b.cx - s, b.cy - s, s * 2, s * 2); }
    }
    g.restore();
  }

  // ---------- textos ----------
  const INK = '#3A1E0E', PINK = '#E5156B', YEL = '#FFD21F';
  function parseCap(text) { // *destaque*, \n quebra de linha; sem espaço antes = colado (pontuação)
    return text.split('\n').map(line => {
      const out = []; let hl = false, space = true;
      line.split('*').forEach((seg, i) => { if (i > 0) hl = !hl; (seg.match(/\s+|[^\s]+/g) || []).forEach(tok => { if (/^\s+$/.test(tok)) { space = true; return; } out.push({ w: tok, hl, glue: !space && out.length > 0 }); space = false; }); });
      return out;
    });
  }
  // legenda de livro de história: letra arredondada branca, contorno marrom, destaque amarelo
  function caption(g, t, c) {
    if (t < c.t0 - .01 || t > c.t1) return;
    const lines = c._l || (c._l = parseCap(c.text));
    g.save(); let fs = c.fs || 58; g.font = `700 ${fs}px Fredoka`;
    const lw = ws => ws.reduce((a, o, i) => a + g.measureText(o.w).width + (i && !o.glue ? g.measureText(' ').width : 0), 0);
    const mw = Math.max(...lines.map(lw)); if (mw > 900) { fs *= 900 / mw; g.font = `700 ${fs}px Fredoka`; }
    const lh = fs * 1.2, y0 = (c.y || 1470) - (lines.length - 1) * lh / 2;
    g.textBaseline = 'middle'; g.lineJoin = 'round';
    const sp = g.measureText(' ').width, out = 1 - prog(t, c.t1 - .3, c.t1);
    let k = 0;
    lines.forEach((ws, li) => {
      const widths = ws.map(o => g.measureText(o.w).width), tw = lw(ws);
      let x = (c.x || W / 2) - tw / 2; const y = y0 + li * lh;
      ws.forEach((o, i) => {
        if (i && !o.glue) x += sp;
        const p = prog(t, c.t0 + k * .05, c.t0 + k * .05 + .3); k++;
        if (p > 0) {
          const a = p * out, dy = (1 - eout(p)) * 16;
          g.globalAlpha = a; g.shadowColor = 'rgba(10,4,2,.55)'; g.shadowBlur = 16; g.shadowOffsetY = 5;
          g.lineWidth = fs * .22; g.strokeStyle = INK; g.strokeText(o.w, x, y + dy);
          g.shadowColor = 'transparent'; g.fillStyle = o.hl ? YEL : '#FFFFFF'; g.fillText(o.w, x, y + dy);
        }
        x += widths[i];
      });
    });
    g.restore();
  }
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // cartão "adesivo": creme com contorno marrom e sombra sólida
  function sticker(g, x, y, w, h, r, fill = '#FFF8EC', lw = 7) {
    g.save(); g.fillStyle = 'rgba(58,30,14,.28)'; rrect(g, x, y + 12, w, h, r); g.fill();
    g.fillStyle = fill; rrect(g, x, y, w, h, r); g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); g.restore();
  }
  function popScale(u, t0, dur = .5) { const p = prog(u, t0, t0 + dur); return p <= 0 ? 0 : eback(p); }
  function drawAt(g, im, x, y, w, h, s = 1, a = 1, rot = 0) { if (s <= 0 || a <= 0) return; g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot); g.scale(s, s); g.drawImage(im, -w / 2, -h / 2, w, h); g.restore(); }
  function iconCircle(g, im, x, y, d, s = 1) { // ícone do card dentro de círculo
    if (s <= 0) return; g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = 'rgba(58,30,14,.25)'; g.beginPath(); g.arc(0, 8, d / 2, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(0, 0, d / 2, 0, TAU); g.clip(); g.fillStyle = '#fff'; g.fill(); const k = 1.08; g.drawImage(im, -d * k / 2, -d * k / 2, d * k, d * k); g.restore();
    g.lineWidth = 6; g.strokeStyle = INK; g.beginPath(); g.arc(0, 0, d / 2, 0, TAU); g.stroke(); g.restore();
  }
  // ícones vetoriais no estilo do desenho (para o chamado final)
  function iconGift(g) { g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = INK;
    g.fillStyle = '#E5156B'; rrect(g, -46, -14, 92, 66, 8); g.fill(); g.stroke(); g.fillStyle = '#FF3D86'; rrect(g, -54, -38, 108, 28, 8); g.fill(); g.stroke();
    g.fillStyle = YEL; g.fillRect(-10, -38, 20, 90); g.strokeRect(-10, -38, 20, 90);
    g.beginPath(); g.ellipse(-20, -50, 20, 12, -.5, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.ellipse(20, -50, 20, 12, .5, 0, TAU); g.fill(); g.stroke(); }
  function iconHands(g) { g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = INK;
    g.fillStyle = '#F7C08A'; g.beginPath(); g.moveTo(-62, 30); g.quadraticCurveTo(-30, 62, 0, 40); g.quadraticCurveTo(30, 62, 62, 30); g.lineTo(54, 6); g.quadraticCurveTo(30, 30, 0, 18); g.quadraticCurveTo(-30, 30, -54, 6); g.closePath(); g.fill(); g.stroke();
    g.save(); g.translate(0, -16); heartPath(g, 40); g.fillStyle = '#E5156B'; g.fill(); g.stroke(); g.restore(); }
  function iconShare(g) { g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = INK;
    g.fillStyle = '#4FB3FF'; g.beginPath(); g.moveTo(-50, -6); g.lineTo(54, -46); g.lineTo(18, 54); g.lineTo(2, 12); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#2D8FE0'; g.beginPath(); g.moveTo(2, 12); g.lineTo(54, -46); g.lineTo(-50, -6); g.closePath(); g.fill(); g.stroke(); }

  // ---------- cenas ----------
  const SC = [];
  const scene = (id, a, b, draw, trans = 'fade', xf = .6) => SC.push({ id, a, b, draw, trans, xf });
  const CAPS = [];
  const cap = (t0, t1, text, o = {}) => CAPS.push(Object.assign({ t0, t1, text }, o));

  // 1. Rua de Natal à noite, chuva; a câmera desce até a calçada molhada
  scene('s1', 0, 7.5, (g, u, d, t) => {
    const im = IM.bg_rua_noite, c = cover(im), p = eio(clamp(u / (d + .4))), z = lerp(1.0, 1.05, p);
    g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2);
    const oy = lerp(0, H - c.dh, p); g.drawImage(im, c.ox, oy, c.dw, c.dh);
    glow(g, c.ox + 762 * c.s, oy + 192 * c.s, 300, '255,205,120', .38 + .06 * osc(u, 1.1));
    glow(g, c.ox + 150 * c.s, oy + 660 * c.s, 330, '255,190,100', .22 + .05 * osc(u, .7));
    glow(g, c.ox + 520 * c.s, oy + 830 * c.s, 200, '255,190,100', .16 + .05 * osc(u, .9, 1));
    g.restore();
    rain(g, t, 1, 11); splashes(g, t, 1, 1350, 1900, 3); vignette(g, .6);
  });
  cap(.5, 7.3, 'Enquanto tantas famílias\nse preparam para celebrar o *Natal*…');

  // 2a. O Caramelo fareja uma tigela vazia na calçada
  scene('s2a', 7.5, 11.5, (g, u, d, t) => {
    const e = eio(clamp(u / d)), cam = { x: lerp(560, 600, e), y: lerp(1060, 1100, e), z: lerp(1.07, 1.14, e) };
    withCam(g, cam, .85, () => drawBg(g, 'bg_calcada_muro'));
    withCam(g, cam, 1, () => {
      const sniff = (u % 1.3) < .7 ? .014 * osc(u, 7.5) : 0, look = prog(u, 2.7, 3.4);
      const pose = {
        back: { sy: 1 + .012 * osc(u, .5) }, tail1: { r: .06 * osc(u, .6) - .05 }, tail2: { r: .1 * osc(u, .6, -.8) },
        head: { r: lerp(.05 + .04 * osc(u, .5), -.07, eio(look)) + sniff * (1 - look) },
        earL: { r: .05 * osc(u, .5, -.6) + .03 }, earR: { r: -.04 * osc(u, .5, -.4) },
      };
      bowl(g, 868, 1388, .9, false, 'back');
      pup(g, 'caramelo_farejando', pose, { blink: blinkAt(u, 3, 2.4, .26) }, { x: 470, y: 1384, s: .62, tint: NIGHT, shadow: .45 });
      bowl(g, 868, 1388, .9, false, 'front');
    });
    rain(g, t, 1, 21); splashes(g, t, 1, 1420, 1900, 7); vignette(g, .55);
  });
  cap(7.65, 11.4, '…milhares de *patinhas* ainda enfrentam\na fome, o abandono…');

  // 2b. Encolhido sobre o papelão, tremendo; um gatinho molhado no muro
  scene('s2b', 11.5, 15.5, (g, u, d, t) => {
    const e = eio(clamp(u / d)), cam = { x: lerp(500, 470, e), y: lerp(1000, 960, e), z: lerp(1.1, 1.16, e) };
    withCam(g, cam, .85, () => drawBg(g, 'bg_calcada_muro'));
    withCam(g, cam, 1, () => {
      const sh = 1.6 * osc(u, 13) + .8 * osc(u, 17.3, 1);
      const pc = {
        root: { tx: sh, r: .003 * osc(u, 9.2) }, back: { sy: 1 + .03 * osc(u, .42), sx: 1 - .006 * osc(u, .42) },
        tail: { r: .03 * osc(u, 9, 1) }, head: { r: -.025 * prog(u, .5, 2.5) + .006 * osc(u, 11), ty: -4 * osc(u, .42) },
        earL: { r: .025 * osc(u, 9.5) }, earR: { r: -.02 * osc(u, 8.7) },
      };
      pup(g, 'caramelo_deitado', pc, { blink: blinkAt(u, 5, 2.2, .34) }, { x: 520, y: 1338, s: .6, tint: NIGHT, shadow: .5 });
      const tw = .3 * twitch(u, 1.4) - .25 * twitch(u, 3.1);
      const pg = { root: { tx: 1.2 * osc(u, 12.5, 2) }, chest: { sy: 1 + .02 * osc(u, .5) }, head: { r: .04 * osc(u, .3) + .005 * osc(u, 10) }, earL: { r: tw }, earR: { r: -.2 * twitch(u, 2.2) } };
      pup(g, 'gato_rua', pg, { blink: blinkAt(u, 8, 2.8, .26) }, { x: 330, y: 640, s: .34, tint: NIGHT, shadow: .4 });
    });
    rain(g, t, 1, 23); splashes(g, t, 1, 1420, 1900, 9); vignette(g, .55);
  });
  cap(11.6, 15.4, '…e a espera silenciosa\npor *alguém que se importe*.');

  // 3. Olhinhos marejados diante da janela da família; pessoas passam sem parar
  const WALK = (u, ph = 0) => { const f = .95; return { legF: { r: .32 * osc(u, f, ph) }, legB: { r: -.32 * osc(u, f, ph) }, root: { r: .012 * osc(u, f * 2, ph) } }; };
  const bob = (u, ph = 0) => -9 * Math.abs(Math.sin(Math.PI * 1.9 * u + ph));
  scene('s3', 15.5, 23.5, (g, u, d, t) => {
    const zo = eio(prog(u, 3.6, 5.6)), cam = { x: lerp(440, 540, zo), y: lerp(900, 960, zo), z: lerp(1.75, 1.0, zo) + .04 * prog(u, 5.6, 8) };
    withCam(g, cam, .85, () => drawBg(g, 'bg_janela_familia'));
    withCam(g, cam, .85, () => glow(g, 650, 520, 520, '255,200,120', .18 + .04 * osc(u, .6)));
    withCam(g, cam, 1, () => {
      // pedestres com guarda-chuva (passam por trás do Caramelo)
      // entram caminhando pela borda esquerda (fora do quadro mesmo com a câmera aberta)
      const wx = u2 => -350 + (u2 - 3.3) * 360;
      if (u > 3.3) {
        pup(g, 'pedestre_B', WALK(u, .5), null, { x: wx(u), y: 1400 + bob(u, .5), s: .74, tint: NIGHT, shadow: .35 });
        pup(g, 'pedestre_A', WALK(u, 0), null, { x: wx(u) - 560, y: 1402 + bob(u), s: .76, tint: NIGHT, shadow: .35 });
      }
      const pose = {
        chest: { sx: 1 + .01 * osc(u, .45), sy: 1 + .014 * osc(u, .45) }, tail1: { r: .015 * osc(u, .4) }, tail2: { r: .03 * osc(u, .4, -1) },
        head: { r: -.03 + .035 * osc(u, .22, 1.2) }, earL: { r: .03 * osc(u, .22, .6) }, earR: { r: -.02 * osc(u, .22, .8) },
      };
      pup(g, 'caramelo_sentado_triste', pose, { blink: blinkAt(u, 12, 3.4, .32), tear: u / 2.3 }, { x: 300, y: 1610, s: .62, tint: [.82, .82, .94, 1], shadow: .45 });
    });
    rain(g, t, 1, 31); splashes(g, t, .9, 1450, 1900, 11); vignette(g, .5);
  });
  cap(15.65, 19.4, 'Existem *olhinhos* que já não\nesperam muito da vida.');
  cap(19.55, 23.4, 'Corpinhos que conheceram o *frio*,\na *rua* e a *indiferença*.');

  // 4. Uma mão oferece um petisco: orelhas sobem, o rabo começa a abanar, a chuva para
  scene('s4', 23.5, 31.5, (g, u, d, t) => {
    const e = eio(clamp(u / d)), cam = { x: lerp(600, 580, e), y: lerp(1010, 980, e), z: lerp(1.12, 1.22, e) };
    const warm = eio(prog(u, 2, 6)), rk = 1 - prog(u, 1.5, 6.2);
    withCam(g, cam, .85, () => drawBg(g, 'bg_calcada_muro'));
    withCam(g, cam, 1, () => {
      const hand = eout(prog(u, .6, 2.8)), hx = lerp(-420, 470, hand) + 6 * osc(u, .8), hy = 905 + 5 * osc(u, .8, 1);
      const sn = prog(u, 2.2, 3.2), perk = prog(u, 3.9, 4.6), wagk = prog(u, 4.1, 5.2);
      const sniff = (u > 2.6 && u < 4) ? .012 * osc(u, 8) : 0;
      const pose = {
        chest: { sx: 1 + .01 * osc(u, .5), sy: 1 + .016 * osc(u, .5) },
        tail1: { r: .3 * wagk * osc(u, 2.8) }, tail2: { r: .38 * wagk * osc(u, 2.8, -.9) },
        head: { r: lerp(-.03, .1, eio(sn)) - .14 * eio(perk) + .03 * perk * osc(u, 1.3) + sniff },
        earL: { r: .32 * eback(perk) + .05 * perk * osc(u, 2.6) }, earR: { r: -.26 * eback(perk) - .04 * perk * osc(u, 2.6, .5) },
      };
      const tn = mix3(NIGHT, WARM, warm);
      pup(g, 'caramelo_sentado_triste', pose, { blink: blinkAt(u, 21, 3, .2), tear: u < 2.6 ? u / 2.3 : 0 }, { x: 760, y: 1420, s: .62, flip: true, tint: tn, shadow: .45 });
      pup(g, 'mao_petisco', { hand: { r: .03 * osc(u, .8) } }, null, { x: hx, y: hy, s: .62, ax: 1100, ay: 330, tint: mix3([.82, .8, .9, 1], WARM, warm) });
      glow(g, 520, 880, 560, '255,196,110', .42 * warm);
      popHearts(g, u, 5.4, 4, 4, 640, 640, 300, 34);
    });
    rain(g, t, rk, 41); splashes(g, t, rk, 1450, 1900, 13); vignette(g, .5 - .2 * warm);
  });
  cap(23.65, 27.4, 'E, mesmo assim, continuam oferecendo\no que têm de *mais precioso*:');
  cap(27.55, 31.4, 'a capacidade de *amar*, *confiar*\ne *acreditar* de novo.');

  // 5. Manhã no abrigo: os bichinhos brincam; entram os logos
  scene('s5', 31.5, 36.5, (g, u, d, t) => {
    const e = eio(clamp(u / d)), cam = { x: 540, y: lerp(990, 960, e), z: lerp(1.08, 1.04, e) };
    withCam(g, cam, .85, () => drawBg(g, 'bg_abrigo_dia'));
    withCam(g, cam, 1, () => {
      const pets = [['gato_gorro', 250, .4, 0], ['branco_gorro', 545, .41, 1.7], ['filhote_gorro', 830, .41, 3.1]];
      pets.forEach(([n, x, s, ph], i) => {
        const hop = Math.abs(Math.sin(Math.PI * 1.5 * u + ph)), pose = happyPose(u, ph, 1, { cat: n === 'gato_gorro' }); pose.root = { sy: 1 + .035 * (hop - .5), sx: 1 - .02 * (hop - .5) };
        pup(g, n, pose, { blink: blinkAt(u, 30 + i, 2.6) }, { x, y: 1360 - hop * 34, s, shadow: .3 * (1 - hop * .5) });
      });
    });
    // logos num cartão
    const s1 = popScale(u, .5), s2 = popScale(u, .85);
    if (s1 > 0) {
      g.save(); g.translate(540, 360); g.scale(s1, s1); sticker(g, -440, -130, 880, 260, 60); g.restore();
      drawAt(g, IM.logo_dsh, 400, 360, 560, 158, s1);
      drawAt(g, IM.logo_aspan, 835, 360, 205, 208, s2);
      twinkles(g, t, [[130, 250], [980, 250], [120, 470], [960, 480]], 5, 22, SPR_STAR_Y);
    }
  }, 'iris', .9);
  cap(31.75, 36.4, 'É *por eles* que estamos aqui.', { fs: 66 });

  // 6a. Ração: comendo da tigela cheia, rabo abanando
  scene('s6a', 36.5, 41, (g, u, d, t) => {
    const e = eio(clamp(u / d)), cam = { x: lerp(600, 620, e), y: lerp(1160, 1140, e), z: lerp(1.2, 1.26, e) };
    withCam(g, cam, .85, () => drawBg(g, 'bg_abrigo_dia'));
    withCam(g, cam, 1, () => {
      // o pacote entra, despeja a ração (0,45 a 1,75 s) e sai
      const bin = eout(prog(u, 0, .45)), bout = prog(u, 1.75, 2.2), tilt = eio(prog(u, .3, .6)) * (1 - eio(bout));
      const bx = 935 + (1 - bin) * 380 + bout * 420, by = 905 - (1 - bin) * 300 - bout * 260, fill = prog(u, .5, 1.7);
      const eat = prog(u, 1.7, 2.1), dip = Math.max(0, osc(u - 1.7, 1.4)) * eat, pose = {
        back: { sy: 1 + .012 * osc(u, .5) }, tail1: { r: .26 * osc(u, 2.6) + .05 }, tail2: { r: .34 * osc(u, 2.6, -.9) },
        head: { r: lerp(-.06, .1, eat) + .07 * dip + .01 * eat * osc(u, 9) }, earL: { r: .06 * osc(u, 1.4, -.6) + .1 * (1 - eat) }, earR: { r: -.05 * osc(u, 1.4, -.4) - .08 * (1 - eat) },
      };
      bowl(g, 880, 1418, .9, fill, 'back');
      pup(g, 'caramelo_farejando', pose, { blink: blinkAt(u, 40, 2.8) }, { x: 480, y: 1414, s: .62, shadow: .35 });
      bowl(g, 880, 1418, .9, fill, 'front');
      // grãos caindo do pacote
      const r = rng(77);
      for (let i = 0; i < 46; i++) {
        const st = .45 + r() * 1.2, dx = (r() - .5) * 50, sz = lerp(7, 11, r()), p = prog(u, st, st + .42); if (p <= 0 || p >= 1) continue;
        const x0 = bx - 120, y0 = by + 70, x = lerp(x0, 880 + dx, p), y = y0 + (1336 - y0) * p * p;
        g.fillStyle = r() < .5 ? '#B8742F' : '#9A5A22'; g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, y, sz, sz * .75, p * 6 + i, 0, TAU); g.fill(); g.stroke();
      }
      if (bin > 0 && bout < 1) foodBag(g, bx, by, -1.15 * tilt - .15, .9);
      popHearts(g, u, 2.7, 3, 6, 760, 1050, 220, 28);
    });
  });
  cap(36.65, 40.9, 'Cada pacote de *ração*\né uma barriga alimentada.');

  // 6b. Cobertor: dormindo quentinho
  scene('s6b', 41, 45.5, (g, u, d, t) => {
    const e = eio(clamp(u / d)), cam = { x: 540, y: lerp(1020, 990, e), z: lerp(1.06, 1.12, e) };
    withCam(g, cam, .85, () => { drawBg(g, 'bg_sala_noite'); const [lx, ly] = bp('bg_sala_noite', 195, 300); glow(g, lx, ly, 380, '255,200,120', .3 + .04 * osc(u, .5)); });
    withCam(g, cam, 1, () => {
      const br = osc(u, .3), pose = {
        blanket: { sy: 1 + .022 * br, sx: 1 - .006 * br }, head: { r: .012 * br, ty: -3 * br },
        earL: { r: .18 * twitch(u, 2.1, .06) + .01 * br }, earR: { r: -.015 * br - .12 * twitch(u, 3.3, .06) },
      };
      pup(g, 'caramelo_cobertor', pose, null, { x: 540, y: 1400, s: .74, tint: [1, .95, .86, 1], shadow: .35 });
      // Zzz
      for (let i = 0; i < 3; i++) {
        const p = ((u + i * .75) % 2.25) / 2.25, x = 700 + p * 140 + Math.sin(p * 6 + i) * 14, y = 820 - p * 300, s = lerp(52, 96, p);
        g.save(); g.globalAlpha = Math.sin(p * Math.PI); g.font = `700 ${s}px Fredoka`; g.textAlign = 'center'; g.lineJoin = 'round';
        g.lineWidth = s * .2; g.strokeStyle = INK; g.strokeText('Z', x, y); g.fillStyle = '#FFF4D8'; g.fillText('Z', x, y); g.restore();
      }
    });
    vignette(g, .35);
  });
  cap(41.15, 45.4, 'Cada *cobertorzinho*,\numa noite mais quentinha.');

  // 6c. Medicamento: com curativo, já abanando o rabo
  scene('s6c', 45.5, 50.5, (g, u, d, t) => {
    const e = eio(clamp(u / d)), cam = { x: 545, y: lerp(990, 960, e), z: lerp(1.08, 1.14, e) };
    withCam(g, cam, .85, () => drawBg(g, 'bg_vet'));
    withCam(g, cam, 1, () => {
      const pose = happyPose(u, .4, 1, { f: 2.5, tilt: .07 });
      pup(g, 'caramelo_atadura', pose, { blink: blinkAt(u, 50, 2.7) }, { x: 560, y: 1440, s: .62, shadow: .35 });
      twinkles(g, t, [[690, 1280], [760, 1350], [640, 1370]], 21, 22, SPR_STAR_Y);
      popHearts(g, u, 3, 3, 8, 700, 760, 220, 28);
    });
  });
  cap(45.65, 50.4, 'Cada *medicamento*, um tratamento\nque pode continuar.');

  // 7. Abraço da voluntária
  scene('s7', 50.5, 55.5, (g, u, d, t) => {
    const e = eio(clamp(u / d)), cam = { x: lerp(540, 550, e), y: lerp(1000, 980, e), z: lerp(1.1, 1.16, e) };
    withCam(g, cam, .85, () => drawBg(g, 'bg_abrigo_dia'));
    withCam(g, cam, 1, () => {
      const pose = { root: { r: .022 * osc(u, .42) }, heads: { r: .028 * osc(u, .42, .7) }, tail1: { r: .3 * osc(u, 2.6) }, tail2: { r: .36 * osc(u, 2.6, -.9) }, earDog: { r: .1 * osc(u, 1.3) } };
      pup(g, 'voluntaria_abraco', pose, null, { x: 540, y: 1440, s: .8, shadow: .3 });
      risingHearts(g, t, 9, 71, [240, 520, 600, 520], 28);
    });
  });
  cap(50.65, 55.4, 'E a certeza de que eles\n*não foram esquecidos*.');

  // fundo festivo 2D (creme, patinhas, varal de luzes, neve)
  let PAWS;
  function festiveBg(g, t) {
    g.fillStyle = '#FBF0DA'; g.fillRect(0, 0, W, H);
    const gr = g.createRadialGradient(540, 900, 100, 540, 900, 1200); gr.addColorStop(0, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(240,205,160,.5)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.drawImage(PAWS, 0, 0);
    // varal de luzes
    const cols = ['#E8336D', '#FFD21F', '#3CC46B', '#4FB3FF'];
    for (let row = 0; row < 2; row++) {
      const y0 = row ? 175 : 95, sag = row ? 70 : 60, n = 11;
      g.strokeStyle = '#3A1E0E'; g.lineWidth = 5; g.beginPath();
      for (let i = 0; i <= 40; i++) { const x = -20 + i * (W + 40) / 40, y = y0 + sag * Math.sin(Math.PI * i / 40) + (row ? 0 : 0); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      for (let i = 0; i < n; i++) {
        const k = (i + .5 + row * .5) / n, x = -20 + k * (W + 40), y = y0 + sag * Math.sin(Math.PI * k) + 14, c = cols[(i + row) % 4], on = .55 + .45 * Math.max(0, Math.sin(t * 3 + i * 1.7 + row));
        glow(g, x, y + 14, 60, c === '#FFD21F' ? '255,220,90' : c === '#E8336D' ? '255,90,140' : c === '#3CC46B' ? '110,240,150' : '120,200,255', .45 * on, 'source-over');
        g.save(); g.translate(x, y); g.fillStyle = c; g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.ellipse(0, 16, 13, 20, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#7A5A3A'; g.fillRect(-8, -6, 16, 10); g.strokeRect(-8, -6, 16, 10); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-4, 10, 4, 7, 0, 0, TAU); g.fill(); g.restore();
      }
    }
    snow(g, t, 60, 3, .9);
  }
  const BEAT = 1 / (2 * .4645);
  const GANG = (g, u, y, xs, s0 = .4, ph0 = 0) => {
    const beat = BEAT, q = Math.PI / 2;
    const L = [['caramelo_gorro', xs[0], s0 * 1.08, ph0], ['gato_gorro', xs[1], s0 * .92, ph0 + q], ['branco_gorro', xs[2], s0 * .94, ph0 + q], ['filhote_gorro', xs[3], s0 * .94, ph0]];
    L.sort((a, b) => a[2] - b[2]).forEach(([n, x, s, ph], i) => {
      const hop = Math.abs(Math.sin(Math.PI * beat * u + ph)), pose = happyPose(u, ph, 1, { f: 2.2, cat: n === 'gato_gorro' }); pose.root = { sy: 1 + .04 * (hop - .5), sx: 1 - .02 * (hop - .5) };
      pup(g, n, pose, { blink: blinkAt(u, 60 + i, 2.7) }, { x, y: y - hop * 30, s, shadow: .3 * (1 - hop * .4) });
    });
  };
  // 8. Chamado: doe / ajude / compartilhe
  const CTA = [['Se você pode ', 'doar', ', doe.', iconGift], ['Se pode ', 'ajudar', ', ajude.', iconHands], ['Se não pode, ', 'compartilhe', '.', iconShare]];
  scene('s8', 55.5, 64.5, (g, u, d, t) => {
    festiveBg(g, t);
    GANG(g, u, 1560, [300, 110, 560, 830], .42, 2.391);
    CTA.forEach(([a, b, c, ic], i) => {
      const t0 = .22 + i * 2.787, s = popScale(u, t0, .55); if (s <= 0) return;
      const act = i === Math.min(2, Math.floor((u - .22) / 2.787)), y = 380 + i * 215, k = act ? 1 : .9;
      g.save(); g.translate(540, y); g.scale(s * k, s * k);
      g.font = '700 62px Fredoka'; const wa = g.measureText(a).width, wb = g.measureText(b).width, wc = g.measureText(c).width, tw = wa + wb + wc, bw = tw + 190;
      sticker(g, -bw / 2, -78, bw, 156, 78, act ? '#FFF8EC' : '#F6EBDA');
      g.save(); g.translate(-bw / 2 + 82, 0); g.fillStyle = YEL; g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 58, 0, TAU); g.fill(); g.stroke(); g.scale(.82, .82); ic(g); g.restore();
      g.textBaseline = 'middle'; let x = -bw / 2 + 160; g.fillStyle = INK; g.fillText(a, x, 4); x += wa; g.fillStyle = PINK; g.fillText(b, x, 4); x += wb; g.fillStyle = INK; g.fillText(c, x, 4);
      g.restore();
    });
    twinkles(g, t, [[90, 330], [990, 360], [80, 980], [1000, 1000]], 9, 24, SPR_STAR_Y);
  }, 'iris', .9);

  // 9. Diante da Dog Sweet Home iluminada, com fogos
  const FW9 = fwBursts(64.6, 80.3, 99);
  scene('s9', 64.5, 72.5, (g, u, d, t) => {
    const e = eio(clamp(u / d)), cam = { x: 540, y: lerp(1000, 940, e), z: lerp(1.04, 1.1, e) };
    withCam(g, cam, .85, () => {
      drawBg(g, 'bg_dsh_fachada');
      // placa com o logo da Dog Sweet Home sobre a placa da fachada
      const [sx, sy] = bp('bg_dsh_fachada', 140, 742); g.save(); g.translate(sx, sy); sticker(g, -150, -66, 300, 132, 34, '#FFF8EC', 6); g.drawImage(IM.logo_dsh, -132, -37, 264, 74); g.restore();
    });
    withCam(g, cam, .5, () => fireworks(g, t, FW9));
    withCam(g, cam, 1, () => GANG(g, u, 1600, [470, 250, 700, 900], .4, 1.410));
    vignette(g, .3);
  });
  cap(64.65, 72.4, 'Porque o verdadeiro *espírito do Natal*\nestá naquilo que somos\ncapazes de *oferecer*.', { y: 330, fs: 58 });

  // 10. Título da campanha
  let BLUR10;
  scene('s10', 72.5, 80.5, (g, u, d, t) => {
    g.drawImage(BLUR10, 0, 0); g.fillStyle = 'rgba(40,16,30,.35)'; g.fillRect(0, 0, W, H);
    fireworks(g, t, FW9, .6);
    const s1 = popScale(u, .41, .6), s2 = popScale(u, .87, .5), s3 = prog(u, 1.4, 1.9);
    drawAt(g, IM.title, 540, 520 + 8 * osc(u, .5), 940, 538, s1, 1, .015 * osc(u, .5));
    if (s2 > 0) {
      g.save(); g.translate(540, 990); g.scale(s2, s2); sticker(g, -450, -150, 900, 300, 56);
      g.drawImage(IM.logo_dsh, -420, -128, 470, 132);
      g.fillStyle = PINK; g.font = '700 84px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('+', 110, -60);
      g.drawImage(IM.logo_aspan, 190, -140, 210, 213);
      g.globalAlpha = s3; g.fillStyle = INK; g.font = '600 40px Fredoka'; g.fillText('Juntos por aqueles que não podem pedir', 0, 102);
      g.restore();
    }
    risingHearts(g, t, 8, 33, [80, 1150, 920, 650], 26);
  });
  cap(72.7, 76.4, 'Neste Natal, seja parte de\numa *história de amor*.', { y: 1470 });
  cap(76.55, 80.4, 'Que nenhuma patinha passe este Natal\nsem sentir o *calor da solidariedade*.', { y: 1470, fs: 56 });

  // 11. Informações da campanha
  scene('s11', 80.5, 88.5, (g, u, d, t) => {
    g.fillStyle = '#FBF0DA'; g.fillRect(0, 0, W, H); g.drawImage(PAWS, 0, 0);
    const T = (txt, x, y, f, col = INK, al = 'left') => { g.font = f; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(txt, x, y); };
    const s0 = popScale(u, .1, .5);
    if (s0 > 0) { g.save(); g.translate(540, 250); g.scale(s0, s0); g.font = '700 86px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = 16; g.strokeStyle = '#fff'; g.strokeText('Como ajudar', 0, 0); g.fillStyle = PINK; g.fillText('Como ajudar', 0, 0); g.restore(); }
    const rows = [
      [.305, 'ic_pin', 'Ponto de coleta: Dog Sweet Home', ['Rua Vicente Egberto Cavalcante, 76', 'Capim Macio, Natal/RN']],
      [.77, 'ic_cal', 'Buscamos a doação na sua casa', ['Campanha até 31/12']],
      [1.234, 'ic_pix', 'PIX direto para a ASPAN', ['CNPJ 03.399.956/0001-04']],
    ];
    rows.forEach(([t0, ic, h, ls], i) => {
      const p = eout(prog(u, t0, t0 + .45)); if (p <= 0) return; const y = 420 + i * 245;
      g.save(); g.globalAlpha = p; g.translate((1 - p) * -60, 0);
      sticker(g, 70, y, 860, 205, 40);
      iconCircle(g, IM[ic], 165, y + 102, 132);
      T(h, 255, y + 52, '700 40px Fredoka', PINK); ls.forEach((l, k) => T(l, 255, y + 108 + k * 46, '600 38px Fredoka'));
      g.restore();
    });
    // o que doar
    const p4 = popScale(u, 1.70, .5);
    if (p4 > 0) {
      g.save(); g.translate(500, 1225); g.scale(p4, p4); sticker(g, -430, -95, 860, 190, 40, '#FFF8EC');
      [['ic_racao', 'Ração'], ['ic_remedio', 'Remédios'], ['ic_higiene', 'Higiene']].forEach(([ic, l], k) => { const x = -280 + k * 280; iconCircle(g, IM[ic], x - 70, -2, 104); g.font = '700 38px Fredoka'; g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(l, x - 8, 0); });
      g.restore();
    }
    const p5 = popScale(u, 2.16, .5);
    if (p5 > 0) {
      g.save(); g.translate(395, 1430); g.scale(p5, p5); g.font = '700 50px Fredoka'; const w = g.measureText('@dogsweethome_natal').width + 80;
      g.fillStyle = 'rgba(58,30,14,.28)'; rrect(g, -w / 2, -48 + 10, w, 96, 48); g.fill(); g.fillStyle = PINK; rrect(g, -w / 2, -48, w, 96, 48); g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('@dogsweethome_natal', 0, 4); g.restore();
    }
    // Caramelo de gorro espiando no canto
    const pk = eout(prog(u, .8, 1.6)), pose = happyPose(u, .3, 1, { f: 2.3, tilt: .08 });
    pup(g, 'caramelo_gorro', pose, { blink: blinkAt(u, 90, 2.6) }, { x: 935 + (1 - pk) * 400, y: 2110, s: .5, rot: -.12 });
    twinkles(g, t, [[110, 170], [970, 170], [120, 1350], [960, 1120]], 13, 22, SPR_STAR_Y);
  });

  const TOTAL = 88.5;
  // ---------- composição ----------
  const BUF = [mk(W, H, () => { }), mk(W, H, () => { })];
  function drawScene(i, t, buf) {
    const s = SC[i], g = buf.getContext('2d'); g.save(); g.clearRect(0, 0, W, H); s.draw(g, t - s.a, s.b - s.a, t); g.restore(); return buf;
  }
  window.renderAt = function (t) {
    ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    let i = SC.findIndex(s => t >= s.a && t < s.b); if (i < 0) i = t < 0 ? 0 : SC.length - 1;
    const s = SC[i], nx = SC[i + 1], pv = SC[i - 1];
    let A = i, B = -1, k = 0;
    if (nx && t > s.b - nx.xf / 2) { B = i + 1; k = prog(t, s.b - nx.xf / 2, s.b + nx.xf / 2); }
    else if (pv && t < s.a + s.xf / 2) { A = i - 1; B = i; k = prog(t, s.a - s.xf / 2, s.a + s.xf / 2); }
    const ba = drawScene(A, t, BUF[0]); ctx.drawImage(ba, 0, 0);
    if (B >= 0 && k > 0) {
      const bb = drawScene(B, t, BUF[1]), tr = SC[B].trans;
      if (tr === 'iris') { const r = eio(k) * 1250; ctx.save(); ctx.beginPath(); ctx.arc(540, 980, r, 0, TAU); ctx.clip(); ctx.drawImage(bb, 0, 0); ctx.restore(); ctx.save(); ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(255,240,210,' + (1 - k) + ')'; ctx.beginPath(); ctx.arc(540, 980, r, 0, TAU); ctx.stroke(); ctx.restore(); }
      else { ctx.globalAlpha = eio(k); ctx.drawImage(bb, 0, 0); ctx.globalAlpha = 1; }
    }
    CAPS.forEach(c => caption(ctx, t, c));
    const fin = prog(t, 0, .8), fout = 1 - prog(t, TOTAL - .7, TOTAL);
    if (fin < 1 || fout < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.min(fin, fout)})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  };
  // depuração: um personagem grande sobre fundo neutro
  window.debugPuppet = function (name, eyes, pose, crop) {
    ctx.fillStyle = '#C9CCD8'; ctx.fillRect(0, 0, W, H); const P = PUP[name], iw = P.img.naturalWidth, ih = P.img.naturalHeight, s = Math.min(1000 / iw, 1800 / ih);
    pup(ctx, name, pose || {}, eyes || {}, { x: 540, y: 960 + ih * s / 2, s });
  };
  window.SFX = {
    hand: 23.5 + .6, perk: 23.5 + 3.9, hearts4: [0, 1, 2, 3].map(i => 23.5 + 5.4 + i * .22),
    iris5: 31.5, logos5: [31.5 + .5, 31.5 + .85], pour6a: 36.5 + .45, hearts6a: [0, 1, 2].map(i => 36.5 + 2.7 + i * .22), hearts6c: [0, 1, 2].map(i => 45.5 + 3 + i * .22),
    iris8: 55.5, cta8: [0, 1, 2].map(i => 55.5 + .22 + i * 2.787), fireworks: FW9.map(b => b.bt), fwx: FW9.map(b => b.cx), title10: 72.5 + .41, logos10: 72.5 + .87,
    rows11: [80.5 + .1, 80.5 + .305, 80.5 + .77, 80.5 + 1.234, 80.5 + 1.70, 80.5 + 2.16],
  };
  window.TIMES = { scenes: SC.map(s => ({ id: s.id, a: s.a, b: s.b, trans: s.trans })), caps: CAPS.map(c => ({ t0: c.t0, t1: c.t1, text: c.text })), fireworks: FW9.filter(b => b.bt < 72.5 + .45).map(b => b.bt), total: TOTAL };
  window.ready = (async () => {
    await document.fonts.load('700 60px Fredoka'); await document.fonts.load('600 40px Fredoka');
    await Promise.all([...BGS.map(n => load(n, 'img/' + n + '.jpg')), ...CHS.map(n => load(n, 'cut/' + n + '.png')), ...UIS.map(n => load(n, 'ui/' + n + '.png'))]);
    CHS.forEach(n => { PUP[n] = new Puppet(IM[n], RIGS[n]); });
    VIG = mk(W, H, g => { const gr = g.createRadialGradient(540, 900, 450, 540, 960, 1250); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(5,3,10,1)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
    PAWS = mk(W, H, g => { const r = rng(4); g.fillStyle = 'rgba(190,140,90,.13)'; for (let y = 120; y < H; y += 190) for (let x = (y / 190 % 2) * 95 + 40; x < W; x += 190) { g.save(); g.translate(x + (r() - .5) * 30, y + (r() - .5) * 30); g.rotate((r() - .5) * 1.2); g.beginPath(); g.ellipse(0, 10, 20, 16, 0, 0, TAU); g.fill(); [[-20, -10], [-7, -20], [7, -20], [20, -10]].forEach(([a, b]) => { g.beginPath(); g.ellipse(a, b, 7, 9, 0, 0, TAU); g.fill(); }); g.restore(); } });
    BLUR10 = mk(W, H, g => { g.filter = 'blur(9px)'; const im = IM.bg_dsh_fachada, c = cover(im); g.drawImage(im, c.ox - 40, c.oy - 40, c.dw + 80, c.dh + 80); g.filter = 'none'; });
    return true;
  })();
})();
