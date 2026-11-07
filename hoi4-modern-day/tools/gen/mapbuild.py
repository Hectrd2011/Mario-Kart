"""Build the 2024 map layer from a copy of HOI4's own files.

Inputs (from the game folder):
  history/states/*.txt                      state definitions (provinces, buildings, VPs)
  map/definition.csv, map/provinces.bmp     province ids, colours and pixels
  localisation/english/state_names_l_english.yml, victory_points_l_english.yml
  common/technologies/*.txt                 technology names and years
  common/country_tags/*.txt                 which tags already exist

How it works:
  1. Find every province's pixel centroid in provinces.bmp.
  2. Calibrate pixel -> latitude/longitude from victory points whose names
     are known cities (data/cities.py), with a least-squares polynomial fit.
  3. Look each land province up in a 0.1-degree world border raster built
     from Natural Earth (data/world). A state goes to the 2024 country that
     holds most of its land.
  4. Apply the special cases that borders alone don't capture: the front
     line in Ukraine, the Kursk salient, Idlib, north-east Syria, Darfur,
     the Houthi north of Yemen and the two Libyas.
  5. Rescale population, factories and infrastructure to 2024 levels and
     write armies at the capital, the victory points and the front.
"""
import csv
import json
import math
import os
import re
from collections import Counter, defaultdict

from data.countries import COUNTRIES, BY_TAG
from data.cities import CITIES, CAPITALS, RENAMES
from data import economy as ECO
from gen.pdx import loc_file

HERE = os.path.dirname(os.path.abspath(__file__))
WORLD = os.path.join(HERE, "..", "data", "world")

# ------------------------------------------------------------------ script parsing
TOKEN = re.compile(r'"[^"]*"|[{}=<>]|[^\s{}=<>"#]+|#[^\n]*')


def tokenize(text):
    return [t for t in TOKEN.findall(text) if not t.startswith("#")]


def parse(text):
    toks = tokenize(text)
    pos = 0

    def block():
        nonlocal pos
        out = []
        while pos < len(toks):
            t = toks[pos]
            if t == "}":
                pos += 1
                return out
            if pos + 1 < len(toks) and toks[pos + 1] in ("=", "<", ">"):
                op = toks[pos + 1]
                pos += 2
                if pos < len(toks) and toks[pos] == "{":
                    pos += 1
                    out.append((t, op, block()))
                else:
                    out.append((t, op, toks[pos]))
                    pos += 1
            elif t == "{":
                pos += 1
                out.append((None, None, block()))
            else:
                out.append((None, None, t))
                pos += 1
        return out

    return block()


def get(block, key, default=None):
    for k, _, v in block:
        if k == key:
            return v
    return default


def get_all(block, key):
    return [v for k, _, v in block if k == key]


def unq(s):
    return s[1:-1] if isinstance(s, str) and s.startswith('"') else s


def read_text(path):
    with open(path, encoding="utf-8-sig", errors="replace") as fh:
        return fh.read()


def read_loc(path):
    out = {}
    if not os.path.exists(path):
        return out
    for line in read_text(path).splitlines():
        m = re.match(r'^\s*([A-Za-z0-9_\.]+):\d*\s*"(.*)"\s*$', line)
        if m:
            out[m.group(1)] = m.group(2)
    return out


def norm_name(s):
    import unicodedata
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())


# ------------------------------------------------------------------ geography helpers
def point_in_poly(lon, lat, poly):
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi:
            inside = not inside
        j = i
    return inside


# Russian-held Ukraine, November 2024 (approximate front line, lon/lat)
RUSSIAN_HELD = [
    (38.0, 50.12), (37.72, 49.75), (37.95, 49.25), (38.12, 48.95), (37.86, 48.60), (37.74, 48.36), (37.42, 48.25),
    (37.18, 47.96), (36.92, 47.76), (36.62, 47.66), (35.92, 47.52), (35.22, 47.58), (34.72, 47.45), (34.20, 47.20),
    (33.90, 46.84), (33.30, 46.70), (32.62, 46.56), (31.90, 46.40), (31.60, 46.30), (33.40, 45.60), (35.40, 45.30),
    (37.20, 46.50), (38.25, 47.10), (39.85, 47.85), (40.20, 48.50), (40.05, 49.55), (38.80, 50.12),
]
# Ukrainian-held part of Kursk oblast around Sudzha
KURSK_SALIENT = [(34.95, 51.05), (35.62, 51.05), (35.72, 51.36), (35.10, 51.42)]
CRIMEA_BOX = (32.4, 44.3, 36.7, 46.2)
OBLASTS_CLAIMED = [  # Luhansk, Donetsk, Zaporizhzhia, Kherson (lon0, lat0, lon1, lat1)
    (37.8, 47.9, 40.25, 50.15), (36.5, 46.9, 38.9, 49.25), (34.2, 46.3, 37.3, 48.2), (32.2, 45.95, 35.1, 47.65)]
