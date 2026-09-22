/* Instrumented battle bout: counts what the CPUs actually do.
   usage: node tools/battleprobe.js [--arena bt1] [--secs 60] */
const path=require('path');
const PW=require('/opt/node22/lib/node_modules/playwright');
function arg(n,d){const i=process.argv.indexOf('--'+n);if(i<0)return d;return process.argv[i+1];}
(async()=>{
  const arena=arg('arena','bt1'), secs=parseFloat(arg('secs',60));
  const b=await PW.chromium.launch({args:['--no-sandbox','--mute-audio','--autoplay-policy=no-user-gesture-required']});
  const p=await (await b.newContext({viewport:{width:640,height:560}})).newPage();
  const logs=[]; p.on('pageerror',e=>logs.push(String(e&&e.stack||e)));
  await p.goto('file://'+path.resolve('index.html')); await p.click('#bootbtn'); await p.waitForTimeout(600);
  await p.evaluate((a)=>{
    const app=SMK.debug.app;
    app.race=new SMK.Race({mode:'battle',battle:true,courseId:a,characterId:'mario',engine:SMK.ENGINE_CLASSES[2]});
    app.screen='race'; app.race.setState('racing');
    const r=app.race;
    window.PROBE={collect:0,fire:0,proj:0,pop:0,hitKart:0,aimed:0,frames:0,sumDist:0,withItem:0};
    const P=window.PROBE;
    const op=r.popBalloon.bind(r); r.popBalloon=function(k){P.pop++;return op(k);};
    if (r.fireItem) { const of=r.fireItem.bind(r); r.fireItem=function(k,i){P.fire++;return of(k,i);}; }
    const oa=r.addProjectile? r.addProjectile.bind(r):null;
    if (oa) r.addProjectile=function(){P.proj++;return oa.apply(r,arguments);};
    const ou=r.update.bind(r);
    r.update=function(dt){
      P.frames++;
      for (const k of r.karts) { if (k.item) P.withItem++; }
      return ou(dt);
    };
    SMK.debug.autopilot(true);
  }, arena);
  await p.waitForTimeout(secs*1000);
  const out=await p.evaluate(()=>{
    const r=SMK.debug.app.race, P=window.PROBE;
    return {probe:P, balloons:r.karts.map(k=>k.balloons), items:r.karts.map(k=>k.item),
      projectiles:r.projectiles.length, objs:r.objects.length,
      boxesActive:r.objects.filter(o=>o.art.kind==='itembox'&&o.active).length,
      t:Math.round(r.time)};
  });
  console.log(JSON.stringify({arena,out,logs:logs.slice(0,4)},null,1));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
