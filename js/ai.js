/* ------------------------------------------------------------------
   ai.js — the seven other racers.

   Each CPU follows the baked racing line, brakes for curvature it can
   see coming, slides the corners that need sliding, and dodges what it
   can see in front of it.  Personality comes from three per-racer
   numbers — skill, line offset and aggression — so the field spreads
   out and behaves differently rather than driving as one train.

   Rubber-banding is deliberate and modest.  The original's CPUs were
   famous for it; here it is capped so a good lap still earns a gap and
   a bad one still costs you, rather than the field teleporting.

   CPUs also draw their character's special item on a timer, which is
   how the original armed them, so a Bowser behind you is a genuinely
   different threat from a Koopa Troopa.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  function makeAI(kart, race, rank) {
    var rnd = race.rnd;
    /* rank 0 is the strongest of the field */
    var skill = 1.0 - rank * 0.016 - rnd() * 0.02;
    kart.ai = {
      skill: skill,
      speedScale: 1,
      /* a preferred side of the road, so they do not drive nose to tail */
      lineBias: (rnd() * 2 - 1) * 0.24,
      aggression: 0.45 + rnd() * 0.5,
      itemTimer: 7 + rnd() * 8,
      reaction: 0.10 + rnd() * 0.12,
      dodge: 0,
      dodgeTime: 0,
      mistakeCool: 0,
      stuckTime: 0,
      lastProgress: 0,
      recoverTime: 0,
      driftHold: 0
    };
    return kart.ai;
  }
  SMK.makeAI = makeAI;

  var CONTROL = { steer: 0, accel: false, brake: false, drift: false, item: false };

  function stats(kart) { return kart.char.stats; }

  function nodeAt(track, i) {
    var n = track.nodes.length;
    return track.nodes[((i % n) + n) % n];
  }

  /* worst curvature over the next `span` nodes, for deciding when to slide */
  function upcomingCurve(track, i, span) {
    var worst = 0;
    for (var k = 1; k <= span; k++) {
      var c = Math.abs(nodeAt(track, i + k).curve || 0);
      var w = 1 - (k / (span + 2)) * 0.55;
      if (c * w > worst) worst = c * w;
    }
    return worst;
  }

  /* ------------------------------------------------------------------
     How fast can we be right now?

     A node's `curve` is the heading change measured over four nodes, so
     its radius is about (4 * NODE_SPACING) / curve.  The kart can hold
     that radius up to MAX_TURN * handling * radius.  Then we walk
     forward and ask, for each node, how fast we could be here and still
     have slowed to that node's limit by the time we reach it
     (v^2 = vlim^2 + 2*a*d) — which is what a driver actually does,
     rather than braking for every bend in sight.
     ------------------------------------------------------------------ */
  var NODE_ARC = 44;           /* world units spanned by `curve`        */
  var BRAKE_EFF = 165;         /* how hard a kart can actually slow     */

  function planSpeed(track, i, top, handling, skill) {
    var limit = top;
    var maxTurn = SMK.TUNING.MAX_TURN * handling;
    for (var k = 1; k <= 16; k++) {
      var nd = nodeAt(track, i + k);
      var c = Math.abs(nd.curve || 0);
      if (c < 0.02) continue;
      var radius = NODE_ARC / c;
      /* run a little under the limit; better racers run closer to it */
      var vlim = maxTurn * radius * (0.80 + 0.16 * skill);
      if (vlim >= top) continue;
      var d = k * 11;                       /* NODE_STEP */
      var allowed = Math.sqrt(vlim * vlim + 2 * BRAKE_EFF * d);
      if (allowed < limit) limit = allowed;
    }
    return limit;
  }

  function update(kart, race, dt) {
    var ai = kart.ai;
    var track = race.track;
    var c = CONTROL;
    c.steer = 0; c.accel = true; c.brake = false; c.drift = false; c.item = false;

    if (race.battle) return battleUpdate(kart, race, dt, c);

    if (race.state !== 'racing' && race.state !== 'finishing') {
      /* hold on the grid, but roll the throttle in on GO */
      c.accel = race.state === 'go';
      return c;
    }
    if (kart.finished) { c.accel = true; return c; }

    var top = kart.topSpeed(race);
    var sp = Math.max(0, kart.speed);
    var spFrac = sp / Math.max(1, top);

    /* ---- where to aim ---- */
    /* look further ahead the faster we are going */
    var lookNodes = Math.round(4 + spFrac * 11);
    var aim = nodeAt(track, kart.nodeIdx + lookNodes);
    /* Never aim closer to the edge than the kart is wide.  On a narrow
       course with nothing beyond the road, an aim point that looks fine
       as a fraction of the width still puts half the kart over the
       drop. */
    var margin = (kart.radius + 5) / Math.max(12, aim.hw);
    var edge = SMK.clamp(1 - margin, 0.25, 0.80);
    if (track.theme.voidBeyond) edge *= 0.82;
    var aimU = SMK.clamp(aim.lineU + ai.lineBias + ai.dodge, -edge, edge);
    var ax = aim.x + aim.nx * aimU * aim.hw;
    var ay = aim.y + aim.ny * aimU * aim.hw;

    var want = Math.atan2(ay - kart.y, ax - kart.x);
    var delta = SMK.angleDelta(kart.angle, want);
    c.steer = SMK.clamp(delta * 2.35, -1, 1);

    /* ---- how fast to take it ---- */
    var curve = upcomingCurve(track, kart.nodeIdx, 8);
    var targetSpeed = planSpeed(track, kart.nodeIdx, top, stats(kart).handling, ai.skill);

    /* ice: the cornering limit assumes grip that is not there */
    if (kart.surface === SMK.SURF.ICE) targetSpeed *= 0.88;
    /* off the road, get back on it — do not also try to hold a lap time */
    var sd = SMK.SURFACES[kart.surface];
    if (sd && sd.top < 0.6) targetSpeed = top;

    if (sp > targetSpeed * 1.10) { c.brake = true; c.accel = false; }
    else if (sp > targetSpeed) { c.accel = false; }

    /* ---- slide the corners that need it ---- */
    if (curve > 0.50 && spFrac > 0.62 && Math.abs(c.steer) > 0.50) {
      ai.driftHold = 0.5;
    }
    if (ai.driftHold > 0) {
      ai.driftHold -= dt;
      c.drift = true;
    }

    /* ---- dodge what is in the way ---- */
    ai.dodgeTime -= dt;
    if (ai.dodgeTime <= 0) {
      ai.dodgeTime = ai.reaction;
      var threat = scanAhead(kart, race, 120 + sp * 0.55);
      if (threat !== 0) {
        ai.dodge = SMK.clamp(ai.dodge - threat * 0.55, -edge, edge);
      } else {
        ai.dodge *= 0.78;
      }
    }

    /* ---- wrong way or wedged against something ---- */
    if (kart.wrongWayTime > 0.7) {
      /* turn around rather than grind along backwards */
      var nd = nodeAt(track, kart.nodeIdx + 2);
      var back = Math.atan2(nd.y - kart.y, nd.x - kart.x);
      c.steer = SMK.clamp(SMK.angleDelta(kart.angle, back) * 2.4, -1, 1);
      c.brake = false; c.accel = true;
    }
    var moved = kart.progress - ai.lastProgress;
    ai.lastProgress = kart.progress;
    if (moved < 4 * dt && !kart.isDisabled()) ai.stuckTime += dt;
    else ai.stuckTime = Math.max(0, ai.stuckTime - dt * 2);
    if (ai.stuckTime > 1.3) {
      /* reverse out for a moment */
      c.accel = false; c.brake = true;
      c.steer = -c.steer;
      if (ai.stuckTime > 2.2) { ai.stuckTime = 0; SMK.respawnOnTrack(kart, track); }
    }

    /* ---- items ---- */
    ai.itemTimer -= dt;
    if (!kart.item && ai.itemTimer <= 0) {
      /* the original armed its CPUs on a timer with their own item */
      kart.item = kart.char.special;
      kart.itemCount = SMK.Items.defs[kart.char.special].count;
      ai.itemTimer = 11 + race.rnd() * 11;
    }
    if (kart.item && !kart.isDisabled()) {
      if (shouldUseItem(kart, race)) c.item = true;
    }

    return c;
  }

  /* ------------------------------------------------------------------
     Battle mode: there is no racing line to follow, so a CPU picks the
     nearest opponent still carrying balloons, drives at it, and backs
     off when it is about to drive into a wall or a pit instead.
     ------------------------------------------------------------------ */
  function battleUpdate(kart, race, dt, c) {
    var ai = kart.ai;
    if (race.state !== 'racing' || kart.out) { c.accel = race.state === 'racing'; return c; }

    /* pick a target, and stick with it for a while */
    ai.targetTimer = (ai.targetTimer || 0) - dt;
    if (!ai.target || ai.target.out || ai.targetTimer <= 0) {
      var best = null, bestD = 1e18;
      for (var i = 0; i < race.karts.length; i++) {
        var k = race.karts[i];
        if (k === kart || k.out) continue;
        var d = SMK.dist2(kart.x, kart.y, k.x, k.y);
        if (d < bestD) { bestD = d; best = k; }
      }
      ai.target = best;
      ai.targetTimer = 1.6 + race.rnd() * 1.8;
    }
    var t = ai.target;
    if (!t) { c.accel = false; return c; }

    /* aim slightly ahead of where the target is going */
    var lead = 0.34;
    var ax = t.x + t.vx * lead, ay = t.y + t.vy * lead;
    var want = Math.atan2(ay - kart.y, ax - kart.x);
    var delta = SMK.angleDelta(kart.angle, want);
    c.steer = SMK.clamp(delta * 2.4, -1, 1);

    /* look where we are going: probe the surface ahead and veer off
       anything that would end the bout early */
    var fx = Math.cos(kart.angle), fy = Math.sin(kart.angle);
    var probe = 40 + Math.abs(kart.speed) * 0.42;
    var sAhead = SMK.sampleSurface(race.track, kart.x + fx * probe, kart.y + fy * probe);
    var danger = (sAhead === SMK.SURF.VOID || sAhead === SMK.SURF.WALL ||
                  sAhead === SMK.SURF.LAVA);
    if (danger) {
      /* try both shoulders and turn toward the clearer one */
      var lx = kart.x + Math.cos(kart.angle - 0.8) * probe;
      var ly = kart.y + Math.sin(kart.angle - 0.8) * probe;
      var rx2 = kart.x + Math.cos(kart.angle + 0.8) * probe;
      var ry2 = kart.y + Math.sin(kart.angle + 0.8) * probe;
      var lOK = SMK.sampleSurface(race.track, lx, ly) === SMK.SURF.ROAD;
      var rOK = SMK.sampleSurface(race.track, rx2, ry2) === SMK.SURF.ROAD;
      c.steer = lOK && !rOK ? -1 : (rOK && !lOK ? 1 : (race.rnd() < 0.5 ? -1 : 1));
      c.brake = Math.abs(kart.speed) > 60;
    }

    /* a comfortable closing speed rather than flat out */
    var dist = SMK.dist(kart.x, kart.y, t.x, t.y);
    var want2 = dist < 90 ? 62 : 96;
    if (kart.speed > want2) c.accel = false;

    /* fire when lined up */
    if (kart.item && !kart.isDisabled()) {
      var aimed = Math.abs(delta) < 0.34 && dist < 300;
      var id = kart.item;
      if (id === 'banana' || id === 'egg') c.item = dist < 130 || race.rnd() < 0.01;
      else if (id === 'mushroom' || id === 'triple') c.item = aimed && dist > 140;
      else c.item = aimed || race.rnd() < 0.01;
    }

    ai.stuckTime = (kart.speed < 6 ? ai.stuckTime + dt : 0);
    if (ai.stuckTime > 1.4) { c.brake = true; c.accel = false; c.steer = -c.steer; }
    if (ai.stuckTime > 2.6) { ai.stuckTime = 0; SMK.respawnOnTrack(kart, race.track); }
    return c;
  }

  /* is anything worth avoiding in the corridor ahead?
     returns -1 (threat on the left), +1 (on the right) or 0 */
  function scanAhead(kart, race, range) {
    var fx = Math.cos(kart.angle), fy = Math.sin(kart.angle);
    var rx = -fy, ry = fx;
    var score = 0;

    function consider(x, y, radius, weight) {
      var dx = x - kart.x, dy = y - kart.y;
      var fwd = dx * fx + dy * fy;
      if (fwd < 4 || fwd > range) return;
      var side = dx * rx + dy * ry;
      var corridor = radius + kart.radius + 6;
      if (Math.abs(side) > corridor) return;
      var near = 1 - fwd / range;
      score += (side >= 0 ? 1 : -1) * near * weight;
    }

    var i;
    for (i = 0; i < race.objects.length; i++) {
      var o = race.objects[i];
      if (!o.active) continue;
      if (o.art.kind === 'coin' || o.art.kind === 'itembox') continue;  /* those we want */
      consider(o.x, o.y, o.art.radius, 1.0);
    }
    for (i = 0; i < race.projectiles.length; i++) {
      var p = race.projectiles[i];
      if (p.owner === kart) continue;
      consider(p.x, p.y, p.radius, 1.4);
    }
    for (i = 0; i < race.karts.length; i++) {
      var k = race.karts[i];
      if (k === kart) continue;
      /* only worry about a kart we are actually closing on */
      if (k.speed > kart.speed + 8) continue;
      consider(k.x, k.y, k.radius, 0.85);
    }
    if (score > 0.25) return 1;
    if (score < -0.25) return -1;
    return 0;
  }

  function shouldUseItem(kart, race) {
    var ai = kart.ai;
    var id = kart.item;
    var sd = SMK.SURFACES[kart.surface];
    var onRoad = sd && sd.top > 0.8;

    switch (id) {
      case 'mushroom':
      case 'triple': {
        /* spend a boost on a straight, not into a hairpin */
        var curve = upcomingCurve(race.track, kart.nodeIdx, 10);
        return onRoad && curve < 0.30 && kart.speed > kart.topSpeed(race) * 0.55;
      }
      case 'star':
        return race.rnd() < 0.02 + ai.aggression * 0.03;
      case 'banana':
      case 'egg': {
        /* drop it when somebody is close behind */
        var chaser = nearestBehind(race, kart, 220);
        return !!chaser || race.rnd() < 0.006;
      }
      case 'greenShell':
      case 'fireball': {
        var t = aheadInLine(race, kart, 260, 0.30);
        return !!t;
      }
      case 'redShell': {
        var tgt = SMK.Items.kartAhead(race, kart);
        return tgt && SMK.dist(kart.x, kart.y, tgt.x, tgt.y) < 520;
      }
      case 'poison': {
        var v = SMK.Items.kartAhead(race, kart);
        return v && SMK.dist(kart.x, kart.y, v.x, v.y) < 300;
      }
      case 'lightning':
        return kart.place > 2 && race.rnd() < 0.02;
      case 'feather':
        return race.rnd() < 0.004;
      case 'coin':
        return true;
      case 'boo':
        return kart.place > 3 && race.rnd() < 0.02;
    }
    return false;
  }

  function nearestBehind(race, kart, range) {
    var fx = Math.cos(kart.angle), fy = Math.sin(kart.angle);
    var best = null, bestD = range;
    for (var i = 0; i < race.karts.length; i++) {
      var k = race.karts[i];
      if (k === kart) continue;
      var dx = k.x - kart.x, dy = k.y - kart.y;
      var fwd = dx * fx + dy * fy;
      if (fwd > -20) continue;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) { bestD = d; best = k; }
    }
    return best;
  }

  /* a kart roughly in front, within a cone of half-angle `tol` radians */
  function aheadInLine(race, kart, range, tol) {
    for (var i = 0; i < race.karts.length; i++) {
      var k = race.karts[i];
      if (k === kart) continue;
      var dx = k.x - kart.x, dy = k.y - kart.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > range || d < 12) continue;
      var a = Math.atan2(dy, dx);
      if (Math.abs(SMK.angleDelta(kart.angle, a)) < tol) return k;
    }
    return null;
  }

  /* ------------------------------------------------------------------
     rubber band — recomputed a few times a second, not every frame
     ------------------------------------------------------------------ */
  function updateBand(race) {
    var player = race.player;
    if (!player) return;
    var band = race.engine.cpu;
    for (var i = 0; i < race.karts.length; i++) {
      var k = race.karts[i];
      if (!k.ai) continue;
      var lead = player.progress - k.progress;      /* >0: CPU is behind */
      /* catch up a little when dropped, ease off a little when clear */
      var adj = SMK.clamp(lead / 1100, -0.085, 0.115);
      var target = (0.90 + 0.10 * k.ai.skill) * band * (1 + adj);
      k.ai.speedScale = SMK.approach(k.ai.speedScale, target, 1.4, 0.25);
    }
  }

  SMK.ai = { make: makeAI, update: update, updateBand: updateBand };

})(window.SMK);
