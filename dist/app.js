import {COLORS,DEFAULT_NAMES,validateConfig,newGame,livePlayers,crewQuestion,impostorQuestion,recordTurn,settleRound,voteResult,nextRound,shuffled,voteCandidates,canVoteFor,castVote} from './game.js';
import {createAnswerInput} from './input.js';
import {avatarURLs,startStation} from './scene.js';

const $=s=>document.querySelector(s);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n.toFixed(1)).toLocaleString('ms-MY');
let names=[...DEFAULT_NAMES],tables=[2,3,4,5];
try {const saved=JSON.parse(localStorage.getItem('sifir-kami-config'));if(saved&&!validateConfig(saved.names,saved.tables)){names=saved.names;tables=saved.tables;}} catch {}
let game=null,screen='LOBBY',roleIndex=0,turnIndex=0,turnOrder=[],voterIndex=0,voterOrder=[],selectedVote=null,hasSeenRole=false,holding=false,task=null,clock=null,epoch=0,meetingDeadline=0,lastVoteResult=null,soundOn=false,audioCtx=null,station=null;
let lobbyStep=0,crewPage=0,helpPage=0,questionId=0;
const answerInput=createAnswerInput();
const app=$('#app');
app.innerHTML=`<div class="page-intro"><h1 id="page-title">Sifir Kami</h1><span id="page-badge" class="outline-badge">Misi baharu</span></div><div id="layout" class="layout"><div id="visual-column"><div class="station-panel"><div class="station-toolbar"><span>STESEN KAMI</span><span id="station-meta" class="muted">LOBI</span></div><div id="stage" role="img" aria-label="Stesen angkasa dengan watak krew comel"></div></div></div><div id="mission-panel"></div></div>`;
const panel=$('#mission-panel');

