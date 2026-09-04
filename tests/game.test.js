import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,crewQuestion,anuQuestion,checkTaskAnswer,recordTurn,settleRound,voteResult,nextRound,livePlayers,validateConfig,voteCandidates,canVoteFor,castVote} from '../dist/game.js';
import {createAnswerInput,deviceClass} from '../dist/input.js';
const names=n=>Array.from({length:n},(_,i)=>`Pemain ${i+1}`);
const make=(n=4)=>newGame(names(n),[1,2,3,4],()=>0);
const play=(g,correct=3,success=true)=>{for(const p of livePlayers(g))recordTurn(g,p.id,p.role==='CREW'?{correct,answered:3}:{success,table:2,intruder:3});settleRound(g);};
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
test('configuration rejects invalid rosters and fewer than two tables',()=>{
  assert.ok(validateConfig(names(3),[2,3]));assert.ok(validateConfig(names(9),[2,3]));assert.ok(validateConfig(['Ali','ali','B','C'],[2,3]));assert.ok(validateConfig(names(4),[1]));assert.equal(validateConfig(names(8),[1,2]),'');
  for(let n=4;n<=8;n++)assert.equal(make(n).players.filter(p=>p.role==='IMPOSTOR').length,1);
});
test('4 through 8 players receive equal maximum round charge and complete three rounds',()=>{
  for(let n=4;n<=8;n++){
    const g=make(n);play(g);assert.equal(g.battery,70);assert.equal(g.winner,null);skip(g);nextRound(g);
    play(g);assert.equal(g.battery,90);skip(g);nextRound(g);play(g);assert.equal(g.battery,100);assert.equal(g.winner,'CREW');
  }
});
test('only round settlement changes the battery; player ordering is irrelevant',()=>{
  const a=make(),b=make();
  for(const p of a.players)recordTurn(a,p.id,p.role==='CREW'?{correct:3,answered:3}:{success:true});
  assert.equal(a.battery,50);settleRound(a);
  for(const p of [...b.players].reverse())recordTurn(b,p.id,p.role==='CREW'?{correct:3,answered:3}:{success:true});settleRound(b);
  assert.equal(a.battery,b.battery);assert.throws(()=>settleRound(b));assert.throws(()=>recordTurn(b,0,{}));
});
test('battery zero, failed sabotage and timeout outcomes are correct',()=>{
  const zero=make();play(zero,0);assert.equal(zero.battery,25);skip(zero);nextRound(zero);play(zero,0);assert.equal(zero.battery,0);assert.equal(zero.winner,'IMPOSTOR');
  const failed=make();play(failed,0,false);assert.equal(failed.battery,55);
  const timeout=make();for(const p of timeout.players)recordTurn(timeout,p.id);settleRound(timeout);assert.equal(timeout.battery,50);
});
test('tie or skip produces no elimination',()=>{
  const tie=make();tie.votes={0:1,1:2,2:1,3:2};const r=voteResult(tie);assert.equal(r.tied,true);assert.equal(r.eliminated,null);assert.equal(livePlayers(tie).length,4);
  const g=make();assert.equal(skip(g).eliminated,null);
  const tiedSkip=make();tiedSkip.votes={0:'skip',1:'skip',2:1,3:1};assert.equal(voteResult(tiedSkip).eliminated,null);
});
test('impostor elimination wins; crew elimination excludes future participation',()=>{
  const g=make();g.votes={0:'skip',1:0,2:0,3:0};assert.equal(voteResult(g).eliminated.role,'IMPOSTOR');assert.equal(g.winner,'CREW');
  const crew=make();crew.votes={0:1,1:'skip',2:1,3:1};voteResult(crew);assert.equal(crew.winner,null);assert.equal(livePlayers(crew).length,3);assert.throws(()=>recordTurn(crew,1));nextRound(crew);play(crew);assert.equal(crew.battery,70);
});
test('final-round vote is allowed before survival wins',()=>{
  const g=make();for(let i=0;i<3;i++){play(g,1,null);assert.equal(g.winner,null);skip(g);if(i<2)nextRound(g);}assert.equal(g.winner,'IMPOSTOR');
  const caught=make();caught.round=3;caught.votes={0:'skip',1:0,2:0,3:0};voteResult(caught);assert.equal(caught.winner,'CREW');
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

test('device layout follows viewport and pointer type rather than user agent',()=>{
  assert.equal(deviceClass(390,true),'phone');
  assert.equal(deviceClass(820,true),'tablet');
  assert.equal(deviceClass(1280,true),'desktop');
  assert.equal(deviceClass(390,false),'desktop');
});
