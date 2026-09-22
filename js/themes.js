/* ------------------------------------------------------------------
   themes.js — the eight course worlds.

   The original grouped its twenty courses into eight themed families
   that shared a tileset, a horizon and a hazard set; only Rainbow Road
   got a family to itself.  Each theme here supplies:

     surfAt(t,u)   which surface a texel is, from its position across
                   the road (u: 0 centre, 1 edge, >1 shoulder/beyond)
     roadAt(...)   the texel colour on and just off the road
     groundAt(...) the texel colour for everything further out
     sky()         a 1440px panorama (one full camera turn)
     warp          optional per-scanline HDMA-style horizontal offset

   Colours are picked to sit on the SNES lattice and to keep the road
   clearly separated from the run-off at a glance, which matters a lot
   when the road is only seventy scanlines tall.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  /* ---- surface ids, shared with physics ---- */
  var SURF = SMK.SURF = {
    VOID: 0,      /* nothing there — you fall                  */
    ROAD: 1,      /* full grip, full speed                     */
    OFFROAD: 2,   /* grass / sand / snow — noticeable drag     */
    SLOW: 3,      /* mud / deep sand / chocolate — heavy drag  */
    WALL: 4,      /* solid — bounce off                        */
    BOOST: 5,     /* dash panel                                */
    OIL: 6,       /* oil slick — spin out                      */
    WATER: 7,     /* shallow water — drag plus a splash        */
    JUMP: 8,      /* ramp — launches the kart                  */
    LAVA: 9,      /* instant wipe-out                          */
    ICE: 10,      /* very low grip                             */
    START: 11     /* start / finish line, behaves as road      */
  };

  SMK.SURF_SOLID = {};
  SMK.SURF_SOLID[SURF.WALL] = true;

  /* road-like surfaces: no drag penalty */
  SMK.SURF_FAST = {};
  SMK.SURF_FAST[SURF.ROAD] = true;
  SMK.SURF_FAST[SURF.START] = true;
  SMK.SURF_FAST[SURF.BOOST] = true;
  SMK.SURF_FAST[SURF.OIL] = true;
  SMK.SURF_FAST[SURF.JUMP] = true;
  SMK.SURF_FAST[SURF.ICE] = true;

  var PAL = SMK.PAL;
  var U = SMK.u32;

  /* ---- panorama helper -------------------------------------------
     A sky is a 1440 x 72 strip: 1440px is exactly one 360-degree turn
     at the game's 64-degree horizontal field of view, so the horizon
     tracks the camera at the right rate instead of sliding.          */
  var SKY_W = 1440, SKY_H = 72;

  function skyBuf() { return new SMK.PixelBuf(SKY_W, SKY_H); }

  /* vertical gradient, banded so it reads as 16-bit dithering */
  function skyGradient(b, top, bottom, bands) {
    bands = bands || 10;
    for (var y = 0; y < SKY_H; y++) {
      var t = y / (SKY_H - 1);
      var q = Math.floor(t * bands) / (bands - 1);
      if (q > 1) q = 1;
      b.hline(0, y, SKY_W, SMK.mix(top, bottom, q));
    }
    return b;
  }

  /* soft lumpy cloud built from overlapping ellipses */
  function cloud(b, cx, cy, w, h, col, colShade) {
    var lobes = 5;
    for (var i = 0; i < lobes; i++) {
      var f = i / (lobes - 1);
      var lx = cx + (f - 0.5) * w;
      var ly = cy - Math.sin(f * Math.PI) * h * 0.45;
      var lr = w * (0.16 + 0.10 * Math.sin(f * Math.PI));
      b.ellipse(lx, ly, lr, lr * 0.62 + h * 0.18, col);
    }
    b.ellipse(cx, cy + h * 0.22, w * 0.46, h * 0.26, colShade || col);
  }

  /* ridge line of hills; `seed` keeps them identical between bakes */
  function hills(b, baseY, amp, colFar, colNear, seed) {
    var rnd = SMK.rng(seed);
    var peaks = [];
    for (var i = 0; i < 26; i++) peaks.push(rnd());
    for (var x = 0; x < SKY_W; x++) {
      var u = x / SKY_W * peaks.length;
      var i0 = Math.floor(u) % peaks.length;
      var i1 = (i0 + 1) % peaks.length;
      var f = SMK.smoothstep(u - Math.floor(u));
      var hv = peaks[i0] + (peaks[i1] - peaks[i0]) * f;
      var top = Math.round(baseY - hv * amp);
      b.vline(x, top, SKY_H - top, colNear);
      b.px(x, top, colFar);
    }
    return b;
  }

  function starfield(b, count, seed) {
    var rnd = SMK.rng(seed);
    for (var i = 0; i < count; i++) {
      var x = Math.floor(rnd() * SKY_W), y = Math.floor(rnd() * SKY_H);
      var v = rnd();
      var c = v > 0.88 ? PAL.white : (v > 0.6 ? '#b0b0d8' : '#6868a0');
      b.px(x, y, c);
      if (v > 0.95) { b.px(x - 1, y, '#8080b0'); b.px(x + 1, y, '#8080b0'); }
    }
    return b;
  }

  /* ------------------------------------------------------------------
     THEMES
     ------------------------------------------------------------------ */

  var THEMES = {};

  /* ---------------- 1. Mario Circuit ---------------- */
  THEMES.circuit = {
    id: 'circuit', name: 'MARIO CIRCUIT',
    music: 'circuit',
    voidColor: U('#38a028'),
    fog: 0.10, fogColor: U('#b8d8f8'),
    mapRoad: '#b0b0b8', mapGround: '#309020',
    objects: ['pipe', 'oil'],
    scenery: [{ type: 'tree', spacing: 96, u: 1.68, alternate: true, jitter: 14 },
              { type: 'fence', spacing: 74, u: 1.44, both: true, skipNear: true }],
    /* tarmac, a white edge line, then a strip of kerb before the grass */
    surfAt: function (t, u) {
      var a = Math.abs(u);
      if (a <= 1.0) return SURF.ROAD;
      if (a <= 1.18) return SURF.ROAD;         /* painted edge is still road */
      return SURF.OFFROAD;
    },
    roadAt: function (t, u, px, py, n, nc) {
      var a = Math.abs(u);
      if (a > 1.06 && a <= 1.18) {
        /* red/white kerb, striped along the track */
        return (Math.floor(t * 0.22) & 1) ? U('#f83030') : U('#f8f8f8');
      }
      if (a > 1.00) return U('#e8e8f0');       /* white edge line */
      /* asphalt with faint aggregate */
      var g = 120 + ((n >> 5) - 4) * 4;
      return SMK.pack(g, g, g + 10);
    },
    groundAt: function (px, py, n, nc) {
      if (nc < 70) {                            /* darker turf patches */
        var d = 96 + (n >> 5);
        return SMK.pack(40 + (n >> 6), d, 32);
      }
      var g = 150 + ((n >> 4) - 8) * 2;
      return SMK.pack(48 + (n >> 6) * 2, g, 36);
    },
    sky: function () {
      var b = skyGradient(skyBuf(), '#58a8f8', '#c8e8ff', 9);
      for (var i = 0; i < 9; i++) {
        var x = (i * 167 + 40) % SKY_W;
        cloud(b, x, 16 + (i % 3) * 9, 62 + (i % 4) * 16, 12, PAL.white, '#d8e8f8');
      }
      hills(b, SKY_H - 6, 16, '#78d060', '#189828', 1337);
      hills(b, SKY_H - 2, 8, '#58b848', '#107818', 99);
      return b;
    }
  };

  /* ---------------- 2. Donut Plains ---------------- */
  THEMES.plains = {
    id: 'plains', name: 'DONUT PLAINS',
    music: 'plains',
    voidColor: U('#289018'),
    fog: 0.09, fogColor: U('#c0e0f8'),
    mapRoad: '#a8a898', mapGround: '#288818',
    objects: ['mole', 'oil'],
    scenery: [{ type: 'tree', spacing: 84, u: 1.76, alternate: true, jitter: 18 },
              { type: 'fence', spacing: 80, u: 1.56, both: true }],
    surfAt: function (t, u) {
      var a = Math.abs(u);
      if (a <= 1.10) return SURF.ROAD;
      if (a <= 1.34) return SURF.OFFROAD;
      return SURF.OFFROAD;
    },
    roadAt: function (t, u, px, py, n, nc) {
      var a = Math.abs(u);
      if (a > 1.10) {                           /* dirt shoulder */
        var d = 130 + (n >> 4);
        return SMK.pack(d, d - 34, 76);
      }
      if (a > 1.02) return U('#f0f0e0');
      var g = 126 + ((n >> 5) - 4) * 5;
      return SMK.pack(g + 4, g, g - 8);
    },
    groundAt: function (px, py, n, nc) {
      /* the "donuts": dark ponds punched through the meadow */
      if (nc > 196) {
        var w = 70 + (n >> 4);
        return SMK.pack(30, w - 10, 70);
      }
      if (nc < 64) return SMK.pack(36, 104 + (n >> 5), 28);
      var g = 158 + ((n >> 4) - 8) * 2;
      return SMK.pack(56 + (n >> 6) * 2, g, 40);
    },
    sky: function () {
      var b = skyGradient(skyBuf(), '#48a0f0', '#d0ecff', 9);
      for (var i = 0; i < 11; i++)
        cloud(b, (i * 131 + 70) % SKY_W, 12 + (i % 4) * 11, 54 + (i % 3) * 22, 14, PAL.white, '#d0e4f8');
      hills(b, SKY_H - 4, 20, '#88d868', '#289020', 7);
      return b;
    }
  };

  /* ---------------- 3. Ghost Valley ---------------- */
  THEMES.ghost = {
    id: 'ghost', name: 'GHOST VALLEY',
    music: 'ghost',
    voidBeyond: true,
    voidColor: U('#180c28'),
    fog: 0.22, fogColor: U('#382058'),
    mapRoad: '#c0a070', mapGround: '#1a0e28',
    objects: ['boo', 'rail'],
    scenery: [{ type: 'lantern', spacing: 96, u: 1.16, both: true }],
    /* a plank causeway with nothing at all beside it */
    surfAt: function (t, u) {
      var a = Math.abs(u);
      if (a <= 1.0) return SURF.ROAD;
      /* the rail has to be thick enough that a kart at full speed
         cannot cross it between two collision probes */
      if (a <= 1.24) return SURF.WALL;
      return SURF.VOID;
    },
    roadAt: function (t, u, px, py, n, nc) {
      var a = Math.abs(u);
      if (a > 1.0) return U('#503020');
      /* planks run across the road, with a seam every eight units */
      var plank = Math.floor(t * 0.125) & 3;
      var base = [148, 138, 156, 132][plank];
      if ((Math.floor(t * 0.125) !== Math.floor((t - 1) * 0.125))) base -= 30;
      var v = base + ((n >> 5) - 4) * 4;
      return SMK.pack(v, v * 0.70, v * 0.40);
    },
    groundAt: function () { return 0; },        /* void */
    sky: function () {
      var b = skyGradient(skyBuf(), '#100820', '#402058', 8);
      starfield(b, 260, 4242);
      hills(b, SKY_H - 2, 22, '#503070', '#1c1030', 21);
      /* a sickly moon */
      b.ellipse(360, 18, 9, 9, '#d8d0b0');
      b.ellipse(363, 16, 6, 6, '#f0e8c8');
      return b;
    },
    warp: function (row, depth, t) {            /* slow ghostly sway */
      return Math.sin(t * 1.1 + row * 0.07) * 1.8;
    }
  };

  /* ---------------- 4. Bowser Castle ---------------- */
  THEMES.castle = {
    id: 'castle', name: 'BOWSER CASTLE',
    music: 'castle',
    voidColor: U('#200c08'),
    fog: 0.18, fogColor: U('#582018'),
    mapRoad: '#807878', mapGround: '#301818',
    objects: ['thwomp', 'firebar'],
    scenery: [{ type: 'torch', spacing: 78, u: 1.22, both: true }],
    surfAt: function (t, u) {
      var a = Math.abs(u);
      if (a <= 1.0) return SURF.ROAD;
      if (a <= 1.30) return SURF.WALL;
      return SURF.LAVA;
    },
    roadAt: function (t, u, px, py, n, nc) {
      var a = Math.abs(u);
      if (a > 1.0) {
        /* battlement wall: alternating blocks with a lit coping course */
        var lit = a < 1.08;
        var blk = (Math.floor(t * 0.09) & 1);
        if (lit) return blk ? U('#786c78') : U('#605460');
        return blk ? U('#504850') : U('#383038');
      }
      /* flagstones: a grid of mortar lines in track space */
      var bx = Math.floor(t * 0.0625) & 1;
      var by = Math.floor((u + 1) * 8) & 1;
      var seam = (Math.abs(((t * 0.0625) % 1) - 0.5) > 0.44) || (Math.abs((((u + 1) * 8) % 1) - 0.5) > 0.42);
      var v = (bx ^ by) ? 116 : 104;
      v += ((n >> 5) - 4) * 4;
      if (seam) v -= 26;
      return SMK.pack(v, v - 8, v - 6);
    },
    groundAt: function (px, py, n, nc) {
      /* molten rock, brighter where the crust has cracked */
      var hot = nc > 150 ? 1 : 0;
      if (hot) {
        var r = 220 + (n >> 5) * 4;
        return SMK.pack(r, 90 + (n >> 4), 16);
      }
      var d = 120 + (n >> 4);
      return SMK.pack(d, 40 + (n >> 6), 20);
    },
    sky: function () {
      var b = skyGradient(skyBuf(), '#180808', '#902810', 9);
      starfield(b, 70, 777);
      hills(b, SKY_H - 6, 26, '#603028', '#200c10', 55);
      hills(b, SKY_H - 1, 12, '#401818', '#100608', 56);
      return b;
    },
    warp: function (row, depth, t) {            /* heat shimmer */
      return Math.sin(t * 6.0 + row * 0.55) * 1.1;
    }
  };

  /* ---------------- 5. Koopa Beach ---------------- */
  THEMES.beach = {
    id: 'beach', name: 'KOOPA BEACH',
    music: 'beach',
    voidColor: U('#1868c0'),
    fog: 0.10, fogColor: U('#a8e0f8'),
    mapRoad: '#f0d890', mapGround: '#3898e0',
    objects: ['cheep'],
    scenery: [{ type: 'palm', spacing: 118, u: 1.90, alternate: true, jitter: 22 },
              { type: 'rock', spacing: 140, u: 1.72, alternate: true, jitter: 30 }],
    surfAt: function (t, u) {
      var a = Math.abs(u);
      if (a <= 1.0) return SURF.ROAD;
      if (a <= 1.45) return SURF.WATER;        /* wadeable shallows */
      return SURF.WATER;
    },
    roadAt: function (t, u, px, py, n, nc) {
      var a = Math.abs(u);
      if (a > 1.0) {
        /* shallows: banded so the waterline reads at speed */
        var band = Math.floor(a * 14) & 1;
        var bb = band ? 232 : 208;
        return SMK.pack(96 + (n >> 5) * 3, 190, bb);
      }
      var s = 216 + ((n >> 4) - 8) * 2;
      return SMK.pack(s, s - 34, 150 + (n >> 6) * 4);
    },
    groundAt: function (px, py, n, nc) {
      var band = (nc >> 5) & 1;
      var g = band ? 128 : 112;
      return SMK.pack(24 + (n >> 6) * 3, g, 208 + ((n >> 5) - 4) * 4);
    },
    sky: function () {
      var b = skyGradient(skyBuf(), '#2890f0', '#b8ecff', 10);
      for (var i = 0; i < 7; i++)
        cloud(b, (i * 199 + 100) % SKY_W, 14 + (i % 3) * 8, 70, 12, PAL.white, '#d8f0ff');
      /* flat ocean horizon rather than hills */
      b.rect(0, SKY_H - 5, SKY_W, 5, '#1878d0');
      b.hline(0, SKY_H - 5, SKY_W, '#58b8f8');
      return b;
    }
  };

  /* ---------------- 6. Choco Island ---------------- */
  THEMES.choco = {
    id: 'choco', name: 'CHOCO ISLAND',
    music: 'choco',
    voidColor: U('#48280c'),
    fog: 0.12, fogColor: U('#c09060'),
    mapRoad: '#b08048', mapGround: '#4c2810',
    objects: ['puddle'],
    scenery: [{ type: 'cactus', spacing: 104, u: 1.46, alternate: true, jitter: 20 },
              { type: 'rock', spacing: 78, u: 1.30, alternate: true, jitter: 16 }],
    surfAt: function (t, u) {
      var a = Math.abs(u);
      if (a <= 1.05) return SURF.ROAD;
      return SURF.SLOW;
    },
    roadAt: function (t, u, px, py, n, nc) {
      var a = Math.abs(u);
      if (a > 1.05) { var m = 88 + (n >> 4); return SMK.pack(m, m - 38, 30); }
      var v = 172 + ((n >> 4) - 8) * 3;
      return SMK.pack(v, v - 48, 70 + (n >> 6) * 3);
    },
    groundAt: function (px, py, n, nc) {
      if (nc > 178) { var p = 60 + (n >> 5); return SMK.pack(p, p - 26, 18); }
      var d = 108 + ((n >> 4) - 8) * 2;
      return SMK.pack(d, d - 42, 26);
    },
    sky: function () {
      var b = skyGradient(skyBuf(), '#c86818', '#f8c878', 9);
      for (var i = 0; i < 6; i++)
        cloud(b, (i * 233 + 60) % SKY_W, 16 + (i % 3) * 7, 66, 11, '#f8e0b8', '#d8a870');
      hills(b, SKY_H - 4, 18, '#a86830', '#json', 13);
      return b;
    }
  };

  /* ---------------- 7. Vanilla Lake ---------------- */
  THEMES.vanilla = {
    id: 'vanilla', name: 'VANILLA LAKE',
    music: 'vanilla',
    voidBeyond: true,
    stampU: 2.15,
    voidColor: U('#3060a8'),
    fog: 0.14, fogColor: U('#d8e8f8'),
    mapRoad: '#e0f0f8', mapGround: '#3060a8',
    objects: ['iceblock'],
    scenery: [{ type: 'pine', spacing: 92, u: 1.52, alternate: true, jitter: 16 }],
    surfAt: function (t, u) {
      var a = Math.abs(u);
      if (a <= 1.0) return SURF.ICE;
      /* A wide snow bank: on ice you need somewhere to be wrong, and a
         narrow one means a single slide puts you through the ice. */
      if (a <= 2.05) return SURF.OFFROAD;
      return SURF.VOID;                        /* a hole in the ice */
    },
    roadAt: function (t, u, px, py, n, nc) {
      var a = Math.abs(u);
      /* the swept ice is distinctly bluer than the snow piled beside it,
         with a hard rim between them — otherwise the road disappears */
      if (a > 1.06) {
        /* snow, with drifts piling up further from the swept ice */
        var deep = SMK.clamp((a - 1.06) / 0.9, 0, 1);
        var snow = 240 + ((n >> 5) - 4) - Math.round(deep * 26);
        return SMK.pack(snow, snow + 2, 255);
      }
      if (a > 1.00) return U('#6890c0');       /* rim of the cleared ice */
      var v = 150 + ((n >> 4) - 8) * 3;
      /* faint swept streaks along the direction of travel */
      if ((Math.floor(t * 0.08) & 3) === 0) v += 14;
      return SMK.pack(v + 18, v + 40, 248);
    },
    groundAt: function (px, py, n, nc) {
      var band = (nc >> 6) & 1;
      return SMK.pack(28 + (n >> 6) * 2, band ? 92 : 78, 160 + ((n >> 5) - 4) * 3);
    },
    sky: function () {
      var b = skyGradient(skyBuf(), '#6890d8', '#e0f0ff', 10);
      for (var i = 0; i < 8; i++)
        cloud(b, (i * 179 + 30) % SKY_W, 13 + (i % 3) * 9, 74, 13, PAL.white, '#d0dcf0');
      hills(b, SKY_H - 5, 22, '#ffffff', '#a8c0e0', 31);
      return b;
    }
  };

  /* ---------------- 8. Rainbow Road ---------------- */
  THEMES.rainbow = {
    id: 'rainbow', name: 'RAINBOW ROAD',
    music: 'rainbow',
    voidBeyond: true,
    voidColor: U('#000000'),
    fog: 0.0,
    mapRoad: '#f0f0f8', mapGround: '#000000',
    objects: ['thwomp'],
    surfAt: function (t, u) {
      var a = Math.abs(u);
      if (a <= 1.0) return SURF.ROAD;
      return SURF.VOID;
    },
    roadAt: function (t, u, px, py, n, nc) {
      /* bands of colour running across the road, cycling along it */
      var bands = ['#f80000', '#f87800', '#f8f800', '#00c800',
                   '#0068f8', '#4800c8', '#c800c8'];
      var i = Math.floor(t * 0.0833) % bands.length;
      if (i < 0) i += bands.length;
      var c = bands[i];
      var a = Math.abs(u);
      if (a > 0.90) return SMK.u32(SMK.shade(c, -0.40));   /* darker rim */
      if (a < 0.10) return SMK.u32(SMK.shade(c, 0.28));    /* centre sheen */
      return SMK.u32(c);
    },
    groundAt: function () { return 0; },
    sky: function () {
      var b = skyBuf();
      b.clear(SMK.u32('#000008'));
      starfield(b, 420, 2024);
      return b;
    },
    warp: function (row, depth, t) {
      return Math.sin(t * 0.8 + row * 0.045) * 2.6;
    }
  };

  /* Choco Island's far ridge had a typo'd colour; fix it in one place */
  THEMES.choco.sky = function () {
    var b = skyGradient(skyBuf(), '#c86818', '#f8c878', 9);
    for (var i = 0; i < 6; i++)
      cloud(b, (i * 233 + 60) % SKY_W, 16 + (i % 3) * 7, 66, 11, '#f8e0b8', '#d8a870');
    hills(b, SKY_H - 4, 18, '#c88848', '#703818', 13);
    return b;
  };

  /* bake each theme's panorama once, on first use */
  var skyCache = {};
  SMK.themeSky = function (theme) {
    var s = skyCache[theme.id];
    if (!s) {
      var buf = theme.sky();
      s = skyCache[theme.id] = { data: buf.data, w: buf.w, h: buf.h };
    }
    return s;
  };

  SMK.themes = THEMES;
  SMK.SKY_W = SKY_W;
  SMK.SKY_H = SKY_H;

})(window.SMK);
