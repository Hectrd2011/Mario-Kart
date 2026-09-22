/* ------------------------------------------------------------------
   art_ui.js — software blitting, text, HUD chrome and title art.

   The whole game composites into one Uint32Array and reaches the
   canvas through a single putImageData.  Nothing goes through
   drawImage, so no GPU filtering can soften a pixel that the SNES
   would have shown hard: sprite scaling here is honest
   nearest-neighbour, the way a console with no scaler did it.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var PAL = SMK.PAL;

  /* ------------------------------------------------------------------
     blitScaled — nearest-neighbour sprite blit into the frame buffer.
     `dw`/`dh` are the destination size in pixels; `tint` optionally
     blends the sprite toward a colour (distance shading, star flash).
     ------------------------------------------------------------------ */
  SMK.blitScaled = function (dst, dstW, dstH, src, dx, dy, dw, dh, opt) {
    dw = Math.round(dw); dh = Math.round(dh);
    if (dw <= 0 || dh <= 0) return;
    dx = Math.round(dx); dy = Math.round(dy);
    opt = opt || {};
    var flip = opt.flipX;
    var sw = src.w, sh = src.h, sdata = src.data;

    /* clip, optionally to a band tighter than the frame — the race
       viewport is only the top half of the screen */
    var cy0 = opt.clipY0 === undefined ? 0 : opt.clipY0;
    var cy1 = opt.clipY1 === undefined ? dstH : opt.clipY1;
    var cx0 = opt.clipX0 === undefined ? 0 : opt.clipX0;
    var cx1 = opt.clipX1 === undefined ? dstW : opt.clipX1;
    var x0 = dx < cx0 ? cx0 - dx : 0;
    var y0 = dy < cy0 ? cy0 - dy : 0;
    var x1 = dx + dw > cx1 ? cx1 - dx : dw;
    var y1 = dy + dh > cy1 ? cy1 - dy : dh;
    if (x1 <= x0 || y1 <= y0) return;

    var xr = sw / dw, yr = sh / dh;
    var tint = opt.tint, tintAmt = opt.tintAmount || 0;
    var dark = opt.darken;
    var alphaHalf = opt.stipple;   /* 50% dither, for ghosts and blinking */

    for (var y = y0; y < y1; y++) {
      var sy = (y * yr) | 0;
      if (sy >= sh) sy = sh - 1;
      var srow = sy * sw;
      var trow = (dy + y) * dstW;
      for (var x = x0; x < x1; x++) {
        if (alphaHalf && (((dx + x) ^ (dy + y)) & 1)) continue;
        var sx = (x * xr) | 0;
        if (sx >= sw) sx = sw - 1;
        var v = sdata[srow + (flip ? sw - 1 - sx : sx)];
        if (v === 0) continue;
        if (dark) v = SMK.scaleU32(v, dark);
        if (tintAmt) v = SMK.tintU32(v, tint, tintAmt);
        dst[trow + dx + x] = v;
      }
    }
  };

  /* plain 1:1 blit of a PixelBuf into the frame */
  SMK.blit = function (dst, dstW, dstH, src, dx, dy, opt) {
    SMK.blitScaled(dst, dstW, dstH, src, dx, dy, src.w, src.h, opt);
  };

  /* filled rectangle straight into the frame */
  SMK.fillRect = function (dst, dstW, dstH, x, y, w, h, colour) {
    var c = typeof colour === 'number' ? colour : SMK.u32(colour);
    var x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0);
    var x1 = Math.min(dstW, (x | 0) + (w | 0)), y1 = Math.min(dstH, (y | 0) + (h | 0));
    for (var j = y0; j < y1; j++) {
      var row = j * dstW;
      for (var i = x0; i < x1; i++) dst[row + i] = c;
    }
  };

  /* 50% checkerboard wash — the SNES way to fake translucency */
  SMK.ditherRect = function (dst, dstW, dstH, x, y, w, h, colour) {
    var c = typeof colour === 'number' ? colour : SMK.u32(colour);
    var x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0);
    var x1 = Math.min(dstW, (x | 0) + (w | 0)), y1 = Math.min(dstH, (y | 0) + (h | 0));
    for (var j = y0; j < y1; j++) {
      var row = j * dstW;
      for (var i = x0; i < x1; i++) if (((i ^ j) & 1) === 0) dst[row + i] = c;
    }
  };

  /* ------------------------------------------------------------------
     Text — per-glyph cache, so a clock that changes every frame costs
     nothing beyond a handful of blits.
     ------------------------------------------------------------------ */
  var STYLES = {
    hud:    { color: '#ffffff', outline: '#000000' },
    hudY:   { color: '#ffd800', outline: '#000000' },
    hudR:   { color: '#ff4040', outline: '#000000' },
    hudG:   { color: '#58e058', outline: '#000000' },
    hudDim: { color: '#9098b0', outline: '#000000' },
    big:    { color: '#ffffff', outline: '#000000', scale: 2 },
    bigY:   { color: '#ffd800', outline: '#000000', scale: 2 },
    /* the original leaned its position numerals; so do we */
    pos:    { color: '#ffffff', outline: '#000000', scale: 3, shear: 0.16 },
    posSm:  { color: '#ffffff', outline: '#000000', scale: 2, shear: 0.16 },
    menu:   { color: '#ffffff', outline: '#000000', shadow: '#303048', shadowDx: 1, shadowDy: 1 },
    menuSel: { color: '#ffd800', outline: '#000000', shadow: '#603000', shadowDx: 1, shadowDy: 1 },
    menuDim: { color: '#788098', outline: '#000000' },
    title:  { color: '#ffd800', color2: '#f87800', outline: '#000000', scale: 2, shear: 0.14 }
  };

  var glyphCache = {};

  function glyphFor(styleName, ch) {
    var key = styleName + ch;
    var g = glyphCache[key];
    if (g !== undefined) return g;
    var st = STYLES[styleName] || STYLES.hud;
    if (ch === ' ' || !SMK.font.has(ch.toUpperCase())) {
      glyphCache[key] = null;
      return null;
    }
    var scale = st.scale || 1;
    var pad = 3 + Math.ceil((st.shear || 0) * SMK.font.H * scale);
    var b = new SMK.PixelBuf(SMK.font.W * scale + pad * 2, SMK.font.H * scale + 6);
    SMK.font.draw(b, pad, 2, ch, {
      color: st.color, color2: st.color2, outline: st.outline,
      shadow: st.shadow, shadowDx: st.shadowDx, shadowDy: st.shadowDy,
      scale: scale, shear: st.shear, tracking: 0
    });
    var t = b.trim();
    g = glyphCache[key] = { buf: t.buf, ox: t.ox - pad, oy: t.oy - 2 };
    return g;
  }

  function styleAdvance(styleName) {
    var st = STYLES[styleName] || STYLES.hud;
    var scale = st.scale || 1;
    var tracking = st.tracking === undefined ? 1 : st.tracking;
    return (SMK.font.W + tracking) * scale;
  }

  var Text = {
    styles: STYLES,
    advance: styleAdvance,
    height: function (styleName) {
      var st = STYLES[styleName] || STYLES.hud;
      return SMK.font.H * (st.scale || 1);
    },
    measure: function (str, styleName) {
      var st = STYLES[styleName] || STYLES.hud;
      var scale = st.scale || 1;
      var tracking = st.tracking === undefined ? 1 : st.tracking;
      var n = String(str).length;
      if (!n) return 0;
      return n * (SMK.font.W + tracking) * scale - tracking * scale;
    },
    /* opt: { align: 'left'|'center'|'right' } */
    draw: function (dst, dstW, dstH, x, y, str, styleName, opt) {
      str = String(str).toUpperCase();
      opt = opt || {};
      var adv = styleAdvance(styleName);
      var w = Text.measure(str, styleName);
      if (opt.align === 'center') x = Math.round(x - w / 2);
      else if (opt.align === 'right') x = Math.round(x - w);
      x = x | 0; y = y | 0;
      for (var i = 0; i < str.length; i++) {
        var g = glyphFor(styleName, str.charAt(i));
        if (g) SMK.blit(dst, dstW, dstH, g.buf, x + g.ox, y + g.oy, opt.blitOpt);
        x += adv;
      }
      return w;
    },
    /* same, but into a PixelBuf (used when baking panels) */
    drawBuf: function (b, x, y, str, styleName, opt) {
      return Text.draw(b.data, b.w, b.h, x, y, str, styleName, opt);
    }
  };
  SMK.Text = Text;

  /* ------------------------------------------------------------------
     HUD chrome
     ------------------------------------------------------------------ */

  /* the item window: a rounded bevelled frame, as on the original HUD */
  function itemFrame(w, h) {
    var b = new SMK.PixelBuf(w, h);
    b.rect(1, 0, w - 2, h, '#182038');
    b.rect(0, 1, w, h - 2, '#182038');
    /* bevel: light top-left, dark bottom-right */
    b.hline(2, 0, w - 4, '#c0c8e0'); b.vline(0, 2, h - 4, '#c0c8e0');
    b.hline(2, h - 1, w - 4, '#505c80'); b.vline(w - 1, 2, h - 4, '#505c80');
    b.px(1, 1, '#c0c8e0'); b.px(w - 2, h - 2, '#505c80');
    b.px(w - 2, 1, '#8890b0'); b.px(1, h - 2, '#8890b0');
    /* inner well */
    b.rect(2, 2, w - 4, h - 4, '#283458');
    b.hline(3, 2, w - 6, '#1c2440');
    return b;
  }

  /* the panel the course map sits in */
  function mapPanel(w, h) {
    var b = new SMK.PixelBuf(w, h);
    b.rect(0, 0, w, h, '#101828');
    b.frame(0, 0, w, h, '#404c70');
    b.hline(1, 1, w - 2, '#586480');
    return b;
  }

  var uiCache = {};
  function cached(key, make) {
    var v = uiCache[key];
    if (!v) v = uiCache[key] = make();
    return v;
  }

  /* ------------------------------------------------------------------
     Cup emblems, drawn small for the cup-select screen and results
     ------------------------------------------------------------------ */
  function emblem(kind) {
    var b = new SMK.PixelBuf(24, 24);
    if (kind === 'mushroom') {
      b.ellipse(12, 10, 10, 7.4, '#f02828');
      b.ellipse(12, 13, 9.4, 3.4, '#a01010');
      b.ellipse(12, 7.4, 8, 4, '#f85858');
      b.ellipse(7, 9, 2.8, 2.2, PAL.white);
      b.ellipse(16.5, 8, 3, 2.4, PAL.white);
      b.rect(8, 16, 8, 6, '#f8f0d8');
      b.rect(8, 16, 3, 6, '#fffaf0');
    } else if (kind === 'flower') {
      var petal = ['#f8a800', '#f8d800'];
      for (var i = 0; i < 5; i++) {
        var a = -Math.PI / 2 + i * SMK.TAU / 5;
        b.ellipse(12 + Math.cos(a) * 6, 11 + Math.sin(a) * 6, 4.2, 4.2, petal[i & 1]);
      }
      b.ellipse(12, 11, 4, 4, '#f84020');
      b.ellipse(11, 10, 2, 1.6, '#f88060');
      b.vline(12, 16, 7, '#20a020');
      b.ellipse(15, 19, 2.6, 1.6, '#20a020');
    } else if (kind === 'star') {
      var pts = [];
      for (var k = 0; k < 10; k++) {
        var ang = -Math.PI / 2 + k * Math.PI / 5;
        var rad = (k & 1) ? 4.6 : 11;
        pts.push([12 + Math.cos(ang) * rad, 12 + Math.sin(ang) * rad]);
      }
      b.poly(pts, '#ffd800');
      b.ellipse(12, 10, 5, 3.4, '#fff080');
    } else {                      /* crown, for the Special Cup */
      b.poly([[2, 18], [4, 6], [8, 12], [12, 4], [16, 12], [20, 6], [22, 18]], '#ffd800');
      b.rect(2, 18, 21, 4, '#f8a800');
      b.px(4, 6, '#f84040'); b.px(12, 4, '#40a0f8'); b.px(20, 6, '#40f840');
      b.hline(3, 18, 19, '#fff080');
    }
    b.outline(PAL.outline, false);
    return b;
  }

  /* ------------------------------------------------------------------
     Title logo
     ------------------------------------------------------------------ */
  function logo() {
    var b = new SMK.PixelBuf(224, 74);
    /* SUPER, small and arched over the top */
    var word = 'SUPER';
    for (var i = 0; i < word.length; i++) {
      var lift = [0, -2, -3, -2, 0][i];
      SMK.font.draw(b, 62 + i * 18, 4 + lift, word.charAt(i), {
        color: '#f8f8f8', color2: '#b8c8e8', outline: '#182038', scale: 2, tracking: 0
      });
    }
    /* KART, the big word */
    SMK.font.draw(b, 112, 22, 'KART', {
      color: '#ffe040', color2: '#f87800', outline: '#000000',
      shadow: '#801800', shadowDx: 2, shadowDy: 3,
      scale: 5, shear: 0.14, tracking: 1, align: 'center'
    });
    /* GRAND PRIX, on a banner */
    SMK.fillRect(b.data, b.w, b.h, 40, 60, 144, 12, '#282c48');
    b.frame(40, 60, 144, 12, '#68a8f8');
    SMK.font.draw(b, 112, 62, 'GRAND PRIX', {
      color: '#8cd8ff', outline: '#08203c', scale: 1, tracking: 2, align: 'center'
    });
    return b;
  }

  SMK.ui = {
    itemFrame: function (w, h) { return cached('if' + w + 'x' + h, function () { return itemFrame(w, h); }); },
    mapPanel: function (w, h) { return cached('mp' + w + 'x' + h, function () { return mapPanel(w, h); }); },
    emblem: function (kind) { return cached('em' + kind, function () { return emblem(kind); }); },
    logo: function () { return cached('logo', logo); }
  };

})(window.SMK);
