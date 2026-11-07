"""Stylised leader and advisor portraits.

These are deliberately not likenesses. Each one is a painted-flat bust
in front of the country's flag, varied by hair, attire, beard, glasses
and skin tone so that leaders read apart in the game's UI. Drop a real
portrait over any file (same name, same size) to replace it.
"""
import hashlib
import os

from PIL import Image, ImageDraw, ImageFilter, ImageChops

from .common import FLAG_SVG, svg_to_image, mix

S = 4                       # supersampling factor
W, H = 156, 210             # HOI4 large leader portrait

SKIN = {1: (240, 212, 188), 2: (224, 186, 152), 3: (196, 150, 110),
        4: (164, 114, 78), 5: (122, 82, 56), 6: (90, 60, 42)}
HAIR = {"black": (34, 30, 30), "brown": (92, 64, 44), "gray": (146, 144, 142),
        "white": (214, 211, 204), "blond": (206, 172, 112), "red": (158, 82, 46),
        "auburn": (126, 60, 40), "dyedblond": (222, 186, 118), "none": None}
TIE = {"red": (168, 32, 42), "blue": (44, 72, 150), "green": (38, 112, 62),
       "yellow": (204, 162, 40), "purple": (96, 52, 130), "": None}
SUITS = [(34, 44, 70), (46, 48, 54), (28, 30, 36), (52, 58, 74), (38, 52, 64)]
VESTS = [(176, 120, 60), (70, 90, 120), (110, 70, 50), (60, 100, 80), (140, 140, 150)]


def _rng(seed, n):
    h = hashlib.sha1(seed.encode("utf-8")).digest()
    return h[n % len(h)]


def _s(v):
    return int(round(v * S))


def _box(x0, y0, x1, y1):
    return [_s(x0), _s(y0), _s(x1), _s(y1)]


def _pts(pts):
    return [(_s(x), _s(y)) for x, y in pts]


class Canvas:
    def __init__(self):
        self.img = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))

    def layer(self):
        return Image.new("RGBA", self.img.size, (0, 0, 0, 0))

    def put(self, layer, shade=0.0, blur=0):
        if shade:
            layer = _shade(layer, shade)
        if blur:
            layer = layer.filter(ImageFilter.GaussianBlur(blur * S))
        self.img = Image.alpha_composite(self.img, layer)


