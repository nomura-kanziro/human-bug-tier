"""raw/<장면>/*.png 를 README 용 GIF 로 묶는다. python make_gifs.py [장면...]"""
import glob
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WIDTH = {"memory": 620, "ai": 680, "maker": 640}
DEFAULT_WIDTH = 720
FRAME_MS = 110


def build(name):
    files = sorted(glob.glob(os.path.join(ROOT, "raw", name, "*.png")))
    if not files:
        return
    width = WIDTH.get(name, DEFAULT_WIDTH)
    frames = []
    for f in files:
        im = Image.open(f).convert("RGB")
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        frames.append(im.quantize(colors=128, method=Image.MEDIANCUT, dither=Image.NONE))
    out = os.path.join(ROOT, "gifs", f"{name}.gif")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=FRAME_MS, loop=0, optimize=True, disposal=1)
    print(f"{name}: {len(files)} frames, {os.path.getsize(out) / 1e6:.2f} MB")


names = sys.argv[1:] or [os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "raw", "*"))]
for n in names:
    build(n)
