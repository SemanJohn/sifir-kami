import {COLORS,DEFAULT_NAMES,validateConfig,newGame,livePlayers,crewQuestion,impostorQuestion,recordTurn,settleRound,voteResult,nextRound,shuffled,voteCandidates,canVoteFor,castVote,safeRound,crisisActive,checkTaskAnswer} from './game.js';
import {createAnswerInput,deviceClass} from './input.js';
import {avatarURLs,startStation} from './scene.js';
import {normalizeSettings,impostorCount,loadRosters,saveRoster} from './settings.js';
import {tableStatsFor,buildReport,downloadCsv} from './learning.js';

const $=s=>document.querySelector(s);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n.toFixed(1)).toLocaleString('ms-MY');
let names=[...DEFAULT_NAMES],tables=[2,3,4,5];
let settings=normalizeSettings(),settingsPage=0,reportPage=0,reportKind='crew',reportTablePage=0;
try {const saved=JSON.parse(localStorage.getItem('sifir-kami-config'));if(saved&&!validateConfig(saved.names,saved.tables)){names=saved.names;tables=saved.tables;}} catch {}
try {settings=normalizeSettings(JSON.parse(localStorage.getItem('sifir-kami-settings')||'{}'));}catch{}
let game=null,screen='LOBBY',roleIndex=0,turnIndex=0,turnOrder=[],voterIndex=0,voterOrder=[],selectedVote=null,hasSeenRole=false,holding=false,task=null,clock=null,epoch=0,meetingDeadline=0,lastVoteResult=null,soundOn=false,audioCtx=null,station=null;
let helpPage=0,questionId=0,lobbySheet=null,editingPlayerId=null;
const answerInput=createAnswerInput();
const app=$('#app');
app.innerHTML=`<div class="page-intro"><h1 id="page-title">Sifir Kami</h1><span id="page-badge" class="outline-badge">Misi baharu</span></div><div id="layout" class="layout"><div id="visual-column"><div class="station-panel"><div class="station-toolbar"><span id="station-title">STESEN KAMI</span><span id="station-meta" class="muted">LOBI</span></div><div id="stage-shell"><div id="stage" role="img" aria-label="Stesen angkasa dengan watak krew comel"></div><div id="lobby-hud" hidden></div><section id="lobby-sheet" hidden aria-live="polite"></section></div></div></div><div id="mission-panel"></div></div>`;
const panel=$('#mission-panel');
const stageShell=$('#stage-shell');

