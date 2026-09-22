/* Plays a whole cup on autopilot and checks the flow reaches the
   trophy ceremony, reporting points, screens and frame rate.
   usage: node tools/gpflow.js <outdir> [--cup 0] [--laps 1] */
const path=require('path'), fs=require('fs');
const PW=require('/opt/node22/lib/node_modules/playwright');
function arg(n,d){const i=process.argv.indexOf('--'+n);if(i<0)return d;const v=process.argv[i+1];return (v===undefined||v.startsWith('--'))?true:v;}

(async()=>{
 const out=process.argv[2]||'.'; fs.mkdirSync(out,{recursive:true});
 const cupIdx=parseInt(arg('cup',0),10), laps=parseInt(arg('laps',1),10);
 const b=await PW.chromium.launch({args:['--no-sandbox','--mute-audio','--autoplay-policy=no-user-gesture-required']});
 const p=await (await b.newContext({viewport:{width:900,height:800}})).newPage();
 const logs=[]; p.on('pageerror',e=>logs.push(String(e&&e.stack||e)));
 p.on('console',m=>{if(m.type()==='error')logs.push('[err] '+m.text());});
 await p.goto('file://'+path.resolve('index.html')); await p.click('#bootbtn'); await p.waitForTimeout(700);

 await p.evaluate((ci)=>{
   const app=SMK.debug.app;
   app.chosen.mode='gp'; app.chosen.engine=SMK.ENGINE_CLASSES[2]; app.chosen.character='mario';
   app.startGrandPrix(SMK.cups[ci]);
 }, cupIdx);

 const trace=[]; let fpsMin=999, fpsSamples=[];
 const deadline=Date.now()+520000;
 let lastScreen='', races=0;

 while (Date.now()<deadline) {
   await p.waitForTimeout(700);
   const st=await p.evaluate((nl)=>{
     const app=SMK.debug.app, r=app.race;
     if (r && r.laps!==nl) { r.laps=nl; }
     if (r && app.screen==='race' && !r.playerAuto) SMK.debug.autopilot(true);
     return { screen:app.screen, fps:Math.round(SMK.debug.fps),
       state:r?r.state:null, t:r?+r.time.toFixed(1):null,
       lap:r?r.player.lap:null, place:r?r.player.place:null,
       raceIndex:app.gp?app.gp.raceIndex:null,
       pts:app.gp?app.gp.points.map(x=>x.points).join(','):null };
   }, laps);
   if (st.fps>0) { fpsSamples.push(st.fps); if (st.fps<fpsMin) fpsMin=st.fps; }
   if (st.screen!==lastScreen) { trace.push(st.screen+(st.raceIndex!==null?('#'+st.raceIndex):'')); lastScreen=st.screen; }

   if (st.screen==='results') { await p.keyboard.press('Enter'); races++; await p.waitForTimeout(500); }
   else if (st.screen==='standings') { await p.keyboard.press('Enter'); await p.waitForTimeout(500); }
   else if (st.screen==='ceremony') {
     await p.locator('#screen').screenshot({path:path.join(out,'60-ceremony.png')});
     trace.push('DONE');
     break;
   }
 }
 const avg = fpsSamples.length ? Math.round(fpsSamples.reduce((a,c)=>a+c,0)/fpsSamples.length) : 0;
 console.log(JSON.stringify({ trace, races, fpsAvg:avg, fpsMin, logs:logs.slice(0,8) },null,1));
 await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
