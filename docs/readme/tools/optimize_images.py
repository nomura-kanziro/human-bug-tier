"""screens/ 와 diagrams/ 의 PNG 를 256색으로 줄인다. 글자가 번지지 않게 디더링은 끈다."""
import glob
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
for folder in ("screens", "diagrams"):
    for path in glob.glob(os.path.join(ROOT, folder, "*.png")):
        before = os.path.getsize(path)
        img = Image.open(path).convert("RGB")
        img.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.NONE).save(path, optimize=True)
        print(f"{os.path.basename(path)}: {before // 1024} KB -> {os.path.getsize(path) // 1024} KB")
