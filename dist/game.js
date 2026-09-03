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
export function crewQuestion(tables, rng=Math.random) {
  const table=randomItem(tables,rng), multiplier=1+Math.floor(rng()*12), answer=table*multiplier;
  const pool=Array.from({length:12},(_,i)=>table*(i+1)).filter(v=>v!==answer);
  return {table,multiplier,answer,options:shuffled([answer,...shuffled(pool,rng).slice(0,3)],rng)};
}
export function impostorQuestion(tables, rng=Math.random) {
  const eligible=tables.filter(t=>t>1);
  if(!eligible.length) throw new Error('Sabotaj memerlukan sifir 2 hingga 12.');
  const table=randomItem(eligible,rng), multiples=shuffled(Array.from({length:12},(_,i)=>table*(i+1)),rng).slice(0,3);
  const answer=table*(1+Math.floor(rng()*10)) + 1+Math.floor(rng()*(table-1));
  return {table,answer,options:shuffled([...multiples,answer],rng)};
}
export function newGame(names,tables,rng=Math.random) {
  const error=validateConfig(names,tables); if(error) throw new Error(error);
  const spy=Math.floor(rng()*names.length);
  return {tables:[...tables],players:names.map((n,i)=>({id:i,name:n.trim(),color:COLORS[i],role:i===spy?'IMPOSTOR':'CREW',alive:true})),battery:50,round:1,maxRounds:3,logs:[],turnResults:[],history:[],votes:{},winner:null,reason:null};
}
export function livePlayers(game) {return game.players.filter(p=>p.alive);}
export function recordTurn(game,playerId,{correct=0,answered=0,success=null,table=null,intruder=null}={}) {
  const p=game.players.find(p=>p.id===playerId);
  if(!p?.alive || game.turnResults.some(r=>r.playerId===playerId)) throw new Error('Giliran tidak sah atau telah direkodkan.');
  const crewCount=game.players.filter(p=>p.alive&&p.role==='CREW').length;
  const delta=p.role==='CREW' ? (correct*3+(correct===3?6:0))*3/crewCount : success===true ? -25 : success===false ? 5 : 0;
  game.turnResults.push({playerId,correct,answered,delta,success,table,intruder});
}
export function settleRound(game,rng=Math.random) {
  if(game.turnResults.length!==livePlayers(game).length) throw new Error('Semua pemain aktif mesti tamat giliran.');
  if(game.history.some(h=>h.round===game.round)) throw new Error('Pusingan telah dikira.');
  const before=game.battery,delta=game.turnResults.reduce((sum,t)=>sum+t.delta,0);
  game.battery=Math.max(0,Math.min(100,Math.round((before+delta)*10)/10));
  const crew=game.turnResults.filter(t=>game.players.find(p=>p.id===t.playerId).role==='CREW');
  const spy=game.turnResults.find(t=>game.players.find(p=>p.id===t.playerId).role==='IMPOSTOR');
  const total=crew.reduce((s,t)=>s+t.correct,0), perfect=crew.filter(t=>t.correct===3).length;
  game.logs=shuffled([
    {kind:'info',text:`${total} daripada ${crew.length*3} soalan sifir berjaya diselesaikan.`},
    {kind:'good',text:`${perfect} modul menerima cas kombo sempurna.`},
    spy?.success===true?{kind:'warn',text:`Nombor sesat ${spy.intruder} ditemui dalam modul Sifir ${spy.table}. Kapal kehilangan 25% bateri!`}:spy?.success===false?{kind:'good',text:'Cubaan sabotaj tersilap! Sistem memulihkan 5% bateri.'}:{kind:'info',text:'Tiada gangguan berjaya dikesan pada pusingan ini.'}
  ],rng);
  game.history.push({round:game.round,before,after:game.battery,delta,correct:total,total:crew.length*3});
  if(game.battery>=100){game.winner='CREW';game.reason='Bateri kapal berjaya dicas hingga 100%.';}
  else if(game.battery<=0){game.winner='IMPOSTOR';game.reason='Bateri kapal telah habis.';}
  return game;
}
export function voteResult(game) {
  const active=livePlayers(game);
  if(active.some(p=>!Object.hasOwn(game.votes,p.id))) throw new Error('Undian belum lengkap.');
  const counts={skip:0}; active.forEach(p=>counts[p.id]=0);
  for(const [voter,target] of Object.entries(game.votes)) {
    if(!active.some(p=>String(p.id)===voter) || !Object.hasOwn(counts,target)) throw new Error('Undi tidak sah.');
    counts[target]++;
  }
  const highest=Math.max(...Object.values(counts)), leaders=Object.keys(counts).filter(k=>counts[k]===highest);
  let eliminated=null;
  if(leaders.length===1 && leaders[0]!=='skip') {
    eliminated=game.players.find(p=>p.id===Number(leaders[0]));eliminated.alive=false;
    if(eliminated.role==='IMPOSTOR'){game.winner='CREW';game.reason='Pasukan berjaya mengenal pasti penyamar.';}
  }
  if(!game.winner&&game.round>=game.maxRounds){game.winner='IMPOSTOR';game.reason='Penyamar bertahan selepas undian pusingan ketiga.';}
  return {eliminated,counts,tied:leaders.length>1};
}
export function nextRound(game) {
  if(game.winner || game.round>=game.maxRounds) throw new Error('Misi telah tamat.');
  game.round++;game.turnResults=[];game.votes={};game.logs=[];
}
