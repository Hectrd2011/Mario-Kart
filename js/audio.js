/* ------------------------------------------------------------------
   audio.js — a small chiptune engine over WebAudio.

   Four voices, chosen to sit where a 16-bit console's channels sat:

     pulse   two square voices with selectable duty (lead + counter)
     tri     a soft triangle bass
     noise   filtered white noise for the drum kit

   Music is written as step strings — one token per sixteenth — which
   keeps a whole song's worth of notes readable inside this file:

     "c4  .  e4  -  g4  .  .  ."     note, rest, tie

   Everything is scheduled a little ahead of the audio clock, so tab
   throttling and long frames never make the tune stutter.  The engine
   sound is a separate always-on voice whose pitch tracks road speed.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var ctx = null, master = null, musicGain = null, sfxGain = null;
  var ready = false, muted = false;

  /* ---- note names -> frequency ---- */
  var SEMI = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

  function noteFreq(tok) {
    var m = /^([a-g])([#b]?)(-?\d)$/.exec(tok);
    if (!m) return 0;
    var s = SEMI[m[1]];
    if (m[2] === '#') s++;
    else if (m[2] === 'b') s--;
    var oct = parseInt(m[3], 10);
    /* midi 69 = a4 = 440Hz */
    var midi = (oct + 1) * 12 + s;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /* ---- duty-cycle pulse waves, built once ---- */
  var pulseWaves = {};
  function pulseWave(duty) {
    var key = duty.toFixed(2);
    if (pulseWaves[key]) return pulseWaves[key];
    var N = 32, real = new Float32Array(N), imag = new Float32Array(N);
    /* Fourier series of a pulse train of the given duty */
    for (var n = 1; n < N; n++) {
      real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
      imag[n] = 0;
    }
    var w = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    pulseWaves[key] = w;
    return w;
  }

  var noiseBuffer = null;
  function getNoise() {
    if (noiseBuffer) return noiseBuffer;
    var len = Math.floor(ctx.sampleRate * 0.5);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuffer.getChannelData(0);
    var rnd = SMK.rng(1234);
    for (var i = 0; i < len; i++) d[i] = rnd() * 2 - 1;
    return noiseBuffer;
  }

  /* ------------------------------------------------------------------
     one scheduled note
     ------------------------------------------------------------------ */
  function playTone(when, dur, freq, opt) {
    if (!ready || freq <= 0) return;
    opt = opt || {};
    var g = ctx.createGain();
    var vol = (opt.vol === undefined ? 0.2 : opt.vol);
    var atk = opt.attack === undefined ? 0.006 : opt.attack;
    var rel = opt.release === undefined ? 0.05 : opt.release;
    var hold = Math.max(0.01, dur - rel);

    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + atk);
    if (opt.decayTo !== undefined)
      g.gain.linearRampToValueAtTime(vol * opt.decayTo, when + hold);
    else
      g.gain.setValueAtTime(vol, when + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur + rel);

    var src;
    if (opt.voice === 'noise') {
      src = ctx.createBufferSource();
      src.buffer = getNoise();
      src.loop = true;
      var bp = ctx.createBiquadFilter();
      bp.type = opt.filter || 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = opt.q === undefined ? 1.2 : opt.q;
      src.connect(bp); bp.connect(g);
    } else {
      src = ctx.createOscillator();
      if (opt.voice === 'tri') src.type = 'triangle';
      else if (opt.voice === 'saw') src.type = 'sawtooth';
      else if (opt.voice === 'sine') src.type = 'sine';
      else src.setPeriodicWave(pulseWave(opt.duty === undefined ? 0.5 : opt.duty));
      src.frequency.setValueAtTime(freq, when);
      if (opt.glideTo) src.frequency.exponentialRampToValueAtTime(opt.glideTo, when + dur);
      if (opt.vibrato) {
        var lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = opt.vibrato.rate || 6;
        lg.gain.value = opt.vibrato.depth || 4;
        lfo.connect(lg); lg.connect(src.frequency);
        lfo.start(when); lfo.stop(when + dur + rel);
      }
      src.connect(g);
    }
    g.connect(opt.bus || musicGain);
    src.start(when);
    src.stop(when + dur + rel + 0.02);
  }

  /* ------------------------------------------------------------------
     SONGS
     Each voice is a list of bars; each bar is 16 sixteenth-note tokens.
     'x' on the noise voice means hit; capital 'X' means accented.
     ------------------------------------------------------------------ */
  function S(bpm, voices) { return { bpm: bpm, voices: voices }; }

  /* shorthand: split a bar string on whitespace */
  function bars() { return Array.prototype.slice.call(arguments); }

  var SONGS = {};

  /* --- Mario Circuit: bright, major, driving --- */
  SONGS.circuit = S(152, [
    { voice: 'pulse', duty: 0.5, vol: 0.13, bars: bars(
      "g4 . a4 . b4 . g4 . e5 . d5 . b4 . . .",
      "c5 . d5 . e5 . c5 . g5 . . . e5 . . .",
      "d5 . e5 . f5 . d5 . b4 . . . g4 . . .",
      "c5 . b4 . a4 . g4 . a4 . b4 . c5 . . ."
    ) },
    { voice: 'pulse', duty: 0.25, vol: 0.07, bars: bars(
      "e4 . e4 . d4 . e4 . g4 . g4 . d4 . . .",
      "e4 . f4 . g4 . e4 . e5 . . . c5 . . .",
      "f4 . g4 . a4 . f4 . d5 . . . b4 . . .",
      "e4 . d4 . c4 . b3 . c4 . d4 . e4 . . ."
    ) },
    { voice: 'tri', vol: 0.20, bars: bars(
      "c3 . c3 . g2 . g2 . c3 . c3 . g2 . g2 .",
      "c3 . c3 . g2 . g2 . c3 . e3 . g3 . g2 .",
      "f2 . f2 . c3 . c3 . g2 . g2 . d3 . d3 .",
      "c3 . g2 . a2 . e2 . f2 . g2 . c3 . c3 ."
    ) },
    { voice: 'noise', vol: 0.10, bars: bars(
      "X . x . x x . x X . x . x . x x",
      "X . x . x x . x X . x . x x x .",
      "X . x . x x . x X . x . x . x x",
      "X . x . x x . x X x X x X x X x"
    ) }
  ]);

  /* --- Donut Plains: pastoral, lilting --- */
  SONGS.plains = S(138, [
    { voice: 'pulse', duty: 0.5, vol: 0.13, bars: bars(
      "f4 . . g4 a4 . . c5 a4 . . g4 f4 . . .",
      "c5 . . d5 c5 . . a4 g4 . . f4 g4 . . .",
      "a4 . . b4 c5 . . e5 d5 . . c5 a4 . . .",
      "g4 . . a4 f4 . . d4 f4 . . g4 a4 . . ."
    ) },
    { voice: 'pulse', duty: 0.125, vol: 0.055, bars: bars(
      "c5 . f5 . a5 . f5 . c5 . a4 . c5 . . .",
      "e5 . g5 . c6 . g5 . e5 . c5 . e5 . . .",
      "f5 . a5 . c6 . a5 . f5 . d5 . f5 . . .",
      "c5 . e5 . g5 . e5 . c5 . a4 . f4 . . ."
    ) },
    { voice: 'tri', vol: 0.19, bars: bars(
      "f2 . . . c3 . . . f2 . . . a2 . . .",
      "c3 . . . g2 . . . c3 . . . e3 . . .",
      "d3 . . . a2 . . . b-2 . . . f2 . . .",
      "c3 . . . g2 . . . f2 . . . f2 . . ."
    ) },
    { voice: 'noise', vol: 0.085, bars: bars(
      "X . . x . . x . X . . x . . x .",
      "X . . x . . x . X . . x . x x .",
      "X . . x . . x . X . . x . . x .",
      "X . . x . . x . X . x X . x X x"
    ) }
  ]);

  /* --- Ghost Valley: minor, chromatic, uneasy --- */
  SONGS.ghost = S(126, [
    { voice: 'pulse', duty: 0.125, vol: 0.115, bars: bars(
      "a4 . . a#4 b4 . . . e5 . . d#5 d5 . . .",
      "a4 . . g4 f4 . . . c5 . . b4 a4 . . .",
      "d5 . . c#5 c5 . . . g4 . . f#4 f4 . . .",
      "e5 . d5 . c5 . b4 . a4 . . . . . . ."
    ) },
    { voice: 'pulse', duty: 0.5, vol: 0.055, bars: bars(
      ". . e4 . . . e4 . . . b4 . . . b4 .",
      ". . c4 . . . c4 . . . g4 . . . g4 .",
      ". . f4 . . . f4 . . . c5 . . . c5 .",
      ". . e4 . . . b3 . . . e4 . . . . ."
    ) },
    { voice: 'tri', vol: 0.20, bars: bars(
      "a2 . . . a2 . . . e2 . . . e2 . . .",
      "f2 . . . f2 . . . c3 . . . c3 . . .",
      "d2 . . . d2 . . . a2 . . . a2 . . .",
      "e2 . . . e2 . . . a2 . . . . . . ."
    ) },
    { voice: 'noise', vol: 0.07, bars: bars(
      "x . . . . . x . . . . . x . . .",
      "x . . . . . x . . . . . x . . x",
      "x . . . . . x . . . . . x . . .",
      "x . x . x . x . X . . . . . . ."
    ) }
  ]);

  /* --- Bowser Castle: dark march --- */
  SONGS.castle = S(144, [
    { voice: 'pulse', duty: 0.5, vol: 0.125, bars: bars(
      "d4 . d4 . d4 . f4 . e4 . e4 . c4 . . .",
      "d4 . d4 . a4 . a4 . g4 . f4 . e4 . . .",
      "f4 . f4 . a4 . a4 . b-4 . a4 . g4 . . .",
      "a4 . g4 . f4 . e4 . d4 . c#4 . d4 . . ."
    ) },
    { voice: 'pulse', duty: 0.25, vol: 0.06, bars: bars(
      "a3 . a3 . a3 . c4 . b3 . b3 . g3 . . .",
      "a3 . a3 . e4 . e4 . d4 . c4 . b3 . . .",
      "c4 . c4 . e4 . e4 . f4 . e4 . d4 . . .",
      "e4 . d4 . c4 . b3 . a3 . a3 . a3 . . ."
    ) },
    { voice: 'tri', vol: 0.22, bars: bars(
      "d2 d2 . . d2 d2 . . d2 d2 . . a1 a1 . .",
      "d2 d2 . . d2 d2 . . g2 g2 . . a2 a2 . .",
      "f2 f2 . . f2 f2 . . b-2 b-2 . . a2 a2 . .",
      "d2 d2 . . a1 a1 . . d2 . . . d2 . . ."
    ) },
    { voice: 'noise', vol: 0.11, bars: bars(
      "X . x x X . x x X . x x X x X x",
      "X . x x X . x x X . x x X x X x",
      "X . x x X . x x X . x x X x X x",
      "X x X x X x X x X . . . X . . ."
    ) }
  ]);

  /* --- Koopa Beach: sunny, off-beat --- */
  SONGS.beach = S(146, [
    { voice: 'pulse', duty: 0.5, vol: 0.125, bars: bars(
      ". g4 . b4 . d5 . b4 . g4 . d5 . b4 . .",
      ". a4 . c5 . e5 . c5 . a4 . e5 . c5 . .",
      ". b4 . d5 . g5 . d5 . b4 . g5 . d5 . .",
      ". c5 . b4 . a4 . g4 . a4 . b4 . d5 . ."
    ) },
    { voice: 'pulse', duty: 0.125, vol: 0.05, bars: bars(
      "d5 . . . b4 . . . g5 . . . d5 . . .",
      "e5 . . . c5 . . . a5 . . . e5 . . .",
      "g5 . . . d5 . . . b5 . . . g5 . . .",
      "e5 . . . d5 . . . b4 . . . g4 . . ."
    ) },
    { voice: 'tri', vol: 0.19, bars: bars(
      "g2 . . g2 . . d3 . g2 . . g2 . . d3 .",
      "a2 . . a2 . . e3 . a2 . . a2 . . e3 .",
      "b2 . . b2 . . g3 . b2 . . b2 . . g3 .",
      "c3 . . g2 . . d3 . g2 . . d3 . . g2 ."
    ) },
    { voice: 'noise', vol: 0.09, bars: bars(
      "X . x . . x X . . x . . X . x .",
      "X . x . . x X . . x . . X . x .",
      "X . x . . x X . . x . . X . x .",
      "X . x X . x X . x X . x X x X x"
    ) }
  ]);

  /* --- Choco Island: loose, bluesy --- */
  SONGS.choco = S(134, [
    { voice: 'pulse', duty: 0.5, vol: 0.13, bars: bars(
      "e4 . g4 a4 . a#4 a4 . g4 . e4 . d4 . . .",
      "e4 . g4 a4 . a#4 a4 . g4 . e4 . g4 . . .",
      "a4 . c5 d5 . d#5 d5 . c5 . a4 . g4 . . .",
      "b4 . a4 . g4 . e4 . d4 . e4 . g4 . . ."
    ) },
    { voice: 'pulse', duty: 0.25, vol: 0.055, bars: bars(
      ". . e5 . . . d5 . . . b4 . . . a4 .",
      ". . e5 . . . g5 . . . e5 . . . d5 .",
      ". . a5 . . . g5 . . . e5 . . . d5 .",
      ". . b4 . . . a4 . . . g4 . . . e4 ."
    ) },
    { voice: 'tri', vol: 0.21, bars: bars(
      "e2 . e2 . g2 . e2 . a2 . a2 . g2 . e2 .",
      "e2 . e2 . g2 . e2 . a2 . a2 . b2 . b2 .",
      "a2 . a2 . c3 . a2 . d3 . d3 . c3 . a2 .",
      "b2 . b2 . a2 . a2 . e2 . e2 . e2 . . ."
    ) },
    { voice: 'noise', vol: 0.10, bars: bars(
      "X . x x . x . x X . x x . x . x",
      "X . x x . x . x X . x x . x x x",
      "X . x x . x . x X . x x . x . x",
      "X x . x X x . x X . x . X . . ."
    ) }
  ]);

  /* --- Vanilla Lake: sparse, icy bells --- */
  SONGS.vanilla = S(132, [
    { voice: 'pulse', duty: 0.125, vol: 0.115, bars: bars(
      "a4 . . . e5 . . . c#5 . . . b4 . . .",
      "a4 . . . f#5 . . . e5 . . . c#5 . . .",
      "d5 . . . a5 . . . f#5 . . . e5 . . .",
      "c#5 . b4 . a4 . f#4 . e4 . . . . . . ."
    ) },
    { voice: 'pulse', duty: 0.5, vol: 0.05, bars: bars(
      ". . a5 . . . a5 . . . e6 . . . . .",
      ". . a5 . . . c#6 . . . a5 . . . . .",
      ". . d6 . . . a5 . . . f#5 . . . . .",
      ". . e5 . . . c#5 . . . a4 . . . . ."
    ) },
    { voice: 'tri', vol: 0.18, bars: bars(
      "a2 . . . . . . . e2 . . . . . . .",
      "a2 . . . . . . . f#2 . . . . . . .",
      "d2 . . . . . . . a2 . . . . . . .",
      "e2 . . . . . . . a2 . . . . . . ."
    ) },
    { voice: 'noise', vol: 0.055, bars: bars(
      "x . . . . . . . x . . . . . . .",
      "x . . . . . . . x . . . . . x .",
      "x . . . . . . . x . . . . . . .",
      "x . . . x . . . x . . . . . . ."
    ) }
  ]);

  /* --- Rainbow Road: fast arpeggios over a long line --- */
  SONGS.rainbow = S(158, [
    { voice: 'pulse', duty: 0.5, vol: 0.115, bars: bars(
      "b4 . . . . . e5 . . . g#5 . . . b5 .",
      "a5 . . . g#5 . . . f#5 . . . e5 . . .",
      "c#5 . . . . . f#5 . . . a5 . . . c#6 .",
      "b5 . a5 . g#5 . f#5 . e5 . . . . . . ."
    ) },
    { voice: 'pulse', duty: 0.25, vol: 0.06, bars: bars(
      "e4 g#4 b4 e5 b4 g#4 e4 g#4 b4 e5 b4 g#4 e4 g#4 b4 e5",
      "a4 c#5 e5 a5 e5 c#5 a4 c#5 e5 a5 e5 c#5 a4 c#5 e5 a5",
      "f#4 a4 c#5 f#5 c#5 a4 f#4 a4 c#5 f#5 c#5 a4 f#4 a4 c#5 f#5",
      "e4 g#4 b4 e5 b4 g#4 e4 b4 e5 g#5 b5 g#5 e5 b4 g#4 e4"
    ) },
    { voice: 'tri', vol: 0.20, bars: bars(
      "e2 . . . e2 . . . b2 . . . b2 . . .",
      "a2 . . . a2 . . . e3 . . . e3 . . .",
      "f#2 . . . f#2 . . . c#3 . . . c#3 . . .",
      "e2 . . . b2 . . . e3 . . . e2 . . ."
    ) },
    { voice: 'noise', vol: 0.085, bars: bars(
      "X . x . X . x . X . x . X . x x",
      "X . x . X . x . X . x . X . x x",
      "X . x . X . x . X . x . X . x x",
      "X x X x X x X x X . . . X . . ."
    ) }
  ]);

  /* --- Title screen: a short fanfare that loops --- */
  SONGS.title = S(150, [
    { voice: 'pulse', duty: 0.5, vol: 0.15, bars: bars(
      "c5 . e5 . g5 . c6 . . . g5 . e5 . c5 .",
      "d5 . f5 . a5 . d6 . . . . . . . . ."
    ) },
    { voice: 'pulse', duty: 0.25, vol: 0.07, bars: bars(
      "e4 . g4 . c5 . e5 . . . c5 . g4 . e4 .",
      "f4 . a4 . d5 . f5 . . . . . . . . ."
    ) },
    { voice: 'tri', vol: 0.20, bars: bars(
      "c3 . . . g2 . . . c3 . . . e3 . . .",
      "d3 . . . a2 . . . d3 . . . d3 . . ."
    ) },
    { voice: 'noise', vol: 0.10, bars: bars(
      "X . x . X . x . X . x . X x X x",
      "X . x . X . x . X x X x X x X x"
    ) }
  ]);

  /* --- results / standings, calm --- */
  SONGS.results = S(120, [
    { voice: 'pulse', duty: 0.5, vol: 0.12, bars: bars(
      "g4 . . . c5 . . . e5 . . . d5 . . .",
      "c5 . . . a4 . . . g4 . . . . . . ."
    ) },
    { voice: 'tri', vol: 0.18, bars: bars(
      "c3 . . . g2 . . . c3 . . . g2 . . .",
      "f2 . . . c3 . . . c3 . . . . . . ."
    ) }
  ]);

  /* ------------------------------------------------------------------
     sequencer
     ------------------------------------------------------------------ */
  var seq = {
    song: null, name: null,
    startTime: 0, step: 0,
    bars: 0, running: false,
    rate: 1
  };
  var LOOKAHEAD = 0.18, SCHED_STEP = 0.05;

  function stepDur(song) { return (60 / song.bpm) / 4 / seq.rate; }

  function scheduleStep(song, step, when) {
    var sd = stepDur(song);
    for (var v = 0; v < song.voices.length; v++) {
      var voice = song.voices[v];
      var nbars = voice.bars.length;
      var bar = Math.floor(step / 16) % nbars;
      var idx = step % 16;
      var toks = voice.bars[bar].trim().split(/\s+/);
      var tok = toks[idx] || '.';
      if (tok === '.' || tok === '-') continue;

      if (voice.voice === 'noise') {
        var accent = tok === 'X';
        playTone(when, accent ? 0.06 : 0.035, accent ? 180 : 3200, {
          voice: 'noise', vol: voice.vol * (accent ? 1.3 : 0.8),
          filter: accent ? 'lowpass' : 'highpass', q: accent ? 0.9 : 0.7,
          release: accent ? 0.09 : 0.03
        });
        continue;
      }

      /* how long the note holds: until the next non-tie token */
      var len = 1;
      for (var k = step + 1; k < step + 16; k++) {
        var b2 = Math.floor(k / 16) % nbars;
        var t2 = (voice.bars[b2].trim().split(/\s+/))[k % 16] || '.';
        if (t2 === '-') len++; else break;
      }
      var f = noteFreq(tok);
      if (!f) continue;
      playTone(when, sd * len * 0.92, f, {
        voice: voice.voice, duty: voice.duty, vol: voice.vol,
        decayTo: voice.voice === 'tri' ? 0.7 : 0.85,
        release: 0.04
      });
    }
  }

  function pump() {
    if (!seq.running || !seq.song) return;
    var song = seq.song, sd = stepDur(song);
    var now = ctx.currentTime;
    while (seq.startTime + seq.step * sd < now + LOOKAHEAD) {
      scheduleStep(song, seq.step, Math.max(now, seq.startTime + seq.step * sd));
      seq.step++;
    }
  }

  /* ------------------------------------------------------------------
     engine voice — always on during a race, pitch follows speed
     ------------------------------------------------------------------ */
  var engine = null;
  function startEngine() {
    if (!ready || engine) return;
    var osc = ctx.createOscillator();
    var sub = ctx.createOscillator();
    var lp = ctx.createBiquadFilter();
    var g = ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.value = 60;
    sub.type = 'square'; sub.frequency.value = 30;
    lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 3;
    g.gain.value = 0.0;
    osc.connect(lp); sub.connect(lp); lp.connect(g); g.connect(sfxGain);
    osc.start(); sub.start();
    engine = { osc: osc, sub: sub, lp: lp, gain: g };
  }

  /* speed 0..1, load 0..1 (how hard it is working) */
  function setEngine(speed, load, alive) {
    if (!engine) return;
    var t = ctx.currentTime;
    var f = 52 + speed * 168;
    engine.osc.frequency.setTargetAtTime(f, t, 0.05);
    engine.sub.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    engine.lp.frequency.setTargetAtTime(420 + speed * 1500, t, 0.08);
    engine.gain.gain.setTargetAtTime(alive ? (0.035 + 0.05 * load) : 0, t, 0.08);
  }

  /* ------------------------------------------------------------------
     SFX
     ------------------------------------------------------------------ */
  var SFX = {
    hop: function (t) { playTone(t, 0.07, 520, { voice: 'pulse', duty: 0.5, vol: 0.13, glideTo: 900, bus: sfxGain }); },
    land: function (t) { playTone(t, 0.06, 160, { voice: 'noise', filter: 'lowpass', vol: 0.12, bus: sfxGain }); },
    skid: function (t) { playTone(t, 0.10, 2400, { voice: 'noise', filter: 'highpass', vol: 0.06, bus: sfxGain }); },
    coin: function (t) {
      playTone(t, 0.05, 1050, { voice: 'pulse', duty: 0.5, vol: 0.13, bus: sfxGain });
      playTone(t + 0.05, 0.10, 1570, { voice: 'pulse', duty: 0.5, vol: 0.13, bus: sfxGain });
    },
    itemGet: function (t) {
      playTone(t, 0.05, 660, { voice: 'pulse', duty: 0.25, vol: 0.12, bus: sfxGain });
      playTone(t + 0.05, 0.05, 880, { voice: 'pulse', duty: 0.25, vol: 0.12, bus: sfxGain });
      playTone(t + 0.10, 0.09, 1320, { voice: 'pulse', duty: 0.25, vol: 0.12, bus: sfxGain });
    },
    itemRoll: function (t) { playTone(t, 0.03, 1400, { voice: 'pulse', duty: 0.5, vol: 0.07, bus: sfxGain }); },
    useItem: function (t) { playTone(t, 0.09, 300, { voice: 'pulse', duty: 0.5, vol: 0.12, glideTo: 1100, bus: sfxGain }); },
    boost: function (t) {
      playTone(t, 0.26, 200, { voice: 'saw', vol: 0.11, glideTo: 1500, bus: sfxGain });
      playTone(t, 0.26, 1800, { voice: 'noise', filter: 'highpass', vol: 0.07, bus: sfxGain });
    },
    bump: function (t) { playTone(t, 0.09, 110, { voice: 'noise', filter: 'lowpass', vol: 0.16, q: 0.8, bus: sfxGain }); },
    spin: function (t) {
      playTone(t, 0.42, 700, { voice: 'pulse', duty: 0.125, vol: 0.12, glideTo: 180, bus: sfxGain });
    },
    squash: function (t) { playTone(t, 0.3, 500, { voice: 'pulse', duty: 0.5, vol: 0.13, glideTo: 90, bus: sfxGain }); },
    shellHit: function (t) { playTone(t, 0.14, 240, { voice: 'noise', filter: 'bandpass', vol: 0.15, q: 2, bus: sfxGain }); },
    lightning: function (t) {
      playTone(t, 0.5, 3000, { voice: 'noise', filter: 'highpass', vol: 0.18, bus: sfxGain });
      playTone(t, 0.5, 90, { voice: 'saw', vol: 0.10, glideTo: 40, bus: sfxGain });
    },
    fall: function (t) { playTone(t, 0.7, 700, { voice: 'sine', vol: 0.14, glideTo: 70, bus: sfxGain }); },
    splash: function (t) { playTone(t, 0.22, 900, { voice: 'noise', filter: 'bandpass', vol: 0.12, q: 0.8, bus: sfxGain }); },
    countBeep: function (t) { playTone(t, 0.13, 660, { voice: 'pulse', duty: 0.5, vol: 0.17, bus: sfxGain }); },
    countGo: function (t) { playTone(t, 0.3, 1320, { voice: 'pulse', duty: 0.5, vol: 0.2, bus: sfxGain }); },
    lap: function (t) {
      playTone(t, 0.08, 880, { voice: 'pulse', duty: 0.5, vol: 0.14, bus: sfxGain });
      playTone(t + 0.09, 0.14, 1320, { voice: 'pulse', duty: 0.5, vol: 0.14, bus: sfxGain });
    },
    menuMove: function (t) { playTone(t, 0.04, 700, { voice: 'pulse', duty: 0.5, vol: 0.10, bus: sfxGain }); },
    menuPick: function (t) {
      playTone(t, 0.05, 880, { voice: 'pulse', duty: 0.5, vol: 0.13, bus: sfxGain });
      playTone(t + 0.05, 0.10, 1320, { voice: 'pulse', duty: 0.5, vol: 0.13, bus: sfxGain });
    },
    menuBack: function (t) { playTone(t, 0.09, 440, { voice: 'pulse', duty: 0.5, vol: 0.11, glideTo: 220, bus: sfxGain }); },
    finish: function (t) {
      var n = ['c5', 'e5', 'g5', 'c6'];
      for (var i = 0; i < n.length; i++)
        playTone(t + i * 0.1, 0.26, noteFreq(n[i]), { voice: 'pulse', duty: 0.5, vol: 0.16, bus: sfxGain });
    },
    lose: function (t) {
      var n = ['g4', 'f#4', 'f4', 'e4'];
      for (var i = 0; i < n.length; i++)
        playTone(t + i * 0.13, 0.3, noteFreq(n[i]), { voice: 'pulse', duty: 0.25, vol: 0.14, bus: sfxGain });
    },
    star: function (t) {
      var n = ['c5', 'e5', 'g5', 'c6', 'g5', 'e5'];
      for (var i = 0; i < n.length; i++)
        playTone(t + i * 0.055, 0.07, noteFreq(n[i]), { voice: 'pulse', duty: 0.125, vol: 0.09, bus: sfxGain });
    }
  };

  /* ------------------------------------------------------------------
     public surface
     ------------------------------------------------------------------ */
  var Audio = {
    get ready() { return ready; },
    get muted() { return muted; },

    init: function () {
      if (ready) return true;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { ctx = new AC(); } catch { return false; }
      master = ctx.createGain(); master.gain.value = 0.85;
      musicGain = ctx.createGain(); musicGain.gain.value = 0.85;
      sfxGain = ctx.createGain(); sfxGain.gain.value = 1.0;
      musicGain.connect(master); sfxGain.connect(master);
      master.connect(ctx.destination);
      ready = true;
      setInterval(pump, SCHED_STEP * 1000);
      return true;
    },

    resume: function () {
      if (ready && ctx.state === 'suspended') ctx.resume();
    },

    playMusic: function (name, opt) {
      if (!ready) return;
      var song = SONGS[name];
      if (!song) return;
      if (seq.name === name && seq.running) return;
      seq.song = song; seq.name = name;
      seq.step = 0; seq.rate = (opt && opt.rate) || 1;
      seq.startTime = ctx.currentTime + 0.06;
      seq.running = true;
      pump();
    },

    /* the original sped the music up on the final lap */
    setMusicRate: function (r) {
      if (!seq.song || seq.rate === r) return;
      /* re-anchor so the tune does not jump */
      var sd0 = stepDur(seq.song);
      var elapsed = seq.startTime + seq.step * sd0;
      seq.rate = r;
      seq.startTime = elapsed - seq.step * stepDur(seq.song);
    },

    stopMusic: function () { seq.running = false; seq.name = null; },

    musicName: function () { return seq.running ? seq.name : null; },

    sfx: function (name, delay) {
      if (!ready || !SFX[name]) return;
      SFX[name](ctx.currentTime + (delay || 0));
    },

    startEngine: startEngine,
    setEngine: function (speed, load, alive) { if (ready) { startEngine(); setEngine(speed, load, alive); } },
    stopEngine: function () { if (engine) setEngine(0, 0, false); },

    setMute: function (m) {
      muted = m;
      if (master) master.gain.setTargetAtTime(m ? 0 : 0.85, ctx.currentTime, 0.02);
      SMK.store.set('muted', m);
    },
    toggleMute: function () { Audio.setMute(!muted); return muted; },

    songNames: function () { return Object.keys(SONGS); }
  };

  muted = !!SMK.store.get('muted', false);
  SMK.audio = Audio;

})(window.SMK);
