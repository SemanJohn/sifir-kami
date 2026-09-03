import {normalizeSettings,impostorCount} from './settings.js';
import {adaptiveTable} from './learning.js';
export const COLORS = ['#ffb95b','#76d5c3','#b49af4','#ff8794','#79bcf5','#d6e575','#f1a9e3','#dce6f0'];
export const DEFAULT_NAMES = ['Kapten Oyen', 'Mochi', 'Boba', 'Luna'];
export function shuffled(items, rng = Math.random) {
  const out = [...items];
  for (let i=out.length-1; i>0; i--) { const j = Math.floor(rng()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; }
  return out;
}
export function randomItem(items, rng = Math.random) { return items[Math.floor(rng()*items.length)]; }
export function validateConfig(names, tables) {
  if(names.length<4 || names.length>8) return 'Misi perlukan 4 hingga 8 pemain.';
  if(names.some(n=>!n.trim() || n.trim().length>20)) return 'Isi setiap nama (maksimum 20 aksara).';
  if(new Set(names.map(n=>n.trim().toLocaleLowerCase('ms'))).size!==names.length) return 'Gunakan nama berbeza supaya undian jelas.';
  if(new Set(tables).size<2 || tables.some(t=>!Number.isInteger(t)||t<1||t>12)) return 'Pilih sekurang-kurangnya 2 sifir.';
  return '';
}
export function crewQuestion(tables, rng=Math.random, stats=null) {
  const table=stats?adaptiveTable(tables,stats,rng):randomItem(tables,rng), multiplier=1+Math.floor(rng()*12), answer=table*multiplier;
  // Claude's meaningful distractors, with a finite fallback for 1 × 1.
  const candidates=[answer-table,answer+table,table+multiplier,answer-1,answer+1,answer+2,Number(String(answer).split('').reverse().join('')),...Array.from({length:12},(_,i)=>table*(i+1))];
  const pool=[...new Set(candidates)].filter(v=>v>0&&v!==answer);
  return {table,multiplier,answer,options:shuffled([answer,...shuffled(pool,rng).slice(0,3)],rng)};
}
export function impostorQuestion(tables, rng=Math.random) {
  const eligible=tables.filter(t=>t>1);
  if(!eligible.length) throw new Error('Sabotaj memerlukan sifir 2 hingga 12.');
  const table=randomItem(eligible,rng), multiples=shuffled(Array.from({length:12},(_,i)=>table*(i+1)),rng).slice(0,3);
  const answer=table*(1+Math.floor(rng()*10)) + 1+Math.floor(rng()*(table-1));
  return {table,answer,options:shuffled([...multiples,answer],rng)};
}
export function checkTaskAnswer(question,value,spy=false){
  if(spy&&question.mode==='keypad')return Number.isInteger(value)&&value>=2&&value<=question.table*12&&value%question.table!==0;
  return value===question.answer;
}
export function newGame(names,tables,rng=Math.random,settings={}) {
  const error=validateConfig(names,tables); if(error) throw new Error(error);
  const config=normalizeSettings(settings),spy=Math.floor(rng()*names.length),count=impostorCount(names.length,config.mode);
  const ids=[spy,...shuffled(names.map((_,i)=>i).filter(i=>i!==spy),rng).slice(0,count-1)];
  return {config,tables:[...tables],players:names.map((n,i)=>({id:i,name:n.trim(),color:COLORS[i],role:ids.includes(i)?'IMPOSTOR':'CREW',alive:true,suspicion:0})),battery:config.startBattery,round:1,maxRounds:config.maxRounds,logs:[],records:[],turnResults:[],history:[],votes:{},winner:null,reason:null};
}
export function livePlayers(game) {return game.players.filter(p=>p.alive);}
export function safeRound(game){return game.config.mode==='plus'&&game.round===1;}
export function crisisActive(game){return game.config.mode==='plus'&&game.round>=2;}
export function recordTurn(game,playerId,{correct=0,answered=0,success=null,table=null,intruder=null,hits=0,backfires=0}={}) {
  const p=game.players.find(p=>p.id===playerId);
  if(!p?.alive || game.turnResults.some(r=>r.playerId===playerId)) throw new Error('Giliran tidak sah atau telah direkodkan.');
  const crewCount=game.players.filter(p=>p.alive&&p.role==='CREW').length;
  const impCount=livePlayers(game).filter(p=>p.role==='IMPOSTOR').length;
  if(!Number.isInteger(correct)||correct<0||correct>3||!Number.isInteger(answered)||answered<0||answered>3||correct>answered)throw Error('Skor giliran tidak sah.');
  if(!Number.isInteger(hits)||!Number.isInteger(backfires)||hits<0||backfires<0||hits+backfires>3)throw Error('Skor sabotaj tidak sah.');
  const delta=p.role==='CREW' ? (correct*3+(correct===3?6:0))*3/crewCount : game.config.mode==='plus'?(-25*hits+5*backfires)/(3*impCount):success===true?-25:success===false?5:0;
  game.turnResults.push({playerId,correct,answered,delta,success,table,intruder,hits,backfires});
}
export function settleRound(game,rng=Math.random) {
  if(game.turnResults.length!==livePlayers(game).length) throw new Error('Semua pemain aktif mesti tamat giliran.');
  if(game.history.some(h=>h.round===game.round)) throw new Error('Pusingan telah dikira.');
  const before=game.battery;
  const crew=game.turnResults.filter(t=>game.players.find(p=>p.id===t.playerId).role==='CREW');
  const spies=game.turnResults.filter(t=>game.players.find(p=>p.id===t.playerId).role==='IMPOSTOR');
  const spy=spies.find(t=>t.success===true)||spies[0];
  const total=crew.reduce((s,t)=>s+t.correct,0), perfect=crew.filter(t=>t.correct===3).length;
  const crisis=crisisActive(game)?(perfect>0?6:-8):0;
  const delta=game.turnResults.reduce((sum,t)=>sum+t.delta,0)+crisis;
  game.battery=Math.max(0,Math.min(100,Math.round((before+delta)*10)/10));
  game.logs=shuffled([
    {kind:'info',text:`${total} daripada ${crew.length*3} soalan sifir berjaya diselesaikan.`},
    {kind:crisis<0?'warn':'good',text:crisis?crisis>0?`Krisis dibaiki! ${perfect} kombo sempurna. Bonus kapal +6%.`:'Krisis tidak dibaiki. Kapal kehilangan 8%.':`${perfect} modul menerima cas kombo sempurna.`},
    game.config.mode==='plus'?{kind:spies.some(t=>t.hits)?'warn':'info',text:`${spies.reduce((s,t)=>s+t.hits,0)} gangguan berjaya; ${spies.reduce((s,t)=>s+t.backfires,0)} cubaan tersilap. Jejak stesen dirahsiakan.`}:spy?.success===true?{kind:'warn',text:`Nombor sesat ${spy.intruder} ditemui dalam modul Sifir ${spy.table}. Kapal kehilangan 25% bateri!`}:spy?.success===false?{kind:'good',text:'Cubaan sabotaj tersilap! Sistem memulihkan 5% bateri.'}:{kind:'info',text:'Tiada gangguan berjaya dikesan pada pusingan ini.'}
  ],rng);
  game.history.push({round:game.round,before,after:game.battery,delta,crisis,correct:total,total:crew.length*3});
  if(game.battery>=100){game.winner='CREW';game.reason='Bateri kapal berjaya dicas hingga 100%.';}
  else if(game.battery<=0){game.winner='IMPOSTOR';game.reason='Bateri kapal telah habis.';}
  return game;
}
export function voteCandidates(game, voterId) {
  return livePlayers(game).filter(p=>p.id!==Number(voterId));
}
export function canVoteFor(game, voterId, target) {
  if(!livePlayers(game).some(p=>String(p.id)===String(voterId))) return false;
  if(target==='skip') return true;
  return voteCandidates(game,voterId).some(p=>String(p.id)===String(target));
}
export function castVote(game, voterId, target) {
  if(!canVoteFor(game,voterId,target)) throw new Error('Tidak boleh mengundi diri sendiri atau pemain tidak aktif.');
  if(Object.hasOwn(game.votes,voterId)) throw new Error('Undi sudah direkodkan.');
  game.votes[voterId]=String(target);
}
export function voteResult(game) {
  const active=livePlayers(game);
  if(active.some(p=>!Object.hasOwn(game.votes,p.id))) throw new Error('Undian belum lengkap.');
  const counts={skip:0}; active.forEach(p=>counts[p.id]=0);
  for(const [voter,target] of Object.entries(game.votes)) {
    if(!canVoteFor(game,voter,target) || !Object.hasOwn(counts,target)) throw new Error('Undi tidak sah.');
    counts[target]++;
  }
  const highest=Math.max(...Object.values(counts)), leaders=Object.keys(counts).filter(k=>counts[k]===highest);
  let eliminated=null,warned=null;
  if(leaders.length===1 && leaders[0]!=='skip') {
    const target=game.players.find(p=>p.id===Number(leaders[0]));
    if(safeRound(game)){warned=target;target.suspicion=highest;}
    else{eliminated=target;target.alive=false;}
  }
  const remaining=livePlayers(game),imps=remaining.filter(p=>p.role==='IMPOSTOR').length;
  if(imps===0){game.winner='CREW';game.reason='Semua penyamar berjaya dikenal pasti.';}
  else if(game.config.mode==='plus'&&remaining.length-imps<=imps){game.winner='IMPOSTOR';game.reason='Penyamar kini menyamai bilangan krew.';}
  else if(game.round>=game.maxRounds){game.winner='IMPOSTOR';game.reason=`Penyamar bertahan selepas undian pusingan ${game.maxRounds}.`;}
  return {eliminated,warned,safe:safeRound(game),counts,tied:leaders.length>1};
}
export function nextRound(game) {
  if(game.winner || game.round>=game.maxRounds) throw new Error('Misi telah tamat.');
  game.round++;game.turnResults=[];game.votes={};game.logs=[];
}
