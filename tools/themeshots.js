/* One in-race screenshot per course, to eyeball every theme.
   usage: node tools/themeshots.js <outdir> --courses mc1,gv1,bc1,... [--drive 6] */
const path=require('path'), fs=require('fs');
const PW=require('/opt/node22/lib/node_modules/playwright');
function arg(n,d){const i=process.argv.indexOf('--'+n);if(i<0)return d;const v=process.argv[i+1];return (v===undefined||v.startsWith('--'))?true:v;}
(async()=>{
  const out=process.argv[2]||'.'; fs.mkdirSync(out,{recursive:true});
  const list=String(arg('courses','mc1')).split(',');
  const drive=parseFloat(arg('drive',6));
  const b=await PW.chromium.launch({args:['--no-sandbox','--mute-audio','--autoplay-policy=no-user-gesture-required']});
  const p=await (await b.newContext({viewport:{width:900,height:800}})).newPage();
  const logs=[]; p.on('pageerror',e=>logs.push(String(e&&e.stack||e)));
  await p.goto('file://'+path.resolve('index.html')); await p.click('#bootbtn'); await p.waitForTimeout(700);
  for (const cid of list) {
    await p.evaluate((c)=>{
      const app=SMK.debug.app;
      app.chosen.engine=SMK.ENGINE_CLASSES[2]; app.chosen.character='mario'; app.chosen.mode='vs';
      app.race=new SMK.Race({mode:'vs',courseId:c,characterId:'mario',engine:SMK.ENGINE_CLASSES[2],laps:5});
      app.screen='race';
      app.race.setState('racing'); app.race.lakituBoard=null;
      SMK.debug.autopilot(true);
    }, cid);
    await p.waitForTimeout(drive*1000);
    await p.locator('#screen').screenshot({path: path.join(out, cid+'.png')});
  }
  console.log(JSON.stringify({done:list.length, logs:logs.slice(0,6)}));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
