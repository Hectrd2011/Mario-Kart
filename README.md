# Super Kart Grand Prix

A from-scratch, fully playable Mode 7 kart racer for the browser — no engine, no
build step, no dependencies. Open `index.html` and drive.

Work in progress; see `docs/DESIGN.md` for how the renderer and art pipeline fit
together.

## Running it

```
open index.html          # or: npx http-server . && open http://localhost:8080
```

## Controls

| | |
|---|---|
| Arrow keys | steer |
| Z | accelerate |
| X | brake / reverse |
| C | hop, hold to power-slide |
| Shift | use item |
| Enter | start / confirm |
| F | fullscreen · H HD Mode 7 · M mute |

A gamepad is picked up automatically if one is connected.

## About the art

Every pixel is generated at boot by code in `js/art_*.js` — there are no image
files in this repository. Karts and drivers are modelled as a handful of boxes
and ellipsoids, projected through a fixed 23-degree camera, flat-shaded into
three-tone palettes and given a hard black key line; tracks are rasterised from
splines into 1024x1024 Mode 7 textures. Colours are snapped to the SNES'
5-bit-per-channel lattice, which is most of why the result reads as a 16-bit
console game.

The look is an original recreation in the style of the 16-bit kart racers, built
from reference study of the genre. It ships no assets from any commercial game.
