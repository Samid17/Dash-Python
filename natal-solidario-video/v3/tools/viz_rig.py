import json, sys, numpy as np
from PIL import Image, ImageDraw
R = json.load(open('rigs.json'))
def sd(xs, ys, poly):
    pts = np.stack([xs, ys], -1); inside = np.zeros(len(xs), bool); Pp = np.array(poly, float)
    for i in range(len(Pp)):
        (xi, yi), (xj, yj) = Pp[i], Pp[i - 1]
        c = ((yi > ys) != (yj > ys)) & (xs < (xj - xi) * (ys - yi) / (yj - yi + 1e-12) + xi); inside ^= c
    dmin = np.full(len(xs), 1e9); P = np.array(poly, float)
    for i in range(len(P)):
        a, b = P[i - 1], P[i]; d = b - a; l2 = (d ** 2).sum()
        t = np.clip(((pts - a) @ d) / l2, 0, 1); e = a + t[:, None] * d - pts
        dmin = np.minimum(dmin, np.hypot(e[:, 0], e[:, 1]))
    return np.where(inside, dmin, -dmin)
cols = [(255, 60, 60), (60, 200, 60), (60, 120, 255), (255, 200, 0), (200, 60, 255), (0, 220, 220), (255, 120, 0), (255, 0, 160)]
names = sys.argv[1:] or [k for k in R if k != 'caramelo_pe']
tiles = []
for n in names:
    rig = R[n]; im = Image.open(f'../render/cut/{n}.png').convert('RGBA'); W, H = im.size
    st = 6; gx, gy = np.meshgrid(np.arange(0, W, st), np.arange(0, H, st)); xs, ys = gx.ravel().astype(float), gy.ravel().astype(float)
    nb = len(rig['bones']); w = np.zeros((nb + 1, len(xs))); w[0] = 1
    for k, b in enumerate(rig['bones']):
        f = b['falloff']; t = np.clip((sd(xs, ys, b['region']) + f / 2) / f, 0, 1); m = t * t * (3 - 2 * t)
        sel = m > 0
        w[:k + 1, sel] *= (1 - m[sel]); w[k + 1, sel] = m[sel]
    col = np.zeros((len(xs), 3))
    for k in range(1, nb + 1): col += w[k][:, None] * np.array(cols[(k - 1) % len(cols)])
    a = np.clip(w[1:].sum(0), 0, 1)[:, None] * 0.55
    ov = Image.fromarray(np.concatenate([col.reshape(gy.shape + (3,)), (a * 255).reshape(gy.shape + (1,))], -1).astype(np.uint8), 'RGBA').resize((W, H), Image.NEAREST)
    bg = Image.new('RGBA', (W, H), (235, 235, 245, 255)); bg.alpha_composite(im); bg.alpha_composite(ov)
    d = ImageDraw.Draw(bg)
    for k, b in enumerate(rig['bones']):
        x, y = b['pivot']; d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=cols[k % len(cols)], outline='black', width=2); d.text((x + 11, y - 6), b['name'], fill='black')
    for e in rig.get('eyes', []):
        cx, cy = e['c']; rx, ry = e['rx'] * 1.12, e['ry'] * 1.15; r = e.get('rot', 0)
        pts = [(cx + np.cos(t) * rx * np.cos(r) - np.sin(t) * ry * np.sin(r), cy + np.cos(t) * rx * np.sin(r) + np.sin(t) * ry * np.cos(r)) for t in np.linspace(0, 2 * np.pi, 40)]
        d.line(pts, fill=(0, 255, 255), width=3)
    bg = bg.convert('RGB'); bg.thumbnail((520, 520)); tiles.append((n, bg))
cols_n = 3; Wt = 520; rows = (len(tiles) + cols_n - 1) // cols_n
sheet = Image.new('RGB', (cols_n * Wt, rows * (Wt + 16)), 'white'); d = ImageDraw.Draw(sheet)
for i, (n, t) in enumerate(tiles):
    x, y = (i % cols_n) * Wt, (i // cols_n) * (Wt + 16); sheet.paste(t, (x, y)); d.text((x + 4, y + Wt + 2), n, fill='black')
sheet.save('chk_rigs.png'); print(sheet.size)
