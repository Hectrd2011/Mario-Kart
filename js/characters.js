/* ------------------------------------------------------------------
   characters.js — the eight-driver roster.

   Stats follow the original's three weight classes: the plumbers are
   the balanced yardstick, the princess/dino pair trade top speed for
   acceleration, the shell/mushroom pair are the best cornerers, and
   the two heavies get the highest top speed with sluggish pickup and
   enough mass to shove anyone else off the racing line.

   `special` is the item a CPU driver of that character draws — the
   original gave each racer exactly one, used on an infinite loop, and
   three of them (poison mushroom, egg, fireball) were CPU-only.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var P = SMK.PAL;

  /* palette slots every kart shares, so one entry restyles a racer:
       body   main shell colour
       bodyLo shaded side of the shell
       bodyHi top highlight
       trim   nose cone / spoiler / seat accent
       engine visible motor block                                     */
  function kartPal(body, bodyLo, bodyHi, trim, engine) {
    return { body: body, bodyLo: bodyLo, bodyHi: bodyHi, trim: trim, engine: engine || P.grey2 };
  }

  var ROSTER = [
    {
      id: 'mario', name: 'MARIO', shortName: 'MARIO',
      weightClass: 'medium',
      stats: { topSpeed: 1.00, accel: 1.00, handling: 1.00, weight: 1.00, driftGrip: 1.00 },
      special: 'star',
      kart: kartPal('#e02020', '#901010', '#ff7060', '#f8f8f8', '#584860'),
      mapColor: '#e02020',
      driver: {
        type: 'human',
        skin: P.skin, skinShade: P.skinShade,
        cap: '#e02020', capShade: '#981010', emblem: 'M', emblemColor: '#f8f8f8',
        hair: '#582800', shirt: '#e02020', shirtShade: '#981010',
        overalls: '#2048d8', overallsShade: '#102878',
        glove: '#f8f8f8', nose: true, moustache: '#582800'
      }
    },
    {
      id: 'luigi', name: 'LUIGI', shortName: 'LUIGI',
      weightClass: 'medium',
      stats: { topSpeed: 1.00, accel: 1.00, handling: 1.02, weight: 0.98, driftGrip: 1.00 },
      special: 'star',
      kart: kartPal('#20a828', '#107018', '#70e070', '#f8f8f8', '#584860'),
      mapColor: '#20c030',
      driver: {
        type: 'human',
        skin: P.skin, skinShade: P.skinShade,
        cap: '#20a828', capShade: '#107018', emblem: 'L', emblemColor: '#f8f8f8',
        hair: '#402000', shirt: '#20a828', shirtShade: '#107018',
        overalls: '#2048d8', overallsShade: '#102878',
        glove: '#f8f8f8', nose: true, moustache: '#402000'
      }
    },
    {
      id: 'peach', name: 'PRINCESS', shortName: 'PEACH',
      weightClass: 'light',
      stats: { topSpeed: 0.975, accel: 1.18, handling: 1.06, weight: 0.84, driftGrip: 1.04 },
      special: 'poison',
      kart: kartPal('#f870b0', '#b03070', '#ffb8d8', '#fff0a0', '#906080'),
      mapColor: '#ff80c0',
      driver: {
        type: 'human',
        skin: '#ffd0a8', skinShade: '#d89868',
        crown: '#ffd800', crownGem: '#f02040',
        hair: '#f8d848', hairShade: '#c09810',
        shirt: '#f870b0', shirtShade: '#b03070',
        overalls: '#f870b0', overallsShade: '#b03070',
        glove: '#f8f8f8', nose: false, longHair: true
      }
    },
    {
      id: 'yoshi', name: 'YOSHI', shortName: 'YOSHI',
      weightClass: 'light',
      stats: { topSpeed: 0.975, accel: 1.20, handling: 1.05, weight: 0.86, driftGrip: 1.05 },
      special: 'egg',
      kart: kartPal('#30c840', '#188020', '#90f090', '#f85868', '#486850'),
      mapColor: '#40e050',
      driver: {
        type: 'dino',
        skin: '#30c840', skinShade: '#188020',
        muzzle: '#30c840', muzzleShade: '#188020',
        cheek: '#f87890',
        crest: '#e02040', spike: '#f8f8f8',
        boot: '#f85020', nose: false
      }
    },
    {
      id: 'bowser', name: 'BOWSER', shortName: 'BOWSER',
      weightClass: 'heavy',
      stats: { topSpeed: 1.065, accel: 0.78, handling: 0.84, weight: 1.38, driftGrip: 0.92 },
      special: 'fireball',
      kart: kartPal('#f0b020', '#a06808', '#ffe088', '#38304c', '#484050'),
      mapColor: '#f0c020',
      driver: {
        type: 'bowser',
        skin: '#78c828', skinShade: '#3c8010',
        belly: '#f8d888', bellyShade: '#c09840',
        hair: '#f05808', hairShade: '#a83000',
        horn: '#f8f0d0', hornShade: '#c0b890',
        shell: '#28a848', shellShade: '#106028',
        brow: '#301008', collar: '#383040', spike: '#f8f0d0'
      }
    },
    {
      id: 'dkjr', name: 'DONKEY KONG JR', shortName: 'D.K.JR',
      weightClass: 'heavy',
      stats: { topSpeed: 1.055, accel: 0.80, handling: 0.86, weight: 1.34, driftGrip: 0.93 },
      special: 'banana',
      kart: kartPal('#a05828', '#683010', '#d89858', '#f8f0d8', '#504038'),
      mapColor: '#c07838',
      driver: {
        type: 'kong',
        skin: '#7c4818', skinShade: '#4c2808',
        muzzle: '#e0a868', muzzleShade: '#a87038',
        shirt: '#f8f8f8', shirtShade: '#c0c0c8',
        cap: '#f02020', capShade: '#a01010',
        brow: '#301808', nose: true
      }
    },
    {
      id: 'koopa', name: 'KOOPA TROOPA', shortName: 'KOOPA',
      weightClass: 'feather',
      stats: { topSpeed: 0.94, accel: 1.10, handling: 1.24, weight: 0.74, driftGrip: 1.14 },
      special: 'greenShell',
      kart: kartPal('#38b0f8', '#1868b0', '#a0e0ff', '#f8e058', '#486078'),
      mapColor: '#40c0ff',
      driver: {
        type: 'koopa',
        skin: '#f8d040', skinShade: '#c09010',
        muzzle: '#f8e890', beak: '#f89820',
        shell: '#28a038', shellShade: '#105818', shellRim: '#f8e890',
        boot: '#f89820', nose: false
      }
    },
    {
      id: 'toad', name: 'TOAD', shortName: 'TOAD',
      weightClass: 'feather',
      stats: { topSpeed: 0.935, accel: 1.12, handling: 1.26, weight: 0.72, driftGrip: 1.15 },
      special: 'poison',
      /* a blue kart, not a white one: his cap is already white and the
         two merged into a single unreadable blob at speed */
      kart: kartPal('#2848c8', '#142c80', '#7898f8', '#f8f8f8', '#48547c'),
      mapColor: '#f0f0f8',
      driver: {
        type: 'toad',
        skin: '#ffd8b0', skinShade: '#d0a070',
        cap: '#f8f8f8', capShade: '#c8c8d8', spot: '#f02828',
        vest: '#3868e0', vestShade: '#1838a0',
        collar: '#f8f8f8', nose: false
      }
    }
  ];

  /* snap every authored colour onto the SNES lattice */
  (function snapAll() {
    function snapObj(o) {
      for (var k in o) {
        if (!o.hasOwnProperty(k)) continue;
        var v = o[k];
        if (typeof v === 'string' && v.charAt(0) === '#') o[k] = SMK.snes(v);
        else if (v && typeof v === 'object') snapObj(v);
      }
    }
    for (var i = 0; i < ROSTER.length; i++) snapObj(ROSTER[i]);
  })();

  var BY_ID = {};
  for (var i = 0; i < ROSTER.length; i++) {
    ROSTER[i].index = i;
    BY_ID[ROSTER[i].id] = ROSTER[i];
  }

  /* character-select grid order, matching the original's 4x2 layout */
  SMK.characters = ROSTER;
  SMK.characterById = function (id) { return BY_ID[id] || ROSTER[0]; };
  SMK.SELECT_GRID = [
    ['mario', 'luigi', 'bowser', 'peach'],
    ['dkjr', 'koopa', 'toad', 'yoshi']
  ];

  /* engine classes scale absolute speed and how hard the CPU pushes */
  SMK.ENGINE_CLASSES = [
    { id: '50cc', name: '50CC', speed: 0.76, accel: 0.86, cpu: 0.80, laps: 5 },
    { id: '100cc', name: '100CC', speed: 0.88, accel: 0.94, cpu: 0.90, laps: 5 },
    { id: '150cc', name: '150CC', speed: 1.00, accel: 1.00, cpu: 1.00, laps: 5 }
  ];

  /* Grand Prix scoring: the original awarded only the top four */
  SMK.GP_POINTS = [9, 6, 3, 1, 0, 0, 0, 0];

})(window.SMK);
