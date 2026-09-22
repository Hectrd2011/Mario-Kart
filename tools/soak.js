/* Runs whole races on autopilot and reports whether the flow completes.
   usage: node tools/soak.js <outdir> [--course mc1] [--laps 2] [--timeout 200]
*/
const path = require('path'), fs = require('fs');
const PW = require('/opt/node22/lib/node_modules/playwright');
function arg(n, d) { const i = process.argv.indexOf('--' + n); if (i < 0) return d; const v = process.argv[i+1]; return (v===undefined||v.startsWith('--'))?true:v; }

(async () => {
  const outDir = process.argv[2] || '.';
  fs.mkdirSync(outDir, { recursive: true });
  const courses = String(arg('course', 'mc1')).split(',');
  const laps = parseInt(arg('laps', 2), 10);
  const timeout = parseFloat(arg('timeout', 240));

  const browser = await PW.chromium.launch({ args: ['--no-sandbox','--mute-audio','--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 800 } });
  const page = await ctx.newPage();
  const logs = [];
  page.on('pageerror', e => logs.push('[pageerror] ' + (e && e.stack ? e.stack : e)));
  page.on('console', m => { if (m.type() === 'error') logs.push('[err] ' + m.text()); });

  const solo = !!arg('solo', false);
  await page.goto('file://' + path.resolve('index.html'), { waitUntil: 'load' });
  await page.addInitScript(() => { });
  await page.click('#bootbtn');
  await page.waitForTimeout(700);

  const report = [];
  for (const courseId of courses) {
    /* build the race directly, with a short lap count so soaks are quick */
    await page.evaluate((v) => { window.__SOAK_SOLO = v; }, solo);
    await page.evaluate(([cid, nl]) => {
      const app = SMK.debug.app;
      app.chosen.mode = 'vs';
      app.chosen.engine = SMK.ENGINE_CLASSES[2];
      app.chosen.character = 'mario';
      app.race = new SMK.Race({ mode: window.__SOAK_SOLO ? 'tt' : 'vs',
                                courseId: cid, characterId: 'mario',
                                engine: SMK.ENGINE_CLASSES[2], laps: nl });
      app.screen = 'race';
      SMK.debug.autopilot(true);
    }, [courseId, laps]);

    const t0 = Date.now();
    let last = null, done = false, stalled = 0;
    while ((Date.now() - t0) / 1000 < timeout) {
      await page.waitForTimeout(500);
      const st = await page.evaluate(() => {
        const a = SMK.debug.app, r = a.race;
        if (!r) return { screen: a.screen };
        return { screen: a.screen, state: r.state, t: +r.time.toFixed(1),
          lapTimes: r.player.lapTimes.map(x => +x.toFixed(2)),
          lap: r.player.lap, place: r.player.place, prog: Math.round(r.player.progress),
          spd: Math.round(r.player.speed), coins: r.player.coins,
          finished: r.karts.filter(k => k.finished).length,
          maxSpd: Math.round(Math.max.apply(null, r.karts.map(k => k.speed))),
          offroad: r.karts.filter(k => k.surface === 2 || k.surface === 3).length,
          fell: r.karts.filter(k => k.fallTime > 0 || k.respawnTime > 0).length };
      });
      if (last && st.prog === last.prog && st.state === 'racing') stalled++;
      else stalled = 0;
      last = st;
      if (st.screen === 'results' || st.state === 'results') { done = true; break; }
      if (stalled > 14) break;
    }
    await page.locator('#screen').screenshot({ path: path.join(outDir, 'soak-' + courseId + '.png') });
    report.push({ course: courseId, done, stalled, last, secs: +((Date.now()-t0)/1000).toFixed(1) });
    /* back to a clean slate for the next course */
    await page.evaluate(() => { SMK.debug.app.race = null; SMK.debug.app.screen = 'title'; });
    await page.waitForTimeout(200);
  }

  console.log(JSON.stringify({ report, logs: logs.slice(0, 12) }, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
