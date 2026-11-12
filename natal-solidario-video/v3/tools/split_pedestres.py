"""Separa os pedestres (dois recortes desconectados) em pedestre_A.png e pedestre_B.png. Uso: python3 split_pedestres.py pedestres.png pasta"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage
im = Image.open(sys.argv[1]); a = np.asarray(im)[:, :, 3] > 40
lab, n = ndimage.label(a); sizes = ndimage.sum(a, lab, range(1, n + 1)); order = np.argsort(-sizes)
comps = sorted(order[:2], key=lambda k: np.nonzero(lab == k + 1)[1].min())   # A = o da esquerda
for k, name in zip(comps, 'AB'):
    m = lab == k + 1; ys, xs = np.nonzero(m)
    arr = np.asarray(im).copy(); arr[:, :, 3] = np.where(ndimage.binary_dilation(m, iterations=2), arr[:, :, 3], 0)
    box = (max(0, xs.min() - 20), max(0, ys.min() - 20), min(im.width, xs.max() + 20), min(im.height, ys.max() + 20))
    Image.fromarray(arr).crop(box).save(f'{sys.argv[2]}/pedestre_{name}.png'); print(name, 'deslocamento', box[:2])