def _shade(layer, strength):
    """Light from the upper left: darken towards the lower right."""
    w, h = layer.size
    big = Image.linear_gradient("L").resize((w * 2, h * 2))
    grad = big.rotate(-35, resample=Image.BILINEAR, fillcolor=255).crop((w // 2, h // 2, w // 2 + w, h // 2 + h))
    dark = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    alpha = layer.getchannel("A")
    mask = ImageChops.multiply(grad.point(lambda v: int(v * strength)), alpha)
    shaded = layer.copy()
    shaded.paste(dark, (0, 0), mask)
    shaded.putalpha(alpha)
    return shaded


# ------------------------------------------------------------------ background
def background(iso, seed):
    try:
        with open(os.path.join(FLAG_SVG, iso + ".svg"), "rb") as fh:
            flag = svg_to_image(fh.read(), 360, 240)
    except FileNotFoundError:
        flag = Image.new("RGBA", (360, 240), (60, 60, 70, 255))
    # cover 156x210 (portrait) with a cropped, blurred flag
    flag = flag.resize((int(360 * 1.4), int(240 * 1.4)))
    fw, fh = flag.size
    ox = (fw - fh * W // H) // 2 + (_rng(seed, 3) % 30) - 15
    crop = flag.crop((ox, 0, ox + fh * W // H, fh)).resize((W * S, H * S))
    crop = crop.filter(ImageFilter.GaussianBlur(9 * S))
    base = Image.new("RGBA", crop.size, (18, 20, 26, 255))
    crop = Image.blend(base, crop, 0.55)
    # spotlight behind the head + vignette
    spot = Image.radial_gradient("L").resize((W * S * 2, H * S * 2))
    spot = spot.crop((int(W * S * 0.5), int(H * S * 0.42), int(W * S * 1.5), int(H * S * 1.42)))
    lit = Image.new("RGBA", crop.size, (255, 248, 235, 255))
    crop = Image.composite(crop, Image.blend(crop, lit, 0.22), spot)
    vig = Image.radial_gradient("L").resize(crop.size).point(lambda v: int(min(255, v * 1.15)))
    crop = Image.composite(Image.new("RGBA", crop.size, (8, 9, 12, 255)), crop,
                           vig.point(lambda v: int(v * 0.75)))
    return crop


# ------------------------------------------------------------------ figure parts
def body(cv, look, seed):
    lay = cv.layer()
    d = ImageDraw.Draw(lay)
    skin = SKIN[look.skin]
    attire = look.attire
    jacket = SUITS[_rng(seed, 1) % len(SUITS)]
    if attire in ("military",):
        jacket = [(78, 88, 58), (60, 74, 60), (52, 62, 78)][_rng(seed, 2) % 3]
    elif attire == "fatigues":
        jacket = (82, 88, 62)
    elif attire == "thobe":
        jacket = (236, 234, 228)
    elif attire == "cleric":
        jacket = (34, 32, 34)
    elif attire == "mao":
        jacket = (56, 58, 62)
    elif attire == "kurta":
        jacket = (232, 226, 210)
    female = look.g == "f"

    # neck
    neck_w = 10 if female else 13
    d.rounded_rectangle(_box(78 - neck_w, 98, 78 + neck_w, 140), radius=_s(6), fill=skin + (255,))
    # under-chin shadow
    d.ellipse(_box(78 - neck_w, 104, 78 + neck_w, 122), fill=mix(skin, (0, 0, 0), 0.28) + (255,))
    cv.put(lay)

    lay = cv.layer()
    d = ImageDraw.Draw(lay)
    sh = 6 if not female else 16       # shoulder inset
    top = 136 if not female else 140
    torso = [(sh, 214), (sh, top + 26), (sh + 8, top + 8), (40, top - 2), (62, top - 8),
             (94, top - 8), (116, top - 2), (W - sh - 8, top + 8), (W - sh, top + 26), (W - sh, 214)]
    d.polygon(_pts(torso), fill=jacket + (255,))
    cv.put(lay, shade=0.55)

    lay = cv.layer()
    d = ImageDraw.Draw(lay)
    shirt = (238, 240, 244)
    if attire in ("suit", "open") and not female:
        d.polygon(_pts([(64, top - 7), (78, 188), (92, top - 7)]), fill=shirt + (255,))
        tie = TIE.get(look.tie)
        if attire == "suit" and tie:
            d.polygon(_pts([(74, top - 4), (82, top - 4), (80, top + 3), (76, top + 3)]), fill=mix(tie, (0, 0, 0), 0.15) + (255,))
            d.polygon(_pts([(76, top + 3), (80, top + 3), (84, 186), (78, 194), (72, 186)]), fill=tie + (255,))
        elif attire == "open":
            d.polygon(_pts([(71, top - 6), (78, top + 14), (85, top - 6)]), fill=skin + (255,))
        lap = mix(jacket, (0, 0, 0), 0.25)
        d.polygon(_pts([(62, top - 8), (52, top + 6), (60, top + 14), (56, top + 22), (77, 196), (66, top - 4)]), fill=lap + (255,))
        d.polygon(_pts([(94, top - 8), (104, top + 6), (96, top + 14), (100, top + 22), (79, 196), (90, top - 4)]), fill=lap + (255,))
    elif attire in ("suit", "open") and female:
        d.polygon(_pts([(64, top - 6), (78, top + 22), (92, top - 6)]), fill=skin + (255,))
        lap = mix(jacket, (255, 255, 255), 0.08)
        d.polygon(_pts([(62, top - 7), (50, top + 10), (76, 200), (68, top - 2)]), fill=lap + (255,))
        d.polygon(_pts([(94, top - 7), (106, top + 10), (80, 200), (88, top - 2)]), fill=lap + (255,))
        pearl = (236, 232, 222)
        for i in range(9):
            x = 66 + i * 3
            y = top + 4 + (abs(i - 4) * -1.6) + 6
            d.ellipse(_box(x - 1.3, y - 1.3, x + 1.3, y + 1.3), fill=pearl + (255,))
    elif attire == "military":
        d.polygon(_pts([(66, top - 7), (78, top + 10), (90, top - 7)]), fill=(214, 206, 180, 255))
        if look.tie != "none":
            d.polygon(_pts([(76, top - 2), (80, top - 2), (82, top + 30), (78, top + 34), (74, top + 30)]), fill=(48, 50, 40, 255))
        lap = mix(jacket, (0, 0, 0), 0.22)
        d.polygon(_pts([(62, top - 8), (52, top + 8), (76, 200), (68, top - 4)]), fill=lap + (255,))
        d.polygon(_pts([(94, top - 8), (104, top + 8), (80, 200), (88, top - 4)]), fill=lap + (255,))
        # epaulettes, ribbons, buttons
        for x0 in (14, W - 44):
            d.rounded_rectangle(_box(x0, top + 6, x0 + 30, top + 13), radius=_s(2), fill=mix(jacket, (0, 0, 0), 0.3) + (255,))
            d.ellipse(_box(x0 + 22, top + 7, x0 + 27, top + 12), fill=(212, 178, 90, 255))
        ribbons = [(170, 40, 50), (40, 90, 160), (210, 180, 70), (60, 130, 70), (230, 230, 230), (130, 40, 120)]
        for r in range(3):
            for c in range(3):
                col = ribbons[(_rng(seed, 5 + r * 3 + c)) % len(ribbons)]
                d.rectangle(_box(104 + c * 7, top + 22 + r * 4.5, 110 + c * 7, top + 25.5 + r * 4.5), fill=col + (255,))
        for i in range(3):
            d.ellipse(_box(77 - 1.6, top + 42 + i * 14, 77 + 1.6, top + 45.2 + i * 14), fill=(200, 170, 90, 255))
    elif attire == "fatigues":
        d.polygon(_pts([(62, top - 8), (78, top + 6), (94, top - 8), (90, top - 10), (66, top - 10)]), fill=mix(jacket, (0, 0, 0), 0.2) + (255,))
        d.polygon(_pts([(68, top - 9), (78, top + 2), (88, top - 9)]), fill=skin + (255,))
        d.rounded_rectangle(_box(30, top + 24, 52, top + 40), radius=_s(2), fill=mix(jacket, (0, 0, 0), 0.18) + (255,))
        d.rounded_rectangle(_box(104, top + 24, 126, top + 40), radius=_s(2), fill=mix(jacket, (0, 0, 0), 0.18) + (255,))
        d.line(_pts([(78, top + 4), (78, 214)]), fill=mix(jacket, (0, 0, 0), 0.3) + (255,), width=_s(1.2))
    elif attire == "thobe":
        d.polygon(_pts([(70, top - 8), (78, top + 30), (86, top - 8)]), fill=(222, 220, 214, 255))
        d.line(_pts([(78, top + 2), (78, top + 40)]), fill=(196, 192, 184, 255), width=_s(1.2))
        bisht = (60, 44, 34) if _rng(seed, 9) % 2 else (24, 22, 24)
        d.polygon(_pts([(sh, 214), (sh, top + 26), (sh + 10, top + 6), (46, top), (66, top + 60), (60, 214)]), fill=bisht + (255,))
        d.polygon(_pts([(W - sh, 214), (W - sh, top + 26), (W - sh - 10, top + 6), (110, top), (90, top + 60), (96, 214)]), fill=bisht + (255,))
        d.line(_pts([(46, top), (66, top + 60), (60, 214)]), fill=(206, 170, 90, 255), width=_s(1.6))
        d.line(_pts([(110, top), (90, top + 60), (96, 214)]), fill=(206, 170, 90, 255), width=_s(1.6))
    elif attire == "cleric":
        d.polygon(_pts([(66, top - 8), (78, top + 14), (90, top - 8)]), fill=(120, 110, 96, 255))
        d.polygon(_pts([(sh, 214), (sh, top + 26), (sh + 10, top + 6), (50, top), (70, top + 40), (66, 214)]), fill=(52, 46, 40, 255))
        d.polygon(_pts([(W - sh, 214), (W - sh, top + 26), (W - sh - 10, top + 6), (106, top), (86, top + 40), (90, 214)]), fill=(52, 46, 40, 255))
    elif attire == "mao":
        d.rounded_rectangle(_box(62, top - 10, 94, top + 2), radius=_s(3), fill=mix(jacket, (0, 0, 0), 0.25) + (255,))
        d.line(_pts([(78, top + 2), (78, 214)]), fill=mix(jacket, (0, 0, 0), 0.35) + (255,), width=_s(1.2))
        for i in range(4):
            d.ellipse(_box(76.4, top + 10 + i * 16, 79.6, top + 13.2 + i * 16), fill=mix(jacket, (0, 0, 0), 0.5) + (255,))
        for x0 in (28, 102):
            d.rectangle(_box(x0, top + 26, x0 + 24, top + 30), fill=mix(jacket, (0, 0, 0), 0.3) + (255,))
    elif attire == "kurta":
        vest = VESTS[_rng(seed, 4) % len(VESTS)]
        d.polygon(_pts([(70, top - 9), (78, top + 24), (86, top - 9)]), fill=mix(jacket, (0, 0, 0), 0.12) + (255,))
        d.polygon(_pts([(sh + 8, 214), (sh + 8, top + 26), (sh + 16, top + 8), (44, top - 2), (64, top - 8), (76, top + 40), (76, 214)]), fill=vest + (255,))
        d.polygon(_pts([(W - sh - 8, 214), (W - sh - 8, top + 26), (W - sh - 16, top + 8), (112, top - 2), (92, top - 8), (80, top + 40), (80, 214)]), fill=vest + (255,))
    cv.put(lay, shade=0.45)


def head(cv, look, seed):
    skin = SKIN[look.skin]
    female = look.g == "f"
    hw = 23 if female else 25
    top, bot = 50, 112
    # ears
    lay = cv.layer()
    d = ImageDraw.Draw(lay)
    for ex in (78 - hw - 3, 78 + hw - 5):
        d.ellipse(_box(ex, 78, ex + 8, 96), fill=mix(skin, (0, 0, 0), 0.08) + (255,))
    cv.put(lay)
    # face: an egg shape
    lay = cv.layer()
    d = ImageDraw.Draw(lay)
    d.ellipse(_box(78 - hw, top, 78 + hw, bot - 10), fill=skin + (255,))
    jaw = 15 if female else 17
    d.polygon(_pts([(78 - hw + 1, 84), (78 - jaw, bot - 6), (78, bot), (78 + jaw, bot - 6), (78 + hw - 1, 84)]), fill=skin + (255,))
    d.ellipse(_box(78 - jaw - 2, bot - 18, 78 + jaw + 2, bot + 1), fill=skin + (255,))
    cv.put(lay, shade=0.32)
    # soft features
    lay = cv.layer()
    d = ImageDraw.Draw(lay)
    brow = HAIR.get(look.hair) or (60, 50, 44)
    if look.hair in ("white", "gray", "blond", "dyedblond", "none"):
        brow = mix(brow or (90, 80, 70), (60, 50, 44), 0.45)
    ey = 83
    for sx in (-1, 1):
        cx = 78 + sx * 10
        d.line(_pts([(cx - 6 * sx * -1 if False else cx - 6, ey - 7 + (1 if sx < 0 else 0)),
                     (cx + 6, ey - 7 + (0 if sx < 0 else 1))]), fill=brow + (255,), width=_s(2.1 if not female else 1.6))
        d.ellipse(_box(cx - 4.2, ey - 2, cx + 4.2, ey + 2.4), fill=(250, 248, 244, 255))
        d.ellipse(_box(cx - 2, ey - 1.8, cx + 2, ey + 2.2), fill=(46, 36, 30, 255))
        d.ellipse(_box(cx - 0.6, ey - 1.2, cx + 0.6, ey), fill=(255, 255, 255, 230))
        if female:
            d.line(_pts([(cx - 4.4, ey - 1.6), (cx + 4.4, ey - 1.8)]), fill=(30, 24, 22, 255), width=_s(0.9))
    shadow = mix(skin, (0, 0, 0), 0.22)
    d.line(_pts([(79, 85), (81, 96), (77, 98)]), fill=shadow + (255,), width=_s(1.3))
    lip = mix(skin, (150, 40, 50), 0.35 if female else 0.18)
    d.chord(_box(70, 99, 86, 107), 10, 170, fill=lip + (255,))
    d.line(_pts([(70.5, 102.5), (85.5, 102.5)]), fill=mix(skin, (0, 0, 0), 0.4) + (255,), width=_s(0.9))
    cv.put(lay, blur=0.18)
    # cheek warmth
    lay = cv.layer()
    d = ImageDraw.Draw(lay)
    warm = mix(skin, (210, 90, 80), 0.35)
    for cx in (64, 92):
        d.ellipse(_box(cx - 6, 92, cx + 6, 100), fill=warm + (70 if female else 40,))
    cv.put(lay, blur=2.5)


def beard(cv, look):
    if not look.beard:
        return
    col = HAIR.get(look.hair) or (120, 116, 112)
    lay = cv.layer()
    d = ImageDraw.Draw(lay)
    alpha = 255
    if look.beard == "stubble":
        col = mix(SKIN[look.skin], col, 0.5)
        alpha = 150
    if look.beard in ("full", "short", "stubble"):
        drop = 10 if look.beard == "full" else (5 if look.beard == "short" else 2)
        d.polygon(_pts([(54, 86), (56, 100), (64, 110 + drop * 0.6), (78, 113 + drop), (92, 110 + drop * 0.6), (100, 100), (102, 86),
                        (96, 98), (88, 100), (78, 98), (68, 100), (60, 98)]), fill=col + (alpha,))
        d.polygon(_pts([(69, 101), (78, 98), (87, 101), (84, 104), (72, 104)]), fill=col + (alpha,))
    if look.beard in ("mustache", "goatee"):
        d.polygon(_pts([(68, 101.5), (78, 97.5), (88, 101.5), (85, 103), (78, 101), (71, 103)]), fill=col + (alpha,))
    if look.beard == "goatee":
        d.ellipse(_box(72, 105, 84, 114), fill=col + (alpha,))
    # keep the mouth readable
    if look.beard in ("full", "short"):
        d.chord(_box(71, 100, 85, 106), 10, 170, fill=mix(SKIN[look.skin], (150, 40, 50), 0.2) + (255,))
    cv.put(lay, shade=0.2, blur=0.4 if look.beard != "stubble" else 0.9)


def hair(cv, look, seed, behind=False):
    col = HAIR.get(look.hair)
    style = look.style
    female = look.g == "f"
    lay = cv.layer()
    d = ImageDraw.Draw(lay)
    if behind:
        if female and style in ("long", "pony"):
            d.rounded_rectangle(_box(48, 58, 108, 150 if style == "long" else 120), radius=_s(20), fill=col + (255,))
        if style == "covered" and look.attire == "thobe":
            ghutra = (238, 238, 236) if _rng(seed, 7) % 3 else (226, 226, 226)
            check = _rng(seed, 8) % 2 == 0 and look.skin >= 3
            d.polygon(_pts([(44, 52), (112, 52), (126, 168), (30, 168)]), fill=ghutra + (255,))
            if check:
                for gy in range(56, 168, 6):
                    d.line(_pts([(30, gy), (126, gy)]), fill=(176, 40, 46, 120), width=_s(1))
        if style == "covered" and female:
            d.polygon(_pts([(46, 54), (110, 54), (118, 150), (38, 150)]), fill=_covered_colour(seed) + (255,))
        cv.put(lay, shade=0.35)
        return
    if style == "covered":
        _headwear(cv, look, seed)
        return
    if not col or style == "bald":
        return
    if style in ("short", "side", "slick", "buzz", "receding", "balding", "swept", "curly"):
        if style == "balding":
            d.chord(_box(51, 60, 63, 96), 90, 270, fill=col + (255,))
            d.chord(_box(93, 60, 105, 96), 270, 90, fill=col + (255,))
        else:
            top = {"buzz": 51, "receding": 54, "curly": 44, "swept": 42}.get(style, 47)
            d.chord(_box(52, top, 104, 92), 180, 360, fill=col + (255,))
            d.rectangle(_box(52, 66, 56, 84), fill=col + (255,))
            d.rectangle(_box(100, 66, 104, 84), fill=col + (255,))
            if style == "receding":
                skin = SKIN[look.skin]
                d.ellipse(_box(64, 50, 92, 68), fill=skin + (255,))
            if style == "side":
                d.polygon(_pts([(56, 66), (66, 52), (90, 50), (102, 58), (104, 70), (84, 60)]), fill=mix(col, (255, 255, 255), 0.06) + (255,))
            if style == "slick":
                d.polygon(_pts([(54, 68), (62, 50), (96, 48), (104, 66), (88, 56), (66, 58)]), fill=mix(col, (255, 255, 255), 0.08) + (255,))
            if style == "swept":
                d.polygon(_pts([(50, 72), (54, 50), (78, 38), (106, 46), (108, 70), (96, 56), (70, 56)]), fill=col + (255,))
                d.polygon(_pts([(56, 60), (78, 42), (104, 52), (82, 52)]), fill=mix(col, (255, 255, 255), 0.18) + (255,))
            if style == "curly":
                for i in range(10):
                    cx = 50 + i * 6.2
                    d.ellipse(_box(cx - 6, 40 + (i % 2) * 3, cx + 6, 54 + (i % 2) * 3), fill=col + (255,))
                for side in (-1, 1):
                    x = 78 + side * 25
                    d.ellipse(_box(x - 6, 50, x + 6, 74), fill=col + (255,))
                    d.ellipse(_box(x - 5, 66, x + 5, 90), fill=col + (255,))
    elif female:
        if style in ("long", "bob", "pony", "bun"):
            d.chord(_box(50, 46, 106, 96), 180, 360, fill=col + (255,))
            d.polygon(_pts([(52, 70), (60, 54), (80, 50), (66, 66), (56, 92)]), fill=col + (255,))
            d.polygon(_pts([(104, 70), (96, 54), (78, 50), (92, 64), (100, 92)]), fill=col + (255,))
            if style == "bob":
                d.rounded_rectangle(_box(48, 62, 58, 112), radius=_s(5), fill=col + (255,))
                d.rounded_rectangle(_box(98, 62, 108, 112), radius=_s(5), fill=col + (255,))
            if style == "long":
                d.rounded_rectangle(_box(48, 64, 57, 132), radius=_s(5), fill=col + (255,))
                d.rounded_rectangle(_box(99, 64, 108, 132), radius=_s(5), fill=col + (255,))
            if style == "bun":
                d.ellipse(_box(66, 34, 90, 54), fill=col + (255,))
    cv.put(lay, shade=0.3)


def _covered_colour(seed):
    return [(40, 70, 120), (130, 40, 60), (40, 100, 80), (190, 150, 70), (90, 60, 120)][_rng(seed, 6) % 5]


def _headwear(cv, look, seed):
    lay = cv.layer()
    d = ImageDraw.Draw(lay)
    if look.attire == "thobe":
        ghutra = (240, 240, 238)
        d.chord(_box(50, 44, 106, 92), 180, 360, fill=ghutra + (255,))
        d.polygon(_pts([(50, 68), (56, 112), (50, 150), (44, 120)]), fill=ghutra + (255,))
        d.polygon(_pts([(106, 68), (100, 112), (106, 150), (112, 120)]), fill=ghutra + (255,))
        d.rounded_rectangle(_box(52, 52, 104, 60), radius=_s(4), fill=(26, 24, 26, 255))
    elif look.attire == "cleric":
        turban = (24, 24, 26) if _rng(seed, 2) % 2 else (240, 238, 232)
        if look.skin <= 2:
            turban = (24, 24, 26)
        d.ellipse(_box(48, 36, 108, 72), fill=turban + (255,))
        for i in range(3):
            d.arc(_box(50, 40 + i * 6, 106, 72 + i * 2), 190, 350, fill=mix(turban, (128, 128, 128), 0.25) + (255,), width=_s(1))
    elif look.attire == "military":
        beret = (110, 30, 40) if _rng(seed, 3) % 2 else (50, 70, 50)
        d.ellipse(_box(48, 38, 104, 62), fill=beret + (255,))
        d.rectangle(_box(52, 54, 104, 60), fill=mix(beret, (0, 0, 0), 0.3) + (255,))
        d.ellipse(_box(60, 50, 66, 56), fill=(210, 180, 90, 255))
    elif look.g == "f":
        col = _covered_colour(seed)
        # outer wrap with a face-shaped opening
        wrap = Image.new("L", lay.size, 0)
        wd = ImageDraw.Draw(wrap)
        wd.ellipse(_box(44, 40, 112, 128), fill=255)
        wd.rectangle(_box(40, 112, 116, 150), fill=255)
        wd.ellipse(_box(57, 62, 99, 116), fill=0)
        solid = Image.new("RGBA", lay.size, col + (255,))
        lay.paste(solid, (0, 0), wrap)
        d = ImageDraw.Draw(lay)
        d.arc(_box(55, 60, 101, 118), 200, 340, fill=mix(col, (255, 255, 255), 0.25) + (255,), width=_s(1.2))
    else:
        cap = VESTS[_rng(seed, 4) % len(VESTS)]
        d.polygon(_pts([(52, 62), (54, 40), (100, 36), (104, 60)]), fill=cap + (255,))
        d.line(_pts([(54, 50), (102, 46)]), fill=mix(cap, (0, 0, 0), 0.3) + (255,), width=_s(1))
    cv.put(lay, shade=0.3)


def glasses(cv, look):
    if not look.glasses:
        return
    lay = cv.layer()
    d = ImageDraw.Draw(lay)
    frame = (36, 34, 36, 255)
    for cx in (68, 88):
        d.rounded_rectangle(_box(cx - 7, 78.5, cx + 7, 89), radius=_s(3), outline=frame, width=_s(1.1))
        d.rounded_rectangle(_box(cx - 6, 79.5, cx + 6, 88), radius=_s(2.5), fill=(255, 255, 255, 28))
    d.line(_pts([(75, 82), (81, 82)]), fill=frame, width=_s(1.1))
    d.line(_pts([(61, 82), (54, 80)]), fill=frame, width=_s(1.1))
    d.line(_pts([(95, 82), (102, 80)]), fill=frame, width=_s(1.1))
    cv.put(lay)


def render(look, iso, seed, size=(W, H)):
    cv = Canvas()
    cv.img = background(iso, seed)
    # drop shadow for the whole figure
    fig = Canvas()
    hair(fig, look, seed, behind=True)
    body(fig, look, seed)
    head(fig, look, seed)
    beard(fig, look)
    hair(fig, look, seed)
    glasses(fig, look)
    big = fig.img.resize((int(W * S * 1.2), int(H * S * 1.2)), Image.LANCZOS)
    ox, oy = int(78 * S * 1.2 - 78 * S), int(150 * S * 1.2 - 150 * S)
    fig.img = big.crop((ox, oy, ox + W * S, oy + H * S))
    shadow = fig.img.getchannel("A").filter(ImageFilter.GaussianBlur(6 * S))
    sh_layer = Image.new("RGBA", fig.img.size, (0, 0, 0, 0))
    sh_layer.putalpha(shadow.point(lambda v: int(v * 0.55)))
    sh_layer = ImageChops.offset(sh_layer, _s(3), _s(4))
    cv.put(sh_layer)
    cv.put(fig.img)
    # rim light on the left edge of the figure
    out = cv.img.resize(size, Image.LANCZOS)
    # subtle film grain keeps flat colours from banding
    noise = Image.effect_noise(size, 10).convert("L").point(lambda v: v // 12)
    grain = Image.merge("RGBA", (noise, noise, noise, noise.point(lambda v: 18)))
    out = Image.alpha_composite(out, grain)
    return out


def small(img):
    """Advisor / small portrait (65x67): a head-and-shoulders crop."""
    w, h = img.size
    crop = img.crop((int(w * 0.14), int(h * 0.14), int(w * 0.86), int(h * 0.76)))
    return crop.resize((65, 67), Image.LANCZOS)
