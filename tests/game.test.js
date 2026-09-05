import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_STYLES,SABOTAGE_MAX,newGame,crewQuestion,anuQuestion,checkTaskAnswer,sabotageReward,chargeSabotage,spendSabotage,recordTurn,settleRound,voteResult,nextRound,livePlayers,validateConfig,normalizeCharacterIds,voteCandidates,canVoteFor,castVote,crisisActive,turnDurationFor,discussionDurationFor,resolveBoss,SPACE_EVENTS} from '../dist/game.js';
import {createAnswerInput,createActionGuard,deviceClass} from '../dist/input.js';
import {toggleTable} from '../dist/settings.js';
const names=n=>Array.from({length:n},(_,i)=>`Pemain ${i+1}`);
const make=(n=4)=>newGame(names(n),[1,2,3,4],()=>0);
const play=(g,correct=3,attack=25)=>{for(const p of livePlayers(g))recordTurn(g,p.id,p.role==='CREW'?{correct,answered:3}:{correct,answered:3,attack});settleRound(g);};
const skip=g=>{g.votes=Object.fromEntries(livePlayers(g).map(p=>[p.id,'skip']));return voteResult(g);};

test('finite unique crew options for all tables and endpoint RNG values',()=>{
  for(let table=1;table<=12;table++)for(const r of [0,.01,.083,.5,.99,.999999]){
    const q=crewQuestion([table],()=>r);assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.ok(q.options.includes(q.answer));assert.ok(q.options.every(x=>x>0));assert.equal(q.answer,q.table*q.multiplier);
  }
});
test('ANU hides either factor while preserving the multiplication fact',()=>{
  const base=crewQuestion([7],()=>.5);
  const left=anuQuestion(base,()=>0),right=anuQuestion(base,()=>.9);
  assert.equal(left.missing,'table');assert.equal(left.answer,7);assert.equal(left.product,base.answer);assert.ok(checkTaskAnswer(left,7));
  assert.equal(right.missing,'multiplier');assert.equal(right.answer,base.multiplier);assert.equal(right.product,base.answer);assert.ok(checkTaskAnswer(right,base.multiplier));
  assert.throws(()=>anuQuestion({table:7}));
});
test('default tables 2 through 5 can each be unticked',()=>{
  let tables=[2,3,4,5];
  for(const table of [2,3,4,5]){tables=toggleTable(tables,table);assert.equal(tables.includes(table),false);}
  assert.deepEqual(tables,[]);assert.deepEqual(toggleTable([],5),[5]);
});
test('configuration rejects invalid rosters and fewer than two tables',()=>{
  assert.ok(validateConfig(names(2),[2,3]));assert.ok(validateConfig(names(9),[2,3]));assert.ok(validateConfig(['Ali','ali','B'],[2,3]));assert.ok(validateConfig(names(3),[1]));assert.equal(validateConfig(names(3),[1,2]),'');
  for(let n=3;n<=8;n++)assert.equal(make(n).players.filter(p=>p.role==='IMPOSTOR').length,1);
});
test('twenty unique character styles are available and duplicate choices are replaced',()=>{
  assert.equal(CHARACTER_STYLES.length,20);
  assert.equal(new Set(CHARACTER_STYLES.map(style=>style.name)).size,20);
  assert.equal(new Set(CHARACTER_STYLES.map(style=>style.accessory)).size,20);
  assert.deepEqual(normalizeCharacterIds([19,19,-1,4],4),[19,0,1,4]);
  const g=newGame(names(3),[2,3],()=>0,{},[19,4,7]);
  assert.deepEqual(g.players.map(player=>player.characterId),[19,4,7]);
});
test('impostors earn escalating streak energy, split it in Misi+, and bank at 50%',()=>{
  assert.deepEqual([1,2,3].map(n=>sabotageReward(n)),[5,8,12]);
  assert.deepEqual([1,2,3].map(n=>sabotageReward(n,2)),[2.5,4,6]);
  assert.equal(chargeSabotage(0,1),5);assert.equal(chargeSabotage(5,2),13);assert.equal(chargeSabotage(13,3),25);
  assert.equal(chargeSabotage(49,3),SABOTAGE_MAX);
  const g=make(),spy=g.players.find(p=>p.role==='IMPOSTOR');assert.equal(spy.sabotageEnergy,0);spy.sabotageEnergy=25;
  for(const p of g.players)recordTurn(g,p.id);settleRound(g);skip(g);nextRound(g);assert.equal(spy.sabotageEnergy,25);
});
test('impostors can deploy 10, 25 or all energy and retain the remainder',()=>{
  assert.deepEqual(spendSabotage(40,10),{attack:10,remaining:30});
  assert.deepEqual(spendSabotage(40,25),{attack:25,remaining:15});
  assert.deepEqual(spendSabotage(37.5,'all'),{attack:37.5,remaining:0});
  assert.throws(()=>spendSabotage(8,10));
});
test('every game round has one shared space event with bounded time effects',()=>{
  for(let i=0;i<SPACE_EVENTS.length;i++){const g=newGame(names(4),[2,3],()=>i/SPACE_EVENTS.length);assert.ok(g.event);assert.ok(turnDurationFor(g)>=10);assert.ok(discussionDurationFor(g)>=15);}
});
test('3 through 8 players receive equal maximum round charge and complete three rounds',()=>{
  for(let n=3;n<=8;n++){
    const g=make(n);play(g);assert.equal(g.battery,70);assert.equal(g.winner,null);skip(g);nextRound(g);
    play(g);assert.equal(g.battery,90);skip(g);nextRound(g);play(g);assert.equal(g.battery,100);assert.equal(g.winner,'CREW');
  }
});
test('three-player Mini mode has a safe first vote and an impostor 1v1 victory',()=>{
  const g=make(3),spy=g.players.find(p=>p.role==='IMPOSTOR'),crew=g.players.find(p=>p.role==='CREW');
  const configuredPlus=newGame(names(3),[2,3],()=>0,{mode:'plus'});configuredPlus.round=2;assert.equal(crisisActive(configuredPlus),false);
  g.votes={[spy.id]:crew.id,[crew.id]:'skip',[g.players.find(p=>p.id!==spy.id&&p.id!==crew.id).id]:crew.id};
  const warning=voteResult(g);assert.equal(warning.safe,true);assert.equal(warning.warned.id,crew.id);assert.equal(crew.alive,true);assert.equal(g.winner,null);
  nextRound(g);g.votes={[spy.id]:crew.id,[crew.id]:'skip',[g.players.find(p=>p.alive&&p.id!==spy.id&&p.id!==crew.id).id]:crew.id};
  const result=voteResult(g);assert.equal(result.eliminated.id,crew.id);assert.equal(g.winner,'IMPOSTOR');assert.match(g.reason,/menyamai/);
  const caught=make(3);caught.round=2;caught.votes={0:'skip',1:0,2:0};voteResult(caught);assert.equal(caught.winner,'CREW');
});
test('only round settlement changes the battery; player ordering is irrelevant',()=>{
  const a=make(),b=make();
  for(const p of a.players)recordTurn(a,p.id,p.role==='CREW'?{correct:3,answered:3}:{correct:3,answered:3,attack:25});
  assert.equal(a.battery,50);settleRound(a);
  for(const p of [...b.players].reverse())recordTurn(b,p.id,p.role==='CREW'?{correct:3,answered:3}:{correct:3,answered:3,attack:25});settleRound(b);
  assert.equal(a.battery,b.battery);assert.throws(()=>settleRound(b));assert.throws(()=>recordTurn(b,0,{}));
});
test('battery zero, saved sabotage and timeout outcomes are correct',()=>{
  const zero=make();play(zero,0);assert.equal(zero.battery,25);skip(zero);nextRound(zero);play(zero,0);assert.equal(zero.battery,0);assert.equal(zero.winner,'IMPOSTOR');
  const saved=make();play(saved,0,0);assert.equal(saved.battery,50);assert.equal(saved.logs.length,2);assert.ok(saved.logs.every(log=>!(/sabotaj|gangguan/i.test(log.text))));
  const timeout=make();for(const p of timeout.players)recordTurn(timeout,p.id);settleRound(timeout);assert.equal(timeout.battery,50);
});
test('only a deployed attack changes the battery or adds a sabotage log',()=>{
  const g=make(),spy=g.players.find(p=>p.role==='IMPOSTOR');
  for(const p of g.players)recordTurn(g,p.id,p.id===spy.id?{correct:3,answered:3,attack:25}:{correct:0,answered:0});
  settleRound(g);assert.equal(g.battery,25);assert.equal(g.logs.filter(log=>/sabotaj/i.test(log.text)).length,1);
  const invalid=make(),crew=invalid.players.find(p=>p.role==='CREW'),impostor=invalid.players.find(p=>p.role==='IMPOSTOR');
  assert.throws(()=>recordTurn(invalid,crew.id,{attack:1}));assert.throws(()=>recordTurn(invalid,impostor.id,{attack:51}));
});
test('tie or skip produces no elimination',()=>{
  const tie=make();tie.votes={0:1,1:2,2:1,3:2};const r=voteResult(tie);assert.equal(r.tied,true);assert.equal(r.eliminated,null);assert.equal(livePlayers(tie).length,4);
  const g=make();assert.equal(skip(g).eliminated,null);
  const tiedSkip=make();tiedSkip.votes={0:'skip',1:'skip',2:1,3:1};assert.equal(voteResult(tiedSkip).eliminated,null);
});
test('impostor parity ends the mission in every mode',()=>{
  for(const mode of ['classic','plus']){
    const g=newGame(names(4),[2,3],()=>0,{mode});g.round=2;
    const spy=g.players.find(p=>p.role==='IMPOSTOR'),crew=g.players.filter(p=>p.role==='CREW');
    crew.slice(0,2).forEach(p=>p.alive=false);g.votes={[spy.id]:'skip',[crew[2].id]:'skip'};
    voteResult(g);assert.equal(g.winner,'IMPOSTOR');assert.match(g.reason,/menyamai/);
  }
});
test('impostor elimination wins; crew elimination excludes future participation',()=>{
  const g=make();g.votes={0:'skip',1:0,2:0,3:0};assert.equal(voteResult(g).eliminated.role,'IMPOSTOR');assert.equal(g.winner,'CREW');
  const crew=make();crew.votes={0:1,1:'skip',2:1,3:1};voteResult(crew);assert.equal(crew.winner,null);assert.equal(livePlayers(crew).length,3);assert.throws(()=>recordTurn(crew,1));nextRound(crew);play(crew);assert.equal(crew.battery,70);
});
test('final-round vote is allowed before survival wins',()=>{
  const g=make();for(let i=0;i<3;i++){play(g,1,0);assert.equal(g.winner,null);skip(g);if(i<2)nextRound(g);}assert.equal(g.winner,null);assert.equal(g.bossPending,true);assert.equal(resolveBoss(g,1,3),'IMPOSTOR');
  const caught=make();caught.round=3;caught.votes={0:'skip',1:0,2:0,3:0};voteResult(caught);assert.equal(caught.winner,'CREW');
  const rescued=make();rescued.round=3;skip(rescued);assert.equal(resolveBoss(rescued,2,3),'CREW');assert.match(rescued.reason,/2\/3/);
});
test('Boss Sifir completes the final round for every supported roster size',()=>{
  for(let count=3;count<=8;count++){
    const g=newGame(names(count),[2,5],()=>0,{maxRounds:2,mode:count>=7?'plus':'classic'});
    play(g,0,0);skip(g);nextRound(g,()=>.99);play(g,0,0);skip(g);
    assert.equal(g.bossPending,true);assert.equal(resolveBoss(g,2,3),'CREW');assert.equal(g.bossPending,false);
  }
});
test('incomplete rounds and votes are rejected',()=>{
  const g=make();assert.throws(()=>settleRound(g));assert.throws(()=>voteResult(g));g.votes={0:'invalid',1:0,2:0,3:0};assert.throws(()=>voteResult(g));
});