IDLIB_BOX = (36.15, 35.55, 36.98, 36.32)


def in_box(lon, lat, box):
    return box[0] <= lon <= box[2] and box[1] <= lat <= box[3]


# ISO code (or our pseudo-code) -> tag for places without their own country
TERRITORIES = {
    "GL": "DEN", "FO": "DEN", "PR": "USA", "GU": "USA", "VI": "USA", "AS": "USA", "MP": "USA", "PW": "USA", "FM": "USA",
    "MH": "USA", "UM": "USA", "FK": "ENG", "GI": "ENG", "BM": "ENG", "KY": "ENG", "TC": "ENG", "VG": "ENG", "AI": "ENG",
    "MS": "ENG", "SH": "ENG", "IO": "ENG", "PN": "ENG", "GS": "ENG", "IM": "ENG", "JE": "ENG", "GG": "ENG", "NC": "FRA",
    "PF": "FRA", "RE": "FRA", "GF": "FRA", "GP": "FRA", "MQ": "FRA", "YT": "FRA", "PM": "FRA", "WF": "FRA", "BL": "FRA",
    "MF": "FRA", "TF": "FRA", "AW": "HOL", "CW": "HOL", "SX": "HOL", "BQ": "HOL", "HK": "PRC", "MO": "PRC", "EH": "MOR",
    "SJ": "NOR", "BV": "NOR", "AX": "FIN", "NF": "AST", "CX": "AST", "CC": "AST", "HM": "AST", "CK": "NZL", "NU": "NZL",
    "TK": "NZL", "AD": "SPR", "MC": "FRA", "SM": "ITA", "VA": "ITA", "LI": "SWI", "VU": "FRA", "WS": "NZL", "TO": "NZL",
    "KI": "AST", "TV": "AST", "NR": "AST", "BB": "TRI", "LC": "TRI", "VC": "TRI", "GD": "TRI", "AG": "TRI", "DM": "TRI",
    "KN": "TRI", "CV": "SEN", "ST": "GAB", "KM": "MAD", "SC": "MRT", "MV": "SRL", "XS": "SML", "XK": "KOS", "TW": "ROC",
    "PS": "PAL", "AQ": None, "--": None,
}


