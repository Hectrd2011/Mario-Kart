/* ------------------------------------------------------------------
   race.js — one race: the field, the camera, the props, the flow.

   Screen layout follows the original, which never gave a single player
   the whole screen: the road gets the top half and the course map the
   bottom half.  `layout` can be switched to 'wide' for a full-screen
   view with a corner map, but 'classic' is the default because the
   short viewport is a large part of why the game looks the way it does.

   Everything visible is gathered into one list, projected, depth
   sorted and blitted back to front, so karts, props, shells and
   particles all occlude each other correctly without any special
   cases.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var SURF = SMK.SURF;

  var CAM_DIST = 120;        /* how far behind the kart the camera sits */
  var CAM_HEIGHT = 42;
  var HORIZON = 40;          /* vanishing row within the viewport      */

  var VIEW_CLASSIC = { x: 0, y: 0, w: 256, h: 112 };
  var VIEW_WIDE = { x: 0, y: 0, w: 256, h: 224 };

  /* ---- shadow, baked once and scaled per sprite ---- */
  var shadowBuf = null;
  function shadow() {
    if (shadowBuf) return shadowBuf;
    var b = new SMK.PixelBuf(32, 14);
    /* a 50% dither reads as a soft shadow without any alpha blending */
    for (var y = 0; y < 14; y++) {
      for (var x = 0; x < 32; x++) {
        var dx = (x - 15.5) / 15.5, dy = (y - 6.5) / 6.5;
        if (dx * dx + dy * dy > 1) continue;
        if (((x ^ y) & 1) === 0) b.px(x, y, '#101018');
      }
    }
    shadowBuf = b;
    return b;
  }

  /* ------------------------------------------------------------------ */
  function Race(opt) {
    this.opt = opt || {};
    this.mode = this.opt.mode || 'vs';           /* gp | tt | vs */
    this.layout = this.opt.layout || 'classic';
    this.engine = this.opt.engine || SMK.ENGINE_CLASSES[2];
    this.rnd = SMK.rng(this.opt.seed || ((Date.now() & 0x7fffffff) || 1));

    var course = SMK.courseById(this.opt.courseId || 'mc1');
    this.course = course;
    this.track = SMK.buildTrack(course);
    this.laps = this.opt.laps || this.track.laps;

    this.m7 = new SMK.Mode7(VIEW_CLASSIC.w, VIEW_CLASSIC.h);
    this.m7.fogStrength = this.track.theme.fog || 0;
    /* the colour the ground fades into at the draw distance: the theme's
       own haze if it has one, otherwise whatever lies beyond the track */
    this.m7.fogColor = this.track.theme.fogColor !== undefined
      ? this.track.theme.fogColor : this.track.theme.voidColor;
    this.sky = SMK.themeSky(this.track.theme);

    this.karts = [];
    this.objects = [];
    this.projectiles = [];
    this.effects = [];

    this.time = 0;
    this.state = 'intro';
    this.stateTime = 0;
    this.flash = 0;
    this.shake = 0;
    this.lakituBoard = null;
    this.lakituTime = 0;
    this.lakituLap = 2;
    this.banner = null;         /* { text, time, style } */
    this.finalLapAnnounced = false;
    this.resultOrder = null;
    this.camAngle = this.track.startAngle;
    this.camX = 0; this.camY = 0;
    this.bandTimer = 0;
    this.placeTimer = 0;
    this.hd = !!this.opt.hd;

    this.buildField();
    this.buildObjects();
    this.snapCamera();
  }
  SMK.Race = Race;
  var R = Race.prototype;

  R.viewport = function () {
    return this.layout === 'wide' ? VIEW_WIDE : VIEW_CLASSIC;
  };

  /* ---- the field -------------------------------------------------- */
  R.buildField = function () {
    var playerId = this.opt.characterId || 'mario';
    var roster = SMK.characters;
    var order = [];

    if (this.mode === 'tt') {
      order = [playerId];
    } else {
      /* the player, then everyone else */
      order.push(playerId);
      for (var i = 0; i < roster.length; i++)
        if (roster[i].id !== playerId) order.push(roster[i].id);
    }

    /* Grand Prix keeps the previous race's standings order on the grid */
    var gridOrder = this.opt.gridOrder;
    if (gridOrder && gridOrder.length === order.length) order = gridOrder.slice();

    for (var j = 0; j < order.length; j++) {
      var ch = SMK.characterById(order[j]);
      var isPlayer = (j === 0 && !gridOrder) || ch.id === playerId;
      var k = new SMK.Kart(ch, isPlayer, j);
      if (!isPlayer) SMK.makeAI(k, this, j);
      this.karts.push(k);
      if (isPlayer) this.player = k;
    }
    if (!this.player) { this.player = this.karts[0]; this.player.isPlayer = true; this.player.ai = null; }

    /* grid order: from the standings in a cup, otherwise the player
       starts at the back of the field and has to come through it */
    var slots;
    if (gridOrder) {
      slots = [];
      for (var g = 0; g < gridOrder.length; g++) {
        for (var h = 0; h < this.karts.length; h++)
          if (this.karts[h].char.id === gridOrder[g]) { slots.push(this.karts[h]); break; }
      }
      if (slots.length !== this.karts.length) slots = null;
    }
    if (!slots) {
      slots = this.karts.filter(function (k) { return !k.isPlayer; });
      slots.push(this.player);
    }
    this.gridSlots = slots;
    SMK.placeOnGrid(this.karts, this.track, slots);

    /* Time Trial hands you three mushrooms, as the original did */
    if (this.mode === 'tt') {
      this.player.item = 'triple';
      this.player.itemCount = 3;
    }
  };

  /* ---- props ------------------------------------------------------ */
  R.buildObjects = function () {
    this.buildScenery();
    var list = this.course.objects || [];
    for (var i = 0; i < list.length; i++) {
      var spec = list[i];
      if (spec.type === 'coin') {
        /* a run of coins along the racing line */
        var n = spec.count || 5;
        for (var c = 0; c < n; c++) {
          var t = spec.at + (c - (n - 1) / 2) * (16 / this.track.length);
          this.addObject('coin', t, spec.u + (c % 2 ? 0.06 : -0.06));
        }
      } else {
        this.addObject(spec.type, spec.at, spec.u, spec);
      }
    }
  };

  /* Theme scenery: things standing beside the road.  Without them the
     Mode 7 plane reads as a flat painted disc, because nothing but the
     road itself tells the eye it is passing anything. */
  R.buildScenery = function () {
    var spec = this.track.theme.scenery;
    var len = this.track.length;

    /* the start gantry, the one landmark every lap goes under */
    var g = this.addObject('gantry', this.course.startAt || 0, 0);
    if (g) { g.z = 0; g.decor = true; }

    if (!spec) return;
    for (var i = 0; i < spec.length; i++) {
      var sp = spec[i];
      var n = Math.max(2, Math.round(len / sp.spacing));
      for (var k = 0; k < n; k++) {
        var t = (this.course.startAt || 0) + k / n;
        /* keep the run-off by the start line clear */
        if (sp.skipNear && (k / n < 0.03 || k / n > 0.97)) continue;
        var jitter = sp.jitter ? (this.rnd() - 0.5) * sp.jitter / len : 0;
        var sides = sp.both ? [-1, 1] : [(k & 1) ? 1 : -1];
        for (var q = 0; q < sides.length; q++) {
          var o = this.addObject(sp.type, t + jitter, sides[q] * sp.u);
          if (o) o.decor = true;
        }
      }
    }
  };

  R.addObject = function (type, t, u, spec) {
    var art = SMK.objArt.get(type);
    if (!art) return null;
    var n = SMK.nodeAtT(this.track, ((t % 1) + 1) % 1);
    var off = (u || 0) * n.hw;
    var o = {
      type: type, art: art,
      x: n.x + n.nx * off, y: n.y + n.ny * off,
      z: art.flat ? 0 : 0,
      baseX: n.x + n.nx * off, baseY: n.y + n.ny * off,
      node: n, u: u || 0,
      active: true, cooldown: 0,
      phase: this.rnd() * 6,
      frame: 0,
      angle: Math.atan2(n.ty, n.tx),
      spec: spec || {},
      /* per-type state */
      up: true, timer: this.rnd() * 3, drift: this.rnd() * SMK.TAU
    };
    this.objects.push(o);
    return o;
  };

  R.spawnEffect = function (name, x, y, z) {
    var art = SMK.objArt.get(name);
    if (!art) return;
    this.effects.push({
      art: art, x: x, y: y, z: z || 0,
      t: 0, dur: 0.30 + art.frameCount * 0.045,
      vz: name === 'fx_poof' ? 26 : 8
    });
  };

  /* coins knocked loose scatter and can be picked back up */
  R.spawnLooseCoins = function (kart, n) {
    for (var i = 0; i < n; i++) {
      var a = this.rnd() * SMK.TAU;
      var d = 16 + this.rnd() * 22;
      var o = this.addObject('coin', 0, 0);
      if (!o) return;
      o.x = kart.x + Math.cos(a) * d;
      o.y = kart.y + Math.sin(a) * d;
      o.baseX = o.x; o.baseY = o.y;
      o.temporary = 9;
      o.cooldown = 0.6;
    }
  };

  /* ---- camera ----------------------------------------------------- */
  R.snapCamera = function () {
    var p = this.player;
    this.camAngle = p.angle;
    this.camX = p.x - Math.cos(this.camAngle) * CAM_DIST;
    this.camY = p.y - Math.sin(this.camAngle) * CAM_DIST;
  };

  R.updateCamera = function (dt) {
    var p = this.player;
    var vp = this.viewport();

    /* the camera swings to the kart's heading with a little lag, which
       is what lets the kart slide visibly sideways in a power-slide */
    var rate = this.state === 'intro' ? 2.4 : 9.0;
    this.camAngle = SMK.wrapAngle(this.camAngle +
      SMK.angleDelta(this.camAngle, p.angle) * (1 - Math.exp(-rate * dt)));

    var dist = CAM_DIST;
    if (this.state === 'intro') {
      /* pull back and orbit slightly while the lights come on */
      dist = CAM_DIST * (1.6 - 0.6 * SMK.easeOutCubic(Math.min(1, this.stateTime / 2.6)));
    }
    if (p.boostTime > 0) dist = CAM_DIST * 1.06;

    this.camX = p.x - Math.cos(this.camAngle) * dist;
    this.camY = p.y - Math.sin(this.camAngle) * dist;

    var cam = this.m7.cam;
    cam.x = this.camX;
    cam.y = this.camY;
    cam.angle = this.camAngle;
    /* rise with the kart on a jump so it does not leave the frame */
    cam.height = CAM_HEIGHT + p.z * 0.55;
    cam.horizon = (this.layout === 'wide' ? HORIZON + 56 : HORIZON) + p.wobble * 0.8
                  + (this.shake > 0 ? (this.rnd() - 0.5) * this.shake * 4 : 0);
    cam.focal = 160;
    /* lean the ground plane into a slide, the way HDMA banking looked */
    cam.roll = SMK.clamp(-p.slip / 260, -0.16, 0.16);

    this.m7.resize(vp.w, vp.h);
    this.m7.supersample = this.hd;
  };

  /* ---- state machine ---------------------------------------------- */
  R.setState = function (s) {
    this.state = s;
    this.stateTime = 0;
  };

  R.update = function (dt) {
    dt = Math.min(dt, 1 / 20);          /* never integrate a huge step */
    this.stateTime += dt;
    this.flash = Math.max(0, this.flash - dt * 2.2);
    this.shake = Math.max(0, this.shake - dt * 3);
    if (this.banner) {
      this.banner.time -= dt;
      if (this.banner.time <= 0) this.banner = null;
    }
    if (this.lakituTime > 0) {
      this.lakituTime -= dt;
      if (this.lakituTime <= 0) this.lakituBoard = null;
    }

    switch (this.state) {
      case 'intro':
        if (this.stateTime === dt) SMK.audio.playMusic(this.track.theme.music);
        this.lakituBoard = 'lights0';
        if (this.stateTime > 2.6) { this.setState('count3'); SMK.audio.sfx('countBeep'); }
        break;
      case 'count3':
        this.lakituBoard = 'lights1';
        if (this.stateTime > 1.0) { this.setState('count2'); SMK.audio.sfx('countBeep'); }
        break;
      case 'count2':
        this.lakituBoard = 'lights2';
        if (this.stateTime > 1.0) { this.setState('go'); SMK.audio.sfx('countGo'); this.flash = 0.5; }
        break;
      case 'go':
        this.lakituBoard = 'lights3';
        this.banner = this.banner || { text: 'GO!', time: 1.0, style: 'bigY' };
        if (this.stateTime > 0.9) { this.setState('racing'); this.lakituBoard = null; }
        break;
      case 'racing':
      case 'finishing':
        this.time += dt;
        break;
      case 'results':
        break;
    }

    var racing = (this.state === 'racing' || this.state === 'finishing' ||
                  this.state === 'go' || this.state === 'count3' ||
                  this.state === 'count2' || this.state === 'intro');

    /* ---- drive everybody ---- */
    var i, k;
    for (i = 0; i < this.karts.length; i++) {
      k = this.karts[i];
      var c;
      if (k === this.player && !this.playerAuto) {
        c = this.playerControls || { steer: 0, accel: false, brake: false, drift: false, item: false };
        /* no throttle until the lights go green */
        if (this.state !== 'racing' && this.state !== 'finishing' && this.state !== 'go') {
          c = { steer: 0, accel: false, brake: false, drift: false, item: false };
        }
        if (c.item && k.item && !k.isDisabled() && k.rollTime <= 0) {
          SMK.Items.use(k, this);
        }
      } else {
        c = SMK.ai.update(k, this, dt);
        if (c.item && k.item && !k.isDisabled()) SMK.Items.use(k, this);
      }
      if (racing || this.state === 'results') k.update(this, dt, c);
    }

    SMK.resolveKartCollisions(this.karts, this);
    SMK.Items.updateProjectiles(this, dt);
    this.updateObjects(dt);
    this.updateEffects(dt);
    this.checkObjectHits();

    /* ---- standings ---- */
    this.placeTimer -= dt;
    if (this.placeTimer <= 0) { this.placeTimer = 0.1; this.updatePlaces(); }
    this.bandTimer -= dt;
    if (this.bandTimer <= 0) { this.bandTimer = 0.25; SMK.ai.updateBand(this); }

    /* ---- engine note ---- */
    var p = this.player;
    var spFrac = SMK.clamp(Math.abs(p.speed) / Math.max(1, p.topSpeed(this)), 0, 1.4);
    SMK.audio.setEngine(spFrac, (this.playerControls && this.playerControls.accel) ? 1 : 0.3,
                        this.state !== 'results');

    /* ---- final-lap music lift ---- */
    if (p.lap === this.laps - 1 && !this.finalLapAnnounced && this.state === 'racing') {
      this.finalLapAnnounced = true;
      this.banner = { text: 'FINAL LAP', time: 2.0, style: 'bigY' };
      SMK.audio.setMusicRate(1.14);
    }

    /* ---- wrong way sign ---- */
    if (p.wrongWayTime > 0.8 && this.state === 'racing') {
      this.lakituBoard = 'wrongway';
      this.lakituTime = Math.max(this.lakituTime, 0.3);
    }

    this.updateCamera(dt);

    /* ---- once the player is home, wind the race up ---- */
    if (this.state === 'finishing' && this.stateTime > 3.2) this.finishRace();
  };

  /* ---- props ------------------------------------------------------ */
  R.updateObjects = function (dt) {
    for (var i = this.objects.length - 1; i >= 0; i--) {
      var o = this.objects[i];
      o.phase += dt;
      if (o.cooldown > 0) {
        o.cooldown -= dt;
        if (o.cooldown <= 0) o.active = true;
      }
      if (o.temporary !== undefined) {
        o.temporary -= dt;
        if (o.temporary <= 0) { this.objects.splice(i, 1); continue; }
      }
      if (o.art.fps) o.frame = Math.floor(o.phase * o.art.fps) % o.art.frameCount;

      switch (o.type) {
        case 'thwomp':
          /* slams down, sits, grinds back up */
          o.timer -= dt;
          if (o.timer <= 0) { o.up = !o.up; o.timer = o.up ? 1.5 : 1.1; }
          var tgt = o.up ? 30 : 0;
          o.z = SMK.approach(o.z, tgt, o.up ? 3.2 : 16, dt);
          o.frame = o.z < 8 ? 1 : 0;
          break;
        case 'boo':
          /* drifts across the road and fades in and out */
          o.drift += dt * 0.7;
          var sway = Math.sin(o.drift) * 0.55;
          o.x = o.baseX + o.node.nx * sway * o.node.hw;
          o.y = o.baseY + o.node.ny * sway * o.node.hw;
          o.z = 16 + Math.sin(o.phase * 1.6) * 5;
          break;
        case 'mole':
          o.timer -= dt;
          if (o.timer <= 0) { o.up = !o.up; o.timer = o.up ? 1.4 : 1.8; }
          o.frame = o.up ? 1 : 0;
          break;
        case 'cheep':
          o.drift += dt * 1.1;
          var s2 = Math.sin(o.drift) * 0.7;
          o.x = o.baseX + o.node.nx * s2 * o.node.hw;
          o.y = o.baseY + o.node.ny * s2 * o.node.hw;
          break;
        case 'firebar':
          /* a fireball swinging round a pivot on the centreline */
          o.drift += dt * 1.9;
          var rad = 38;
          o.x = o.baseX + Math.cos(o.drift) * rad;
          o.y = o.baseY + Math.sin(o.drift) * rad;
          o.z = 8;
          break;
      }
    }
  };

  R.updateEffects = function (dt) {
    for (var i = this.effects.length - 1; i >= 0; i--) {
      var e = this.effects[i];
      e.t += dt;
      e.z += e.vz * dt;
      e.vz -= 40 * dt;
      if (e.t >= e.dur) this.effects.splice(i, 1);
    }
  };

  R.checkObjectHits = function () {
    for (var i = 0; i < this.objects.length; i++) {
      var o = this.objects[i];
      if (!o.active) continue;
      var art = o.art;
      if (art.kind === 'decor') continue;
      for (var j = 0; j < this.karts.length; j++) {
        var k = this.karts[j];
        if (k.fallTime > 0 || k.respawnTime > 0) continue;
        /* hopped or flying over it */
        if (!art.flat && Math.abs(k.z - o.z) > 24) continue;
        if (art.flat && k.z > 14) continue;
        var rr = art.radius + k.radius * 0.8;
        if (SMK.dist2(k.x, k.y, o.x, o.y) > rr * rr) continue;

        switch (art.kind) {
          case 'coin':
            if (k.coins < SMK.TUNING.COIN_MAX) k.coins++;
            o.active = false;
            o.cooldown = o.temporary !== undefined ? 1e9 : 7;
            if (o.temporary !== undefined) o.temporary = 0.01;
            if (k.isPlayer) SMK.audio.sfx('coin');
            break;
          case 'itembox':
            if (SMK.Items.collectBox(k, this, o)) o.active = false;
            break;
          case 'thwomp':
            if (o.z < 12) { if (k.squash(this)) this.shake = Math.max(this.shake, k.isPlayer ? 1 : 0); }
            else pushOut(k, o, art.radius);
            break;
          case 'solid':
            pushOut(k, o, art.radius);
            if (k.isPlayer && k.hitCool <= 0) { SMK.audio.sfx('bump'); k.hitCool = 0.25; }
            break;
          case 'bump':
            k.spinOut(this, 1);
            break;
          case 'mole':
            if (o.up) k.spinOut(this, 1);
            break;
          case 'burn':
            k.stun(this, 0.6);
            break;
          case 'slow':
            /* a chocolate puddle just drags, handled by speed here */
            k.vx *= 0.94; k.vy *= 0.94;
            break;
          case 'boo':
            /* Boos steal, they do not hit */
            if (k.item && this.rnd() < 0.02) {
              k.item = null; k.itemCount = 0;
              if (k.isPlayer) SMK.audio.sfx('menuBack');
            }
            break;
        }
      }
    }
  };

  function pushOut(k, o, r) {
    var dx = k.x - o.x, dy = k.y - o.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var need = r + k.radius * 0.8;
    k.x = o.x + dx / d * need;
    k.y = o.y + dy / d * need;
    var vn = k.vx * (dx / d) + k.vy * (dy / d);
    if (vn < 0) {
      k.vx -= (dx / d) * vn * 1.5;
      k.vy -= (dy / d) * vn * 1.5;
      k.vx *= 0.55; k.vy *= 0.55;
      k.speed = k.vx * Math.cos(k.angle) + k.vy * Math.sin(k.angle);
      k.drifting = false;
      k.boostTime = 0;
    }
  }

  /* ---- standings -------------------------------------------------- */
  R.updatePlaces = function () {
    var sorted = this.karts.slice().sort(function (a, b) {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      return b.progress - a.progress;
    });
    for (var i = 0; i < sorted.length; i++) sorted[i].place = i + 1;
    this.order = sorted;
  };

  /* ---- lap / finish ---------------------------------------------- */
  R.onLap = function (kart) {
    if (kart.lap >= this.laps) {
      kart.finished = true;
      kart.finishTime = this.time;
      if (kart.isPlayer) {
        this.updatePlaces();
        SMK.audio.sfx('finish');
        this.lakituBoard = 'flag';
        this.lakituTime = 3.0;
        this.setState('finishing');
        this.saveRecord();
      }
      return;
    }
    if (kart.isPlayer) {
      SMK.audio.sfx('lap');
      this.lakituBoard = 'lap';
      this.lakituLap = kart.lap + 1;
      this.lakituTime = 1.8;
    }
  };

  R.finishRace = function () {
    /* anyone still out there gets an estimated time so the order is stable */
    this.updatePlaces();
    for (var i = 0; i < this.karts.length; i++) {
      var k = this.karts[i];
      if (!k.finished) {
        k.finished = true;
        var remain = (this.laps * this.track.length - k.progress);
        k.finishTime = this.time + Math.max(0.5, remain / Math.max(40, k.topSpeed(this)));
      }
    }
    this.updatePlaces();
    this.resultOrder = this.order.slice();
    this.setState('results');
    SMK.audio.setMusicRate(1);
    SMK.audio.stopEngine();
    SMK.audio.playMusic('results');
  };

  R.saveRecord = function () {
    var key = 'best.' + this.course.id + '.' + this.engine.id;
    var best = SMK.store.get(key, null);
    var t = this.player.finishTime;
    if (best === null || t < best) {
      SMK.store.set(key, t);
      this.newRecord = true;
    }
    /* best single lap too */
    var lapKey = 'bestlap.' + this.course.id + '.' + this.engine.id;
    var bl = SMK.store.get(lapKey, null);
    var fastest = null;
    for (var i = 0; i < this.player.lapTimes.length; i++) {
      var lt = this.player.lapTimes[i];
      if (fastest === null || lt < fastest) fastest = lt;
    }
    if (fastest !== null && (bl === null || fastest < bl)) SMK.store.set(lapKey, fastest);
    this.bestLap = fastest;
  };

  /* ------------------------------------------------------------------
     RENDER
     ------------------------------------------------------------------ */
  R.render = function (frame, W, H) {
    var vp = this.viewport();
    var m7 = this.m7;
    var theme = this.track.theme;
    var t = this.time;

    /* sky, then ground */
    m7.renderSky(frame, W, vp.x, vp.y, this.sky);
    var warp = theme.warp ? function (row, depth) { return theme.warp(row, depth, t); } : null;
    m7.renderGround(frame, W, vp.x, vp.y, this.track, warp);

    /* everything that stands on the ground */
    this.renderSprites(frame, W, H, vp);

    /* the white flash from a lightning bolt or the green light */
    if (this.flash > 0) {
      SMK.ditherRect(frame, W, H, vp.x, vp.y, vp.w, vp.h,
        SMK.u32(this.flash > 0.28 ? '#ffffff' : '#ffe880'));
    }
  };

  R.renderSprites = function (frame, W, H, vp) {
    var m7 = this.m7;
    var list = [];
    var i, p, k;

    /* ---- karts ---- */
    for (i = 0; i < this.karts.length; i++) {
      k = this.karts[i];
      if (k.fallTime > 0 && k.z < -120) continue;
      p = m7.project(k.x, k.y, k.z);
      if (!p) continue;
      list.push({ d: p.depth, kart: k, p: p });
    }
    /* ---- props ---- */
    for (i = 0; i < this.objects.length; i++) {
      var o = this.objects[i];
      if (!o.active && o.art.kind !== 'itembox') continue;
      p = m7.project(o.x, o.y, o.z);
      if (!p) continue;
      list.push({ d: p.depth, obj: o, p: p });
    }
    /* ---- projectiles ---- */
    for (i = 0; i < this.projectiles.length; i++) {
      var pr = this.projectiles[i];
      p = m7.project(pr.x, pr.y, pr.z);
      if (!p) continue;
      list.push({ d: p.depth, proj: pr, p: p });
    }
    /* ---- particles ---- */
    for (i = 0; i < this.effects.length; i++) {
      var e = this.effects[i];
      p = m7.project(e.x, e.y, e.z);
      if (!p) continue;
      list.push({ d: p.depth, fx: e, p: p });
    }

    list.sort(function (a, b) { return b.d - a.d; });

    var sh = shadow();
    /* every sprite in the race is clipped to the road viewport */
    this.clip = { clipY0: vp.y, clipY1: vp.y + vp.h, clipX0: vp.x, clipX1: vp.x + vp.w };
    for (i = 0; i < list.length; i++) {
      var it = list[i];
      p = it.p;
      if (p.x < -80 || p.x > vp.w + 80) continue;

      if (it.kart) this.drawKart(frame, W, H, vp, it.kart, p, sh);
      else if (it.obj) this.drawProp(frame, W, H, vp, it.obj, p, sh);
      else if (it.proj) this.drawProjectile(frame, W, H, vp, it.proj, p, sh);
      else if (it.fx) this.drawEffect(frame, W, H, vp, it.fx, p);
    }
  };

  /* blit honouring the race viewport clip; `opt` may add tint/darken */
  R.blitC = function (frame, W, H, src, x, y, w, h, opt) {
    var o = opt || {};
    o.clipY0 = this.clip.clipY0; o.clipY1 = this.clip.clipY1;
    o.clipX0 = this.clip.clipX0; o.clipX1 = this.clip.clipX1;
    SMK.blitScaled(frame, W, H, src, x, y, w, h, o);
  };

  /* how many pixels wide a thing of `worldW` units is at this distance */
  function spriteSize(art, p, worldW) {
    var w = (worldW || art.worldW) * p.scale;
    var h = w * (art.h / art.w);
    return { w: w, h: h };
  }

  R.drawKart = function (frame, W, H, vp, k, p, sh) {
    var A = SMK.kartArt;
    /* heading relative to the camera, quantised to the 16 baked frames */
    var rel = SMK.wrapAngle(k.angle - this.camAngle);
    var idx = Math.round((rel / SMK.TAU) * A.ANGLES);
    idx = ((idx % A.ANGLES) + A.ANGLES) % A.ANGLES;

    var worldW = 20 * (k.shrinkTime > 0 ? 0.62 : 1);
    var w = worldW * p.scale;
    var h = w * (A.FRAME_H / A.FRAME_W);
    if (w < 2) return;

    var src;
    if (k.squashTime > 0) {
      src = A.squashFrame(k.char, idx, SMK.clamp(k.squashTime / 1.7, 0.25, 1));
    } else if (k.starTime > 0) {
      src = A.starFrame(k.char, idx, k.steerVisual, Math.floor(this.time * 18) % 4);
    } else {
      src = A.frame(k.char, idx, k.steerVisual);
    }

    var sx = vp.x + p.x - w / 2;
    var groundY = vp.y + p.y;
    var sy = groundY - h * (A.GROUND_Y / A.FRAME_H);

    /* shadow on the ground, shrinking as the kart rises */
    if (k.fallTime <= 0) {
      var lift = SMK.clamp(1 - k.z / 90, 0.25, 1);
      var shw = w * 0.78 * lift;
      this.blitC(frame, W, H, sh, vp.x + p.x - shw / 2,
                 vp.y + p.y - shw * 0.12, shw, shw * 0.30, {});
    }

    var opt = {};
    /* distance shading keeps the far field from looking pasted on */
    if (p.depth > 300) opt.darken = SMK.clamp(1 - (p.depth - 300) / 3200, 0.80, 1);
    if (k.invisTime > 0) opt.stipple = true;
    if (k.shrinkTime > 0 && !k.isPlayer) opt.tint = SMK.u32('#8830a8'), opt.tintAmount = 0.12;
    /* a spun-out kart wobbles */
    if (k.spinTime > 0) sy += Math.sin(this.time * 40) * 1.2;
    if (k.wobble) sy += k.wobble * SMK.clamp(p.scale, 0, 2);

    this.blitC(frame, W, H, src, sx, sy, w, h, opt);

    /* Lakitu dangling the player back over the road */
    if (k.respawnTime > 0) {
      var lk = SMK.objArt.lakitu(null, 0, 0);
      var lw = w * 1.0;
      this.blitC(frame, W, H, lk.buf, vp.x + p.x - lw / 2,
                 sy - lw * 0.62, lw, lw * (lk.h / lk.w), {});
    }
  };

  R.drawProp = function (frame, W, H, vp, o, p, sh) {
    var art = o.art;
    var frameIdx = Math.min(o.frame | 0, art.bufs.length - 1);
    var src = art.bufs[frameIdx];
    var s = spriteSize(art, p);
    if (s.w < 1.2) return;

    /* a used item panel shows as a dim ghost until it comes back */
    var opt = {};
    if (!o.active && art.kind === 'itembox') { opt.stipple = true; opt.darken = 0.55; }
    if (p.depth > 300) opt.darken = Math.min(opt.darken || 1, SMK.clamp(1 - (p.depth - 300) / 3200, 0.80, 1));

    var x = vp.x + p.x - s.w / 2;
    var y;
    if (o.type === 'gantry') {
      /* A billboard this wide fills the screen once you are under it,
         which is not what going under a banner looks like.  Drop it as
         you arrive: it reads as a landmark on the approach and then
         passes overhead. */
      if (p.depth < 230) return;
      SMK.blitScaled(frame, W, H, src, x, vp.y + p.y - s.h, s.w, s.h, this.clip);
      return;
    }
    if (art.flat) {
      /* lies on the tarmac: its centre is the contact point */
      y = vp.y + p.y - s.h / 2;
    } else {
      y = vp.y + p.y - s.h;
      if (o.z > 0 && !art.flat) {
        /* already handled by the projection's height term */
      }
      if (!art.flat && o.z <= 0.5 && art.kind !== 'boo') {
        var shw = s.w * 0.6;
        this.blitC(frame, W, H, sh, vp.x + p.x - shw / 2,
                   vp.y + p.y - shw * 0.1, shw, shw * 0.28, {});
      }
    }
    this.blitC(frame, W, H, src, x, y, s.w, s.h, opt);
  };

  R.drawProjectile = function (frame, W, H, vp, pr, p, sh) {
    var art = SMK.objArt.get(pr.art);
    if (!art) return;
    var fi = art.fps ? Math.floor(pr.phase * art.fps) % art.frameCount : 0;
    var s = spriteSize(art, p);
    if (s.w < 1.2) return;
    var y = vp.y + p.y - s.h * (pr.type === 'banana' ? 0.62 : 0.8);
    if (pr.z <= 3) {
      var shw = s.w * 0.55;
      this.blitC(frame, W, H, sh, vp.x + p.x - shw / 2,
                 vp.y + p.y - shw * 0.1, shw, shw * 0.28, {});
    }
    this.blitC(frame, W, H, art.bufs[fi], vp.x + p.x - s.w / 2, y, s.w, s.h, {});
  };

  R.drawEffect = function (frame, W, H, vp, e, p) {
    var art = e.art;
    var fi = Math.min(art.frameCount - 1, Math.floor(e.t / e.dur * art.frameCount));
    var s = spriteSize(art, p);
    if (s.w < 1) return;
    this.blitC(frame, W, H, art.bufs[fi],
               vp.x + p.x - s.w / 2, vp.y + p.y - s.h * 0.75, s.w, s.h, {});
  };

  /* ---- helpers the HUD and menus want --------------------------- */
  R.playerPlace = function () { return this.player.place; };
  R.isRacing = function () { return this.state === 'racing' || this.state === 'finishing'; };
  R.lapDisplay = function () { return SMK.clamp(this.player.lap + 1, 1, this.laps); };

  /* the grid order for the next Grand Prix race: finishing order */
  R.nextGridOrder = function () {
    var out = [];
    var src = this.resultOrder || this.order || this.karts;
    for (var i = 0; i < src.length; i++) out.push(src[i].char.id);
    return out;
  };

  SMK.RACE_CONST = {
    CAM_DIST: CAM_DIST, CAM_HEIGHT: CAM_HEIGHT, HORIZON: HORIZON,
    VIEW_CLASSIC: VIEW_CLASSIC, VIEW_WIDE: VIEW_WIDE
  };

})(window.SMK);
