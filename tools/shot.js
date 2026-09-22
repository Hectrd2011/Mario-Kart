/* Headless screenshot driver.
   usage: node tools/shot.js <page> <out.png> [--w 1200] [--h 900]
                             [--wait 600] [--eval "js"] [--clip x,y,w,h]
                             [--scale 1] [--full]
*/
const path = require('path');
const PW = require('/opt/node22/lib/node_modules/playwright');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return (v === undefined || v.startsWith('--')) ? true : v;
}

(async () => {
  const page0 = process.argv[2];
  const out = process.argv[3] || 'shot.png';
  if (!page0) { console.error('need a page'); process.exit(1); }

  const url = page0.startsWith('http') ? page0 : 'file://' + path.resolve(page0);
  const W = parseInt(arg('w', 1024), 10);
  const H = parseInt(arg('h', 768), 10);
  const wait = parseInt(arg('wait', 700), 10);
  const scale = parseFloat(arg('scale', 1));

  const browser = await PW.chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=' + scale,
           '--autoplay-policy=no-user-gesture-required']
  });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: scale
  });
  const page = await ctx.newPage();

  const logs = [];
  page.on('console', m => logs.push('[' + m.type() + '] ' + m.text()));
  page.on('pageerror', e => logs.push('[pageerror] ' + (e && e.stack ? e.stack : e)));

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  } catch (e) {
    logs.push('[goto] ' + e.message);
  }

  const ev = arg('eval', null);
  if (ev && typeof ev === 'string') {
    try {
      const r = await page.evaluate(new Function(ev));
      if (r !== undefined) logs.push('[eval] ' + JSON.stringify(r));
    } catch (e) { logs.push('[evalerr] ' + e.message); }
  }

  await page.waitForTimeout(wait);

  const opts = { path: out };
  if (arg('full', false)) opts.fullPage = true;
  const clip = arg('clip', null);
  if (clip && typeof clip === 'string') {
    const [x, y, w, h] = clip.split(',').map(Number);
    opts.clip = { x, y, width: w, height: h };
  }
  await page.screenshot(opts);

  if (logs.length) console.log(logs.join('\n'));
  console.log('wrote ' + out);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
