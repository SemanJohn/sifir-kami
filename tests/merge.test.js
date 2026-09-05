import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,livePlayers,recordTurn,settleRound,nextRound,castVote,voteResult,crewQuestion,checkTaskAnswer,resolveBoss} from '../dist/game.js';
import {normalizeSettings,impostorCount,loadRosters,saveRoster} from '../dist/settings.js';
import {adaptiveTable,tableStatsFor,buildReport,toCsv} from '../dist/learning.js';
import {saveActiveSession,loadActiveSession,clearActiveSession,saveGameReport,loadReportHistory,clearReportHistory,reportHistorySummary} from '../dist/session.js';
const names=n=>Array.from({length:n},(_,i)=>`Murid ${i+1}`);
const make=(n=8,settings={})=>newGame(names(n),[2,3,6,8],()=>0,{mode:'plus',...settings});
const voteFor=(g,id)=>{g.votes={};for(const p of livePlayers(g))castVote(g,p.id,p.id===id?'skip':id);return voteResult(g);};
const skip=g=>{g.votes={};for(const p of livePlayers(g))castVote(g,p.id,'skip');return voteResult(g);};
const play=(g,correct=3)=>{const spies=livePlayers(g).filter(p=>p.role==='IMPOSTOR').length;for(const p of livePlayers(g))recordTurn(g,p.id,p.role==='CREW'?{correct,answered:3}:{correct,answered:3,attack:25/spies});settleRound(g);};

