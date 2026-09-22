/* ------------------------------------------------------------------
   physics.js — kart handling.

   The model is velocity-based rather than "move along the heading":
   the kart carries a real velocity vector, the engine pushes along the
   heading, and a lateral grip term eats sideways velocity.  Grip is
   what every surface and state then modulates — tarmac grips, ice
   doesn't, and a power-slide drops it on purpose — so drifting falls
   out of the model instead of being a special case bolted on.

   Faithful to the 16-bit original: five laps, coins raise your top
   speed, hopping is how you snap a tight corner, running wide into the
   rough costs you more than half your speed, and going off the edge
   hands you to Lakitu.

   One deliberate addition: a short burst of speed for holding a long
   clean slide.  The original gave you nothing for it (mini-turbos
   arrived a generation later), but without some payoff the slide is
   only ever a way to lose time, and the cornering stops being fun.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var SURF = SMK.SURF;

  /* ---- tuning ------------------------------------------------------ */
  var BASE_TOP = 122;        /* world units/s, medium kart, 150cc      */
  var ACC_BASE = 192;        /* units/s^2 before the taper             */
  var BRAKE = 210;
  var REVERSE_TOP = 46;
  var MAX_TURN = 2.55;       /* rad/s at the sweet spot                */
  var GRIP_ROAD = 13.0;      /* higher = less slide                    */
  var GRIP_DRIFT = 2.9;
  var DRAG = 0.22;         /* rolling resistance; surfaces add their own */
  var GRAVITY = 420;
  var HOP_VZ = 96;
  var JUMP_VZ = 210;
  var COIN_MAX = 10;
  var COIN_SPEED = 0.012;    /* +1.2% top speed per coin               */
  var DRIFT_TURN_BOOST = 1.62;
  var MINI_TURBO_TIME = 0.95;  /* how long a slide must hold to pay    */

  /* per-surface behaviour, indexed by surface id */
  var SURFACES = [];
  function surfDef(id, o) { SURFACES[id] = o; }
  surfDef(SURF.VOID,    { top: 1.00, grip: GRIP_ROAD, drag: 0, fall: true });
  surfDef(SURF.ROAD,    { top: 1.00, grip: GRIP_ROAD, drag: 0 });
  surfDef(SURF.OFFROAD, { top: 0.46, grip: 8.5, drag: 1.9, rough: 1.0, dust: true });
  surfDef(SURF.SLOW,    { top: 0.33, grip: 7.0, drag: 3.0, rough: 1.4, dust: true });
  surfDef(SURF.WALL,    { top: 1.00, grip: GRIP_ROAD, drag: 0, wall: true });
  surfDef(SURF.BOOST,   { top: 1.00, grip: GRIP_ROAD, drag: 0, boost: 0.62 });
  surfDef(SURF.OIL,     { top: 1.00, grip: GRIP_ROAD, drag: 0, oil: true });
  surfDef(SURF.WATER,   { top: 0.42, grip: 7.5, drag: 2.4, rough: 0.5, splash: true });
  surfDef(SURF.JUMP,    { top: 1.00, grip: GRIP_ROAD, drag: 0, ramp: true });
  surfDef(SURF.LAVA,    { top: 0.30, grip: 6.0, drag: 3.4, burn: true });
  surfDef(SURF.ICE,     { top: 1.00, grip: 8.0, drag: 0, slick: true });
  surfDef(SURF.START,   { top: 1.00, grip: GRIP_ROAD, drag: 0 });
  SMK.SURFACES = SURFACES;

  /* ------------------------------------------------------------------ */
  function Kart(ch, isPlayer, index) {
    this.char = ch;
    this.isPlayer = !!isPlayer;
    this.index = index;

    this.x = 0; this.y = 0; this.angle = 0;
    this.vx = 0; this.vy = 0;
    this.z = 0; this.vz = 0;
    this.speed = 0;               /* forward component, cached for the HUD */
    this.slip = 0;                /* sideways component                    */

    this.steerInput = 0;
    this.steerVisual = 0;
    this.drifting = false;
    this.driftDir = 0;
    this.driftTime = 0;
    this.hopping = false;
    this.driftArmed = false;

    this.surface = SURF.ROAD;
    this.onGround = true;

    this.coins = 0;
    this.lap = 0;
    this.started = false;      /* has crossed the line for the first time */
    this.lapS = 0; this.prevLapS = 0;
    this.nodeIdx = 0;
    this.progress = 0;
    this.place = index + 1;
    this.finished = false;
    this.finishTime = 0;
    this.lapTimes = [];
    this.lastLapStart = 0;

    /* states */
    this.spinTime = 0;
    this.squashTime = 0;
    this.starTime = 0;
    this.boostTime = 0;
    this.shrinkTime = 0;
    this.invisTime = 0;      /* Boo */
    this.stunTime = 0;
    this.fallTime = 0;
    this.respawnTime = 0;
    this.wrongWayTime = 0;
    this.burnCool = 0;
    this.hitCool = 0;
    this.popCool = 0;

    /* items */
    this.item = null;
    this.itemCount = 0;
    this.rollTime = 0;
    this.trailing = null;    /* an item being dragged behind             */

    /* AI */
    this.ai = null;

    this.radius = 11;
    this.wobble = 0;
    this.balloons = 3;         /* Battle mode only */
    this.out = false;
  }
  SMK.Kart = Kart;

  Kart.prototype.stats = function () { return this.char.stats; };

  Kart.prototype.topSpeed = function (race) {
    var s = this.char.stats;
    var eng = race.engine;
    var t = BASE_TOP * s.topSpeed * eng.speed;
    t *= 1 + Math.min(this.coins, COIN_MAX) * COIN_SPEED;
    if (this.shrinkTime > 0) t *= 0.70;
    if (this.ai) t *= this.ai.speedScale;
    return t;
  };

  Kart.prototype.isDisabled = function () {
    return this.spinTime > 0 || this.squashTime > 0 || this.stunTime > 0 ||
           this.fallTime > 0 || this.respawnTime > 0;
  };

  /* ---- surface sampling ------------------------------------------- */
  function surfaceAt(track, x, y) {
    return SMK.sampleSurface(track, x, y);
  }

  function defOf(id) { return SURFACES[id] || SURFACES[SURF.ROAD]; }

  /* ---- put a kart back on the road after a fall ------------------- */
  function respawnOnTrack(kart, track) {
    /* a couple of nodes further on, and on the centreline rather than
       the racing line — dropping a kart back on the edge it just fell
       off is how you get a respawn loop */
    var n = track.nodes[(kart.nodeIdx + 2) % track.nodes.length];
    var off = n.hw * SMK.clamp(n.lineU * 0.2, -0.2, 0.2);
    kart.x = n.x + n.nx * off;
    kart.y = n.y + n.ny * off;
    kart.angle = Math.atan2(n.ty, n.tx);
    kart.vx = 0; kart.vy = 0; kart.speed = 0; kart.slip = 0;
    kart.z = 0; kart.vz = 0;
    kart.drifting = false; kart.driftTime = 0;
    kart.spinTime = 0; kart.squashTime = 0; kart.stunTime = 0;
  }
  SMK.respawnOnTrack = respawnOnTrack;

  /* ---- hits -------------------------------------------------------- */

  /* spin out: lose control and shed coins */
  Kart.prototype.spinOut = function (race, coinLoss) {
    if (this.starTime > 0 || this.isDisabled()) return false;
    this.spinTime = 1.05;
    this.drifting = false;
    this.boostTime = 0;
    var loss = coinLoss === undefined ? 2 : coinLoss;
    scatterCoins(this, race, loss);
    if (this.isPlayer) SMK.audio.sfx('spin');
    return true;
  };

  /* flattened: keep rolling but very slowly */
  Kart.prototype.squash = function (race) {
    if (this.starTime > 0 || this.isDisabled()) return false;
    this.squashTime = 1.7;
    this.drifting = false;
    this.boostTime = 0;
    var mult = 0.34;
    this.vx *= mult; this.vy *= mult;
    scatterCoins(this, race, 3);
    if (this.isPlayer) SMK.audio.sfx('squash');
    return true;
  };

  /* dead stop, as from a Thwomp or a wall of fire */
  Kart.prototype.stun = function (race, time) {
    if (this.starTime > 0 || this.isDisabled()) return false;
    this.stunTime = time || 0.85;
    this.vx *= 0.1; this.vy *= 0.1;
    this.drifting = false;
    this.boostTime = 0;
    scatterCoins(this, race, 2);
    if (this.isPlayer) SMK.audio.sfx('bump');
    return true;
  };

  Kart.prototype.fallOff = function (race) {
    if (this.fallTime > 0 || this.respawnTime > 0) return;
    this.fallTime = 0.85;
    this.vz = -30;
    this.drifting = false;
    this.boostTime = 0; this.starTime = 0;
    /* Going over the edge costs you coins in a race and a balloon in
       an arena, which is how the original charged for it — and also
       the only thing that makes a bout on a pit arena ever end: four
       CPUs circling five holes will not otherwise run each other out
       of balloons. */
    scatterCoins(this, race, 2);
    if (this.isPlayer) SMK.audio.sfx('fall');
  };

  Kart.prototype.giveBoost = function (t) {
    this.boostTime = Math.max(this.boostTime, t);
  };

  /* Every way of being hit funnels through here, which makes it the one
     place Battle mode has to differ: there you lose a balloon, not coins. */
  function scatterCoins(kart, race, n) {
    if (race && race.battle) { race.popBalloon(kart); return; }
    var lost = Math.min(kart.coins, n);
    kart.coins -= lost;
    if (race && race.spawnLooseCoins) race.spawnLooseCoins(kart, lost);
  }
  SMK.scatterCoins = scatterCoins;

  /* ------------------------------------------------------------------
     the main step
     controls = { steer, accel, brake, drift, item }
     ------------------------------------------------------------------ */
  Kart.prototype.update = function (race, dt, c) {
    var track = race.track;
    var stats = this.char.stats;

    /* ---- timers ---- */
    this.spinTime = Math.max(0, this.spinTime - dt);
    this.squashTime = Math.max(0, this.squashTime - dt);
    this.stunTime = Math.max(0, this.stunTime - dt);
    this.starTime = Math.max(0, this.starTime - dt);
    this.boostTime = Math.max(0, this.boostTime - dt);
    this.shrinkTime = Math.max(0, this.shrinkTime - dt);
    this.invisTime = Math.max(0, this.invisTime - dt);
    this.burnCool = Math.max(0, this.burnCool - dt);
    this.hitCool = Math.max(0, this.hitCool - dt);
    this.popCool = Math.max(0, this.popCool - dt);
    this.rollTime = Math.max(0, this.rollTime - dt);

    /* ---- falling / respawn take over completely ---- */
    if (this.fallTime > 0) {
      this.fallTime -= dt;
      this.z -= 150 * dt;
      this.vx *= 0.9; this.vy *= 0.9;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.fallTime <= 0) { this.respawnTime = 0.75; this.z = 0; }
      return;
    }
    if (this.respawnTime > 0) {
      this.respawnTime -= dt;
      /* Lakitu carries you back and drops you on the line */
      var n = track.nodes[this.nodeIdx];
      var offR = n.hw * SMK.clamp(n.lineU * 0.5, -0.5, 0.5);
      this.x = n.x + n.nx * offR;
      this.y = n.y + n.ny * offR;
      this.angle = Math.atan2(n.ty, n.tx);
      this.z = Math.max(0, this.respawnTime * 40);
      this.vx = 0; this.vy = 0; this.speed = 0;
      if (this.respawnTime <= 0) { this.z = 0; respawnOnTrack(this, track); }
      return;
    }

    var disabled = this.spinTime > 0 || this.squashTime > 0 || this.stunTime > 0;
    var steer = disabled ? 0 : SMK.clamp(c.steer || 0, -1, 1);
    this.steerInput = steer;

    /* ---- surface under the wheels ---- */
    var sid = surfaceAt(track, this.x, this.y);
    var sd = defOf(sid);
    this.surface = sid;

    /* a kart in the air ignores the ground entirely */
    var airborne = this.z > 0.5;
    this.onGround = !airborne;

    if (!airborne) {
      if (sd.fall) { this.fallOff(race); return; }
      if (sd.boost && this.boostTime <= 0.05) {
        this.giveBoost(sd.boost);
        if (this.isPlayer) SMK.audio.sfx('boost');
      }
      if (sd.ramp && this.vz <= 0 && this.speed > 20) {
        this.vz = JUMP_VZ * SMK.clamp(this.speed / BASE_TOP, 0.4, 1.2);
        if (this.isPlayer) SMK.audio.sfx('hop');
      }
      if (sd.oil && !disabled && this.starTime <= 0 && this.speed > 26) {
        this.spinOut(race, 1);
      }
      if (sd.burn && this.burnCool <= 0 && this.starTime <= 0) {
        this.burnCool = 1.4;
        this.stun(race, 0.7);
      }
      if (sd.splash && race.spawnEffect && Math.random() < dt * 14 && this.speed > 24) {
        race.spawnEffect('fx_splash', this.x, this.y, 0);
      }
      if (sd.dust && race.spawnEffect && Math.random() < dt * 11 && this.speed > 30) {
        race.spawnEffect('fx_smoke', this.x, this.y, 0);
      }
    }

    /* ---- hop and power-slide ---- */
    if (!disabled && !airborne) {
      if (c.drift && !this.driftArmed) {
        /* tap: hop. the hop is how you snap a tight corner in */
        this.driftArmed = true;
        this.vz = HOP_VZ;
        this.hopping = true;
        if (this.isPlayer) SMK.audio.sfx('hop');
      }
    }
    if (!c.drift) {
      this.driftArmed = false;
      if (this.drifting) {
        /* pay out a mini-turbo for a slide that was actually held */
        if (this.driftTime > MINI_TURBO_TIME) {
          this.giveBoost(0.42);
          if (this.isPlayer) SMK.audio.sfx('boost');
        }
        this.drifting = false;
        this.driftTime = 0;
      }
    }
    /* landing from a hop with the button and a direction held starts a slide */
    if (this.hopping && !airborne && this.z <= 0.5) {
      this.hopping = false;
      if (c.drift && Math.abs(steer) > 0.35 && this.speed > 34) {
        this.drifting = true;
        this.driftDir = SMK.sign(steer);
        this.driftTime = 0;
      }
      if (this.isPlayer) SMK.audio.sfx('land');
    }
    if (this.drifting) {
      /* steering out of the slide, or losing speed, ends it */
      if (steer * this.driftDir < -0.15 || this.speed < 24 || disabled) {
        if (this.driftTime > MINI_TURBO_TIME) this.giveBoost(0.42);
        this.drifting = false;
        this.driftTime = 0;
      } else {
        this.driftTime += dt;
        if (race.spawnEffect && Math.random() < dt * 20) {
          race.spawnEffect('fx_spark', this.x - Math.cos(this.angle) * 10,
                                       this.y - Math.sin(this.angle) * 10, 2);
        }
        if (this.isPlayer && Math.random() < dt * 6) SMK.audio.sfx('skid');
      }
    }

    /* ---- decompose velocity into the kart's own frame ---- */
    var fx = Math.cos(this.angle), fy = Math.sin(this.angle);
    var rx = -fy, ry = fx;
    var vF = this.vx * fx + this.vy * fy;
    var vS = this.vx * rx + this.vy * ry;

    var top = this.topSpeed(race);
    var surfTop = airborne ? 1.0 : sd.top;
    var maxV = top * surfTop;
    if (this.boostTime > 0) maxV = top * 1.42;
    if (this.starTime > 0) maxV = Math.max(maxV, top * 1.16);

    /* ---- engine ---- */
    var accel = ACC_BASE * stats.accel * race.engine.accel;
    if (this.starTime > 0) accel *= 1.15;
    if (this.boostTime > 0) accel *= 2.4;

    if (disabled) {
      vF -= vF * 2.2 * dt;
    } else if (c.accel) {
      /* Quadratic taper rather than linear: pulls away hard off the
         line, still eases into the last few units of top speed, and —
         unlike a linear taper against a drag term — actually reaches
         the stated top speed instead of stalling ten percent short. */
      var f = vF / Math.max(1, maxV);
      var head = f <= 0 ? 1 : (1 - f * f * 0.85);
      vF += accel * Math.max(0.16, head) * dt;
    } else if (c.brake) {
      vF -= BRAKE * dt;
      if (vF < -REVERSE_TOP) vF = -REVERSE_TOP;
    } else {
      vF -= vF * 1.5 * dt;
    }

    /* drag: light rolling resistance plus whatever the surface adds */
    var drag = DRAG + (airborne ? 0 : sd.drag);
    vF -= vF * drag * dt;
    if (vF > maxV) vF = SMK.approach(vF, maxV, 6.0, dt);

    /* ---- steering ---- */
    if (!airborne && !disabled) {
      var sp = Math.abs(vF) / Math.max(1, top);
      /* karts turn best at a middling speed, worse at a crawl and flat out */
      var sf = sp < 0.30 ? (sp / 0.30) : (1 - 0.22 * ((sp - 0.30) / 0.70));
      var turn = MAX_TURN * stats.handling * SMK.clamp(sf, 0, 1.1);
      if (this.drifting) turn *= DRIFT_TURN_BOOST * stats.driftGrip;
      if (sd.slick) turn *= 0.82;
      var yaw = steer * turn * dt * SMK.sign(vF || 1);
      if (this.drifting) yaw += this.driftDir * turn * 0.30 * dt;
      this.angle = SMK.wrapAngle(this.angle + yaw);
    } else if (disabled && this.spinTime > 0) {
      /* the spin itself */
      this.angle = SMK.wrapAngle(this.angle + 13.5 * dt * (this.index % 2 ? 1 : -1));
    }

    /* ---- lateral grip: this is what makes a slide a slide ---- */
    var grip = airborne ? 1.2 : sd.grip;
    if (this.drifting) grip = GRIP_DRIFT / Math.max(0.5, stats.driftGrip);
    if (this.starTime > 0) grip *= 1.1;
    vS *= Math.exp(-grip * dt);

    /* recombine */
    fx = Math.cos(this.angle); fy = Math.sin(this.angle);
    rx = -fy; ry = fx;
    this.vx = fx * vF + rx * vS;
    this.vy = fy * vF + ry * vS;
    this.speed = vF;
    this.slip = vS;

    /* ---- integrate ---- */
    var nx2 = this.x + this.vx * dt;
    var ny2 = this.y + this.vy * dt;

    /* ---- walls: probe ahead and push out ---- */
    var hit = collideWalls(this, track, nx2, ny2);
    if (hit) {
      nx2 = hit.x; ny2 = hit.y;
      if (hit.bounced) {
        this.drifting = false;
        this.boostTime = 0;
        if (this.isPlayer && this.hitCool <= 0) { SMK.audio.sfx('bump'); this.hitCool = 0.2; }
      }
    }
    this.x = nx2; this.y = ny2;

    /* ---- vertical ---- */
    if (this.vz !== 0 || this.z > 0) {
      this.vz -= GRAVITY * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) { this.z = 0; this.vz = 0; }
    }

    /* ---- rough ground shakes the kart ---- */
    if (!airborne && sd.rough && Math.abs(vF) > 12) {
      this.wobble = Math.sin(race.time * 42) * sd.rough * SMK.clamp(Math.abs(vF) / top, 0, 1);
    } else {
      this.wobble *= Math.exp(-8 * dt);
    }

    /* ---- sprite steering pose ---- */
    var wantPose = this.drifting ? this.driftDir * 1.0 : steer * 0.8;
    this.steerVisual = SMK.approach(this.steerVisual, wantPose, 12, dt);

    /* ---- progress round the lap ---- */
    updateProgress(this, race, dt);
  };

  /* ------------------------------------------------------------------
     walls — probe the surface map at the kart's rim and slide along
     ------------------------------------------------------------------ */
  var PROBE = 8;
  function collideWalls(kart, track, nx, ny) {
    if (kart.z > 0.5) return null;      /* hopped clean over it */
    var r = kart.radius;
    var bounced = false;
    var pushX = 0, pushY = 0, hits = 0;

    for (var i = 0; i < PROBE; i++) {
      var a = (i / PROBE) * SMK.TAU;
      var px = nx + Math.cos(a) * r, py = ny + Math.sin(a) * r;
      var s = SMK.sampleSurface(track, px, py);
      if (s === SURF.WALL) {
        pushX -= Math.cos(a); pushY -= Math.sin(a);
        hits++;
      }
    }
    if (!hits) return null;

    var L = Math.sqrt(pushX * pushX + pushY * pushY) || 1;
    pushX /= L; pushY /= L;

    /* shove the kart out and reflect the part of its velocity going in */
    nx += pushX * 2.6;
    ny += pushY * 2.6;
    var vn = kart.vx * pushX + kart.vy * pushY;
    if (vn < 0) {
      kart.vx -= pushX * vn * 1.35;
      kart.vy -= pushY * vn * 1.35;
      kart.vx *= 0.62; kart.vy *= 0.62;
      /* recompute the cached forward speed after the bounce */
      kart.speed = kart.vx * Math.cos(kart.angle) + kart.vy * Math.sin(kart.angle);
      bounced = true;
    }
    return { x: nx, y: ny, bounced: bounced, nx: pushX, ny: pushY };
  }

  /* ------------------------------------------------------------------
     lap / position bookkeeping
     ------------------------------------------------------------------ */
  function updateProgress(kart, race, dt) {
    var track = race.track;
    var idx = SMK.nearestNode(track, kart.x, kart.y, kart.nodeIdx);
    kart.nodeIdx = idx;
    var node = track.nodes[idx];

    /* an arena has a ring of nodes only so the map works; driving round
       it is not a lap, and counting it as one would end the bout */
    if (race.battle) return;

    kart.prevLapS = kart.lapS;
    kart.lapS = node.s;
    var len = track.length;

    /* crossing the line: s wraps from near the end to near the start */
    var startS = track.startS;
    var relPrev = (kart.prevLapS - startS + len) % len;
    var relNow = (kart.lapS - startS + len) % len;
    if (relPrev > len * 0.75 && relNow < len * 0.25) {
      if (!kart.started) {
        /* the grid sits behind the line: this crossing starts lap 1 */
        kart.started = true;
        kart.lastLapStart = race.time;
      } else {
        kart.lap++;
        kart.lapTimes.push(race.time - kart.lastLapStart);
        kart.lastLapStart = race.time;
        race.onLap(kart);
      }
    } else if (relPrev < len * 0.25 && relNow > len * 0.75 && kart.started) {
      kart.lap--;
    }

    kart.progress = kart.started ? (kart.lap * len + relNow) : (relNow - len);

    /* wrong way: moving against the node tangent for long enough */
    var dot = kart.vx * node.tx + kart.vy * node.ty;
    if (dot < -12) kart.wrongWayTime += dt;
    else kart.wrongWayTime = Math.max(0, kart.wrongWayTime - dt * 2.5);
  }

  /* ------------------------------------------------------------------
     kart-on-kart contact: mass decides who gets moved
     ------------------------------------------------------------------ */
  SMK.resolveKartCollisions = function (karts, race) {
    for (var i = 0; i < karts.length; i++) {
      var a = karts[i];
      if (a.fallTime > 0 || a.respawnTime > 0) continue;
      for (var j = i + 1; j < karts.length; j++) {
        var b = karts[j];
        if (b.fallTime > 0 || b.respawnTime > 0) continue;
        if (Math.abs(a.z - b.z) > 16) continue;
        var dx = b.x - a.x, dy = b.y - a.y;
        var d2 = dx * dx + dy * dy;
        var rr = a.radius + b.radius;
        if (d2 >= rr * rr || d2 < 1e-6) continue;

        var d = Math.sqrt(d2);
        var nx = dx / d, ny = dy / d;
        var overlap = rr - d;

        var wa = a.char.stats.weight * (a.shrinkTime > 0 ? 0.45 : 1);
        var wb = b.char.stats.weight * (b.shrinkTime > 0 ? 0.45 : 1);
        var total = wa + wb;

        /* a star or a feather-light kart being hit by a heavy one loses out */
        a.x -= nx * overlap * (wb / total);
        a.y -= ny * overlap * (wb / total);
        b.x += nx * overlap * (wa / total);
        b.y += ny * overlap * (wa / total);

        /* exchange the closing velocity */
        var rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rvn < 0) {
          var imp = -rvn * 0.9;
          a.vx -= nx * imp * (wb / total);
          a.vy -= ny * imp * (wb / total);
          b.vx += nx * imp * (wa / total);
          b.vy += ny * imp * (wa / total);
          if ((a.isPlayer || b.isPlayer) && Math.abs(rvn) > 30) {
            var p = a.isPlayer ? a : b;
            if (p.hitCool <= 0) { SMK.audio.sfx('bump'); p.hitCool = 0.22; }
          }
        }

        /* a star makes contact lethal rather than merely rude */
        if (a.starTime > 0 && b.starTime <= 0) b.spinOut(race, 2);
        else if (b.starTime > 0 && a.starTime <= 0) a.spinOut(race, 2);
      }
    }
  };

  /* ------------------------------------------------------------------
     the grid: two-by-four, staggered, behind the line
     ------------------------------------------------------------------ */
  /* `slots` lists the karts in grid order, pole first.  The original
     put you at the back of the field for the opening race of a cup and
     seeded later races from the championship standings. */
  SMK.placeOnGrid = function (karts, track, slots) {
    var startS = track.startS, len = track.length;
    slots = slots || karts;
    for (var i = 0; i < slots.length; i++) {
      var k = slots[i];
      var row = Math.floor(i / 2), col = i % 2;
      var back = 34 + row * 30;
      var t = ((startS - back) / len + 1) % 1;
      var n = SMK.nodeAtT(track, t);
      var off = (col === 0 ? -1 : 1) * n.hw * 0.34;
      k.x = n.x + n.nx * off;
      k.y = n.y + n.ny * off;
      k.angle = Math.atan2(n.ty, n.tx);
      k.vx = 0; k.vy = 0; k.speed = 0; k.slip = 0;
      k.z = 0; k.vz = 0;
      k.lap = 0; k.started = false; k.coins = 0;
      k.nodeIdx = SMK.nearestNode(track, k.x, k.y, -1);
      k.lapS = track.nodes[k.nodeIdx].s;
      k.prevLapS = k.lapS;
      k.place = i + 1;
      k.finished = false;
      k.lapTimes = [];
      k.lastLapStart = 0;
      k.item = null; k.itemCount = 0;
    }
  };

  SMK.TUNING = {
    BASE_TOP: BASE_TOP, ACC_BASE: ACC_BASE, MAX_TURN: MAX_TURN,
    COIN_MAX: COIN_MAX, COIN_SPEED: COIN_SPEED
  };

})(window.SMK);
