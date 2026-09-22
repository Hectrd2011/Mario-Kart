/* Functional checks that are hard to see in a screenshot: does the
   power-slide engage and pay out, do items fire, is music scheduling,
   do the display toggles take effect, and does anything throw.
   usage: node tools/verify.js */
const path=require('path');
const PW=require('/opt/node22/lib/node_modules/playwright');

(async()=>{
 const b=await PW.chromium.launch({args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const p=await (await b.newContext({viewport:{width:900,height:800}})).newPage();
 const logs=[]; p.on('pageerror',e=>logs.push(String(e&&e.stack||e)));
 p.on('console',m=>{if(m.type()==='error')logs.push('[err] '+m.text());});
 await p.goto('file://'+path.resolve('index.html'));
 await p.click('#bootbtn'); await p.waitForTimeout(800);

 const results = {};

 // ---- audio: count how many nodes the engine actually creates ----
 await p.evaluate(()=>{
   const ctx = (function findCtx(){
     // the engine keeps its context private; instrument the constructors instead
     return null;
   })();
   window.__osc = 0;
   const AC = window.AudioContext.prototype;
   const origOsc = AC.createOscillator;
   AC.createOscillator = function(){ window.__osc++; return origOsc.apply(this, arguments); };
 });
 await p.evaluate(()=>{ SMK.audio.resume(); SMK.audio.playMusic('circuit'); });
 await p.waitForTimeout(2500);
 results.audio = await p.evaluate(()=>({
   ready: SMK.audio.ready, muted: SMK.audio.muted,
   playing: SMK.audio.musicName(), oscillators: window.__osc,
   songs: SMK.audio.songNames().length
 }));

 // ---- start a race we control directly ----
 await p.evaluate(()=>{
   const app=SMK.debug.app;
   app.chosen.mode='vs'; app.chosen.engine=SMK.ENGINE_CLASSES[2]; app.chosen.character='mario';
   app.race=new SMK.Race({mode:'tt',courseId:'mc1',characterId:'mario',engine:SMK.ENGINE_CLASSES[2],laps:5});
   app.screen='race'; app.race.setState('racing'); app.race.lakituBoard=null;
   // sample the player every frame so we can judge a run, not one instant
   window.__t=[];
   const orig=app.race.update.bind(app.race);
   app.race.update=function(dt){
     const k=this.player, c=this.playerControls||{};
     window.__t.push({spd:k.speed, surf:k.surface, drift:k.drifting,
                      boost:k.boostTime, item:k.item, itemPressed:!!c.item,
                      projs:this.projectiles.length});
     if (window.__t.length>1200) window.__t.shift();
     return orig(dt);
   };
 });

 // ---- top speed: let the AI drive so the kart stays on the road ----
 await p.evaluate(()=>{ SMK.debug.autopilot(true); window.__t.length=0; });
 await p.waitForTimeout(9000);
 results.topSpeed = await p.evaluate(()=>{
   const r=SMK.debug.app.race, k=r.player;
   const t=window.__t;
   const onRoad=t.filter(s=>s.surf===1||s.surf===11||s.surf===5);
   const max=Math.max.apply(null, t.map(s=>s.spd));
   return { statedTop:+k.topSpeed(r).toFixed(1), maxReached:+max.toFixed(1),
            ratio:+(max/k.topSpeed(r)).toFixed(3),
            onRoadPct:+(100*onRoad.length/t.length).toFixed(0),
            samples:t.length };
 });

 // ---- power-slide: hand control back and hold a slide on the road ----
 await p.evaluate(()=>{
   const r=SMK.debug.app.race;
   r.playerAuto=false;
   // park the kart on a straight, up to speed, pointing down it
   const n=r.track.nodes[Math.round(r.track.nodes.length*0.12)];
   r.player.x=n.x; r.player.y=n.y; r.player.angle=Math.atan2(n.ty,n.tx);
   const sp=110; r.player.vx=Math.cos(r.player.angle)*sp; r.player.vy=Math.sin(r.player.angle)*sp;
   r.player.speed=sp; r.player.drifting=false; r.player.driftTime=0; r.player.boostTime=0;
   r.snapCamera(); window.__t.length=0;
 });
 await p.keyboard.down('KeyZ');
 await p.keyboard.down('ArrowRight');
 await p.keyboard.down('KeyC');
 await p.waitForTimeout(1500);
 const held = await p.evaluate(()=>{
   const k=SMK.debug.app.race.player, t=window.__t;
   return { engaged:t.some(s=>s.drift), driftFrames:t.filter(s=>s.drift).length,
            driftTime:+k.driftTime.toFixed(2), slip:+k.slip.toFixed(1),
            onRoad:t.filter(s=>s.surf===1||s.surf===11).length };
 });
 await p.keyboard.up('KeyC');
 await p.waitForTimeout(200);
 const after = await p.evaluate(()=>{
   const t=window.__t;
   return { miniTurbo:+Math.max.apply(null,t.map(s=>s.boost)).toFixed(2),
            drifting:SMK.debug.app.race.player.drifting };
 });
 await p.keyboard.up('ArrowRight');
 results.drift = { engaged:held.engaged, driftFrames:held.driftFrames,
                   slip:held.slip, miniTurbo:after.miniTurbo, stillDrifting:after.drifting };

 // ---- items: watch the transition, not the end state ----
 await p.evaluate(()=>{ const k=SMK.debug.app.race.player; k.item='greenShell'; k.itemCount=1; k.rollTime=0; window.__t.length=0; });
 await p.keyboard.press('ShiftLeft');
 await p.waitForTimeout(400);
 results.item = await p.evaluate(()=>{
   const r=SMK.debug.app.race, t=window.__t;
   const pressed=t.findIndex(s=>s.itemPressed);
   const had=t.slice(0,Math.max(1,pressed+1)).some(s=>s.item==='greenShell');
   const cleared=t.slice(pressed+1).some(s=>s.item===null);
   return { pressSeen:pressed>=0, heldBefore:had, clearedAfter:cleared,
            shellsFired:r.projectiles.filter(x=>x.type==='greenShell').length };
 });

 // ---- coins raise top speed ----
 results.coins = await p.evaluate(()=>{
   const r=SMK.debug.app.race, k=r.player;
   const before=k.topSpeed(r); k.coins=10; const after=k.topSpeed(r); k.coins=0;
   return { before:+before.toFixed(1), withTen:+after.toFixed(1), gain:+((after/before-1)*100).toFixed(1) };
 });

 // ---- display toggles ----
 results.toggles = await p.evaluate(()=>{
   const app=SMK.debug.app, r=app.race;
   const out={};
   r.layout='wide'; r.updateCamera(0.016); out.wideH=r.viewport().h;
   r.layout='classic'; r.updateCamera(0.016); out.classicH=r.viewport().h;
   r.hd=true; out.hdOn=r.m7.supersample===false;  // set on next updateCamera
   r.updateCamera(0.016); out.hdApplied=r.m7.supersample;
   r.hd=false; r.updateCamera(0.016); out.hdOff=r.m7.supersample;
   return out;
 });

 await p.keyboard.up('KeyZ');

 // ---- render a frame at each theme without throwing ----
 results.themes = await p.evaluate(()=>{
   const app=SMK.debug.app;
   const ids=['mc1','dp1','gv1','bc1','kb1','ci1','vl1','rr'];
   const ok=[];
   for (const id of ids) {
     try {
       app.race=new SMK.Race({mode:'vs',courseId:id,characterId:'mario',engine:SMK.ENGINE_CLASSES[2],laps:5});
       app.race.setState('racing');
       app.race.update(0.016);
       app.race.render(SMK.debug.frame, 256, 224);
       SMK.hud.draw(SMK.debug.frame, 256, 224, app.race);
       ok.push(id);
     } catch(e) { ok.push(id+':FAIL:'+e.message); }
   }
   return ok;
 });

 results.logs = logs.slice(0,10);
 console.log(JSON.stringify(results,null,1));
 await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
