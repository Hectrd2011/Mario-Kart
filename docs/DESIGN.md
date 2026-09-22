# Design notes

How the pieces fit together, and — since this is an original recreation
rather than a port — exactly where it follows the 16-bit source material
and where it deliberately doesn't.

## Shape of the thing

No engine, no build step, no dependencies, no image files. `index.html`
loads twenty classic `<script>` tags in order (deliberately classic, not
ES modules, so opening the file straight off disk works) and every pixel
the game shows is generated in JavaScript at boot.

```
js/util.js         maths, deterministic RNG, value noise, clock format
js/palette.js      colour, and the 5-bit-per-channel lattice everything snaps to
js/pixel.js        whole-pixel rasteriser: lines, ellipses, polygon fill,
                   ASCII sprite maps, outline/tint/trim passes
js/font.js         5x7 bitmap face with key-line, shadow, upscale, shear
js/characters.js   the eight-driver roster, stats and CPU special items
js/art_kart.js     kart + driver sprite sheets (16 headings x 3 steering poses)
js/art_objects.js  track props, pickups, item icons, particles, Lakitu
js/art_ui.js       software blitter, text cache, HUD chrome, title logo
js/themes.js       the eight course families: surfaces, palettes, horizons
js/trackgen.js     spline -> Mode 7 texture, surface map, mips, nodes, map
js/courses.js      twenty courses in four cups
js/arenas.js       four Battle arenas and the builder that bakes them
js/mode7.js        the per-scanline ground plane
js/audio.js        four-voice chiptune engine and the sound effects
js/input.js        keyboard + gamepad, normalised to one action set
js/touch.js        on-screen controls for phones and tablets
js/items.js        roulette, projectiles, effects
js/physics.js      kart handling, surfaces, collision, lap bookkeeping
js/ai.js           the seven CPU racers
js/race.js         one race: field, camera, props, sprite compositing, flow
js/hud.js          item window, coins, position, course map, running order
js/menus.js        every screen that isn't a race
js/main.js         canvas, main loop, app state machine
```

## Rendering

Everything composites into a single `Uint32Array` of packed ABGR and
reaches the canvas through one `putImageData` per frame. Nothing goes
through `drawImage`, so no GPU filtering can soften a pixel the console
would have shown hard — sprite scaling is honest nearest-neighbour.

**Mode 7.** The hardware took one background layer and applied a
different affine transform per scanline. `mode7.js` does the same: walk
down the screen, work out how far ahead that row lands on the ground,
step across it sampling a 1024x1024 track texture. Colour 0 in the
texture means "no ground here", which is how Ghost Valley and Rainbow
Road float in the void, and there is a per-scanline horizontal warp hook
for the HDMA tricks the original used for heat shimmer and Rainbow
Road's sway.

**Colour.** Every colour in the game passes through `snes5()` and lands
on the 5-bit-per-channel lattice (32 levels per channel, BGR555). That
single constraint is most of why the result reads as a 16-bit console
game rather than modern art with a pixel filter over it.

**Karts.** Hand-drawing 8 drivers x 16 headings x 3 steering poses is
roughly 400 frames. Instead each kart is a handful of tapered boxes
projected through a fixed 23-degree camera, flat-shaded into a
three-tone palette and given a hard black key line. Driver heads are
shaded ellipsoids: for each pixel we solve for the near surface point,
rotate it back into head-local space and ask a per-character region
function what lives there. Occlusion is therefore exact at every
heading — the back of a head shows hair, not face — and features vanish
at the limb instead of sliding off the silhouette the way stacked
billboards do.

**Tracks.** A course is a ring of `[x, y, radius]` corners joined by
straights; `fromCorners` turns that into Catmull-Rom control points.
Authoring control points directly gives you a potato, not a circuit —
the corner list is what produces a pit straight, a hard 90 and a
chicane. Radius encodes a corner's character: tight for Bowser Castle,
wide open for Mario Circuit.

The road is then stamped by walking the centreline in its own (along,
across) parameter space rather than by scan-converting polygons. That
visits almost exactly the texels the road covers, and hands every theme
a clean `(t, u)` pair — which is what lets kerbs stripe, planks run
across the boards and Rainbow Road band correctly.

