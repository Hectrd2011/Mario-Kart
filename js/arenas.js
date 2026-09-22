/* ------------------------------------------------------------------
   arenas.js — Battle mode courses and the builder that bakes them.

   Battle arenas are not circuits, so they do not come from the spline
   track generator: there is no centreline, no lap and no racing line.
   They are rasterised directly — a floor, a wall ring, interior blocks
   and pits — into the same texture/surface/mip structure the Mode 7
   renderer and the physics already expect, so everything downstream
   works unchanged.

   A ring of nodes is generated anyway, purely so the course map and
   anything that calls nearestNode() keep working; nothing steers by it.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var SIZE = 1024;
  var CX = 512, CY = 512;

  /* positions below are in -1..1 arena coordinates */
  var ARENAS = {
    bt1: {
      id: 'bt1', name: 'BATTLE COURSE 1', theme: 'circuit',
      half: 250, shape: 'rect',
      notes: 'An open square with a cross of blocks to break up the sight lines.',
      walls: [{ x: 0, y: 0, w: 0.52, h: 0.10 }, { x: 0, y: 0, w: 0.10, h: 0.52 }],
      pits: [],
      boxes: [[0, -0.62], [0, 0.62], [-0.62, 0], [0.62, 0],
              [-0.42, -0.42], [0.42, 0.42], [-0.42, 0.42], [0.42, -0.42]],
      spawns: [[-0.74, -0.74], [0.74, -0.74], [0.74, 0.74], [-0.74, 0.74]]
    },
    bt2: {
      id: 'bt2', name: 'BATTLE COURSE 2', theme: 'plains',
      half: 250, shape: 'rect',
      notes: 'A pond in the middle, so nobody can simply hold the centre.',
      walls: [{ x: -0.62, y: -0.62, w: 0.16, h: 0.16 },
              { x: 0.62, y: 0.62, w: 0.16, h: 0.16 }],
      pits: [{ x: 0, y: 0, r: 0.30, kind: 'water' }],
      boxes: [[0, -0.52], [0, 0.52], [-0.52, 0], [0.52, 0],
              [-0.72, -0.30], [0.72, 0.30]],
      spawns: [[-0.76, -0.40], [0.76, -0.40], [0.76, 0.40], [-0.76, 0.40]]
    },
    bt3: {
      id: 'bt3', name: 'BATTLE COURSE 3', theme: 'ghost',
      half: 235, shape: 'rect',
      notes: 'Boards with the planking missing in four places. Mind the gaps.',
      walls: [],
      pits: [{ x: -0.46, y: -0.46, r: 0.19, kind: 'void' },
             { x: 0.46, y: -0.46, r: 0.19, kind: 'void' },
             { x: -0.46, y: 0.46, r: 0.19, kind: 'void' },
             { x: 0.46, y: 0.46, r: 0.19, kind: 'void' },
             { x: 0, y: 0, r: 0.22, kind: 'void' }],
      boxes: [[0, -0.66], [0, 0.66], [-0.66, 0], [0.66, 0], [0, -0.30], [0, 0.30]],
      spawns: [[-0.74, -0.10], [0.74, -0.10], [-0.10, 0.74], [-0.10, -0.74]]
    },
    bt4: {
      id: 'bt4', name: 'BATTLE COURSE 4', theme: 'castle',
      half: 250, shape: 'rect',
      notes: 'Stone, lava and four pillars. The tightest of the four.',
      walls: [{ x: -0.40, y: -0.40, w: 0.13, h: 0.13 },
              { x: 0.40, y: -0.40, w: 0.13, h: 0.13 },
              { x: -0.40, y: 0.40, w: 0.13, h: 0.13 },
              { x: 0.40, y: 0.40, w: 0.13, h: 0.13 }],
      pits: [{ x: 0, y: -0.68, r: 0.17, kind: 'lava' },
             { x: 0, y: 0.68, r: 0.17, kind: 'lava' }],
      boxes: [[-0.62, -0.62], [0.62, -0.62], [-0.62, 0.62], [0.62, 0.62],
              [0, 0], [-0.30, 0], [0.30, 0]],
      spawns: [[-0.78, 0], [0.78, 0], [0, -0.40], [0, 0.40]]
    }
  };

  var PIT_SURF = {
    void: 'VOID', water: 'WATER', lava: 'LAVA', mud: 'SLOW'
  };

  SMK.buildArena = function (def) {
    var theme = SMK.themes[def.theme];
    var tex = new Uint32Array(SIZE * SIZE);
    var surf = new Uint8Array(SIZE * SIZE);
    var half = def.half;
    var wallT = 26;                       /* thickness of the outer wall */

    var TILE = 46;                        /* paving slab size, world units */

    /* everything starts as whatever lies beyond this theme's road */
    var beyondSurf = theme.surfAt(0, 9);
    var groundVoid = theme.groundAt(0, 0, 128, 128) === 0;

    /* walls, built from the theme's road colour so each arena still
       looks like the world it belongs to */
    var wallBase = theme.roadAt(0, 0, CX, CY, 128, 128);
    var wallDark = SMK.scaleU32(wallBase, 0.42);
    var wallMid = SMK.scaleU32(wallBase, 0.62);
    var wallLit = SMK.scaleU32(wallBase, 0.86);
    function wallColour(wx, wy, outer) {
      /* courses of blocks, offset every other row */
      var rowN = Math.floor(wy / 16);
      var col = Math.floor((wx + (rowN & 1 ? 8 : 0)) / 22);
      if (wy % 16 < 2 || (wx + (rowN & 1 ? 8 : 0)) % 22 < 2) return wallDark;
      if (wy % 16 < 5) return wallLit;
      return ((rowN + col) & 1) ? wallMid : SMK.scaleU32(wallBase, 0.70);
    }

    function pitAt(wx, wy) {
      for (var i = 0; i < def.pits.length; i++) {
        var p = def.pits[i];
        var px = CX + p.x * half, py = CY + p.y * half, r = p.r * half;
        if (SMK.dist2(wx, wy, px, py) < r * r) return p;
      }
      return null;
    }
    function inWall(wx, wy) {
      for (var i = 0; i < def.walls.length; i++) {
        var w = def.walls[i];
        var bx = CX + w.x * half, by = CY + w.y * half;
        if (Math.abs(wx - bx) < w.w * half && Math.abs(wy - by) < w.h * half) return true;
      }
      return false;
    }

    for (var y = 0; y < SIZE; y++) {
      var row = y * SIZE;
      for (var x = 0; x < SIZE; x++) {
        /* the arena floor gets its grain from the fbm pass below */
        var n = 128, nc = 128;
        var idx = row + x;
        var dx = x - CX, dy = y - CY;
        var inside = Math.abs(dx) <= half && Math.abs(dy) <= half;
        var onWall = !inside &&
          Math.abs(dx) <= half + wallT && Math.abs(dy) <= half + wallT;

        if (onWall) {
          tex[idx] = wallColour(x, y, true);
          surf[idx] = SMK.SURF.WALL;
        } else if (!inside) {
          tex[idx] = groundVoid ? 0 : theme.groundAt(x, y, n, nc);
          surf[idx] = groundVoid ? SMK.SURF.VOID : beyondSurf;
        } else if (inWall(x, y)) {
          tex[idx] = wallColour(x, y, false);
          surf[idx] = SMK.SURF.WALL;
        } else {
          var pit = pitAt(x, y);
          if (pit) {
            surf[idx] = SMK.SURF[PIT_SURF[pit.kind] || 'VOID'];
            if (pit.kind === 'void') tex[idx] = 0;
            else if (pit.kind === 'water') tex[idx] = SMK.pack(48, 132, 210);
            else if (pit.kind === 'lava') tex[idx] = SMK.pack(226, 96, 20);
            else tex[idx] = SMK.pack(72, 44, 20);
          } else {
            /* the theme's own road surface, paved into slabs.  An arena
               floor with no pattern gives the eye nothing to judge
               motion against, and you cannot tell you are moving. */
            var c = theme.roadAt(x * 2.0, ((x + y) % 97) / 400, x, y, n, nc);
            var sx = x % TILE, sy = y % TILE;
            if (sx < 2 || sy < 2) c = SMK.scaleU32(c, 0.80);
            else if (sx < 4 || sy < 4) c = SMK.scaleU32(c, 0.93);
            else if (((Math.floor(x / TILE) + Math.floor(y / TILE)) & 1) === 0) c = SMK.scaleU32(c, 1.06);
            tex[idx] = c;
            surf[idx] = SMK.SURF.ROAD;
          }
        }
      }
    }

    /* the real noise pass, so the floor is not flat */
    var fbm = SMK.makeFbm(4242, 3, 0.55);
    for (var yy = 0; yy < SIZE; yy += 1) {
      for (var xx = 0; xx < SIZE; xx += 1) {
        var i2 = yy * SIZE + xx;
        if (surf[i2] !== SMK.SURF.ROAD) continue;
        var v = fbm(xx * 0.19, yy * 0.19);
        tex[i2] = SMK.scaleU32(tex[i2], 0.92 + v * 0.16);
      }
    }

    /* a ring of nodes purely so the map and nearestNode() still work */
    var nodes = [];
    var NN = 64;
    for (var k = 0; k < NN; k++) {
      var a = (k / NN) * SMK.TAU;
      var rx = CX + Math.cos(a) * half * 0.78;
      var ry = CY + Math.sin(a) * half * 0.78;
      nodes.push({
        x: rx, y: ry,
        tx: -Math.sin(a), ty: Math.cos(a),
        nx: -Math.cos(a), ny: -Math.sin(a),
        s: (k / NN) * half * 4.9, t: k / NN,
        hw: half * 0.9, index: k, curve: SMK.TAU / NN, lineU: 0
      });
    }

    var track = {
      size: SIZE, texture: tex, surface: surf, wrap: false,
      voidColor: theme.voidColor, theme: theme,
      course: def, arena: true,
      nodes: nodes, length: half * 4.9, laps: 1,
      checkpoints: [], startNode: nodes[0], startAngle: 0, startS: 0,
      half: half, cx: CX, cy: CY
    };
    track.map = arenaMap(track, def);
    track.mips = SMK.buildMips(tex, SIZE);
    return track;
  };

  /* a plan view of the arena rather than a ribbon */
  function arenaMap(track, def) {
    var box = 92;
    var half = def.half;
    var scale = box / (half * 2.2);
    var bw = Math.ceil(half * 2.2 * scale) + 2, bh = bw;
    var buf = new SMK.PixelBuf(bw, bh);
    var road = track.theme.mapRoad;

    function toMap(wx, wy) {
      return { x: (wx - (CX - half * 1.1)) * scale + 1, y: (wy - (CY - half * 1.1)) * scale + 1 };
    }
    var a = toMap(CX - half, CY - half), b = toMap(CX + half, CY + half);
    buf.rect(a.x, a.y, b.x - a.x, b.y - a.y, road);
    buf.frame(a.x - 1, a.y - 1, b.x - a.x + 2, b.y - a.y + 2, SMK.shade(road, -0.5));

    var i;
    for (i = 0; i < def.pits.length; i++) {
      var p = def.pits[i];
      var c = toMap(CX + p.x * half, CY + p.y * half);
      var col = p.kind === 'lava' ? '#f05018' : (p.kind === 'water' ? '#3080d0' : '#101018');
      buf.ellipse(c.x, c.y, p.r * half * scale, p.r * half * scale, col);
    }
    for (i = 0; i < def.walls.length; i++) {
      var w = def.walls[i];
      var c2 = toMap(CX + w.x * half, CY + w.y * half);
      buf.rect(c2.x - w.w * half * scale, c2.y - w.h * half * scale,
               Math.max(1, w.w * half * scale * 2), Math.max(1, w.h * half * scale * 2),
               SMK.shade(road, -0.55));
    }
    return { buf: buf, canvas: buf.toCanvas(),
             ox: CX - half * 1.1, oy: CY - half * 1.1, scale: scale, w: bw, h: bh };
  }

  /* world positions for the starting grid and the item boxes */
  SMK.arenaSpawns = function (def) {
    var out = [];
    for (var i = 0; i < def.spawns.length; i++) {
      var s = def.spawns[i];
      var x = CX + s[0] * def.half, y = CY + s[1] * def.half;
      out.push({ x: x, y: y, angle: Math.atan2(CY - y, CX - x) });
    }
    return out;
  };
  SMK.arenaBoxes = function (def) {
    var out = [];
    for (var i = 0; i < def.boxes.length; i++)
      out.push({ x: CX + def.boxes[i][0] * def.half, y: CY + def.boxes[i][1] * def.half });
    return out;
  };

  /* map only — baking a whole arena texture to preview it would stall
     the menu for a fifth of a second every time you move the cursor */
  SMK.buildArenaPreview = function (def) {
    var theme = SMK.themes[def.theme];
    var half = def.half;
    var nodes = [];
    for (var k = 0; k < 16; k++) {
      var a = (k / 16) * SMK.TAU;
      nodes.push({ x: CX + Math.cos(a) * half * 0.78, y: CY + Math.sin(a) * half * 0.78,
                   hw: half * 0.9, index: k });
    }
    var track = { theme: theme, course: def, nodes: nodes, half: half, preview: true };
    track.map = arenaMap(track, def);
    return track;
  };

  SMK.arenas = ARENAS;
  SMK.arenaList = ['bt1', 'bt2', 'bt3', 'bt4'];

})(window.SMK);
