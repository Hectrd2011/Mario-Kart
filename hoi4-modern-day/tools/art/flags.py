"""Country flags as 32-bit TGA in HOI4's three sizes."""
import os

from PIL import Image

from .common import FLAG_SVG, svg_to_image, save_tga

SIZES = {"": (82, 52), "medium": (41, 26), "small": (10, 7)}

STAR = "M0,-1 L0.2245,-0.309 L0.951,-0.309 L0.363,0.118 L0.588,0.809 L0,0.382 L-0.588,0.809 L-0.363,0.118 L-0.951,-0.309 L-0.2245,-0.309 Z"

# Flags with no ISO code, drawn here (3:2, 900x600).
CUSTOM = {
    # Syrian independence flag, flown by the opposition
    "HTS": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
      <rect width="900" height="200" fill="#007a3d"/><rect y="200" width="900" height="200" fill="#fff"/>
      <rect y="400" width="900" height="200" fill="#000"/>
      <g fill="#ce1126"><path transform="translate(270,300) scale(62)" d="{STAR}"/>
      <path transform="translate(450,300) scale(62)" d="{STAR}"/><path transform="translate(630,300) scale(62)" d="{STAR}"/></g></svg>""",
    # SDF-style yellow banner
    "RJV": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
      <rect width="900" height="600" fill="#f5c400"/>
      <circle cx="450" cy="300" r="150" fill="#1d8f3a"/><circle cx="450" cy="300" r="112" fill="#f5c400"/>
      <path transform="translate(450,300) scale(95)" d="{STAR}" fill="#d2232a"/></svg>""",
    # Somaliland
    "SML": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
      <rect width="900" height="200" fill="#006d21"/><rect y="200" width="900" height="200" fill="#fff"/>
      <rect y="400" width="900" height="200" fill="#d12229"/>
      <path transform="translate(450,300) scale(78)" d="{STAR}" fill="#000"/></svg>""",
    # Rapid Support Forces (no official flag; a field banner)
    "RSF": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
      <rect width="900" height="600" fill="#b88a4a"/><rect y="440" width="900" height="160" fill="#5b3f22"/>
      <path transform="translate(450,250) scale(130)" d="{STAR}" fill="#f2e6cc"/></svg>""",
}


def flag_image(tag, iso, size):
    if tag in CUSTOM:
        return svg_to_image(CUSTOM[tag].encode(), *size)
    with open(os.path.join(FLAG_SVG, iso + ".svg"), "rb") as fh:
        return svg_to_image(fh.read(), *size)


def write_flags(out_root, tag, iso, variants=("",)):
    """variants: suffixes such as '', '_democratic', ... ('' = base flag)."""
    written = []
    for sub, size in SIZES.items():
        img = flag_image(tag, iso, (size[0] * 4, size[1] * 4)).resize(size, Image.LANCZOS)
        # HOI4 flags are fully opaque
        bg = Image.new("RGBA", size, (0, 0, 0, 255))
        img = Image.alpha_composite(bg, img)
        for v in variants:
            path = os.path.join(out_root, "gfx", "flags", sub, f"{tag}{v}.tga")
            save_tga(img, path)
            written.append(path)
    return written