function sound(){if(!soundOn)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);o.type='sine';o.frequency.setValueAtTime(620,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(420,audioCtx.currentTime+.08);g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.1);o.start();o.stop(audioCtx.currentTime+.11);}catch{}}
function updateSound(){const b=$('#sound-button');b.setAttribute('aria-pressed',String(soundOn));b.setAttribute('aria-label',soundOn?'Matikan bunyi':'Hidupkan bunyi');b.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 5 6 9H3v6h3l5 4V5Z"/>${soundOn?'<path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>':'<path d="m16 9 5 6m0-6-5 6"/>'}</svg>`;}
$('#sound-button').addEventListener('click',()=>{soundOn=!soundOn;updateSound();sound();});updateSound();
$('#settings-button').addEventListener('click',()=>{if(screen==='LOBBY'){settingsPage=0;renderSettings();}});
const helpPages=[
  ['Misi pasukan','<p><b>4–8 pemain · 1 peranti.</b> Tekan ＋ untuk menambah pemain dan tekan watak untuk ubah nama atau buang.</p><p>Pilih sifir dalam skrin kapal. Selepas misi bermula, tekan dan tahan untuk melihat peranan.</p><p><b>Krew menang:</b> bateri 100% atau semua penyamar disingkirkan.</p><p><b>Penyamar menang:</b> bateri 0% atau masih aktif selepas undian terakhir.</p>'],
  ['Tugasan rahsia','<p>Lalai <b>25 saat</b> setiap giliran. Masa boleh diubah atau dimatikan.</p><p>Semua pemain menjawab <b>3 tugasan</b> dengan menaip sendiri pada papan nombor.</p><p><b>Krew:</b> kira jawapan sifir. <b>Penyamar:</b> taip satu nombor yang bukan gandaan sifir sasaran.</p><p>Gunakan ⌫ untuk memadam dan ✓ untuk menghantar jawapan.</p>'],
  ['Bincang & undi','<p>Lalai <b>90 saat</b> untuk berbincang. Log tidak mendedahkan nama pelaku.</p><p>Setiap pemain aktif memilih pemain lain atau <b>Langkau</b>. Undi diri sendiri dilarang.</p><p>Undi seri atau Langkau terbanyak: tiada penyingkiran.</p><p>Pemain tersingkir menjadi pemerhati.</p>'],
  ['Mod Misi+','<p><b>7–8 pemain:</b> dua penyamar yang saling mengenali.</p><p><b>Pusingan 1 selamat:</b> undian hanya menanda syak, bukan menyingkir.</p><p><b>Krisis mulai pusingan 2:</b> sekurang-kurangnya satu kombo krew 3/3 memberi +6%. Jika tiada, bateri −8%.</p><p>Penyamar juga menang apabila bilangan mereka menyamai krew.</p>'],
  ['Cas bateri','<p>Lalai bateri <b>50%</b>. Cas maksimum semua krew aktif ialah <b>+45%</b> setiap pusingan.</p><p>Jawapan betul: satu bahagian cas. Kombo 3/3: dua bahagian tambahan.</p><p>Jumlah sabotaj sempurna ialah −25%; semua cubaan tersilap membaiki +5%. Nilai itu dibahagi adil antara 3 tugasan dan semua penyamar aktif.</p><p>Perubahan dikira serentak di akhir pusingan.</p>'],
  ['Untuk guru','<p>Buka <b>⚙ Tetapan guru</b> dari lobi untuk mod, pemasa, soalan adaptif dan kumpulan tersimpan.</p><p><b>Laporan guru</b> muncul selepas misi tamat. Semak murid dan sifir satu halaman demi satu.</p><p>Sifir darab dan tugas bukan gandaan dilaporkan berasingan. Eksport CSV sebelum memuat semula atau memulakan misi baharu.</p>']
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
  $('#settings-button').disabled=next!=='LOBBY';
  const scene=station?.scene;
  if(scene?.ready){if(privateView)scene.scene.pause();else{scene.scene.resume();syncRoster();}}
  $('#station-meta').textContent=game?`PUSINGAN ${game.round} / ${game.maxRounds}`:'LOBI · MENUNGGU KREW';
  $('#station-title').textContent=next==='LOBBY'?'LOBI MISI':'STESEN KAMI';
  $('#lobby-hud').hidden=next!=='LOBBY';$('#lobby-sheet').hidden=true;
  station?.scene.setPlayerHandler(next==='LOBBY'?openPlayerEditor:null);
  $('.safety-curtain')?.remove();
  if(!privateView)requestAnimationFrame(()=>station?.game.scale.refresh());
}
function persist(){try{localStorage.setItem('sifir-kami-config',JSON.stringify({names,tables}));localStorage.setItem('sifir-kami-settings',JSON.stringify(settings));}catch{}}
function applySettings(){document.documentElement.classList.toggle('large-text',settings.largeText);document.documentElement.classList.toggle('reduce-motion',settings.reduceMotion);station?.scene.setMotion(settings.reduceMotion);}
function roundBadge(){return `Pusingan ${game.round} / ${game.maxRounds}`;}
function settingSelect(key,label,values){return `<label class="setting-row"><span>${label}</span><select data-setting="${key}">${values.map(([value,text])=>`<option value="${value}" ${settings[key]===value?'selected':''}>${text}</option>`).join('')}</select></label>`;}
function settingToggle(key,label){return `<label class="setting-row"><span>${label}</span><input type="checkbox" data-setting="${key}" ${settings[key]?'checked':''}></label>`;}
function renderSettings(){
  base('SETTINGS');header('Tetapan guru','',`${settingsPage+1} / 3`);
  let content='';
  if(settingsPage===0)content=`<div class="mode-options"><button data-action="mode" data-mode="classic" aria-pressed="${settings.mode==='classic'}"><b>Klasik</b><span>1 penyamar · undian biasa</span></button><button data-action="mode" data-mode="plus" aria-pressed="${settings.mode==='plus'}"><b>Misi+</b><span>Krisis & pusingan selamat</span></button></div><p class="setting-note">${settings.mode==='plus'?'7–8 pemain: dua penyamar saling mengenali. Pusingan 1 hanya amaran; mulai pusingan 2, kombo 3/3 membaiki krisis.':'Seorang penyamar. Semua pemain menyelesaikan 3 tugasan rahsia setiap giliran.'}</p>${settingSelect('maxRounds','Pusingan',[2,3,4,5,6].map(n=>[n,String(n)]))}${settingSelect('startBattery','Bateri mula',[20,35,50,65,80].map(n=>[n,n+'%']))}`;
  if(settingsPage===1)content=`${settingSelect('turnDuration','Masa giliran',[10,15,20,25,30,45,60,90].map(n=>[n,n+' saat']))}${settingSelect('discussionDuration','Mesyuarat',[30,60,90,120,180,240].map(n=>[n,n+' saat']))}${settingToggle('adaptive','Soalan adaptif')}${settingToggle('timerOff','Tanpa pemasa')}<p class="setting-note">Semua soalan dijawab sendiri menggunakan papan nombor. Soalan adaptif memberi lebih latihan pada sifir yang kerap silap.</p>`;
  if(settingsPage===2)content=`${settingToggle('largeText','Teks lebih besar')}${settingToggle('reduceMotion','Kurangkan animasi')}<div class="roster-save"><input id="roster-name" aria-label="Nama kumpulan" placeholder="Nama kumpulan / kelas" maxlength="30"><button data-action="roster-save">Simpan</button></div><div class="roster-save"><select id="roster-select" aria-label="Kumpulan tersimpan"><option value="">Pilih kumpulan tersimpan</option>${loadRosters().map((r,i)=>`<option value="${i}">${escapeHTML(r.name)}</option>`).join('')}</select><button data-action="roster-load">Muat</button></div><p class="setting-note">Simpan 4–8 nama semasa. Laporan murid hanya tersedia selepas misi tamat dan boleh dieksport.</p>`;
  panel.innerHTML=`<section class="panel settings-panel"><div class="settings-content">${content}</div><p class="error" id="settings-message" role="status"></p><div class="page-controls"><button class="secondary" data-action="settings-prev" ${settingsPage===0?'disabled':''}>Kembali</button><button class="secondary" data-action="settings-next" ${settingsPage===2?'disabled':''}>Seterusnya</button></div><button class="primary" data-action="settings-done">Selesai · Kembali ke lobi</button></section>`;
}
function renderLobby(){
  lobbySheet=null;editingPlayerId=null;base('LOBBY');
  panel.innerHTML='<div class="lobby-launch"><p id="lobby-error" class="error" role="status"></p><button id="start-button" class="primary" data-action="start">Mula misi</button></div>';
  refreshLobby();fitViewport();
}
function refreshLobby(){
  if(screen!=='LOBBY')return;
  header('Sediakan misi','',`${settings.mode==='plus'?'Misi+':'Klasik'} · ${impostorCount(names.length,settings.mode)} penyamar`);
  $('#station-title').textContent=`${settings.mode==='plus'?'MISI+':'KLASIK'} · ${impostorCount(names.length,settings.mode)} PENYAMAR`;
  $('#station-meta').textContent=`${names.length}/8 PEMAIN · ${tables.length} SIFIR`;
  renderLobbyControls();validateLobby();syncRoster();persist();
  station?.scene.setPlayerHandler(openPlayerEditor);
}
function renderLobbyControls(){
  const hud=$('#lobby-hud');hud.hidden=false;
  hud.innerHTML=`<div class="lobby-hud-actions"><button data-lobby-action="add" ${names.length>=8?'disabled':''} aria-label="Tambah pemain"><b>＋</b><span>Tambah pemain</span></button><button data-lobby-action="tables" aria-expanded="${lobbySheet==='tables'}"><b>×</b><span>Sifir</span><i>${tables.length}</i></button></div><p>${names.length<8?'Tekan watak untuk ubah nama atau buang':'Pasukan lengkap · tekan watak untuk ubah nama'}</p>`;
  const sheet=$('#lobby-sheet');
  if(lobbySheet==='tables'){
    sheet.hidden=false;sheet.innerHTML=`<div class="station-sheet-head"><div><span>Tetapan misi</span><h2>Pilih sifir</h2></div><button data-lobby-action="close" aria-label="Tutup pilihan sifir">×</button></div><div class="station-presets"><button data-lobby-action="preset" data-preset="basic">Asas</button><button data-lobby-action="preset" data-preset="hard">Sukar</button><button data-lobby-action="preset" data-preset="all">Semua</button></div><div class="station-tables">${Array.from({length:12},(_,i)=>i+1).map(n=>`<button data-lobby-action="table" data-table="${n}" aria-pressed="${tables.includes(n)}" aria-label="Sifir ${n}">${n}</button>`).join('')}</div><p class="station-sheet-note">${tables.length<2?'Pilih sekurang-kurangnya 2 sifir.':`${tables.length} sifir dipilih.`}</p>`;
  }else if(lobbySheet==='player'&&Number.isInteger(editingPlayerId)&&names[editingPlayerId]!==undefined){
    const id=editingPlayerId;sheet.hidden=false;sheet.innerHTML=`<div class="station-sheet-head player-edit-head">${avatar({id},'avatar-small')}<label><span>Nama pemain</span><input id="stage-player-name" maxlength="20" value="${escapeHTML(names[id])}" autocomplete="off" spellcheck="false"></label><button data-lobby-action="close" aria-label="Tutup suntingan nama">×</button></div><p id="stage-player-error" class="error" role="status"></p><div class="player-edit-actions">${names.length>4?'<button class="danger-button" data-lobby-action="remove">− Buang pemain</button>':''}<button class="primary" data-lobby-action="save">Simpan nama</button></div>`;
  }else sheet.hidden=true;
}
function validateLobby(){const error=validateConfig(names,tables);$('#lobby-error').textContent=error;$('#start-button').disabled=!!error;}
function openPlayerEditor(id){if(screen!=='LOBBY'||!Number.isInteger(Number(id))||!names[Number(id)])return;editingPlayerId=Number(id);lobbySheet='player';renderLobbyControls();requestAnimationFrame(()=>{$('#stage-player-name')?.focus();$('#stage-player-name')?.select();});}
function savePlayerName(){
  const input=$('#stage-player-name'),message=$('#stage-player-error');if(!input||editingPlayerId===null)return;
  const value=input.value.trim();let error='';
  if(!value)error='Nama pemain tidak boleh kosong.';else if(names.some((n,i)=>i!==editingPlayerId&&n.trim().toLocaleLowerCase('ms-MY')===value.toLocaleLowerCase('ms-MY')))error='Gunakan nama yang berbeza.';
  if(error){message.textContent=error;return;}
  names[editingPlayerId]=value;lobbySheet=null;editingPlayerId=null;refreshLobby();
}
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
function showRole(){if(screen!=='ROLE')return;holding=true;hasSeenRole=true;const p=game.players[roleIndex],spy=p.role==='IMPOSTOR',partners=game.players.filter(x=>x.role==='IMPOSTOR'&&x.id!==p.id);$('#role-zone').className='role-zone revealed'+(spy?' spy':'');$('#role-zone').innerHTML=`<div><div class="role-title">${spy?'Kamu penyamar!':'Kamu krew angkasa!'}</div><p>${spy?'Cari nombor BUKAN gandaan. Rahsiakan identiti hingga misi tamat.':'Jawab sifir untuk mengecas kapal. Bincang dan kesan penyamar.'}${spy&&partners.length?`<br><b>Rakan penyamar: ${partners.map(x=>escapeHTML(x.name)).join(', ')}</b>`:''}</p></div>`;$('#role-next').disabled=true;}
function hideRole(){holding=false;const z=$('#role-zone');if(z){z.className='role-zone';z.innerHTML='<div><div class="lock-icon">◇</div><p>Peranan kamu dikunci</p></div>';if($('#role-next'))$('#role-next').disabled=!hasSeenRole;}}
function beginRound(){turnOrder=shuffled(livePlayers(game).map(p=>p.id));turnIndex=0;renderTransit();}
function currentPlayer(){return game.players.find(p=>p.id===turnOrder[turnIndex]);}
function renderTransit(){
  base('TRANSIT',{privateView:true});const p=currentPlayer();header('Giliran krew','',roundBadge());
  panel.innerHTML=`<section class="panel private-card"><div class="eyebrow">Serahkan peranti · ${turnIndex+1}/${turnOrder.length}</div>${avatar(p)}<h2>${escapeHTML(p.name)}</h2><p>Hanya kamu boleh melihat skrin.<br><b>${game.config.timerOff?'Tanpa pemasa':game.config.turnDuration+' saat'}</b> untuk tugasan ini.${crisisActive(game)?'<br><span class="crisis-note">Krisis: krew perlu kombo 3/3.</span>':''}</p><button class="primary bottom-action" data-action="task-start">Saya sedia</button></section>`;
}
function startTask(){
  base('TASK',{privateView:true});const p=currentPlayer();task={deadline:game.config.timerOff?Infinity:Date.now()+game.config.turnDuration*1000,question:null,step:0,correct:0,answered:0,locked:false,done:false,success:null,lastTable:null,intruder:null,hits:0,backfires:0,recorded:false,typed:''};
  header('Modul tenaga','',roundBadge());
  panel.innerHTML=`<section class="panel task-panel"><div class="task-header"><span>${avatar(p,'task-avatar')}${escapeHTML(p.name)}</span><span id="task-timer" class="timer-pill" role="timer">${game.config.timerOff?'∞':game.config.turnDuration+'s'}</span></div><div class="timer-track"><span id="time-fill"></span></div><div id="task-body"></div></section>`;
  drawQuestion();tickTask();if(!game.config.timerOff)clock=setInterval(tickTask,100);
}
function drawQuestion(){
  const spy=currentPlayer().role==='IMPOSTOR';
  task.question=spy?impostorQuestion(game.tables):crewQuestion(game.tables,Math.random,game.config.adaptive?tableStatsFor(game.records,currentPlayer().id):null);
  const q=task.question;q.mode='keypad';
  task.locked=false;task.recorded=false;task.typed='';task.questionStarted=performance.now();questionId++;answerInput.reset(questionId);
  document.activeElement?.blur();
  $('#task-body').className='keypad-mode';
  $('#task-body').innerHTML=`<div class="task-kicker">${spy?`Soalan ${task.step+1} / 3 · Bukan gandaan 2–${q.table*12}`:`Soalan ${task.step+1} / 3 · Taip jawapan`}</div><div class="typed-question" data-spy="${spy}"><div class="math-prompt" aria-live="polite">${spy?`Bukan sifir ${q.table}`:`${q.table} × ${q.multiplier} =`}</div><output id="typed-answer" aria-label="Jawapan ditaip">?</output></div><div class="keypad">${['1','2','3','4','5','6','7','8','9','⌫','0','✓'].map(k=>`<button class="task-key ${k==='⌫'?'key-delete':k==='✓'?'key-submit':''}" data-action="task-key" data-question="${questionId}" data-value="${k}" aria-label="${k==='⌫'?'Padam':k==='✓'?'Sahkan jawapan':k}">${k}</button>`).join('')}</div><div class="feedback" role="status"></div>`;
  if(document.documentElement.dataset.input==='keyboard')panel.querySelector('.task-key')?.focus({preventScroll:true});
}
function tickTask(){if(screen!=='TASK'||!task||game.config.timerOff)return;const left=Math.max(0,task.deadline-Date.now());$('#task-timer').textContent=`${Math.ceil(left/1000)}s`;$('#task-timer').classList.toggle('urgent',left<5000);$('#time-fill').style.width=`${left/(game.config.turnDuration*10)}%`;if(left<=0)finishTask();}
function logCurrentAnswer(given,correct){
  if(task.recorded||!task.question)return;task.recorded=true;const p=currentPlayer(),q=task.question;
  game.records.push({playerId:p.id,playerName:p.name,role:p.role,round:game.round,kind:p.role==='CREW'?'crew':'sabotage',mode:q.mode,table:q.table,multiplier:q.multiplier??null,answer:q.answer,given,correct,ms:Math.round(performance.now()-task.questionStarted)});
}
function enterDigit(key){
  if(screen!=='TASK'||task.locked||task.done||task.question.mode!=='keypad')return;
  if(key==='✓'){if(task.typed!=='')answer(Number(task.typed));return;}
  if(key==='⌫')task.typed=task.typed.slice(0,-1);else if(/^\d$/.test(key)&&task.typed.length<3)task.typed+=key;
  $('#typed-answer').textContent=task.typed||'?';
}
function activateTaskButton(button){if(button.dataset.action==='task-key')enterDigit(button.dataset.value);else answer(Number(button.dataset.value));}
function answer(value){
  if(screen!=='TASK'||task.locked||task.done)return;
  if(Date.now()>=task.deadline){finishTask();return;}
  task.locked=true;answerInput.cancel();task.answered++;const q=task.question,spy=currentPlayer().role==='IMPOSTOR',correct=checkTaskAnswer(q,value,spy);logCurrentAnswer(value,correct);
  if(correct)task.correct++;
  if(spy){task.success=correct;task.lastTable=q.table;task.intruder=q.answer;if(correct)task.hits++;else task.backfires++;}
  panel.querySelectorAll('.answer').forEach(b=>{b.disabled=true;const n=Number(b.dataset.value);if(n===q.answer)b.classList.add('correct');else if(n===value)b.classList.add('wrong');});
  panel.querySelectorAll('.task-key').forEach(b=>b.disabled=true);
  if($('#typed-answer'))$('#typed-answer').className=correct?'is-correct':'is-wrong';
  $('.feedback').textContent=spy?(correct?'Tepat! Nombor itu bukan gandaan.':`${value} ialah gandaan ${q.table}. Contoh bukan gandaan: ${q.answer}.`):(correct?'Tepat! Cas tenaga direkodkan.':`Jawapannya ${q.table} × ${q.multiplier} = ${q.answer}.`);
  try{navigator.vibrate?.(correct?18:[28,35,28]);}catch{}
  const token=epoch;
  setTimeout(()=>{if(token!==epoch||screen!=='TASK')return;task.step++;if(task.step===3){task.done=true;neutralTask();}else drawQuestion();},850);
}
function neutralTask(){$('#task-body').className='';$('#task-body').innerHTML='<div class="task-end-neutral"><div class="orbit-symbol">✦</div><h2>Tugasan selesai</h2><p>Semua jawapan telah disimpan.</p><button class="primary finish-turn" data-action="task-finish">Tamat giliran</button></div>';}
function finishTask(){
  if(screen!=='TASK')return;
  if(!task.done&&!task.recorded)logCurrentAnswer(null,false);
  recordTurn(game,currentPlayer().id,{correct:task.correct,answered:task.answered,success:task.success,table:task.lastTable,intruder:task.intruder,hits:task.hits,backfires:task.backfires});
  task=null;base('TURN_END',{privateView:true});header('Giliran selesai','Rahsiakan apa yang kamu lihat.',roundBadge());
  panel.innerHTML=`<section class="panel private-card"><div class="orbit-symbol">✧</div><h2>Modul disimpan</h2><p>Paparan kini selamat untuk dikongsi.<br>${turnIndex+1<turnOrder.length?'Serahkan peranti kepada pemain seterusnya.':'Letakkan peranti di tengah untuk tatapan bersama.'}</p><div style="margin-top:30px"><button class="primary" data-action="turn-next">${turnIndex+1<turnOrder.length?'Pemain seterusnya':'Periksa keadaan kapal'}</button></div></section>`;
}
function batteryPanel(){const h=game.history.at(-1);return `<div class="battery-row"><span>Bateri kapal</span><span class="battery-number">${fmt(game.battery)}%</span></div><div class="battery-bar" role="progressbar" aria-label="Bateri kapal" aria-valuenow="${game.battery}" aria-valuemin="0" aria-valuemax="100"><div class="battery-fill ${game.battery<25?'low':''}" style="width:${game.battery}%"></div></div><p class="battery-change">${h?`${fmt(h.before)}% → ${fmt(h.after)}%`:'50%'} <span class="muted">· Sasaran 100%</span></p>`;}
function renderCommand(){
  base('COMMAND');header('Laporan kapal','',roundBadge());
  panel.innerHTML=`<section class="panel command-panel">${batteryPanel()}<div class="log-list">${game.logs.map(l=>`<div class="log ${l.kind}"><span class="log-icon">${l.kind==='warn'?'⚠':'✧'}</span><span>${escapeHTML(l.text)}</span></div>`).join('')}</div><button class="primary bottom-action" data-action="${game.winner?'game-over':'meeting'}">${game.winner?'Keputusan misi':'Bincang & undi'}</button></section>`;
}
function renderMeeting(){
  base('MEETING');header('Mesyuarat krew','',roundBadge());meetingDeadline=Date.now()+game.config.discussionDuration*1000;
  const duration=game.config.discussionDuration;
  panel.innerHTML=`<section class="panel meeting-panel"><h2>Siapa penyamarnya?</h2><div id="meeting-timer" class="meeting-timer" role="timer">${game.config.timerOff?'∞':Math.floor(duration/60)+':'+String(duration%60).padStart(2,'0')}</div><p>${safeRound(game)?'Pusingan selamat: undian hanya amaran.<br>Tiada pemain disingkirkan.':'Bincang petunjuk bersama.<br>Setiap pemain mendapat satu undi rahsia.'}</p><button class="primary bottom-action" data-action="voting">Kami sedia mengundi</button></section>`;
  if(game.config.timerOff)return;
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
  base('VOTE_RESULT');const r=lastVoteResult,p=r.eliminated||r.warned;
  header('Keputusan undian','',roundBadge());
  panel.innerHTML=`<section class="panel private-card">${p?avatar(p):'<div class="orbit-symbol">◇</div>'}<h2>${p?escapeHTML(p.name):'Tiada penyingkiran'}</h2><p>${r.warned?'Ditanda syak sahaja. Semua kekal aktif dan peranan masih rahsia.':p?(p.role==='IMPOSTOR'?game.winner?'Dia PENYAMAR! Semua penyamar ditangkap.':'Dia PENYAMAR! Masih ada seorang lagi.':'Dia KREW ANGKASA. Kini menjadi pemerhati.'):(r.tied?'Undian seri. Semua pemain kekal aktif.':'Pasukan memilih untuk melangkau undian.')}</p><div class="result-list">${Object.entries(r.counts).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).map(([id,n])=>`<div class="result-row"><span>${id==='skip'?'Langkau':escapeHTML(game.players.find(p=>p.id===Number(id)).name)}</span><b>${n} undi</b></div>`).join('')}</div><button class="primary" data-action="${game.winner?'game-over':'round-next'}">${game.winner?'Lihat keputusan misi':'Teruskan pusingan seterusnya'}</button></section>`;
}
function renderGameOver(){
  base('GAME_OVER');const crew=game.winner==='CREW',spies=game.players.filter(p=>p.role==='IMPOSTOR');
  const total=game.history.reduce((s,h)=>s+h.total,0),correct=game.history.reduce((s,h)=>s+h.correct,0);
  header('Misi selesai','',crew?'Krew menang':'Penyamar menang');
  panel.innerHTML=`<section class="panel private-card game-over-panel"><h2>${crew?'Hebat, pasukan!':'Liciknya penyamar!'}</h2><p>${escapeHTML(game.reason)}</p><div class="winner-avatars">${spies.map(p=>avatar(p)).join('')}</div><p><b style="color:var(--red)">${spies.map(p=>escapeHTML(p.name)).join(' & ')}</b> ialah penyamar.</p><div class="stats-grid"><div class="stat"><strong>${fmt(game.battery)}%</strong><span>Bateri akhir</span></div><div class="stat"><strong>${correct}/${total}</strong><span>Sifir betul</span></div><div class="stat"><strong>${game.round}/${game.maxRounds}</strong><span>Pusingan</span></div></div><div class="end-actions"><button class="primary" data-action="report">Laporan guru</button><button class="secondary" data-action="replay">Main semula</button><button class="secondary" data-action="lobby">Kembali ke lobi</button></div></section>`;
  station?.scene.celebrate();
}
function reportBars(rows){
  const pages=Math.max(1,Math.ceil(rows.length/3));reportTablePage=Math.min(reportTablePage,pages-1);
  return `<div class="report-bars">${rows.slice(reportTablePage*3,reportTablePage*3+3).map(t=>`<div class="report-bar"><span>Sifir ${t.table}</span><span class="report-track"><i style="width:${t.accuracy}%"></i></span><b>${t.correct}/${t.seen}</b></div>`).join('')||'<p>Belum ada soalan direkodkan.</p>'}</div>${pages>1?`<div class="bar-navigation"><button data-action="report-tables-prev" ${reportTablePage===0?'disabled':''} aria-label="Sifir sebelumnya">‹</button><span>Sifir ${reportTablePage+1}/${pages}</span><button data-action="report-tables-next" ${reportTablePage===pages-1?'disabled':''} aria-label="Sifir seterusnya">›</button></div>`:''}`;
}
function renderReport(){
  if(!game?.winner)return;
  base('REPORT');header('Laporan guru','',`${reportPage+1} / ${game.players.length+1}`);
  const report=buildReport(game.records,game.players),p=report.byPlayer[reportPage-1],summary=p||(reportKind==='crew'?report.crew:report.sabotage);
  const weak=summary.tables.filter(t=>t.seen>=2&&t.accuracy<70);
  panel.innerHTML=`<section class="panel report-panel">${p?`<div class="report-person">${avatar(p,'report-avatar')}<div><h2>${escapeHTML(p.name)}</h2><p>${p.role==='CREW'?'Krew · sifir darab':'Penyamar · bukan gandaan'}</p></div></div>`:`<nav class="report-tabs"><button data-action="report-kind" data-kind="crew" aria-pressed="${reportKind==='crew'}">Sifir darab</button><button data-action="report-kind" data-kind="sabotage" aria-pressed="${reportKind==='sabotage'}">Bukan gandaan</button></nav>`}<div class="stats-grid"><div class="stat"><strong>${summary.accuracy===null?'—':summary.accuracy+'%'}</strong><span>Ketepatan</span></div><div class="stat"><strong>${summary.correct}/${summary.attempts}</strong><span>Betul / dilihat</span></div><div class="stat"><strong>${summary.avgSeconds===null?'—':summary.avgSeconds+'s'}</strong><span>Purata masa</span></div></div>${reportBars(summary.tables)}<p class="report-note">${weak.length?'Perlu ulang: '+weak.map(t=>t.table).join(', ')+'.':summary.tables.some(t=>t.seen>=2)?'Tiada sifir bawah 70% dalam sampel ini.':'Data masih sedikit untuk mengenal pasti sifir lemah.'}</p><div class="report-footer"><button class="secondary" data-action="report-prev" aria-label="Halaman laporan sebelumnya" ${reportPage===0?'disabled':''}>‹</button><button class="secondary" data-action="report-next" aria-label="Halaman laporan seterusnya" ${reportPage===game.players.length?'disabled':''}>›</button><button class="primary" data-action="report-csv" aria-label="Eksport laporan CSV">CSV ↓</button><button class="secondary" data-action="game-over" aria-label="Tutup laporan">Tutup</button></div></section>`;
}
function startGame(){const err=validateConfig(names,tables);if(err)return;persist();game=newGame(names,tables,Math.random,settings);roleIndex=0;renderRole();}

panel.addEventListener('change',e=>{
  if(!e.target.matches('[data-setting]')||screen!=='SETTINGS')return;
  const key=e.target.dataset.setting;settings=normalizeSettings({...settings,[key]:e.target.type==='checkbox'?e.target.checked:Number(e.target.value)});applySettings();persist();
});
let lastPointerAt=-Infinity;
function clearPressed(){panel.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
document.addEventListener('pointerdown',()=>{lastPointerAt=Date.now();document.documentElement.dataset.input='pointer';});
document.addEventListener('keydown',e=>{if(['Tab','Enter',' '].includes(e.key))document.documentElement.dataset.input='keyboard';});
panel.addEventListener('pointerdown',e=>{
  const b=e.target.closest('.answer,.task-key');if(!b||b.disabled||e.button!==0||screen!=='TASK'||task.locked)return;
  if(answerInput.press(Number(b.dataset.question),b.dataset.value,e.pointerId))b.classList.add('pressed');
});
panel.addEventListener('pointerup',e=>{
  const b=e.target.closest('.answer,.task-key');
  if(b&&!b.disabled&&answerInput.release(Number(b.dataset.question),b.dataset.value,e.pointerId)){e.preventDefault();sound();activateTaskButton(b);}
});
document.addEventListener('pointerup',()=>{clearPressed();answerInput.cancel();});
document.addEventListener('pointercancel',()=>{clearPressed();answerInput.cancel();});
panel.addEventListener('keydown',e=>{
  if(screen!=='TASK'||$('.safety-curtain'))return;
  if(task.question.mode==='keypad'&&(/^[0-9]$/.test(e.key)||['Backspace','Enter'].includes(e.key))){e.preventDefault();if(!e.repeat)enterDigit(e.key==='Backspace'?'⌫':e.key==='Enter'?'✓':e.key);return;}
  const b=e.target.closest('.answer,.task-key');
  if(!b||!['Enter',' '].includes(e.key))return;e.preventDefault();
  if(!e.repeat&&!b.disabled)answerInput.press(Number(b.dataset.question),b.dataset.value,'key:'+e.key);
});
panel.addEventListener('keyup',e=>{
  const b=e.target.closest('.answer,.task-key');if(!b||!['Enter',' '].includes(e.key))return;e.preventDefault();
  if(!b.disabled&&answerInput.release(Number(b.dataset.question),b.dataset.value,'key:'+e.key))activateTaskButton(b);
});
panel.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const action=b.dataset.action;
  if(action==='answer'||action==='task-key'){
    // Pointer answers are handled on release. Click remains for keyboard/AT only.
    if(e.detail===0&&!e.pointerType&&Date.now()-lastPointerAt>350){sound();activateTaskButton(b);}
    return;
  }
  sound();
  switch(action){
    case 'mode':settings.mode=b.dataset.mode==='plus'?'plus':'classic';persist();renderSettings();break;
    case 'settings-prev':settingsPage=Math.max(0,settingsPage-1);renderSettings();break;
    case 'settings-next':settingsPage=Math.min(2,settingsPage+1);renderSettings();break;
    case 'settings-done':persist();applySettings();renderLobby();break;
    case 'roster-save':try{const error=validateConfig(names,[2,3]);if(error)throw Error(error);saveRoster($('#roster-name').value,names);renderSettings();$('#settings-message').textContent='Kumpulan disimpan pada peranti ini.';}catch(err){$('#settings-message').textContent=err.message;}break;
    case 'roster-load':{const value=$('#roster-select').value,r=loadRosters()[Number(value)];if(value!==''&&r){names=[...r.names];persist();renderLobby();}break;}
    case 'report':reportPage=0;reportTablePage=0;renderReport();break;
    case 'report-prev':reportPage=Math.max(0,reportPage-1);reportTablePage=0;renderReport();break;
    case 'report-next':reportPage=Math.min(game.players.length,reportPage+1);reportTablePage=0;renderReport();break;
    case 'report-kind':reportKind=b.dataset.kind;reportTablePage=0;renderReport();break;
    case 'report-tables-prev':reportTablePage=Math.max(0,reportTablePage-1);renderReport();break;
    case 'report-tables-next':reportTablePage++;renderReport();break;
    case 'report-csv':if(game?.winner)downloadCsv(game.records);break;
    case 'start':startGame();break;
    case 'role-next':if(!hasSeenRole||holding)return;roleIndex++;if(roleIndex<game.players.length)renderRole();else beginRound();break;
    case 'task-start':startTask();break;
    case 'task-finish':if(task?.done)finishTask();break;
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
    case 'lobby':game=null;renderLobby();break;
  }
});

