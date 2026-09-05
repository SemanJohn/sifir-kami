import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {stationSlots,rosterSignature} from '../dist/input.js';

const expected={
  "dist/assets/fonts/BALOO2-LICENSE.txt": "273d4bb4d30d7f7011adfa11ee858b1d70a6b1f94cae89e6fa261ed8f1b8839a",
  "dist/assets/fonts/DMSANS-LICENSE.txt": "6fbd040a29c2037a765dfb9f2561e9965b5c95c6dcb5dce516089d63d5f17af7",
  "dist/assets/fonts/baloo2-700.woff2": "8e7ffc9b993aa8caa89bcab81e103c9eb2da4e3e042f37b7a5115d0ddbff12c0",
  "dist/assets/fonts/baloo2-800.woff2": "3e36c57e37bda5b5f28cf10636d6d3aed4de5250df923f1b203b64ad857c79a7",
  "dist/assets/fonts/dmsans-400.woff2": "4ab51eb2cd7305d177187908d6397474d4520663f6c6e572feb0a64f4fa80006",
  "dist/assets/fonts/dmsans-700.woff2": "35c5efa0e5daa52ee5c6500f5be354bf751fb65c4e49e1d6806c6eb5883e8fe9",
  "dist/assets/icon-180.png": "de9ea3e5b98758bedef7080f2baf1e21348e7d5f034af351276ade3ea6198a9e",
  "dist/assets/icon-192.png": "b494d374ef3904dd8221af3d6fed19ba4610fb047e9dc14ac65fe38b529929c6",
  "dist/assets/icon-512.png": "3cab5d86b87b8545b3c2670546b6e935c3cb0526ba6a9fdedef3a1b3ca99576d",
  "dist/assets/icon-maskable-512.png": "d34d6d0f809942fbf1846656ae64198fd4e67a43596f72513a63b3a782c8df08",
  "dist/assets/station.webp": "80fbae688bb9b7c3bf119cb92bda8f06530baab5f72c8ca0ee276b228685fa42"
};
test('every shipped image and font has its complete expected bytes',()=>{
  for(const [path,sha] of Object.entries(expected)){
    const data=readFileSync(new URL('../'+path,import.meta.url));
    assert.equal(createHash('sha256').update(data).digest('hex'),sha,path+' was truncated or changed');
  }
  const data=readFileSync(new URL('../dist/assets/station.webp',import.meta.url));
  assert.equal(data.toString('ascii',0,4),'RIFF');
  assert.equal(data.readUInt32LE(4)+8,data.length,'WebP RIFF length must match the complete file');
});
test('offline precache references exist and versions agree',()=>{
  const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),sw=read('dist/sw.js');
  for(const [,path] of sw.matchAll(/['"]\.\/([^'"]+)['"]/g))assert.ok(existsSync(new URL('../dist/'+path,import.meta.url)),path);
  const {version}=JSON.parse(read('package.json'));
  assert.ok(read('dist/index.html').includes('v'+version));assert.ok(sw.includes("CACHE=PREFIX+'"+version+"'"));
});
test('3 to 8 character slots stay separated on phones tablets and landscape',()=>{
  for(const [w,h] of [[320,480],[390,610],[440,720],[740,240],[820,780],[1100,500]]){
    for(let count=3;count<=8;count++){
      const slots=stationSlots(w,h,count);assert.equal(slots.length,count);
      for(const a of slots){
        assert.ok(a.x-a.size/2>0&&a.x+a.size/2<w);
        assert.ok(a.y-a.size>0&&a.y+a.size*.5+24<h);
        for(const b of slots)if(a!==b)assert.ok(Math.abs(a.x-b.x)>(a.size+b.size)/2||Math.abs(a.y-b.y)>(a.size+b.size)*.7);
      }
    }
  }
  assert.deepEqual(stationSlots(0,0,8),[]);
});
test('hidden station sleeps once and wakes only after valid dimensions return',()=>{
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  const el={clientWidth:0,clientHeight:0},calls=[];
  const game={scale:{stopListeners:()=>calls.push('stop'),startListeners:()=>calls.push('start'),refresh:()=>calls.push('refresh')},loop:{sleep:()=>calls.push('sleep'),wake:()=>calls.push('wake')}};
  const code=app.slice(app.indexOf('function stageLive'),app.indexOf('function checkpoint'));
  const ctx={station:{game},$:()=>el,requestAnimationFrame:f=>f()};
  runInNewContext(code+';syncStage();syncStage();',ctx);
  assert.deepEqual(calls,['stop','sleep']);
  el.clientWidth=390;el.clientHeight=600;runInNewContext('syncStage()',ctx);
  assert.deepEqual(calls,['stop','sleep','start','wake','refresh']);
});
test('Boss rejects an answer after its deadline without awarding points',()=>{
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  const code=app.slice(app.indexOf('function answerBoss'),app.indexOf('function tickBoss'));
  let finished=0;const bossTask={locked:false,deadline:Date.now()-100,correct:0,question:{answer:6}};
  runInNewContext(code+';answerBoss(6)',{screen:'BOSS',bossTask,finishBoss:()=>finished++});
  assert.equal(finished,1);assert.equal(bossTask.correct,0);
});
test('PWA refuses a damaged background and retains the prior cache',async()=>{
  const source=readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8'),events={},removed=[];let activated=false;
  const context={self:{registration:{scope:'https://game.test/'},location:{origin:'https://game.test'},addEventListener:(name,fn)=>events[name]=fn,skipWaiting:()=>{activated=true;}},caches:{open:async()=>({addAll:async()=>{},match:async()=>({arrayBuffer:async()=>new ArrayBuffer(5)})}),delete:async key=>removed.push(key)},Request:class{},crypto:{subtle:{digest:async()=>new Uint8Array(32).buffer}}};
  runInNewContext(source,context);
  let promise;events.install({waitUntil:p=>promise=p});
  await assert.rejects(promise,/Incomplete station background/);
  const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  assert.equal(activated,false);assert.equal(removed.length,1);assert.ok(removed[0].endsWith(version));
});
const appSource=()=>readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const slice=(source,from,to)=>source.slice(source.indexOf(from),source.indexOf(to));

