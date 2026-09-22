/* ------------------------------------------------------------------
   pixel.js — a tiny pixel-art rasteriser.

   All sprite art in the game is drawn through PixelBuf rather than the
   2D canvas API, because canvas anti-aliases everything and 16-bit art
   lives or dies on hard pixel edges.  Every primitive here writes whole
   pixels only, into a Uint32Array of packed ABGR words (index 0 == the
   transparent colour-0 of a real SNES tile).
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var TRANSPARENT = 0;

  function toU32(c) {
    if (c === null || c === undefined) return TRANSPARENT;
    if (typeof c === 'number') return c >>> 0;
    return SMK.u32(c);
  }

  function PixelBuf(w, h) {
    this.w = w | 0;
    this.h = h | 0;
    this.data = new Uint32Array(this.w * this.h);
  }
  SMK.PixelBuf = PixelBuf;
  PixelBuf.TRANSPARENT = TRANSPARENT;

  var P = PixelBuf.prototype;

  P.clone = function () {
    var b = new PixelBuf(this.w, this.h);
    b.data.set(this.data);
    return b;
  };

  P.clear = function (c) {
    this.data.fill(toU32(c));
    return this;
  };

  P.get = function (x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return TRANSPARENT;
    return this.data[y * this.w + x];
  };

  /* plot, with bounds check — the workhorse */
  P.px = function (x, y, c) {
    x = x | 0; y = y | 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    var v = toU32(c);
    if (v !== TRANSPARENT) this.data[y * this.w + x] = v;
    return this;
  };

  /* plot that is allowed to punch holes (used for erasing) */
  P.pxRaw = function (x, y, c) {
    x = x | 0; y = y | 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.data[y * this.w + x] = toU32(c);
    return this;
  };

  P.hline = function (x, y, len, c) {
    var v = toU32(c);
    if (v === TRANSPARENT) return this;
    y = y | 0;
    if (y < 0 || y >= this.h) return this;
    var x0 = Math.max(0, x | 0), x1 = Math.min(this.w, (x | 0) + (len | 0));
    var row = y * this.w;
    for (var i = x0; i < x1; i++) this.data[row + i] = v;
    return this;
  };

  P.vline = function (x, y, len, c) {
    var v = toU32(c);
    if (v === TRANSPARENT) return this;
    x = x | 0;
    if (x < 0 || x >= this.w) return this;
    var y0 = Math.max(0, y | 0), y1 = Math.min(this.h, (y | 0) + (len | 0));
    for (var j = y0; j < y1; j++) this.data[j * this.w + x] = v;
    return this;
  };

  P.rect = function (x, y, w, h, c) {
    for (var j = 0; j < h; j++) this.hline(x, (y | 0) + j, w, c);
    return this;
  };

  P.frame = function (x, y, w, h, c) {
    this.hline(x, y, w, c);
    this.hline(x, y + h - 1, w, c);
    this.vline(x, y, h, c);
    this.vline(x + w - 1, y, h, c);
    return this;
  };

  /* Bresenham */
  P.line = function (x0, y0, x1, y1, c) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    var err = dx - dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      var e2 = err * 2;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
    return this;
  };

  /* filled ellipse, integer-symmetric so it never looks lopsided */
  P.ellipse = function (cx, cy, rx, ry, c) {
    if (rx <= 0 || ry <= 0) return this;
    var y, x, dy, w;
    for (y = -ry; y <= ry; y++) {
      dy = (y + 0.5) / (ry + 0.5);
      w = Math.sqrt(Math.max(0, 1 - dy * dy)) * (rx + 0.5);
      x = Math.round(w);
      if (x <= 0) continue;
      this.hline(Math.round(cx - x + 0.5), Math.round(cy + y), x * 2 - 1, c);
    }
    return this;
  };

  P.ellipseOutline = function (cx, cy, rx, ry, c) {
    var inner = this.clone();
    this.ellipse(cx, cy, rx, ry, c);
    /* punch the interior back out */
    var b = new PixelBuf(this.w, this.h);
    b.ellipse(cx, cy, rx - 1, ry - 1, 0xff000001);
    for (var i = 0; i < this.data.length; i++) {
      if (b.data[i]) this.data[i] = inner.data[i];
    }
    return this;
  };

  P.circle = function (cx, cy, r, c) { return this.ellipse(cx, cy, r, r, c); };

  /* even-odd scanline polygon fill. pts = [[x,y],...] */
  P.poly = function (pts, c) {
    var n = pts.length;
    if (n < 3) return this;
    var minY = Infinity, maxY = -Infinity, i;
    for (i = 0; i < n; i++) {
      if (pts[i][1] < minY) minY = pts[i][1];
      if (pts[i][1] > maxY) maxY = pts[i][1];
    }
    var y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(this.h - 1, Math.ceil(maxY));
    var xs = [];
    for (var y = y0; y <= y1; y++) {
      var sy = y + 0.5;
      xs.length = 0;
      for (i = 0; i < n; i++) {
        var a = pts[i], b = pts[(i + 1) % n];
        var ay = a[1], by = b[1];
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) {
          var t = (sy - ay) / (by - ay);
          xs.push(a[0] + t * (b[0] - a[0]));
        }
      }
      if (!xs.length) continue;
      xs.sort(function (p, q) { return p - q; });
      for (i = 0; i + 1 < xs.length; i += 2) {
        var xa = Math.round(xs[i]), xb = Math.round(xs[i + 1]);
        if (xb > xa) this.hline(xa, y, xb - xa, c);
        else this.px(xa, y, c);
      }
    }
    return this;
  };

  P.polyline = function (pts, c, close) {
    for (var i = 0; i + 1 < pts.length; i++)
      this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c);
    if (close && pts.length > 2) {
      var l = pts.length - 1;
      this.line(pts[l][0], pts[l][1], pts[0][0], pts[0][1], c);
    }
    return this;
  };

  /* ---- ASCII sprite maps -------------------------------------------
     rows: array of equal-length strings, map: {char: colour}.
     '.' and ' ' are always transparent.                              */
  P.stamp = function (x, y, rows, map) {
    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];
      for (var i = 0; i < row.length; i++) {
        var ch = row.charAt(i);
        if (ch === '.' || ch === ' ') continue;
        var c = map[ch];
        if (c === undefined || c === null) continue;
        this.px(x + i, y + j, c);
      }
    }
    return this;
  };

  PixelBuf.fromRows = function (rows, map) {
    var w = 0;
    for (var i = 0; i < rows.length; i++) if (rows[i].length > w) w = rows[i].length;
    var b = new PixelBuf(w, rows.length);
    b.stamp(0, 0, rows, map);
    return b;
  };

  /* ---- compositing ---- */

  P.blit = function (src, dx, dy) {
    dx |= 0; dy |= 0;
    for (var j = 0; j < src.h; j++) {
      var ty = dy + j;
      if (ty < 0 || ty >= this.h) continue;
      var srow = j * src.w, trow = ty * this.w;
      for (var i = 0; i < src.w; i++) {
        var v = src.data[srow + i];
        if (v === TRANSPARENT) continue;
        var tx = dx + i;
        if (tx < 0 || tx >= this.w) continue;
        this.data[trow + tx] = v;
      }
    }
    return this;
  };

  P.blitFlipX = function (src, dx, dy) {
    dx |= 0; dy |= 0;
    for (var j = 0; j < src.h; j++) {
      var ty = dy + j;
      if (ty < 0 || ty >= this.h) continue;
      var srow = j * src.w, trow = ty * this.w;
      for (var i = 0; i < src.w; i++) {
        var v = src.data[srow + i];
        if (v === TRANSPARENT) continue;
        var tx = dx + (src.w - 1 - i);
        if (tx < 0 || tx >= this.w) continue;
        this.data[trow + tx] = v;
      }
    }
    return this;
  };

  P.flipX = function () {
    var b = new PixelBuf(this.w, this.h);
    b.blitFlipX(this, 0, 0);
    return b;
  };

  /* nearest-neighbour integer scale */
  P.scaleUp = function (k) {
    var b = new PixelBuf(this.w * k, this.h * k);
    for (var j = 0; j < this.h; j++) {
      for (var i = 0; i < this.w; i++) {
        var v = this.data[j * this.w + i];
        if (v === TRANSPARENT) continue;
        for (var jj = 0; jj < k; jj++)
          for (var ii = 0; ii < k; ii++)
            b.data[(j * k + jj) * b.w + (i * k + ii)] = v;
      }
    }
    return b;
  };

  /* ---- post-process passes ---- */

  /* 1px hard outline around every opaque run — the classic SNES sprite key line */
  P.outline = function (c, alsoDiagonal) {
    var v = toU32(c), out = [], w = this.w, h = this.h, d = this.data;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (d[y * w + x] !== TRANSPARENT) continue;
        var hit =
          (x > 0 && d[y * w + x - 1] !== TRANSPARENT) ||
          (x < w - 1 && d[y * w + x + 1] !== TRANSPARENT) ||
          (y > 0 && d[(y - 1) * w + x] !== TRANSPARENT) ||
          (y < h - 1 && d[(y + 1) * w + x] !== TRANSPARENT);
        if (!hit && alsoDiagonal) {
          hit =
            (x > 0 && y > 0 && d[(y - 1) * w + x - 1] !== TRANSPARENT) ||
            (x < w - 1 && y > 0 && d[(y - 1) * w + x + 1] !== TRANSPARENT) ||
            (x > 0 && y < h - 1 && d[(y + 1) * w + x - 1] !== TRANSPARENT) ||
            (x < w - 1 && y < h - 1 && d[(y + 1) * w + x + 1] !== TRANSPARENT);
        }
        if (hit) out.push(y * w + x);
      }
    }
    for (var i = 0; i < out.length; i++) d[out[i]] = v;
    return this;
  };

  /* recolour every pixel matching `from` (exact match) */
  P.swap = function (from, to) {
    var f = toU32(from), t = toU32(to);
    for (var i = 0; i < this.data.length; i++) if (this.data[i] === f) this.data[i] = t;
    return this;
  };

  /* flatten every opaque pixel to one colour — silhouettes, star flash */
  P.silhouette = function (c) {
    var v = toU32(c);
    for (var i = 0; i < this.data.length; i++) if (this.data[i] !== TRANSPARENT) this.data[i] = v;
    return this;
  };

  P.brighten = function (k) {
    for (var i = 0; i < this.data.length; i++) {
      var v = this.data[i];
      if (v !== TRANSPARENT) this.data[i] = SMK.scaleU32(v, k);
    }
    return this;
  };

  P.tint = function (hex, t) {
    var tw = toU32(hex);
    for (var i = 0; i < this.data.length; i++) {
      var v = this.data[i];
      if (v !== TRANSPARENT) this.data[i] = SMK.tintU32(v, tw, t);
    }
    return this;
  };

  /* trim fully-transparent border, returning {buf, ox, oy} */
  P.trim = function () {
    var minX = this.w, minY = this.h, maxX = -1, maxY = -1;
    for (var y = 0; y < this.h; y++) {
      for (var x = 0; x < this.w; x++) {
        if (this.data[y * this.w + x] === TRANSPARENT) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < 0) return { buf: new PixelBuf(1, 1), ox: 0, oy: 0 };
    var b = new PixelBuf(maxX - minX + 1, maxY - minY + 1);
    for (var j = 0; j < b.h; j++)
      for (var i = 0; i < b.w; i++)
        b.data[j * b.w + i] = this.data[(minY + j) * this.w + (minX + i)];
    return { buf: b, ox: minX, oy: minY };
  };

  /* ---- hand-off to the GPU ---- */

  P.toCanvas = function () {
    var cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    var ctx = cv.getContext('2d');
    var img = ctx.createImageData(this.w, this.h);
    new Uint32Array(img.data.buffer).set(this.data);
    ctx.putImageData(img, 0, 0);
    return cv;
  };

  /* draw straight into an existing ImageData-backed Uint32Array view */
  P.blitToU32 = function (dst, dstW, dstH, dx, dy) {
    dx |= 0; dy |= 0;
    for (var j = 0; j < this.h; j++) {
      var ty = dy + j;
      if (ty < 0 || ty >= dstH) continue;
      var srow = j * this.w, trow = ty * dstW;
      for (var i = 0; i < this.w; i++) {
        var v = this.data[srow + i];
        if (v === TRANSPARENT) continue;
        var tx = dx + i;
        if (tx < 0 || tx >= dstW) continue;
        dst[trow + tx] = v;
      }
    }
  };

})(window.SMK);