stageShell.addEventListener('click',e=>{
  const b=e.target.closest('[data-lobby-action]');if(!b||b.disabled||screen!=='LOBBY')return;const action=b.dataset.lobbyAction;sound();
  if(action==='add'&&names.length<8){let n=names.length+1,name=`Krew ${n}`;while(names.some(x=>x.toLocaleLowerCase('ms-MY')===name.toLocaleLowerCase('ms-MY')))name=`Krew ${++n}`;names.push(name);refreshLobby();openPlayerEditor(names.length-1);return;}
  if(action==='tables'){lobbySheet=lobbySheet==='tables'?null:'tables';editingPlayerId=null;renderLobbyControls();return;}
  if(action==='close'){lobbySheet=null;editingPlayerId=null;renderLobbyControls();return;}
  if(action==='save'){savePlayerName();return;}
  if(action==='remove'&&names.length>4&&editingPlayerId!==null){names.splice(editingPlayerId,1);lobbySheet=null;editingPlayerId=null;refreshLobby();return;}
  if(action==='table'){const n=Number(b.dataset.table);tables=tables.includes(n)?tables.filter(t=>t!==n):[...tables,n].sort((a,b)=>a-b);refreshLobby();return;}
  if(action==='preset'){tables=b.dataset.preset==='basic'?[2,5,10]:b.dataset.preset==='hard'?[6,7,8,9]:Array.from({length:12},(_,i)=>i+1);refreshLobby();}
});
stageShell.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='stage-player-name'){e.preventDefault();savePlayerName();}});

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
  const width=window.visualViewport?.width??window.innerWidth,coarse=matchMedia('(pointer:coarse)').matches;
  document.documentElement.style.setProperty('--app-height',`${Math.round(height)}px`);
  document.documentElement.dataset.device=deviceClass(width,coarse);
  document.documentElement.dataset.orientation=width>height?'landscape':'portrait';
  document.body.classList.toggle('editing-name',document.activeElement?.matches('[data-name],#roster-name')??false);
  requestAnimationFrame(()=>station?.game.scale.refresh());
}
window.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('resize',fitViewport);
document.addEventListener('focusin',fitViewport);document.addEventListener('focusout',()=>requestAnimationFrame(fitViewport));
applySettings();fitViewport();renderLobby();station=startStation($('#stage'),s=>{s.setMotion(settings.reduceMotion);s.setRoster(roster());s.setPlayerHandler(openPlayerEditor);if($('#layout').classList.contains('private-mode'))s.scene.pause();});
if('serviceWorker' in navigator){
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing&&screen==='LOBBY'){refreshing=true;location.reload();}});
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{}));
}
