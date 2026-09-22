/* ------------------------------------------------------------------
   hud.js — the on-screen furniture.

   Classic layout mirrors the original's single-player screen: the road
   gets the top half with the item window, coin count, lap and clock
   overlaid, and the bottom half is a dedicated panel holding the course
   map with a blip per racer and the running order down the side.

   Wide layout keeps the same pieces but floats the map in a corner so
   the road can have the whole screen.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var T = null;   /* SMK.Text, resolved lazily */

  function text(frame, W, H, x, y, s, style, opt) {
    SMK.Text.draw(frame, W, H, x, y, s, style, opt);
  }

  /* ---- item window ------------------------------------------------ */
  function drawItemWindow(frame, W, H, race, x, y) {
    var size = 30;
    var fr = SMK.ui.itemFrame(size, size);
    SMK.blit(frame, W, H, fr, x, y);

    var p = race.player;
    var iconName = null;

    if (p.rollTime > 0) {
      /* the roulette spinning before it settles */
      var icons = SMK.Items.rouletteIcons();
      var i = Math.floor(race.time * 22) % icons.length;
      iconName = icons[i];
      if (Math.floor(race.time * 22) !== Math.floor((race.time - 0.016) * 22))
        SMK.audio.sfx('itemRoll');
    } else if (p.item) {
      iconName = SMK.Items.iconFor(p.item);
    }

    if (iconName) {
      var art = SMK.objArt.get(iconName);
      if (art) {
        var fi = art.fps ? Math.floor(race.time * art.fps) % art.frameCount : 0;
        var src = art.bufs[fi];
        var s = Math.min(22 / src.w, 22 / src.h);
        var w = Math.round(src.w * s), h = Math.round(src.h * s);
        SMK.blitScaled(frame, W, H, src, x + (size - w) / 2, y + (size - h) / 2, w, h);
      }
      /* remaining charges of a triple */
      if (p.itemCount > 1) {
        text(frame, W, H, x + size - 3, y + size - 9, String(p.itemCount), 'hudY', { align: 'right' });
      }
    }
  }

  /* ---- coins ------------------------------------------------------ */
  function drawCoins(frame, W, H, race, x, y) {
    var art = SMK.objArt.get('i_coin');
    if (art) {
      var src = art.bufs[0];
      SMK.blitScaled(frame, W, H, src, x, y, 11, 12);
    }
    text(frame, W, H, x + 14, y + 2, String(race.player.coins), 'hudY');
  }

  /* ---- position, big and leaning like the original's ------------- */
  function drawPlace(frame, W, H, race, x, y) {
    var place = race.player.place;
    var style = place === 1 ? 'pos' : 'pos';
    SMK.Text.draw(frame, W, H, x, y, String(place), style);
    var w = SMK.Text.measure(String(place), style);
    SMK.Text.draw(frame, W, H, x + w + 2, y + 8, SMK.ordinalSuffix(place), 'posSm');
  }

  /* ---- course map with a blip per racer -------------------------- */
  function drawMap(frame, W, H, race, cx, cy) {
    var map = race.track.map;
    var mx = Math.round(cx - map.w / 2), my = Math.round(cy - map.h / 2);
    SMK.blit(frame, W, H, map.buf, mx, my);

    /* racers: everyone in their kart colour, the player flashing white */
    var blink = (Math.floor(race.time * 6) & 1) === 0;
    for (var i = 0; i < race.karts.length; i++) {
      var k = race.karts[i];
      var pt = SMK.mapPoint(race.track, k.x, k.y);
      var px = mx + Math.round(pt.x), py = my + Math.round(pt.y);
      var col = k.isPlayer ? (blink ? '#ffffff' : '#ff3030') : k.char.mapColor;
      var r = k.isPlayer ? 2 : 1;
      SMK.fillRect(frame, W, H, px - r, py - r, r * 2 + 1, r * 2 + 1, '#101018');
      SMK.fillRect(frame, W, H, px - r + 1, py - r + 1, r * 2 - 1, r * 2 - 1, col);
      if (k.isPlayer) SMK.fillRect(frame, W, H, px - 1, py - 1, 3, 3, col);
    }
  }

  /* ---- running order down the side ------------------------------ */
  function drawStandings(frame, W, H, race, x, y) {
    var order = race.order || race.karts;
    var rowH = 11;
    for (var i = 0; i < order.length; i++) {
      var k = order[i];
      var ty = y + i * rowH;
      var sel = k.isPlayer;
      if (sel) SMK.fillRect(frame, W, H, x - 2, ty - 2, 126, rowH, '#283458');
      /* place */
      text(frame, W, H, x, ty, String(i + 1), sel ? 'hudY' : 'hudDim');
      /* colour chip */
      SMK.fillRect(frame, W, H, x + 12, ty + 1, 6, 6, '#101018');
      SMK.fillRect(frame, W, H, x + 13, ty + 2, 4, 4, k.char.mapColor);
      /* name */
      text(frame, W, H, x + 22, ty, k.char.shortName, sel ? 'hud' : 'hudDim');
      /* lap or finishing time */
      if (k.finished) {
        text(frame, W, H, x + 124, ty, SMK.formatTime(k.finishTime), sel ? 'hudY' : 'hudDim', { align: 'right' });
      } else {
        text(frame, W, H, x + 124, ty, 'L' + SMK.clamp(k.lap + 1, 1, race.laps), sel ? 'hud' : 'hudDim', { align: 'right' });
      }
    }
  }

  /* ---- Lakitu, hovering over the road --------------------------- */
  function drawLakitu(frame, W, H, race, vp) {
    if (!race.lakituBoard) return;
    var bob = Math.round(Math.sin(race.time * 3.4) * 2);
    var lk = SMK.objArt.lakitu(race.lakituBoard, race.lakituLap, bob);
    var scale = 1.35;
    var w = Math.round(lk.w * scale), h = Math.round(lk.h * scale);
    var x = vp.x + vp.w / 2 - w / 2;
    /* slides in from above during the countdown, then settles */
    var drop = race.state === 'intro'
      ? SMK.lerp(-h, 4, SMK.easeOutCubic(SMK.clamp(race.stateTime / 1.2, 0, 1)))
      : 4;
    SMK.blitScaled(frame, W, H, lk.buf, x, vp.y + drop, w, h);
  }

  /* ---- centre banner (GO!, FINAL LAP) --------------------------- */
  function drawBanner(frame, W, H, race, vp) {
    if (!race.banner) return;
    var b = race.banner;
    var style = b.style || 'bigY';
    var y = vp.y + Math.round(vp.h * 0.42);
    var w = SMK.Text.measure(b.text, style);
    SMK.ditherRect(frame, W, H, vp.x + vp.w / 2 - w / 2 - 6, y - 4, w + 12,
                   SMK.Text.height(style) + 8, '#101828');
    SMK.Text.draw(frame, W, H, vp.x + vp.w / 2, y, b.text, style, { align: 'center' });
  }

  /* ------------------------------------------------------------------ */
  function draw(frame, W, H, race) {
    T = SMK.Text;
    var vp = race.viewport();
    var classic = race.layout !== 'wide';

    /* ---- overlays on the road ---- */
    drawItemWindow(frame, W, H, race, 4, 3);
    drawCoins(frame, W, H, race, 5, 36);

    /* lap and clock, top right */
    var lapTxt = 'LAP ' + race.lapDisplay() + '/' + race.laps;
    text(frame, W, H, vp.w - 4, 4, lapTxt, 'hud', { align: 'right' });
    text(frame, W, H, vp.w - 4, 13, SMK.formatTime(race.time), 'hudY', { align: 'right' });

    /* fastest lap so far, small, under the clock */
    if (race.player.lapTimes.length) {
      var fastest = Math.min.apply(null, race.player.lapTimes);
      text(frame, W, H, vp.w - 4, 22, SMK.formatTime(fastest), 'hudDim', { align: 'right' });
    }

    /* position, bottom left of the road view */
    drawPlace(frame, W, H, race, 5, vp.y + vp.h - 28);

    /* state flags, stacked so they cannot overlap each other */
    var flagY = vp.y + vp.h - 12;
    if (race.player.starTime > 0) {
      text(frame, W, H, vp.w - 4, flagY, 'STAR', 'hudY', { align: 'right' });
      flagY -= 9;
    }
    if (race.player.boostTime > 0) {
      text(frame, W, H, vp.w - 4, flagY, 'BOOST', 'hudG', { align: 'right' });
      flagY -= 9;
    }
    if (race.player.shrinkTime > 0) {
      text(frame, W, H, vp.w - 4, flagY, 'SHRUNK', 'hudR', { align: 'right' });
    }

    drawLakitu(frame, W, H, race, vp);
    drawBanner(frame, W, H, race, vp);

    /* ---- the lower panel ---- */
    if (classic) {
      var py = vp.h;
      var ph = H - py;
      SMK.fillRect(frame, W, H, 0, py, W, ph, '#0c1020');
      SMK.fillRect(frame, W, H, 0, py, W, 1, '#485880');
      SMK.fillRect(frame, W, H, 0, py + 1, W, 1, '#182440');

      /* course name across the top of the panel */
      text(frame, W, H, 6, py + 5, race.course.name, 'hud');
      text(frame, W, H, W - 6, py + 5, race.engine.name, 'hudDim', { align: 'right' });

      var map = race.track.map;
      var mapCx = 8 + map.w / 2 + 2;
      var mapCy = py + 16 + map.h / 2;
      var panel = SMK.ui.mapPanel(map.w + 6, map.h + 6);
      SMK.blit(frame, W, H, panel, Math.round(mapCx - panel.w / 2), Math.round(mapCy - panel.h / 2));
      drawMap(frame, W, H, race, mapCx, mapCy);

      drawStandings(frame, W, H, race, 124, py + 18);
    } else {
      /* wide: a small map tucked into the bottom-right corner */
      var m = race.track.map;
      drawMap(frame, W, H, race, W - m.w / 2 - 6, H - m.h / 2 - 6);
    }

    /* ---- paused ---- */
    if (race.paused) {
      SMK.ditherRect(frame, W, H, 0, 0, W, H, '#000010');
      SMK.Text.draw(frame, W, H, W / 2, vp.h / 2 - 12, 'PAUSED', 'big', { align: 'center' });
      SMK.Text.draw(frame, W, H, W / 2, vp.h / 2 + 4, 'ENTER RESUME   ESC QUIT', 'hudDim', { align: 'center' });
    }
  }

  SMK.hud = {
    draw: draw,
    drawMap: drawMap,
    drawStandings: drawStandings
  };

})(window.SMK);