function sound(){if(!soundOn)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);o.type='sine';o.frequency.setValueAtTime(620,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(420,audioCtx.currentTime+.08);g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.1);o.start();o.stop(audioCtx.currentTime+.11);}catch{}}
function updateSound(){const b=$('#sound-button');b.setAttribute('aria-pressed',String(soundOn));b.setAttribute('aria-label',soundOn?'Matikan bunyi':'Hidupkan bunyi');b.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 5 6 9H3v6h3l5 4V5Z"/>${soundOn?'<path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>':'<path d="m16 9 5 6m0-6-5 6"/>'}</svg>`;}
$('#sound-button').addEventListener('click',()=>{soundOn=!soundOn;updateSound();sound();});updateSound();
const helpPages=[
  ['Misi pasukan','<p><b>4–8 pemain · 1 peranti · 3 pusingan.</b></p><p>Tekan dan tahan untuk melihat peranan rahsia, kemudian serahkan peranti mengikut nama.</p><p><b>Krew menang:</b> bateri 100% atau penyamar disingkirkan.</p><p><b>Penyamar menang:</b> bateri 0% atau kekal selepas undian pusingan ketiga.</p>'],
  ['Tugasan rahsia','<p>Setiap giliran mengambil <b>20 saat</b>.</p><p><b>Krew:</b> jawab 3 soalan sifir. Tiga jawapan betul memberi bonus kombo.</p><p><b>Penyamar:</b> cari nombor yang bukan gandaan untuk mengurangkan bateri.</p><p>Tunggu sehingga masa tamat sebelum menyerahkan peranti.</p>'],
  ['Bincang & undi','<p>Semak bateri dan petunjuk bersama, kemudian bincang sehingga <b>90 saat</b>.</p><p>Setiap pemain aktif mengundi seorang pemain lain atau memilih <b>Langkau</b>. Undi diri sendiri tidak dibenarkan.</p><p>Undi seri atau Langkau terbanyak: tiada penyingkiran.</p><p>Pemain tersingkir menjadi pemerhati.</p>'],
  ['Cas bateri','<p>Bateri mula pada <b>50%</b>. Cas maksimum semua krew aktif ialah <b>+45%</b> setiap pusingan, dibahagikan sama rata.</p><p>Setiap jawapan betul memberi satu bahagian cas. Kombo 3/3 memberi dua bahagian tambahan.</p><p>Sabotaj berjaya <b>−25%</b>; tersilap <b>+5%</b>; tiada jawapan <b>0%</b>.</p><p>Perubahan dikira serentak pada akhir pusingan.</p>']
];
function renderHelp(){const [title,body]=helpPages[helpPage];$('#help-title').textContent=title;$('#help-body').innerHTML=body;$('#help-page').textContent=`${helpPage+1} / ${helpPages.length}`;$('#help-prev').disabled=helpPage===0;$('#help-next').textContent=helpPage===helpPages.length-1?'Selesai':'Seterusnya';}
$('#help-button').addEventListener('click',()=>{helpPage=0;renderHelp();$('#help-dialog').showModal();});
$('#close-help').addEventListener('click',()=>$('#help-dialog').close());
$('#help-prev').addEventListener('click',()=>{if(helpPage>0){helpPage--;renderHelp();}});
$('#help-next').addEventListener('click',()=>{if(helpPage===helpPages.length-1)$('#help-dialog').close();else{helpPage++;renderHelp();}});

function avatar(p,cls='big-avatar'){return `<img class="${cls}" src="${avatarURLs[p.id%8]}" alt="" draggable="false">`;}
function roster(){return game?game.players:names.map((name,id)=>({id,name,alive:true,color:COLORS[id]}));}
function syncRoster(){station?.scene.setRoster(roster());}
function stopClock(){clearInterval(clock);clock=null;epoch++;}
function header(title,subtitle,badge){$('#page-title').textContent=title;$('#page-badge').textContent=badge;}
function base(next,{privateView=false}={}){
  hideRole();stopClock();answerInput.cancel();screen=next;document.body.dataset.screen=next;$('#layout').className='layout'+(privateView?' private-mode':next==='LOBBY'?' lobby-mode':' shared-play');
  $('#help-button').disabled=privateView;
  $('#sound-button').disabled=privateView;
  const scene=station?.scene;
  if(scene?.ready){if(privateView)scene.scene.pause();else{scene.scene.resume();syncRoster();}}
  $('#station-meta').textContent=game?`PUSINGAN ${game.round} / 3`:'LOBI · MENUNGGU KREW';
  $('.safety-curtain')?.remove();
  if(!privateView)requestAnimationFrame(()=>station?.game.scale.refresh());
}
function persist(){try{localStorage.setItem('sifir-kami-config',JSON.stringify({names,tables}));}catch{}}
function renderLobby(){
  base('LOBBY');header('Sediakan misi','','4–8 pemain');
  crewPage=Math.min(crewPage,Math.floor((names.length-1)/4));
  const players=names.map((name,id)=>({name,id})).slice(crewPage*4,crewPage*4+4);
  panel.innerHTML=`<section class="panel lobby-panel"><nav class="setup-tabs" aria-label="Tetapan misi"><button data-action="setup-step" data-step="0" aria-current="${lobbyStep===0?'step':'false'}">1 · Krew</button><button data-action="setup-step" data-step="1" aria-current="${lobbyStep===1?'step':'false'}">2 · Sifir</button></nav><div class="setup-content">${lobbyStep===0?`<div class="section-title"><h2>Siapa bermain?</h2><span class="counter">${names.length}/8</span></div><div class="player-grid">${players.map(({name,id})=>`<div class="player-field">${avatar({id},'avatar-small')}<input data-name="${id}" type="text" maxlength="20" value="${escapeHTML(name)}" aria-label="Nama pemain ${id+1}" autocomplete="off" spellcheck="false">${names.length>4?`<button class="remove-player" data-action="remove" data-id="${id}" aria-label="Buang pemain ${id+1}" type="button">×</button>`:''}</div>`).join('')}</div><div class="crew-controls">${names.length<8?'<button class="add-player" data-action="add">＋ Tambah krew</button>':'<span class="counter">Pasukan lengkap</span>'}${names.length>4?`<div class="pager"><button data-action="crew-prev" aria-label="Krew sebelum" ${crewPage===0?'disabled':''}>‹</button><span>${crewPage+1}/2</span><button data-action="crew-next" aria-label="Krew seterusnya" ${crewPage===1?'disabled':''}>›</button></div>`:''}</div>`:`<div class="section-title"><h2>Sifir misi</h2><span class="counter">${tables.length} dipilih</span></div><div class="presets"><button class="preset" data-action="preset" data-preset="basic">Asas</button><button class="preset" data-action="preset" data-preset="hard">Zon sukar</button><button class="preset" data-action="preset" data-preset="all">Semua</button></div><div class="tables">${Array.from({length:12},(_,i)=>i+1).map(n=>`<button class="table-toggle" data-action="table" data-table="${n}" aria-pressed="${tables.includes(n)}" aria-label="Sifir ${n}">${n}</button>`).join('')}</div><p class="hint">Pilih sekurang-kurangnya 2 sifir.</p>`}</div><div class="setup-actions"><p id="lobby-error" class="error" role="status"></p><button id="start-button" class="primary" data-action="${lobbyStep===0?'setup-next':'start'}">${lobbyStep===0?'Pilih sifir →':'Mula misi'}</button></div></section>`;
  validateLobby();syncRoster();fitViewport();
}
function validateLobby(){const error=validateConfig(names,lobbyStep===0?[2,3]:tables);$('#lobby-error').textContent=error;$('#start-button').disabled=!!error;}
function dots(current,total){return `<div class="progress-dots" aria-label="${current} daripada ${total}">${Array.from({length:total},(_,i)=>`<span class="progress-dot ${i<current?'done':''}"></span>`).join('')}</div>`;}
function renderRole(){
  base('ROLE',{privateView:true});hasSeenRole=false;const p=game.players[roleIndex];
  header('Peranan rahsia','',`${roleIndex+1} / ${game.players.length}`);
  panel.innerHTML=`<section class="panel private-card"><div class="eyebrow">Serahkan peranti kepada</div>${avatar(p)}<h2>${escapeHTML(p.name)}</h2><div id="role-zone" class="role-zone"><div><div class="lock-icon">◇</div><p>Peranan kamu dikunci</p></div></div><button id="hold-role" class="primary hold-button">Tekan & tahan untuk lihat</button><button id="role-next" class="secondary" data-action="role-next" disabled>Saya faham · Tutup & serahkan</button>${dots(roleIndex,game.players.length)}</section>`;
  const b=$('#hold-role');
  b.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();b.setPointerCapture(e.pointerId);showRole();});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>b.addEventListener(type,hideRole));
  b.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();showRole();}});
  b.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();hideRole();}});
  b.addEventListener('blur',hideRole);b.addEventListener('contextmenu',e=>e.preventDefault());
}
function showRole(){if(screen!=='ROLE')return;holding=true;hasSeenRole=true;const spy=game.players[roleIndex].role==='IMPOSTOR';$('#role-zone').className='role-zone revealed'+(spy?' spy':'');$('#role-zone').innerHTML=`<div><div class="role-title">${spy?'Kamu penyamar!':'Kamu krew angkasa!'}</div><p>${spy?'Cari nombor yang BUKAN gandaan untuk mensabotaj kapal. Rahsiakan identiti hingga akhir pusingan 3.':'Jawab sifir untuk mengecas kapal. Bincang dengan rakan dan kesan siapa penyamarnya.'}</p></div>`;$('#role-next').disabled=true;}
function hideRole(){holding=false;const z=$('#role-zone');if(z){z.className='role-zone';z.innerHTML='<div><div class="lock-icon">◇</div><p>Peranan kamu dikunci</p></div>';if($('#role-next'))$('#role-next').disabled=!hasSeenRole;}}
function beginRound(){turnOrder=shuffled(livePlayers(game).map(p=>p.id));turnIndex=0;renderTransit();}
function currentPlayer(){return game.players.find(p=>p.id===turnOrder[turnIndex]);}
function renderTransit(){
  base('TRANSIT',{privateView:true});const p=currentPlayer();header('Giliran krew','',`Pusingan ${game.round} / 3`);
  panel.innerHTML=`<section class="panel private-card"><div class="eyebrow">Serahkan peranti · ${turnIndex+1}/${turnOrder.length}</div>${avatar(p)}<h2>${escapeHTML(p.name)}</h2><p>Hanya kamu boleh melihat skrin.<br><b>20 saat</b> untuk tugasan ini.</p><button class="primary bottom-action" data-action="task-start">Saya sedia</button></section>`;
}
function startTask(){
  base('TASK',{privateView:true});const p=currentPlayer();task={deadline:Date.now()+20000,question:null,step:0,correct:0,answered:0,locked:false,done:false,success:null,lastTable:null,intruder:null};
  header('Modul tenaga','Selesaikan tugasan kamu sebelum masa tamat.',`Pusingan ${game.round} / 3`);
  panel.innerHTML=`<section class="panel task-panel"><div class="task-header"><span>${escapeHTML(p.name)}</span><span id="task-timer" class="timer-pill" role="timer">20s</span></div><div class="timer-track"><span id="time-fill"></span></div><div id="task-body"></div></section>`;
  drawQuestion();tickTask();clock=setInterval(tickTask,100);
}
function drawQuestion(){
  const spy=currentPlayer().role==='IMPOSTOR';
  task.question=spy?impostorQuestion(game.tables):crewQuestion(game.tables);
  const q=task.question;task.locked=false;questionId++;answerInput.reset(questionId);
  document.activeElement?.blur();
  $('#task-body').innerHTML=`<div class="task-kicker">${spy?'Pilih nombor BUKAN gandaan':`Soalan ${task.step+1} / 3`}</div><div class="math-prompt" aria-live="polite">${spy?`Sifir ${q.table}`:`${q.table} × ${q.multiplier} = ?`}</div><div class="answer-grid">${q.options.map(n=>`<button class="answer" data-action="answer" data-question="${questionId}" data-value="${n}">${n}</button>`).join('')}</div><div class="feedback" role="status"></div>`;
  if(document.documentElement.dataset.input==='keyboard')panel.querySelector('.answer')?.focus({preventScroll:true});
}
function tickTask(){if(screen!=='TASK'||!task)return;const left=Math.max(0,task.deadline-Date.now());$('#task-timer').textContent=`${Math.ceil(left/1000)}s`;$('#task-timer').classList.toggle('urgent',left<5000);$('#time-fill').style.width=`${left/200}%`;if(left<=0)finishTask();}
function answer(value){
  if(screen!=='TASK'||task.locked||task.done)return;
  if(Date.now()>=task.deadline){finishTask();return;}
  task.locked=true;answerInput.cancel();task.answered++;const q=task.question,correct=value===q.answer,spy=currentPlayer().role==='IMPOSTOR';
  if(correct)task.correct++;
  if(spy){task.success=correct;task.lastTable=q.table;task.intruder=q.answer;}
  panel.querySelectorAll('.answer').forEach(b=>{b.disabled=true;const n=Number(b.dataset.value);if(n===q.answer)b.classList.add('correct');else if(n===value)b.classList.add('wrong');});
  $('.feedback').textContent=spy?(correct?'Nombor sesat ditemui. Arahan diterima.':`Nombor sesat ialah ${q.answer}.`):(correct?'Tepat! Cas tenaga direkodkan.':`Jawapannya ${q.table} × ${q.multiplier} = ${q.answer}.`);
  const token=epoch;
  setTimeout(()=>{if(token!==epoch||screen!=='TASK')return;task.step++;if(spy||task.step===3){task.done=true;neutralTask();}else drawQuestion();},850);
}
function neutralTask(){$('#task-body').innerHTML='<div class="task-end-neutral"><div class="orbit-symbol">✦</div><h2>Tugasan selesai</h2><p>Tunggu sehingga giliran tamat.</p></div>';}
function finishTask(){
  if(screen!=='TASK')return;
  recordTurn(game,currentPlayer().id,{correct:task.correct,answered:task.answered,success:task.success,table:task.lastTable,intruder:task.intruder});
  task=null;base('TURN_END',{privateView:true});header('Giliran selesai','Rahsiakan apa yang kamu lihat.',`Pusingan ${game.round} / 3`);
  panel.innerHTML=`<section class="panel private-card"><div class="orbit-symbol">✧</div><h2>Modul disimpan</h2><p>Paparan kini selamat untuk dikongsi.<br>${turnIndex+1<turnOrder.length?'Serahkan peranti kepada pemain seterusnya.':'Letakkan peranti di tengah untuk tatapan bersama.'}</p><div style="margin-top:30px"><button class="primary" data-action="turn-next">${turnIndex+1<turnOrder.length?'Pemain seterusnya':'Periksa keadaan kapal'}</button></div></section>`;
}
function batteryPanel(){const h=game.history.at(-1);return `<div class="battery-row"><span>Bateri kapal</span><span class="battery-number">${fmt(game.battery)}%</span></div><div class="battery-bar" role="progressbar" aria-label="Bateri kapal" aria-valuenow="${game.battery}" aria-valuemin="0" aria-valuemax="100"><div class="battery-fill ${game.battery<25?'low':''}" style="width:${game.battery}%"></div></div><p class="battery-change">${h?`${fmt(h.before)}% → ${fmt(h.after)}%`:'50%'} <span class="muted">· Sasaran 100%</span></p>`;}
function renderCommand(){
  base('COMMAND');header('Laporan kapal','',`Pusingan ${game.round} / 3`);
  panel.innerHTML=`<section class="panel command-panel">${batteryPanel()}<div class="log-list">${game.logs.map(l=>`<div class="log ${l.kind}"><span class="log-icon">${l.kind==='warn'?'⚠':'✧'}</span><span>${escapeHTML(l.text)}</span></div>`).join('')}</div><button class="primary bottom-action" data-action="${game.winner?'game-over':'meeting'}">${game.winner?'Keputusan misi':'Bincang & undi'}</button></section>`;
}
function renderMeeting(){
  base('MEETING');header('Mesyuarat krew','',`Pusingan ${game.round} / 3`);meetingDeadline=Date.now()+90000;
  panel.innerHTML=`<section class="panel meeting-panel"><h2>Siapa penyamarnya?</h2><div id="meeting-timer" class="meeting-timer" role="timer">1:30</div><p>Bincang petunjuk bersama.<br>Setiap pemain mendapat satu undi rahsia.</p><button class="primary bottom-action" data-action="voting">Kami sedia mengundi</button></section>`;
  clock=setInterval(()=>{if(screen!=='MEETING')return;const n=Math.max(0,Math.ceil((meetingDeadline-Date.now())/1000));$('#meeting-timer').textContent=`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;if(n===0)startVoting();},250);
}
function startVoting(){game.votes={};voterOrder=livePlayers(game).map(p=>p.id);voterIndex=0;renderVoteTransit();}
function voter(){return game.players.find(p=>p.id===voterOrder[voterIndex]);}
function renderVoteTransit(){
  base('VOTE_TRANSIT',{privateView:true});header('Undian rahsia','Serahkan peranti. Pemain lain tidak boleh melihat pilihan.',`Undi ${voterIndex+1} / ${voterOrder.length}`);const p=voter();
  panel.innerHTML=`<section class="panel private-card"><div class="eyebrow">Serahkan peranti kepada</div>${avatar(p)}<h2>${escapeHTML(p.name)}</h2><p>Pilih seorang suspek atau langkau undian.<br>Fikir dahulu sebelum membuat keputusan.</p><div style="margin-top:28px"><button class="primary" data-action="vote-open">Saya sedia mengundi</button></div>${dots(voterIndex,voterOrder.length)}</section>`;
}
function renderVote(){
  base('VOTE',{privateView:true});selectedVote=null;header('Undian rahsia','',`${voterIndex+1} / ${voterOrder.length}`);
  panel.innerHTML=`<section class="panel vote-panel"><div class="eyebrow">Pengundi: ${escapeHTML(voter().name)}</div><h2>Pilih seorang suspek</h2><div class="vote-grid">${voteCandidates(game,voter().id).map(p=>`<button class="vote-option" data-action="vote-select" data-id="${p.id}" aria-pressed="false">${avatar(p,'avatar-small')}<span>${escapeHTML(p.name)}</span></button>`).join('')}<button class="vote-option skip" data-action="vote-select" data-id="skip" aria-pressed="false">Langkau undian</button></div><button id="vote-confirm" class="primary bottom-action" data-action="vote-confirm" disabled>Sahkan undi</button></section>`;
}
function confirmVote(){
  if(screen!=='VOTE'||selectedVote===null||!canVoteFor(game,voter().id,selectedVote))return;castVote(game,voter().id,selectedVote);
  base('VOTE_SAVED',{privateView:true});header('Undi disimpan','Paparan selamat untuk diserahkan.',`Undi ${voterIndex+1} / ${voterOrder.length}`);
  panel.innerHTML=`<section class="panel private-card"><div class="orbit-symbol">✓</div><h2>Terima kasih, krew</h2><p>${voterIndex+1<voterOrder.length?'Serahkan peranti untuk undian seterusnya.':'Semua undi sudah diterima. Letakkan peranti di tengah.'}</p><div style="margin-top:25px"><button class="primary" data-action="vote-next">${voterIndex+1<voterOrder.length?'Pengundi seterusnya':'Lihat keputusan undian'}</button></div></section>`;
}
function renderVoteResult(){
  base('VOTE_RESULT');const r=lastVoteResult,p=r.eliminated;
  header('Keputusan undian','',`Pusingan ${game.round} / 3`);
  panel.innerHTML=`<section class="panel private-card">${p?avatar(p):'<div class="orbit-symbol">◇</div>'}<h2>${p?escapeHTML(p.name):'Tiada penyingkiran'}</h2><p>${p?(p.role==='IMPOSTOR'?'Dia ialah PENYAMAR! Pasukan kamu berjaya.':'Dia ialah KREW ANGKASA. Kini menjadi pemerhati misi.'):(r.tied?'Undian seri. Semua pemain kekal aktif.':'Pasukan memilih untuk melangkau undian.')}</p><div class="result-list">${Object.entries(r.counts).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).map(([id,n])=>`<div class="result-row"><span>${id==='skip'?'Langkau':escapeHTML(game.players.find(p=>p.id===Number(id)).name)}</span><b>${n} undi</b></div>`).join('')}</div><button class="primary" data-action="${game.winner?'game-over':'round-next'}">${game.winner?'Lihat keputusan misi':'Teruskan pusingan seterusnya'}</button></section>`;
}
function renderGameOver(){
  base('GAME_OVER');const crew=game.winner==='CREW',spy=game.players.find(p=>p.role==='IMPOSTOR');
  const total=game.history.reduce((s,h)=>s+h.total,0),correct=game.history.reduce((s,h)=>s+h.correct,0);
  header('Misi selesai','',crew?'Krew menang':'Penyamar menang');
  panel.innerHTML=`<section class="panel private-card game-over-panel"><h2>${crew?'Hebat, pasukan!':'Liciknya penyamar!'}</h2><p>${escapeHTML(game.reason)}</p>${avatar(spy)}<p><b style="color:var(--red)">${escapeHTML(spy.name)}</b> ialah penyamar.</p><div class="stats-grid"><div class="stat"><strong>${fmt(game.battery)}%</strong><span>Bateri akhir</span></div><div class="stat"><strong>${correct}/${total}</strong><span>Sifir betul</span></div><div class="stat"><strong>${game.round}/3</strong><span>Pusingan</span></div></div><div class="end-actions"><button class="primary" data-action="replay">Main semula</button><button class="secondary" data-action="lobby">Ubah pasukan & sifir</button></div></section>`;
  station?.scene.celebrate();
}
function startGame(){const err=validateConfig(names,tables);if(err)return;persist();game=newGame(names,tables);roleIndex=0;renderRole();}

panel.addEventListener('input',e=>{if(e.target.matches('[data-name]')){names[Number(e.target.dataset.name)]=e.target.value;validateLobby();syncRoster();}});
let lastPointerAt=-Infinity;
function clearPressed(){panel.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
document.addEventListener('pointerdown',()=>{lastPointerAt=Date.now();document.documentElement.dataset.input='pointer';});
document.addEventListener('keydown',e=>{if(['Tab','Enter',' '].includes(e.key))document.documentElement.dataset.input='keyboard';});
panel.addEventListener('pointerdown',e=>{
  const b=e.target.closest('.answer');if(!b||b.disabled||e.button!==0||screen!=='TASK'||task.locked)return;
  if(answerInput.press(Number(b.dataset.question),b.dataset.value,e.pointerId))b.classList.add('pressed');
});
panel.addEventListener('pointerup',e=>{
  const b=e.target.closest('.answer');
  if(b&&!b.disabled&&answerInput.release(Number(b.dataset.question),b.dataset.value,e.pointerId)){e.preventDefault();sound();answer(Number(b.dataset.value));}
});
document.addEventListener('pointerup',()=>{clearPressed();answerInput.cancel();});
document.addEventListener('pointercancel',()=>{clearPressed();answerInput.cancel();});
panel.addEventListener('keydown',e=>{if(e.target.matches('.answer')&&e.repeat&&(e.key==='Enter'||e.key===' '))e.preventDefault();});
panel.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const action=b.dataset.action;
  if(action==='answer'){
    // Pointer answers are handled on release. Click remains for keyboard/AT only.
    if(e.detail===0&&!e.pointerType&&Date.now()-lastPointerAt>350){sound();answer(Number(b.dataset.value));}
    return;
  }
  sound();
  switch(action){
    case 'setup-step':lobbyStep=Number(b.dataset.step);renderLobby();break;
    case 'setup-next':lobbyStep=1;renderLobby();break;
    case 'crew-prev':crewPage=0;renderLobby();break;
    case 'crew-next':crewPage=1;renderLobby();break;
    case 'add':if(names.length<8){names.push(`Krew ${names.length+1}`);crewPage=Math.floor((names.length-1)/4);renderLobby();}break;
    case 'remove':if(names.length>4){names.splice(Number(b.dataset.id),1);renderLobby();}break;
    case 'table':{const n=Number(b.dataset.table);tables=tables.includes(n)?tables.filter(t=>t!==n):[...tables,n].sort((a,b)=>a-b);renderLobby();break;}
    case 'preset':tables=b.dataset.preset==='basic'?[2,5,10]:b.dataset.preset==='hard'?[6,7,8,9]:Array.from({length:12},(_,i)=>i+1);renderLobby();break;
    case 'start':startGame();break;
    case 'role-next':if(!hasSeenRole||holding)return;roleIndex++;if(roleIndex<game.players.length)renderRole();else beginRound();break;
    case 'task-start':startTask();break;
    case 'turn-next':turnIndex++;if(turnIndex<turnOrder.length)renderTransit();else{settleRound(game);renderCommand();}break;
    case 'meeting':renderMeeting();break;
    case 'voting':startVoting();break;
    case 'vote-open':renderVote();break;
    case 'vote-select':if(!canVoteFor(game,voter().id,b.dataset.id))return;selectedVote=b.dataset.id;panel.querySelectorAll('.vote-option').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));$('#vote-confirm').disabled=false;break;
    case 'vote-confirm':confirmVote();break;
    case 'vote-next':voterIndex++;if(voterIndex<voterOrder.length)renderVoteTransit();else{lastVoteResult=voteResult(game);renderVoteResult();}break;
    case 'round-next':nextRound(game);beginRound();break;
    case 'game-over':renderGameOver();break;
    case 'replay':startGame();break;
    case 'lobby':game=null;lobbyStep=0;crewPage=0;renderLobby();break;
  }
});

function curtain(){
  hideRole();answerInput.cancel();clearPressed();
  if(!['TASK','VOTE'].includes(screen)||$('.safety-curtain'))return;
  const c=document.createElement('div');c.className='safety-curtain';c.innerHTML='<div class="orbit-symbol">◇</div><h2>Paparan dilindungi</h2><p>Pastikan peranti masih dengan pemain yang sama.<br>Masa tugasan terus berjalan.</p><button class="primary">Buka semula paparan</button>';
  c.querySelector('button').addEventListener('click',()=>{c.remove();if(screen==='TASK')tickTask();});document.body.append(c);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)curtain();else if(screen==='TASK')tickTask();});
window.addEventListener('blur',()=>{hideRole();answerInput.cancel();clearPressed();if(screen==='TASK'||screen==='VOTE')curtain();});
window.addEventListener('pagehide',hideRole);
window.addEventListener('beforeunload',e=>{if(game&&screen!=='GAME_OVER'){e.preventDefault();e.returnValue='';}});

function fitViewport(){
  const height=window.visualViewport?.height??window.innerHeight;
  document.documentElement.style.setProperty('--app-height',`${Math.round(height)}px`);
  document.body.classList.toggle('editing-name',document.activeElement?.matches('[data-name]')??false);
}
window.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('resize',fitViewport);
document.addEventListener('focusin',fitViewport);document.addEventListener('focusout',()=>requestAnimationFrame(fitViewport));
fitViewport();renderLobby();station=startStation($('#stage'),s=>{s.setRoster(roster());if($('#layout').classList.contains('private-mode'))s.scene.pause();});
if('serviceWorker' in navigator){
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing&&['LOBBY','GAME_OVER'].includes(screen)){refreshing=true;location.reload();}});
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{}));
}
