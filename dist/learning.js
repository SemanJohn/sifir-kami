// Adaptive learning, diagnostics and CSV inspired by the supplied Claude edition.
// Arithmetic and sabotage results stay separate: they measure different tasks.
export function tableStatsFor(records,playerId,kind='crew') {
  const stats={};
  for(const r of records){if(r.playerId!==playerId||r.kind!==kind)continue;const s=stats[r.table]??={seen:0,wrong:0};s.seen++;if(!r.correct)s.wrong++;}
  return stats;
}
export function adaptiveTable(tables,stats,rng=Math.random){
  const weights=tables.map(t=>!stats?.[t]||stats[t].seen<2?1.4:.6+stats[t].wrong/stats[t].seen*2.4);
  let sample=rng()*weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<tables.length;i++){sample-=weights[i];if(sample<0)return tables[i];}
  return tables.at(-1);
}
function summarize(records){
  const byTable={};
  for(const r of records){const t=byTable[r.table]??={seen:0,correct:0};t.seen++;if(r.correct)t.correct++;}
  const correct=records.filter(r=>r.correct).length;
  const times=records.filter(r=>r.given!==null&&r.ms>0).map(r=>r.ms);
  return {attempts:records.length,correct,accuracy:records.length?Math.round(correct/records.length*100):null,avgSeconds:times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length/100)/10:null,
    tables:Object.entries(byTable).map(([table,v])=>({table:Number(table),...v,accuracy:Math.round(v.correct/v.seen*100)})).sort((a,b)=>a.accuracy-b.accuracy||a.table-b.table)};
}
export function buildReport(records,players){
  return {crew:summarize(records.filter(r=>r.kind==='crew')),sabotage:summarize(records.filter(r=>r.kind==='sabotage')),
    byPlayer:players.map(p=>({...p,...summarize(records.filter(r=>r.playerId===p.id))}))};
}
function csvCell(value){
  let s=String(value??'');
  // Spreadsheet formula injection protection for user-controlled names.
  if(typeof value==='string'&&/^[\s]*[=+@-]|^[\t\r\n]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
export function toCsv(records){
  const rows=[['pusingan','nama','peranan','jenis','mod','sifir','pengganda','jawapan_betul_atau_contoh','jawapan_murid','status','masa_saat']];
  for(const r of records)rows.push([r.round,r.playerName,r.role==='CREW'?'Krew':'Penyamar',r.kind==='crew'?'Sifir':'Bukan gandaan',r.mode==='keypad'?'Taip':'Pilihan',r.table,r.multiplier??'',r.answer,r.given??'',r.given===null?'MASA TAMAT':r.correct?'BETUL':'SALAH',r.ms>0?(r.ms/1000).toFixed(1):'']);
  return rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
export function downloadCsv(records){
  const url=URL.createObjectURL(new Blob(['\uFEFF'+toCsv(records)],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`sifir-kami-${new Date().toISOString().slice(0,10)}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
