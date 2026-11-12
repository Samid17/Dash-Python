"""Recorta personagem 2D de fundo liso claro (e sombra no chão).
Uso: python3 cutout.py in.png out.png [--keep-shadow] [--gap R] [--holes x,y;x,y] [--fg "x,y;x,y|..."]
O fundo é a região parecida com o fundo ligada à borda sem atravessar o contorno.
Antes do preenchimento, o contorno é engrossado R px para fechar falhas (pelo branco,
curativo e gorro têm a mesma cor do fundo e ficam isolados pelo contorno)."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage
args = sys.argv[1:]
src, dst = args[0], args[1]
keep_shadow = '--keep-shadow' in args
gap = int(args[args.index('--gap') + 1]) if '--gap' in args else 3
fgpolys = []
if '--fg' in args:                                # polígonos forçados como personagem: "x,y;x,y|x,y;..."
    fgpolys = [[tuple(int(v) for v in q.split(',')) for q in poly.split(';') if q] for poly in args[args.index('--fg') + 1].split('|')]
holes = []
if '--holes' in args:
    holes = [tuple(int(v) for v in p.split(',')) for p in args[args.index('--holes') + 1].split(';') if p]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
h, w, _ = im.shape
border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
bg = np.median(border, axis=0)
d = np.sqrt(((im - bg) ** 2).sum(-1))
mx = im.max(-1); mn = im.min(-1); sat = (mx - mn) / (mx + 1e-3)
lum = im.mean(-1)
cand = d < 28
if not keep_shadow:
    cand |= (sat < .32) & (lum > bg.mean() - 70) & (lum < bg.mean() + 10) & (d < 100)
barrier = ndimage.binary_dilation(~cand, iterations=gap) if gap > 0 else ~cand
core = cand & ~barrier
lab, n = ndimage.label(core)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bgmask = np.isin(lab, list(edge))
for (x, y) in holes:                              # buracos indicados à mão
    if lab[y, x]: bgmask |= lab == lab[y, x]
bgmask = ndimage.binary_dilation(bgmask, iterations=gap + 1, mask=cand)  # devolve a borda engrossada
fg = ~bgmask
if fgpolys:
    from PIL import ImageDraw
    mk = Image.new('L', (w, h), 0); dr = ImageDraw.Draw(mk)
    for poly in fgpolys: dr.polygon(poly, fill=255)
    fg |= np.asarray(mk) > 0
fg = ndimage.binary_opening(fg, iterations=1)
lab3, n3 = ndimage.label(fg)
if n3 > 1:
    sizes = ndimage.sum(fg, lab3, range(1, n3 + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s > 0.002 * fg.sum()]
    fg = np.isin(lab3, keep)
fg = ndimage.binary_fill_holes(fg) if not holes else fg
alpha = ndimage.gaussian_filter(fg.astype(np.float32), 0.7)
alpha = np.clip((alpha - 0.15) / 0.7, 0, 1)
out = Image.fromarray(np.dstack([im, alpha * 255]).astype(np.uint8), 'RGBA')
bb = out.getbbox(); pad = 24
bb = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(w, bb[2] + pad), min(h, bb[3] + pad))
out = out.crop(bb)
out.save(dst)
print(dst, out.size, 'bbox na origem', bb)
