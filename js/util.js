/* ------------------------------------------------------------------
   util.js — math, RNG and small helpers shared by every subsystem.
   ------------------------------------------------------------------ */
'use strict';

var SMK = window.SMK || {};
window.SMK = SMK;

SMK.TAU = Math.PI * 2;

SMK.clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };
SMK.lerp = function (a, b, t) { return a + (b - a) * t; };
SMK.sign = function (v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); };

/* wrap an angle into (-PI, PI] */
SMK.wrapAngle = function (a) {
  a = a % SMK.TAU;
  if (a > Math.PI) a -= SMK.TAU;
  if (a <= -Math.PI) a += SMK.TAU;
  return a;
};

/* shortest signed delta from a to b */
SMK.angleDelta = function (a, b) { return SMK.wrapAngle(b - a); };

/* move `a` toward `b` by at most `maxStep` radians */
SMK.turnToward = function (a, b, maxStep) {
  var d = SMK.angleDelta(a, b);
  if (d > maxStep) d = maxStep;
  if (d < -maxStep) d = -maxStep;
  return SMK.wrapAngle(a + d);
};

/* exponential smoothing that is stable across frame times */
SMK.approach = function (cur, target, rate, dt) {
  return target + (cur - target) * Math.exp(-rate * dt);
};

SMK.dist = function (ax, ay, bx, by) {
  var dx = bx - ax, dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
};

SMK.dist2 = function (ax, ay, bx, by) {
  var dx = bx - ax, dy = by - ay;
  return dx * dx + dy * dy;
};

SMK.smoothstep = function (t) { return t * t * (3 - 2 * t); };
SMK.easeOutCubic = function (t) { t = 1 - t; return 1 - t * t * t; };
SMK.easeInOutSine = function (t) { return 0.5 - 0.5 * Math.cos(Math.PI * t); };

/* ---- deterministic RNG (mulberry32) so tracks bake identically ---- */
SMK.rng = function (seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* value noise on a 2D lattice — used for ground mottling */
SMK.makeNoise = function (seed) {
  var rnd = SMK.rng(seed), N = 256, tbl = new Float32Array(N * N);
  for (var i = 0; i < N * N; i++) tbl[i] = rnd();
  return function (x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var x0 = xi & 255, y0 = yi & 255, x1 = (xi + 1) & 255, y1 = (yi + 1) & 255;
    var a = tbl[y0 * N + x0], b = tbl[y0 * N + x1];
    var c = tbl[y1 * N + x0], d = tbl[y1 * N + x1];
    var u = SMK.smoothstep(xf), v = SMK.smoothstep(yf);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  };
};

/* fractal (fBm) wrapper */
SMK.makeFbm = function (seed, octaves, gain) {
  var n = SMK.makeNoise(seed);
  octaves = octaves || 3; gain = gain === undefined ? 0.5 : gain;
  return function (x, y) {
    var sum = 0, amp = 1, norm = 0, fx = x, fy = y;
    for (var o = 0; o < octaves; o++) {
      sum += n(fx, fy) * amp; norm += amp;
      amp *= gain; fx *= 2; fy *= 2;
    }
    return sum / norm;
  };
};

/* ---- ordinal suffix: 1st 2nd 3rd 4th ---- */
SMK.ordinal = function (n) {
  var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
SMK.ordinalSuffix = function (n) {
  var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return (s[(v - 20) % 10] || s[v] || s[0]);
};

/* ---- mm'ss"hh race clock, SMK style ---- */
SMK.formatTime = function (sec) {
  if (sec === null || sec === undefined || !isFinite(sec)) return "--'--\"--";
  if (sec < 0) sec = 0;
  var m = Math.floor(sec / 60);
  var s = Math.floor(sec % 60);
  var h = Math.floor((sec * 100) % 100);
  return m + "'" + (s < 10 ? '0' : '') + s + '"' + (h < 10 ? '0' : '') + h;
};

/* ---- localStorage that never throws (file:// / private mode safe) ---- */
SMK.store = {
  get: function (key, fallback) {
    try {
      var raw = window.localStorage.getItem('smk.' + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set: function (key, value) {
    try { window.localStorage.setItem('smk.' + key, JSON.stringify(value)); }
    catch (e) { /* ignore */ }
  }
};
