// Classroom controls adapted from the supplied Claude edition (MIT).
export const DEFAULT_SETTINGS={mode:'classic',maxRounds:3,turnDuration:25,discussionDuration:90,startBattery:50,adaptive:true,anu:false,keypadFromRound:2,timerOff:false,reduceMotion:false,largeText:false,sound:false};
export function normalizeSettings(value={}) {
  if(!value||typeof value!=='object')value={};
  const out={...DEFAULT_SETTINGS};
  out.mode=value.mode==='plus'?'plus':'classic';
  for(const [key,min,max] of [['maxRounds',2,5],['turnDuration',10,90],['discussionDuration',30,240],['startBattery',20,80]]) {
    if(Number.isFinite(Number(value[key])))out[key]=Math.max(min,Math.min(max,Math.round(Number(value[key]))));
  }
  for(const key of ['adaptive','anu','timerOff','reduceMotion','largeText','sound'])if(typeof value[key]==='boolean')out[key]=value[key];
  if([1,2,3,99].includes(Number(value.keypadFromRound)))out.keypadFromRound=Number(value.keypadFromRound);
  return out;
}
export function impostorCount(count,mode){return mode==='plus'&&count>=7?2:1;}
export function toggleTable(tables,value){
  const table=Number(value),current=[...new Set(tables.filter(Number.isInteger))];
  if(!Number.isInteger(table)||table<1||table>12)return current.sort((a,b)=>a-b);
  return (current.includes(table)?current.filter(n=>n!==table):[...current,table]).sort((a,b)=>a-b);
}
const ROSTERS='sifir-kami-class-rosters';
export function loadRosters(){
  try{return JSON.parse(localStorage.getItem(ROSTERS)||'[]').filter(r=>typeof r.name==='string'&&Array.isArray(r.names)&&r.names.length>=3&&r.names.length<=8&&r.names.every(n=>typeof n==='string')).map(r=>({...r,characterIds:Array.isArray(r.characterIds)?r.characterIds:[]})).slice(0,12);}catch{return [];}
}
export function saveRoster(label,names,characterIds=[]){
  const title=String(label).trim().slice(0,30);if(!title)throw Error('Isi nama kumpulan dahulu.');
  const all=loadRosters(),index=all.findIndex(r=>r.name===title);
  if(index<0&&all.length>=12)throw Error('Maksimum 12 kumpulan disimpan.');
  const entry={name:title,names:[...names],characterIds:Array.isArray(characterIds)?[...characterIds]:[]};
  if(index<0)all.push(entry);else all[index]=entry;
  try{localStorage.setItem(ROSTERS,JSON.stringify(all));}catch{throw Error('Peranti tidak membenarkan penyimpanan.');}
}
