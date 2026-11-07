"""Render every texture the mod needs and write the .gfx sprite files."""
import os


from data.countries import COUNTRIES
from data import decisions as DEC
from data import events as EV
from data.model import ascii_id

IDEOLOGY_SUFFIXES = ("", "_democratic", "_communism", "_fascism", "_neutrality")


def sprite(name, path):
    return f'\tspriteType = {{\n\t\tname = "{name}"\n\t\ttexturefile = "{path}"\n\t}}'


def _cid(tag, p):
    return f"{tag}_{p.key or ascii_id(p.name)}"


def write_gfx(out, ideas, focus_icons, dec_icons, pics, render=True):
    root = out.root
    if render:
        global portraits, icons, flags, save_dds
        from art import portraits, icons, flags
        from art.common import save_dds
        from art.common import vendor_glyphs
        used = [d["glyph"] for d in ideas.values()] + [g for g, _, _ in focus_icons.values()] + \
               [g for g, _ in dec_icons.values()] + [EV.PICTURES[p][0] for p in pics]
        missing = vendor_glyphs(used)
        if missing:
            raise SystemExit(f"missing Material Design Icons glyphs (set MDI_SRC): {missing}")

    def dds(img, rel):
        if render:
            save_dds(img, os.path.join(root, rel))

    # portraits
    n = 0
    for c in COUNTRIES:
        people = []
        seen = set()
        for p in c.leaders + c.others:
            cid = _cid(c.tag, p)
            if cid not in seen:
                seen.add(cid)
                people.append((cid, p.look))
        for cid, look in people:
            if render:
                img = portraits.render(look, c.iso, cid)
                dds(img, f"gfx/leaders/{c.tag}/md_{cid}.dds")
                dds(portraits.small(img), f"gfx/interface/ideas/md_leaders/{cid}.dds")
            n += 1
        for a in list(c.advisors) + (DEC.USA_INCOMING if c.tag == "USA" else []):
            cid = _cid(c.tag, a)
            if render:
                img = portraits.render(a.look, c.iso, cid)
                dds(portraits.small(img), f"gfx/interface/advisors/md/{cid}.dds")
            n += 1

    # flags (every ideology variant, so vanilla tags lose their 1936 flags too)
    if render:
        for c in COUNTRIES:
            flags.write_flags(root, c.tag, c.iso, IDEOLOGY_SUFFIXES)
        flags.write_flags(root, "HTS_TRANSITIONAL", "SY", ("",))

    # national spirits
    lines = []
    for iid, d in ideas.items():
        rel = f"gfx/interface/ideas/md/{iid}.dds"
        lines.append(sprite(f"GFX_idea_{iid}", rel))
        if render:
            dds(icons.idea_icon(d["glyph"], d["theme"]), rel)
    out.write("interface/md_ideas.gfx", "spriteTypes = {\n" + "\n".join(lines) + "\n}")

    # focus icons (+ shine copies so available focuses sparkle like vanilla ones)
    lines, shine = [], []
    for key, (glyph, theme, iso) in focus_icons.items():
        rel = f"gfx/interface/goals/md/{key}.dds"
        lines.append(sprite(f"GFX_{key}", rel))
        shine.append(f"""\tSpriteType = {{
		name = "GFX_{key}_shine"
		texturefile = "{rel}"
		effectFile = "gfx/FX/buttonstate.lua"
		animation = {{
			animationmaskfile = "{rel}"
			animationtexturefile = "gfx/interface/goals/shine_overlay.dds"
			animationrotation = -90.0
			animationlooping = no
			animationtime = 0.75
			animationdelay = 0
			animationblendmode = "add"
			animationtype = "scrolling"
			animationrotationoffset = {{ x = 0.0 y = 0.0 }}
			animationtexturescale = {{ x = 1.0 y = 1.0 }}
		}}
		animation = {{
			animationmaskfile = "{rel}"
			animationtexturefile = "gfx/interface/goals/shine_overlay.dds"
			animationrotation = 90.0
			animationlooping = no
			animationtime = 0.75
			animationdelay = 0
			animationblendmode = "add"
			animationtype = "scrolling"
			animationrotationoffset = {{ x = 0.0 y = 0.0 }}
			animationtexturescale = {{ x = 1.0 y = 1.0 }}
		}}
		legacy_lazy_load = no
	}}""")
        if render:
            dds(icons.focus_icon(glyph, theme, iso or None), rel)
    out.write("interface/md_goals.gfx", "spriteTypes = {\n" + "\n".join(lines) + "\n}")
    out.write("interface/md_goals_shine.gfx", "spriteTypes = {\n" + "\n".join(shine) + "\n}")

    # decision icons
    lines = []
    for key, (glyph, theme) in dec_icons.items():
        rel = f"gfx/interface/decisions/md/{key}.dds"
        lines.append(sprite(f"GFX_decision_{key}", rel))
        if render:
            dds(icons.decision_icon(glyph, theme), rel)
    out.write("interface/md_decisions.gfx", "spriteTypes = {\n" + "\n".join(lines) + "\n}")

    # event pictures
    lines = []
    for key in sorted(pics):
        glyph, theme, iso, wide = EV.PICTURES[key]
        rel = f"gfx/event_pictures/md/{key}.dds"
        lines.append(sprite(f"GFX_md_event_{key}", rel))
        if render:
            size = (397, 153) if wide else (210, 176)
            dds(icons.event_picture(glyph, theme, iso, size=size, wide=wide), rel)
    out.write("interface/md_events.gfx", "spriteTypes = {\n" + "\n".join(lines) + "\n}")

    if render:
        thumbnail(os.path.join(root, "thumbnail.png"))
    return n


def thumbnail(path):
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    from art.common import font_path, FLAG_SVG, svg_to_image
    W, H = 512, 512
    img = Image.new("RGBA", (W, H), (14, 16, 22, 255))
    tags = ["US", "CN", "RU", "UA", "GB", "FR", "DE", "IN", "IL", "IR", "JP", "KR", "TW", "TR", "BR", "SA"]
    for i, iso in enumerate(tags):
        with open(os.path.join(FLAG_SVG, iso + ".svg"), "rb") as fh:
            fl = svg_to_image(fh.read(), 128, 86)
        x, y = (i % 4) * 128, (i // 4) * 86 + 40
        img.alpha_composite(fl, (x, y))
    img = img.filter(ImageFilter.GaussianBlur(1.5))
    shade = Image.new("RGBA", (W, H), (10, 12, 18, 0))
    d = ImageDraw.Draw(shade)
    for y in range(H):
        a = int(255 * min(1, max(0, (y - 120) / 300)))
        d.line([(0, y), (W, y)], fill=(10, 12, 18, a))
    img = Image.alpha_composite(img, shade)
    d = ImageDraw.Draw(img)
    big = ImageFont.truetype(font_path("Inter-Bold.otf", "DejaVuSans-Bold.ttf"), 70)
    mid = ImageFont.truetype(font_path("Inter-SemiBold.otf", "DejaVuSans.ttf"), 30)
    small = ImageFont.truetype(font_path("Inter-Medium.otf", "DejaVuSans.ttf"), 20)
    d.text((32, 338), "MODERN DAY", font=big, fill=(244, 240, 230, 255))
    d.text((34, 414), "6 NOVEMBER 2024", font=mid, fill=(214, 172, 74, 255))
    d.text((34, 456), "The Second Term", font=small, fill=(200, 204, 214, 255))
    d.rectangle([32, 330, 140, 333], fill=(214, 172, 74, 255))
    img.convert("RGB").save(path)