test('every voter sees only other living players; self votes fail for numbers and strings',()=>{
  for(let n=4;n<=8;n++){
    const g=make(n);
    for(const p of g.players){
      assert.equal(voteCandidates(g,p.id).length,n-1);
      assert.ok(voteCandidates(g,p.id).every(candidate=>candidate.id!==p.id));
      for(const id of [p.id,String(p.id)]){
        assert.equal(canVoteFor(g,p.id,id),false);
        assert.throws(()=>castVote(g,p.id,id));
      }
      assert.equal(canVoteFor(g,p.id,'skip'),true);
    }
    g.players[1].alive=false;
    assert.ok(voteCandidates(g,0).every(p=>p.id!==0&&p.id!==1));
    assert.equal(canVoteFor(g,0,1),false);
    assert.equal(canVoteFor(g,1,'skip'),false);
    assert.equal(canVoteFor(g,999,'skip'),false);
  }
});
test('valid votes record once and a self vote cannot enter the tally directly',()=>{
  const g=make();castVote(g,0,1);assert.equal(g.votes[0],'1');
  assert.throws(()=>castVote(g,0,'skip'));assert.equal(g.votes[0],'1');
  castVote(g,1,'skip');castVote(g,2,1);castVote(g,3,1);
  assert.equal(voteResult(g).eliminated.id,1);
  const injected=make();injected.votes={0:0,1:0,2:0,3:0};
  assert.throws(()=>voteResult(injected));assert.equal(injected.players[0].alive,true);
});
test('a touch from the previous question cannot answer the next question',()=>{
  const input=createAnswerInput();input.reset(1);input.press(1,'16',7);
  input.reset(2);
  assert.equal(input.release(2,'16',7),false);
  assert.equal(input.release(1,'16',7),false);
  assert.equal(input.press(1,'16',8),false);
  assert.equal(input.press(2,'16',8),true);
  assert.equal(input.release(2,'16',8),true);
  assert.equal(input.release(2,'16',8),false);
});
test('cancelled, mismatched and repeated pointer releases never submit an answer',()=>{
  const input=createAnswerInput();input.reset(3);
  input.press(3,'24',1);assert.equal(input.release(3,'24',2),false);
  input.press(3,'24',1);assert.equal(input.release(3,'18',1),false);
  input.press(3,'24',1);input.cancel();assert.equal(input.release(3,'24',1),false);
  input.press(3,'24',1);assert.equal(input.release(3,'24',1),true);
  assert.equal(input.release(3,'24',1),false);
});
test('duplicate mobile clicks cannot immediately reverse a lobby toggle',()=>{
  const guard=createActionGuard(400);
  assert.equal(guard.accept('table:2',1000),true);
  assert.equal(guard.accept('table:2',1100),false);
  assert.equal(guard.accept('table:3',1150),true);
  assert.equal(guard.accept('table:2',1500),true);
});

test('device layout follows viewport and pointer type rather than user agent',()=>{
  assert.equal(deviceClass(390,true),'phone');
  assert.equal(deviceClass(820,true),'tablet');
  assert.equal(deviceClass(1280,true),'desktop');
  assert.equal(deviceClass(390,false),'desktop');
});
