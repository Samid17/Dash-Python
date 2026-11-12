// Animação 2D de personagens recortados: malha deformada por ossos (skinning linear), renderizada em WebGL.
// Um contexto WebGL compartilhado desenha cada boneco e copia o resultado para o canvas 2D do boneco.
(function () {
  const GLC = document.createElement('canvas'); GLC.width = 2048; GLC.height = 2048;
  const gl = GLC.getContext('webgl', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: true });
  if (!gl) throw new Error('WebGL indisponível');
  const vs = `attribute vec2 p; attribute vec2 uv; uniform vec2 res; varying vec2 v;
    void main(){ v = uv; vec2 c = p / res * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); }`;
  const fs = `precision mediump float; varying vec2 v; uniform sampler2D tex; uniform vec4 tint; uniform vec3 add;
    void main(){ vec4 c = texture2D(tex, v); c.rgb = c.rgb * tint.rgb + add * c.a; gl_FragColor = c * tint.a; }`;
  function sh(t, s) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); gl.useProgram(prog);
  const aP = gl.getAttribLocation(prog, 'p'), aUV = gl.getAttribLocation(prog, 'uv');
  const uRes = gl.getUniformLocation(prog, 'res'), uTint = gl.getUniformLocation(prog, 'tint'), uAdd = gl.getUniformLocation(prog, 'add');
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  // ---------- geometria ----------
  function sdPoly(x, y, poly) { // distância com sinal (positiva dentro)
    let inside = false, dmin = 1e9;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
      const dx = xj - xi, dy = yj - yi, l2 = dx * dx + dy * dy;
      let t = l2 ? ((x - xi) * dx + (y - yi) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
      const ex = xi + t * dx - x, ey = yi + t * dy - y; dmin = Math.min(dmin, Math.hypot(ex, ey));
    }
    return inside ? dmin : -dmin;
  }
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // matriz afim [a,b,c,d,e,f]: x' = a x + c y + e ; y' = b x + d y + f
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const local = (p, r = 0, sx = 1, sy = 1, tx = 0, ty = 0) => { const c = Math.cos(r), s = Math.sin(r);
    // T(p+t) R S T(-p)
    const a = c * sx, b = s * sx, cc = -s * sy, d = c * sy; return [a, b, cc, d, p[0] + tx - (a * p[0] + cc * p[1]), p[1] + ty - (b * p[0] + d * p[1])]; };
  const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

  class Puppet {
    // rig: { img, margin, step, bones:[{name, parent, pivot:[x,y], region:[[x,y]...], falloff}], eyes:[{bone, c:[x,y], rx, ry, rot, lid:'#E8952F'}] }
    constructor(img, rig) {
      this.img = img; this.rig = rig; this.m = rig.margin ?? 140;
      this.w = img.naturalWidth + 2 * this.m; this.h = img.naturalHeight + 2 * this.m;
      this.canvas = document.createElement('canvas'); this.canvas.width = this.w; this.canvas.height = this.h;
      this.ctx = this.canvas.getContext('2d');
      this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.build(); this.pose = {}; this.tint = [1, 1, 1, 1]; this.add = [0, 0, 0];
    }
    build() {
      const W = this.img.naturalWidth, H = this.img.naturalHeight, st = this.rig.step || 22;
      const nx = Math.ceil(W / st) + 1, ny = Math.ceil(H / st) + 1; this.nx = nx; this.ny = ny;
      const bones = this.rig.bones; this.order = bones.map(b => b.name);
      const verts = [], uvs = [], wts = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x = Math.min(W, i * st), y = Math.min(H, j * st); verts.push(x, y); uvs.push(x / W, y / H);
        const w = new Float32Array(bones.length + 1); w[0] = 1; // índice 0 = corpo (raiz)
        bones.forEach((b, k) => { const m = ss(-b.falloff / 2, b.falloff / 2, sdPoly(x, y, b.region)); if (m > 0) { for (let q = 0; q <= k; q++) w[q] *= (1 - m); w[k + 1] = m; } });
        wts.push(w);
      }
      const idx = [];
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, b, c, b, d, c); }
      this.rest = Float32Array.from(verts); this.uv = Float32Array.from(uvs); this.w8 = wts; this.idx = new Uint16Array(idx);
      this.pos = new Float32Array(this.rest.length);
      this.bufP = gl.createBuffer(); this.bufUV = gl.createBuffer(); this.bufI = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufUV); gl.bufferData(gl.ARRAY_BUFFER, this.uv, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufI); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.idx, gl.STATIC_DRAW);
    }
    // pose: { root:{r,sx,sy,tx,ty,p}, <bone>:{r,sx,sy,tx,ty} }
    matrices(pose) {
      const R = pose.root || {}; const rp = R.p || [this.img.naturalWidth / 2, this.img.naturalHeight];
      const root = local(rp, R.r || 0, R.sx ?? 1, R.sy ?? 1, R.tx || 0, R.ty || 0);
      const M = { body: root }; const out = [root];
      for (const b of this.rig.bones) { const q = pose[b.name] || {}; const par = M[b.parent || 'body'];
        M[b.name] = mul(par, local(b.pivot, q.r || 0, q.sx ?? 1, q.sy ?? 1, q.tx || 0, q.ty || 0)); out.push(M[b.name]); }
      this.M = M; return out;
    }
    draw(pose, eyes) {
      const mats = this.matrices(pose), n = this.rest.length / 2, m = this.m;
      for (let v = 0; v < n; v++) {
        const x = this.rest[2 * v], y = this.rest[2 * v + 1], w = this.w8[v]; let X = 0, Y = 0;
        for (let k = 0; k < w.length; k++) { const wk = w[k]; if (wk < 1e-4) continue; const M = mats[k]; X += wk * (M[0] * x + M[2] * y + M[4]); Y += wk * (M[1] * x + M[3] * y + M[5]); }
        this.pos[2 * v] = X + m; this.pos[2 * v + 1] = Y + m;
      }
      gl.viewport(0, GLC.height - this.h, this.w, this.h); gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.SCISSOR_TEST); gl.scissor(0, GLC.height - this.h, this.w, this.h); gl.clear(gl.COLOR_BUFFER_BIT); gl.disable(gl.SCISSOR_TEST);
      gl.uniform2f(uRes, this.w, this.h); gl.uniform4f(uTint, ...this.tint); gl.uniform3f(uAdd, ...this.add);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufP); gl.bufferData(gl.ARRAY_BUFFER, this.pos, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufUV); gl.enableVertexAttribArray(aUV); gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufI); gl.drawElements(gl.TRIANGLES, this.idx.length, gl.UNSIGNED_SHORT, 0);
      const c = this.ctx; c.clearRect(0, 0, this.w, this.h); c.drawImage(GLC, 0, 0, this.w, this.h, 0, 0, this.w, this.h);
      if (eyes) this.drawEyes(eyes);
    }
    // olhos: blink 0..1 (1 = fechado); tear 0..1 (lágrima escorrendo)
    drawEyes({ blink = 0, tear = 0, sad = 0 }) {
      const c = this.ctx, m = this.m;
      for (const e of this.rig.eyes || []) {
        const M = this.M[e.bone || 'head'] || this.M.body; const [cx, cy] = apply(M, e.c[0], e.c[1]);
        const sc = Math.hypot(M[0], M[1]), rot = Math.atan2(M[1], M[0]) + (e.rot || 0);
        c.save(); c.translate(cx + m, cy + m); c.rotate(rot); c.scale(sc, sc);
        if (blink > 0.02) {
          const rx = e.rx * 1.12, ry = e.ry * 1.15, yb = -ry + 2 * ry * Math.min(1, blink);
          c.save(); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.clip();
          c.fillStyle = e.lid || '#EE9A35'; c.fillRect(-rx - 2, -ry - 2, 2 * rx + 4, yb + ry + 2);
          c.restore();
          c.strokeStyle = e.line || '#3A1E0E'; c.lineWidth = e.lw || 5; c.lineCap = 'round';
          c.beginPath(); const half = Math.sqrt(Math.max(0, 1 - Math.pow(yb / ry, 2))) * rx * .98;
          if (blink >= .98) { c.moveTo(-rx * .95, -2); c.quadraticCurveTo(0, ry * .45, rx * .95, -2); }
          else { c.moveTo(-half, yb); c.lineTo(half, yb); }
          c.stroke();
        }
        if (tear > 0 && e.tear) {
          const [tx, ty] = e.tear, p = tear % 1, yy = ty + p * (e.tearLen || 140), a = Math.sin(Math.min(1, p * 1.4) * Math.PI);
          c.globalAlpha = a; c.fillStyle = '#BFE6FF'; c.strokeStyle = '#3A6E9A'; c.lineWidth = 2.5;
          c.beginPath(); c.moveTo(tx, yy - 16); c.bezierCurveTo(tx + 10, yy - 2, tx + 9, yy + 10, tx, yy + 10); c.bezierCurveTo(tx - 9, yy + 10, tx - 10, yy - 2, tx, yy - 16); c.fill(); c.stroke();
          c.globalAlpha = 1;
        }
        c.restore();
      }
    }
  }
  window.Puppet = Puppet; window.PuppetGL = GLC;
})();
