import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,crewQuestion,impostorQuestion,recordTurn,settleRound,voteResult,nextRound,livePlayers,validateConfig} from '../dist/game.js';
const names=n=>Array.from({length:n},(_,i)=>`Pemain ${i+1}`);
const make=(n=4)=>newGame(names(n),[1,2,3,4],()=>0);
const play=(g,correct=3,success=true)=>{for(const p of livePlayers(g))recordTurn(g,p.id,p.role==='CREW'?{correct,answered:3}:{success,table:2,intruder:3});settleRound(g);};
const skip=g=>{g.votes=Object.fromEntries(livePlayers(g).map(p=>[p.id,'skip']));return voteResult(g);};

test('finite unique crew options for all tables and endpoint RNG values',()=>{
  for(let table=1;table<=12;table++)for(const r of [0,.01,.083,.5,.99,.999999]){
    const q=crewQuestion([table],()=>r);assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.ok(q.options.includes(q.answer));assert.ok(q.options.every(x=>x>0));assert.equal(q.answer,q.table*q.multiplier);
  }
});
test('sabotage always has exactly one nonmultiple and never selects table one',()=>{
  for(let table=2;table<=12;table++)for(const r of [0,.4,.999999]){
    const q=impostorQuestion([1,table],()=>r);assert.equal(q.table,table);assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.deepEqual(q.options.filter(x=>x%table!==0),[q.answer]);
  }
  assert.throws(()=>impostorQuestion([1]));
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
  const g=make();g.votes={0:0,1:0,2:0,3:'skip'};assert.equal(voteResult(g).eliminated.role,'IMPOSTOR');assert.equal(g.winner,'CREW');
  const crew=make();crew.votes={0:1,1:1,2:1,3:'skip'};voteResult(crew);assert.equal(crew.winner,null);assert.equal(livePlayers(crew).length,3);assert.throws(()=>recordTurn(crew,1));nextRound(crew);play(crew);assert.equal(crew.battery,70);
});
test('final-round vote is allowed before survival wins',()=>{
  const g=make();for(let i=0;i<3;i++){play(g,1,null);assert.equal(g.winner,null);skip(g);if(i<2)nextRound(g);}assert.equal(g.winner,'IMPOSTOR');
  const caught=make();caught.round=3;caught.votes={0:0,1:0,2:0,3:0};voteResult(caught);assert.equal(caught.winner,'CREW');
});
test('incomplete rounds and votes are rejected',()=>{
  const g=make();assert.throws(()=>settleRound(g));assert.throws(()=>voteResult(g));g.votes={0:'invalid',1:0,2:0,3:0};assert.throws(()=>voteResult(g));
});
