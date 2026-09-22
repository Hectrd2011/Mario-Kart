/* ------------------------------------------------------------------
   trackgen.js — turns a course definition into a Mode 7 track.

   A course is authored as a closed Catmull-Rom loop of control points
   plus a road width, a theme and a list of patches (dash panels, oil,
   ramps, the start line).  This module bakes that into:

     texture    1024x1024 packed-ABGR ground, with colour 0 meaning void
     surface    1024x1024 surface ids for the physics
     mips       the pyramid the Mode 7 renderer samples
     nodes      a coarse centreline for AI racing lines and lap progress
     checkpoints ordered gates that validate a lap and rank the field
     map        a small course map for the bottom half of the screen

   The road is stamped by walking the centreline in its own (along,
   across) parameter space rather than by scan-converting polygons.
   That visits almost exactly the texels the road covers, and it hands
   every theme a clean (t, u) pair — which is what lets kerbs stripe,
   planks run across the boards and Rainbow Road band correctly.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var SIZE = 1024;
  var DENSE_STEP = 0.7;      /* centreline spacing while stamping */
  var NODE_STEP = 11;        /* spacing of AI / progress nodes    */
  var CHECKPOINTS = 32;

  /* ---- noise tiles, shared by every bake ---- */
  var noiseFine = null, noiseCoarse = null;
  function initNoise() {
    if (noiseFine) return;
    noiseFine = new Uint8Array(256 * 256);
    noiseCoarse = new Uint8Array(256 * 256);
    var f = SMK.makeFbm(20240921, 3, 0.55);
    var c = SMK.makeFbm(778899, 2, 0.6);
    for (var y = 0; y < 256; y++) {
      for (var x = 0; x < 256; x++) {
        noiseFine[y * 256 + x] = Math.floor(SMK.clamp(f(x * 0.19, y * 0.19), 0, 0.999) * 256);
        noiseCoarse[y * 256 + x] = Math.floor(SMK.clamp(c(x * 0.045, y * 0.045), 0, 0.999) * 256);
      }
    }
  }

  /* ---- Catmull-Rom through a closed loop of control points ---- */
  function splineSample(pts, i, s) {
    var n = pts.length;
    var p0 = pts[(i - 1 + n) % n], p1 = pts[i % n];
    var p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    var s2 = s * s, s3 = s2 * s;
    return [
      0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * s +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3),
      0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * s +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3)
    ];
  }

  /* dense arc-length parameterised polyline around the loop */
  function resample(pts, step) {
    var raw = [], i, s;
    var SUB = 48;
    for (i = 0; i < pts.length; i++)
      for (s = 0; s < SUB; s++) raw.push(splineSample(pts, i, s / SUB));
    raw.push(raw[0].slice());

    /* cumulative length */
    var cum = [0];
    for (i = 1; i < raw.length; i++)
      cum.push(cum[i - 1] + SMK.dist(raw[i - 1][0], raw[i - 1][1], raw[i][0], raw[i][1]));
    var total = cum[cum.length - 1];

    var out = [], seg = 0;
    for (var d = 0; d < total; d += step) {
      while (seg < cum.length - 2 && cum[seg + 1] < d) seg++;
      var f = (d - cum[seg]) / Math.max(1e-6, cum[seg + 1] - cum[seg]);
      out.push([
        raw[seg][0] + (raw[seg + 1][0] - raw[seg][0]) * f,
        raw[seg][1] + (raw[seg + 1][1] - raw[seg][1]) * f
      ]);
    }
    return { pts: out, total: total };
  }

  /* attach tangents, normals and arc length to a polyline */
  function frame(poly, total) {
    var n = poly.length, out = new Array(n);
    for (var i = 0; i < n; i++) {
      var a = poly[(i - 1 + n) % n], b = poly[(i + 1) % n];
      var tx = b[0] - a[0], ty = b[1] - a[1];
      var L = Math.sqrt(tx * tx + ty * ty) || 1;
      tx /= L; ty /= L;
      out[i] = {
        x: poly[i][0], y: poly[i][1],
        tx: tx, ty: ty,
        nx: -ty, ny: tx,               /* left-hand normal */
        s: (i / n) * total,            /* arc length along the lap */
        t: i / n                       /* 0..1 lap parameter      */
      };
    }
    return out;
  }

  /* road half-width at lap parameter t, from an optional profile */
  function widthAt(course, t) {
    var w = course.width;
    var p = course.widthProfile;
    if (!p || !p.length) return w;
    /* piecewise linear, wrapping at 1 */
    for (var i = 0; i < p.length; i++) {
      var a = p[i], b = p[(i + 1) % p.length];
      var t0 = a[0], t1 = b[0];
      if (t1 < t0) t1 += 1;
      var tt = t < t0 ? t + 1 : t;
      if (tt >= t0 && tt <= t1) {
        var f = (tt - t0) / Math.max(1e-6, t1 - t0);
        return SMK.lerp(a[1], b[1], SMK.smoothstep(f));
      }
    }
    return w;
  }

  /* ------------------------------------------------------------------ */
  SMK.buildTrack = function (course) {
    initNoise();
    var theme = SMK.themes[course.theme];
    var tex = new Uint32Array(SIZE * SIZE);
    var surf = new Uint8Array(SIZE * SIZE);

    /* ---- 1. the ground everywhere ---- */
    var beyondSurf = theme.surfAt(0, 9);
    var groundIsVoid = theme.groundAt(0, 0, 128, 128) === 0;
    for (var y = 0; y < SIZE; y++) {
      var row = y * SIZE, ny = (y & 255) << 8;
      for (var x = 0; x < SIZE; x++) {
        var ni = ny | (x & 255);
        var c = groundIsVoid ? 0 : theme.groundAt(x, y, noiseFine[ni], noiseCoarse[ni]);
        tex[row + x] = c;
        surf[row + x] = groundIsVoid ? SMK.SURF.VOID : beyondSurf;
      }
    }

    /* ---- 2. centreline ---- */
    var rs = resample(course.path, DENSE_STEP);
    var dense = frame(rs.pts, rs.total);
    var total = rs.total;

    /* ---- 3. stamp the road in (along, across) space ---- */
    var uMax = theme.id === 'beach' ? 1.55 : 1.42;
    for (var i = 0; i < dense.length; i++) {
      var p = dense[i];
      var hw = widthAt(course, p.t);
      var span = hw * uMax;
      var du = 0.62;
      for (var off = -span; off <= span; off += du) {
        var wx = p.x + p.nx * off, wy = p.y + p.ny * off;
        var ix = wx | 0, iy = wy | 0;
        if (ix < 0 || iy < 0 || ix >= SIZE || iy >= SIZE) continue;
        var u = off / hw;
        var idx = iy * SIZE + ix;
        var nidx = ((iy & 255) << 8) | (ix & 255);
        var s = theme.surfAt(p.s, u);
        tex[idx] = theme.roadAt(p.s, u, ix, iy, noiseFine[nidx], noiseCoarse[nidx]);
        surf[idx] = s;
      }
    }

    /* ---- 4. coarse nodes for AI and lap progress ---- */
    var nodeEvery = Math.max(1, Math.round(NODE_STEP / DENSE_STEP));
    var nodes = [];
    for (i = 0; i < dense.length; i += nodeEvery) {
      var d = dense[i];
      nodes.push({
        x: d.x, y: d.y, tx: d.tx, ty: d.ty, nx: d.nx, ny: d.ny,
        s: d.s, t: d.t, hw: widthAt(course, d.t), index: nodes.length
      });
    }
    /* curvature, so the AI knows when to slow down and where to aim */
    for (i = 0; i < nodes.length; i++) {
      var a = nodes[(i - 2 + nodes.length) % nodes.length];
      var b = nodes[i];
      var c2 = nodes[(i + 2) % nodes.length];
      var ang1 = Math.atan2(b.y - a.y, b.x - a.x);
      var ang2 = Math.atan2(c2.y - b.y, c2.x - b.x);
      b.curve = SMK.wrapAngle(ang2 - ang1);
    }
    /* a smoothed racing line: cut toward the inside of each corner */
    for (i = 0; i < nodes.length; i++) {
      var look = 0;
      for (var k = -3; k <= 6; k++) look += nodes[(i + k + nodes.length) % nodes.length].curve;
      nodes[i].lineU = SMK.clamp(-look * 1.35, -0.62, 0.62);
    }

    /* ---- 5. patches: dash panels, oil, ramps, the start line ---- */
    var track = {
      size: SIZE, texture: tex, surface: surf, wrap: false,
      voidColor: theme.voidColor,
      theme: theme, course: course,
      nodes: nodes, length: total,
      laps: course.laps || 5
    };

    stampStartLine(track, course);
    if (course.patches) {
      for (i = 0; i < course.patches.length; i++) stampPatch(track, course.patches[i]);
    }

    /* ---- 6. checkpoints ---- */
    track.checkpoints = [];
    for (i = 0; i < CHECKPOINTS; i++) {
      var t = (course.startAt || 0) + i / CHECKPOINTS;
      var nd = nodeAtT(track, t);
      track.checkpoints.push({ x: nd.x, y: nd.y, tx: nd.tx, ty: nd.ty, s: nd.s, index: i });
    }

    /* ---- 7. grid slots and start orientation ---- */
    var sn = nodeAtT(track, course.startAt || 0);
    track.startNode = sn;
    track.startAngle = Math.atan2(sn.ty, sn.tx);
    track.startS = sn.s;

    /* ---- 8. course map for the lower half of the screen ---- */
    track.map = buildMap(track);

    /* ---- 9. mips for the renderer ---- */
    track.mips = SMK.buildMips(tex, SIZE);

    return track;
  };

  /* ------------------------------------------------------------------
     A cheap preview: nodes, length and course map only, skipping the
     million-texel texture and surface bake.  The course-select screen
     uses this so stepping through twenty courses stays instant.
     ------------------------------------------------------------------ */
  SMK.buildTrackPreview = function (course) {
    var theme = SMK.themes[course.theme];
    var rs = resample(course.path, NODE_STEP);
    var dense = frame(rs.pts, rs.total);
    var nodes = [];
    for (var i = 0; i < dense.length; i++) {
      var d = dense[i];
      nodes.push({
        x: d.x, y: d.y, tx: d.tx, ty: d.ty, nx: d.nx, ny: d.ny,
        s: d.s, t: d.t, hw: widthAt(course, d.t), index: i
      });
    }
    var track = {
      size: SIZE, theme: theme, course: course,
      nodes: nodes, length: rs.total,
      laps: course.laps || 5,
      startNode: nodes[Math.round((course.startAt || 0) * nodes.length) % nodes.length],
      preview: true
    };
    track.map = buildMap(track);
    return track;
  };

  function nodeAtT(track, t) {
    t = t - Math.floor(t);
    var n = track.nodes.length;
    var i = Math.round(t * n) % n;
    return track.nodes[i];
  }
  SMK.nodeAtT = nodeAtT;

  /* ---- start / finish: a checkered band right across the road ---- */
  function stampStartLine(track, course) {
    var theme = track.theme, tex = track.texture, surf = track.surface;
    var t0 = course.startAt || 0;
    var nd = nodeAtT(track, t0);
    var hw = nd.hw;
    var white = SMK.u32('#f8f8f8'), black = SMK.u32('#181820');
    var depth = 9;
    for (var d = -depth; d <= depth; d++) {
      for (var off = -hw * 1.02; off <= hw * 1.02; off += 0.55) {
        var wx = nd.x + nd.tx * d + nd.nx * off;
        var wy = nd.y + nd.ty * d + nd.ny * off;
        var ix = wx | 0, iy = wy | 0;
        if (ix < 0 || iy < 0 || ix >= track.size || iy >= track.size) continue;
        var cell = ((Math.floor((d + depth) / 4.5) + Math.floor((off + hw) / 5.5)) & 1);
        var idx = iy * track.size + ix;
        tex[idx] = cell ? white : black;
        surf[idx] = SMK.SURF.START;
      }
    }
  }

  /* ---- patches -------------------------------------------------- */
  var PATCH_STYLE = {
    boost: { surf: 'BOOST' },
    oil: { surf: 'OIL' },
    jump: { surf: 'JUMP' },
    mud: { surf: 'SLOW' },
    water: { surf: 'WATER' },
    ice: { surf: 'ICE' },
    road: { surf: 'ROAD' },
    wall: { surf: 'WALL' }
  };

  function patchColor(type, t, u, px, py, n, i, j, w, h) {
    switch (type) {
      case 'boost': {
        /* three chevrons pointing the way round, on a dark base */
        var fy = j / h;                       /* 0 back .. 1 front */
        var fx = Math.abs(i / w - 0.5) * 2;
        var band = fy * 3.0 - fx * 0.55;
        var bi = Math.floor(band), frac = band - bi;
        if (frac > 0.60) return SMK.u32('#242838');
        var cols = ['#f8f800', '#f8b000', '#f8f8f8'];
        return SMK.u32(cols[((bi % 3) + 3) % 3]);
      }
      case 'oil':
        return SMK.u32(n > 150 ? '#282830' : '#101018');
      case 'jump':
        return SMK.u32((Math.floor(j / h * 5) & 1) ? '#f8d800' : '#986018');
      case 'mud':
        return SMK.pack(72 + (n >> 5), 44, 20);
      case 'water':
        return SMK.pack(56, 150, 224 - (n >> 5) * 4);
      case 'ice':
        return SMK.pack(224, 240, 255);
      case 'wall':
        return SMK.u32('#584850');
      default:
        return 0;
    }
  }

  /* patch = { type, at (0..1 along lap), u (-1..1 centre), len (world
     units along), w (fraction of road width) }                     */
  function stampPatch(track, patch) {
    var tex = track.texture, surf = track.surface, SZ = track.size;
    var nd = nodeAtT(track, patch.at);
    var hw = nd.hw;
    var lenW = patch.len === undefined ? 26 : patch.len;
    var wFrac = patch.w === undefined ? 0.42 : patch.w;
    var uc = patch.u === undefined ? 0 : patch.u;
    var halfW = hw * wFrac, halfL = lenW * 0.5;
    var sid = SMK.SURF[(PATCH_STYLE[patch.type] || PATCH_STYLE.road).surf];

    var steps = Math.ceil(lenW / 0.55), ssteps = Math.ceil(halfW * 2 / 0.55);
    for (var a = 0; a <= steps; a++) {
      var dl = -halfL + (a / steps) * lenW;
      /* follow the centreline rather than a straight chord */
      var nd2 = nodeAtT(track, patch.at + dl / track.length);
      for (var b = 0; b <= ssteps; b++) {
        var off = uc * hw - halfW + (b / ssteps) * halfW * 2;
        var wx = nd2.x + nd2.nx * off, wy = nd2.y + nd2.ny * off;
        var ix = wx | 0, iy = wy | 0;
        if (ix < 0 || iy < 0 || ix >= SZ || iy >= SZ) continue;
        var idx = iy * SZ + ix;
        /* never paint a patch out over the void */
        if (surf[idx] === SMK.SURF.VOID) continue;
        var nidx = ((iy & 255) << 8) | (ix & 255);
        var c = patchColor(patch.type, nd2.s, off / hw, ix, iy,
                           noiseFine[nidx], b, a, ssteps, steps);
        if (c) tex[idx] = c;
        surf[idx] = sid;
      }
    }
  }

  /* ---- course map ---------------------------------------------- */
  /* Fits the whole loop into `box` pixels, matching the lower-screen
     map of the original.  Returns { buf, ox, oy, scale }.          */
  function buildMap(track, box) {
    box = box || 92;
    var nodes = track.nodes, i;
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (i = 0; i < nodes.length; i++) {
      var hw = nodes[i].hw * 1.2;
      if (nodes[i].x - hw < minX) minX = nodes[i].x - hw;
      if (nodes[i].x + hw > maxX) maxX = nodes[i].x + hw;
      if (nodes[i].y - hw < minY) minY = nodes[i].y - hw;
      if (nodes[i].y + hw > maxY) maxY = nodes[i].y + hw;
    }
    var w = maxX - minX, h = maxY - minY;
    var scale = box / Math.max(w, h);
    var bw = Math.ceil(w * scale) + 2, bh = Math.ceil(h * scale) + 2;
    var buf = new SMK.PixelBuf(bw, bh);

    var road = track.theme.mapRoad;
    var edge = SMK.shade(road, -0.45);

    /* stamp a thick line along the centreline, then a thin one on top */
    function stamp(width, col) {
      for (var k = 0; k < nodes.length; k++) {
        var a = nodes[k], b = nodes[(k + 1) % nodes.length];
        var steps = Math.max(1, Math.ceil(SMK.dist(a.x, a.y, b.x, b.y) * scale));
        for (var s = 0; s <= steps; s++) {
          var f = s / steps;
          var x = (SMK.lerp(a.x, b.x, f) - minX) * scale + 1;
          var y = (SMK.lerp(a.y, b.y, f) - minY) * scale + 1;
          var r = Math.max(0.6, a.hw * scale * width);
          buf.ellipse(x, y, r, r, col);
        }
      }
    }
    stamp(1.12, edge);
    stamp(0.80, road);

    /* start line marker */
    var sn = track.startNode;
    var sx = (sn.x - minX) * scale + 1, sy = (sn.y - minY) * scale + 1;
    var pw = Math.max(1.4, sn.hw * scale * 0.85);
    buf.ellipse(sx, sy, pw, pw, '#f8f8f8');

    return {
      buf: buf, canvas: buf.toCanvas(),
      ox: minX, oy: minY, scale: scale, w: bw, h: bh
    };
  }

  /* world position -> map pixel, for the racer blips */
  SMK.mapPoint = function (track, wx, wy) {
    var m = track.map;
    return { x: (wx - m.ox) * m.scale + 1, y: (wy - m.oy) * m.scale + 1 };
  };

  /* ---- progress helpers used by race logic ---- */

  /* nearest node index to a world position, searched near a hint */
  SMK.nearestNode = function (track, wx, wy, hint) {
    var nodes = track.nodes, n = nodes.length;
    var best = -1, bestD = 1e18, i, d;
    if (hint !== undefined && hint >= 0) {
      for (var k = -14; k <= 14; k++) {
        i = ((hint + k) % n + n) % n;
        d = SMK.dist2(wx, wy, nodes[i].x, nodes[i].y);
        if (d < bestD) { bestD = d; best = i; }
      }
      /* accept the local answer unless we are clearly lost */
      if (bestD < 260 * 260) return best;
    }
    best = -1; bestD = 1e18;
    for (i = 0; i < n; i++) {
      d = SMK.dist2(wx, wy, nodes[i].x, nodes[i].y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  };

})(window.SMK);
