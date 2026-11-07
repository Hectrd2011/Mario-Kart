#!/usr/bin/env python3
"""Make a small fake HOI4 install for testing the map builder.

It has the same file formats as the real game (definition.csv,
provinces.bmp, history/states, localisation, technologies, country tags),
but the map is a plain 0.5-degree grid and the states are 1936-style
blocks of provinces. Usage:

    python3 tools/tests/make_synthetic_game.py /tmp/fakehoi4
    HOI4_DIR=/tmp/fakehoi4 python3 tools/build.py --no-art
"""
import json
import os
import sys
from collections import defaultdict

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from data.cities import CITIES  # noqa: E402

import math

OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/fakehoi4"
MILLER = "--miller" in sys.argv     # distorted projection, like HOI4's map
RES = 2          # pixels per degree
CELL = 2         # province = CELL x CELL pixels
W, H = 360 * RES, 180 * RES
LAT_N, LAT_S = 72.0, -56.0


def _m(lat):
    return 1.25 * math.log(math.tan(math.pi / 4 + 0.4 * math.radians(lat)))


def to_lonlat(px, py):
    """pixel centre -> lon/lat for the synthetic projection"""
    lon = px / RES - 180
    if not MILLER:
        return lon, 90 - py / RES
    top, bot = _m(LAT_N), _m(LAT_S)
    v = top - (py / H) * (top - bot)
    lat = math.degrees((math.atan(math.exp(v / 1.25)) - math.pi / 4) / 0.4)
    lon = lon * (1 + 0.15 * math.sin(math.radians(lat)))   # a little shear, as HOI4 has
    return lon, lat


def to_pixel(lon, lat):
    if not MILLER:
        return (lon + 180) * RES, (90 - lat) * RES
    lon = lon / (1 + 0.15 * math.sin(math.radians(lat)))
    top, bot = _m(LAT_N), _m(LAT_S)
    return (lon + 180) * RES, (top - _m(lat)) / (top - bot) * H


def main():
    meta = json.load(open(os.path.join(HERE, "..", "data", "world", "world_0p1.json")))
    raster = Image.open(os.path.join(HERE, "..", "data", "world", "world_0p1.png"))
    codes = meta["codes"]

    def code(lon, lat):
        return codes[raster.getpixel((int((lon + 180) * 10) % 3600, min(1799, max(0, int((90 - lat) * 10)))))]

    img = Image.new("RGB", (W, H))
    px = img.load()
    defs = ["0;0;0;0;land;false;unknown;0"]
    prov_cell = {}
    pid = 0
    land = {}
    for cy in range(0, H, CELL):
        for cx in range(0, W, CELL):
            pid += 1
            lon, lat = to_lonlat(cx + CELL / 2, cy + CELL / 2)
            c = code(lon, lat) if -180 <= lon <= 180 else "--"
            kind = "land" if c != "--" else "sea"
            r, g, b = (pid >> 16) & 255, (pid >> 8) & 255, pid & 255
            for dy in range(CELL):
                for dx in range(CELL):
                    px[cx + dx, cy + dy] = (r, g, b)
            defs.append(f"{pid};{r};{g};{b};{kind};false;plains;1")
            prov_cell[pid] = (lon, lat)
            if kind == "land":
                land[pid] = c
    os.makedirs(os.path.join(OUT, "map"), exist_ok=True)
    img.save(os.path.join(OUT, "map", "provinces.bmp"))
    open(os.path.join(OUT, "map", "definition.csv"), "w").write("\n".join(defs) + "\n")

    # 1936-ish states: 4x4 degree blocks of land, split by modern code
    groups = defaultdict(list)
    for p, c in land.items():
        lon, lat = prov_cell[p]
        groups[(int((lon + 180) // 4), int((lat + 90) // 4), c)].append(p)
    sdir = os.path.join(OUT, "history", "states")
    os.makedirs(sdir, exist_ok=True)
    vp = {}
    for name, (lat, lon) in CITIES.items():
        if MILLER and not (LAT_S < lat < LAT_N):
            continue
        fx, fy = to_pixel(lon, lat)
        cx, cy = int(fx) // CELL, int(fy) // CELL
        p = cy * (W // CELL) + cx + 1
        if p in land:
            vp.setdefault(p, name)
    names = []
    for sid, (key, provs) in enumerate(sorted(groups.items()), start=1):
        vps = [p for p in provs if p in vp]
        hist = "\t\towner = XXX\n\t\tadd_core_of = XXX\n"
        for p in vps[:2]:
            hist += f"\t\tvictory_points = {{ {p} 5 }}\n"
        hist += "\t\tbuildings = {\n\t\t\tinfrastructure = 2\n\t\t\tindustrial_complex = 1\n"
        hist += f"\t\t\t{provs[0]} = {{ supply_node = 1 bunker = 2 }}\n\t\t}}\n\t\t1939.1.1 = {{ owner = XXX }}\n"
        text = (f"state={{\n\tid={sid}\n\tname=\"STATE_{sid}\"\n\tmanpower = {len(provs) * 40000}\n"
                f"\tstate_category = town\n\thistory={{\n{hist}\t}}\n\tprovinces={{\n\t\t{' '.join(map(str, provs))}\n\t}}\n"
                f"\tlocal_supplies=0.000\n}}\n")
        open(os.path.join(sdir, f"{sid}-State{sid}.txt"), "w").write(text)
        names.append(f' STATE_{sid}:0 "Block {sid} ({key[2]})"')
    loc = os.path.join(OUT, "localisation", "english")
    os.makedirs(loc, exist_ok=True)
    open(os.path.join(loc, "state_names_l_english.yml"), "w", encoding="utf-8-sig").write("l_english:\n" + "\n".join(names) + "\n")
    open(os.path.join(loc, "victory_points_l_english.yml"), "w", encoding="utf-8-sig").write(
        "l_english:\n" + "\n".join(f' VICTORY_POINTS_{p}:0 "{n}"' for p, n in vp.items()) + "\n")
    tags = os.path.join(OUT, "common", "country_tags")
    os.makedirs(tags, exist_ok=True)
    open(os.path.join(tags, "00_countries.txt"), "w").write(
        "\n".join(f'{t} = "countries/{t}.txt"' for t in ["GER", "ENG", "FRA", "USA", "SOV", "ITA", "JAP", "CHI", "PRC", "POL", "UKR"]) + "\n")
    tech = os.path.join(OUT, "common", "technologies")
    os.makedirs(tech, exist_ok=True)
    open(os.path.join(tech, "infantry.txt"), "w").write("""technologies = {
	infantry_weapons = { start_year = 1918 folder = { name = infantry_folder position = { x = 0 y = 0 } } }
	infantry_weapons1 = { start_year = 1936 folder = { name = infantry_folder position = { x = 0 y = 1 } } }
	advanced_infantry_weapons = { start_year = 1944 folder = { name = infantry_folder position = { x = 0 y = 2 } } }
	concentrated_industry = { start_year = 1936 XOR = { dispersed_industry } folder = { name = industry_folder position = { x = 0 y = 0 } } }
	dispersed_industry = { start_year = 1936 XOR = { concentrated_industry } folder = { name = industry_folder position = { x = 1 y = 0 } } }
	nukes = { start_year = 1945 folder = { name = nuclear_folder position = { x = 0 y = 0 } } }
	mobile_warfare = { start_year = 1936 doctrine = yes folder = { name = land_doctrine_folder position = { x = 0 y = 0 } } }
}
""")
    print(f"synthetic game at {OUT}: {pid} provinces, {len(groups)} states, {len(vp)} named victory points")


if __name__ == "__main__":
    main()
