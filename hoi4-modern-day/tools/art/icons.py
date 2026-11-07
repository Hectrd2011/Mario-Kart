"""Focus badges, national spirit tiles, decision icons and event pictures.

All glyphs come from Material Design Icons (Apache 2.0, see CREDITS.md).
"""
import math
import os
import re

from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont

from .common import ICON_SVG, FLAG_SVG, svg_to_image, mix, font_path

THEMES = {
    "economy":   ((214, 164, 52), (86, 58, 14)),
    "military":  ((112, 124, 84), (32, 38, 26)),
    "diplomacy": ((62, 124, 210), (14, 34, 82)),
    "politics":  ((156, 58, 98), (52, 16, 36)),
    "tech":      ((40, 168, 176), (8, 52, 62)),
    "crisis":    ((200, 50, 46), (62, 10, 10)),
    "energy":    ((228, 128, 36), (84, 36, 6)),
    "society":   ((70, 160, 92), (14, 56, 26)),
    "nuclear":   ((232, 196, 44), (44, 36, 8)),
    "intel":     ((104, 110, 128), (20, 22, 30)),
}

_glyph_cache = {}


def glyph_svg(name):
    if name not in _glyph_cache:
        with open(os.path.join(ICON_SVG, name + ".svg"), encoding="utf-8") as fh:
            _glyph_cache[name] = fh.read()
    return _glyph_cache[name]


def glyph(name, px, colour=(255, 255, 255)):
    svg = glyph_svg(name)
    fill = "#%02x%02x%02x" % colour
    svg = re.sub(r"<path ", f'<path fill="{fill}" ', svg, count=0)
    return svg_to_image(svg.encode(), px, px)


def _vgrad(size, top, bottom):
    w, h = size
    g = Image.linear_gradient("L").resize((w, h))
    a = Image.new("RGBA", size, top + (255,))
    b = Image.new("RGBA", size, bottom + (255,))
    return Image.composite(b, a, g)


def _with_shadow(img, radius, offset, opacity=0.6):
    alpha = img.getchannel("A").filter(ImageFilter.GaussianBlur(radius))
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sh.putalpha(alpha.point(lambda v: int(v * opacity)))
    sh = ImageChops.offset(sh, *offset)
    return Image.alpha_composite(sh, img)


def _flag_strip(iso, w, h):
    try:
        with open(os.path.join(FLAG_SVG, iso + ".svg"), "rb") as fh:
            return svg_to_image(fh.read(), w, h)
    except (FileNotFoundError, TypeError):
        return None


# ------------------------------------------------------------------ focus badge
def focus_icon(glyph_name, theme, iso=None, size=(95, 85)):
    S = 4
    W, H = size[0] * S, size[1] * S
    light, dark = THEMES[theme]
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # shield-like badge: a rounded hexagon
    cx, cy, r = W / 2, H / 2 + 2 * S, min(W, H) * 0.43
    pts = [(cx + r * 1.12 * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in range(-90, 270, 60)]
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(1.2 * S)).point(lambda v: 255 if v > 128 else 0)
    rim = Image.new("L", (W, H), 0)
    big = [(cx + (r + 4 * S) * 1.12 * math.cos(math.radians(a)), cy + (r + 4 * S) * math.sin(math.radians(a))) for a in range(-90, 270, 60)]
    ImageDraw.Draw(rim).polygon(big, fill=255)
    rim_fill = _vgrad((W, H), (236, 220, 170), (120, 96, 50))
    out.paste(rim_fill, (0, 0), rim)
    body = _vgrad((W, H), light, dark)
    if iso:
        strip = _flag_strip(iso, W, int(H * 0.5))
        if strip:
            fl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            fl.paste(strip, (0, int(H * 0.52)))
            body = Image.blend(body, Image.alpha_composite(body, fl), 0.35)
    out.paste(body, (0, 0), mask)
    # gloss
    gloss = Image.new("L", (W, H), 0)
    ImageDraw.Draw(gloss).ellipse([cx - r * 1.4, cy - r * 2.0, cx + r * 1.4, cy - r * 0.15], fill=70)
    gloss = ImageChops.multiply(gloss, mask)
    out.paste(Image.new("RGBA", (W, H), (255, 255, 255, 255)), (0, 0), gloss)
    g = glyph(glyph_name, int(r * 1.15))
    g = _with_shadow(g, 2 * S, (0, 2 * S), 0.7)
    out.alpha_composite(g, (int(cx - g.width / 2), int(cy - g.height / 2)))
    out = _with_shadow(out, 3 * S, (0, 3 * S), 0.55)
    return out.resize(size, Image.LANCZOS)


