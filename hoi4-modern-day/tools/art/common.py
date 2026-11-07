"""Shared helpers for the art generators."""
import io
import os
import subprocess

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)
VENDOR = os.path.join(TOOLS, "vendor")          # third-party SVGs (see CREDITS.md)
FLAG_SVG = os.path.join(VENDOR, "flags")
ICON_SVG = os.path.join(VENDOR, "mdi")
FONT_DIR = "/usr/share/fonts"


def font_path(*names):
    for root, _, files in os.walk(FONT_DIR):
        for n in names:
            if n in files:
                return os.path.join(root, n)
    raise FileNotFoundError(names)


def svg_to_image(svg_bytes, width, height):
    import cairosvg
    png = cairosvg.svg2png(bytestring=svg_bytes, output_width=width, output_height=height)
    return Image.open(io.BytesIO(png)).convert("RGBA")


def save_dds(img, path):
    """Uncompressed 32-bit DDS (A8R8G8B8), the format HOI4's own GFX use."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".png"
    img.convert("RGBA").save(tmp)
    subprocess.run(["convert", tmp, "-define", "dds:compression=none",
                    "-define", "dds:mipmaps=0", path], check=True)
    os.remove(tmp)


def save_tga(img, path):
    """32-bit uncompressed TGA, as HOI4 flags require."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.convert("RGBA").save(path, format="TGA", compression=None)


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


MDI_SRC = os.environ.get("MDI_SRC", "")


def vendor_glyphs(names):
    """Make sure every glyph we use is in tools/vendor/mdi (copied from an
    @mdi/svg checkout pointed to by $MDI_SRC). Returns names still missing."""
    import shutil
    missing = []
    for n in sorted(set(names)):
        dst = os.path.join(ICON_SVG, n + ".svg")
        if os.path.exists(dst):
            continue
        src = os.path.join(MDI_SRC, n + ".svg") if MDI_SRC else ""
        if src and os.path.exists(src):
            shutil.copy(src, dst)
        else:
            missing.append(n)
    return missing
