/* ------------------------------------------------------------------
   font.js — bitmap text.

   One 5x7 master face, rendered through PixelBuf so it stays crisp,
   with optional key-line outline, drop shadow, integer upscale and a
   horizontal shear (the SNES HUD loved italic numerals).
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  /* '#' = ink, '.' = empty.  5 wide, 7 tall, 1px natural side bearing. */
  var SRC = {
    'A': '.###.|#...#|#...#|#####|#...#|#...#|#...#',
    'B': '####.|#...#|#...#|####.|#...#|#...#|####.',
    'C': '.####|#....|#....|#....|#....|#....|.####',
    'D': '####.|#...#|#...#|#...#|#...#|#...#|####.',
    'E': '#####|#....|#....|####.|#....|#....|#####',
    'F': '#####|#....|#....|####.|#....|#....|#....',
    'G': '.####|#....|#....|#..##|#...#|#...#|.###.',
    'H': '#...#|#...#|#...#|#####|#...#|#...#|#...#',
    'I': '#####|..#..|..#..|..#..|..#..|..#..|#####',
    'J': '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
    'K': '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
    'L': '#....|#....|#....|#....|#....|#....|#####',
    'M': '#...#|##.##|#.#.#|#...#|#...#|#...#|#...#',
    'N': '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
    'O': '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
    'P': '####.|#...#|#...#|####.|#....|#....|#....',
    'Q': '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
    'R': '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
    'S': '.####|#....|#....|.###.|....#|....#|####.',
    'T': '#####|..#..|..#..|..#..|..#..|..#..|..#..',
    'U': '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
    'V': '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
    'W': '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#',
    'X': '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
    'Y': '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
    'Z': '#####|....#|...#.|..#..|.#...|#....|#####',

    '0': '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
    '1': '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
    '2': '.###.|#...#|....#|...#.|..#..|.#...|#####',
    '3': '####.|....#|....#|.###.|....#|....#|####.',
    '4': '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
    '5': '#####|#....|####.|....#|....#|#...#|.###.',
    '6': '..##.|.#...|#....|####.|#...#|#...#|.###.',
    '7': '#####|....#|...#.|..#..|..#..|..#..|..#..',
    '8': '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
    '9': '.###.|#...#|#...#|.####|....#|...#.|.##..',

    '.': '.....|.....|.....|.....|.....|.##..|.##..',
    ',': '.....|.....|.....|.....|.##..|.##..|.#...',
    ':': '.....|.##..|.##..|.....|.##..|.##..|.....',
    ';': '.....|.##..|.##..|.....|.##..|.##..|.#...',
    '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..',
    '?': '.###.|#...#|....#|..##.|..#..|.....|..#..',
    '-': '.....|.....|.....|#####|.....|.....|.....',
    '_': '.....|.....|.....|.....|.....|.....|#####',
    '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
    '=': '.....|.....|#####|.....|#####|.....|.....',
    '/': '....#|...#.|...#.|..#..|.#...|.#...|#....',
    '\\': '#....|.#...|.#...|..#..|...#.|...#.|....#',
    '*': '.....|#.#.#|.###.|#####|.###.|#.#.#|.....',
    "'": '..#..|..#..|.....|.....|.....|.....|.....',
    '"': '.#.#.|.#.#.|.....|.....|.....|.....|.....',
    '(': '..##.|.#...|.#...|.#...|.#...|.#...|..##.',
    ')': '.##..|...#.|...#.|...#.|...#.|...#.|.##..',
    '[': '.###.|.#...|.#...|.#...|.#...|.#...|.###.',
    ']': '.###.|...#.|...#.|...#.|...#.|...#.|.###.',
    '<': '...#.|..#..|.#...|#....|.#...|..#..|...#.',
    '>': '.#...|..#..|...#.|....#|...#.|..#..|.#...',
    '%': '##..#|##.#.|..#..|.#...|#..##|.#.##|.....',
    '#': '.#.#.|#####|.#.#.|.#.#.|#####|.#.#.|.....',
    '@': '.###.|#...#|#.###|#.#.#|#.###|#....|.###.',
    '&': '.##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#',
    '$': '..#..|.####|#.#..|.###.|..#.#|####.|..#..',
    '^': '..#..|.#.#.|#...#|.....|.....|.....|.....',
    '~': '.....|.....|.#..#|#.##.|.....|.....|.....',
    '°': '.##..|#..#.|.##..|.....|.....|.....|.....',   /* degree  */
    '↑': '..#..|.###.|#.#.#|..#..|..#..|..#..|.....',   /* up      */
    '↓': '.....|..#..|..#..|..#..|#.#.#|.###.|..#..',   /* down    */
    '←': '.....|..#..|.#...|#####|.#...|..#..|.....',   /* left    */
    '→': '.....|..#..|...#.|#####|...#.|..#..|.....',   /* right   */
    '▶': '#....|##...|###..|####.|###..|##...|#....',   /* cursor  */
    '◀': '....#|...##|..###|.####|..###|...##|....#',
    '★': '..#..|..#..|#####|.###.|.#.#.|#...#|.....'    /* star    */
  };

  var GW = 5, GH = 7;

  /* parse the '|' rows into per-glyph column bitmasks (bit j = row j) */
  var GLYPH = {};
  (function build() {
    for (var ch in SRC) {
      if (!SRC.hasOwnProperty(ch)) continue;
      var rows = SRC[ch].split('|');
      var cols = new Uint8Array(GW);
      for (var y = 0; y < GH && y < rows.length; y++) {
        var r = rows[y];
        for (var x = 0; x < GW; x++) {
          if (r.charAt(x) === '#') cols[x] |= (1 << y);
        }
      }
      GLYPH[ch] = cols;
    }
  })();

  var Font = {
    W: GW,
    H: GH,
    /* advance for one glyph incl. bearing, at a given scale */
    advance: function (scale, tracking) {
      return (GW + (tracking === undefined ? 1 : tracking)) * (scale || 1);
    }
  };

  Font.has = function (ch) { return GLYPH.hasOwnProperty(ch); };

  Font.measure = function (text, opt) {
    opt = opt || {};
    var scale = opt.scale || 1;
    var tracking = opt.tracking === undefined ? 1 : opt.tracking;
    var n = text.length;
    if (!n) return 0;
    return n * (GW + tracking) * scale - tracking * scale;
  };

  Font.height = function (opt) {
    opt = opt || {};
    return GH * (opt.scale || 1);
  };

  /* ------------------------------------------------------------------
     draw(buf, x, y, text, opt)
       color    ink colour (hex or packed)
       color2   optional bottom-half colour -> vertical two-tone ink
       outline  key-line colour drawn around the glyphs
       shadow   colour for a hard drop shadow
       shadowDx/shadowDy  shadow offset (default 1,1)
       scale    integer upscale (default 1)
       tracking extra px between glyphs (default 1)
       shear    px of rightward lean per row from the bottom (italics)
       align    'left' | 'center' | 'right'
     Returns the advance width used.
     ------------------------------------------------------------------ */
  Font.draw = function (buf, x, y, text, opt) {
    opt = opt || {};
    text = String(text).toUpperCase();

    var scale = opt.scale || 1;
    var tracking = opt.tracking === undefined ? 1 : opt.tracking;
    var shear = opt.shear || 0;
    var width = Font.measure(text, { scale: scale, tracking: tracking });

    if (opt.align === 'center') x = Math.round(x - width / 2);
    else if (opt.align === 'right') x = Math.round(x - width);
    x |= 0; y |= 0;

    var ink = opt.color === undefined ? SMK.PAL.white : opt.color;
    var ink2 = opt.color2;
    var glyphH = GH * scale;

    /* mask pass: rasterise the string once into a scratch buffer so the
       outline and shadow wrap the whole string, not each letter. */
    var padL = 2, padT = 2;
    var extra = Math.ceil(Math.abs(shear) * glyphH) + 4;
    var scratch = new SMK.PixelBuf(width + padL * 2 + extra, glyphH + padT * 2 + 2);

    for (var i = 0; i < text.length; i++) {
      var cols = GLYPH[text.charAt(i)];
      if (!cols) continue;
      var gx = padL + i * (GW + tracking) * scale;
      for (var cx = 0; cx < GW; cx++) {
        var bits = cols[cx];
        if (!bits) continue;
        for (var cy = 0; cy < GH; cy++) {
          if (!(bits & (1 << cy))) continue;
          var col = ink;
          if (ink2 !== undefined && cy >= 4) col = ink2;
          /* lean: rows nearer the top shift right */
          var lean = Math.round(shear * (GH - 1 - cy) * scale);
          for (var sy = 0; sy < scale; sy++) {
            for (var sx = 0; sx < scale; sx++) {
              scratch.px(gx + cx * scale + sx + lean, padT + cy * scale + sy, col);
            }
          }
        }
      }
    }

    if (opt.outline !== undefined && opt.outline !== null) {
      scratch.outline(opt.outline, opt.outlineDiagonal !== false);
    }

    if (opt.shadow !== undefined && opt.shadow !== null) {
      var sdx = opt.shadowDx === undefined ? 1 : opt.shadowDx;
      var sdy = opt.shadowDy === undefined ? 1 : opt.shadowDy;
      var sh = scratch.clone().silhouette(opt.shadow);
      buf.blit(sh, x - padL + sdx, y - padT + sdy);
    }

    buf.blit(scratch, x - padL, y - padT);
    return width;
  };

  /* convenience: centred string with the standard HUD treatment */
  Font.hud = function (buf, x, y, text, color, opt) {
    opt = Object.assign({
      color: color || SMK.PAL.white,
      outline: SMK.PAL.black,
      align: 'left'
    }, opt || {});
    return Font.draw(buf, x, y, text, opt);
  };

  SMK.font = Font;

})(window.SMK);
