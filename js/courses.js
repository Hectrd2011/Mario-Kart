/* ------------------------------------------------------------------
   courses.js — twenty courses in four cups of five, as the original
   laid them out (it is the only game in the series with five courses
   per cup rather than four).

   Each entry is a closed Catmull-Rom loop in the 1024x1024 track space,
   a road half-width, and the patches and props that give it character.
   The geometry is an original recreation tuned to each course's
   personality — its length, how many corners, how wide, how much
   run-off, where the hazards bite — rather than a traced copy of the
   cartridge's tilemaps. `notes` records the intent for each one.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var COURSES = {};

  function C(o) {
    if (o.corners && !o.path) o.path = fromCorners(o.corners);
    COURSES[o.id] = o; o.laps = o.laps || 5;
    return o;
  }

  /* ------------------------------------------------------------------
     Courses are authored as a ring of corners — [x, y, radius] — joined
     by straights, which is how a circuit actually reads: a long pit
     straight, a 90-degree right, a chicane.  Feeding control points
     straight to a Catmull-Rom spline instead gives you a potato.

     For each corner we emit a point one radius before it and one radius
     after it (so the spline rounds the corner at roughly that radius),
     then two points along the straight that follows, which keeps the
     straight straight and lines the tangents up on the way in and out.

     A small radius therefore means a hard, slow corner (Bowser Castle);
     a large one means a fast sweep (Mario Circuit).
     ------------------------------------------------------------------ */
  function fromCorners(corners) {
    var n = corners.length, pts = [], i;
    function dir(a, b) {
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var L = Math.sqrt(dx * dx + dy * dy) || 1;
      return [dx / L, dy / L];
    }
    for (i = 0; i < n; i++) {
      var prev = corners[(i - 1 + n) % n];
      var cur = corners[i];
      var next = corners[(i + 1) % n];
      var din = dir(prev, cur), dout = dir(cur, next);
      var r = cur[2];
      /* never let a corner's radius eat more than 40% of either straight */
      var lin = Math.sqrt(Math.pow(cur[0] - prev[0], 2) + Math.pow(cur[1] - prev[1], 2));
      var lout = Math.sqrt(Math.pow(next[0] - cur[0], 2) + Math.pow(next[1] - cur[1], 2));
      var rin = Math.min(r, lin * 0.4), rout = Math.min(r, lout * 0.4);

      var entry = [cur[0] - din[0] * rin, cur[1] - din[1] * rin];
      var exit = [cur[0] + dout[0] * rout, cur[1] + dout[1] * rout];
      pts.push(entry, exit);

      /* straight from this exit to the next corner's entry */
      var nr = Math.min(next[2], lout * 0.4);
      var nEntry = [next[0] - dout[0] * nr, next[1] - dout[1] * nr];
      var sx = nEntry[0] - exit[0], sy = nEntry[1] - exit[1];
      var slen = Math.sqrt(sx * sx + sy * sy);
      if (slen > 40) {
        pts.push([exit[0] + sx * 0.35, exit[1] + sy * 0.35]);
        pts.push([exit[0] + sx * 0.68, exit[1] + sy * 0.68]);
      } else if (slen > 12) {
        pts.push([exit[0] + sx * 0.5, exit[1] + sy * 0.5]);
      }
    }
    return pts;
  }

  /* ================= MARIO CIRCUIT ================= */

  C({
    id: 'mc1', name: 'MARIO CIRCUIT 1', theme: 'circuit', width: 60,
    notes: 'The tutorial lap: wide, four easy corners, one long straight.',
    corners: [[230,862,80],[790,870,115],[886,500,115],[640,175,110],[300,165,110],[136,520,105]],
    startAt: 0.07,
    patches: [
      { type: 'boost', at: 0.085, u: 0, len: 30, w: 0.5 },
      { type: 'oil', at: 0.36, u: -0.42, len: 34, w: 0.30 },
      { type: 'oil', at: 0.62, u: 0.45, len: 34, w: 0.30 }
    ],
    objects: [
      { type: 'pipe', at: 0.26, u: 0.72 }, { type: 'pipe', at: 0.30, u: -0.74 },
      { type: 'pipe', at: 0.78, u: 0.70 },
      { type: 'itembox', at: 0.15, u: -0.30 }, { type: 'itembox', at: 0.15, u: 0 },
      { type: 'itembox', at: 0.15, u: 0.30 },
      { type: 'coin', at: 0.45, u: -0.2, count: 6 },
      { type: 'coin', at: 0.70, u: 0.25, count: 6 }
    ]
  });

  C({
    id: 'mc2', name: 'MARIO CIRCUIT 2', theme: 'circuit', width: 55,
    notes: 'Adds a chicane and a pinched hairpin behind the pit straight.',
    corners: [[200,860,70],[720,882,90],[880,762,52],[556,664,44],[880,472,50],[834,242,80],[430,150,92],[158,330,84]],
    startAt: 0.05,
    widthProfile: [[0.0, 58], [0.28, 46], [0.55, 52], [0.8, 58]],
    patches: [
      { type: 'boost', at: 0.06, u: 0, len: 28, w: 0.5 },
      { type: 'oil', at: 0.30, u: 0.4, len: 30, w: 0.28 },
      { type: 'oil', at: 0.31, u: -0.4, len: 30, w: 0.28 },
      { type: 'oil', at: 0.72, u: 0, len: 30, w: 0.34 }
    ],
    objects: [
      { type: 'pipe', at: 0.22, u: -0.78 }, { type: 'pipe', at: 0.47, u: 0.80 },
      { type: 'pipe', at: 0.62, u: -0.76 },
      { type: 'itembox', at: 0.12, u: -0.28 }, { type: 'itembox', at: 0.12, u: 0.28 },
      { type: 'itembox', at: 0.52, u: 0 },
      { type: 'coin', at: 0.38, u: 0.2, count: 6 },
      { type: 'coin', at: 0.86, u: -0.22, count: 6 }
    ]
  });

  C({
    id: 'mc3', name: 'MARIO CIRCUIT 3', theme: 'circuit', width: 52,
    notes: 'The long one: a sprawling loop that doubles back on itself twice.',
    corners: [[512,140,100],[860,340,92],[820,624,72],[880,820,58],[600,886,80],[420,760,44],[560,640,40],[300,560,44],[178,700,50],[140,420,92]],
    startAt: 0.04,
    patches: [
      { type: 'boost', at: 0.04, u: 0, len: 28, w: 0.5 },
      { type: 'boost', at: 0.53, u: 0, len: 28, w: 0.45 },
      { type: 'oil', at: 0.24, u: -0.38, len: 28, w: 0.26 },
      { type: 'oil', at: 0.44, u: 0.42, len: 28, w: 0.26 },
      { type: 'oil', at: 0.79, u: 0, len: 28, w: 0.3 }
    ],
    objects: [
      { type: 'pipe', at: 0.18, u: 0.78 }, { type: 'pipe', at: 0.35, u: -0.8 },
      { type: 'pipe', at: 0.58, u: 0.78 }, { type: 'pipe', at: 0.86, u: -0.78 },
      { type: 'itembox', at: 0.1, u: -0.3 }, { type: 'itembox', at: 0.1, u: 0.3 },
      { type: 'itembox', at: 0.66, u: -0.25 }, { type: 'itembox', at: 0.66, u: 0.25 },
      { type: 'coin', at: 0.3, u: 0, count: 8 }, { type: 'coin', at: 0.72, u: 0.2, count: 6 }
    ]
  });

  C({
    id: 'mc4', name: 'MARIO CIRCUIT 4', theme: 'circuit', width: 48,
    notes: 'Technical and narrow, with a switchback pair you have to slide.',
    corners: [[220,842,56],[760,872,66],[886,642,54],[700,520,42],[880,400,44],[720,300,40],[556,382,38],[400,280,40],[240,362,46],[150,620,62]],
    startAt: 0.04,
    widthProfile: [[0.0, 54], [0.2, 42], [0.5, 46], [0.75, 42], [0.9, 52]],
    patches: [
      { type: 'boost', at: 0.03, u: 0, len: 26, w: 0.55 },
      { type: 'oil', at: 0.17, u: 0, len: 26, w: 0.34 },
      { type: 'oil', at: 0.41, u: -0.45, len: 26, w: 0.26 },
      { type: 'oil', at: 0.64, u: 0.45, len: 26, w: 0.26 },
      { type: 'oil', at: 0.88, u: 0, len: 26, w: 0.3 }
    ],
    objects: [
      { type: 'pipe', at: 0.25, u: -0.82 }, { type: 'pipe', at: 0.3, u: 0.82 },
      { type: 'pipe', at: 0.55, u: -0.8 }, { type: 'pipe', at: 0.8, u: 0.8 },
      { type: 'itembox', at: 0.09, u: -0.26 }, { type: 'itembox', at: 0.09, u: 0.26 },
      { type: 'itembox', at: 0.48, u: 0 }, { type: 'itembox', at: 0.71, u: 0 },
      { type: 'coin', at: 0.35, u: 0.2, count: 6 }, { type: 'coin', at: 0.6, u: -0.2, count: 6 }
    ]
  });

  /* ================= DONUT PLAINS ================= */

  C({
    id: 'dp1', name: 'DONUT PLAINS 1', theme: 'plains', width: 58,
    notes: 'A ring round the pond, with moles working the apex of turn two.',
    corners: [[512,150,120],[820,300,130],[880,640,130],[600,876,130],[260,830,120],[130,500,125],[280,220,120]],
    startAt: 0.06,
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 30, w: 0.5 },
      { type: 'mud', at: 0.30, u: -0.55, len: 46, w: 0.36 },
      { type: 'mud', at: 0.68, u: 0.55, len: 46, w: 0.36 },
      { type: 'jump', at: 0.50, u: 0, len: 22, w: 0.75 }
    ],
    objects: [
      { type: 'mole', at: 0.22, u: -0.3 }, { type: 'mole', at: 0.24, u: 0.35 },
      { type: 'mole', at: 0.58, u: 0 }, { type: 'mole', at: 0.82, u: -0.32 },
      { type: 'itembox', at: 0.13, u: -0.3 }, { type: 'itembox', at: 0.13, u: 0 },
      { type: 'itembox', at: 0.13, u: 0.3 },
      { type: 'coin', at: 0.4, u: 0.2, count: 6 }, { type: 'coin', at: 0.9, u: -0.2, count: 6 }
    ]
  });

  C({
    id: 'dp2', name: 'DONUT PLAINS 2', theme: 'plains', width: 54,
    notes: 'Hourglass: two big loops joined by a pinch you take flat out.',
    corners: [[240,830,70],[620,880,90],[860,740,80],[700,560,58],[520,500,52],[760,400,70],[880,240,80],[600,145,85],[300,175,80],[150,340,75],[330,470,52],[180,620,65]],
    startAt: 0.05,
    widthProfile: [[0.0, 58], [0.32, 44], [0.5, 46], [0.82, 44], [0.95, 56]],
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 28, w: 0.5 },
      { type: 'boost', at: 0.36, u: 0, len: 24, w: 0.5 },
      { type: 'mud', at: 0.18, u: 0.5, len: 40, w: 0.34 },
      { type: 'mud', at: 0.6, u: -0.5, len: 40, w: 0.34 },
      { type: 'jump', at: 0.75, u: 0, len: 22, w: 0.8 }
    ],
    objects: [
      { type: 'mole', at: 0.28, u: 0.3 }, { type: 'mole', at: 0.45, u: -0.3 },
      { type: 'mole', at: 0.68, u: 0.3 },
      { type: 'itembox', at: 0.11, u: -0.28 }, { type: 'itembox', at: 0.11, u: 0.28 },
      { type: 'itembox', at: 0.55, u: 0 },
      { type: 'coin', at: 0.24, u: 0, count: 6 }, { type: 'coin', at: 0.88, u: 0.2, count: 6 }
    ]
  });

  C({
    id: 'dp3', name: 'DONUT PLAINS 3', theme: 'plains', width: 50,
    notes: 'The biggest meadow: mud on both apexes and two jumps a lap.',
    corners: [[512,150,110],[840,280,80],[700,440,44],[886,560,58],[760,820,90],[420,880,90],[240,700,44],[380,560,40],[170,430,58],[280,230,80]],
    startAt: 0.04,
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 28, w: 0.5 },
      { type: 'mud', at: 0.26, u: -0.58, len: 52, w: 0.34 },
      { type: 'mud', at: 0.49, u: 0.58, len: 52, w: 0.34 },
      { type: 'mud', at: 0.77, u: -0.55, len: 44, w: 0.3 },
      { type: 'jump', at: 0.38, u: 0, len: 22, w: 0.8 },
      { type: 'jump', at: 0.66, u: 0, len: 22, w: 0.8 }
    ],
    objects: [
      { type: 'mole', at: 0.16, u: 0.3 }, { type: 'mole', at: 0.34, u: -0.3 },
      { type: 'mole', at: 0.57, u: 0.3 }, { type: 'mole', at: 0.85, u: 0 },
      { type: 'itembox', at: 0.09, u: -0.3 }, { type: 'itembox', at: 0.09, u: 0.3 },
      { type: 'itembox', at: 0.44, u: -0.25 }, { type: 'itembox', at: 0.44, u: 0.25 },
      { type: 'coin', at: 0.6, u: 0, count: 8 }, { type: 'coin', at: 0.93, u: -0.2, count: 6 }
    ]
  });

  /* ================= GHOST VALLEY ================= */

  C({
    id: 'gv1', name: 'GHOST VALLEY 1', theme: 'ghost', width: 46,
    notes: 'Boards over the abyss: square corners, no run-off, Boos about.',
    corners: [[240,830,55],[700,850,60],[860,660,55],[840,360,55],[640,180,60],[300,170,60],[150,380,55],[160,650,55]],
    startAt: 0.05,
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 26, w: 0.6 },
      { type: 'boost', at: 0.52, u: 0, len: 22, w: 0.6 }
    ],
    objects: [
      { type: 'boo', at: 0.3, u: 0 }, { type: 'boo', at: 0.7, u: 0.3 },
      { type: 'itembox', at: 0.14, u: -0.3 }, { type: 'itembox', at: 0.14, u: 0.3 },
      { type: 'coin', at: 0.42, u: 0, count: 6 }, { type: 'coin', at: 0.85, u: 0, count: 6 }
    ]
  });

  C({
    id: 'gv2', name: 'GHOST VALLEY 2', theme: 'ghost', width: 42,
    notes: 'Narrower, with a rotted section where the boards pinch to nothing.',
    corners: [[340,772,48],[830,798,48],[868,626,42],[400,586,42],[340,436,42],[830,406,42],[868,236,48],[340,196,48],[118,482,96]],
    startAt: 0.04,
    widthProfile: [[0.0, 46], [0.3, 34], [0.55, 40], [0.8, 34], [0.92, 44]],
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 24, w: 0.6 },
      { type: 'boost', at: 0.62, u: 0, len: 22, w: 0.6 }
    ],
    objects: [
      { type: 'boo', at: 0.25, u: -0.25 }, { type: 'boo', at: 0.5, u: 0.25 },
      { type: 'boo', at: 0.8, u: 0 },
      { type: 'itembox', at: 0.12, u: -0.28 }, { type: 'itembox', at: 0.12, u: 0.28 },
      { type: 'coin', at: 0.38, u: 0, count: 6 }, { type: 'coin', at: 0.72, u: 0, count: 6 }
    ]
  });

  C({
    id: 'gv3', name: 'GHOST VALLEY 3', theme: 'ghost', width: 38,
    notes: 'The mean one: a plank-width causeway and four blind right-angles.',
    corners: [[260,800,40],[560,860,42],[780,800,38],[860,620,36],[700,540,32],[820,440,34],[760,300,36],[560,220,38],[380,300,34],[420,470,30],[240,540,34],[160,680,38]],
    startAt: 0.035,
    widthProfile: [[0.0, 44], [0.22, 32], [0.45, 36], [0.66, 30], [0.88, 40]],
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 24, w: 0.65 },
      { type: 'boost', at: 0.42, u: 0, len: 20, w: 0.65 },
      { type: 'boost', at: 0.74, u: 0, len: 20, w: 0.65 }
    ],
    objects: [
      { type: 'boo', at: 0.2, u: 0 }, { type: 'boo', at: 0.4, u: -0.2 },
      { type: 'boo', at: 0.6, u: 0.2 }, { type: 'boo', at: 0.85, u: 0 },
      { type: 'itembox', at: 0.1, u: -0.25 }, { type: 'itembox', at: 0.1, u: 0.25 },
      { type: 'coin', at: 0.3, u: 0, count: 6 }, { type: 'coin', at: 0.55, u: 0, count: 6 }
    ]
  });

  /* ================= BOWSER CASTLE ================= */

  C({
    id: 'bc1', name: 'BOWSER CASTLE 1', theme: 'castle', width: 54,
    notes: 'Angular flagstone halls, lava outside the walls, Thwomps inside.',
    corners: [[250,810,38],[720,830,40],[860,660,38],[860,424,38],[640,380,34],[620,180,40],[300,165,40],[150,400,38],[160,650,38]],
    startAt: 0.05,
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 28, w: 0.5 },
      { type: 'boost', at: 0.55, u: 0, len: 24, w: 0.5 }
    ],
    objects: [
      { type: 'thwomp', at: 0.24, u: -0.35 }, { type: 'thwomp', at: 0.28, u: 0.4 },
      { type: 'thwomp', at: 0.62, u: 0 }, { type: 'thwomp', at: 0.85, u: -0.35 },
      { type: 'itembox', at: 0.12, u: -0.3 }, { type: 'itembox', at: 0.12, u: 0.3 },
      { type: 'coin', at: 0.42, u: 0, count: 6 }, { type: 'coin', at: 0.75, u: 0.2, count: 6 }
    ]
  });

  C({
    id: 'bc2', name: 'BOWSER CASTLE 2', theme: 'castle', width: 50,
    notes: 'Longer, with a lava gallery you cross on a narrow causeway.',
    corners: [[220,820,36],[700,850,38],[866,700,34],[620,600,30],[866,480,32],[700,330,36],[380,200,40],[160,420,60],[150,650,40]],
    startAt: 0.04,
    widthProfile: [[0.0, 54], [0.3, 40], [0.52, 44], [0.78, 40], [0.92, 52]],
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 26, w: 0.5 },
      { type: 'boost', at: 0.45, u: 0, len: 22, w: 0.5 },
      { type: 'boost', at: 0.80, u: 0, len: 22, w: 0.5 }
    ],
    objects: [
      { type: 'thwomp', at: 0.18, u: 0.35 }, { type: 'thwomp', at: 0.36, u: -0.35 },
      { type: 'thwomp', at: 0.58, u: 0.3 }, { type: 'thwomp', at: 0.72, u: -0.3 },
      { type: 'firebar', at: 0.5, u: 0 },
      { type: 'itembox', at: 0.1, u: -0.28 }, { type: 'itembox', at: 0.1, u: 0.28 },
      { type: 'coin', at: 0.28, u: 0, count: 6 }, { type: 'coin', at: 0.66, u: 0, count: 6 }
    ]
  });

  C({
    id: 'bc3', name: 'BOWSER CASTLE 3', theme: 'castle', width: 46,
    notes: 'The keep itself: the longest castle lap, Thwomps two at a time.',
    corners: [[200,780,34],[420,870,38],[700,880,38],[866,740,34],[800,570,30],[880,430,32],[740,300,34],[520,200,36],[300,240,32],[400,420,28],[240,480,30],[160,640,34]],
    startAt: 0.035,
    widthProfile: [[0.0, 50], [0.24, 38], [0.48, 42], [0.7, 36], [0.9, 48]],
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 26, w: 0.55 },
      { type: 'boost', at: 0.37, u: 0, len: 22, w: 0.55 },
      { type: 'boost', at: 0.68, u: 0, len: 22, w: 0.55 }
    ],
    objects: [
      { type: 'thwomp', at: 0.14, u: -0.3 }, { type: 'thwomp', at: 0.16, u: 0.34 },
      { type: 'thwomp', at: 0.42, u: 0 }, { type: 'thwomp', at: 0.56, u: -0.32 },
      { type: 'thwomp', at: 0.58, u: 0.32 }, { type: 'thwomp', at: 0.84, u: 0 },
      { type: 'firebar', at: 0.3, u: 0 }, { type: 'firebar', at: 0.75, u: 0 },
      { type: 'itembox', at: 0.08, u: -0.26 }, { type: 'itembox', at: 0.08, u: 0.26 },
      { type: 'coin', at: 0.48, u: 0, count: 6 }, { type: 'coin', at: 0.9, u: 0, count: 6 }
    ]
  });

  /* ================= KOOPA BEACH ================= */

  C({
    id: 'kb1', name: 'KOOPA BEACH 1', theme: 'beach', width: 62,
    notes: 'Wide sandbar. The shallows are a shortcut if you keep your speed.',
    corners: [[512,160,130],[830,330,135],[880,670,135],[560,876,135],[240,800,125],[130,470,130]],
    startAt: 0.07,
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 30, w: 0.45 },
      { type: 'water', at: 0.3, u: 0.72, len: 70, w: 0.3 },
      { type: 'water', at: 0.66, u: -0.72, len: 70, w: 0.3 }
    ],
    objects: [
      { type: 'cheep', at: 0.22, u: 0.5 }, { type: 'cheep', at: 0.48, u: -0.5 },
      { type: 'cheep', at: 0.78, u: 0.4 },
      { type: 'itembox', at: 0.14, u: -0.3 }, { type: 'itembox', at: 0.14, u: 0 },
      { type: 'itembox', at: 0.14, u: 0.3 },
      { type: 'coin', at: 0.4, u: 0, count: 8 }, { type: 'coin', at: 0.88, u: 0.2, count: 6 }
    ]
  });

  C({
    id: 'kb2', name: 'KOOPA BEACH 2', theme: 'beach', width: 54,
    notes: 'A smaller cay: less sand, more wading, Cheep Cheeps everywhere.',
    corners: [[480,180,90],[760,260,90],[860,500,85],[740,760,85],[440,860,85],[260,740,48],[420,620,44],[300,470,44],[160,340,70]],
    startAt: 0.05,
    widthProfile: [[0.0, 58], [0.3, 46], [0.6, 50], [0.85, 46]],
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 28, w: 0.5 },
      { type: 'water', at: 0.25, u: 0.78, len: 60, w: 0.28 },
      { type: 'water', at: 0.55, u: -0.78, len: 60, w: 0.28 },
      { type: 'water', at: 0.82, u: 0.78, len: 60, w: 0.28 }
    ],
    objects: [
      { type: 'cheep', at: 0.18, u: -0.45 }, { type: 'cheep', at: 0.38, u: 0.5 },
      { type: 'cheep', at: 0.6, u: -0.45 }, { type: 'cheep', at: 0.86, u: 0.45 },
      { type: 'itembox', at: 0.11, u: -0.28 }, { type: 'itembox', at: 0.11, u: 0.28 },
      { type: 'coin', at: 0.45, u: 0, count: 6 }, { type: 'coin', at: 0.7, u: 0, count: 6 }
    ]
  });

  /* ================= CHOCO ISLAND ================= */

  C({
    id: 'ci1', name: 'CHOCO ISLAND 1', theme: 'choco', width: 56,
    notes: 'Baked-mud oval. The puddles look harmless and are not.',
    corners: [[512,160,100],[860,420,100],[700,830,100],[300,860,95],[140,520,100],[280,230,95]],
    startAt: 0.06,
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 28, w: 0.5 },
      { type: 'mud', at: 0.22, u: 0, len: 46, w: 0.4 },
      { type: 'mud', at: 0.52, u: -0.4, len: 46, w: 0.34 },
      { type: 'mud', at: 0.78, u: 0.4, len: 46, w: 0.34 },
      { type: 'jump', at: 0.38, u: 0, len: 22, w: 0.8 }
    ],
    objects: [
      { type: 'puddle', at: 0.3, u: 0.4 }, { type: 'puddle', at: 0.65, u: -0.4 },
      { type: 'itembox', at: 0.13, u: -0.3 }, { type: 'itembox', at: 0.13, u: 0.3 },
      { type: 'coin', at: 0.45, u: 0, count: 6 }, { type: 'coin', at: 0.9, u: 0, count: 6 }
    ]
  });

  C({
    id: 'ci2', name: 'CHOCO ISLAND 2', theme: 'choco', width: 50,
    notes: 'Rougher ground, three ramps, and a mud field across the exit.',
    corners: [[200,700,55],[400,844,44],[560,700,44],[720,850,44],[880,700,55],[860,420,66],[640,200,70],[340,180,70],[150,400,66]],
    startAt: 0.04,
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 26, w: 0.5 },
      { type: 'mud', at: 0.18, u: 0.45, len: 44, w: 0.34 },
      { type: 'mud', at: 0.46, u: -0.45, len: 44, w: 0.34 },
      { type: 'mud', at: 0.72, u: 0, len: 52, w: 0.45 },
      { type: 'jump', at: 0.3, u: 0, len: 22, w: 0.8 },
      { type: 'jump', at: 0.58, u: 0, len: 22, w: 0.8 },
      { type: 'jump', at: 0.88, u: 0, len: 22, w: 0.8 }
    ],
    objects: [
      { type: 'puddle', at: 0.25, u: -0.4 }, { type: 'puddle', at: 0.55, u: 0.4 },
      { type: 'puddle', at: 0.8, u: -0.35 },
      { type: 'itembox', at: 0.1, u: -0.28 }, { type: 'itembox', at: 0.1, u: 0.28 },
      { type: 'itembox', at: 0.5, u: 0 },
      { type: 'coin', at: 0.36, u: 0, count: 6 }, { type: 'coin', at: 0.66, u: 0, count: 6 }
    ]
  });

  /* ================= VANILLA LAKE ================= */

  C({
    id: 'vl1', name: 'VANILLA LAKE 1', theme: 'vanilla', width: 54,
    notes: 'Sheet ice with holes cut in it. Grip is a suggestion.',
    corners: [[300,830,60],[720,850,64],[860,600,60],[840,340,60],[600,170,64],[340,180,64],[160,420,60],[170,680,60]],
    startAt: 0.05,
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 28, w: 0.55 },
      { type: 'boost', at: 0.5, u: 0, len: 24, w: 0.55 }
    ],
    objects: [
      { type: 'iceblock', at: 0.25, u: -0.35 }, { type: 'iceblock', at: 0.28, u: 0.4 },
      { type: 'iceblock', at: 0.6, u: 0 }, { type: 'iceblock', at: 0.82, u: -0.35 },
      { type: 'itembox', at: 0.13, u: -0.3 }, { type: 'itembox', at: 0.13, u: 0.3 },
      { type: 'coin', at: 0.42, u: 0, count: 6 }, { type: 'coin', at: 0.72, u: 0.2, count: 6 }
    ]
  });

  C({
    id: 'vl2', name: 'VANILLA LAKE 2', theme: 'vanilla', width: 48,
    notes: 'The same ice, less of it, and a chicane between two open holes.',
    corners: [[240,850,55],[680,870,58],[860,700,48],[820,520,42],[600,460,38],[760,330,42],[700,180,50],[400,160,52],[180,320,52],[160,620,55]],
    startAt: 0.04,
    widthProfile: [[0.0, 52], [0.28, 40], [0.55, 44], [0.8, 40], [0.93, 50]],
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 26, w: 0.55 },
      { type: 'boost', at: 0.44, u: 0, len: 22, w: 0.55 },
      { type: 'boost', at: 0.76, u: 0, len: 22, w: 0.55 }
    ],
    objects: [
      { type: 'iceblock', at: 0.2, u: 0.35 }, { type: 'iceblock', at: 0.38, u: -0.35 },
      { type: 'iceblock', at: 0.58, u: 0.3 }, { type: 'iceblock', at: 0.74, u: -0.3 },
      { type: 'iceblock', at: 0.9, u: 0 },
      { type: 'itembox', at: 0.1, u: -0.28 }, { type: 'itembox', at: 0.1, u: 0.28 },
      { type: 'coin', at: 0.3, u: 0, count: 6 }, { type: 'coin', at: 0.64, u: 0, count: 6 }
    ]
  });

  /* ================= RAINBOW ROAD ================= */

  C({
    id: 'rr', name: 'RAINBOW ROAD', theme: 'rainbow', width: 44,
    notes: 'A ribbon in the void. No walls, no run-off, Thwomps in the way.',
    corners: [[512,130,60],[820,280,55],[886,520,50],[700,600,40],[880,720,45],[620,880,60],[320,860,55],[140,660,50],[320,540,40],[150,380,48],[280,200,55]],
    startAt: 0.05,
    widthProfile: [[0.0, 52], [0.25, 44], [0.5, 46], [0.75, 42], [0.9, 50]],
    patches: [
      { type: 'boost', at: 0.02, u: 0, len: 26, w: 0.65 },
      { type: 'boost', at: 0.34, u: 0, len: 22, w: 0.65 },
      { type: 'boost', at: 0.62, u: 0, len: 22, w: 0.65 },
      { type: 'boost', at: 0.86, u: 0, len: 22, w: 0.65 }
    ],
    objects: [
      { type: 'thwomp', at: 0.18, u: -0.3 }, { type: 'thwomp', at: 0.2, u: 0.34 },
      { type: 'thwomp', at: 0.45, u: 0 }, { type: 'thwomp', at: 0.7, u: -0.32 },
      { type: 'thwomp', at: 0.72, u: 0.32 },
      { type: 'itembox', at: 0.1, u: -0.25 }, { type: 'itembox', at: 0.1, u: 0.25 },
      { type: 'itembox', at: 0.55, u: 0 },
      { type: 'coin', at: 0.28, u: 0, count: 6 }, { type: 'coin', at: 0.8, u: 0, count: 6 }
    ]
  });

  /* ---- cups: five courses each, as the original grouped them ---- */
  var CUPS = [
    { id: 'mushroom', name: 'MUSHROOM CUP', emblem: 'mushroom',
      courses: ['mc1', 'dp1', 'gv1', 'bc1', 'mc2'] },
    { id: 'flower', name: 'FLOWER CUP', emblem: 'flower',
      courses: ['ci1', 'gv2', 'dp2', 'bc2', 'mc3'] },
    { id: 'star', name: 'STAR CUP', emblem: 'star',
      courses: ['kb1', 'ci2', 'vl1', 'bc3', 'mc4'] },
    { id: 'special', name: 'SPECIAL CUP', emblem: 'crown',
      courses: ['dp3', 'kb2', 'gv3', 'vl2', 'rr'] }
  ];

  SMK.courses = COURSES;
  SMK.cups = CUPS;
  SMK.courseById = function (id) { return COURSES[id]; };
  SMK.allCourseIds = function () {
    var out = [];
    for (var i = 0; i < CUPS.length; i++) out = out.concat(CUPS[i].courses);
    return out;
  };

})(window.SMK);