test('Misi+ uses two impostors only for seven or eight; Mini and classic remain one',()=>{
  for(let n=3;n<=8;n++)for(const mode of ['classic','plus']){
    const g=make(n,{mode});assert.equal(g.players.filter(p=>p.role==='IMPOSTOR').length,impostorCount(n,mode));
    assert.equal(impostorCount(n,mode),mode==='plus'&&n>=7?2:1);
  }
});
test('safe first round flags suspicion without elimination or role revelation outcome',()=>{
  const g=make();const target=g.players.find(p=>p.role==='IMPOSTOR');
  const result=voteFor(g,target.id);assert.equal(result.safe,true);assert.equal(result.eliminated,null);assert.equal(result.warned.id,target.id);assert.equal(target.alive,true);assert.equal(target.suspicion,7);assert.equal(g.winner,null);
});
test('catching one of two impostors is not a win; catching both is',()=>{
  const g=make();g.round=2;const spies=g.players.filter(p=>p.role==='IMPOSTOR');
  assert.equal(voteFor(g,spies[0].id).eliminated.id,spies[0].id);assert.equal(g.winner,null);
  nextRound(g);voteFor(g,spies[1].id);assert.equal(g.winner,'CREW');
});
test('Misi+ battery normalization and crisis rewards are independent of roster size',()=>{
  for(let n=4;n<=8;n++){
    const g=make(n);play(g);assert.equal(g.battery,70);skip(g);nextRound(g);
    play(g);assert.equal(g.battery,96);assert.equal(g.history[1].crisis,6);skip(g);nextRound(g);
    play(g);assert.equal(g.battery,100);assert.equal(g.winner,'CREW');
  }
});
test('failed crisis penalizes once; battery changes only after the full round',()=>{
  const g=make();g.round=2;
  for(const p of livePlayers(g))recordTurn(g,p.id,{correct:0,answered:0});
  assert.equal(g.battery,50);settleRound(g);assert.equal(g.battery,42);assert.equal(g.history[0].crisis,-8);assert.throws(()=>settleRound(g));
});
test('two impostors can deploy their separately earned share',()=>{
  const g=make(),spies=g.players.filter(p=>p.role==='IMPOSTOR');
  for(const p of g.players)recordTurn(g,p.id,p.id===spies[0].id?{correct:3,answered:3,attack:12.5}:{});
  settleRound(g);assert.equal(g.battery,37.5);
});
test('a secret sabotage press applies only the stored amount',()=>{
  const g=make(4,{mode:'classic'}),spy=g.players.find(p=>p.role==='IMPOSTOR');
  for(const p of g.players)recordTurn(g,p.id,p.id===spy.id?{correct:1,answered:3,attack:5}:{correct:0,answered:0});
  settleRound(g);assert.equal(g.battery,45);
});
test('all roles receive the same typed multiplication task and can finish immediately',()=>{
  const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  const draw=source.slice(source.indexOf('function drawQuestion'),source.indexOf('function tickTask'));
  assert.match(draw,/q\.mode='keypad'/);assert.match(draw,/class="keypad"/);assert.doesNotMatch(draw,/class="answer-grid"/);
  assert.doesNotMatch(draw,/IMPOSTOR|impostorQuestion|Bukan sifir|bukan gandaan/);
  assert.match(source,/data-action="task-finish">Tamat giliran/);assert.match(source,/data-action="task-sabotage"/);assert.match(source,/Simpan semua tenaga/);assert.match(source,/data-amount="10"/);assert.match(source,/data-amount="25"/);
});
test('ANU is a persisted lobby option and guarantees one missing-factor question per turn',()=>{
  const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.match(source,/data-lobby-action="anu"/);assert.match(source,/anuStep:game\.config\.anu\?Math\.floor\(Math\.random\(\)\*3\):-1/);
  assert.match(source,/task\.step===task\.anuStep/);assert.equal(normalizeSettings({anu:true}).anu,true);assert.equal(normalizeSettings({anu:'true'}).anu,false);
});
test('lobby controls live over the responsive station canvas',()=>{
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  const scene=readFileSync(new URL('../dist/scene.js',import.meta.url),'utf8');
  const lobby=app.slice(app.indexOf('function renderLobby'),app.indexOf('function dots'));
  assert.match(lobby,/lobby-hud/);assert.match(lobby,/stage-player-name/);assert.match(lobby,/station-tables/);assert.match(lobby,/data-lobby-action="character"/);
  assert.doesNotMatch(lobby,/player-grid|setup-tabs/);assert.match(lobby,/sheet-open/);assert.match(lobby,/setPlayerHandler\(lobbySheet\?null:openPlayerEditor\)/);assert.match(lobby,/CHARACTER_STYLES\.map/);assert.match(lobby,/used\.has\(characterId\)/);assert.match(scene,/Phaser\.Scale\.RESIZE/);assert.match(scene,/setPlayerHandler/);assert.match(scene,/p\.characterId/);
});
test('Home Screen updates are checked on launch, foreground and periodically',()=>{
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),sw=readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8'),manifest=readFileSync(new URL('../dist/manifest.webmanifest',import.meta.url),'utf8');
  assert.match(app,/controllerchange/);assert.match(app,/visibilitychange/);assert.match(app,/setInterval\(checkAppUpdate,15\*60\*1000\)/);assert.match(app,/appUpdatePending.*screen==='LOBBY'/s);
  const version=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
  assert.ok(sw.includes("CACHE=PREFIX+'"+version+"'"));assert.match(sw,/session\.js/);assert.match(manifest,/icon-maskable-512\.png/);assert.ok(readFileSync(new URL('../dist/assets/icon-192.png',import.meta.url)).length>1000);
});
test('v2.1 assets are local, compact and canvas lifecycle is guarded',()=>{
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),scene=readFileSync(new URL('../dist/scene.js',import.meta.url),'utf8'),css=readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
  assert.doesNotMatch(css,/fonts\.googleapis\.com/);assert.match(css,/@font-face/);assert.match(app,/function stageSleep/);assert.match(app,/function stageWake/);assert.match(scene,/station\.webp/);assert.match(scene,/if\(w<2\|\|h<2\)return/);
  assert.ok(readFileSync(new URL('../dist/assets/station.webp',import.meta.url)).length<300000);
});
test('Misi+ parity ends immediately while final-round survival opens Boss Sifir',()=>{
  const parity=make(7);parity.round=2;parity.players.filter(p=>p.role==='CREW').slice(0,3).forEach(p=>p.alive=false);skip(parity);assert.equal(parity.winner,'IMPOSTOR');
  const last=make(8,{maxRounds:5});last.round=5;skip(last);assert.equal(last.winner,null);assert.equal(last.bossPending,true);assert.equal(resolveBoss(last,1),'IMPOSTOR');
});
test('settings are bounded and malformed stored settings fall back safely',()=>{
  assert.equal(normalizeSettings(null).maxRounds,3);
  const c=normalizeSettings({maxRounds:99,turnDuration:-1,discussionDuration:999,startBattery:100,keypadFromRound:99,timerOff:true});
  assert.equal(c.maxRounds,5);assert.equal(c.turnDuration,10);assert.equal(c.discussionDuration,240);assert.equal(c.startBattery,80);assert.equal(c.keypadFromRound,99);assert.equal(c.timerOff,true);
});
test('typed multiplication uses the exact mathematical answer for every role',()=>{
  assert.equal(checkTaskAnswer({table:6,multiplier:4,answer:24,mode:'keypad'},24),true);
  assert.equal(checkTaskAnswer({table:6,multiplier:4,answer:24,mode:'keypad'},25),false);
});
test('adaptive tables favor mistakes and generated options remain unique',()=>{
  const stats={2:{seen:10,wrong:0},8:{seen:10,wrong:10}};let hard=0;
  for(let i=0;i<1000;i++)if(adaptiveTable([2,8],stats,()=>i/1000)===8)hard++;
  assert.ok(hard>800);assert.ok(hard<900);
  for(let t=1;t<=12;t++)for(const r of [0,.2,.8,.999]){
    const q=crewQuestion([t],()=>r,{});assert.equal(new Set(q.options).size,4);assert.ok(q.options.includes(q.answer));assert.ok(q.options.every(n=>n>0));
  }
});
test('reports separate arithmetic from sabotage and do not claim mastery without data',()=>{
  const players=[{id:0,name:'Ali',role:'CREW'},{id:1,name:'Siti',role:'IMPOSTOR'},{id:2,name:'Mei',role:'CREW'}];
  const records=[{playerId:0,kind:'crew',table:6,correct:true,given:12,ms:2000},{playerId:0,kind:'crew',table:6,correct:false,given:null,ms:5000},{playerId:1,kind:'sabotage',table:8,correct:true,given:17,ms:3000}];
  const r=buildReport(records,players);assert.equal(r.crew.accuracy,50);assert.equal(r.sabotage.accuracy,100);assert.equal(r.crew.avgSeconds,2);assert.equal(r.byPlayer[2].accuracy,null);assert.deepEqual(r.byPlayer[2].tables,[]);
  assert.deepEqual(tableStatsFor(records,0),{6:{seen:2,wrong:1}});assert.deepEqual(tableStatsFor(records,1),{});
});
test('an impostor multiplication result contributes to the class and player report',()=>{
  const players=[{id:0,name:'Ali',role:'CREW'},{id:1,name:'Siti',role:'IMPOSTOR'}];
  const records=[{playerId:0,kind:'crew',table:6,correct:true,given:12,ms:2000},{playerId:1,kind:'crew',table:8,correct:false,given:17,ms:3000}];
  const report=buildReport(records,players);assert.equal(report.crew.attempts,2);assert.equal(report.crew.accuracy,50);assert.equal(report.byPlayer[1].attempts,1);assert.equal(report.byPlayer[1].accuracy,0);
});
test('CSV quotes names, blocks formula injection and distinguishes timeouts',()=>{
  const csv=toCsv([{round:1,playerName:'=SUM(1,2)',role:'CREW',kind:'crew',mode:'keypad',table:2,multiplier:3,answer:6,given:null,correct:false,ms:1200},{playerName:'Ali "A"\nB',given:2,correct:true}]);
  assert.ok(csv.includes('"\'=SUM(1,2)"'));assert.ok(csv.includes('"Ali ""A""\nB"'));assert.ok(csv.includes('"MASA TAMAT"'));
});
test('named class groups save locally without affecting the active roster',()=>{
  const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  const group=names(3);saveRoster('Kumpulan Mini',group,[9,4,17]);group[0]='Changed';assert.equal(loadRosters()[0].names[0],'Murid 1');
  assert.deepEqual(loadRosters()[0].characterIds,[9,4,17]);
  saveRoster('Kumpulan Mini',names(8),[0,1,2,3,4,5,6,7]);assert.equal(loadRosters().length,1);assert.equal(loadRosters()[0].names.length,8);
  delete globalThis.localStorage;
});
test('unfinished missions and completed learning reports persist locally',()=>{
  const data=new Map();globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  const game=make(3);assert.equal(saveActiveSession({game,screen:'TRANSIT',turnIndex:0,turnOrder:[0,1,2]}),true);assert.equal(loadActiveSession().screen,'TRANSIT');clearActiveSession();assert.equal(loadActiveSession(),null);
  game.winner='CREW';game.records=[{playerId:0,playerName:'Murid 1',kind:'crew',correct:true,given:6,ms:1500,table:2}];assert.equal(saveGameReport(game),true);assert.equal(saveGameReport(game),false);assert.equal(loadReportHistory().length,1);
  const summary=reportHistorySummary();assert.equal(summary.sessions,1);assert.equal(summary.accuracy,100);assert.equal(summary.players[0].avgSeconds,1.5);clearReportHistory();assert.equal(loadReportHistory().length,0);delete globalThis.localStorage;
});
test('v2 interface exposes recovery, history, shared events, boss and animated reactions',()=>{
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),scene=readFileSync(new URL('../dist/scene.js',import.meta.url),'utf8'),css=readFileSync(new URL('../dist/merge.css',import.meta.url),'utf8');
  assert.match(app,/Sambung misi/);assert.match(app,/Laporan tersimpan/);assert.match(app,/function eventCard/);assert.match(app,/function renderBossIntro/);assert.match(app,/Main semula · pemain sama/);
  assert.match(scene,/reactAll/);assert.match(scene,/type==='ejected'/);assert.match(css,/@keyframes correctPulse/);assert.match(css,/@keyframes bossFloat/);
});
