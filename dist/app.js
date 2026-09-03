import {COLORS,DEFAULT_NAMES,validateConfig,newGame,livePlayers,crewQuestion,impostorQuestion,recordTurn,settleRound,voteResult,nextRound,shuffled} from './game.js';
import {avatarURLs,startStation} from './scene.js';

const $=s=>document.querySelector(s);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n.toFixed(1)).toLocaleString('ms-MY');
let names=[...DEFAULT_NAMES],tables=[2,3,4,5];
try {const saved=JSON.parse(localStorage.getItem('sifir-kami-config'));if(saved&&!validateConfig(saved.names,saved.tables)){names=saved.names;tables=saved.tables;}} catch {}
let game=null,screen='LOBBY',roleIndex=0,turnIndex=0,turnOrder=[],voterIndex=0,voterOrder=[],selectedVote=null,hasSeenRole=false,holding=false,task=null,clock=null,epoch=0,meetingDeadline=0,lastVoteResult=null,soundOn=false,audioCtx=null,station=null;
const app=$('#app');
app.innerHTML=`<div class="page-intro"><div><h1 id="page-title">Semua krew, bersedia?</h1><p id="page-subtitle">Selesaikan sifir. Cari penyamar. Selamatkan kapal.</p></div><span id="page-badge" class="outline-badge">✧ &nbsp; Misi baharu</span></div><div id="layout" class="layout"><div id="visual-column"><div class="station-panel"><div class="station-toolbar"><span><i class="status-orb"></i><span id="station-title">STESEN KAMI</span></span><span id="station-meta" class="muted">LOBI · MENUNGGU KREW</span></div><div id="stage" role="img" aria-label="Stesen angkasa dengan watak krew comel yang bergerak"></div><div class="stage-bottom"><span>✦ &nbsp; Ketik lantai untuk menggerakkan krew</span><span id="stage-crew-count">4 krew di stesen</span></div></div><div class="game-facts"><div class="fact"><span class="fact-icon">♧</span><div><b>4–8 pemain</b><small>Main bersama rakan</small></div></div><div class="fact"><span class="fact-icon">▣</span><div><b>1 peranti</b><small>Serah ikut giliran</small></div></div><div class="fact"><span class="fact-icon">◷</span><div><b>3 pusingan</b><small>Satu misi rahsia</small></div></div></div><div class="tiny-note"><span>✧</span><span>Ada seorang penyamar dalam pasukan kamu.<br>Siapa yang boleh dipercayai?</span></div></div><div id="mission-panel"></div></div>`;
const panel=$('#mission-panel');

