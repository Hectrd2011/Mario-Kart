/* ------------------------------------------------------------------
   art_kart.js — kart + driver sprite sheets, generated at boot.

   The original's karts were hand-drawn at sixteen headings.  Hand
   authoring 8 drivers x 16 headings x 3 steering poses is ~400 frames,
   so instead the kart is modelled as a handful of tapered boxes and
   projected through a fixed 22-degree camera, then flat-shaded into a
   three-tone palette and given a hard black key line.  Because every
   primitive snaps to whole pixels and every colour snaps to the SNES
   5-bit lattice, the output reads as drawn pixel art rather than as
   3D — but the rotation is exactly consistent across all sixteen
   headings, which hand-drawn sheets rarely are.

   Driver faces work the same way: each feature (eye, nose, brim,
   moustache, horn) is a point in head-local space, projected with the
   same matrix and hidden when it rotates onto the far hemisphere.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var PAL = SMK.PAL;
  var PITCH = 23 * Math.PI / 180;      /* camera elevation */
  var COSP = Math.cos(PITCH), SINP = Math.sin(PITCH);

  var FW = 46, FH = 34;                /* frame size          */
  var AX = 23;                         /* anchor x (centre)   */
  var GY = 30;                         /* anchor y (ground)   */
  var ANGLES = 16;
  var HALF = 9;                        /* authored headings (0..8) */

  /* ---------------- projection ---------------- */

  function Proj(yaw, roll) {
    this.ca = Math.cos(yaw); this.sa = Math.sin(yaw);
    this.cr = Math.cos(roll || 0); this.sr = Math.sin(roll || 0);
    this.yaw = yaw;
  }

  /* kart-local (x right, y up, z forward) -> screen + depth */
  Proj.prototype.pt = function (x, y, z) {
    /* roll about the forward axis */
    if (this.sr) {
      var rx = x * this.cr - y * this.sr;
      var ry = x * this.sr + y * this.cr;
      x = rx; y = ry;
    }
    var xr = x * this.ca + z * this.sa;
    var zr = -x * this.sa + z * this.ca;
    return {
      x: AX + xr,
      y: GY - (y * COSP + zr * SINP),
      d: zr * COSP - y * SINP
    };
  };

  /* rotate a local normal into view space (for shading) */
  Proj.prototype.nrm = function (nx, ny, nz) {
    if (this.sr) {
      var rx = nx * this.cr - ny * this.sr;
      var ry = nx * this.sr + ny * this.cr;
      nx = rx; ny = ry;
    }
    return [nx * this.ca + nz * this.sa, ny, -nx * this.sa + nz * this.ca];
  };

  /* light from up / slightly left / slightly toward the viewer */
  var LX = -0.34, LY = 0.87, LZ = -0.36;

  function shadeOf(n) {
    var d = n[0] * LX + n[1] * LY + n[2] * LZ;
    return 0.42 + 0.58 * (d > 0 ? d : 0);
  }

  /* three-tone quantiser: this is what keeps it looking painted */
  function tone(pal, s) {
    if (s > 0.86) return pal.hi;
    if (s > 0.54) return pal.mid;
    return pal.lo;
  }

  function tri3(mid, lo, hi) { return { mid: mid, lo: lo, hi: hi }; }

  /* ---------------- geometry emitters ---------------- */

  /* v = 8 local vertices: 0-3 bottom ring (back-left, back-right,
     front-right, front-left), 4-7 the same ring on top.            */
  var HEX_FACES = [
    { i: [4, 5, 6, 7], n: [0, 1, 0] },     /* top    */
    { i: [3, 2, 1, 0], n: [0, -1, 0] },    /* bottom */
    { i: [0, 1, 5, 4], n: [0, 0, -1] },    /* back   */
    { i: [2, 3, 7, 6], n: [0, 0, 1] },     /* front  */
    { i: [3, 0, 4, 7], n: [-1, 0, 0] },    /* left   */
    { i: [1, 2, 6, 5], n: [1, 0, 0] }      /* right  */
  ];

  function emitHex(list, v, pal, flatTop) {
    for (var f = 0; f < HEX_FACES.length; f++) {
      var face = HEX_FACES[f];
      var n = face.n;
      var col = flatTop && f === 0 ? pal.hi : tone(pal, shadeOf([n[0], n[1], n[2]]));
      list.push({ kind: 'quad', vi: face.i, n: n, col: col, verts: v });
    }
  }

  /* tapered box helper: half-width + top/bottom height at each z end */
  function emitBox(list, hwBack, hwFront, yBot, yTop, zBack, zFront, pal, opt) {
    opt = opt || {};
    var yTopB = opt.yTopBack === undefined ? yTop : opt.yTopBack;
    var yTopF = opt.yTopFront === undefined ? yTop : opt.yTopFront;
    var yBotB = opt.yBotBack === undefined ? yBot : opt.yBotBack;
    var yBotF = opt.yBotFront === undefined ? yBot : opt.yBotFront;
    var v = [
      [-hwBack, yBotB, zBack], [hwBack, yBotB, zBack],
      [hwFront, yBotF, zFront], [-hwFront, yBotF, zFront],
      [-hwBack, yTopB, zBack], [hwBack, yTopB, zBack],
      [hwFront, yTopF, zFront], [-hwFront, yTopF, zFront]
    ];
    emitHex(list, v, pal, opt.flatTop);
    return v;
  }

  /* ---------------- the kart ---------------- */

  var REAR_R = 5.2, REAR_HW = 3.1, REAR_Z = -7.2, REAR_X = 11.4;
  var FRONT_R = 4.2, FRONT_HW = 2.5, FRONT_Z = 8.4, FRONT_X = 10.9;

  function buildKart(list, ch, steer) {
    var k = ch.kart;
    var body = tri3(k.body, k.bodyLo, k.bodyHi);
    var trim = tri3(k.trim, SMK.shade(k.trim, -0.35), SMK.shade(k.trim, 0.3));
    var eng = tri3(k.engine, SMK.shade(k.engine, -0.4), SMK.shade(k.engine, 0.28));
    var dark = tri3(PAL.grey1, PAL.shadow, PAL.grey2);

    /* floor pan — wide at the back, pinched at the nose */
    emitBox(list, 9.6, 6.6, 1.2, 6.6, -12.0, 12.4, body, { yTopFront: 5.2 });

    /* side pods the wheels bolt onto — kept tall so the livery reads */
    emitBox(list, 2.6, 2.4, 1.6, 7.0, -9.4, 6.2, body).forEach(function (p) { p[0] -= 8.8; });
    emitBox(list, 2.6, 2.4, 1.6, 7.0, -9.4, 6.2, body).forEach(function (p) { p[0] += 8.8; });

    /* nose cone */
    emitBox(list, 6.4, 3.6, 1.8, 5.2, 11.2, 15.0, trim, { yTopFront: 4.2 });

    /* front bumper bar */
    emitBox(list, 7.4, 7.4, 2.8, 4.0, 13.4, 14.6, dark);

    /* engine block + rear deck */
    emitBox(list, 6.8, 7.2, 6.2, 10.8, -13.0, -6.2, eng, { flatTop: true });
    emitBox(list, 7.2, 6.0, 6.2, 7.6, -6.2, -1.0, body);

    /* roll bar / seat back */
    emitBox(list, 4.8, 4.8, 7.0, 13.6, -6.4, -3.8, body);
    emitBox(list, 5.4, 5.4, 13.2, 14.6, -6.8, -3.6, body, { flatTop: true });

    /* exhaust stacks */
    emitBox(list, 1.0, 1.0, 10.6, 12.4, -12.2, -9.4, tri3(PAL.exhaust, PAL.grey2, PAL.chromeDark))
      .forEach(function (p) { p[0] -= 4.4; });
    emitBox(list, 1.0, 1.0, 10.6, 12.4, -12.2, -9.4, tri3(PAL.exhaust, PAL.grey2, PAL.chromeDark))
      .forEach(function (p) { p[0] += 4.4; });

    /* number plate on the tail */
    list.push({ kind: 'plate', z: -13.1, y: 8.2, col: k.trim });

    /* ---- wheels ---- */
    var st = steer * 0.30;                     /* radians of front-wheel yaw */
    list.push({ kind: 'wheel', x: -REAR_X, y: REAR_R, z: REAR_Z, r: REAR_R, hw: REAR_HW, skew: 0 });
    list.push({ kind: 'wheel', x: REAR_X, y: REAR_R, z: REAR_Z, r: REAR_R, hw: REAR_HW, skew: 0 });
    list.push({ kind: 'wheel', x: -FRONT_X, y: FRONT_R, z: FRONT_Z, r: FRONT_R, hw: FRONT_HW, skew: st });
    list.push({ kind: 'wheel', x: FRONT_X, y: FRONT_R, z: FRONT_Z, r: FRONT_R, hw: FRONT_HW, skew: st });
  }

  /* ---------------- the driver ---------------- */

  function buildDriver(list, ch, steer) {
    var d = ch.driver;
    var shirt = tri3(d.shirt || d.skin, d.shirtShade || d.skinShade, SMK.shade(d.shirt || d.skin, 0.3));
    var lower = tri3(d.overalls || d.shirt || d.skin,
                     d.overallsShade || d.shirtShade || d.skinShade,
                     SMK.shade(d.overalls || d.shirt || d.skin, 0.28));
    var skin = tri3(d.skin, d.skinShade, SMK.shade(d.skin, 0.28));
    var kb = ch.kart;
    var cowl = tri3(kb.body, kb.bodyLo, kb.bodyHi);

    /* hips, sunk into the tub */
    emitBox(list, 4.4, 4.2, 5.4, 8.6, -5.6, 0.8, lower);
    /* torso */
    emitBox(list, 4.4, 4.0, 8.2, 12.4, -5.2, 0.4, shirt, { yTopFront: 11.6 });
    /* shoulders */
    emitBox(list, 5.1, 4.5, 11.8, 13.6, -5.0, -0.4, shirt, { flatTop: true });

    /* arms reaching to the wheel; they swing a little with steering */
    var lean = steer * 1.5;
    armBox(list, -4.7, 12.4, -1.6, -3.9, 10.0, 5.8 + lean, skin, d);
    armBox(list, 4.7, 12.4, -1.6, 3.9, 10.0, 5.8 - lean, skin, d);

    /* dash cowl — hides the pedals and gives the front views some depth */
    emitBox(list, 5.6, 4.8, 6.4, 9.4, 1.6, 8.2, cowl, { yTopFront: 8.6 });

    /* steering wheel and gloves: a sprite artist would not draw these
       from behind the driver, and neither do we */
    list.push({ kind: 'ring', x: 0, y: 10.4, z: 6.4, r: 2.8, col: PAL.grey1, col2: PAL.grey3, facingMin: -0.42 });
    list.push({ kind: 'blob', x: -3.9, y: 10.2, z: 6.4, r: 1.7, col: d.glove || PAL.white, facingMin: -0.42 });
    list.push({ kind: 'blob', x: 3.9, y: 10.2, z: 6.4, r: 1.7, col: d.glove || PAL.white, facingMin: -0.42 });

    /* character-specific back furniture */
    if (d.shell) {
      /* Koopa and Bowser carry their shell behind the seat */
      list.push({ kind: 'blob', x: 0, y: 10.2, z: -6.4, r: 4.4, col: d.shell, col2: d.shellShade, rim: d.shellRim });
    }

    /* head */
    list.push({ kind: 'head', x: 0, y: 17.4, z: -1.4, driver: d });
  }

  function armBox(list, x0, y0, z0, x1, y1, z1, pal, d) {
    var hw = 1.5;
    var v = [
      [x0 - hw, y0 - hw, z0], [x0 + hw, y0 - hw, z0],
      [x1 + hw, y1 - hw, z1], [x1 - hw, y1 - hw, z1],
      [x0 - hw, y0 + hw, z0], [x0 + hw, y0 + hw, z0],
      [x1 + hw, y1 + hw, z1], [x1 - hw, y1 + hw, z1]
    ];
    var sleeve = d.shirt ? tri3(d.shirt, d.shirtShade, SMK.shade(d.shirt, 0.3)) : pal;
    emitHex(list, v, sleeve);
  }

  /* ---------------- driver heads ----------------

     Each head is a shaded ellipsoid.  For every pixel we solve for the
     near surface point, rotate it back into head-local space, and ask a
     per-character region function what lives at that spot on the head.
     Occlusion is therefore exact at every heading — the back of a head
     shows hair rather than face, and an eye vanishes the moment it
     rotates past the limb instead of sliding off the silhouette the way
     stacked billboards do.  Protruding parts (Mario's nose, Yoshi's
     snout, Bowser's horns, Peach's crown) are drawn as overlays on the
     near or far side of the ellipsoid according to their own depth.
     ------------------------------------------------------------------ */

  var HEAD_W = 26, HEAD_H = 26, HCX = 13, HCY = 14;

  /* three-tone ramp cache, so the shader never re-parses a hex string */
  var toneCache = {};
  function tones(hex) {
    var t = toneCache[hex];
    if (!t) {
      t = toneCache[hex] = [
        SMK.u32(SMK.shade(hex, -0.28)),
        SMK.u32(hex),
        SMK.u32(SMK.shade(hex, 0.20))
      ];
    }
    return t;
  }

  /* light direction in view space: above, to the left, toward the lens */
  var LGX = -0.42, LGY = 0.56, LGZ = -0.71;

  /* head-local (unit-sphere) coords -> head-buffer pixel + depth */
  function hpt(o, x, y, z) {
    var X = x * o.rx, Y = y * o.ry, Z = z * o.rz;
    var xr = X * o.ca + Z * o.sa;
    var zr = -X * o.sa + Z * o.ca;
    return {
      x: o.cx + xr,
      y: o.cy - (Y * COSP + zr * SINP),
      d: zr * COSP - Y * SINP
    };
  }

  /* rasterise one ellipsoid through `region` */
  function shadeEllipsoid(buf, o, region, slots) {
    var rx = o.rx, ry = o.ry, ca = o.ca, sa = o.sa;
    var px0 = Math.floor(o.cx - rx), px1 = Math.ceil(o.cx + rx);
    var py0 = Math.floor(o.cy - ry * 1.15), py1 = Math.ceil(o.cy + ry * 1.15);
    for (var py = py0; py <= py1; py++) {
      for (var px = px0; px <= px1; px++) {
        var u = (px + 0.5 - o.cx) / rx;
        var v = (o.cy - (py + 0.5)) / ry;
        var t = 1 - u * u - v * v;
        if (t <= 0) continue;
        var w = -Math.sqrt(t);                 /* near surface */
        /* un-pitch, then un-yaw, into head-local unit-sphere coords */
        var Y = v * COSP - w * SINP;
        var Zr = v * SINP + w * COSP;
        var X = u * ca - Zr * sa;
        var Z = u * sa + Zr * ca;
        var si = region(X, Y, Z);
        if (si < 0) continue;
        var sl = slots[si];
        var col;
        if (sl.flat) col = sl.u;
        else {
          var lam = u * LGX + v * LGY + w * LGZ;
          var sh = 0.5 + 0.5 * (lam > 0 ? lam : 0);
          col = sl.t[sh > 0.90 ? 2 : (sh < 0.63 ? 0 : 1)];
        }
        buf.pxRaw(px, py, col);
      }
    }
  }

  /* spherical cap test: is p within `cosR` of direction d? */
  function capTest(X, Y, Z, dx, dy, dz, cosR) {
    return (X * dx + Y * dy + Z * dz) > cosR;
  }

  /* ---- per-character head descriptions ---- */

  function buildHead(d) {
    var slots = [], idx = {};
    function S(name, hex, flat) {
      idx[name] = slots.length;
      slots.push({ t: tones(hex), u: SMK.u32(hex), flat: !!flat });
      return idx[name];
    }

    var SKIN = S('skin', d.skin);
    var SKINS = S('skins', d.skinShade);
    var EYE = S('eye', PAL.white, true);
    var PUP = S('pup', PAL.outline, true);

    var spheres = [];          /* {rx,ry,rz,dy,region} */
    var over = [];             /* {x,y,z,draw(buf,p)} — local dirs, may exceed r=1 */
    var type = d.type;

    if (type === 'toad') {
      var CAP = S('cap', d.cap), CAPS = S('caps', d.capShade), SPOT = S('spot', d.spot);
      var eyeT = [0.30, -0.02, 0.95];
      spheres.push({
        rx: 4.6, ry: 4.4, rz: 4.6, dy: -1.8,
        region: function (X, Y, Z) {
          if (capTest(X, Y, Z, -eyeT[0], eyeT[1], eyeT[2], 0.980)) return PUP;
          if (capTest(X, Y, Z, eyeT[0], eyeT[1], eyeT[2], 0.980)) return PUP;
          if (Y < -0.55) return SKINS;
          return SKIN;
        }
      });
      /* the cap: a wide flattened dome with four spots */
      var spots = [[0, 0.42, 0.90], [-0.86, 0.34, 0.32], [0.86, 0.34, 0.32], [0, 0.50, -0.84]];
      spheres.push({
        rx: 7.0, ry: 4.8, rz: 6.4, dy: 2.4,
        region: function (X, Y, Z) {
          for (var i = 0; i < spots.length; i++) {
            var sp = spots[i], L = Math.sqrt(sp[0] * sp[0] + sp[1] * sp[1] + sp[2] * sp[2]);
            if (capTest(X, Y, Z, sp[0] / L, sp[1] / L, sp[2] / L, 0.955)) return SPOT;
          }
          return Y < -0.30 ? CAPS : CAP;
        }
      });
      return { slots: slots, spheres: spheres, over: over, rx: 7.0, ry: 5.6 };
    }

    /* ---- everything else has one head ellipsoid ---- */
    var rx = 5.9, ry = 5.7, rz = 5.9;
    if (type === 'bowser') { rx = 6.4; ry = 5.9; rz = 6.2; }
    if (type === 'kong') { rx = 6.1; ry = 5.8; rz = 6.0; }

    if (type === 'human') {
      var HAIR = S('hair', d.hair);
      /* Peach has no cap, so these slots fall back to her hair */
      var CAP2 = S('cap', d.cap || d.hair), CAPD = S('capd', d.capShade || d.hairShade || d.hair);
      var EM = S('em', PAL.white, true);
      var MO = d.moustache ? S('mo', d.moustache) : -1;
      var eL = [-0.33, 0.01, 0.945], eR = [0.33, 0.01, 0.945];
      var emDir = [0, 0.46, 0.89];
      var hasCap = !!d.cap, hasCrown = !!d.crown;

      spheres.push({
        rx: rx, ry: ry, rz: rz, dy: 0,
        region: function (X, Y, Z) {
          if (hasCap) {
            var capY = 0.26 - 0.24 * (Z > 0 ? Z : 0);
            if (Y > capY) {
              if (capTest(X, Y, Z, emDir[0], emDir[1], emDir[2], 0.962)) return EM;
              return (Y < capY + 0.09 && Z > 0.1) ? CAPD : CAP2;
            }
          } else if (hasCrown) {
            if (Y > 0.34) return HAIR;
            if (Math.abs(X) > 0.62 && Y > -0.55) return HAIR;
          }
          if (capTest(X, Y, Z, eL[0], eL[1], eL[2], 0.958))
            return capTest(X, Y, Z, eL[0], eL[1], eL[2], 0.981) ? PUP : EYE;
          if (capTest(X, Y, Z, eR[0], eR[1], eR[2], 0.958))
            return capTest(X, Y, Z, eR[0], eR[1], eR[2], 0.981) ? PUP : EYE;
          if (MO >= 0 && Z > 0.60 && Y < -0.17 && Y > -0.50 && Math.abs(X) < 0.58) return MO;
          if (hasCap) {
            if (Z < -0.12) return HAIR;
            if (Math.abs(X) > 0.77 && Y > -0.30) return HAIR;
          }
          if (Y < -0.62) return SKINS;
          return SKIN;
        }
      });

      /* the brim, sticking out past the silhouette */
      if (hasCap) {
        over.push({ x: 0, y: 0.10, z: 1.06, near: true, draw: function (buf, p, near) {
          if (!near) return;
          buf.ellipse(p.x, p.y, 4.4, 1.5, d.capShade);
          buf.ellipse(p.x, p.y - 0.8, 4.0, 0.9, d.cap);
        } });
      }
      /* Mario's nose */
      if (d.nose) {
        over.push({ x: 0, y: -0.10, z: 1.12, draw: function (buf, p, near) {
          if (!near) return;
          buf.ellipse(p.x, p.y, 2.1, 1.8, d.skin);
          buf.ellipse(p.x, p.y + 1.1, 1.6, 0.8, d.skinShade);
        } });
      }
      /* Peach: crown above, hair falling behind the shoulders */
      if (hasCrown) {
        over.push({ x: 0, y: 1.02, z: 0.06, draw: function (buf, p) {
          var cx = Math.round(p.x), cy = Math.round(p.y);
          buf.rect(cx - 3, cy, 7, 3, d.crown);
          buf.px(cx - 3, cy - 1, d.crown);
          buf.px(cx, cy - 2, d.crown);
          buf.px(cx, cy - 1, d.crown);
          buf.px(cx + 3, cy - 1, d.crown);
          buf.px(cx, cy + 1, d.crownGem);
        } });
        over.push({ x: -0.92, y: -0.52, z: -0.30, draw: function (buf, p) {
          buf.ellipse(p.x, p.y, 2.5, 4.6, d.hair);
          buf.ellipse(p.x, p.y + 2.4, 2.1, 2.3, d.hairShade);
        } });
        over.push({ x: 0.92, y: -0.52, z: -0.30, draw: function (buf, p) {
          buf.ellipse(p.x, p.y, 2.5, 4.6, d.hair);
          buf.ellipse(p.x, p.y + 2.4, 2.1, 2.3, d.hairShade);
        } });
      }
      return { slots: slots, spheres: spheres, over: over, rx: rx, ry: ry };
    }

    if (type === 'dino') {
      var CREST = S('crest', d.crest);
      var CHEEK = S('cheek', d.cheek);
      var ed = 0.955, ep = 0.978;
      var yL = [-0.34, 0.36, 0.87], yR = [0.34, 0.36, 0.87];
      spheres.push({
        rx: rx, ry: ry, rz: rz, dy: 0,
        region: function (X, Y, Z) {
          if (capTest(X, Y, Z, yL[0], yL[1], yL[2], ed))
            return capTest(X, Y, Z, yL[0], yL[1], yL[2], ep) ? PUP : EYE;
          if (capTest(X, Y, Z, yR[0], yR[1], yR[2], ed))
            return capTest(X, Y, Z, yR[0], yR[1], yR[2], ep) ? PUP : EYE;
          if (Y > 0.44 && Z < 0.18) return CREST;
          if (Math.abs(X) > 0.66 && Y < -0.16 && Z > 0.1) return CHEEK;
          if (Y < -0.60) return SKINS;
          return SKIN;
        }
      });
      /* snout */
      over.push({ x: 0, y: -0.28, z: 1.08, draw: function (buf, p, near) {
        if (!near) return;
        buf.ellipse(p.x, p.y, 4.1, 2.9, d.skin);
        buf.ellipse(p.x, p.y + 1.4, 3.4, 1.4, d.muzzleShade);
        buf.ellipse(p.x - 1.7, p.y - 0.9, 0.9, 0.7, PAL.outline);
        buf.ellipse(p.x + 1.7, p.y - 0.9, 0.9, 0.7, PAL.outline);
      } });
      return { slots: slots, spheres: spheres, over: over, rx: rx, ry: ry };
    }

    if (type === 'koopa') {
      var kL = [-0.32, 0.14, 0.94], kR = [0.32, 0.14, 0.94];
      spheres.push({
        rx: rx * 0.94, ry: ry * 0.94, rz: rz * 0.94, dy: 0,
        region: function (X, Y, Z) {
          if (capTest(X, Y, Z, kL[0], kL[1], kL[2], 0.958))
            return capTest(X, Y, Z, kL[0], kL[1], kL[2], 0.980) ? PUP : EYE;
          if (capTest(X, Y, Z, kR[0], kR[1], kR[2], 0.958))
            return capTest(X, Y, Z, kR[0], kR[1], kR[2], 0.980) ? PUP : EYE;
          if (Y > 0.40 && Z < 0.30) return SKINS;
          if (Y < -0.58) return SKINS;
          return SKIN;
        }
      });
      over.push({ x: 0, y: -0.34, z: 1.06, draw: function (buf, p, near) {
        if (!near) return;
        buf.ellipse(p.x, p.y, 3.0, 2.0, d.beak);
        buf.ellipse(p.x, p.y + 0.9, 2.4, 0.9, SMK.shade(d.beak, -0.32));
      } });
      return { slots: slots, spheres: spheres, over: over, rx: rx, ry: ry };
    }

    if (type === 'bowser') {
      var BHAIR = S('bhair', d.hair), BROW = S('brow', d.brow), BELLY = S('belly', d.belly);
      var bL = [-0.35, -0.06, 0.935], bR = [0.35, -0.06, 0.935];
      spheres.push({
        rx: rx, ry: ry, rz: rz, dy: 0,
        region: function (X, Y, Z) {
          if (Y > 0.34) return BHAIR;
          if (Z < -0.20) return BHAIR;
          if (Z > 0.44 && Y > 0.04 && Y < 0.30) return BROW;
          if (capTest(X, Y, Z, bL[0], bL[1], bL[2], 0.960))
            return capTest(X, Y, Z, bL[0], bL[1], bL[2], 0.982) ? PUP : EYE;
          if (capTest(X, Y, Z, bR[0], bR[1], bR[2], 0.960))
            return capTest(X, Y, Z, bR[0], bR[1], bR[2], 0.982) ? PUP : EYE;
          if (Y < -0.66) return BELLY;
          return SKIN;
        }
      });
      /* horns */
      over.push({ x: -0.80, y: 0.78, z: -0.10, draw: function (buf, p) {
        buf.ellipse(p.x, p.y, 1.6, 2.9, d.horn);
        buf.ellipse(p.x, p.y + 1.5, 1.3, 1.3, d.hornShade);
      } });
      over.push({ x: 0.80, y: 0.78, z: -0.10, draw: function (buf, p) {
        buf.ellipse(p.x, p.y, 1.6, 2.9, d.horn);
        buf.ellipse(p.x, p.y + 1.5, 1.3, 1.3, d.hornShade);
      } });
      /* snout + tusks */
      over.push({ x: 0, y: -0.36, z: 1.04, draw: function (buf, p, near) {
        if (!near) return;
        buf.ellipse(p.x, p.y, 3.9, 2.5, d.skin);
        buf.ellipse(p.x, p.y + 0.8, 3.3, 1.3, d.belly);
        buf.rect(p.x - 3, p.y + 1, 2, 2, d.spike);
        buf.rect(p.x + 2, p.y + 1, 2, 2, d.spike);
      } });
      return { slots: slots, spheres: spheres, over: over, rx: rx, ry: ry };
    }

    /* kong */
    var MZ = S('mz', d.muzzle), MZS = S('mzs', d.muzzleShade);
    var KBROW = S('kbrow', d.brow), KCAP = S('kcap', d.cap);
    var gL = [-0.28, 0.20, 0.94], gR = [0.28, 0.20, 0.94];
    spheres.push({
      rx: rx, ry: ry, rz: rz, dy: 0,
      region: function (X, Y, Z) {
        if (Y > 0.46) return KCAP;
        if (capTest(X, Y, Z, gL[0], gL[1], gL[2], 0.962))
          return capTest(X, Y, Z, gL[0], gL[1], gL[2], 0.982) ? PUP : EYE;
        if (capTest(X, Y, Z, gR[0], gR[1], gR[2], 0.962))
          return capTest(X, Y, Z, gR[0], gR[1], gR[2], 0.982) ? PUP : EYE;
        if (Z > 0.40 && Y > 0.06 && Y < 0.34) return KBROW;
        if (Z > 0.34 && Y < 0.02) return Y < -0.56 ? MZS : MZ;
        return SKIN;
      }
    });
    over.push({ x: 0, y: -0.30, z: 1.02, draw: function (buf, p, near) {
      if (!near) return;
      buf.ellipse(p.x, p.y, 4.0, 2.7, d.muzzle);
      buf.ellipse(p.x, p.y + 1.2, 3.3, 1.3, d.muzzleShade);
      buf.ellipse(p.x - 1.4, p.y - 0.6, 0.8, 0.6, PAL.outline);
      buf.ellipse(p.x + 1.4, p.y - 0.6, 0.8, 0.6, PAL.outline);
    } });
    return { slots: slots, spheres: spheres, over: over, rx: rx, ry: ry };
  }

  /* one cached description per driver type+palette */
  var headDescCache = {};
  function headDesc(d) {
    var key = d.type + '|' + d.skin + '|' + (d.cap || '') + '|' + (d.hair || '') + '|' + (d.shirt || '');
    var v = headDescCache[key];
    if (!v) v = headDescCache[key] = buildHead(d);
    return v;
  }

  function headBuf(d, yaw) {
    var desc = headDesc(d);
    var b = new SMK.PixelBuf(HEAD_W, HEAD_H);
    var ca = Math.cos(yaw), sa = Math.sin(yaw);
    var i;

    /* the head's own ellipsoid geometry, shared by overlays */
    var base = desc.spheres[0];
    var o0 = { cx: HCX, cy: HCY, rx: base.rx, ry: base.ry, rz: base.rz, ca: ca, sa: sa };

    /* overlays behind the head go down first */
    var far = [], near = [];
    for (i = 0; i < desc.over.length; i++) {
      var ov = desc.over[i];
      var p = hpt(o0, ov.x, ov.y, ov.z);
      (p.d > 0.15 ? far : near).push({ ov: ov, p: p, isNear: p.d <= 0.15 });
    }
    for (i = 0; i < far.length; i++) far[i].ov.draw(b, far[i].p, false);

    for (i = 0; i < desc.spheres.length; i++) {
      var sp = desc.spheres[i];
      shadeEllipsoid(b, {
        cx: HCX, cy: HCY - sp.dy * COSP, rx: sp.rx, ry: sp.ry, rz: sp.rz, ca: ca, sa: sa
      }, sp.region, desc.slots);
    }

    for (i = 0; i < near.length; i++) near[i].ov.draw(b, near[i].p, true);

    b.outline(PAL.outline, true);
    return b;
  }

  /* ---------------- frame assembly ---------------- */

  function renderFrame(ch, yaw, steer, roll) {
    var list = [];
    buildKart(list, ch, steer);
    buildDriver(list, ch, steer);

    var pr = new Proj(yaw, roll || 0);
    var buf = new SMK.PixelBuf(FW, FH);
    var items = [];
    var i, j;

    for (i = 0; i < list.length; i++) {
      var it = list[i];
      if (it.kind === 'quad') {
        var pts = [], dsum = 0;
        for (j = 0; j < it.vi.length; j++) {
          var v = it.verts[it.vi[j]];
          var p = pr.pt(v[0], v[1], v[2]);
          pts.push([p.x, p.y]);
          dsum += p.d;
        }
        /* back-face cull using the rotated normal */
        var n = pr.nrm(it.n[0], it.n[1], it.n[2]);
        var facing = -(n[1] * SINP + n[2] * COSP);
        if (facing <= 0.02) continue;
        items.push({ d: dsum / it.vi.length, draw: (function (pts, col) {
          return function () { buf.poly(pts, col); };
        })(pts, it.col) });
      } else if (it.kind === 'wheel') {
        (function (it) {
          var c = pr.pt(it.x, it.y, it.z);
          var a = pr.yaw + it.skew;
          var rx = it.hw * Math.abs(Math.cos(a)) + it.r * Math.abs(Math.sin(a));
          var ry = it.r;
          var sideOn = Math.abs(Math.sin(a));
          items.push({ d: c.d - 0.4, draw: function () {
            buf.ellipse(c.x, c.y, rx, ry, PAL.tyre);
            /* a single thin highlight along the crown of the tyre */
            buf.ellipse(c.x, c.y - ry * 0.60, rx * 0.54, ry * 0.16, PAL.tyreLit);
            if (sideOn > 0.60) {
              var hr = it.r * 0.34;
              buf.ellipse(c.x, c.y, hr, hr, PAL.grey2);
              buf.px(Math.round(c.x), Math.round(c.y), PAL.grey3);
            } else {
              buf.hline(c.x - rx + 1, c.y + ry * 0.24, rx * 2 - 2, PAL.tyreTread);
            }
          } });
        })(it);
      } else if (it.kind === 'blob') {
        if (it.facingMin !== undefined && -Math.cos(pr.yaw) < it.facingMin) continue;
        (function (it) {
          var c = pr.pt(it.x, it.y, it.z);
          items.push({ d: c.d, draw: function () {
            buf.ellipse(c.x, c.y, it.r, it.r * 0.92, it.col);
            if (it.col2) buf.ellipse(c.x, c.y + it.r * 0.45, it.r * 0.8, it.r * 0.4, it.col2);
            if (it.rim) buf.ellipse(c.x, c.y - it.r * 0.4, it.r * 0.6, it.r * 0.3, it.rim);
          } });
        })(it);
      } else if (it.kind === 'ring') {
        if (it.facingMin !== undefined && -Math.cos(pr.yaw) < it.facingMin) continue;
        (function (it) {
          var c = pr.pt(it.x, it.y, it.z);
          var a = pr.yaw;
          var rx = 0.8 + it.r * Math.abs(Math.sin(a + Math.PI / 2));
          items.push({ d: c.d, draw: function () {
            buf.ellipse(c.x, c.y, Math.max(1, rx), it.r * 0.75, it.col);
            buf.ellipse(c.x, c.y, Math.max(0.6, rx - 1.2), it.r * 0.75 - 1.2, 0);
          } });
        })(it);
      } else if (it.kind === 'plate') {
        (function (it) {
          var c = pr.pt(0, it.y, it.z);
          var vis = pr.pt(0, it.y, it.z - 1).d < c.d;
          items.push({ d: c.d - 0.3, draw: function () {
            if (!vis) return;
            var w = 3.4 * Math.abs(Math.cos(pr.yaw));
            if (w < 1.6) return;
            buf.ellipse(c.x, c.y, w, 1.4, PAL.grey4);
          } });
        })(it);
      } else if (it.kind === 'head') {
        (function (it) {
          var c = pr.pt(it.x, it.y, it.z);
          var hb = headBuf(it.driver, pr.yaw);
          items.push({ d: c.d - 1.2, draw: function () {
            buf.blit(hb, Math.round(c.x - HCX), Math.round(c.y - HCY));
          } });
        })(it);
      }
    }

    items.sort(function (a, b) { return b.d - a.d; });
    for (i = 0; i < items.length; i++) items[i].draw();

    buf.outline(PAL.outline, false);
    return buf;
  }

  /* ---------------- sheet cache ---------------- */

  var STEERS = [-1, 0, 1];     /* index 0,1,2 */
  var cache = {};

  function bake(ch) {
    if (cache[ch.id]) return cache[ch.id];

    var sheet = { frames: [], canvases: [], id: ch.id };
    var s, a;

    for (s = 0; s < STEERS.length; s++) {
      var steer = STEERS[s];
      var row = new Array(ANGLES);
      var crow = new Array(ANGLES);

      /* headings 0..8 are drawn; 9..15 mirror 7..1 */
      for (a = 0; a < HALF; a++) {
        var yaw = a * (SMK.TAU / ANGLES);
        var roll = -steer * 0.055;
        row[a] = renderFrame(ch, yaw, steer, roll);
      }
      for (a = HALF; a < ANGLES; a++) row[a] = null;   /* filled below */

      sheet.frames.push(row);
      sheet.canvases.push(crow);
    }

    /* mirrored halves reuse the opposite steering row so the wheels
       still point the right way once the sprite is flipped */
    for (s = 0; s < STEERS.length; s++) {
      var mirrorRow = sheet.frames[STEERS.length - 1 - s];
      for (a = HALF; a < ANGLES; a++) {
        var src = mirrorRow[ANGLES - a];
        sheet.frames[s][a] = src ? src.flipX() : new SMK.PixelBuf(FW, FH);
      }
    }

    for (s = 0; s < STEERS.length; s++)
      for (a = 0; a < ANGLES; a++)
        sheet.canvases[s][a] = sheet.frames[s][a].toCanvas();

    cache[ch.id] = sheet;
    return sheet;
  }

  /* pre-tinted copies for the star / squash states, built on demand.
     These stay as PixelBufs because the game blits in software. */
  function variant(ch, key, make) {
    var sheet = bake(ch);
    if (!sheet[key]) {
      var out = [];
      for (var s = 0; s < STEERS.length; s++) {
        var row = [];
        for (var a = 0; a < ANGLES; a++) row.push(make(sheet.frames[s][a]));
        out.push(row);
      }
      sheet[key] = out;
    }
    return sheet[key];
  }

  function wrapAngle16(a) { return ((a % ANGLES) + ANGLES) % ANGLES; }
  function steerSlot(steer) { return steer < -0.33 ? 0 : (steer > 0.33 ? 2 : 1); }

  SMK.kartArt = {
    FRAME_W: FW,
    FRAME_H: FH,
    ANCHOR_X: AX,
    GROUND_Y: GY,
    ANGLES: ANGLES,
    bake: bake,

    /* the normal sprite for a heading (0..15) and steer (-1..1) */
    frame: function (ch, angleIndex, steer) {
      return bake(ch).frames[steerSlot(steer)][wrapAngle16(angleIndex)];
    },

    /* canvas of the same, for menus that want a plain image */
    canvas: function (ch, angleIndex, steer) {
      return bake(ch).canvases[steerSlot(steer)][wrapAngle16(angleIndex)];
    },

    /* star power: the whole kart flashes through four colours */
    starFrame: function (ch, angleIndex, steer, phase) {
      var tints = ['#ffffff', '#ffe040', '#40e0ff', '#ff70c0'];
      var t = tints[phase % tints.length];
      /* enough to read as flashing, not so much that the kart becomes
         a coloured blob — the shape still has to be legible */
      var rows = variant(ch, 'star' + (phase % tints.length), function (buf) {
        return buf.clone().tint(t, 0.26).brighten(1.16);
      });
      return rows[steerSlot(steer)][wrapAngle16(angleIndex)];
    },

    /* flattened by lightning or a Thwomp: squat and spread */
    squashFrame: function (ch, angleIndex, amount) {
      var q = Math.max(1, Math.min(4, Math.round(amount * 4)));
      var k = q / 4;
      var rows = variant(ch, 'squash' + q, function (buf) {
        var h = Math.max(4, Math.round(FH * (1 - 0.66 * k)));
        var out = new SMK.PixelBuf(FW, FH);
        var wgrow = 1 + 0.30 * k;
        for (var y = 0; y < h; y++) {
          var sy = Math.floor(y / h * FH);
          for (var x = 0; x < FW; x++) {
            var sx = Math.round(AX + (x - AX) / wgrow);
            if (sx < 0 || sx >= FW) continue;
            var v = buf.data[sy * FW + sx];
            if (v) out.data[(GY - h + y + 1) * FW + x] = v;
          }
        }
        return out;
      });
      return rows[1][wrapAngle16(angleIndex)];
    },

    /* debug: one long strip of every frame */
    sheetStrip: function (ch) {
      var sheet = bake(ch);
      var buf = new SMK.PixelBuf(FW * ANGLES, FH * STEERS.length);
      for (var s = 0; s < STEERS.length; s++)
        for (var a = 0; a < ANGLES; a++)
          buf.blit(sheet.frames[s][a], a * FW, s * FH);
      return buf;
    }
  };

})(window.SMK);
