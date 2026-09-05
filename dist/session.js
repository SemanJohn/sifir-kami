const SESSION_KEY='sifir-kami-active-session-v2';
const REPORT_KEY='sifir-kami-report-history-v2';

function storage(){try{return globalThis.localStorage;}catch{return null;}}
export function saveActiveSession(snapshot){
  if(!snapshot?.game?.players?.length)return false;
  try{storage()?.setItem(SESSION_KEY,JSON.stringify({schema:2,savedAt:Date.now(),...snapshot}));return true;}catch{return false;}
}
export function loadActiveSession(){
  try{const value=JSON.parse(storage()?.getItem(SESSION_KEY)||'null');return value?.schema===2&&Array.isArray(value.game?.players)&&value.game.players.length>=3?value:null;}catch{return null;}
}
export function clearActiveSession(){try{storage()?.removeItem(SESSION_KEY);}catch{}}
export function loadReportHistory(){
  try{return JSON.parse(storage()?.getItem(REPORT_KEY)||'[]').filter(entry=>entry&&typeof entry.id==='string'&&Array.isArray(entry.records)&&Array.isArray(entry.players)).slice(0,30);}catch{return [];}
}
export function saveGameReport(game){
  if(!game?.winner||!Array.isArray(game.records))return false;
  const all=loadReportHistory(),id=String(game.sessionId||game.startedAt||Date.now());
  if(all.some(entry=>entry.id===id))return false;
  const entry={id,endedAt:new Date().toISOString(),winner:game.winner,battery:game.battery,round:game.round,players:game.players.map(({id,name,characterId})=>({id,name,characterId})),records:game.records.map(record=>({...record}))};
  try{storage()?.setItem(REPORT_KEY,JSON.stringify([entry,...all].slice(0,30)));return true;}catch{return false;}
}
export function clearReportHistory(){try{storage()?.removeItem(REPORT_KEY);}catch{}}
export function reportHistorySummary(entries=loadReportHistory()){
  const records=entries.flatMap(entry=>entry.records),byName=new Map();
  for(const record of records){const key=String(record.playerName||'Murid'),row=byName.get(key)||{name:key,attempts:0,correct:0,totalMs:0,timed:0};row.attempts++;if(record.correct)row.correct++;if(record.given!==null&&record.ms>0){row.totalMs+=record.ms;row.timed++;}byName.set(key,row);}
  return {sessions:entries.length,questions:records.length,accuracy:records.length?Math.round(records.filter(r=>r.correct).length/records.length*100):null,players:[...byName.values()].map(row=>({...row,accuracy:row.attempts?Math.round(row.correct/row.attempts*100):null,avgSeconds:row.timed?Math.round(row.totalMs/row.timed/100)/10:null})).sort((a,b)=>a.accuracy-b.accuracy||a.name.localeCompare(b.name,'ms'))};
}
