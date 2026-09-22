/* Drives the game headlessly: boots, walks the menus, plays, and
   captures screenshots + a state dump.

   usage: node tools/play.js <outdir> [--script "name"] [--seconds 12]
*/
const path = require('path');
const fs = require('fs');
const PW = require('/opt/node22/lib/node_modules/playwright');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return (v === undefined || v.startsWith('--')) ? true : v;
}

const KEY = { accel: 'KeyZ', brake: 'KeyX', drift: 'KeyC', item: 'ShiftLeft',
              start: 'Enter', back: 'Escape', left: 'ArrowLeft', right: 'ArrowRight' };

(async () => {
  const outDir = process.argv[2] || '.';
  fs.mkdirSync(outDir, { recursive: true });
  const scriptName = arg('script', 'race');
  const seconds = parseFloat(arg('seconds', 10));

  const browser = await PW.chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required',
           '--mute-audio']
  });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 800 } });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push('[' + m.type() + '] ' + m.text()); });
  page.on('pageerror', e => logs.push('[pageerror] ' + (e && e.stack ? e.stack : e)));

  await page.goto('file://' + path.resolve('index.html'), { waitUntil: 'load' });
  await page.click('#bootbtn');
  await page.waitForTimeout(900);

  const shots = [];
  async function shot(name) {
    const p = path.join(outDir, name + '.png');
    await page.locator('#screen').screenshot({ path: p });
    shots.push(p);
  }
  async function tap(k, n = 1, gap = 130) {
    for (let i = 0; i < n; i++) { await page.keyboard.press(KEY[k] || k); await page.waitForTimeout(gap); }
  }
  async function hold(k, ms) {
    await page.keyboard.down(KEY[k] || k);
    await page.waitForTimeout(ms);
    await page.keyboard.up(KEY[k] || k);
  }
  const state = () => page.evaluate(() => {
    const a = window.SMK && window.SMK.debug && window.SMK.debug.app;
    if (!a) return null;
    const r = a.race;
    return {
      screen: a.screen, fps: Math.round(window.SMK.debug.fps),
      race: r ? {
        state: r.state, time: +r.time.toFixed(2), course: r.course.id,
        lap: r.player.lap, place: r.player.place,
        speed: +r.player.speed.toFixed(1), coins: r.player.coins,
        surf: r.player.surface, x: +r.player.x.toFixed(0), y: +r.player.y.toFixed(0),
        item: r.player.item, objs: r.objects.length, projs: r.projectiles.length,
        karts: r.karts.map(k => ({ n: k.char.shortName, lap: k.lap, pl: k.place, sp: +k.speed.toFixed(0) }))
      } : null
    };
  });

  const out = { shots: [], states: [] };

  if (scriptName === 'menus') {
    await shot('01-title');
    await tap('start'); await page.waitForTimeout(300); await shot('02-mode');
    await tap('start'); await page.waitForTimeout(300); await shot('03-engine');
    await tap('start'); await page.waitForTimeout(300); await shot('04-chars');
    await tap('right', 2); await shot('05-chars-bowser');
    await tap('start'); await page.waitForTimeout(400); await shot('06-cup');
    await tap('right', 1); await shot('07-cup-flower');
    await tap('back'); await page.waitForTimeout(200);
    await tap('back'); await page.waitForTimeout(200);   // back to engine
    await tap('back'); await page.waitForTimeout(200);   // mode
    await tap('brake'); await tap('start'); await page.waitForTimeout(300); // time trial
    await tap('start'); await page.waitForTimeout(400); await shot('08-tt-chars');
    await tap('start'); await page.waitForTimeout(600); await shot('09-course');
    await tap('right', 6); await page.waitForTimeout(400); await shot('10-course-later');
    out.states.push(await state());
  } else {
    /* straight into a Grand Prix race and drive */
    await tap('start');                    // title -> mode
    await tap('start');                    // mode (GP) -> engine
    await tap('start');                    // engine (150cc) -> chars
    await tap('start');                    // chars (Mario) -> cup
    await tap('start');                    // cup (Mushroom) -> load
    await page.waitForTimeout(1800);
    await shot('20-grid');
    out.states.push(await state());

    /* countdown then drive: hold accelerate, steer with the road */
    await page.keyboard.down(KEY.accel);
    const stepMs = 420;
    const steps = Math.round(seconds * 1000 / stepMs);
    for (let i = 0; i < steps; i++) {
      /* crude autopilot: steer toward the next node from the page itself */
      const dir = await page.evaluate(() => {
        const r = window.SMK.debug.app.race;
        if (!r) return 0;
        const tr = r.track, p = r.player;
        const n = tr.nodes[(p.nodeIdx + 9) % tr.nodes.length];
        const off = n.hw * (n.lineU || 0) * 0.6;
        const ax = n.x + n.nx * off, ay = n.y + n.ny * off;
        const want = Math.atan2(ay - p.y, ax - p.x);
        const d = window.SMK.angleDelta(p.angle, want);
        return d > 0.06 ? 1 : (d < -0.06 ? -1 : 0);
      });
      if (dir === 1) { await page.keyboard.down(KEY.right); await page.keyboard.up(KEY.left); }
      else if (dir === -1) { await page.keyboard.down(KEY.left); await page.keyboard.up(KEY.right); }
      else { await page.keyboard.up(KEY.left); await page.keyboard.up(KEY.right); }
      await page.waitForTimeout(stepMs);
      if (i === 2) await shot('21-launch');
      if (i === Math.round(steps * 0.25)) await shot('22-drive');
      if (i === Math.round(steps * 0.5)) { await shot('23-mid'); out.states.push(await state()); }
      if (i === Math.round(steps * 0.75)) await shot('24-late');
    }
    await page.keyboard.up(KEY.accel);
    await page.keyboard.up(KEY.left); await page.keyboard.up(KEY.right);
    await shot('25-end');
    out.states.push(await state());
  }

  out.shots = shots;
  console.log(JSON.stringify({ states: out.states, logs: logs.slice(0, 20) }, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