test('number keys reach the keypad even when no keypad button has focus',()=>{
  const code=slice(appSource(),'function handleTypedKey',"document.addEventListener('keydown',handleTypedKey)");
  const typed=[],boss=[];
  const run=(screen,event,curtain=null,dialog=null)=>{
    const ctx={screen,enterDigit:key=>typed.push(key),enterBossDigit:key=>boss.push(key),
      $:selector=>selector==='.safety-curtain'?curtain:selector==='dialog[open]'?dialog:null,event};
    runInNewContext(code+';handleTypedKey(event)',ctx);
  };
  const press=(key,extra={})=>({key,target:{tagName:'BODY'},preventDefault(){},...extra});
  // The question draw blurs the active element, so body is the realistic target.
  run('TASK',press('7'));run('TASK',press('Backspace'));run('TASK',press('Enter'));
  assert.deepEqual(typed,['7','⌫','✓']);
  run('BOSS',press('4'));assert.deepEqual(boss,['4']);
  // Typing in a name field, behind the safety curtain, in a dialog or on any
  // other screen must never reach the keypad.
  run('TASK',press('5',{target:{tagName:'INPUT'}}));
  run('TASK',press('5'),{});
  run('TASK',press('5'),null,{});
  run('LOBBY',press('5'));
  run('TASK',press('5',{repeat:true}));
  run('TASK',press('5',{ctrlKey:true}));
  run('TASK',press('a'));
  assert.deepEqual(typed,['7','⌫','✓']);
});
test('the turn clock stops once all three questions are answered',()=>{
  const source=appSource();
  const pill={textContent:'3s',classList:{remove(){this.removed=true;}},setAttribute(){}},fill={style:{width:'12%'}};
  const task={done:false,deadline:Date.now()+3000,duration:25};
  const ctx={clock:7,task,clearInterval(id){ctx.cleared=id;},
    $:selector=>selector==='#task-timer'?pill:selector==='#time-fill'?fill:null};
  runInNewContext(slice(source,'function freezeTaskTimer','function neutralTask')+';freezeTaskTimer()',ctx);
  assert.equal(ctx.cleared,7);assert.equal(ctx.clock,null);
  assert.equal(task.deadline,Infinity);assert.equal(pill.textContent,'✓');assert.equal(fill.style.width,'100%');
  // A frozen turn must not be force-ended by a stale tick, whatever the role.
  let finished=0;
  const tick={screen:'TASK',task:{done:true,deadline:Date.now()-1000,duration:25},game:{config:{timerOff:false}},
    finishTask:()=>finished++,$:()=>{throw new Error('the frozen timer must not be redrawn');}};
  runInNewContext(slice(source,'function tickTask','function logCurrentAnswer')+';tickTask()',tick);
  assert.equal(finished,0);
});
test('stage reactions are skipped while the station is hidden on phones',()=>{
  const code=slice(appSource(),'function stageLive','function checkpoint');
  const el={clientWidth:0,clientHeight:0},played=[];
  const scene={ready:true,celebrate:()=>played.push('celebrate')};
  const ctx={station:{scene,game:null},$:()=>el,requestAnimationFrame:()=>{}};
  runInNewContext(code+';stageEffect(s=>s.celebrate())',ctx);
  assert.deepEqual(played,[]);
  el.clientWidth=360;el.clientHeight=400;
  runInNewContext(code+';stageEffect(s=>s.celebrate())',ctx);
  assert.deepEqual(played,['celebrate']);
});
test('the crew layout is rebuilt only when the stage or roster really changes',()=>{
  const crew=[{id:0,name:'Ali',characterId:2,alive:true},{id:1,name:'Bea',characterId:5,alive:true}];
  const base=rosterSignature(390,600,false,crew);
  assert.equal(base,rosterSignature(390,600,false,crew.map(p=>({...p}))));
  assert.notEqual(base,rosterSignature(391,600,false,crew));
  assert.notEqual(base,rosterSignature(390,600,true,crew));
  assert.notEqual(base,rosterSignature(390,600,false,[{...crew[0],name:'Ali B'},crew[1]]));
  assert.notEqual(base,rosterSignature(390,600,false,[{...crew[0],characterId:3},crew[1]]));
  assert.notEqual(base,rosterSignature(390,600,false,[{...crew[0],alive:false},crew[1]]));
  assert.notEqual(base,rosterSignature(390,600,false,crew.slice(0,1)));
});
test('a hidden station sleeps before the next frame, never handing Phaser a 0x0 canvas',()=>{
  const code=slice(appSource(),'function stageLive','function checkpoint');
  const el={clientWidth:0,clientHeight:0},calls=[],frames=[];
  const game={scale:{stopListeners:()=>calls.push('stop'),startListeners:()=>calls.push('start'),refresh:()=>calls.push('refresh')},loop:{sleep:()=>calls.push('sleep'),wake:()=>calls.push('wake')}};
  const ctx={station:{game},$:()=>el,requestAnimationFrame:f=>frames.push(f)};
  runInNewContext(code+';syncStage();',ctx);
  // A deferred sleep lets the Phaser loop step once more on a 0x0 parent, which
  // throws "Framebuffer status: Incomplete Attachment", so it must be immediate.
  assert.deepEqual(calls,['stop','sleep']);assert.equal(frames.length,0);
  // Waking still waits a frame so the new layout can settle first.
  el.clientWidth=390;el.clientHeight=600;runInNewContext('syncStage()',ctx);
  assert.deepEqual(calls,['stop','sleep']);assert.equal(frames.length,1);
  frames[0]();
  assert.deepEqual(calls,['stop','sleep','start','wake','refresh']);
});