# ------------------------------------------------------------------ national spirit tile
def idea_icon(glyph_name, theme, size=(64, 64)):
    S = 4
    W, H = size[0] * S, size[1] * S
    light, dark = THEMES[theme]
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pad = 3 * S
    frame = Image.new("L", (W, H), 0)
    ImageDraw.Draw(frame).rounded_rectangle([pad, pad, W - pad, H - pad], radius=8 * S, fill=255)
    out.paste(_vgrad((W, H), (224, 208, 160), (96, 76, 40)), (0, 0), frame)
    inner = Image.new("L", (W, H), 0)
    ImageDraw.Draw(inner).rounded_rectangle([pad + 3 * S, pad + 3 * S, W - pad - 3 * S, H - pad - 3 * S], radius=6 * S, fill=255)
    bg = _vgrad((W, H), light, dark)
    # radial glow behind the glyph
    glow = Image.radial_gradient("L").resize((W, H)).point(lambda v: 255 - v)
    bg = Image.composite(Image.blend(bg, Image.new("RGBA", (W, H), mix(light, (255, 255, 255), 0.4) + (255,)), 0.5), bg,
                         glow.point(lambda v: int(v * 0.6)))
    out.paste(bg, (0, 0), inner)
    g = glyph(glyph_name, int(W * 0.56))
    g = _with_shadow(g, 2 * S, (0, 2 * S), 0.7)
    out.alpha_composite(g, ((W - g.width) // 2, (H - g.height) // 2))
    return out.resize(size, Image.LANCZOS)


def decision_icon(glyph_name, theme, size=(32, 32)):
    S = 4
    W, H = size[0] * S, size[1] * S
    light, dark = THEMES[theme]
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).ellipse([S, S, W - S, H - S], fill=255)
    out.paste(_vgrad((W, H), (230, 214, 164), (110, 88, 44)), (0, 0), m)
    m2 = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m2).ellipse([3 * S, 3 * S, W - 3 * S, H - 3 * S], fill=255)
    out.paste(_vgrad((W, H), light, dark), (0, 0), m2)
    g = glyph(glyph_name, int(W * 0.56))
    out.alpha_composite(g, ((W - g.width) // 2, (H - g.height) // 2))
    return out.resize(size, Image.LANCZOS)


# ------------------------------------------------------------------ event pictures
def _halftone(size, colour, spacing, max_r, direction=1.0):
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for y in range(0, h + spacing, spacing):
        for x in range(0, w + spacing, spacing):
            t = (x / w) if direction > 0 else 1 - (x / w)
            rr = max_r * (0.15 + 0.85 * t) * (0.6 + 0.4 * (y / h))
            d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=colour)
    return img


def event_picture(glyph_name, theme, iso=None, size=(210, 176), wide=False):
    S = 3
    W, H = size[0] * S, size[1] * S
    light, dark = THEMES[theme]
    base = _vgrad((W, H), mix(dark, (0, 0, 0), 0.1), mix(dark, (0, 0, 0), 0.55))
    if iso:
        strip = _flag_strip(iso, int(W * 1.1), int(W * 1.1 * 2 / 3))
        if strip:
            strip = strip.filter(ImageFilter.GaussianBlur(10 * S))
            fl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            fl.paste(strip, (-int(W * 0.05), (H - strip.height) // 2))
            base = Image.blend(base, Image.alpha_composite(base, fl), 0.35)
    ht = _halftone((W, H), mix(light, (255, 255, 255), 0.1) + (40,), 7 * S, 2.6 * S)
    base = Image.alpha_composite(base, ht)
    gsize = int(H * (1.05 if not wide else 1.25))
    big = glyph(glyph_name, gsize, mix(light, (255, 255, 255), 0.15))
    big.putalpha(big.getchannel("A").point(lambda v: int(v * 0.22)))
    base.alpha_composite(big, (int(W * (0.52 if not wide else 0.6)), int(H * 0.5 - gsize / 2)))
    g = glyph(glyph_name, int(H * 0.5), (250, 246, 236))
    g = _with_shadow(g, 4 * S, (0, 4 * S), 0.8)
    base.alpha_composite(g, (int(W * (0.27 if not wide else 0.2) - g.width / 2), (H - g.height) // 2))
    vig = Image.radial_gradient("L").resize((W, H))
    base = Image.composite(Image.new("RGBA", (W, H), (0, 0, 0, 255)), base, vig.point(lambda v: int(v * 0.55)))
    # sepia-ish film finish to sit next to vanilla photos
    out = base.resize(size, Image.LANCZOS)
    noise = Image.effect_noise(size, 14).convert("L").point(lambda v: v // 10)
    out = Image.alpha_composite(out, Image.merge("RGBA", (noise, noise, noise, noise.point(lambda v: 24))))
    return out
