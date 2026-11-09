import sys
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage as ni
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
S = 2
def crop(b):
    c = im.crop(b); return c.resize((c.width*S, c.height*S), Image.LANCZOS)

# LILY: sample linen only from the top and right edges, drop the card strip below
a = np.asarray(crop((707, 582, 958, 862))).astype(float)
bg = np.median(np.concatenate([a[:8].reshape(-1,3), a[:,-8:].reshape(-1,3)]), axis=0)
r = a[...,0]/np.maximum(a[...,2],1); rb = bg[0]/bg[2]
d = np.linalg.norm(a-bg, axis=2); l = a.mean(2)
m = (((r-rb) > 0.20) & (d > 26)) | (l < 92) | ((a[...,1] > a[...,2]*1.22) & (d > 40))
m = ni.binary_opening(m, iterations=1); m = ni.binary_closing(m, iterations=3); m = ni.binary_fill_holes(m)
lab, n = ni.label(m); sz = ni.sum(m, lab, range(1, n+1)); m = lab == (int(np.argmax(sz))+1)
m = ni.binary_erosion(m, iterations=1)
al = ni.gaussian_filter(m.astype(float), 1.1)
res = Image.fromarray(np.dstack([a, al*255]).astype(np.uint8), "RGBA"); res = res.crop(res.getbbox())
res = ImageOps.mirror(res); res.save(f"{out}/lily.png", optimize=True)

# SEAL: fit one clean ellipse; patch where the card overlaps its top-right
box = (20, 868, 322, 1245)
a = np.asarray(crop(box)).astype(float).copy()
h, w = a.shape[:2]; yy, xx = np.mgrid[:h, :w]
card = ((xx/S+box[0]) >= 244) & ((yy/S+box[1]) <= 960)
bg = np.median(np.concatenate([a[-8:].reshape(-1,3), a[:,:8].reshape(-1,3)]), axis=0)
d = np.linalg.norm(a-bg, axis=2); m = (d > 26) & ~card
m = ni.binary_opening(m, iterations=3); m = ni.binary_fill_holes(m)
lab, n = ni.label(m); sz = ni.sum(m, lab, range(1, n+1)); m = lab == (int(np.argmax(sz))+1)
pts = np.column_stack([xx[m], yy[m]]).astype(float); c = pts.mean(0)
vals, vecs = np.linalg.eigh(np.cov((pts-c).T)); ax = 2*np.sqrt(vals)
p = np.column_stack([xx.ravel()-c[0], yy.ravel()-c[1]]) @ vecs
rho = (((p/ax)**2).sum(1)).reshape(h, w)
sage = np.median(a[(rho < .5) & (d > 26)], axis=0)
a[card] = sage
al = np.clip((1.0-np.sqrt(rho))/0.012, 0, 1)
res = Image.fromarray(np.dstack([a, al*255]).astype(np.uint8), "RGBA"); res = res.crop(res.getbbox())
res.save(f"{out}/seal.png", optimize=True)

sheet = Image.new("RGB", (1200, 780), (255, 0, 200)); x = 10
for f in ("lily", "seal"):
    i = Image.open(f"{out}/{f}.png"); sheet.paste(i, (x, 10), i); x += i.width+30
sheet.save(f"{out}/_check.jpg", quality=85)
