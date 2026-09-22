/* ------------------------------------------------------------------
   items.js — the roulette, the projectiles and what they do to you.

   The draw is weighted by position the way the original's was: the
   leader gets defensive junk (a banana, a green shell, a coin), the
   midfield gets the useful stuff, and whoever is last gets the things
   that actually rescue a race — a star, a feather, three mushrooms,
   the lightning bolt.

   Three items were CPU-only in the original and stay that way here:
   the poison mushroom (Princess and Toad), Yoshi's egg, and Bowser's
   fireballs.  A CPU racer draws only its own character's item, which
   is why a Bowser behind you is a different problem from a Toad.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  /* ---- definitions ------------------------------------------------- */
  var ITEMS = {
    mushroom:   { icon: 'i_mushroom', name: 'MUSHROOM', count: 1 },
    triple:     { icon: 'i_triple', name: 'TRIPLE MUSHROOM', count: 3, useIcon: 'i_mushroom' },
    star:       { icon: 'i_star', name: 'STAR', count: 1 },
    banana:     { icon: 'i_banana', name: 'BANANA', count: 1 },
    greenShell: { icon: 'i_greenShell', name: 'GREEN SHELL', count: 1 },
    redShell:   { icon: 'i_redShell', name: 'RED SHELL', count: 1 },
    feather:    { icon: 'i_feather', name: 'FEATHER', count: 1 },
    lightning:  { icon: 'i_lightning', name: 'LIGHTNING', count: 1 },
    boo:        { icon: 'i_boo', name: 'BOO', count: 1 },
    coin:       { icon: 'i_coin', name: 'COIN', count: 1 },
    /* CPU-only */
    poison:     { icon: 'i_poison', name: 'POISON MUSHROOM', count: 1, cpuOnly: true },
    egg:        { icon: 'i_egg', name: 'EGG', count: 1, cpuOnly: true },
    fireball:   { icon: 'i_fireball', name: 'FIREBALL', count: 1, cpuOnly: true }
  };

  /* weights by position bucket: leader / midfield / back of the grid */
  var WEIGHTS = {
    lead: [
      ['banana', 30], ['greenShell', 26], ['coin', 20], ['mushroom', 14], ['redShell', 10]
    ],
    mid: [
      ['mushroom', 22], ['banana', 16], ['greenShell', 14], ['redShell', 16],
      ['star', 10], ['coin', 10], ['triple', 7], ['boo', 5]
    ],
    back: [
      ['star', 20], ['triple', 18], ['mushroom', 14], ['lightning', 12],
      ['feather', 10], ['redShell', 10], ['boo', 8], ['greenShell', 8]
    ]
  };

  function bucket(place, total) {
    if (place <= 1) return 'lead';
    if (place >= Math.max(5, Math.ceil(total * 0.62))) return 'back';
    return 'mid';
  }

  function pickWeighted(list, rnd) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += list[i][1];
    var r = rnd() * total;
    for (i = 0; i < list.length; i++) {
      r -= list[i][1];
      if (r <= 0) return list[i][0];
    }
    return list[0][0];
  }

  /* ---- projectiles ------------------------------------------------- */
  function Projectile(type, kart, race, opt) {
    opt = opt || {};
    this.type = type;
    this.owner = kart;
    this.ownerIndex = kart ? kart.index : -1;
    this.x = opt.x; this.y = opt.y; this.z = opt.z || 0;
    this.vx = opt.vx || 0; this.vy = opt.vy || 0; this.vz = opt.vz || 0;
    this.life = opt.life || 6;
    this.armed = opt.armed === undefined ? 0.16 : opt.armed;  /* grace for the thrower */
    this.target = opt.target || null;
    this.bounces = 0;
    this.phase = 0;
    this.art = opt.art || ('i_' + type);
    this.radius = opt.radius || 9;
    this.dead = false;
  }
  SMK.Projectile = Projectile;

  var SHELL_SPEED = 196;
  var EGG_SPEED = 160;
  var FIRE_SPEED = 170;

  /* the kart one place ahead of `kart` — a red shell's target */
  function kartAhead(race, kart) {
    var best = null;
    for (var i = 0; i < race.karts.length; i++) {
      var k = race.karts[i];
      if (k === kart || k.finished) continue;
      if (k.progress <= kart.progress) continue;
      if (!best || k.progress < best.progress) best = k;
    }
    return best;
  }

  /* ---- using an item ---------------------------------------------- */
  function use(kart, race) {
    if (!kart.item) return false;
    var id = kart.item;
    var fx = Math.cos(kart.angle), fy = Math.sin(kart.angle);

    switch (id) {
      case 'mushroom':
      case 'triple':
        kart.giveBoost(0.66);
        if (kart.isPlayer) SMK.audio.sfx('boost');
        break;

      case 'star':
        kart.starTime = 7.0;
        kart.giveBoost(0.4);
        if (kart.isPlayer) SMK.audio.sfx('star');
        break;

      case 'coin':
        kart.coins = Math.min(SMK.TUNING.COIN_MAX, kart.coins + 2);
        if (kart.isPlayer) SMK.audio.sfx('coin');
        break;

      case 'feather':
        /* a big hop: clears a wall, a gap, or a corner you shouldn't cut */
        kart.vz = 330;
        kart.z = Math.max(kart.z, 1);
        if (kart.isPlayer) SMK.audio.sfx('hop');
        break;

      case 'banana':
        race.projectiles.push(new Projectile('banana', kart, race, {
          x: kart.x - fx * 26, y: kart.y - fy * 26, z: 0,
          life: 40, art: 'i_banana', radius: 10, armed: 0.5
        }));
        if (kart.isPlayer) SMK.audio.sfx('useItem');
        break;

      case 'greenShell':
        race.projectiles.push(new Projectile('greenShell', kart, race, {
          x: kart.x + fx * 24, y: kart.y + fy * 24, z: 2,
          vx: fx * SHELL_SPEED, vy: fy * SHELL_SPEED,
          life: 7, art: 'i_greenShell', radius: 9
        }));
        if (kart.isPlayer) SMK.audio.sfx('useItem');
        break;

      case 'redShell':
        race.projectiles.push(new Projectile('redShell', kart, race, {
          x: kart.x + fx * 24, y: kart.y + fy * 24, z: 2,
          vx: fx * SHELL_SPEED, vy: fy * SHELL_SPEED,
          life: 9, art: 'i_redShell', radius: 9,
          target: kartAhead(race, kart)
        }));
        if (kart.isPlayer) SMK.audio.sfx('useItem');
        break;

      case 'egg':
        race.projectiles.push(new Projectile('egg', kart, race, {
          x: kart.x + fx * 24, y: kart.y + fy * 24, z: 6,
          vx: fx * EGG_SPEED, vy: fy * EGG_SPEED, vz: 60,
          life: 6, art: 'i_egg', radius: 10
        }));
        break;

      case 'fireball': {
        /* a spread of three, which is what made Bowser worth dreading */
        for (var i = -1; i <= 1; i++) {
          var a = kart.angle + i * 0.26;
          race.projectiles.push(new Projectile('fireball', kart, race, {
            x: kart.x + Math.cos(a) * 22, y: kart.y + Math.sin(a) * 22, z: 3,
            vx: Math.cos(a) * FIRE_SPEED, vy: Math.sin(a) * FIRE_SPEED,
            life: 2.6, art: 'i_fireball', radius: 9
          }));
        }
        break;
      }

      case 'lightning': {
        for (var j = 0; j < race.karts.length; j++) {
          var k = race.karts[j];
          if (k === kart || k.starTime > 0 || k.invisTime > 0) continue;
          k.shrinkTime = 7.5;
          k.squash(race);
        }
        SMK.audio.sfx('lightning');
        race.flash = 0.5;
        break;
      }

      case 'poison': {
        /* the CPU aims it at whoever is directly ahead */
        var victim = kartAhead(race, kart);
        if (victim && victim.starTime <= 0 && victim.invisTime <= 0) {
          victim.shrinkTime = 6.0;
          victim.squash(race);
        }
        break;
      }

      case 'boo': {
        kart.invisTime = 5.5;
        /* and lift an item off somebody who has one */
        var victims = [];
        for (var m = 0; m < race.karts.length; m++) {
          var v = race.karts[m];
          if (v !== kart && v.item) victims.push(v);
        }
        if (victims.length) {
          var pick = victims[Math.floor(race.rnd() * victims.length)];
          var stolen = pick.item, cnt = pick.itemCount;
          pick.item = null; pick.itemCount = 0;
          kart.item = stolen; kart.itemCount = cnt;
          if (kart.isPlayer) SMK.audio.sfx('itemGet');
          return true;     /* the steal replaces the Boo; keep it */
        }
        if (kart.isPlayer) SMK.audio.sfx('useItem');
        break;
      }
    }

    /* spend one charge */
    kart.itemCount--;
    if (kart.itemCount <= 0) { kart.item = null; kart.itemCount = 0; }
    return true;
  }

  /* ---- projectile stepping ---------------------------------------- */
  function updateProjectiles(race, dt) {
    var track = race.track;
    var list = race.projectiles;

    for (var i = list.length - 1; i >= 0; i--) {
      var p = list[i];
      p.life -= dt;
      p.armed = Math.max(0, p.armed - dt);
      p.phase += dt;
      if (p.life <= 0) { list.splice(i, 1); continue; }

      if (p.type === 'banana') {
        /* just sits there looking innocent */
      } else if (p.type === 'redShell' ) {
        /* steer toward the target, but keep a fixed speed */
        if (p.target && !p.target.finished) {
          var dx = p.target.x - p.x, dy = p.target.y - p.y;
          var want = Math.atan2(dy, dx);
          var cur = Math.atan2(p.vy, p.vx);
          cur = SMK.turnToward(cur, want, 4.6 * dt);
          p.vx = Math.cos(cur) * SHELL_SPEED;
          p.vy = Math.sin(cur) * SHELL_SPEED;
        }
        moveAndBounce(p, track, dt, 4);
      } else if (p.type === 'greenShell') {
        moveAndBounce(p, track, dt, 5);
      } else if (p.type === 'egg') {
        p.vz -= 380 * dt;
        p.z += p.vz * dt;
        if (p.z <= 2) { p.z = 2; p.vz = 110; }
        moveAndBounce(p, track, dt, 4);
      } else if (p.type === 'fireball') {
        moveAndBounce(p, track, dt, 0);
      }

      if (p.dead) { list.splice(i, 1); continue; }

      /* ---- does it hit anyone? ---- */
      for (var j = 0; j < race.karts.length; j++) {
        var k = race.karts[j];
        if (k.finished || k.fallTime > 0 || k.respawnTime > 0) continue;
        if (k === p.owner && p.armed > 0) continue;
        if (k.invisTime > 0) continue;
        if (Math.abs(k.z - p.z) > 22) continue;
        var d2 = SMK.dist2(k.x, k.y, p.x, p.y);
        var rr = k.radius + p.radius;
        if (d2 > rr * rr) continue;

        if (k.starTime > 0) {
          /* a star just swats it away */
          p.dead = true;
          break;
        }
        if (p.type === 'banana') k.spinOut(race, 2);
        else if (p.type === 'fireball') k.stun(race, 0.6);
        else if (p.type === 'egg') k.spinOut(race, 3);
        else k.squash(race);
        if (p.type !== 'banana') SMK.audio.sfx('shellHit');
        if (race.spawnEffect) race.spawnEffect('fx_poof', p.x, p.y, p.z);
        p.dead = true;
        break;
      }
      if (p.dead) list.splice(i, 1);
    }
  }

  /* move a projectile, reflecting off walls up to `maxBounce` times */
  function moveAndBounce(p, track, dt, maxBounce) {
    var nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
    var s = SMK.sampleSurface(track, nx, ny);

    if (s === SMK.SURF.VOID) { p.dead = true; return; }

    if (s === SMK.SURF.WALL) {
      if (p.bounces >= maxBounce) { p.dead = true; return; }
      p.bounces++;
      /* find which way the wall faces by probing around the impact */
      var px = 0, py = 0, hits = 0;
      for (var i = 0; i < 8; i++) {
        var a = (i / 8) * SMK.TAU;
        var qx = nx + Math.cos(a) * 9, qy = ny + Math.sin(a) * 9;
        if (SMK.sampleSurface(track, qx, qy) === SMK.SURF.WALL) {
          px -= Math.cos(a); py -= Math.sin(a); hits++;
        }
      }
      if (!hits) { p.dead = true; return; }
      var L = Math.sqrt(px * px + py * py) || 1;
      px /= L; py /= L;
      var vn = p.vx * px + p.vy * py;
      p.vx -= 2 * vn * px;
      p.vy -= 2 * vn * py;
      p.x += px * 3; p.y += py * 3;
      SMK.audio.sfx('shellHit');
      return;
    }
    p.x = nx; p.y = ny;
  }

  /* ---- item boxes -------------------------------------------------- */
  /* a used panel goes flat for a moment, as the original's did */
  function collectBox(kart, race, box) {
    if (kart.item) return false;
    box.cooldown = 2.4;
    var it;
    if (kart.ai) {
      /* a CPU racer only ever draws its own character's item */
      it = kart.char.special;
    } else {
      it = pickWeighted(WEIGHTS[bucket(kart.place, race.karts.length)], race.rnd);
    }
    kart.item = it;
    kart.itemCount = ITEMS[it].count;
    kart.rollTime = kart.isPlayer ? 0.85 : 0;
    if (kart.isPlayer) SMK.audio.sfx('itemGet');
    return true;
  }

  SMK.Items = {
    defs: ITEMS,
    weights: WEIGHTS,
    bucket: bucket,
    roll: function (place, total, rnd) {
      return pickWeighted(WEIGHTS[bucket(place, total)], rnd || Math.random);
    },
    use: use,
    updateProjectiles: updateProjectiles,
    collectBox: collectBox,
    kartAhead: kartAhead,
    /* the icon to show in the HUD window, honouring the roulette spin */
    iconFor: function (id) {
      var d = ITEMS[id];
      return d ? d.icon : null;
    },
    /* every icon the roulette can land on, for the spin animation */
    rouletteIcons: function () {
      var out = [];
      for (var k in ITEMS) if (ITEMS.hasOwnProperty(k) && !ITEMS[k].cpuOnly) out.push(ITEMS[k].icon);
      return out;
    }
  };

})(window.SMK);