function sound(){if(!soundOn)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);o.type='sine';o.frequency.setValueAtTime(620,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(420,audioCtx.currentTime+.08);g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.1);o.start();o.stop(audioCtx.currentTime+.11);}catch{}}
function updateSound(){const b=$('#sound-button');b.setAttribute('aria-pressed',String(soundOn));b.setAttribute('aria-label',soundOn?'Matikan bunyi':'Hidupkan bunyi');b.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 5 6 9H3v6h3l5 4V5Z"/>${soundOn?'<path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>':'<path d="m16 9 5 6m0-6-5 6"/>'}</svg>`;}
$('#sound-button').addEventListener('click',()=>{soundOn=!soundOn;updateSound();sound();});updateSound();
$('#help-button').addEventListener('click',()=>$('#help-dialog').showModal());
$('#close-help').addEventListener('click',()=>$('#help-dialog').close());

function avatar(p,cls='big-avatar'){return `<img class="${cls}" src="${avatarURLs[p.id%8]}" alt="" draggable="false">`;}
function roster(){return game?game.players:names.map((name,id)=>({id,name,alive:true,color:COLORS[id]}));}
function syncRoster(){station?.scene.setRoster(roster());$('#stage-crew-count').textContent=`${names.length} krew di stesen`;}
function stopClock(){clearInterval(clock);clock=null;epoch++;}
function header(title,subtitle,badge){$('#page-title').textContent=title;$('#page-subtitle').textContent=subtitle;$('#page-badge').textContent=badge;}
function base(next,{privateView=false}={}){
  hideRole();stopClock();screen=next;$('#layout').className='layout'+(privateView?' private-mode':next==='LOBBY'?'':' shared-play');
  $('#help-button').disabled=privateView;
  $('#sound-button').disabled=privateView;
  const scene=station?.scene;
  if(scene?.ready){if(privateView)scene.scene.pause();else{scene.scene.resume();syncRoster();}}
  $('#station-meta').textContent=game?`PUSINGAN ${game.round} / 3`:'LOBI · MENUNGGU KREW';
  $('.safety-curtain')?.remove();
}
function persist(){try{localStorage.setItem('sifir-kami-config',JSON.stringify({names,tables}));}catch{}}
function renderLobby(){
  base('LOBBY');header('Semua krew, bersedia?','Selesaikan sifir. Cari penyamar. Selamatkan kapal.','✧  Misi baharu');
  panel.innerHTML=`<section class="panel"><div class="section-title"><h3><span class="step">1</span> Kenalkan krew</h3><span class="counter">${names.length}/8 pemain</span></div><div class="player-grid">${names.map((name,id)=>`<label class="player-field">${avatar({id},'avatar-small')}<input data-name="${id}" type="text" maxlength="20" value="${escapeHTML(name)}" aria-label="Nama pemain ${id+1}" autocomplete="off" spellcheck="false">${names.length>4?`<button class="remove-player" data-action="remove" data-id="${id}" aria-label="Buang pemain ${id+1}" type="button">×</button>`:''}</label>`).join('')}${names.length<8?'<button class="add-player" data-action="add">＋ Tambah krew</button>':''}</div></section><section class="panel"><div class="section-title"><h3><span class="step">2</span> Pilih sifir misi</h3><span class="counter">${tables.length} dipilih</span></div><div class="presets"><button class="preset" data-action="preset" data-preset="basic">Asas · 2, 5, 10</button><button class="preset" data-action="preset" data-preset="hard">Zon sukar</button><button class="preset" data-action="preset" data-preset="all">Semua</button></div><div class="tables">${Array.from({length:12},(_,i)=>i+1).map(n=>`<button class="table-toggle" data-action="table" data-table="${n}" aria-pressed="${tables.includes(n)}" aria-label="Sifir ${n}">${n}</button>`).join('')}</div><p class="hint">Pilih sekurang-kurangnya 2 sifir untuk misi kamu.</p></section><div class="start-area"><p id="lobby-error" class="error" role="status"></p><button id="start-button" class="primary" data-action="start">Mula misi <span aria-hidden="true">↗</span></button><p class="hint">Peranan rahsia akan diberikan selepas ini.</p></div>`;
  validateLobby();syncRoster();
}
function validateLobby(){const error=validateConfig(names,tables);$('#lobby-error').textContent=error;$('#start-button').disabled=!!error;}
function dots(current,total){return `<div class="progress-dots" aria-label="${current} daripada ${total}">${Array.from({length:total},(_,i)=>`<span class="progress-dot ${i<current?'done':''}"></span>`).join('')}</div>`;}
function renderRole(){
  base('ROLE',{privateView:true});hasSeenRole=false;const p=game.players[roleIndex];
  header('Kenali peranan kamu','Satu rahsia kecil. Satu tanggungjawab besar.',`${roleIndex+1} / ${game.players.length}`);
  panel.innerHTML=`<section class="panel private-card"><div class="eyebrow">Serahkan peranti kepada</div>${avatar(p)}<h2>${escapeHTML(p.name)}</h2><p>Pastikan hanya kamu melihat skrin ini.</p><div id="role-zone" class="role-zone"><div><div class="lock-icon">◇</div><p>Peranan kamu dikunci</p></div></div><button id="hold-role" class="primary hold-button">Tekan & tahan untuk lihat</button><button id="role-next" class="secondary" data-action="role-next" disabled>Saya faham · Tutup & serahkan</button>${dots(roleIndex,game.players.length)}</section>`;
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
  base('TRANSIT',{privateView:true});const p=currentPlayer();header('Masa menjalankan tugas','Serahkan peranti mengikut nama pada skrin.',`Pusingan ${game.round} / 3`);
  panel.innerHTML=`<section class="panel private-card"><div class="eyebrow">Giliran ${turnIndex+1} daripada ${turnOrder.length}</div>${avatar(p)}<h2>${escapeHTML(p.name)}</h2><p>Pastikan rakan lain tidak mengintai.<br>Kamu ada <b>20 saat</b> untuk tugasan ini.</p><div class="role-zone"><div><div class="orbit-symbol">×</div><p>Semua sedia? Misi kamu bermula sekarang.</p></div></div><button class="primary" data-action="task-start">Saya sedia</button></section>`;
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
  const q=task.question;task.locked=false;
  $('#task-body').innerHTML=`<div class="task-kicker">${spy?'Imbas modul':'Cas modul'} · ${spy?'Nombor sesat':`Soalan ${task.step+1} / 3`}</div><h2 class="task-title">${spy?'Pilih nombor BUKAN gandaan.':'Pilih jawapan yang betul.'}</h2><p class="muted">${spy?'Cari satu nombor yang tidak sepadan.':'Setiap jawapan betul mengecas bateri.'}</p><div class="math-prompt">${spy?`Sifir ${q.table}`:`${q.table} × ${q.multiplier} = ?`}</div><div class="answer-grid">${q.options.map(n=>`<button class="answer" data-action="answer" data-value="${n}">${n}</button>`).join('')}</div><div class="feedback" role="status"></div>`;
}
function tickTask(){if(screen!=='TASK'||!task)return;const left=Math.max(0,task.deadline-Date.now());$('#task-timer').textContent=`${Math.ceil(left/1000)}s`;$('#task-timer').classList.toggle('urgent',left<5000);$('#time-fill').style.width=`${left/200}%`;if(left<=0)finishTask();}
function answer(value){
  if(screen!=='TASK'||task.locked||task.done)return;
  if(Date.now()>=task.deadline){finishTask();return;}
  task.locked=true;task.answered++;const q=task.question,correct=value===q.answer,spy=currentPlayer().role==='IMPOSTOR';
  if(correct)task.correct++;
  if(spy){task.success=correct;task.lastTable=q.table;task.intruder=q.answer;}
  panel.querySelectorAll('.answer').forEach(b=>{b.disabled=true;const n=Number(b.dataset.value);if(n===q.answer)b.classList.add('correct');else if(n===value)b.classList.add('wrong');});
  $('.feedback').textContent=spy?(correct?'Nombor sesat ditemui. Arahan diterima.':`Nombor sesat ialah ${q.answer}.`):(correct?'Tepat! Cas tenaga direkodkan.':`Jawapannya ${q.table} × ${q.multiplier} = ${q.answer}.`);
  const token=epoch;
  setTimeout(()=>{if(token!==epoch||screen!=='TASK')return;task.step++;if(spy||task.step===3){task.done=true;neutralTask();}else drawQuestion();},850);
}
function neutralTask(){$('#task-body').innerHTML='<div class="task-end-neutral"><div class="orbit-symbol">✦</div><h2>Arahan diterima</h2><p>Sistem sedang menyegerakkan modul.<br>Tunggu sehingga giliran tamat.</p></div>';}
function finishTask(){
  if(screen!=='TASK')return;
  recordTurn(game,currentPlayer().id,{correct:task.correct,answered:task.answered,success:task.success,table:task.lastTable,intruder:task.intruder});
  task=null;base('TURN_END',{privateView:true});header('Giliran selesai','Rahsiakan apa yang kamu lihat.',`Pusingan ${game.round} / 3`);
  panel.innerHTML=`<section class="panel private-card"><div class="orbit-symbol">✧</div><h2>Modul disimpan</h2><p>Paparan kini selamat untuk dikongsi.<br>${turnIndex+1<turnOrder.length?'Serahkan peranti kepada pemain seterusnya.':'Letakkan peranti di tengah untuk tatapan bersama.'}</p><div style="margin-top:30px"><button class="primary" data-action="turn-next">${turnIndex+1<turnOrder.length?'Pemain seterusnya':'Periksa keadaan kapal'}</button></div></section>`;
}
function batteryPanel(){const h=game.history.at(-1);return `<div class="battery-row"><span>Bateri kapal</span><span class="battery-number">${fmt(game.battery)}%</span></div><div class="battery-bar" role="progressbar" aria-label="Bateri kapal" aria-valuenow="${game.battery}" aria-valuemin="0" aria-valuemax="100"><div class="battery-fill ${game.battery<25?'low':''}" style="width:${game.battery}%"></div></div><p class="battery-change">${h?`${fmt(h.before)}% → ${fmt(h.after)}%`:'50%'} <span class="muted">· Sasaran 100%</span></p>`;}
function renderCommand(){
  base('COMMAND');header('Apa jadi pada kapal kita?','Lihat petunjuk bersama. Perhatikan perkara yang mencurigakan.',`Pusingan ${game.round} / 3`);
  panel.innerHTML=`<section class="panel"><div class="eyebrow">Pusat kawalan</div><h2>Laporan pusingan ${game.round}</h2>${batteryPanel()}<h3>Log kapal</h3><div class="log-list">${game.logs.map(l=>`<div class="log ${l.kind}"><span class="log-icon">${l.kind==='warn'?'⚠':'✧'}</span><span>${escapeHTML(l.text)}</span></div>`).join('')}</div><button class="primary" data-action="${game.winner?'game-over':'meeting'}">${game.winner?'Lihat keputusan misi':'Mesyuarat tergempar'}</button><p class="hint">Log dikumpulkan tanpa nama atau turutan giliran.</p></section>`;
}
function renderMeeting(){
  base('MEETING');header('Ada sesuatu yang tak kena…','Bincang dengan sopan. Gunakan petunjuk, bukan tekaan semata-mata.',`Pusingan ${game.round} / 3`);meetingDeadline=Date.now()+90000;
  panel.innerHTML=`<section class="panel"><div class="eyebrow">Mesyuarat tergempar</div><h2>Siapa penyamarnya?</h2><div id="meeting-timer" class="meeting-timer" role="timer">1:30</div><div class="talk-prompts"><p>✧ &nbsp; Apa yang kita jumpa dalam log?</p><p>✧ &nbsp; Adakah cerita semua orang masuk akal?</p><p>✧ &nbsp; Mahu undi seseorang atau langkau?</p></div><button class="primary" data-action="voting">Kami sedia mengundi</button><p class="hint">Setiap pemain aktif mendapat satu undi rahsia.</p></section>`;
  clock=setInterval(()=>{if(screen!=='MEETING')return;const n=Math.max(0,Math.ceil((meetingDeadline-Date.now())/1000));$('#meeting-timer').textContent=`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;if(n===0)startVoting();},250);
}
function startVoting(){game.votes={};voterOrder=livePlayers(game).map(p=>p.id);voterIndex=0;renderVoteTransit();}
function voter(){return game.players.find(p=>p.id===voterOrder[voterIndex]);}
function renderVoteTransit(){
  base('VOTE_TRANSIT',{privateView:true});header('Undian rahsia','Serahkan peranti. Pemain lain tidak boleh melihat pilihan.',`Undi ${voterIndex+1} / ${voterOrder.length}`);const p=voter();
  panel.innerHTML=`<section class="panel private-card"><div class="eyebrow">Serahkan peranti kepada</div>${avatar(p)}<h2>${escapeHTML(p.name)}</h2><p>Pilih seorang suspek atau langkau undian.<br>Fikir dahulu sebelum membuat keputusan.</p><div style="margin-top:28px"><button class="primary" data-action="vote-open">Saya sedia mengundi</button></div>${dots(voterIndex,voterOrder.length)}</section>`;
}
function renderVote(){
  base('VOTE',{privateView:true});selectedVote=null;header('Siapa pilihan kamu?','Pilihan hanya direkodkan selepas kamu mengesahkannya.',`Undi ${voterIndex+1} / ${voterOrder.length}`);
  panel.innerHTML=`<section class="panel"><div class="eyebrow">Undian ${escapeHTML(voter().name)}</div><h2>Pilih dengan bijak</h2><div class="vote-grid">${livePlayers(game).map(p=>`<button class="vote-option" data-action="vote-select" data-id="${p.id}" aria-pressed="false">${avatar(p,'avatar-small')}<span>${escapeHTML(p.name)}</span></button>`).join('')}<button class="vote-option skip" data-action="vote-select" data-id="skip" aria-pressed="false">Langkau undian</button></div><button id="vote-confirm" class="primary" data-action="vote-confirm" disabled>Sahkan undi</button><p class="hint">Undi tidak boleh ditukar selepas disahkan.</p></section>`;
}
function confirmVote(){
  if(screen!=='VOTE'||selectedVote===null)return;game.votes[voter().id]=selectedVote;
  base('VOTE_SAVED',{privateView:true});header('Undi disimpan','Paparan selamat untuk diserahkan.',`Undi ${voterIndex+1} / ${voterOrder.length}`);
  panel.innerHTML=`<section class="panel private-card"><div class="orbit-symbol">✓</div><h2>Terima kasih, krew</h2><p>${voterIndex+1<voterOrder.length?'Serahkan peranti untuk undian seterusnya.':'Semua undi sudah diterima. Letakkan peranti di tengah.'}</p><div style="margin-top:25px"><button class="primary" data-action="vote-next">${voterIndex+1<voterOrder.length?'Pengundi seterusnya':'Lihat keputusan undian'}</button></div></section>`;
}
function renderVoteResult(){
  base('VOTE_RESULT');const r=lastVoteResult,p=r.eliminated;
  header('Keputusan pasukan','Undi dikira. Identiti pemain yang disingkirkan didedahkan.',`Pusingan ${game.round} / 3`);
  panel.innerHTML=`<section class="panel private-card"><div class="eyebrow">Keputusan undian</div>${p?avatar(p):'<div class="orbit-symbol">◇</div>'}<h2>${p?escapeHTML(p.name):'Tiada penyingkiran'}</h2><p>${p?(p.role==='IMPOSTOR'?'Dia ialah PENYAMAR! Pasukan kamu berjaya.':'Dia ialah KREW ANGKASA. Kini menjadi pemerhati misi.'):(r.tied?'Undian seri. Semua pemain kekal aktif.':'Pasukan memilih untuk melangkau undian.')}</p><div class="result-list">${Object.entries(r.counts).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).map(([id,n])=>`<div class="result-row"><span>${id==='skip'?'Langkau':escapeHTML(game.players.find(p=>p.id===Number(id)).name)}</span><b>${n} undi</b></div>`).join('')}</div><button class="primary" data-action="${game.winner?'game-over':'round-next'}">${game.winner?'Lihat keputusan misi':'Teruskan pusingan seterusnya'}</button></section>`;
}
function renderGameOver(){
  base('GAME_OVER');const crew=game.winner==='CREW',spy=game.players.find(p=>p.role==='IMPOSTOR');
  const total=game.history.reduce((s,h)=>s+h.total,0),correct=game.history.reduce((s,h)=>s+h.correct,0);
  header(crew?'Misi berjaya, krew!':'Penyamar berjaya menyelinap!',crew?'Kerjasama dan sifir kamu menyelamatkan kapal.':'Misi tamat. Bersedia untuk satu lagi cabaran?',crew?'✧ Krew menang':'✧ Penyamar menang');
  panel.innerHTML=`<section class="panel private-card"><div class="eyebrow">Misi selesai</div><h2>${crew?'Hebat, pasukan!':'Liciknya penyamar!'}</h2><p style="margin-top:10px">${escapeHTML(game.reason)}</p>${avatar(spy)}<p><b style="color:var(--red)">${escapeHTML(spy.name)}</b> ialah penyamar.</p><div class="stat-grid"><div><b>${fmt(game.battery)}%</b><span>Bateri akhir</span></div><div><b>${correct}/${total}</b><span>Sifir betul</span></div><div><b>${game.round}/3</b><span>Pusingan</span></div></div><div class="result-lineup">${game.players.map(p=>`<div class="result-buddy">${avatar(p,'')}<b>${escapeHTML(p.name)}</b><span>${p.role==='IMPOSTOR'?'Penyamar':'Krew'}</span></div>`).join('')}</div><button class="primary" data-action="replay">Main semula · Peranan baharu</button><button class="secondary" data-action="lobby">Ubah pasukan & sifir</button></section>`;
  station?.scene.celebrate();
}
function startGame(){const err=validateConfig(names,tables);if(err)return;persist();game=newGame(names,tables);roleIndex=0;renderRole();}

panel.addEventListener('input',e=>{if(e.target.matches('[data-name]')){names[Number(e.target.dataset.name)]=e.target.value;validateLobby();syncRoster();}});
panel.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const action=b.dataset.action;sound();
  switch(action){
    case 'add':if(names.length<8){names.push(`Krew ${names.length+1}`);renderLobby();}break;
    case 'remove':if(names.length>4){names.splice(Number(b.dataset.id),1);renderLobby();}break;
    case 'table':{const n=Number(b.dataset.table);tables=tables.includes(n)?tables.filter(t=>t!==n):[...tables,n].sort((a,b)=>a-b);renderLobby();break;}
    case 'preset':tables=b.dataset.preset==='basic'?[2,5,10]:b.dataset.preset==='hard'?[6,7,8,9]:Array.from({length:12},(_,i)=>i+1);renderLobby();break;
    case 'start':startGame();break;
    case 'role-next':if(!hasSeenRole||holding)return;roleIndex++;if(roleIndex<game.players.length)renderRole();else beginRound();break;
    case 'task-start':startTask();break;
    case 'answer':answer(Number(b.dataset.value));break;
    case 'turn-next':turnIndex++;if(turnIndex<turnOrder.length)renderTransit();else{settleRound(game);renderCommand();}break;
    case 'meeting':renderMeeting();break;
    case 'voting':startVoting();break;
    case 'vote-open':renderVote();break;
    case 'vote-select':selectedVote=b.dataset.id;panel.querySelectorAll('.vote-option').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));$('#vote-confirm').disabled=false;break;
    case 'vote-confirm':confirmVote();break;
    case 'vote-next':voterIndex++;if(voterIndex<voterOrder.length)renderVoteTransit();else{lastVoteResult=voteResult(game);renderVoteResult();}break;
    case 'round-next':nextRound(game);beginRound();break;
    case 'game-over':renderGameOver();break;
    case 'replay':startGame();break;
    case 'lobby':game=null;renderLobby();break;
  }
});

function curtain(){
  hideRole();
  if(!['TASK','VOTE'].includes(screen)||$('.safety-curtain'))return;
  const c=document.createElement('div');c.className='safety-curtain';c.innerHTML='<div class="orbit-symbol">◇</div><h2>Paparan dilindungi</h2><p>Pastikan peranti masih dengan pemain yang sama.<br>Masa tugasan terus berjalan.</p><button class="primary">Buka semula paparan</button>';
  c.querySelector('button').addEventListener('click',()=>{c.remove();if(screen==='TASK')tickTask();});document.body.append(c);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)curtain();else if(screen==='TASK')tickTask();});
window.addEventListener('blur',()=>{hideRole();if(screen==='TASK'||screen==='VOTE')curtain();});
window.addEventListener('pagehide',hideRole);
window.addEventListener('beforeunload',e=>{if(game&&screen!=='GAME_OVER'){e.preventDefault();e.returnValue='';}});

renderLobby();station=startStation($('#stage'),s=>{s.setRoster(roster());if($('#layout').classList.contains('private-mode'))s.scene.pause();});
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').then(reg=>reg.update()).catch(()=>{}));}
