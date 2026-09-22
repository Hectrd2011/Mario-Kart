/* ------------------------------------------------------------------
   menus.js — every screen that isn't a race.

   Title, mode select, engine class, driver select with live stat bars,
   cup and course select, race results, Grand Prix standings, the
   trophy ceremony and the credits roll.  All of it draws into the same
   256x224 frame buffer as the race, through the same bitmap font, so
   the menus and the game look like one machine.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var W = 256, H = 224;

  function text(f, x, y, s, style, opt) { SMK.Text.draw(f, W, H, x, y, s, style, opt); }
  function rect(f, x, y, w, h, c) { SMK.fillRect(f, W, H, x, y, w, h, c); }
  function dith(f, x, y, w, h, c) { SMK.ditherRect(f, W, H, x, y, w, h, c); }

  /* ---- a shared animated backdrop -------------------------------- */
  function backdrop(f, t, tint) {
    /* banded sky */
    var top = tint === 'dark' ? '#101830' : '#2060c0';
    var bot = tint === 'dark' ? '#301848' : '#90d0f8';
    for (var y = 0; y < H; y++) {
      var q = Math.floor(y / H * 10) / 9;
      rect(f, 0, y, W, 1, SMK.mix(top, bot, q));
    }
    /* a checkerboard floor, same projection the race uses: depth is
       inversely proportional to the distance below the horizon */
    var horizon = 130;
    var DEPTH = 30000, FOV = 0.70, CELL = 62;
    var scroll = t * 260;
    var onA = SMK.u32(tint === 'dark' ? '#3c2c58' : '#e8eefc');
    var onB = SMK.u32(tint === 'dark' ? '#241834' : '#9cb0dc');
    for (var sy = horizon; sy < H; sy++) {
      var dy = sy - horizon + 1;
      var z = DEPTH / dy;
      var rowBand = Math.floor((z + scroll) / CELL) & 1;
      var spanW = z * FOV;
      var shade = SMK.clamp(1 - (z - 300) / 5200, 0.30, 1);
      var row = sy * W;
      for (var sx = 0; sx < W; sx++) {
        var wx = ((sx - W / 2) / (W / 2)) * spanW;
        var colBand = Math.floor(wx / CELL + 1024) & 1;
        f[row + sx] = SMK.scaleU32((rowBand ^ colBand) ? onA : onB, shade);
      }
    }
    /* a couple of clouds drifting over the horizon */
    for (var i = 0; i < 5; i++) {
      var cx = ((i * 71 + t * 9) % (W + 80)) - 40;
      var cy = 30 + (i % 3) * 16;
      for (var k = 0; k < 4; k++)
        ellipseInto(f, cx + k * 9 - 13, cy - Math.sin(k / 3 * Math.PI) * 4, 8, 4,
                    tint === 'dark' ? '#3c3058' : '#ffffff');
    }
  }

  function ellipseInto(f, cx, cy, rx, ry, col) {
    var c = SMK.u32(col);
    for (var y = -ry; y <= ry; y++) {
      var dy = y / ry;
      var w = Math.sqrt(Math.max(0, 1 - dy * dy)) * rx;
      var yy = Math.round(cy + y);
      if (yy < 0 || yy >= H) continue;
      var x0 = Math.round(cx - w), x1 = Math.round(cx + w);
      for (var x = x0; x <= x1; x++) if (x >= 0 && x < W) f[yy * W + x] = c;
    }
  }

  /* ---- a framed panel, used by most screens ---------------------- */
  function panel(f, x, y, w, h, title) {
    dith(f, x + 2, y + 2, w, h, '#000010');
    rect(f, x, y, w, h, '#182444');
    rect(f, x, y, w, 1, '#8090c0');
    rect(f, x, y, 1, h, '#8090c0');
    rect(f, x, y + h - 1, w, 1, '#404c78');
    rect(f, x + w - 1, y, 1, h, '#404c78');
    if (title) {
      rect(f, x + 1, y + 1, w - 2, 11, '#283californ'.slice(0, 7));
      rect(f, x + 1, y + 1, w - 2, 11, '#283458');
      text(f, x + w / 2, y + 3, title, 'hudY', { align: 'center' });
    }
  }

  /* ---- stat bars for driver select ------------------------------- */
  function statBar(f, x, y, label, value, max, colour) {
    text(f, x, y, label, 'hudDim');
    var bx = x + 40, bw = 60, segs = 10;
    rect(f, bx - 1, y - 1, bw + 2, 9, '#101828');
    var filled = Math.round(SMK.clamp(value / max, 0, 1) * segs);
    for (var i = 0; i < segs; i++) {
      var on = i < filled;
      rect(f, bx + i * 6, y, 5, 7, on ? colour : '#303c60');
    }
  }

  /* a driver portrait: the front-facing kart frame, scaled up */
  function portrait(f, ch, x, y, scale, angleIdx) {
    var src = SMK.kartArt.frame(ch, angleIdx === undefined ? 8 : angleIdx, 0);
    var w = Math.round(src.w * scale), h = Math.round(src.h * scale);
    SMK.blitScaled(f, W, H, src, x - w / 2, y - h, w, h);
  }

  /* ================================================================
     SCREENS
     ================================================================ */

  var MODES = [
    { id: 'gp', name: 'GRAND PRIX', blurb: 'FIVE RACES, FOUR CUPS, EIGHT DRIVERS' },
    { id: 'tt', name: 'TIME TRIAL', blurb: 'ALONE AGAINST THE CLOCK' },
    { id: 'vs', name: 'VS RACE', blurb: 'ONE RACE, PICK ANY COURSE' },
    { id: 'battle', name: 'BATTLE', blurb: 'FOUR KARTS, THREE BALLOONS EACH' }
  ];

  /* ---------------- title ---------------- */
  function title(app, f, dt) {
    backdrop(f, app.t, null);
    var logo = SMK.ui.logo();
    SMK.blit(f, W, H, logo, Math.round(W / 2 - logo.w / 2), 18);

    if ((Math.floor(app.t * 1.8) & 1) === 0)
      text(f, W / 2, 112, 'PRESS START', 'menuSel', { align: 'center' });

    /* a line of karts running across the checkerboard, nearer ones bigger */
    for (var i = 0; i < 5; i++) {
      var ch = SMK.characters[(i * 3) % SMK.characters.length];
      var lane = i % 2;
      var speed = lane ? 46 : 30;
      var px = ((app.t * speed + i * 58) % (W + 100)) - 50;
      var py = lane ? 206 : 178;
      var src = SMK.kartArt.frame(ch, 4, 0);   /* side-on, heading right */
      var sc = lane ? 1.3 : 0.95;
      SMK.blitScaled(f, W, H, src, px, py - src.h * sc, src.w * sc, src.h * sc);
    }

    dith(f, 0, H - 16, W, 16, '#101828');
    text(f, W / 2, H - 12, 'A MODE 7 KART RACER', 'menuDim', { align: 'center' });

    if (SMK.input.pressed.start || SMK.input.pressed.accel) {
      SMK.audio.sfx('menuPick');
      app.go('mode');
    }
  }

  /* ---------------- mode select ---------------- */
  function mode(app, f) {
    backdrop(f, app.t, null);
    panel(f, 28, 36, 200, 130, 'SELECT MODE');
    for (var i = 0; i < MODES.length; i++) {
      var sel = app.sel.mode === i;
      var y = 58 + i * 22;
      if (sel) rect(f, 38, y - 3, 180, 17, '#384a80');
      text(f, 48, y + 1, MODES[i].name, sel ? 'menuSel' : 'menu');
      if (sel) text(f, 40, y + 1, '▶', 'menuSel');
    }
    text(f, W / 2, 150, MODES[app.sel.mode].blurb, 'menuDim', { align: 'center' });
    text(f, W / 2, H - 22, 'ENTER SELECT     ESC BACK', 'menuDim', { align: 'center' });

    if (navPick(app, 'mode', MODES.length)) {
      app.chosen.mode = MODES[app.sel.mode].id;
      /* an arena bout has no engine class to choose */
      app.go(app.chosen.mode === 'battle' ? 'chars' : 'engine');
    }
    if (SMK.input.pressed.back) { SMK.audio.sfx('menuBack'); app.go('title'); }
  }

  /* ---------------- engine class ---------------- */
  function engine(app, f) {
    backdrop(f, app.t, null);
    panel(f, 40, 52, 176, 100, 'ENGINE CLASS');
    var list = SMK.ENGINE_CLASSES;
    for (var i = 0; i < list.length; i++) {
      var sel = app.sel.engine === i;
      var y = 76 + i * 20;
      if (sel) rect(f, 50, y - 3, 156, 16, '#384a80');
      text(f, 70, y, list[i].name, sel ? 'menuSel' : 'menu');
      if (sel) text(f, 56, y, '▶', 'menuSel');
    }
    text(f, W / 2, 138, ['GENTLE', 'QUICK', 'FEROCIOUS'][app.sel.engine], 'menuDim', { align: 'center' });
    text(f, W / 2, H - 22, 'ENTER SELECT     ESC BACK', 'menuDim', { align: 'center' });

    if (navPick(app, 'engine', list.length)) {
      app.chosen.engine = list[app.sel.engine];
      app.go('chars');
    }
    if (SMK.input.pressed.back) { SMK.audio.sfx('menuBack'); app.go('mode'); }
  }

  /* ---------------- driver select ---------------- */
  function chars(app, f) {
    backdrop(f, app.t, 'dark');
    text(f, W / 2, 6, 'SELECT YOUR DRIVER', 'menuSel', { align: 'center' });

    var grid = SMK.SELECT_GRID;
    var cellW = 54, cellH = 46;
    var gx = W / 2 - (grid[0].length * cellW) / 2;
    var gy = 20;

    for (var r = 0; r < grid.length; r++) {
      for (var c = 0; c < grid[r].length; c++) {
        var ch = SMK.characterById(grid[r][c]);
        var sel = (app.sel.charRow === r && app.sel.charCol === c);
        var x = gx + c * cellW, y = gy + r * cellH;
        rect(f, x + 2, y + 2, cellW - 4, cellH - 4, sel ? '#485c98' : '#1c2848');
        if (sel) {
          rect(f, x + 2, y + 2, cellW - 4, 1, '#ffd800');
          rect(f, x + 2, y + cellH - 3, cellW - 4, 1, '#ffd800');
          rect(f, x + 2, y + 2, 1, cellH - 4, '#ffd800');
          rect(f, x + cellW - 3, y + 2, 1, cellH - 4, '#ffd800');
        }
        /* the selected driver's kart turns on the spot */
        var idx = sel ? (Math.floor(app.t * 4) % 16) : 8;
        portrait(f, ch, x + cellW / 2, y + cellH - 10, sel ? 1.0 : 0.82, idx);
        text(f, x + cellW / 2, y + cellH - 9, ch.shortName, sel ? 'hudY' : 'hudDim', { align: 'center' });
      }
    }

    /* the chosen driver's numbers */
    var cur = SMK.characterById(grid[app.sel.charRow][app.sel.charCol]);
    var st = cur.stats;
    panel(f, 14, 118, 228, 82, cur.name);
    statBar(f, 24, 136, 'SPEED', st.topSpeed, 1.10, '#f85858');
    statBar(f, 24, 148, 'ACCEL', st.accel, 1.25, '#58d858');
    statBar(f, 24, 160, 'TURN', st.handling, 1.30, '#58a8ff');
    statBar(f, 24, 172, 'WEIGHT', st.weight, 1.45, '#f8d800');

    text(f, 150, 136, 'CLASS', 'hudDim');
    text(f, 150, 146, cur.weightClass, 'hud');
    text(f, 150, 160, 'CPU ITEM', 'hudDim');
    var sp = SMK.objArt.get(SMK.Items.iconFor(cur.special));
    if (sp) SMK.blitScaled(f, W, H, sp.bufs[0], 150, 168, 16, 16);
    text(f, 170, 172, SMK.Items.defs[cur.special].name.split(' ')[0], 'hud');

    text(f, W / 2, H - 14, 'ENTER SELECT     ESC BACK', 'menuDim', { align: 'center' });

    /* navigation across the grid */
    var moved = false;
    if (SMK.input.pressed.left) { app.sel.charCol = (app.sel.charCol + grid[0].length - 1) % grid[0].length; moved = true; }
    if (SMK.input.pressed.right) { app.sel.charCol = (app.sel.charCol + 1) % grid[0].length; moved = true; }
    if (SMK.input.pressed.accel || SMK.input.pressed.brake) {
      app.sel.charRow = (app.sel.charRow + 1) % grid.length; moved = true;
    }
    if (moved) SMK.audio.sfx('menuMove');
    if (SMK.input.pressed.start) {
      SMK.audio.sfx('menuPick');
      app.chosen.character = cur.id;
      app.go(app.chosen.mode === 'gp' ? 'cup'
           : (app.chosen.mode === 'battle' ? 'arena' : 'course'));
    }
    if (SMK.input.pressed.back) {
      SMK.audio.sfx('menuBack');
      app.go(app.chosen.mode === 'battle' ? 'mode' : 'engine');
    }
  }

  /* ---------------- cup select ---------------- */
  function cup(app, f) {
    backdrop(f, app.t, 'dark');
    text(f, W / 2, 8, 'SELECT A CUP', 'menuSel', { align: 'center' });

    var cups = SMK.cups;
    for (var i = 0; i < cups.length; i++) {
      var sel = app.sel.cup === i;
      var cw = 56;
      var x = W / 2 - (cups.length * cw) / 2 + i * cw;
      var y = 26;
      rect(f, x + 3, y, cw - 6, 46, sel ? '#485c98' : '#1c2848');
      if (sel) {
        rect(f, x + 3, y, cw - 6, 1, '#ffd800');
        rect(f, x + 3, y + 45, cw - 6, 1, '#ffd800');
      }
      var em = SMK.ui.emblem(cups[i].emblem);
      var s = sel ? 1.4 : 1.0;
      SMK.blitScaled(f, W, H, em, x + cw / 2 - em.w * s / 2, y + 6, em.w * s, em.h * s);
      text(f, x + cw / 2, y + 36, cups[i].name.split(' ')[0], sel ? 'hudY' : 'hudDim', { align: 'center' });
    }

    /* the five courses in the highlighted cup, with your best time */
    var cc = cups[app.sel.cup];
    panel(f, 24, 82, 208, 112, cc.name);
    for (var j = 0; j < cc.courses.length; j++) {
      var course = SMK.courseById(cc.courses[j]);
      var ty = 100 + j * 17;
      text(f, 34, ty, String(j + 1), 'hudDim');
      text(f, 46, ty, course.name, 'hud');
      var best = SMK.store.get('best.' + course.id + '.' + app.chosen.engine.id, null);
      text(f, 224, ty, best === null ? '--' : SMK.formatTime(best), 'hudY', { align: 'right' });
    }
    text(f, W / 2, H - 14, 'ENTER START     ESC BACK', 'menuDim', { align: 'center' });

    if (navPickLR(app, 'cup', cups.length)) {
      app.startGrandPrix(cups[app.sel.cup]);
    }
    if (SMK.input.pressed.back) { SMK.audio.sfx('menuBack'); app.go('chars'); }
  }

  /* ---------------- single course select ---------------- */
  function course(app, f) {
    backdrop(f, app.t, 'dark');
    text(f, W / 2, 6, app.chosen.mode === 'tt' ? 'TIME TRIAL' : 'VS RACE', 'menuSel', { align: 'center' });

    var ids = SMK.allCourseIds();
    var sel = app.sel.course % ids.length;
    var cur = SMK.courseById(ids[sel]);

    /* the list, windowed around the selection */
    panel(f, 8, 18, 132, 186, 'COURSE');
    var first = SMK.clamp(sel - 4, 0, Math.max(0, ids.length - 10));
    for (var i = 0; i < 10 && first + i < ids.length; i++) {
      var ci = first + i;
      var c = SMK.courseById(ids[ci]);
      var y = 34 + i * 17;
      var on = ci === sel;
      if (on) rect(f, 12, y - 3, 124, 15, '#384a80');
      text(f, 16, y, c.name, on ? 'menuSel' : 'menu');
    }

    /* preview: the course map and its notes */
    panel(f, 146, 18, 102, 186, 'PREVIEW');
    var track = app.previewTrack(cur.id);
    if (track) {
      var m = track.map;
      var mx = Math.round(197 - m.w / 2), my = 40;
      SMK.blit(f, W, H, SMK.ui.mapPanel(m.w + 4, m.h + 4), mx - 2, my - 2);
      SMK.blit(f, W, H, m.buf, mx, my);
      text(f, 197, my + m.h + 8, track.theme.name, 'hudY', { align: 'center' });
      text(f, 197, my + m.h + 18, 'LEN ' + Math.round(track.length), 'hudDim', { align: 'center' });
      var best = SMK.store.get('best.' + cur.id + '.' + app.chosen.engine.id, null);
      text(f, 197, my + m.h + 30, 'BEST', 'hudDim', { align: 'center' });
      text(f, 197, my + m.h + 40, best === null ? '--' : SMK.formatTime(best), 'hudY', { align: 'center' });
    }
    text(f, W / 2, H - 11, 'ENTER START   ESC BACK', 'menuDim', { align: 'center' });

    var moved = false;
    if (SMK.input.pressed.accel || SMK.input.pressed.left) { app.sel.course = (sel + ids.length - 1) % ids.length; moved = true; }
    if (SMK.input.pressed.brake || SMK.input.pressed.right) { app.sel.course = (sel + 1) % ids.length; moved = true; }
    if (moved) SMK.audio.sfx('menuMove');
    if (SMK.input.pressed.start) { SMK.audio.sfx('menuPick'); app.startSingle(ids[app.sel.course % ids.length]); }
    if (SMK.input.pressed.back) { SMK.audio.sfx('menuBack'); app.go('chars'); }
  }

  /* ---------------- arena select ---------------- */
  function arena(app, f) {
    backdrop(f, app.t, 'dark');
    text(f, W / 2, 6, 'BATTLE COURSE', 'menuSel', { align: 'center' });

    var ids = SMK.arenaList;
    var sel = app.sel.arena % ids.length;
    var def = SMK.arenas[ids[sel]];

    panel(f, 10, 18, 108, 186, 'ARENA');
    for (var i = 0; i < ids.length; i++) {
      var d = SMK.arenas[ids[i]];
      var y = 38 + i * 20;
      var on = i === sel;
      if (on) rect(f, 14, y - 4, 100, 17, '#384a80');
      text(f, 18, y, d.name.replace('BATTLE COURSE ', 'COURSE '), on ? 'menuSel' : 'menu');
    }
    text(f, 64, 130, SMK.themes[def.theme].name, 'hudY', { align: 'center' });
    text(f, 64, 150, '3 BALLOONS', 'hudDim', { align: 'center' });
    text(f, 64, 162, '4 KARTS', 'hudDim', { align: 'center' });

    panel(f, 124, 18, 124, 186, 'PREVIEW');
    var track = app.previewArena(ids[sel]);
    if (track) {
      var m = track.map;
      var mx = Math.round(186 - m.w / 2), my = 44;
      SMK.blit(f, W, H, SMK.ui.mapPanel(m.w + 4, m.h + 4), mx - 2, my - 2);
      SMK.blit(f, W, H, m.buf, mx, my);
    }
    /* the course's own note, wrapped by hand to the panel width */
    var words = (def.notes || '').toUpperCase().split(' ');
    var line = '', ly = 152;
    for (var w = 0; w < words.length; w++) {
      var test = line ? line + ' ' + words[w] : words[w];
      if (SMK.Text.measure(test, 'hudDim') > 112) {
        text(f, 186, ly, line, 'hudDim', { align: 'center' });
        ly += 9; line = words[w];
        if (ly > 190) { line = ''; break; }
      } else line = test;
    }
    if (line) text(f, 186, ly, line, 'hudDim', { align: 'center' });

    text(f, W / 2, H - 11, 'ENTER START   ESC BACK', 'menuDim', { align: 'center' });

    var moved = false;
    if (SMK.input.pressed.accel || SMK.input.pressed.left) { app.sel.arena = (sel + ids.length - 1) % ids.length; moved = true; }
    if (SMK.input.pressed.brake || SMK.input.pressed.right) { app.sel.arena = (sel + 1) % ids.length; moved = true; }
    if (moved) SMK.audio.sfx('menuMove');
    if (SMK.input.pressed.start) { SMK.audio.sfx('menuPick'); app.startBattle(ids[app.sel.arena % ids.length]); }
    if (SMK.input.pressed.back) { SMK.audio.sfx('menuBack'); app.go('chars'); }
  }

  /* ---------------- race results ---------------- */
  function results(app, f) {
    var race = app.race;
    backdrop(f, app.t, 'dark');
    text(f, W / 2, 6, race.course.name, 'menuSel', { align: 'center' });

    var order = race.resultOrder || race.order || race.karts;
    panel(f, 12, 18, 232, 158, 'RESULTS');

    for (var i = 0; i < order.length; i++) {
      var k = order[i];
      var y = 36 + i * 16;
      var me = k.isPlayer;
      if (me) rect(f, 16, y - 3, 224, 15, '#384a80');
      text(f, 22, y, SMK.ordinal(i + 1), me ? 'hudY' : 'hudDim');
      rect(f, 52, y + 1, 7, 7, '#101018');
      rect(f, 53, y + 2, 5, 5, k.char.mapColor);
      /* 'DONKEY KONG JR' does not fit beside a lap time; fall back to
         the short name rather than letting the columns collide */
      var nm = k.char.name.length > 11 ? k.char.shortName : k.char.name;
      text(f, 64, y, nm, me ? 'hud' : 'hudDim');
      if (race.battle) {
        text(f, 196, y, k.balloons + ' BALLOON' + (k.balloons === 1 ? '' : 'S'),
             me ? 'hudY' : 'hudDim', { align: 'right' });
      } else {
        text(f, 196, y, SMK.formatTime(k.finishTime), me ? 'hudY' : 'hudDim', { align: 'right' });
      }
      if (app.chosen.mode === 'gp') {
        var pts = SMK.GP_POINTS[i] || 0;
        text(f, 236, y, '+' + pts, pts ? (me ? 'hudG' : 'hudDim') : 'menuDim', { align: 'right' });
      }
    }

    if (race.bestLap) {
      text(f, 22, 182, 'BEST LAP', 'hudDim');
      text(f, 100, 182, SMK.formatTime(race.bestLap), 'hudY');
    }
    if (race.newRecord) text(f, 234, 182, 'NEW RECORD!', 'hudG', { align: 'right' });

    if ((Math.floor(app.t * 2) & 1) === 0)
      text(f, W / 2, 200, 'PRESS START', 'menuSel', { align: 'center' });

    if (SMK.input.pressed.start || SMK.input.pressed.accel) {
      SMK.audio.sfx('menuPick');
      app.afterResults();
    }
  }

  /* ---------------- Grand Prix standings ---------------- */
  function standings(app, f) {
    backdrop(f, app.t, 'dark');
    var gp = app.gp;
    text(f, W / 2, 6, gp.cup.name, 'menuSel', { align: 'center' });
    text(f, W / 2, 16, 'RACE ' + gp.raceIndex + ' OF ' + gp.cup.courses.length, 'hudDim', { align: 'center' });

    var rows = gp.points.slice().sort(function (a, b) {
      if (b.points !== a.points) return b.points - a.points;
      return a.lastPlace - b.lastPlace;
    });
    panel(f, 28, 28, 200, 160, 'STANDINGS');
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var ch = SMK.characterById(r.id);
      var y = 46 + i * 16;
      var me = r.id === app.chosen.character;
      if (me) rect(f, 32, y - 3, 192, 15, '#384a80');
      text(f, 38, y, String(i + 1), me ? 'hudY' : 'hudDim');
      rect(f, 52, y + 1, 7, 7, '#101018');
      rect(f, 53, y + 2, 5, 5, ch.mapColor);
      var snm = ch.name.length > 12 ? ch.shortName : ch.name;
      text(f, 64, y, snm, me ? 'hud' : 'hudDim');
      text(f, 218, y, String(r.points), me ? 'hudY' : 'hudDim', { align: 'right' });
    }

    if ((Math.floor(app.t * 2) & 1) === 0)
      text(f, W / 2, 198, gp.raceIndex >= gp.cup.courses.length ? 'PRESS START' : 'PRESS START FOR NEXT RACE',
           'menuSel', { align: 'center' });

    if (SMK.input.pressed.start || SMK.input.pressed.accel) {
      SMK.audio.sfx('menuPick');
      app.afterStandings();
    }
  }

  /* ---------------- trophy ceremony ---------------- */
  function ceremony(app, f) {
    backdrop(f, app.t, 'dark');
    var gp = app.gp;
    var rows = gp.points.slice().sort(function (a, b) {
      if (b.points !== a.points) return b.points - a.points;
      return a.lastPlace - b.lastPlace;
    });

    text(f, W / 2, 8, gp.cup.name, 'menuSel', { align: 'center' });
    var em = SMK.ui.emblem(gp.cup.emblem);
    SMK.blitScaled(f, W, H, em, W / 2 - em.w, 20, em.w * 2, em.h * 2);

    /* three steps, tallest in the middle */
    var podium = [
      { i: 1, x: 70, h: 26 },
      { i: 0, x: 128, h: 40 },
      { i: 2, x: 186, h: 16 }
    ];
    for (var k = 0; k < podium.length; k++) {
      var pd = podium[k];
      var r = rows[pd.i];
      if (!r) continue;
      var ch = SMK.characterById(r.id);
      var baseY = 170;
      rect(f, pd.x - 24, baseY - pd.h, 48, pd.h, '#3c4870');
      rect(f, pd.x - 24, baseY - pd.h, 48, 2, '#6c7ca8');
      text(f, pd.x, baseY - pd.h + 6, SMK.ordinal(pd.i + 1), 'hudY', { align: 'center' });
      /* the winner's kart bounces */
      var bob = pd.i === 0 ? Math.round(Math.abs(Math.sin(app.t * 4)) * -4) : 0;
      portrait(f, ch, pd.x, baseY - pd.h + bob, 1.25, 8);
      text(f, pd.x, baseY + 5, ch.shortName, 'hud', { align: 'center' });
      text(f, pd.x, baseY + 15, String(r.points) + ' PTS', 'hudDim', { align: 'center' });
    }

    var mine = -1;
    for (var m = 0; m < rows.length; m++) if (rows[m].id === app.chosen.character) mine = m;
    dith(f, 0, 196, W, 26, '#101828');
    text(f, W / 2, 199, 'YOU FINISHED ' + SMK.ordinal(mine + 1), mine === 0 ? 'hudG' : 'hud', { align: 'center' });
    if ((Math.floor(app.t * 2) & 1) === 0)
      text(f, W / 2, 210, 'PRESS START', 'menuSel', { align: 'center' });

    if (SMK.input.pressed.start || SMK.input.pressed.accel) {
      SMK.audio.sfx('menuPick');
      app.go('title');
    }
  }

  /* ---- shared navigation helpers ---- */
  function navPick(app, key, n) {
    if (SMK.input.pressed.accel || SMK.input.pressed.left) {
      app.sel[key] = (app.sel[key] + n - 1) % n; SMK.audio.sfx('menuMove');
    }
    if (SMK.input.pressed.brake || SMK.input.pressed.right) {
      app.sel[key] = (app.sel[key] + 1) % n; SMK.audio.sfx('menuMove');
    }
    if (SMK.input.pressed.start) { SMK.audio.sfx('menuPick'); return true; }
    return false;
  }

  function navPickLR(app, key, n) {
    if (SMK.input.pressed.left) { app.sel[key] = (app.sel[key] + n - 1) % n; SMK.audio.sfx('menuMove'); }
    if (SMK.input.pressed.right) { app.sel[key] = (app.sel[key] + 1) % n; SMK.audio.sfx('menuMove'); }
    if (SMK.input.pressed.accel) { app.sel[key] = (app.sel[key] + n - 1) % n; SMK.audio.sfx('menuMove'); }
    if (SMK.input.pressed.brake) { app.sel[key] = (app.sel[key] + 1) % n; SMK.audio.sfx('menuMove'); }
    if (SMK.input.pressed.start) { SMK.audio.sfx('menuPick'); return true; }
    return false;
  }

  /* ---- loading card while a track bakes ---- */
  function loading(app, f) {
    backdrop(f, app.t, 'dark');
    panel(f, 48, 92, 160, 44);
    text(f, W / 2, 104, 'NOW LOADING', 'menuSel', { align: 'center' });
    var dots = 1 + (Math.floor(app.t * 4) % 3);
    text(f, W / 2, 118, '.'.repeat(dots), 'hudY', { align: 'center' });
  }

  SMK.menus = {
    screens: {
      title: title, mode: mode, engine: engine, chars: chars,
      cup: cup, course: course, arena: arena, results: results,
      standings: standings, ceremony: ceremony, loading: loading
    },
    backdrop: backdrop,
    panel: panel,
    MODES: MODES
  };

})(window.SMK);
