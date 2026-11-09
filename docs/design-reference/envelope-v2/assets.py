import sys
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage as ni

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
SCALE = 2


def crop(box):
    c = im.crop(box)
    return c.resize((c.width * SCALE, c.height * SCALE), Image.LANCZOS)


def mirror_tile(c):
    w, h = c.size
    t = Image.new("RGB", (w * 2, h * 2))
    t.paste(c, (0, 0))
    t.paste(ImageOps.mirror(c), (w, 0))
    t.paste(ImageOps.flip(c), (0, h))
    t.paste(ImageOps.flip(ImageOps.mirror(c)), (w, h))
    return t


def cutout(box, name, thr=34, min_area=60, largest_only=False, erode=1):
    c = crop(box)
    a = np.asarray(c).astype(float)
    edge = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3)])
    bg = np.median(edge, axis=0)
    ratio_bg = bg[0] / max(bg[2], 1)
    dist = np.linalg.norm(a - bg, axis=2)
    ratio = a[..., 0] / np.maximum(a[..., 2], 1)
    lum = a.mean(axis=2)
    # shadow keeps the linen's hue; only count real colour shift or very dark pixels
    mask = ((np.abs(ratio - ratio_bg) > 0.22) & (dist > thr)) | (lum < 78) | (dist > 95)
    mask = ni.binary_closing(mask, iterations=2)
    mask = ni.binary_fill_holes(mask)
    lab, n = ni.label(mask)
    sizes = ni.sum(mask, lab, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s >= (sizes.max() if largest_only else min_area * SCALE**2)]
    mask = np.isin(lab, keep)
    if erode:
        mask = ni.binary_erosion(mask, iterations=erode)
    alpha = np.clip(ni.gaussian_filter(mask.astype(float), 1.1), 0, 1)
    rgba = np.dstack([a, alpha * 255]).astype(np.uint8)
    res = Image.fromarray(rgba, "RGBA")
    res = res.crop(res.getbbox())
    res.save(f"{out}/{name}.png", optimize=True)
    return res


mirror_tile(crop((115, 195, 400, 362))).save(f"{out}/liner.jpg", quality=86)
mirror_tile(crop((712, 880, 925, 1215))).save(f"{out}/damask.jpg", quality=84)
mirror_tile(crop((350, 995, 590, 1245))).save(f"{out}/tile.jpg", quality=86)
mirror_tile(crop((432, 6, 545, 108))).save(f"{out}/linen.jpg", quality=84)

items = [
    cutout((0, 660, 208, 858), "pomegranate", thr=30),
    cutout((707, 582, 958, 872), "lily", thr=30, largest_only=True),
    cutout((20, 868, 322, 1245), "seal", thr=26, largest_only=True, erode=2),
]

# check sheet on a magenta ground so keying errors are obvious
sheet = Image.new("RGB", (1500, 780), (255, 0, 200))
x = 10
for it in items:
    sheet.paste(it, (x, 10), it)
    x += it.width + 20
sheet.save(f"{out}/_check.jpg", quality=85)
print([i.size for i in items])