## Faithful to the original

- 256x224 internal resolution, integer-upscaled.
- Single-player screen is split: road on the top half, course map on the
  bottom. The original never gave one player the whole screen, and the
  short viewport is a large part of why it looks the way it does.
- Five laps. Four cups of five courses — the only game in the series
  with five per cup rather than four.
- Points to the top four only: 9, 6, 3, 1.
- Coins raise your top speed and you shed them when you are hit.
- Three weight classes, and the original's four pairings: the plumbers
  as the balanced yardstick, princess/dino trading top speed for
  acceleration, shell/mushroom as the best cornerers, and the two
  heavies with the highest top speed and sluggish pickup.
- Each CPU racer draws only its own character's item, and three of those
  items stay CPU-only: the poison mushroom, Yoshi's egg, Bowser's
  fireball spread.
- Item odds weighted by position: junk for the leader, rescues for the
  back of the grid.
- Item panels and coins lie flat on the road rather than floating, so
  they are drawn pre-squashed to the camera's elevation.
- Lakitu runs the starting lights, holds up the lap boards, waves the
  chequered flag, shows the wrong-way sign and fishes you out of the
  void.
- You start at the back of the grid for the opening race of a cup, and
  from the championship standings after that.
- Time Trial hands you three mushrooms.
- The music lifts in tempo on the final lap.

## Deliberate departures

Each of these is a judgement call, not an oversight.

- **Mini-turbo.** Holding a long clean power-slide pays out a short
  burst of speed. The original gave you nothing for it; mini-turbos
  arrived a generation later. Without some payoff the slide is only ever
  a way to lose time and the cornering stops being fun, so it is in —
  small, and gated on actually holding the slide.
- **Mip pyramid on the track texture.** Point-sampling a 1024px texture
  at the horizon shimmers violently. The console lived with it; here the
  mip level comes from the texel-per-pixel ratio, which keeps the
  distance readable without softening the near road.
- **Optional 2x supersampling** ("HD Mode 7", the `H` key). Off by
  default so the authentic look is the default.
- **Optional wide layout** (the `V` key) — full-screen road with a
  corner map, for people who would rather have the view than the
  reference.
- **Rubber-banding is capped.** The original's CPUs were famous for it.
  Here it is bounded to roughly +/-10% so a good lap still earns a gap
  and a bad one still costs you.
- **Course geometry is an original recreation.** The layouts are tuned
  to each course's personality — length, corner count, width, how much
  run-off, where the hazards bite — rather than traced from the
  cartridge's tilemaps. Each entry in `courses.js` carries a `notes`
  line recording the intent. Reference material for this project was
  descriptive (documentation and reference study of the genre); no
  assets, tile data or code from any commercial game are used or
  redistributed here.
- **Battle mode is an adaptation.** The original's was two-player only.
  Here it is you against three CPUs across four arenas, three balloons
  each. Arenas skip the spline track generator entirely — `arenas.js`
  rasterises a floor, wall ring, interior blocks and pits straight into
  the same texture/surface/mip structure everything downstream expects.
  In an arena every racer draws from the item boxes rather than carrying
  their character's special, because half of those specials target "the
  kart ahead" and in an arena there is no ahead.
- **On-screen controls** appear on touch devices, and below 2x the
  canvas takes a fractional scale rather than the integer one — on a
  phone the nearest integer is 1x, which wastes most of the screen.

## Headless harnesses

`tools/` drives the real game in Chromium, which is how the art and the
handling were tuned:

```
node tools/shot.js <page> <out.png> [--w --h --full --wait --eval]
node tools/play.js <outdir> --script menus|race [--seconds N]
node tools/soak.js <outdir> --course mc1,gv2 [--laps N] [--solo]
node tools/shot.js tools/preview_sprites.html out.png --mode zoom&who=bowser
node tools/shot.js "tools/preview_track.html?mode=maps" out.png --full
```

`soak.js` hands the player's kart to the AI and reports lap times,
stalls, off-road counts, falls and page errors — that is what caught the
AI braking for every bend in sight, and the acceleration taper that
capped real top speed ten percent short.
