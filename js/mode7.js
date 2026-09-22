/* ------------------------------------------------------------------
   mode7.js — the pseudo-3D ground plane.

   The SNES' Mode 7 took one big background layer and applied a
   different affine transform on every scanline, which is exactly what
   this does: walk down the screen, work out how far ahead that row of
   pixels lands on the ground, then step across the row sampling a
   1024x1024 track texture.

   Two deliberate departures from the hardware:

   * mip pyramid.  Point-sampling a 1024px texture at the horizon
     shimmers violently.  The real console just lived with it; we pick a
     mip level from the texel-per-pixel ratio instead, which keeps the
     distance readable without softening the near road.
   * optional supersampling ("HD Mode 7"), averaging 2x2 samples per
     output pixel.  Off by default so the authentic look is the default.

   Kept from the hardware: colour-0 in the texture means "no ground
   here", which is how Rainbow Road and Ghost Valley have their track
   float in the void, and a per-scanline horizontal warp hook, which is
   how HDMA tricks like heat shimmer and Rainbow Road's sway were done.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var MIP_LEVELS = 4;

  /* ---- mip pyramid over a packed-ABGR track texture ---- */
  SMK.buildMips = function (tex, size) {
    var mips = [{ data: tex, size: size, shift: 0 }];
    var src = tex, ssize = size;
    for (var l = 1; l < MIP_LEVELS; l++) {
      var dsize = ssize >> 1;
      if (dsize < 8) break;
      var dst = new Uint32Array(dsize * dsize);
      for (var y = 0; y < dsize; y++) {
        var s0 = (y * 2) * ssize, s1 = (y * 2 + 1) * ssize;
        for (var x = 0; x < dsize; x++) {
          var x0 = x * 2, x1 = x * 2 + 1;
          var a = src[s0 + x0], b = src[s0 + x1], c = src[s1 + x0], d = src[s1 + x1];
          /* average only the opaque texels so void edges stay crisp */
          var n = 0, r = 0, g = 0, bl = 0;
          if (a) { n++; r += a & 255; g += (a >>> 8) & 255; bl += (a >>> 16) & 255; }
          if (b) { n++; r += b & 255; g += (b >>> 8) & 255; bl += (b >>> 16) & 255; }
          if (c) { n++; r += c & 255; g += (c >>> 8) & 255; bl += (c >>> 16) & 255; }
          if (d) { n++; r += d & 255; g += (d >>> 8) & 255; bl += (d >>> 16) & 255; }
          dst[y * dsize + x] = n < 2 ? 0 :
            ((255 << 24) | (SMK.q5(bl / n) << 16) | (SMK.q5(g / n) << 8) | SMK.q5(r / n)) >>> 0;
        }
      }
      mips.push({ data: dst, size: dsize, shift: l });
      src = dst; ssize = dsize;
    }
    return mips;
  };

  /* ------------------------------------------------------------------
     Mode7(width, height) — `height` is the ground viewport height, not
     the whole screen: the classic layout gives the road the top half
     and the course map the bottom half.
     ------------------------------------------------------------------ */
  function Mode7(width, height) {
    this.w = width;
    this.h = height;
    this.cam = {
      x: 512, y: 512,
      angle: 0,
      height: 42,
      horizon: 40,          /* row of the vanishing line, within the viewport */
      fovTan: 0.625,        /* tan(half horizontal fov) ~ 64 deg total       */
      focal: 160,           /* camera.height * focal sets the depth scale    */
      roll: 0               /* screen-space lean, used on big drifts         */
    };
    this.supersample = false;
    this.fogStrength = 0.0;
    this.fogColor = SMK.u32('#8090c0');
  }
  SMK.Mode7 = Mode7;
  var M = Mode7.prototype;

  M.resize = function (w, h) { this.w = w; this.h = h; };

  /* ---- world <-> screen ----------------------------------------- */

  /* project a world point (wx, wy) at height wz onto the viewport.
     Returns null when it is behind the near plane. */
  M.project = function (wx, wy, wz) {
    var c = this.cam;
    var ca = Math.cos(c.angle), sa = Math.sin(c.angle);
    var rx = wx - c.x, ry = wy - c.y;
    var fwd = rx * ca + ry * sa;          /* distance ahead of the camera */
    if (fwd < 1) return null;
    var side = -rx * sa + ry * ca;
    var eye = c.height - (wz || 0);
    var halfSpan = fwd * c.fovTan;
    var sx = this.w * 0.5 + (side / halfSpan) * (this.w * 0.5);
    var sy = c.horizon + (eye * c.focal) / fwd;
    return {
      x: sx,
      y: sy,
      /* pixels per world unit — sprites multiply their art size by this */
      scale: (this.w * 0.5) / halfSpan,
      depth: fwd,
      side: side
    };
  };

  /* how far ahead a given viewport row lands on the ground */
  M.depthAtRow = function (row) {
    var c = this.cam;
    var dy = row - c.horizon;
    if (dy <= 0) return Infinity;
    return (c.height * c.focal) / dy;
  };

  /* ---- sky / background ------------------------------------------ */

  /* bg: { data:Uint32Array, w, h } panorama, tiled horizontally.
     It scrolls with the camera heading and is clipped to the horizon. */
  M.renderSky = function (dst, dstW, originX, originY, bg, groundFallback) {
    var c = this.cam;
    var hz = Math.floor(c.horizon);
    var rows = Math.min(hz, this.h);
    if (rows <= 0) return;

    /* one full turn scrolls the panorama exactly once */
    var scroll = (c.angle / SMK.TAU) * bg.w;
    var baseCol = Math.floor(scroll) % bg.w;
    if (baseCol < 0) baseCol += bg.w;

    /* the panorama's bottom row sits on the horizon */
    var srcBottom = bg.h;
    for (var y = 0; y < rows; y++) {
      var sy = srcBottom - rows + y;
      if (sy < 0) sy = 0;
      var srow = sy * bg.w;
      var trow = (originY + y) * dstW + originX;
      var col = baseCol;
      for (var x = 0; x < this.w; x++) {
        dst[trow + x] = bg.data[srow + col];
        col++; if (col >= bg.w) col = 0;
      }
    }
    /* if the horizon sits below the viewport top, nothing else to do;
       rows between `rows` and horizon (fractional) are covered by the
       ground pass. */
    if (groundFallback !== undefined && hz > this.h) {
      for (var yy = 0; yy < this.h; yy++) {
        var tr = (originY + yy) * dstW + originX;
        for (var xx = 0; xx < this.w; xx++) dst[tr + xx] = groundFallback;
      }
    }
  };

  /* ---- the ground ------------------------------------------------- */

  /* track: { mips, size, voidColor }
     warp:  optional function(row, depth) -> horizontal offset in world units
            (the HDMA trick: heat shimmer, Rainbow Road's sway)            */
  M.renderGround = function (dst, dstW, originX, originY, track, warp) {
    var c = this.cam;
    var W = this.w, H = this.h;
    var mips = track.mips, nMips = mips.length;
    var texSize = track.size;
    var voidCol = track.voidColor === undefined ? 0 : track.voidColor;
    var fogK = this.fogStrength, fogCol = this.fogColor;

    var ca = Math.cos(c.angle), sa = Math.sin(c.angle);
    /* forward and right unit vectors on the ground plane */
    var fx = ca, fy = sa;
    var rgx = -sa, rgy = ca;

    var depthScale = c.height * c.focal;
    var hz = c.horizon;
    var ss = this.supersample;

    var y0 = Math.max(0, Math.ceil(hz + 0.0001));
    var rollK = c.roll;

    for (var y = y0; y < H; y++) {
      var dy = y - hz;
      if (dy <= 0) continue;
      var z = depthScale / dy;

      /* half the ground span covered by this row */
      var halfSpan = z * c.fovTan;
      var cxw = c.x + fx * z;
      var cyw = c.y + fy * z;

      if (warp) {
        var off = warp(y, z);
        if (off) { cxw += rgx * off; cyw += rgy * off; }
      }
      if (rollK) {
        /* a screen-space lean reads as the kart banking into a slide */
        var lean = rollK * (y - hz) * 0.5;
        cxw += rgx * lean; cyw += rgy * lean;
      }

      var stepX = rgx * (2 * halfSpan / W);
      var stepY = rgy * (2 * halfSpan / W);
      var sx = cxw - rgx * halfSpan;
      var sy = cyw - rgy * halfSpan;

      /* pick a mip from how many texels one output pixel spans */
      var texelStep = Math.sqrt(stepX * stepX + stepY * stepY);
      var lvl = 0;
      if (texelStep > 1) {
        lvl = Math.floor(Math.log(texelStep) / Math.LN2);
        if (lvl < 0) lvl = 0;
        if (lvl > nMips - 1) lvl = nMips - 1;
      }
      var mip = mips[lvl], mdata = mip.data, msize = mip.size, mmask = msize - 1;
      var mscale = msize / texSize;

      /* per-row fog, strongest at the horizon */
      var fog = 0;
      if (fogK > 0) {
        fog = fogK * (1 - dy / (H - hz));
        if (fog < 0) fog = 0;
        if (fog > fogK) fog = fogK;
      }

      var trow = (originY + y) * dstW + originX;
      var wrap = track.wrap;
      var px = sx * mscale, py = sy * mscale;
      var dpx = stepX * mscale, dpy = stepY * mscale;

      if (ss) {
        /* HD mode: average two samples per pixel along the scanline */
        var hpx = dpx * 0.5, hpy = dpy * 0.5;
        for (var x = 0; x < W; x++) {
          var t0 = fetch(mdata, msize, mmask, px, py, wrap, voidCol);
          var t1 = fetch(mdata, msize, mmask, px + hpx, py + hpy, wrap, voidCol);
          var v;
          if (t0 === 0 || t1 === 0) v = (t0 === 0 && t1 === 0) ? voidCol : (t0 || t1);
          else v = avg2(t0, t1);
          if (fog > 0) v = SMK.tintU32(v, fogCol, fog);
          dst[trow + x] = v;
          px += dpx; py += dpy;
        }
      } else {
        for (var x2 = 0; x2 < W; x2++) {
          var tv = fetch(mdata, msize, mmask, px, py, wrap, voidCol);
          if (tv === 0) tv = voidCol;
          else if (fog > 0) tv = SMK.tintU32(tv, fogCol, fog);
          dst[trow + x2] = tv;
          px += dpx; py += dpy;
        }
      }
    }
  };

  function fetch(data, size, mask, px, py, wrap, voidCol) {
    var ix = px | 0, iy = py | 0;
    if (px < 0) ix--;
    if (py < 0) iy--;
    if (wrap) { ix &= mask; iy &= mask; }
    else if (ix < 0 || iy < 0 || ix >= size || iy >= size) return 0;
    return data[iy * size + ix];
  }

  function avg2(a, b) {
    return ((255 << 24) |
      (SMK.q5((((a >>> 16) & 255) + ((b >>> 16) & 255)) >> 1) << 16) |
      (SMK.q5((((a >>> 8) & 255) + ((b >>> 8) & 255)) >> 1) << 8) |
      SMK.q5(((a & 255) + (b & 255)) >> 1)) >>> 0;
  }

  /* ---- sampling helpers used by physics ---- */

  /* nearest texel of the full-resolution surface map */
  SMK.sampleSurface = function (track, wx, wy) {
    var s = track.size;
    var ix = Math.floor(wx), iy = Math.floor(wy);
    if (track.wrap) { ix &= (s - 1); iy &= (s - 1); }
    else if (ix < 0 || iy < 0 || ix >= s || iy >= s) return SMK.SURF.VOID;
    return track.surface[iy * s + ix];
  };

})(window.SMK);
