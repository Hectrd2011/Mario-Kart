/* ------------------------------------------------------------------
   art_objects.js — everything on the track that isn't a kart.

   Track furniture (pipes, Thwomps, Boos, moles, Cheep Cheeps, ice
   blocks), the pickups, the item icons the HUD draws, the particle
   art, and Lakitu with his starting lights, lap boards and flag.

   Two notes on fidelity.  The 16-bit original put its item panels and
   coins flat on the road rather than floating them in the air, so
   those are drawn pre-squashed to the camera's 23-degree elevation and
   sit on the tarmac.  And each object carries its collision data
   (world radius, height, what it does to you) next to its art, so the
   sprite and the hitbox can never drift apart.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var PAL = SMK.PAL;
  var B = SMK.PixelBuf;

  /* the squash a flat-on-the-ground sprite gets from the fixed camera */
  var GROUND_SQUASH = Math.sin(23 * Math.PI / 180) / 1.0;   /* ~0.39 */

  function buf(w, h) { return new B(w, h); }

  /* ---------------- pickups ---------------- */

  /* flat "?" panel, as the original painted them on the road rather
     than floating them in the air */
  function itemPanel(phase) {
    var w = 36, h = 20, b = buf(w, h);
    var cx = w / 2, cy = h / 2;
    var glow = ['#f8d800', '#fff060', '#f8a800', '#ffffff'][phase % 4];
    /* a lozenge lying on the tarmac, bevelled so it reads at distance */
    b.ellipse(cx, cy + 1, 16, 8.0, SMK.shade(glow, -0.62));
    b.ellipse(cx, cy, 15, 7.0, SMK.shade(glow, -0.25));
    b.ellipse(cx, cy - 1.2, 13, 5.4, glow);
    b.ellipse(cx, cy - 2.6, 9.5, 3.0, SMK.shade(glow, 0.42));
    /* a chunky question mark */
    var q = ['.#####.',
             '##...##',
             '.....##',
             '..####.',
             '..##...',
             '.......',
             '..##...'];
    for (var r = 0; r < q.length; r++) {
      for (var c = 0; c < q[r].length; c++) {
        if (q[r].charAt(c) !== '#') continue;
        b.px(Math.round(cx - 3.5 + c), Math.round(cy - 4 + r), PAL.black);
      }
    }
    b.outline(PAL.outline, false);
    return b;
  }

  /* a coin, spinning in place */
  function coinSprite(phase) {
    var b = buf(14, 16);
    var wSteps = [6, 5, 3, 1.4, 3, 5];
    var rx = wSteps[phase % wSteps.length];
    var cx = 7, cy = 8;
    b.ellipse(cx, cy, rx, 6.6, PAL.yellowDark);
    b.ellipse(cx, cy, Math.max(0.6, rx - 1.1), 5.4, PAL.yellow);
    if (rx > 3) {
      b.ellipse(cx - rx * 0.25, cy - 1.2, Math.max(0.6, rx * 0.35), 2.2, '#fff8c0');
      b.ellipse(cx, cy, Math.max(0.5, rx - 2.6), 3.4, SMK.shade(PAL.yellow, 0.22));
    }
    b.outline(PAL.outline, true);
    return b;
  }

  /* ---------------- track furniture ---------------- */

  function pipeSprite() {
    var b = buf(30, 38);
    var g = '#20a020', gl = '#68e068', gd = '#0c5c14';
    /* barrel */
    b.rect(7, 14, 16, 22, g);
    b.rect(7, 14, 4, 22, gl);
    b.rect(19, 14, 4, 22, gd);
    /* lip */
    b.rect(3, 8, 24, 8, g);
    b.rect(3, 8, 24, 3, gl);
    b.rect(3, 13, 24, 3, gd);
    /* the dark mouth */
    b.ellipse(15, 10, 10, 3.2, '#0a3a10');
    b.ellipse(15, 10, 8, 2.1, '#062808');
    b.outline(PAL.outline, false);
    return b;
  }

  function thwompSprite(angry) {
    var b = buf(38, 32);
    var s = '#98a0b8', sl = '#c8d0e8', sd = '#585c78';
    /* a squat block: wider than tall, with bevelled stone edges */
    b.rect(3, 3, 32, 26, s);
    b.rect(3, 3, 32, 3, sl);
    b.rect(3, 26, 32, 3, sd);
    b.rect(3, 3, 3, 26, sl);
    b.rect(32, 3, 3, 26, sd);
    b.px(4, 4, s); b.px(34, 4, sd); b.px(4, 28, sl);
    b.px(8, 3, sl); b.px(29, 28, sd);
    /* face, big enough to read at distance */
    var ey = angry ? 9 : 10;
    b.rect(10, ey, 6, 7, PAL.white);
    b.rect(23, ey, 6, 7, PAL.white);
    b.rect(11, ey + (angry ? 1 : 2), 3, 4, PAL.black);
    b.rect(25, ey + (angry ? 1 : 2), 3, 4, PAL.black);
    if (angry) {
      b.rect(9, ey - 3, 8, 3, '#301820');
      b.rect(22, ey - 3, 8, 3, '#301820');
      b.rect(13, 20, 12, 5, '#401820');
      b.rect(14, 20, 3, 3, PAL.white);
      b.rect(22, 20, 3, 3, PAL.white);
    } else {
      b.rect(14, 21, 10, 3, '#503040');
    }
    b.outline(PAL.outline, false);
    return b;
  }

  function booSprite(phase) {
    var b = buf(28, 26);
    var bob = [0, 1, 2, 1][phase % 4];
    var cx = 14, cy = 12 + bob;
    /* body: a round head with a ragged tail */
    b.ellipse(cx, cy, 10, 9.4, '#f0f0f8');
    b.ellipse(cx, cy + 5, 9, 5, '#f0f0f8');
    for (var i = 0; i < 4; i++)
      b.ellipse(cx - 7 + i * 4.6, cy + 9, 2.4, 2.2, '#f0f0f8');
    b.ellipse(cx, cy + 3, 8, 4.4, '#d0d0e8');
    /* little arms */
    b.ellipse(cx - 9, cy + 3, 2.6, 2.2, '#f0f0f8');
    b.ellipse(cx + 9, cy + 3, 2.6, 2.2, '#f0f0f8');
    /* face — shy, so the eyes are shut every other frame */
    if (phase % 4 < 2) {
      b.rect(cx - 5, cy - 3, 3, 4, PAL.black);
      b.rect(cx + 2, cy - 3, 3, 4, PAL.black);
      b.rect(cx - 3, cy + 2, 6, 3, '#901830');
      b.rect(cx - 2, cy + 2, 4, 1, '#f0a0b0');
    } else {
      b.rect(cx - 5, cy - 1, 3, 1, PAL.black);
      b.rect(cx + 2, cy - 1, 3, 1, PAL.black);
      b.rect(cx - 2, cy + 2, 4, 2, '#901830');
    }
    b.outline(PAL.outline, true);
    return b;
  }

  function moleSprite(out) {
    var b = buf(24, 22);
    /* the hole is always there */
    b.ellipse(12, 17, 10, 4, '#3c2810');
    b.ellipse(12, 16.4, 8.4, 3, '#241808');
    if (out) {
      var f = '#9c6430', fd = '#68401c';
      b.ellipse(12, 10, 7, 6.4, f);
      b.ellipse(12, 13, 6, 3.4, fd);
      b.ellipse(7, 6, 2.4, 2.4, f);        /* ears */
      b.ellipse(17, 6, 2.4, 2.4, f);
      b.ellipse(12, 12, 4, 2.6, '#e8c0a0');  /* muzzle */
      b.ellipse(12, 11.4, 1.6, 1.2, '#301810');
      b.rect(8, 8, 2, 3, PAL.black);
      b.rect(14, 8, 2, 3, PAL.black);
      b.rect(10, 14, 4, 2, PAL.white);       /* teeth */
    }
    b.outline(PAL.outline, false);
    return b;
  }

  function cheepSprite(phase) {
    var b = buf(26, 18);
    var flip = phase % 2;
    var body = '#f04030', bd = '#a01818', bl = '#f88878';
    b.ellipse(12, 9, 8.4, 6, body);
    b.ellipse(12, 11.4, 7.4, 3.2, bd);
    b.ellipse(10, 6.4, 5.4, 2.6, bl);
    /* tail fin */
    b.poly([[20, 9], [25, 4 + flip], [25, 14 - flip]], body);
    b.poly([[20, 9], [24, 6 + flip], [24, 12 - flip]], bl);
    /* side fin, eye, lips */
    b.ellipse(12, 13, 3, 1.8 + flip, bd);
    b.ellipse(6.5, 7.5, 2.4, 2.4, PAL.white);
    b.ellipse(6, 7.5, 1.2, 1.4, PAL.black);
    b.ellipse(2.6, 10, 2.2, 1.8, '#f8a0a0');
    b.outline(PAL.outline, true);
    return b;
  }

  function iceBlockSprite() {
    var b = buf(28, 28);
    var i1 = '#b8e8ff', i2 = '#e8f8ff', i3 = '#6098c8';
    b.rect(4, 6, 20, 20, i1);
    b.rect(4, 6, 20, 3, i2);
    b.rect(4, 23, 20, 3, i3);
    b.rect(4, 6, 3, 20, i2);
    b.rect(21, 6, 3, 20, i3);
    /* a denser frozen core so it is not just a pane of glass */
    b.ellipse(14, 16, 6, 6, '#8cc8e8');
    b.ellipse(13, 14, 4, 3.4, '#b8e4fc');
    /* internal fractures */
    b.line(9, 10, 15, 19, i2);
    b.line(17, 9, 13, 16, i2);
    b.line(11, 20, 19, 14, i3);
    /* specular glint */
    b.rect(7, 8, 4, 2, PAL.white);
    b.rect(7, 10, 2, 2, PAL.white);
    b.outline(PAL.outline, false);
    return b;
  }

  function puddleSprite() {
    var b = buf(40, 18);
    b.ellipse(20, 11, 18, 6, '#4c2810');
    b.ellipse(20, 10, 16, 4.6, '#301808');
    b.ellipse(14, 8.6, 5, 1.6, '#603418');
    b.outline(PAL.outline, false);
    return b;
  }

  function fireballSprite(phase) {
    var b = buf(18, 18);
    var r = [7, 8, 7, 6][phase % 4];
    b.ellipse(9, 9, r, r, '#f83000');
    b.ellipse(9, 9, r * 0.72, r * 0.72, '#f88800');
    b.ellipse(9, 8.4, r * 0.42, r * 0.42, '#f8f800');
    /* a few licks of flame */
    b.px(9, 9 - r - 1, '#f8a800');
    b.px(9 - r - 1, 9, '#f8a800');
    b.px(9 + r + 1, 9, '#f8a800');
    b.outline(PAL.outline, false);
    return b;
  }

  /* ---------------- items ---------------- */

  function mushroomSprite(poison) {
    var b = buf(22, 22);
    var cap = poison ? '#8830a8' : '#f02828';
    var capD = poison ? '#4c1060' : '#a01010';
    var spot = poison ? '#301040' : '#f8f8f8';
    b.ellipse(11, 9, 9.4, 7.4, cap);
    b.ellipse(11, 12, 9, 3.6, capD);
    b.ellipse(11, 6.6, 7.6, 4, SMK.shade(cap, 0.22));
    b.ellipse(6, 8, 2.6, 2.2, spot);
    b.ellipse(15.5, 7, 3, 2.4, spot);
    b.ellipse(11, 11, 2.4, 1.6, spot);
    /* stalk */
    b.rect(7, 14, 8, 6, poison ? '#d8d8e8' : '#f8f0d8');
    b.rect(7, 14, 3, 6, poison ? '#f0f0f8' : '#fffaf0');
    b.rect(13, 14, 2, 6, poison ? '#a0a0b8' : '#d8c8a8');
    if (poison) { b.rect(8, 16, 2, 2, PAL.black); b.rect(12, 16, 2, 2, PAL.black); }
    b.outline(PAL.outline, false);
    return b;
  }

  function starSprite(phase) {
    var b = buf(24, 24);
    var cols = ['#ffe000', '#ffffff', '#ffa000', '#fff880'];
    var c = cols[phase % cols.length];
    var cx = 12, cy = 12, R = 11, r = 4.4;
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var rad = (i & 1) ? r : R;
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    b.poly(pts, c);
    /* eyes, because the invincibility star has a face */
    b.rect(cx - 4, cy - 1, 2, 4, PAL.black);
    b.rect(cx + 2, cy - 1, 2, 4, PAL.black);
    b.outline(PAL.outline, true);
    return b;
  }

  function bananaSprite() {
    var b = buf(22, 18);
    b.poly([[3, 12], [6, 5], [11, 3], [17, 6], [19, 12], [14, 9], [8, 10]], '#f8d820');
    b.poly([[4, 12], [7, 6], [11, 4.4], [15, 7], [16, 10], [11, 8], [7, 10]], '#fff060');
    b.line(17, 5, 19, 3, '#583818');
    b.px(19, 2, '#583818');
    b.outline(PAL.outline, true);
    return b;
  }

  function shellSprite(red) {
    var b = buf(22, 20);
    var top = red ? '#e02020' : '#28a038';
    var topD = red ? '#901010' : '#105818';
    var topL = red ? '#f87070' : '#70d870';
    b.ellipse(11, 10, 9.4, 8, top);
    b.ellipse(11, 13, 9, 4, topD);
    b.ellipse(11, 7.4, 7.4, 4.4, topL);
    /* rim and the hex plates */
    b.ellipse(11, 15.4, 9, 2.6, '#f8e8a0');
    b.ellipse(11, 10, 3.6, 3, topD);
    b.px(7, 8, topD); b.px(15, 8, topD); b.px(11, 5, topD);
    b.outline(PAL.outline, true);
    return b;
  }

  function featherSprite() {
    var b = buf(20, 24);
    b.poly([[10, 1], [15, 8], [14, 17], [10, 22], [6, 17], [5, 8]], '#90b0d8');
    b.poly([[10, 2], [14, 8], [13, 16], [10, 21], [7, 16], [6, 8]], '#e0ecf8');
    b.poly([[10, 3], [13, 9], [12, 16], [10, 19]], '#ffffff');
    b.line(10, 2, 10, 22, '#4868a0');
    for (var i = 0; i < 5; i++) {
      b.line(10, 6 + i * 3, 7, 8 + i * 3, '#a8c0e0');
      b.line(10, 6 + i * 3, 13, 8 + i * 3, '#ffffff');
    }
    b.outline(PAL.outline, true);
    return b;
  }

  function lightningSprite() {
    var b = buf(20, 24);
    b.poly([[12, 1], [5, 12], [10, 12], [6, 23], [16, 9], [11, 9], [15, 1]], '#f8f800');
    b.poly([[11, 3], [7, 11], [11, 11], [8, 19], [14, 10], [10, 10], [13, 3]], '#fffc90');
    b.outline(PAL.outline, true);
    return b;
  }

  function eggSprite() {
    var b = buf(20, 22);
    b.ellipse(10, 12, 8.4, 9.4, '#f8f8f8');
    b.ellipse(10, 15, 8, 5, '#d8d8e8');
    b.ellipse(10, 8, 6.4, 4.4, '#ffffff');
    var sp = '#28a038';
    b.ellipse(6, 15, 2.4, 2, sp);
    b.ellipse(13, 17, 2.6, 2.1, sp);
    b.ellipse(10, 12, 2, 1.7, sp);
    b.outline(PAL.outline, true);
    return b;
  }

  function ghostItemSprite() { return booSprite(0); }

  function tripleMushroomSprite() {
    /* one small cap, drawn three times with clear gaps */
    var b = buf(30, 22);
    function cap(cx, cy) {
      b.ellipse(cx, cy, 5.4, 4.2, '#f02828');
      b.ellipse(cx, cy + 1.8, 5.2, 2.0, '#a01010');
      b.ellipse(cx, cy - 1.0, 4.2, 2.2, '#f85858');
      b.ellipse(cx - 2.4, cy - 0.4, 1.5, 1.2, PAL.white);
      b.ellipse(cx + 2.2, cy + 0.6, 1.5, 1.2, PAL.white);
      b.rect(cx - 2, cy + 4, 4, 4, '#f8f0d8');
      b.rect(cx - 2, cy + 4, 2, 4, '#fffaf0');
    }
    cap(6, 12); cap(23, 12); cap(14.5, 6);
    b.outline(PAL.outline, false);
    return b;
  }

  /* ---------------- effects ---------------- */

  function smokePuff(phase) {
    var b = buf(20, 20);
    var r = 3 + phase * 2.4;
    var g = 232 - phase * 26;
    var c = SMK.pack(g, g, g + 8);
    b.ellipse(10, 10, r, r * 0.86, c);
    b.ellipse(10 - r * 0.3, 10 - r * 0.3, r * 0.5, r * 0.42, SMK.pack(255, 255, 255));
    return b;
  }

  function sparkSprite(phase) {
    var b = buf(14, 14);
    var cols = ['#ffffff', '#ffe040', '#ff8800', '#ff4040'];
    var c = cols[phase % cols.length];
    var r = 2 + (phase % 3);
    b.ellipse(7, 7, r, r, c);
    b.px(7 - r - 1, 7, c); b.px(7 + r + 1, 7, c);
    b.px(7, 7 - r - 1, c); b.px(7, 7 + r + 1, c);
    return b;
  }

  function splashSprite(phase) {
    var b = buf(24, 16);
    var c = '#a8e0ff', c2 = '#f0fbff';
    var r = 4 + phase * 3;
    b.ellipse(12, 12, r, r * 0.42, c);
    b.ellipse(12, 11, r * 0.7, r * 0.3, c2);
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI + i * Math.PI / 4;
      b.px(12 + Math.cos(a) * r, 12 + Math.sin(a) * r * 0.5 - phase, c2);
    }
    return b;
  }

  function poofSprite(phase) {
    var b = buf(28, 28);
    var r = 3 + phase * 2.6;
    /* fades and thins as it expands */
    var ring = ['#ffffff', '#fff0c0', '#ffd080', '#e09850', '#a06830'][phase] || '#a06830';
    var lobe = Math.max(1.4, 3.4 - phase * 0.5);
    for (var i = 0; i < 8; i++) {
      var a = i * SMK.TAU / 8 + phase * 0.22;
      b.ellipse(14 + Math.cos(a) * r, 14 + Math.sin(a) * r * 0.82, lobe, lobe, ring);
    }
    if (phase < 2) b.ellipse(14, 14, r * 0.7, r * 0.6, '#ffffff');
    return b;
  }

  /* ---------------- Lakitu ---------------- */

  /* board = null | 'lights0'..'lights3' | 'lap' | 'flag' | 'wrongway' */
  function lakitu(board, lapNum, bob) {
    var b = buf(46, 46);
    var cy = 24 + (bob || 0);

    /* cloud */
    var cw = '#f8f8f8', cs = '#c0c8e0';
    b.ellipse(23, cy + 8, 15, 6, cw);
    b.ellipse(12, cy + 6, 7, 5.4, cw);
    b.ellipse(34, cy + 6, 7.4, 5.6, cw);
    b.ellipse(23, cy + 3, 9.4, 6, cw);
    b.ellipse(23, cy + 11, 14, 3.4, cs);
    /* a grumpy cloud face */
    b.rect(17, cy + 6, 2, 2, '#607090');
    b.rect(27, cy + 6, 2, 2, '#607090');

    /* Lakitu himself: a Koopa in goggles, sitting in the cloud */
    var sk = '#f8d040', skd = '#c09010';
    b.ellipse(23, cy - 5, 6.4, 6, sk);            /* head   */
    b.ellipse(23, cy - 2, 6, 3, skd);
    b.ellipse(23, cy + 1, 7, 4.4, '#28a038');     /* shell  */
    b.ellipse(23, cy + 2, 6, 2.6, '#105818');
    /* goggles */
    b.rect(17, cy - 7, 12, 4, '#f8f8f8');
    b.rect(18, cy - 6, 4, 2, '#3898f8');
    b.rect(24, cy - 6, 4, 2, '#3898f8');
    b.rect(17, cy - 8, 12, 1, '#585868');
    b.ellipse(23, cy - 1.4, 2.4, 1.6, '#f89820');  /* beak */

    /* whatever he is holding up */
    if (board) {
      var bx = 30, by = cy - 22;
      if (board.indexOf('lights') === 0) {
        var lit = parseInt(board.slice(6), 10);
        b.rect(bx - 6, by, 13, 26, '#282838');
        b.frame(bx - 6, by, 13, 26, '#585868');
        for (var i = 0; i < 3; i++) {
          var on = (lit === 3) ? (i === 2) : (i >= 2 - lit && lit > 0);
          /* countdown: two reds then green, as the original's lights ran */
          var onCol = i < 2 ? '#f82020' : '#20f020';
          var offCol = i < 2 ? '#501010' : '#104810';
          b.ellipse(bx + 0.5, by + 5 + i * 8, 2.9, 2.9, on ? onCol : offCol);
          if (on) b.ellipse(bx - 0.4, by + 4 + i * 8, 1.2, 1.1, '#ffffff');
        }
        b.vline(bx, by + 26, cy - 10 - (by + 26), '#585868');
      } else if (board === 'lap') {
        b.rect(bx - 14, by + 3, 30, 17, '#f8f8f8');
        b.frame(bx - 14, by + 3, 30, 17, '#303048');
        SMK.font.draw(b, bx - 11, by + 7, 'LAP', { color: '#303048', tracking: 1 });
        SMK.font.draw(b, bx + 8, by + 7, String(lapNum || 2), { color: '#e02020' });
        b.vline(bx, by + 20, cy - 6 - (by + 20), '#a08050');
      } else if (board === 'flag') {
        for (var r = 0; r < 5; r++)
          for (var c = 0; c < 7; c++)
            b.rect(bx - 10 + c * 3, by + 4 + r * 3, 3, 3, ((r + c) & 1) ? '#181820' : '#f8f8f8');
        b.vline(bx - 11, by + 4, cy - 4 - (by + 4), '#a08050');
      } else if (board === 'wrongway') {
        b.rect(bx - 17, by + 4, 36, 15, '#f8d800');
        b.frame(bx - 17, by + 4, 36, 15, '#a01010');
        SMK.font.draw(b, bx + 1, by + 8, 'WRONG', { color: '#a01010', align: 'center', tracking: 0 });
        b.vline(bx, by + 19, cy - 6 - (by + 19), '#a08050');
      }
    }

    b.outline(PAL.outline, false);
    return b;
  }

  /* ------------------------------------------------------------------
     Registry.  Art plus the gameplay data that goes with it, so a
     sprite and its hitbox are defined in the same place.
       worldW/worldH  size in world units (sprites scale from these)
       radius         collision radius in world units
       solid          true -> bounce, false -> pass through
       kind           what the race layer does on contact
     ------------------------------------------------------------------ */
  var DEFS = {
    itembox:  { frames: 4, make: itemPanel,   worldW: 36, flat: true, radius: 14, kind: 'itembox', fps: 9 },
    coin:     { frames: 6, make: coinSprite,  worldW: 13, flat: true, radius: 8, kind: 'coin', fps: 11 },
    pipe:     { frames: 1, make: pipeSprite,  worldW: 30, radius: 15, solid: true, kind: 'solid' },
    thwomp:   { frames: 2, make: thwompSprite, worldW: 36, radius: 16, solid: true, kind: 'thwomp', fps: 1.4 },
    boo:      { frames: 4, make: booSprite,   worldW: 28, radius: 13, kind: 'boo', fps: 5 },
    mole:     { frames: 2, make: moleSprite,  worldW: 24, radius: 10, kind: 'mole', fps: 1.1 },
    cheep:    { frames: 2, make: cheepSprite, worldW: 26, radius: 11, kind: 'bump', fps: 4 },
    iceblock: { frames: 1, make: iceBlockSprite, worldW: 28, radius: 13, solid: true, kind: 'solid' },
    puddle:   { frames: 1, make: puddleSprite, worldW: 42, flat: true, radius: 18, kind: 'slow' },
    firebar:  { frames: 4, make: fireballSprite, worldW: 18, radius: 9, kind: 'burn', fps: 12 },

    i_mushroom: { frames: 1, make: function () { return mushroomSprite(false); }, worldW: 22, radius: 10, kind: 'item' },
    i_poison:   { frames: 1, make: function () { return mushroomSprite(true); }, worldW: 22, radius: 10, kind: 'item' },
    i_triple:   { frames: 1, make: tripleMushroomSprite, worldW: 28, radius: 11, kind: 'item' },
    i_star:     { frames: 4, make: starSprite, worldW: 24, radius: 11, kind: 'item', fps: 12 },
    i_banana:   { frames: 1, make: bananaSprite, worldW: 22, radius: 10, kind: 'item' },
    i_greenShell: { frames: 1, make: function () { return shellSprite(false); }, worldW: 22, radius: 10, kind: 'item' },
    i_redShell: { frames: 1, make: function () { return shellSprite(true); }, worldW: 22, radius: 10, kind: 'item' },
    i_feather:  { frames: 1, make: featherSprite, worldW: 20, radius: 9, kind: 'item' },
    i_lightning: { frames: 1, make: lightningSprite, worldW: 20, radius: 9, kind: 'item' },
    i_egg:      { frames: 1, make: eggSprite, worldW: 20, radius: 10, kind: 'item' },
    i_boo:      { frames: 1, make: ghostItemSprite, worldW: 28, radius: 12, kind: 'item' },
    i_coin:     { frames: 1, make: function () { return coinSprite(0); }, worldW: 14, radius: 7, kind: 'item' },
    i_fireball: { frames: 4, make: fireballSprite, worldW: 18, radius: 9, kind: 'item', fps: 12 },

    fx_smoke: { frames: 5, make: smokePuff, worldW: 20, kind: 'fx' },
    fx_spark: { frames: 4, make: sparkSprite, worldW: 14, kind: 'fx' },
    fx_splash: { frames: 4, make: splashSprite, worldW: 24, kind: 'fx' },
    fx_poof:  { frames: 5, make: poofSprite, worldW: 20, kind: 'fx' }
  };

  var cache = {};

  function get(name) {
    var c = cache[name];
    if (c) return c;
    var d = DEFS[name];
    if (!d) return null;
    var bufs = [], cvs = [];
    for (var i = 0; i < d.frames; i++) {
      var bb = d.make(i);
      bufs.push(bb); cvs.push(bb.toCanvas());
    }
    c = cache[name] = {
      name: name, bufs: bufs, canvases: cvs,
      w: bufs[0].w, h: bufs[0].h,
      worldW: d.worldW, worldH: d.worldH || (d.worldW * bufs[0].h / bufs[0].w),
      radius: d.radius || 0, solid: !!d.solid, flat: !!d.flat,
      kind: d.kind, fps: d.fps || 0, frameCount: d.frames
    };
    return c;
  }

  /* Lakitu is parameterised rather than a fixed frame list */
  var lakCache = {};
  function getLakitu(board, lapNum, bob) {
    var key = (board || '-') + '|' + (lapNum || '') + '|' + (bob || 0);
    var v = lakCache[key];
    if (!v) {
      var bb = lakitu(board, lapNum, bob);
      v = lakCache[key] = { buf: bb, canvas: bb.toCanvas(), w: bb.w, h: bb.h };
    }
    return v;
  }

  SMK.objArt = {
    get: get,
    lakitu: getLakitu,
    defs: DEFS,
    GROUND_SQUASH: GROUND_SQUASH,
    /* debug helper */
    allNames: function () { return Object.keys(DEFS); }
  };

})(window.SMK);
