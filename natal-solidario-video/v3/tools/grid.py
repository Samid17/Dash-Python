import sys
from PIL import Image, ImageDraw
src, dst = sys.argv[1], sys.argv[2]; step = int(sys.argv[3]) if len(sys.argv) > 3 else 50; sc = float(sys.argv[4]) if len(sys.argv) > 4 else 0.6
im = Image.open(src).convert('RGBA'); bg = Image.new('RGBA', im.size, (235, 235, 245, 255)); bg.alpha_composite(im)
im = bg.convert('RGB').resize((int(im.width * sc), int(im.height * sc))); g = ImageDraw.Draw(im)
for x in range(0, int(im.width / sc) + 1, step):
    c = (255, 0, 0) if x % (step * 4) == 0 else (255, 160, 160); g.line([(x * sc, 0), (x * sc, im.height)], fill=c, width=1)
    if x % (step * 2) == 0: g.text((x * sc + 2, 2), str(x), fill=(200, 0, 0))
for y in range(0, int(im.height / sc) + 1, step):
    c = (0, 0, 255) if y % (step * 4) == 0 else (160, 160, 255); g.line([(0, y * sc), (im.width, y * sc)], fill=c, width=1)
    if y % (step * 2) == 0: g.text((2, y * sc + 2), str(y), fill=(0, 0, 200))
im.save(dst, quality=90)
