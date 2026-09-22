/* ------------------------------------------------------------------
   palette.js — colour handling.

   Everything the game draws is pushed through snes5() so the whole
   image sits on the SNES' 5-bit-per-channel colour lattice (32 levels
   per channel, BGR555).  That single constraint is most of why the
   result reads as a 16-bit console game rather than "pixel art filter
   over modern colours".
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  /* quantise one 8-bit channel to the SNES' 5-bit lattice */
  function q5(v) {
    v = v < 0 ? 0 : (v > 255 ? 255 : v);
    var c = Math.round(v / 8);
    if (c > 31) c = 31;
    return (c << 3) | (c >> 2);          /* replicate high bits, like real BGR555 output */
  }
  SMK.q5 = q5;

  /* "#rgb" / "#rrggbb" -> {r,g,b}, snapped to the SNES lattice */
  function parseHex(hex) {
    var h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return {
      r: q5(parseInt(h.slice(0, 2), 16)),
      g: q5(parseInt(h.slice(2, 4), 16)),
      b: q5(parseInt(h.slice(4, 6), 16))
    };
  }
  SMK.parseHex = parseHex;

  /* pack to the little-endian ABGR word an ImageData Uint32 view wants */
  function pack(r, g, b, a) {
    if (a === undefined) a = 255;
    return ((a << 24) | (q5(b) << 16) | (q5(g) << 8) | q5(r)) >>> 0;
  }
  SMK.pack = pack;

  /* "#rrggbb" -> packed ABGR word */
  var hexCache = {};
  function u32(hex) {
    var c = hexCache[hex];
    if (c === undefined) {
      var o = parseHex(hex);
      c = pack(o.r, o.g, o.b, 255);
      hexCache[hex] = c;
    }
    return c;
  }
  SMK.u32 = u32;

  /* packed word -> "#rrggbb" for canvas fill styles */
  function u32hex(w) {
    var r = w & 255, g = (w >>> 8) & 255, b = (w >>> 16) & 255;
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  SMK.u32hex = u32hex;

  /* snap any css hex to the lattice, returned as css hex */
  SMK.snes = function (hex) {
    var o = parseHex(hex);
    return '#' + ((1 << 24) | (o.r << 16) | (o.g << 8) | o.b).toString(16).slice(1);
  };

  /* ---- colour maths (all lattice-snapped on the way out) ---- */

  SMK.shade = function (hex, amount) {          /* amount -1..1, dark..light */
    var o = parseHex(hex), t = amount < 0 ? 0 : 255, k = Math.abs(amount);
    return '#' + ((1 << 24) |
      (q5(o.r + (t - o.r) * k) << 16) |
      (q5(o.g + (t - o.g) * k) << 8) |
      q5(o.b + (t - o.b) * k)).toString(16).slice(1);
  };

  SMK.mix = function (a, b, t) {
    var A = parseHex(a), B = parseHex(b);
    return '#' + ((1 << 24) |
      (q5(A.r + (B.r - A.r) * t) << 16) |
      (q5(A.g + (B.g - A.g) * t) << 8) |
      q5(A.b + (B.b - A.b) * t)).toString(16).slice(1);
  };

  /* multiply a packed word by a scalar — the per-scanline fog/darkening
     used by the Mode 7 floor and by distance-shaded sprites */
  SMK.scaleU32 = function (w, k) {
    var r = q5((w & 255) * k),
        g = q5(((w >>> 8) & 255) * k),
        b = q5(((w >>> 16) & 255) * k);
    return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  };

  /* blend packed word toward a packed tint (horizon haze) */
  SMK.tintU32 = function (w, tint, t) {
    var r = w & 255, g = (w >>> 8) & 255, b = (w >>> 16) & 255;
    var tr = tint & 255, tg = (tint >>> 8) & 255, tb = (tint >>> 16) & 255;
    return ((255 << 24) |
      (q5(b + (tb - b) * t) << 16) |
      (q5(g + (tg - g) * t) << 8) |
      q5(r + (tr - r) * t)) >>> 0;
  };

  /* ------------------------------------------------------------------
     Shared hardware palette.  Named entries are referenced by the art
     modules so a single tweak here restyles every sprite at once.
     ------------------------------------------------------------------ */
  SMK.PAL = {
    /* neutrals */
    black:      '#000000',
    outline:    '#101010',
    shadow:     '#181828',
    grey1:      '#303040',
    grey2:      '#585868',
    grey3:      '#888898',
    grey4:      '#b8b8c8',
    white:      '#ffffff',
    offwhite:   '#f8f8f8',

    /* mario-family primaries */
    red:        '#e00000',
    redDark:    '#980000',
    redLight:   '#ff5858',
    orange:     '#f87800',
    orangeDark: '#b84800',
    yellow:     '#ffd800',
    yellowDark: '#d09000',
    green:      '#00a800',
    greenDark:  '#006000',
    greenLight: '#58d858',
    blue:       '#0058f8',
    blueDark:   '#002878',
    blueLight:  '#58a8ff',
    cyan:       '#00d8d8',
    purple:     '#8058f8',
    purpleDark: '#402080',
    pink:       '#ff90b8',
    magenta:    '#f800c0',
    brown:      '#986018',
    brownDark:  '#603808',
    brownLight: '#d0a058',
    tan:        '#f8d8a0',

    /* skin tones */
    skin:       '#f8c090',
    skinShade:  '#d08858',
    skinDark:   '#a85830',

    /* rubber + chrome, used by every kart */
    tyre:       '#141418',
    tyreLit:    '#343442',
    tyreTread:  '#28282f',
    chrome:     '#d8d8e8',
    chromeDark: '#8888a0',
    exhaust:    '#a0a0b0'
  };

  /* pre-snap the whole table so nothing can sneak an off-lattice colour in */
  for (var k in SMK.PAL) if (SMK.PAL.hasOwnProperty(k)) SMK.PAL[k] = SMK.snes(SMK.PAL[k]);

})(window.SMK);
