import {normalizeSettings,impostorCount} from './settings.js';
import {adaptiveTable} from './learning.js';
export const CHARACTER_STYLES = [
  {body:'#ffb95b',accent:'#f46f61',accessory:'cat',name:'Oyen'},
  {body:'#76d5c3',accent:'#3b8fd9',accessory:'bunny',name:'Arnab'},
  {body:'#b49af4',accent:'#8fd35f',accessory:'sprout',name:'Tunas'},
  {body:'#ff8794',accent:'#ffd166',accessory:'halo',name:'Bintang'},
  {body:'#79bcf5',accent:'#f598d8',accessory:'headphones',name:'DJ'},
  {body:'#d6e575',accent:'#ef6f6c',accessory:'cap',name:'Kapten'},
  {body:'#f1a9e3',accent:'#60d8cf',accessory:'star',name:'Nova'},
  {body:'#dce6f0',accent:'#ff8f70',accessory:'flower',name:'Bunga'},
  {body:'#ff9f68',accent:'#64c8e8',accessory:'goggles',name:'Jurutera'},
  {body:'#62d0a9',accent:'#ff73a8',accessory:'bow',name:'Pita'},
  {body:'#9aa9ff',accent:'#ffd45f',accessory:'horns',name:'Komet'},
  {body:'#ff7fbb',accent:'#7ce2d2',accessory:'tiara',name:'Puteri'},
  {body:'#f3c862',accent:'#6f9ff5',accessory:'propeller',name:'Kipas'},
  {body:'#70d2ef',accent:'#c99bf4',accessory:'moon',name:'Bulan'},
  {body:'#c69af1',accent:'#f2ad62',accessory:'bear',name:'Beruang'},
  {body:'#74d58b',accent:'#ff835f',accessory:'scarf',name:'Pengembara'},
  {body:'#ffad76',accent:'#8bd5c5',accessory:'chef',name:'Cef'},
  {body:'#ea83a9',accent:'#69c9ff',accessory:'party',name:'Pesta'},
  {body:'#62c6da',accent:'#ffbd58',accessory:'rocket',name:'Roket'},
  {body:'#a6d56f',accent:'#7e75da',accessory:'glasses',name:'Profesor'}
];
export const COLORS = CHARACTER_STYLES.map(style=>style.body);
export const CHARACTER_COUNT = CHARACTER_STYLES.length;
export const DEFAULT_NAMES = ['Kapten Oyen', 'Mochi', 'Boba', 'Luna'];
export const SABOTAGE_MAX = 50;
// Boss Sifir ialah satu-satunya jalan menang yang tinggal untuk penyamar dalam
// kumpulan besar, jadi kekuatannya mesti datang daripada usaha mereka sendiri.
// Tenaga dikira daripada jumlah yang DIKUMPUL sepanjang misi, bukan baki yang
// tinggal, supaya penyamar yang membelanjakan semuanya untuk menyerang bateri
// tidak dihukum di penghujung. Dibahagi bilangan penyamar seperti sabotageReward.
export const BOSS_BASE = 8, BOSS_MAX = 11, BOSS_SECONDS = 30;
export function bossEnergy(game){
  const spies=Math.max(1,game.players.filter(p=>p.role==='IMPOSTOR').length);
  const earned=Math.max(0,Number(game.sabotageEarned)||0);
  return Math.max(BOSS_BASE,Math.min(BOSS_MAX,Math.round(BOSS_BASE+earned/(25*spies))));
}
export const SPACE_EVENTS = [
  {id:'LOW_GRAVITY',icon:'◌',name:'Graviti Rendah',description:'Semua pemain mendapat tambahan 5 saat.',turnBonus:5},
  {id:'METEOR',icon:'✦',name:'Hujan Meteor',description:'Kombo tepat menghasilkan kesan bintang berganda.'},
  {id:'AURORA',icon:'≋',name:'Aurora Tenaga',description:'Tolok dan stesen bersinar sepanjang pusingan.'},
  {id:'ECLIPSE',icon:'◐',name:'Gerhana Pantas',description:'Mesyuarat dipendekkan 15 saat.',discussionDelta:-15}
];
export function shuffled(items, rng = Math.random) {
  const out = [...items];
  for (let i=out.length-1; i>0; i--) { const j = Math.floor(rng()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; }
  return out;
}
export function randomItem(items, rng = Math.random) { return items[Math.floor(rng()*items.length)]; }
function missionId(){return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.floor(Math.random()*1e9)}`;}
export function normalizeCharacterIds(ids,count){
  const used=new Set(),values=Array.isArray(ids)?ids:[];
  return Array.from({length:count},(_,index)=>{
    const requested=Number(values[index]);
    let id=Number.isInteger(requested)&&requested>=0&&requested<CHARACTER_COUNT&&!used.has(requested)?requested:0;
    while(used.has(id))id++;
    used.add(id);return id;
  });
}
export function validateConfig(names, tables) {
  if(names.length<3 || names.length>8) return 'Misi perlukan 3 hingga 8 pemain.';
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
export function anuQuestion(question,rng=Math.random){
  if(!question||!Number.isInteger(question.table)||!Number.isInteger(question.multiplier))throw Error('Soalan ANU tidak sah.');
  const missing=rng()<.5?'table':'multiplier',product=question.table*question.multiplier;
  return {...question,anu:true,missing,product,answer:missing==='table'?question.table:question.multiplier,options:[]};
}
export function checkTaskAnswer(question,value){
  return value===question.answer;
}
export function sabotageReward(streak,activeImpostors=1){
  const rewards=[0,5,8,12],step=Math.max(0,Math.min(3,Math.trunc(Number(streak)||0))),count=Math.max(1,Math.trunc(Number(activeImpostors)||1));
  return Math.round(rewards[step]/count*10)/10;
}
export function chargeSabotage(stored,streak,activeImpostors=1){
  const current=Math.max(0,Number(stored)||0);
  return Math.min(SABOTAGE_MAX,Math.round((current+sabotageReward(streak,activeImpostors))*10)/10);
}
export function spendSabotage(stored,requested='all'){
  const bank=Math.max(0,Math.min(SABOTAGE_MAX,Number(stored)||0)),wanted=requested==='all'?bank:Number(requested);
  if(!Number.isFinite(wanted)||wanted<=0||wanted>bank)throw Error('Tenaga sabotaj tidak mencukupi.');
  const attack=Math.round(wanted*10)/10;return {attack,remaining:Math.round((bank-attack)*10)/10};
}
export function chooseSpaceEvent(rng=Math.random){return SPACE_EVENTS[Math.min(SPACE_EVENTS.length-1,Math.floor(rng()*SPACE_EVENTS.length))];}
export function turnDurationFor(game){return Math.max(10,game.config.turnDuration+(game.event?.turnBonus||0));}
export function discussionDurationFor(game){return Math.max(15,game.config.discussionDuration+(game.event?.discussionDelta||0));}
export function newGame(names,tables,rng=Math.random,settings={},characterIds=[]) {
  const error=validateConfig(names,tables); if(error) throw new Error(error);
  const config=normalizeSettings(settings),characters=normalizeCharacterIds(characterIds,names.length),spy=Math.floor(rng()*names.length),count=impostorCount(names.length,config.mode);
  const ids=[spy,...shuffled(names.map((_,i)=>i).filter(i=>i!==spy),rng).slice(0,count-1)];
  return {sessionId:missionId(),startedAt:Date.now(),config,tables:[...tables],players:names.map((n,i)=>({id:i,name:n.trim(),characterId:characters[i],color:COLORS[characters[i]],role:ids.includes(i)?'IMPOSTOR':'CREW',alive:true,suspicion:0,sabotageEnergy:0})),battery:config.startBattery,round:1,maxRounds:config.maxRounds,event:chooseSpaceEvent(rng),logs:[],records:[],turnResults:[],history:[],votes:{},sabotageEarned:0,bossPending:false,winner:null,reason:null};
}
export function livePlayers(game) {return game.players.filter(p=>p.alive);}
export function miniGame(game){return game.players.length===3;}
export function safeRound(game){return (miniGame(game)||game.config.mode==='plus')&&game.round===1;}
export function crisisActive(game){return !miniGame(game)&&game.config.mode==='plus'&&game.round>=2;}
export function recordTurn(game,playerId,{correct=0,answered=0,attack=0,earned=0}={}) {
  const p=game.players.find(p=>p.id===playerId);
  if(!p?.alive || game.turnResults.some(r=>r.playerId===playerId)) throw new Error('Giliran tidak sah atau telah direkodkan.');
  const crewCount=game.players.filter(p=>p.alive&&p.role==='CREW').length;
  if(!Number.isInteger(correct)||correct<0||correct>3||!Number.isInteger(answered)||answered<0||answered>3||correct>answered)throw Error('Skor giliran tidak sah.');
  if(!Number.isFinite(attack)||attack<0||attack>SABOTAGE_MAX||(p.role==='CREW'&&attack!==0))throw Error('Serangan sabotaj tidak sah.');
  if(!Number.isFinite(earned)||earned<0||earned>SABOTAGE_MAX||(p.role==='CREW'&&earned!==0))throw Error('Tenaga sabotaj dikumpul tidak sah.');
  const delta=p.role==='CREW' ? (correct*3+(correct===3?6:0))*3/crewCount : -attack;
  game.sabotageEarned=Math.round(((game.sabotageEarned||0)+earned)*10)/10;
  game.turnResults.push({playerId,correct,answered,attack,earned,delta});
}
export function settleRound(game,rng=Math.random) {
  if(game.turnResults.length!==livePlayers(game).length) throw new Error('Semua pemain aktif mesti tamat giliran.');
  if(game.history.some(h=>h.round===game.round)) throw new Error('Pusingan telah dikira.');
  const before=game.battery;
  const crew=game.turnResults.filter(t=>game.players.find(p=>p.id===t.playerId).role==='CREW');
  const spies=game.turnResults.filter(t=>game.players.find(p=>p.id===t.playerId).role==='IMPOSTOR');
  const total=game.turnResults.reduce((s,t)=>s+t.correct,0), perfect=crew.filter(t=>t.correct===3).length;
  const totalQuestions=game.turnResults.length*3;
  const attack=Math.round(spies.reduce((s,t)=>s+t.attack,0)*10)/10;
  const crisis=crisisActive(game)?(perfect>0?6:-8):0;
  // Kapal dicas dahulu dan tidak boleh menyimpan lebih daripada 100%: cas
  // berlebihan hilang. Barulah sabotaj menyusut daripada nilai itu. Jika
  // dicampur dahulu seperti sebelum ini, serangan yang mendarat dalam lebihan
  // krew tidak mengubah apa-apa walaupun log mendakwa ia menelan tenaga.
  const charge=crew.reduce((sum,t)=>sum+t.delta,0)+crisis;
  const charged=Math.min(100,Math.round((before+charge)*10)/10);
  game.battery=Math.max(0,Math.round((charged-attack)*10)/10);
  const delta=Math.round((game.battery-before)*10)/10;
  const logs=[
    {kind:'info',text:`${total} daripada ${totalQuestions} soalan sifir dijawab tepat.`},
    {kind:crisis<0?'warn':'good',text:crisis?crisis>0?`Krisis dibaiki! ${perfect} kombo sempurna. Bonus kapal +6%.`:'Krisis tidak dibaiki. Kapal kehilangan 8%.':`${perfect} modul menerima cas kombo sempurna.`}
  ];
  if(attack>0)logs.push({kind:'warn',text:`Serangan sabotaj menelan ${attack.toLocaleString('ms-MY')}% tenaga kapal. Jejak stesen dirahsiakan.`});
  // Beritahu pasukan bila cas mereka melimpah, supaya bateri yang tidak kekal
  // 100% selepas sabotaj tidak kelihatan seperti pepijat.
  if(before+charge>100)logs.push({kind:'info',text:'Kapal mencapai cas penuh. Tenaga berlebihan tidak dapat disimpan.'});
  game.logs=shuffled(logs,rng);
  game.history.push({round:game.round,before,after:game.battery,delta,crisis,correct:total,total:totalQuestions});
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
  else if(remaining.length-imps<=imps){game.winner='IMPOSTOR';game.reason='Penyamar kini menyamai bilangan krew.';}
  else if(game.round>=game.maxRounds){game.bossPending=true;}
  return {eliminated,warned,safe:safeRound(game),counts,tied:leaders.length>1};
}
export function resolveBoss(game,correct,need=bossEnergy(game)){
  if(!game.bossPending||game.winner)throw Error('Boss Sifir tidak aktif.');
  const target=Math.max(1,Math.trunc(Number(need)||BOSS_BASE));
  const score=Math.max(0,Math.trunc(Number(correct)||0));
  game.bossPending=false;game.bossResult={correct:score,need:target};
  if(score>=target){game.winner='CREW';game.reason=`Tenaga Boss Sifir dipadamkan dengan ${score}/${target} jawapan tepat.`;}
  else{game.winner='IMPOSTOR';game.reason=`Boss Sifir bertahan. Pasukan hanya mendapat ${score}/${target} jawapan tepat.`;}
  return game.winner;
}
export function nextRound(game,rng=Math.random) {
  if(game.winner || game.round>=game.maxRounds) throw new Error('Misi telah tamat.');
  game.round++;game.turnResults=[];game.votes={};game.logs=[];game.event=chooseSpaceEvent(rng);
}
