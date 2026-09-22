/* ------------------------------------------------------------------
   main.js — the machine: canvas, main loop, and the app state that
   walks you from the title screen through a cup and back again.

   The whole game composites into one 256x224 Uint32Array and reaches
   the canvas through a single putImageData per frame, then the canvas
   element is upscaled by an integer factor with nearest-neighbour so
   every pixel stays square.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var W = 256, H = 224;

  var canvas, ctx, imageData, frame;
  var lastTime = 0, running = false;
  var fpsAcc = 0, fpsFrames = 0, fps = 0;

  /* ------------------------------------------------------------------
     app state
     ------------------------------------------------------------------ */
  var app = {
    t: 0,
    screen: 'title',
    race: null,
    gp: null,
    pending: null,
    sel: { mode: 0, engine: 2, charRow: 0, charCol: 0, cup: 0, course: 0 },
    chosen: { mode: 'gp', engine: null, character: 'mario' },
    settings: {
      layout: SMK.store.get('layout', 'classic'),
      hd: SMK.store.get('hd', false),
      crt: SMK.store.get('crt', false)
    },
    debug: false
  };
  app.chosen.engine = SMK.ENGINE_CLASSES[app.sel.engine];
  SMK.app = app;

  app.go = function (screen) {
    app.screen = screen;
    app.screenTime = 0;
    if (screen === 'title') {
      app.race = null; app.gp = null;
      SMK.audio.playMusic('title');
      SMK.audio.stopEngine();
    } else if (screen === 'results' || screen === 'standings' || screen === 'ceremony') {
      SMK.audio.playMusic('results');
    } else if (screen !== 'race') {
      SMK.audio.playMusic('title');
    }
  };

  /* ---- preview tracks for the course-select screen ---- */
  var previewCache = {};
  app.previewTrack = function (id) {
    var t = previewCache[id];
    if (!t) {
      var c = SMK.courseById(id);
      if (!c) return null;
      t = previewCache[id] = SMK.buildTrackPreview(c);
    }
    return t;
  };

  /* ---- starting a race -------------------------------------------- */
  function beginRace(opts) {
    /* show the loading card for one frame, then bake */
    app.pending = opts;
    app.screen = 'loading';
  }

  function reallyStartRace(opts) {
    app.race = new SMK.Race(opts);
    app.race.layout = app.settings.layout;
    app.race.hd = app.settings.hd;
    app.screen = 'race';
    app.pending = null;
  }

  app.startSingle = function (courseId) {
    beginRace({
      mode: app.chosen.mode,
      courseId: courseId,
      characterId: app.chosen.character,
      engine: app.chosen.engine,
      layout: app.settings.layout,
      hd: app.settings.hd
    });
  };

  app.startGrandPrix = function (cup) {
    app.gp = {
      cup: cup,
      raceIndex: 0,
      points: SMK.characters.map(function (c) {
        return { id: c.id, points: 0, lastPlace: 8 };
      }),
      gridOrder: null
    };
    nextGrandPrixRace();
  };

  function nextGrandPrixRace() {
    var gp = app.gp;
    var courseId = gp.cup.courses[gp.raceIndex];
    beginRace({
      mode: 'gp',
      courseId: courseId,
      characterId: app.chosen.character,
      engine: app.chosen.engine,
      gridOrder: gp.gridOrder,
      layout: app.settings.layout,
      hd: app.settings.hd
    });
  }

  /* ---- after a race ------------------------------------------------ */
  app.afterResults = function () {
    if (app.chosen.mode !== 'gp') { app.go('title'); return; }

    /* award points and remember the finishing order for the next grid */
    var gp = app.gp;
    var order = app.race.resultOrder || app.race.order;
    for (var i = 0; i < order.length; i++) {
      var id = order[i].char.id;
      for (var j = 0; j < gp.points.length; j++) {
        if (gp.points[j].id === id) {
          gp.points[j].points += (SMK.GP_POINTS[i] || 0);
          gp.points[j].lastPlace = i + 1;
        }
      }
    }
    gp.gridOrder = app.race.nextGridOrder();
    gp.raceIndex++;
    app.go('standings');
  };

  app.afterStandings = function () {
    var gp = app.gp;
    if (gp.raceIndex >= gp.cup.courses.length) {
      app.go('ceremony');
    } else {
      nextGrandPrixRace();
    }
  };

  /* ------------------------------------------------------------------
     canvas plumbing
     ------------------------------------------------------------------ */
  function setupCanvas() {
    canvas = document.getElementById('screen');
    ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;
    imageData = ctx.createImageData(W, H);
    frame = new Uint32Array(imageData.data.buffer);
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    var pad = document.body.classList.contains('fs') ? 0 : 56;
    var availW = window.innerWidth - pad;
    var availH = window.innerHeight - pad;
    var scale = Math.max(1, Math.floor(Math.min(availW / W, availH / H)));
    canvas.style.width = (W * scale) + 'px';
    canvas.style.height = (H * scale) + 'px';
  }

  function present() {
    ctx.putImageData(imageData, 0, 0);
  }

  /* ------------------------------------------------------------------
     the loop
     ------------------------------------------------------------------ */
  function tick(now) {
    if (!running) return;
    requestAnimationFrame(tick);

    var dt = lastTime ? (now - lastTime) / 1000 : 1 / 60;
    lastTime = now;
    if (dt > 0.25) dt = 1 / 60;          /* returned from a background tab */
    app.t += dt;
    app.screenTime = (app.screenTime || 0) + dt;

    fpsAcc += dt; fpsFrames++;
    if (fpsAcc > 0.5) { fps = fpsFrames / fpsAcc; fpsAcc = 0; fpsFrames = 0; }

    SMK.input.update();
    handleHotkeys();

    if (app.screen === 'race' && app.race) {
      updateRace(dt);
    } else {
      /* menus draw straight into the frame and read input themselves */
      var fn = SMK.menus.screens[app.screen] || SMK.menus.screens.title;
      fn(app, frame, dt);
      /* bake the pending track on the frame after the card is shown */
      if (app.screen === 'loading' && app.pending && app.screenTime > 0.05) {
        var opts = app.pending;
        app.pending = null;
        reallyStartRace(opts);
      }
    }

    if (app.debug) drawDebug();
    present();
  }

  function handleHotkeys() {
    if (SMK.input.consumeHotkey('mute')) {
      SMK.audio.toggleMute();
    }
    if (SMK.input.consumeHotkey('hd')) {
      app.settings.hd = !app.settings.hd;
      SMK.store.set('hd', app.settings.hd);
      if (app.race) app.race.hd = app.settings.hd;
    }
    if (SMK.input.consumeHotkey('view')) {
      app.settings.layout = app.settings.layout === 'classic' ? 'wide' : 'classic';
      SMK.store.set('layout', app.settings.layout);
      if (app.race) app.race.layout = app.settings.layout;
    }
    if (SMK.input.consumeHotkey('fullscreen')) toggleFullscreen();
    if (SMK.input.consumeHotkey('debug')) app.debug = !app.debug;
  }

  function toggleFullscreen() {
    var el = document.documentElement;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen();
      document.body.classList.add('fs');
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      document.body.classList.remove('fs');
    }
    setTimeout(resize, 60);
  }

  /* ---- the race frame ---- */
  function updateRace(dt) {
    var race = app.race;
    var In = SMK.input;

    /* pause */
    if (race.state === 'racing' || race.state === 'finishing') {
      if (In.pressed.start) {
        race.paused = !race.paused;
        SMK.audio.sfx('menuPick');
      }
    }
    if (race.paused) {
      if (In.pressed.back) {
        race.paused = false;
        SMK.audio.stopEngine();
        app.go('title');
        return;
      }
      race.render(frame, W, H);
      SMK.hud.draw(frame, W, H, race);
      return;
    }
    if (In.pressed.back && race.state !== 'results') {
      SMK.audio.stopEngine();
      app.go('title');
      return;
    }

    race.playerControls = {
      steer: In.steer,
      accel: In.held.accel,
      brake: In.held.brake,
      drift: In.held.drift,
      item: In.pressed.item
    };

    race.update(dt);
    race.render(frame, W, H);
    SMK.hud.draw(frame, W, H, race);

    if (race.state === 'results') {
      app.race = race;
      app.go('results');
    }
  }

  function drawDebug() {
    var lines = ['FPS ' + fps.toFixed(0)];
    if (app.race) {
      var p = app.race.player;
      lines.push('SPD ' + p.speed.toFixed(0) + ' SLIP ' + p.slip.toFixed(0));
      lines.push('SURF ' + p.surface + ' Z ' + p.z.toFixed(0));
      lines.push('LAP ' + p.lap + ' NODE ' + p.nodeIdx);
      lines.push('OBJ ' + app.race.objects.length + ' PRJ ' + app.race.projectiles.length);
      lines.push(app.race.state);
    }
    for (var i = 0; i < lines.length; i++)
      SMK.Text.draw(frame, W, H, 2, 2 + i * 9, lines[i], 'hudG');
  }

  /* ------------------------------------------------------------------
     boot
     ------------------------------------------------------------------ */
  var booted = false;
  function boot() {
    /* the overlay fires from both the button and its own backdrop, and
       a second loop would eat every other input frame */
    if (booted) return;
    booted = true;
    setupCanvas();
    SMK.input.attach(window);
    if (app.settings.crt) document.body.classList.add('crt');

    /* warm the sprite sheets so the first race does not hitch */
    for (var i = 0; i < SMK.characters.length; i++) SMK.kartArt.bake(SMK.characters[i]);

    SMK.audio.init();
    SMK.audio.setMute(SMK.audio.muted);
    SMK.audio.resume();
    app.go('title');

    running = true;
    lastTime = 0;
    requestAnimationFrame(tick);
  }

  /* the boot overlay exists so the first user gesture can unlock audio */
  function wireBootButton() {
    var overlay = document.getElementById('boot');
    var btn = document.getElementById('bootbtn');
    function start() {
      if (booted) return;
      overlay.classList.add('gone');
      boot();
    }
    btn.addEventListener('click', start);
    overlay.addEventListener('click', start);
    window.addEventListener('keydown', function onk(e) {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ') {
        window.removeEventListener('keydown', onk);
        start();
      }
    });
  }

  /* exposed so the headless harness can drive the game */
  SMK.boot = boot;
  SMK.debug = {
    /* hand the player's kart to the AI — used by the headless soak test
       to drive whole races without a human at the keyboard */
    autopilot: function (on) {
      var r = app.race;
      if (!r) return false;
      r.playerAuto = !!on;
      if (on && !r.player.ai) SMK.makeAI(r.player, r, 0);
      return true;
    },
    get frame() { return frame; },
    get app() { return app; },
    get fps() { return fps; },
    tickOnce: function (dt) {
      SMK.input.update();
      if (app.screen === 'race' && app.race) updateRace(dt);
      else (SMK.menus.screens[app.screen] || SMK.menus.screens.title)(app, frame, dt);
      present();
    }
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', wireBootButton);
  else wireBootButton();

})(window.SMK);
