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
    /* Skill is drawn fresh each race rather than from grid position.
       Seeding it from the grid looks sensible until you remember that a
       cup seeds the grid from the standings: the leader would then get
       the best driver every round and run away with the championship. */
    var skill = 0.92 + rnd() * 0.16;
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
      progressRef: 0,
      progressRefTime: 0,
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
    /* The turn-rate limit is what the kart can steer, not what it can
       hold: the grip model still lets it slide wide of the line.  Leave
       real margin, and more of it where running wide means falling. */
    var safety = 0.74 + 0.15 * skill;
    if (track.theme && track.theme.voidBeyond) safety *= 0.88;
    for (var k = 1; k <= 16; k++) {
      var nd = nodeAt(track, i + k);
      var c = Math.abs(nd.curve || 0);
      if (c < 0.02) continue;
      var radius = NODE_ARC / c;
      var vlim = maxTurn * radius * safety;
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

    /* Steering gain has to come down where grip does.  A hard
       proportional correction on ice yaws the kart without changing
       where it is going, so the error never closes and the CPU saws at
       the wheel until it is barely moving down the road. */
    var sd = SMK.SURFACES[kart.surface];
    var gain = (sd && sd.slick) ? 1.45 : 2.35;
    gain *= 1 - SMK.clamp(Math.abs(kart.slip) / 95, 0, 0.5);
    c.steer = SMK.clamp(delta * gain, -1, 1);

    /* ---- how fast to take it ---- */
    var curve = upcomingCurve(track, kart.nodeIdx, 8);
    var targetSpeed = planSpeed(track, kart.nodeIdx, top, stats(kart).handling, ai.skill);

    /* ice: the cornering limit assumes grip that is not there */
    if (sd && sd.slick) targetSpeed *= 0.88;
    /* Off the road, the job is to get back on it.  Flat out is the wrong
       answer: the run-off is where you have least grip and most need to
       change direction, and pinning the throttle just carries you
       further out. */
    if (sd && sd.top < 0.6) targetSpeed = top * 0.62;

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

    /* ---- a solid object close ahead needs more than a dodge bias ---- */
    var block = blockingSolid(kart, race, 78);
    if (block) {
      c.steer = block.side >= 0 ? -1 : 1;
      if (sp > 70) c.accel = false;
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
    /* Wedged against something?  Measured against a rolling reference
       rather than a per-frame delta: a kart shuffling back and forth
       against an obstacle moves plenty every frame and would reset a
       per-frame detector forever without ever getting anywhere. */
    if (kart.progress - ai.progressRef > 30 || kart.isDisabled()) {
      ai.progressRef = kart.progress;
      ai.progressRefTime = 0;
      ai.stuckTime = 0;
    } else {
      ai.progressRefTime += dt;
      if (ai.progressRefTime > 1.6) ai.stuckTime += dt;
    }
    if (ai.stuckTime > 0.4) {
      c.accel = false; c.brake = true;
      c.steer = ai.stuckTime > 1.0 ? -SMK.sign(c.steer || 1) : -c.steer;
    }
    if (ai.progressRefTime > 4.2) {
      ai.progressRef = kart.progress; ai.progressRefTime = 0; ai.stuckTime = 0;
      SMK.respawnOnTrack(kart, track);
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

    /* Unarmed, go and get armed.  A CPU that only ever drives at its
       opponent never crosses an item box, and ramming does not pop a
       balloon — so a bout between four of them never ends. */
    var dist = SMK.dist(kart.x, kart.y, t.x, t.y);
    var ax, ay;
    if (!kart.item) {
      var box = nearestBox(race, kart, 420);
      if (box) { ax = box.x; ay = box.y; }
    }
    if (ax === undefined) {
      /* Lead the target by the shell's actual time of flight, so the
         kart is pointing where the shot has to go rather than at where
         the target happens to be standing. */
      var tof = SMK.clamp(dist / 196, 0, 1.6);
      ax = t.x + t.vx * tof;
      ay = t.y + t.vy * tof;
    }
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
    var want2 = (!kart.item) ? 104 : (dist < 90 ? 68 : 100);
    if (kart.speed > want2) c.accel = false;

    /* Fire on predicted miss distance, not on a fixed cone.  A cone of
       a fixed angle is a hundred units wide at the far end of an arena,
       so a CPU gated on one throws every shell it picks up and hits
       almost nothing. */
    if (kart.item && !kart.isDisabled()) {
      var miss = Math.abs(Math.sin(delta)) * dist;
      var lined = miss < 26 && dist < 420 && Math.abs(delta) < 1.0;
      var id = kart.item;
      if (id === 'banana' || id === 'egg') c.item = dist < 150 || race.rnd() < 0.02;
      else if (id === 'mushroom' || id === 'triple') c.item = lined && dist > 150;
      else if (id === 'star' || id === 'boo' || id === 'feather') c.item = race.rnd() < 0.05;
      else c.item = lined;
    }

    ai.stuckTime = (kart.speed < 6 ? ai.stuckTime + dt : 0);
    if (ai.stuckTime > 1.4) { c.brake = true; c.accel = false; c.steer = -c.steer; }
    if (ai.stuckTime > 2.6) { ai.stuckTime = 0; SMK.respawnOnTrack(kart, race.track); }
    return c;
  }

  /* the nearest solid prop sitting in the corridor directly ahead */
  function blockingSolid(kart, race, range) {
    var fx = Math.cos(kart.angle), fy = Math.sin(kart.angle);
    var rx = -fy, ry = fx;
    var best = null, bestF = range;
    for (var i = 0; i < race.objects.length; i++) {
      var o = race.objects[i];
      if (!o.active || !o.art.solid) continue;
      var dx = o.x - kart.x, dy = o.y - kart.y;
      var fwd = dx * fx + dy * fy;
      if (fwd < 2 || fwd > bestF) continue;
      var side = dx * rx + dy * ry;
      if (Math.abs(side) > o.art.radius + kart.radius + 4) continue;
      bestF = fwd;
      best = { obj: o, fwd: fwd, side: side };
    }
    return best;
  }

  function nearestBox(race, kart, range) {
    var best = null, bestD = range * range;
    for (var i = 0; i < race.objects.length; i++) {
      var o = race.objects[i];
      if (!o.active || o.art.kind !== 'itembox') continue;
      var d = SMK.dist2(kart.x, kart.y, o.x, o.y);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
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