class VanillaMap:
    def __init__(self, game):
        self.game = game
        self.has_states = True
        self.report = []
        self._load()
        self._assign()

    # ------------------------------------------------------------- loading
    def _load(self):
        g = self.game
        self.vanilla_tags = set()
        tagdir = os.path.join(g, "common", "country_tags")
        for f in os.listdir(tagdir):
            if f.endswith(".txt"):
                for k, _, v in parse(read_text(os.path.join(tagdir, f))):
                    if k and re.match(r"^[A-Z][A-Z0-9]{2}$", k):
                        self.vanilla_tags.add(k)
        # provinces
        self.prov_type = {}
        self.prov_colour = {}
        with open(os.path.join(g, "map", "definition.csv"), encoding="utf-8", errors="replace") as fh:
            for row in csv.reader(fh, delimiter=";"):
                if len(row) < 5 or not row[0].strip().isdigit():
                    continue
                pid = int(row[0])
                if pid == 0:
                    continue
                self.prov_type[pid] = row[4].strip()
                self.prov_colour[(int(row[1]), int(row[2]), int(row[3]))] = pid
        self._province_pixels()
        # states
        self.states = {}
        sdir = os.path.join(g, "history", "states")
        for f in sorted(os.listdir(sdir)):
            if not f.endswith(".txt"):
                continue
            text = read_text(os.path.join(sdir, f))
            for k, _, v in parse(text):
                if k == "state":
                    sid = int(get(v, "id"))
                    self.states[sid] = dict(file=f, block=v)
        loc = os.path.join(g, "localisation", "english")
        self.state_names = read_loc(os.path.join(loc, "state_names_l_english.yml"))
        self.vp_names = read_loc(os.path.join(loc, "victory_points_l_english.yml"))
        self.techs = self._technologies()

    def _province_pixels(self):
        import numpy as np
        from PIL import Image
        img = np.asarray(Image.open(os.path.join(self.game, "map", "provinces.bmp")).convert("RGB")).astype(np.int64)
        h, w, _ = img.shape
        key = (img[:, :, 0] << 16) | (img[:, :, 1] << 8) | img[:, :, 2]
        lut = {(r << 16) | (gg << 8) | b: pid for (r, gg, b), pid in self.prov_colour.items()}
        flat = key.ravel()
        uniq, inv = np.unique(flat, return_inverse=True)
        ids = np.array([lut.get(int(u), 0) for u in uniq], dtype=np.int64)[inv].reshape(h, w)
        self.width, self.height = w, h
        n = int(ids.max()) + 1
        ys, xs = np.indices((h, w))
        cnt = np.bincount(ids.ravel(), minlength=n)
        sx = np.bincount(ids.ravel(), weights=xs.ravel(), minlength=n)
        sy = np.bincount(ids.ravel(), weights=ys.ravel(), minlength=n)
        self.prov_xy = {}
        self.prov_area = {}
        for pid in range(1, n):
            if cnt[pid]:
                self.prov_xy[pid] = (sx[pid] / cnt[pid], sy[pid] / cnt[pid])
                self.prov_area[pid] = int(cnt[pid])
        # land adjacency from neighbouring pixels
        pairs = set()
        for a, b in ((ids[:, :-1], ids[:, 1:]), (ids[:-1, :], ids[1:, :])):
            m = a != b
            for x, y in zip(a[m].tolist(), b[m].tolist()):
                if x and y:
                    pairs.add((min(x, y), max(x, y)))
        self.adj = defaultdict(set)
        for x, y in pairs:
            self.adj[x].add(y)
            self.adj[y].add(x)

    def _technologies(self):
        tdir = os.path.join(self.game, "common", "technologies")
        techs = {}
        if not os.path.isdir(tdir):
            return techs
        for f in os.listdir(tdir):
            if not f.endswith(".txt"):
                continue
            for k, _, v in parse(read_text(os.path.join(tdir, f))):
                if k != "technologies" or not isinstance(v, list):
                    continue
                for name, _, body in v:
                    if not name or not isinstance(body, list) or name.startswith("@"):
                        continue
                    year = get(body, "start_year")
                    folder = get(body, "folder")
                    fname = get(folder, "name") if isinstance(folder, list) else None
                    xor = []
                    x = get(body, "XOR")
                    if isinstance(x, list):
                        xor = [t for _, _, t in x if isinstance(t, str)]
                    doctrine = bool(get(body, "doctrine")) or (fname or "").endswith("doctrine_folder")
                    techs[name] = dict(year=int(year) if year and year.isdigit() else 1936, folder=fname, xor=xor,
                                       doctrine=doctrine, file=f)
        return techs

    # ------------------------------------------------------------- projection
    def _calibrate(self):
        import numpy as np
        known = {norm_name(k): v for k, v in CITIES.items()}
        X, Y, LON, LAT = [], [], [], []
        for key, name in self.vp_names.items():
            m = re.match(r"VICTORY_POINTS_(\d+)$", key)
            if not m:
                continue
            pid = int(m.group(1))
            ll = known.get(norm_name(name))
            if ll and pid in self.prov_xy:
                x, y = self.prov_xy[pid]
                X.append(x / self.width)
                Y.append(y / self.height)
                LAT.append(ll[0])
                LON.append(ll[1])
        X, Y, LON, LAT = map(np.array, (X, Y, LON, LAT))

        def design(x, y):
            cols = []
            for i in range(4):
                for j in range(4 - i):
                    cols.append((x ** i) * (y ** j))
            return np.stack(cols, axis=1)

        keep = np.ones(len(X), bool)
        for _ in range(6):
            A = design(X[keep], Y[keep])
            clon = np.linalg.lstsq(A, LON[keep], rcond=None)[0]
            clat = np.linalg.lstsq(A, LAT[keep], rcond=None)[0]
            A_all = design(X, Y)
            err = np.hypot(A_all @ clon - LON, A_all @ clat - LAT)
            new = err < max(2.5, 3 * np.median(err[keep]))
            if (new == keep).all():
                break
            keep = new
        self.clon, self.clat, self.design = clon, clat, design
        # local correction: inverse-distance-weighted residuals of nearby anchors
        A_k = design(X[keep], Y[keep])
        self.anchor_xy = np.stack([X[keep], Y[keep]], axis=1)
        self.anchor_res = np.stack([LON[keep] - A_k @ clon, LAT[keep] - A_k @ clat], axis=1)
        rms = float(np.sqrt(np.mean(err[keep] ** 2)))
        self.report.append(f"projection: {int(keep.sum())}/{len(X)} anchor cities, RMS error {rms:.2f} degrees")
        if keep.sum() < 30 or rms > 3:
            raise SystemExit("map calibration failed: too few matching victory points")

    def lonlat(self, pid):
        import numpy as np
        x, y = self.prov_xy[pid]
        x, y = x / self.width, y / self.height
        A = self.design(np.array([x]), np.array([y]))
        lon, lat = float((A @ self.clon)[0]), float((A @ self.clat)[0])
        d2 = (self.anchor_xy[:, 0] - x) ** 2 * 4 + (self.anchor_xy[:, 1] - y) ** 2
        near = np.argsort(d2)[:6]
        w = 1.0 / (d2[near] + 2e-5)
        w *= d2[near] < 0.004          # only anchors within ~ a few hundred km
        if w.sum() > 0:
            lon += float((self.anchor_res[near, 0] * w).sum() / w.sum())
            lat += float((self.anchor_res[near, 1] * w).sum() / w.sum())
        return lon, lat

    # ------------------------------------------------------------- assignment
    def _assign(self):
        from PIL import Image
        self._calibrate()
        meta = json.load(open(os.path.join(WORLD, "world_0p1.json")))
        raster = Image.open(os.path.join(WORLD, "world_0p1.png"))
        res, codes = meta["resolution"], meta["codes"]
        iso_tag = {}
        for c in COUNTRIES:
            iso_tag.setdefault(c.iso, c.tag)
        iso_tag.update({"SY": "SYR", "SD": "SUD", "YE": "YEM", "LY": "LBA", "SO": "SOM"})

        def code_at(lon, lat):
            x = int((lon + 180) * res) % (360 * res)
            y = min(max(int((90 - lat) * res), 0), 180 * res - 1)
            c = codes[raster.getpixel((x, y))]
            if c == "--":
                # coastal provinces can fall just offshore: look around
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (2, 0), (-2, 0), (0, 2), (0, -2), (3, 3), (-3, -3), (3, -3), (-3, 3)):
                    c2 = codes[raster.getpixel(((x + dx) % (360 * res), min(max(y + dy, 0), 180 * res - 1)))]
                    if c2 != "--":
                        return c2
            return c

        self.prov_ll = {}
        self.prov_tag = {}
        self.controller = {}          # province -> controller where different from owner
        for sid, st in self.states.items():
            for pid in self._state_provinces(st):
                if self.prov_type.get(pid) != "land" or pid not in self.prov_xy:
                    continue
                lon, lat = self.lonlat(pid)
                self.prov_ll[pid] = (lon, lat)
                code = code_at(lon, lat)
                tag = TERRITORIES.get(code, iso_tag.get(code))
                # sub-national splits
                if tag == "UKR" and in_box(lon, lat, CRIMEA_BOX) and lat < 46.15:
                    tag = "RUS"
                if tag == "SYR":
                    if in_box(lon, lat, IDLIB_BOX):
                        tag = "HTS"
                    elif (lon > 38.4 and lat > 35.25) or (lon > 40.2 and lat > 34.6):
                        tag = "RJV"
                if tag == "SUD" and (lon < 27.6 or (lon < 29.2 and 9.5 < lat < 13.2)):
                    tag = "RSF"
                if tag == "YEM" and not ((lon < 45.6 and lat > 14.0) or (lon < 44.3 and lat > 13.35)):
                    tag = "ADN"
                if tag == "LBA" and (lat < 29.5 or lon > 16.5):
                    tag = "HAF"
                self.prov_tag[pid] = tag
                if tag == "UKR" and point_in_poly(lon, lat, RUSSIAN_HELD):
                    self.controller[pid] = "RUS"
                if tag == "RUS" and point_in_poly(lon, lat, KURSK_SALIENT):
                    self.controller[pid] = "UKR"

        self.owner = {}
        self.cores = defaultdict(set)
        self.claims = defaultdict(set)
        unassigned = []
        for sid, st in self.states.items():
            weights = Counter()
            for pid in self._state_provinces(st):
                t = self.prov_tag.get(pid)
                if t:
                    weights[t] += self.prov_area.get(pid, 1)
            if not weights:
                unassigned.append(sid)
                continue
            owner = weights.most_common(1)[0][0]
            self.owner[sid] = owner
            self.cores[sid].add(owner)
        # neighbours for stray states (open sea islands, wasteland)
        for sid in unassigned:
            near = self._nearest_owner(sid)
            if near:
                self.owner[sid] = near
                self.cores[sid].add(near)
            else:
                self.report.append(f"WARNING: state {sid} ({self.state_name(sid)}) has no owner")
        self._special_cores()
        self._ensure_presence()
        self.capitals = {}
        for tag in set(self.owner.values()):
            self.capitals[tag] = self._capital(tag)
        n_owned = Counter(self.owner.values())
        self.report.append(f"states: {len(self.owner)} assigned to {len(n_owned)} countries")
        missing = [c.tag for c in COUNTRIES if c.tag not in n_owned]
        if missing:
            self.report.append("countries with no land on this map (they start as releasable): " + " ".join(sorted(missing)))

    def _state_provinces(self, st):
        p = get(st["block"], "provinces", [])
        return [int(v) for _, _, v in p if isinstance(v, str) and v.isdigit()]

    def _nearest_owner(self, sid):
        st = self.states[sid]
        best = None
        provs = [p for p in self._state_provinces(st) if p in self.prov_xy]
        if not provs:
            return None
        x0, y0 = self.prov_xy[provs[0]]
        for pid, tag in self.prov_tag.items():
            if not tag:
                continue
            x, y = self.prov_xy[pid]
            d = (x - x0) ** 2 + (y - y0) ** 2
            if best is None or d < best[0]:
                best = (d, tag)
        return best[1] if best else None

    def _centroid(self, sid):
        pts = [self.prov_ll[p] for p in self._state_provinces(self.states[sid]) if p in self.prov_ll]
        if not pts:
            return None
        return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)

    def _special_cores(self):
        for sid, owner in self.owner.items():
            c = self._centroid(sid)
            if not c:
                continue
            lon, lat = c
            if owner == "RUS" and in_box(lon, lat, CRIMEA_BOX) and lat < 46.15:
                self.cores[sid].add("UKR")
            if owner == "UKR" and any(in_box(lon, lat, b) for b in OBLASTS_CLAIMED):
                self.claims[sid].add("RUS")
            if owner == "ROC":
                self.cores[sid].add("PRC")
            if owner == "SML":
                self.cores[sid].add("SOM")
            if owner == "KOS":
                self.cores[sid].add("SER")
            if owner in ("HTS", "RJV"):
                self.cores[sid].add("SYR")
            if owner == "SYR":
                self.cores[sid].add("HTS")
            if owner == "RSF":
                self.cores[sid].add("SUD")
            if owner == "ADN":
                self.cores[sid].add("YEM")
            if owner == "YEM":
                self.cores[sid].add("ADN")
            if owner == "HAF":
                self.cores[sid].add("LBA")
            if owner == "LBA":
                self.cores[sid].add("HAF")
            if owner == "ISR" and 31.2 < lat < 32.6 and 34.2 < lon < 35.6:
                self.cores[sid].add("PAL")
            if owner == "ENG" and lat < -50 and lon < -55:
                self.claims[sid].add("ARG")
            if owner == "GUY" and lon < -58.4:
                self.claims[sid].add("VEN")
            if owner == "RUS" and 43.0 < lat < 46.5 and 145.0 < lon < 149.5:
                self.claims[sid].add("JAP")
            if owner in ("IND", "PAK") and 32.3 < lat < 37.0 and 73.0 < lon < 80.5:
                self.claims[sid].add("PAK" if owner == "IND" else "IND")
            if owner == "MOR" and lat < 27.7:
                self.cores[sid].discard("MOR")
                self.claims[sid].add("MOR")

    def _ensure_presence(self):
        """Countries whose land is smaller than one vanilla state still need a
        foothold: give each the state that contains its capital."""
        owned = set(self.owner.values())
        for c in COUNTRIES:
            if c.tag in owned or c.tag not in CAPITALS:
                continue
            city = CITIES.get(CAPITALS[c.tag])
            if not city:
                continue
            sid = self._state_at(city[1], city[0])
            if sid is None:
                continue
            prev = self.owner[sid]
            # never take a country's last state or its capital
            if list(self.owner.values()).count(prev) <= 1 or c.tag == "PAL":
                continue
            prev_city = CITIES.get(CAPITALS.get(prev, ""))
            if prev_city and self._state_at(prev_city[1], prev_city[0]) == sid:
                continue
            self.owner[sid] = c.tag
            self.cores[sid].add(c.tag)
            if c.tag in ("HTS", "RJV"):
                self.cores[sid].add(prev)
            self.report.append(f"{c.tag} given state {sid} ({self.state_name(sid)}) from {prev} so it exists")

    def _state_at(self, lon, lat):
        best = None
        for pid, (plon, plat) in self.prov_ll.items():
            d = (plon - lon) ** 2 + ((plat - lat) * 1.3) ** 2
            if best is None or d < best[0]:
                best = (d, pid)
        if not best:
            return None
        for sid, st in self.states.items():
            if best[1] in self._state_provinces(st):
                return sid
        return None

    def _capital(self, tag):
        city = CITIES.get(CAPITALS.get(tag, ""), None)
        mine = [sid for sid, o in self.owner.items() if o == tag]
        if city:
            sid = self._state_at(city[1], city[0])
            if sid in mine:
                return sid
        return max(mine, key=lambda s: int(get(self.states[s]["block"], "manpower", "0") or 0))

    def state_name(self, sid):
        return self.state_names.get(f"STATE_{sid}", f"state {sid}")

    # ------------------------------------------------------------- provider API
    def new_tags(self, tags):
        return {t for t in tags if t not in self.vanilla_tags}

    def capital(self, tag):
        return self.capitals.get(tag)

    def has_oob(self, tag):
        return tag in self.capitals

    def convoys(self, c):
        return {1: 400, 2: 120, 3: 30, 4: 5}[c.tier]

    def technologies(self, c):
        cutoff = {1: 1950, 2: 1946, 3: 1942, 4: 1939}[c.tier]
        nuclear = c.tag in ("USA", "RUS", "PRC", "ENG", "FRA", "IND", "PAK", "ISR", "PRK")
        chosen, blocked = [], set()
        for name, t in sorted(self.techs.items(), key=lambda kv: (kv[1]["year"], kv[0])):
            if t["doctrine"] or t["year"] > cutoff or name in blocked:
                continue
            if name in ("nukes", "nuclear_reactor") and not nuclear:
                continue
            chosen.append(name)
            blocked.update(t["xor"])
        return chosen

    def history_extra(self, c):
        out = []
        if c.tag == "USA":
            members = [x.tag for x in COUNTRIES if x.faction == "md_faction_nato" and x.tag != "USA" and x.tag in self.capitals]
            out.append("create_faction = md_faction_nato")
            out += [f"add_to_faction = {m}" for m in members]
        if c.tag == "RUS" and "UKR" in self.capitals:
            out.append("declare_war_on = { target = UKR type = annex_everything }")
        if c.tag == "SUD" and "RSF" in self.capitals:
            out.append("declare_war_on = { target = RSF type = annex_everything }")
        if c.tag == "BLR":
            out.append("give_military_access = RUS")
        return "\n".join(out)

    def startup_effect(self):
        lines = []
        by = defaultdict(list)
        for pid, ctrl in sorted(self.controller.items()):
            by[ctrl].append(pid)
        for ctrl, pids in by.items():
            body = " ".join(f"set_province_controller = {p}" for p in pids)
            lines.append(f"\t\t\tif = {{ limit = {{ country_exists = {ctrl} }} {ctrl} = {{ {body} }} }}")
        return "\n".join(lines)

    def scripted_effects(self):
        green = [sid for sid, o in self.owner.items() if o == "DEN" and (self._centroid(sid) or (0, 0))[1] > 59]
        body = "\n".join(f"\tif = {{ limit = {{ {sid} = {{ is_owned_by = DEN }} }} USA = {{ transfer_state = {sid} }} }}" for sid in green)
        return "md_cede_greenland = {\n" + (body or "\tcustom_effect_tooltip = md_tt_greenland") + "\n}\n"

    def localisation(self):
        loc = [("md_tt_greenland", "Greenland is transferred to the United States.")]
        return loc

    # ------------------------------------------------------------- writing
    def write(self, out):
        self._write_states(out)
        self._write_oobs(out)
        self._write_names(out)
        out.write("map_report.txt", "\n".join(self.report))

    def _write_names(self, out):
        loc = []
        for key, name in list(self.state_names.items()) + list(self.vp_names.items()):
            new = RENAMES.get(name)
            if new and new != name:
                loc.append((key, new))
        out.write("localisation/english/replace/md_place_names_l_english.yml", loc_file("english", loc), bom=True)

    def _write_states(self, out):
        econ = {}
        by_tag = defaultdict(list)
        for sid, tag in self.owner.items():
            by_tag[tag].append(sid)
        for tag, sids in by_tag.items():
            if tag not in ECO.ECON:
                continue
            e = ECO.ECON[tag]
            civ, mil, dock = ECO.factories(tag)
            weights = {}
            vanilla_pop = 0
            for sid in sids:
                b = self.states[sid]["block"]
                mp = int(get(b, "manpower", "0") or 0)
                vanilla_pop += mp
                hist = get(b, "history", [])
                bl = get(hist, "buildings", []) or []
                ind = sum(int(get(bl, k, "0") or 0) for k in ("industrial_complex", "arms_factory"))
                weights[sid] = 1 + ind * 3 + mp / 250000
            scale = e["pop"] / max(vanilla_pop, 1)
            civ_s = self._spread(civ, weights)
            mil_s = self._spread(mil, weights)
            coastal = [s for s in sids if self._coastal(s)]
            dock_s = self._spread(dock, {s: weights[s] for s in coastal}) if coastal else {}
            for sid in sids:
                econ[sid] = dict(pop=max(1000, int(int(get(self.states[sid]["block"], "manpower", "0") or 0) * scale)),
                                 civ=civ_s.get(sid, 0), mil=mil_s.get(sid, 0), dock=dock_s.get(sid, 0),
                                 infra=ECO.INFRA[e["income"]])
        for sid, st in self.states.items():
            if sid not in self.owner:
                continue
            out.write(f"history/states/{st['file']}", self._state_text(sid, st, econ.get(sid)))

    @staticmethod
    def _spread(total, weights):
        if not weights or total <= 0:
            return {}
        s = sum(weights.values())
        raw = {k: total * w / s for k, w in weights.items()}
        out = {k: int(v) for k, v in raw.items()}
        rest = total - sum(out.values())
        for k in sorted(raw, key=lambda k: raw[k] - out[k], reverse=True)[:rest]:
            out[k] += 1
        return out

    def _coastal(self, sid):
        return any(self.prov_type.get(n) == "sea" for p in self._state_provinces(self.states[sid]) for n in self.adj.get(p, ()))

    CATS = [("rural", 2), ("town", 4), ("large_town", 5), ("city", 6), ("large_city", 8), ("metropolis", 10), ("megalopolis", 12)]

    def _state_text(self, sid, st, e):
        b = st["block"]
        owner = self.owner[sid]
        lines = ["state = {", f"\tid = {sid}", f"\tname = {get(b, 'name')}"]
        pop = e["pop"] if e else int(get(b, "manpower", "0") or 0)
        lines.append(f"\tmanpower = {pop}")
        res = get(b, "resources")
        if isinstance(res, list) and res:
            lines.append("\tresources = {\n" + "\n".join(f"\t\t{k} = {v}" for k, _, v in res if k) + "\n\t}")
        cat = get(b, "state_category", "rural")
        slots_needed = (e["civ"] + e["mil"] + e["dock"]) if e else 0
        extra = 0
        if e and slots_needed > dict(self.CATS).get(cat, 0):
            for name, n in self.CATS:
                if n >= slots_needed:
                    cat = name
                    break
            else:
                cat, extra = "megalopolis", slots_needed - 12
        lines.append(f"\tstate_category = {cat}")
        if get(b, "impassable") == "yes":
            lines.append("\timpassable = yes")
        hist = get(b, "history", [])
        h = [f"\t\towner = {owner}"]
        vps = get_all(hist, "victory_points")
        for vp in vps:
            vals = [v for _, _, v in vp]
            if len(vals) >= 2:
                h.append(f"\t\tvictory_points = {{ {vals[0]} {vals[1]} }}")
        bl = get(hist, "buildings", []) or []
        bh = []
        if e:
            infra = max(e["infra"], int(get(bl, "infrastructure", "0") or 0))
            bh.append(f"\t\t\tinfrastructure = {min(5, infra)}")
            if e["civ"]:
                bh.append(f"\t\t\tindustrial_complex = {e['civ']}")
            if e["mil"]:
                bh.append(f"\t\t\tarms_factory = {e['mil']}")
        # keep every other building (air bases, supply hubs, refineries,
        # landmarks...) but drop 1930s forts and the factories we recompute
        dropped = {"infrastructure", "industrial_complex", "arms_factory", "dockyard", "bunker", "coastal_bunker", "nuclear_reactor"}
        dock_left = e["dock"] if e else 0
        for k, _, v in bl:
            if not k or k in dropped:
                continue
            if k.isdigit() and isinstance(v, list):
                inner = [(kk, vv) for kk, _, vv in v if kk and kk not in ("bunker", "coastal_bunker")]
                if inner:
                    bh.append(f"\t\t\t{k} = {{ " + " ".join(f"{kk} = {vv}" for kk, vv in inner) + " }")
            elif not isinstance(v, list):
                bh.append(f"\t\t\t{k} = {v}")
        if dock_left:
            if not any("naval_base" in line for line in bh):
                dock_left = dock_left if self._coastal(sid) else 0
            if dock_left:
                bh.append(f"\t\t\tdockyard = {dock_left}")
        if owner in ("USA", "RUS", "PRC", "ENG", "FRA", "IND", "PAK", "ISR", "PRK") and self.capitals.get(owner) == sid:
            bh.append("\t\t\tnuclear_reactor = 1")
        h.append("\t\tbuildings = {\n" + "\n".join(bh) + "\n\t\t}")
        for c in sorted(self.cores[sid]):
            h.append(f"\t\tadd_core_of = {c}")
        for c in sorted(self.claims[sid] - self.cores[sid]):
            h.append(f"\t\tadd_claim_by = {c}")
        if extra:
            h.append(f"\t\tadd_extra_state_shared_building_slots = {extra}")
        lines.append("\thistory = {\n" + "\n".join(h) + "\n\t}")
        provs = self._state_provinces(st)
        lines.append("\tprovinces = {\n\t\t" + " ".join(map(str, provs)) + "\n\t}")
        for key in ("local_supplies", "buildings_max_level_factor"):
            v = get(b, key)
            if v:
                lines.append(f"\t{key} = {v}")
        lines.append("}")
        return "\n".join(lines)

    # ------------------------------------------------------------- armies
    TEMPLATES = {
        "modern": [("Mechanized Brigade", ["mechanized"] * 4 + ["motorized_artillery_brigade"],
                    ["engineer", "recon", "anti_air", "artillery"]),
                   ("Motorized Infantry Brigade", ["motorized"] * 5 + ["motorized_artillery_brigade"],
                    ["engineer", "recon", "artillery"]),
                   ("Infantry Brigade", ["infantry"] * 6 + ["artillery_brigade"],
                    ["engineer", "recon", "artillery"])],
        "basic": [("Infantry Brigade", ["infantry"] * 6 + ["artillery_brigade"], ["engineer", "recon", "artillery"]),
                  ("Light Infantry", ["infantry"] * 5, ["engineer"])],
    }

    def _template_text(self, name, regs, sup):
        # one battalion type per column, at most five battalions a column
        rlines, x = [], 0
        for kind in dict.fromkeys(regs):
            n = regs.count(kind)
            for i in range(n):
                rlines.append(f"\t\t{kind} = {{ x = {x + i // 5} y = {i % 5} }}")
            x += (n + 4) // 5
        slines = [f"\t\t{s} = {{ x = 0 y = {i} }}" for i, s in enumerate(sup)]
        return (f"division_template = {{\n\tname = \"{name}\"\n\tregiments = {{\n" + "\n".join(rlines) +
                "\n\t}\n\tsupport = {\n" + "\n".join(slines) + "\n\t}\n}")

    def _write_oobs(self, out):
        for c in COUNTRIES:
            if c.tag not in self.capitals:
                continue
            kind = "modern" if c.tier <= 2 else "basic"
            temps = self.TEMPLATES[kind]
            n = ECO.divisions(c.tag, c.tier)
            spots = self._deploy_spots(c.tag)
            if not spots:
                continue
            exp = {1: 0.6, 2: 0.45, 3: 0.3, 4: 0.15}[c.tier]
            eq = {1: 1.0, 2: 0.9, 3: 0.75, 4: 0.55}[c.tier]
            if c.tag in ("UKR", "RUS"):
                exp = 0.7
            units = []
            for i in range(n):
                t = temps[0] if i % 3 == 0 else temps[1 % len(temps)] if i % 3 == 1 else temps[-1]
                loc = spots[i % len(spots)]
                units.append(f"\tdivision = {{\n\t\tname = \"{i + 1}. {t[0]}\"\n\t\tlocation = {loc}\n\t\tdivision_template = \"{t[0]}\"\n"
                             f"\t\tstart_experience_factor = {exp}\n\t\tstart_equipment_factor = {eq}\n\t}}")
            text = "\n".join(self._template_text(*t) for t in temps) + "\n\nunits = {\n" + "\n".join(units) + "\n}"
            text += ("\n\ninstant_effect = {\n"
                     f"\tadd_equipment_to_stockpile = {{ type = infantry_equipment amount = {n * 600} producer = {c.tag} }}\n"
                     f"\tadd_equipment_to_stockpile = {{ type = support_equipment amount = {n * 60} producer = {c.tag} }}\n"
                     f"\tadd_equipment_to_stockpile = {{ type = artillery_equipment amount = {n * 40} producer = {c.tag} }}\n}}")
            out.write(f"history/units/MD_{c.tag}_2024.txt", text)

    def _deploy_spots(self, tag):
        """Provinces to station divisions in: the front first, then VPs."""
        spots = []
        if tag in ("RUS", "UKR"):
            enemy = "UKR" if tag == "RUS" else "RUS"
            for pid, ll in self.prov_ll.items():
                if self.prov_type.get(pid) != "land":
                    continue
                ctrl = self.controller.get(pid, self.prov_tag.get(pid))
                if ctrl != tag:
                    continue
                if any(self.controller.get(n, self.prov_tag.get(n)) == enemy for n in self.adj.get(pid, ())):
                    spots.append(pid)
        vps = []
        for sid, o in self.owner.items():
            if o != tag:
                continue
            hist = get(self.states[sid]["block"], "history", [])
            for vp in get_all(hist, "victory_points"):
                vals = [v for _, _, v in vp]
                if len(vals) >= 2 and vals[0].isdigit():
                    pid = int(vals[0])
                    if self.controller.get(pid, tag) == tag:
                        vps.append((float(vals[1]), pid))
        vps.sort(reverse=True)
        spots += [p for _, p in vps[:12]]
        if not spots:
            sid = self.capitals.get(tag)
            if sid:
                provs = [p for p in self._state_provinces(self.states[sid]) if self.prov_type.get(p) == "land"]
                spots = provs[:1]
        return spots
