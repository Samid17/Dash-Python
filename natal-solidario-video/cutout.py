import sys, numpy as np
from PIL import Image
from scipy import ndimage
src, dst, mode = sys.argv[1], sys.argv[2], sys.argv[3]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
if mode == 'dsh':   # fundo creme + corações rosa claro
    bg = (r > 200) & (g > 170) & (b > 170) & ((r - g) < 70)
else:               # fundo laranja
    bg = (r > 200) & (g > 70) & (g < 160) & (b < 80)
lab, n = ndimage.label(bg)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
mask = np.isin(lab, list(edge))
alpha = (~mask).astype(np.float32)
alpha = ndimage.gaussian_filter(alpha, 0.8)
out = np.dstack([im, alpha * 255]).astype(np.uint8)
img = Image.fromarray(out, 'RGBA')
img = img.crop(img.getbbox())
img.save(dst)
print(dst, img.size)
