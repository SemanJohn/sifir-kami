import {COLORS,CHARACTER_STYLES,DEFAULT_NAMES,SABOTAGE_MAX,validateConfig,normalizeCharacterIds,newGame,livePlayers,crewQuestion,anuQuestion,recordTurn,settleRound,voteResult,nextRound,shuffled,voteCandidates,canVoteFor,castVote,safeRound,crisisActive,checkTaskAnswer,chargeSabotage,spendSabotage,turnDurationFor,discussionDurationFor,resolveBoss} from './game.js';
import {createAnswerInput,createActionGuard,deviceClass} from './input.js';
import {avatarURL,startStation} from './scene.js';
import {normalizeSettings,impostorCount,toggleTable,loadRosters,saveRoster} from './settings.js';
import {tableStatsFor,buildReport,downloadCsv} from './learning.js';
import {saveActiveSession,loadActiveSession,clearActiveSession,saveGameReport,loadReportHistory,clearReportHistory,reportHistorySummary} from './session.js';

const $=s=>document.querySelector(s);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n.toFixed(1)).toLocaleString('ms-MY');
let names=[...DEFAULT_NAMES],tables=[2,3,4,5],characterIds=normalizeCharacterIds([],DEFAULT_NAMES.length);
let settings=normalizeSettings(),settingsPage=0,reportPage=0,reportTablePage=0;
try {const saved=JSON.parse(localStorage.getItem('sifir-kami-config'));if(saved&&!validateConfig(saved.names,saved.tables)){names=saved.names;tables=saved.tables;characterIds=normalizeCharacterIds(saved.characterIds,names.length);}} catch {}
try {settings=normalizeSettings(JSON.parse(localStorage.getItem('sifir-kami-settings')||'{}'));}catch{}
let game=null,screen='LOBBY',roleIndex=0,turnIndex=0,turnOrder=[],voterIndex=0,voterOrder=[],selectedVote=null,hasSeenRole=false,holding=false,task=null,bossTask=null,clock=null,epoch=0,meetingDeadline=0,lastVoteResult=null,soundOn=false,audioCtx=null,station=null;
let helpPage=0,questionId=0,lobbySheet=null,editingPlayerId=null,editingCharacterId=null,historyPage=0,pendingSession=loadActiveSession();
let appRegistration=null,appUpdatePending=false,appRefreshing=false;
const answerInput=createAnswerInput();
const lobbyToggleGuard=createActionGuard();
const app=$('#app');
app.innerHTML=`<div class="page-intro"><h1 id="page-title">Sifir Kami</h1><span id="page-badge" class="outline-badge">Misi baharu</span></div><div id="layout" class="layout"><div id="visual-column"><div class="station-panel"><div class="station-toolbar"><span id="station-title">STESEN KAMI</span><span id="station-meta" class="muted">LOBI</span></div><div id="stage-shell"><div id="stage" role="img" aria-label="Stesen angkasa dengan watak krew comel"></div><div id="lobby-hud" hidden></div><section id="lobby-sheet" hidden aria-live="polite"></section></div></div></div><div id="mission-panel"></div></div>`;
const panel=$('#mission-panel');
const stageShell=$('#stage-shell');

function sound(){if(!soundOn)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);o.type='sine';o.frequency.setValueAtTime(620,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(420,audioCtx.currentTime+.08);g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.1);o.start();o.stop(audioCtx.currentTime+.11);}catch{}}
function updateSound(){const b=$('#sound-button');b.setAttribute('aria-pressed',String(soundOn));b.setAttribute('aria-label',soundOn?'Matikan bunyi':'Hidupkan bunyi');b.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 5 6 9H3v6h3l5 4V5Z"/>${soundOn?'<path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>':'<path d="m16 9 5 6m0-6-5 6"/>'}</svg>`;}
$('#sound-button').addEventListener('click',()=>{soundOn=!soundOn;updateSound();sound();});updateSound();
$('#settings-button').addEventListener('click',()=>{if(screen==='LOBBY'){settingsPage=0;renderSettings();}});
const helpPages=[
  ['Misi pasukan','<p><b>3–8 pemain · 1 peranti.</b> Tekan ＋ untuk menambah pemain. Tekan watak untuk mengubah nama, memilih rupa daripada 20 watak, atau membuang pemain.</p><p>Pilih sifir dalam skrin kapal. Selepas misi bermula, tekan dan tahan untuk melihat peranan.</p><p><b>Krew menang:</b> bateri 100%, semua penyamar ditangkap atau Boss Sifir ditewaskan.</p><p><b>Penyamar menang:</b> bateri 0%, menyamai krew atau pasukan gagal menewaskan Boss.</p>'],
  ['Tugasan rahsia','<p>Lalai <b>25 saat</b> setiap giliran. Masa boleh diubah atau dimatikan.</p><p>Semua pemain, termasuk penyamar, menjawab <b>3 soalan darab yang sama jenis</b> dengan menaip sendiri.</p><p>Jika <b>ANU</b> diaktifkan, satu soalan setiap giliran meminta faktor yang hilang, contohnya 7 × ? = 56.</p><p>Gunakan ⌫ untuk memadam dan ✓ untuk menghantar jawapan. Papan kekunci komputer juga boleh digunakan.</p><p>Selepas soalan ketiga, pemasa berhenti supaya setiap pemain sempat menamatkan gilirannya.</p>'],
  ['Bincang & undi','<p>Lalai <b>90 saat</b> untuk berbincang. Log tidak mendedahkan nama pelaku.</p><p>Setiap pemain aktif memilih pemain lain atau <b>Langkau</b>. Undi diri sendiri dilarang.</p><p>Undi seri atau Langkau terbanyak: tiada penyingkiran.</p><p>Pemain tersingkir menjadi pemerhati.</p>'],
  ['Mod Mini & Misi+','<p><b>3 pemain:</b> Mod Mini aktif secara automatik dengan 2 krew dan 1 penyamar. Pusingan pertama hanya menanda syak.</p><p>Mulai pusingan 2, jika krew tersingkir, penyamar menang kerana tinggal 1 lawan 1.</p><p><b>Misi+ 7–8 pemain:</b> dua penyamar saling mengenali. Krisis mulai pusingan 2; kombo krew 3/3 memberi +6%, jika tiada bateri −8%.</p>'],
  ['Tenaga sabotaj','<p>Lalai bateri <b>50%</b>. Cas maksimum semua krew aktif ialah <b>+45%</b> setiap pusingan.</p><p>Penyamar mengumpul tenaga untuk jawapan tepat: <b>+5%, +8%, +12%</b> mengikut streak.</p><p>Selepas tiga soalan, penyamar boleh menggunakan <b>10%, 25% atau semua tenaga</b>. Baki disimpan sehingga 50%.</p><p>Jika tiada serangan dibuat, log tidak memaparkan sebarang maklumat sabotaj.</p>'],
  ['Peristiwa & Boss','<p>Setiap pusingan mempunyai satu peristiwa angkasa yang digunakan kepada semua pemain.</p><p>Jika penyamar masih hidup selepas undian terakhir, pasukan menghadapi <b>Boss Sifir</b>.</p><p>Jawab 3 soalan dalam 30 saat. Sekurang-kurangnya 2 jawapan tepat diperlukan untuk kemenangan krew.</p>'],
  ['Untuk guru','<p>Buka <b>⚙ Tetapan guru</b> dari lobi untuk mod, pemasa, soalan adaptif dan kumpulan tersimpan.</p><p>Sehingga <b>30 laporan misi</b> disimpan pada peranti dan boleh dieksport sebagai CSV gabungan.</p><p>Misi yang terganggu juga disimpan. Gunakan <b>Sambung misi</b> di lobi untuk kembali pada titik selamat.</p>']
];
function renderHelp(){const [title,body]=helpPages[helpPage];$('#help-title').textContent=title;$('#help-body').innerHTML=body;$('#help-page').textContent=`${helpPage+1} / ${helpPages.length}`;$('#help-prev').disabled=helpPage===0;$('#help-next').textContent=helpPage===helpPages.length-1?'Selesai':'Seterusnya';}
$('#help-button').addEventListener('click',()=>{helpPage=0;renderHelp();$('#help-dialog').showModal();});
$('#close-help').addEventListener('click',()=>$('#help-dialog').close());
$('#help-prev').addEventListener('click',()=>{if(helpPage>0){helpPage--;renderHelp();}});
$('#help-next').addEventListener('click',()=>{if(helpPage===helpPages.length-1)$('#help-dialog').close();else{helpPage++;renderHelp();}});

function characterIdOf(p){return Number.isInteger(p.characterId)?p.characterId:(p.id??0)%CHARACTER_STYLES.length;}
function avatar(p,cls='big-avatar'){return `<img class="${cls}" src="${avatarURL(characterIdOf(p))}" alt="" draggable="false">`;}
function roster(){return game?game.players:names.map((name,id)=>({id,name,characterId:characterIds[id],alive:true,color:COLORS[characterIds[id]]}));}
function syncRoster(){station?.scene.setRoster(roster());}
function stopClock(){clearInterval(clock);clock=null;epoch++;}
function header(title,subtitle,badge){$('#page-title').textContent=title;$('#page-badge').textContent=badge;}
function base(next,{privateView=false}={}){
  hideRole();stopClock();answerInput.cancel();screen=next;document.body.dataset.screen=next;document.body.classList.remove('editing-player');$('#layout').className='layout'+(privateView?' private-mode':next==='LOBBY'?' lobby-mode':' shared-play');
  $('#help-button').disabled=privateView;
  $('#sound-button').disabled=privateView;
  $('#settings-button').disabled=next!=='LOBBY';
  const scene=station?.scene;
  if(scene?.ready){scene.setEvent?.(game?.event?.id||null);if(privateView)scene.scene.pause();else{scene.scene.resume();syncRoster();}}
  $('#station-meta').textContent=game?`PUSINGAN ${game.round} / ${game.maxRounds}`:'LOBI · MENUNGGU KREW';
  $('#station-title').textContent=next==='LOBBY'?'LOBI MISI':'STESEN KAMI';
  $('#lobby-hud').hidden=next!=='LOBBY';$('#lobby-sheet').hidden=true;
  station?.scene.setPlayerHandler(next==='LOBBY'?openPlayerEditor:null);
  $('.safety-curtain')?.remove();
  syncStage();
  queueMicrotask(checkpoint);
}
// Elak Phaser cuba melukis pada kanvas 0x0 apabila pentas disembunyikan.
// Ini juga menjimatkan kuasa semasa skrin peribadi dipaparkan.
function stageLive(){const el=$('#stage');return !!el&&el.clientWidth>1&&el.clientHeight>1;}
function stageSleep(){const g=station?.game;if(!g||g.__asleep)return;g.__asleep=true;try{g.scale.stopListeners();g.loop.sleep();}catch{}}
function stageWake(){const g=station?.game;if(!g||!stageLive())return;if(g.__asleep){g.__asleep=false;try{g.scale.startListeners();g.loop.wake();}catch{}}try{g.scale.refresh();}catch{}}
function syncStage(){requestAnimationFrame(()=>stageLive()?stageWake():stageSleep());}
// Pada telefon, pentas disembunyikan semasa bermain dan gelung Phaser tidur.
// Reaksi yang dihantar ketika itu tidak akan tamat dan akan meletus sekaligus
// apabila lobi kembali, jadi kesan hanya dimainkan bila pentas benar-benar dilihat.
function stageEffect(run){const scene=station?.scene;if(scene?.ready&&stageLive())run(scene);}
function checkpoint(){
  if(!game||game.winner||['LOBBY','SETTINGS','GAME_OVER','REPORT','HISTORY'].includes(screen))return;
  saveActiveSession({game,screen,roleIndex,turnIndex,turnOrder,voterIndex,voterOrder,meetingDeadline,lastVoteResult,task,bossTask});
}
function persist(){try{localStorage.setItem('sifir-kami-config',JSON.stringify({names,tables,characterIds}));localStorage.setItem('sifir-kami-settings',JSON.stringify(settings));}catch{}}
function applySettings(){document.documentElement.classList.toggle('large-text',settings.largeText);document.documentElement.classList.toggle('reduce-motion',settings.reduceMotion);station?.scene.setMotion(settings.reduceMotion);}
function modeLabel(){return names.length===3?'Mini':settings.mode==='plus'?'Misi+':'Klasik';}
function reloadForUpdate(){if(appUpdatePending&&!appRefreshing&&screen==='LOBBY'){appRefreshing=true;location.reload();}}
function checkAppUpdate(){appRegistration?.update().catch(()=>{});}
function roundBadge(){return `Pusingan ${game.round} / ${game.maxRounds}`;}
function settingSelect(key,label,values){return `<label class="setting-row"><span>${label}</span><select data-setting="${key}">${values.map(([value,text])=>`<option value="${value}" ${settings[key]===value?'selected':''}>${text}</option>`).join('')}</select></label>`;}
function settingToggle(key,label){return `<label class="setting-row"><span>${label}</span><input type="checkbox" data-setting="${key}" ${settings[key]?'checked':''}></label>`;}
function renderSettings(){
  base('SETTINGS');header('Tetapan guru','',`${settingsPage+1} / 3`);
  let content='';
  if(settingsPage===0)content=`<div class="mode-options"><button data-action="mode" data-mode="classic" aria-pressed="${settings.mode==='classic'}"><b>Klasik</b><span>1 penyamar · undian biasa</span></button><button data-action="mode" data-mode="plus" aria-pressed="${settings.mode==='plus'}"><b>Misi+</b><span>Krisis & pusingan selamat</span></button></div><p class="setting-note">${names.length===3?'Mod Mini aktif secara automatik: pusingan pertama selamat dan penyingkiran krew selepas itu memberi kemenangan 1 lawan 1 kepada penyamar.':settings.mode==='plus'?'7–8 pemain: dua penyamar saling mengenali. Pusingan 1 hanya amaran; mulai pusingan 2, kombo 3/3 membaiki krisis.':'Seorang penyamar. Semua pemain menyelesaikan 3 tugasan rahsia setiap giliran.'}</p>${settingSelect('maxRounds','Pusingan',[2,3,4,5].map(n=>[n,String(n)]))}${settingSelect('startBattery','Bateri mula',[20,35,50,65,80].map(n=>[n,n+'%']))}`;
  if(settingsPage===1)content=`${settingSelect('turnDuration','Masa giliran',[10,15,20,25,30,45,60,90].map(n=>[n,n+' saat']))}${settingSelect('discussionDuration','Mesyuarat',[30,60,90,120,180,240].map(n=>[n,n+' saat']))}${settingToggle('adaptive','Soalan adaptif')}${settingToggle('timerOff','Tanpa pemasa')}<p class="setting-note">Semua soalan dijawab sendiri menggunakan papan nombor. Soalan adaptif memberi lebih latihan pada sifir yang kerap silap.</p>`;
  if(settingsPage===2){const reports=loadReportHistory();content=`${settingToggle('largeText','Teks lebih besar')}${settingToggle('reduceMotion','Kurangkan animasi')}<div class="roster-save"><input id="roster-name" aria-label="Nama kumpulan" placeholder="Nama kumpulan / kelas" maxlength="30"><button data-action="roster-save">Simpan</button></div><div class="roster-save"><select id="roster-select" aria-label="Kumpulan tersimpan"><option value="">Pilih kumpulan tersimpan</option>${loadRosters().map((r,i)=>`<option value="${i}">${escapeHTML(r.name)}</option>`).join('')}</select><button data-action="roster-load">Muat</button></div><button class="history-button" data-action="history" ${reports.length?'':'disabled'}>Laporan tersimpan · ${reports.length}</button><p class="setting-note">Nama, watak dan maksimum 30 laporan misi disimpan pada peranti ini.</p>`;}
  panel.innerHTML=`<section class="panel settings-panel"><div class="settings-content">${content}</div><p class="error" id="settings-message" role="status"></p><div class="page-controls"><button class="secondary" data-action="settings-prev" ${settingsPage===0?'disabled':''}>Kembali</button><button class="secondary" data-action="settings-next" ${settingsPage===2?'disabled':''}>Seterusnya</button></div><button class="primary" data-action="settings-done">Selesai · Kembali ke lobi</button></section>`;
}
function renderLobby(){
  if(appUpdatePending){reloadForUpdate();return;}
  lobbySheet=null;editingPlayerId=null;editingCharacterId=null;base('LOBBY');
  panel.innerHTML=`<div class="lobby-launch">${pendingSession?`<div class="resume-mission"><b>Misi terdahulu belum selesai</b><span>Pusingan ${pendingSession.game.round} / ${pendingSession.game.maxRounds}</span><div><button class="primary" data-action="resume">Sambung misi</button><button class="secondary" data-action="resume-discard">Misi baharu</button></div></div>`:''}<p id="lobby-error" class="error" role="status"></p><button id="start-button" class="primary" data-action="start">Mula misi</button></div>`;
  refreshLobby();fitViewport();
}
function refreshLobby(){
  if(screen!=='LOBBY')return;
  header('Sediakan misi','',`${modeLabel()} · ${impostorCount(names.length,settings.mode)} penyamar`);
  $('#station-title').textContent=`${modeLabel().toLocaleUpperCase('ms-MY')} · ${impostorCount(names.length,settings.mode)} PENYAMAR`;
  $('#station-meta').textContent=`${names.length}/8 PEMAIN`;
  renderLobbyControls();validateLobby();syncRoster();persist();
  station?.scene.setPlayerHandler(lobbySheet?null:openPlayerEditor);
}
function renderLobbyControls(){
  const hud=$('#lobby-hud');hud.hidden=false;
  stageShell.classList.toggle('sheet-open',!!lobbySheet);
  document.body.classList.toggle('editing-player',lobbySheet==='player');
  hud.innerHTML=`<div class="lobby-hud-actions"><button data-lobby-action="add" ${names.length>=8?'disabled':''} aria-label="Tambah pemain"><b>＋</b><span>Pemain</span></button><button data-lobby-action="tables" aria-label="Pilih sifir yang diuji" aria-expanded="${lobbySheet==='tables'}"><b>×</b><span>Sifir</span><i>${tables.length}${settings.anu?' · ANU':''}</i></button></div>`;
  const sheet=$('#lobby-sheet');
  if(lobbySheet==='tables'){
    sheet.hidden=false;sheet.innerHTML=`<div class="station-sheet-head"><div><h2>Pilih sifir</h2></div><button data-lobby-action="close" aria-label="Tutup pilihan sifir">×</button></div><div class="station-presets"><button data-lobby-action="preset" data-preset="basic">Asas</button><button data-lobby-action="preset" data-preset="hard">Sukar</button><button data-lobby-action="preset" data-preset="all">Semua</button></div><div class="station-tables">${Array.from({length:12},(_,i)=>i+1).map(n=>`<button data-lobby-action="table" data-table="${n}" aria-pressed="${tables.includes(n)}" aria-label="Sifir ${n}">${n}</button>`).join('')}<button class="anu-toggle" data-lobby-action="anu" aria-pressed="${settings.anu}" aria-label="Soalan ANU">ANU · Cari faktor hilang</button></div><p class="station-sheet-note">${tables.length<2?'Pilih sekurang-kurangnya 2 sifir.':`${tables.length} sifir dipilih${settings.anu?' · ANU aktif':''}.`}</p>`;
  }else if(lobbySheet==='player'&&Number.isInteger(editingPlayerId)&&names[editingPlayerId]!==undefined){
    const id=editingPlayerId,used=new Set(characterIds.filter((_,i)=>i!==id));
    sheet.hidden=false;sheet.innerHTML=`<div class="station-sheet-head player-edit-head">${avatar({characterId:editingCharacterId},'avatar-small')}<label><span>Nama pemain</span><input id="stage-player-name" maxlength="20" value="${escapeHTML(names[id])}" autocomplete="off" spellcheck="false"></label><button data-lobby-action="close" aria-label="Tutup suntingan pemain">×</button></div><div class="character-picker-head"><b>Pilih watak</b><span>${CHARACTER_STYLES.length} watak tersedia</span></div><div class="character-grid">${CHARACTER_STYLES.map((style,characterId)=>{const unavailable=used.has(characterId),selected=editingCharacterId===characterId;return `<button data-lobby-action="character" data-character-id="${characterId}" aria-label="${escapeHTML(style.name)}${unavailable?' · sedang digunakan':''}" aria-pressed="${selected}" ${unavailable?'disabled':''}>${avatar({characterId},'character-thumb')}<span>${escapeHTML(style.name)}</span>${unavailable?'<i>✓</i>':''}</button>`;}).join('')}</div><p id="stage-player-error" class="error" role="status"></p><div class="player-edit-actions">${names.length>3?'<button class="danger-button" data-lobby-action="remove">− Buang pemain</button>':''}<button class="primary" data-lobby-action="save">Simpan pemain</button></div>`;
  }else sheet.hidden=true;
  station?.scene.setPlayerHandler(lobbySheet?null:openPlayerEditor);
}
function validateLobby(){const error=validateConfig(names,tables);$('#lobby-error').textContent=error;$('#start-button').disabled=!!error;}
function openPlayerEditor(id){if(screen!=='LOBBY'||!Number.isInteger(Number(id))||!names[Number(id)])return;editingPlayerId=Number(id);editingCharacterId=characterIds[editingPlayerId];lobbySheet='player';renderLobbyControls();}
function savePlayerName(){
  const input=$('#stage-player-name'),message=$('#stage-player-error');if(!input||editingPlayerId===null)return;
  const value=input.value.trim();let error='';
  if(!value)error='Nama pemain tidak boleh kosong.';else if(names.some((n,i)=>i!==editingPlayerId&&n.trim().toLocaleLowerCase('ms-MY')===value.toLocaleLowerCase('ms-MY')))error='Gunakan nama yang berbeza.';
  if(error){message.textContent=error;return;}
  names[editingPlayerId]=value;characterIds[editingPlayerId]=editingCharacterId;lobbySheet=null;editingPlayerId=null;editingCharacterId=null;refreshLobby();
}
function dots(current,total){return `<div class="progress-dots" aria-label="${current} daripada ${total}">${Array.from({length:total},(_,i)=>`<span class="progress-dot ${i<current?'done':''}"></span>`).join('')}</div>`;}
function eventCard(){const event=game?.event;return event?`<div class="space-event ${event.id.toLowerCase()}"><b>${event.icon} ${escapeHTML(event.name)}</b><span>${escapeHTML(event.description)}</span></div>`:'';}
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
function showRole(){if(screen!=='ROLE')return;holding=true;hasSeenRole=true;const p=game.players[roleIndex],spy=p.role==='IMPOSTOR',partners=game.players.filter(x=>x.role==='IMPOSTOR'&&x.id!==p.id);$('#role-zone').className='role-zone revealed'+(spy?' spy':'');$('#role-zone').innerHTML=`<div><div class="role-title">${spy?'Kamu penyamar!':'Kamu krew angkasa!'}</div><p>${spy?'Jawab tepat untuk mengumpul tenaga. Selepas tugasan, serang sekarang atau simpan untuk pusingan seterusnya.':'Jawab sifir untuk mengecas kapal. Bincang dan kesan penyamar.'}${spy&&partners.length?`<br><b>Rakan penyamar: ${partners.map(x=>escapeHTML(x.name)).join(', ')}</b>`:''}</p></div>`;$('#role-next').disabled=true;}
function hideRole(){holding=false;const z=$('#role-zone');if(z){z.className='role-zone';z.innerHTML='<div><div class="lock-icon">◇</div><p>Peranan kamu dikunci</p></div>';if($('#role-next'))$('#role-next').disabled=!hasSeenRole;}}
function beginRound(){turnOrder=shuffled(livePlayers(game).map(p=>p.id));turnIndex=0;renderTransit();}
function currentPlayer(){return game.players.find(p=>p.id===turnOrder[turnIndex]);}
function renderTransit(){
  base('TRANSIT',{privateView:true});const p=currentPlayer();header('Giliran krew','',roundBadge());
  panel.innerHTML=`<section class="panel private-card"><div class="eyebrow">Serahkan peranti · ${turnIndex+1}/${turnOrder.length}</div>${avatar(p)}<h2>${escapeHTML(p.name)}</h2>${eventCard()}<p>Hanya kamu boleh melihat skrin.<br><b>${game.config.timerOff?'Tanpa pemasa':turnDurationFor(game)+' saat'}</b> untuk tugasan ini.${crisisActive(game)?'<br><span class="crisis-note">Krisis: krew perlu kombo 3/3.</span>':''}</p><button class="primary bottom-action" data-action="task-start">Saya sedia</button></section>`;
}
function startTask(){
  base('TASK',{privateView:true});const p=currentPlayer(),spy=p.role==='IMPOSTOR',duration=turnDurationFor(game);task={deadline:game.config.timerOff?Infinity:Date.now()+duration*1000,duration,question:null,step:0,anuStep:game.config.anu?Math.floor(Math.random()*3):-1,correct:0,answered:0,locked:false,done:false,streak:0,combo:0,sabotageBank:spy?(p.sabotageEnergy||0):0,startSabotageEnergy:p.sabotageEnergy||0,startRecordIndex:game.records.length,sabotageAttack:0,recorded:false,typed:''};
  header('Modul tenaga','',roundBadge());
  panel.innerHTML=`<section class="panel task-panel"><div class="task-header"><span>${avatar(p,'task-avatar')}${escapeHTML(p.name)}</span><span id="task-timer" class="timer-pill" role="timer">${game.config.timerOff?'∞':duration+'s'}</span></div><div class="timer-track"><span id="time-fill"></span></div><div id="task-body"></div></section>`;
  drawQuestion();tickTask();if(!game.config.timerOff)clock=setInterval(tickTask,100);
}
function drawQuestion(){
  task.question=crewQuestion(game.tables,Math.random,game.config.adaptive?tableStatsFor(game.records,currentPlayer().id):null);
  if(task.step===task.anuStep)task.question=anuQuestion(task.question,Math.random);
  const q=task.question;q.mode='keypad';
  task.locked=false;task.recorded=false;task.typed='';task.questionStarted=performance.now();questionId++;answerInput.reset(questionId);
  document.activeElement?.blur();
  $('#task-body').className='keypad-mode';panel.querySelector('.task-panel')?.classList.remove('answer-correct','answer-wrong');
  const prompt=q.anu?(q.missing==='table'?`? × ${q.multiplier} = ${q.product}`:`${q.table} × ? = ${q.product}`):`${q.table} × ${q.multiplier} =`;
  $('#task-body').innerHTML=`<div class="task-kicker">Soalan ${task.step+1} / 3 · ${q.anu?'Cari nilai ANU':'Taip jawapan'}</div><div class="typed-question"><div class="math-prompt" aria-live="polite">${prompt}</div><output id="typed-answer" aria-label="Jawapan ditaip">?</output></div><div class="keypad">${['1','2','3','4','5','6','7','8','9','⌫','0','✓'].map(k=>`<button class="task-key ${k==='⌫'?'key-delete':k==='✓'?'key-submit':''}" data-action="task-key" data-question="${questionId}" data-value="${k}" aria-label="${k==='⌫'?'Padam':k==='✓'?'Sahkan jawapan':k}">${k}</button>`).join('')}</div><div class="feedback" role="status"></div>`;
  if(document.documentElement.dataset.input==='keyboard')panel.querySelector('.task-key')?.focus({preventScroll:true});
}
function tickTask(){if(screen!=='TASK'||!task||task.done||game.config.timerOff)return;const left=Math.max(0,task.deadline-Date.now());$('#task-timer').textContent=`${Math.ceil(left/1000)}s`;$('#task-timer').classList.toggle('urgent',left<5000);$('#time-fill').style.width=`${left/(task.duration*10)}%`;if(left<=0)finishTask();}
function logCurrentAnswer(given,correct){
  if(task.recorded||!task.question)return;task.recorded=true;const p=currentPlayer(),q=task.question;
  game.records.push({playerId:p.id,playerName:p.name,role:p.role,round:game.round,kind:'crew',mode:q.mode,anu:!!q.anu,table:q.table,multiplier:q.multiplier??null,answer:q.answer,given,correct,ms:Math.round(performance.now()-task.questionStarted)});
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
  task.locked=true;answerInput.cancel();task.answered++;const q=task.question,spy=currentPlayer().role==='IMPOSTOR',correct=checkTaskAnswer(q,value);logCurrentAnswer(value,correct);
  task.combo=correct?task.combo+1:0;
  if(correct){
    task.correct++;
    if(spy){task.streak++;const activeImpostors=livePlayers(game).filter(p=>p.role==='IMPOSTOR').length;task.sabotageBank=chargeSabotage(task.sabotageBank,task.streak,activeImpostors);}
  }else if(spy)task.streak=0;
  panel.querySelectorAll('.answer').forEach(b=>{b.disabled=true;const n=Number(b.dataset.value);if(n===q.answer)b.classList.add('correct');else if(n===value)b.classList.add('wrong');});
  panel.querySelectorAll('.task-key').forEach(b=>b.disabled=true);
  if($('#typed-answer'))$('#typed-answer').className=correct?'is-correct':'is-wrong';
  panel.querySelector('.task-panel')?.classList.add(correct?'answer-correct':'answer-wrong');
  $('.feedback').innerHTML=correct?`${game.event?.id==='METEOR'?'<span class="meteor-burst">✦ ✦</span> ':''}<b>✓ Tepat!</b>${task.combo>1?` · Kombo ×${task.combo}`:''}`:`Jawapannya <b>${q.table} × ${q.multiplier} = ${q.anu?q.product:q.answer}</b>.`;
  try{navigator.vibrate?.(correct?18:[28,35,28]);}catch{}
  checkpoint();const token=epoch;
  setTimeout(()=>{if(token!==epoch||screen!=='TASK')return;task.step++;if(task.step===3){task.done=true;neutralTask();}else drawQuestion();},850);
}
// Kiraan giliran hanya mengehadkan masa menjawab. Selepas soalan ketiga, semua
// peranan mendapat paparan dan masa keputusan yang sama supaya pilihan sabotaj
// penyamar tidak dipotong pemasa dan tempoh giliran tidak membocorkan peranan.
function freezeTaskTimer(){
  clearInterval(clock);clock=null;
  if(!task)return;task.deadline=Infinity;
  const pill=$('#task-timer'),fill=$('#time-fill');
  if(pill){pill.textContent='✓';pill.classList.remove('urgent');pill.setAttribute('aria-label','Masa menjawab tamat');}
  if(fill)fill.style.width='100%';
}
function neutralTask(){
  freezeTaskTimer();$('#task-body').className='';const spy=currentPlayer().role==='IMPOSTOR';
  $('#task-body').innerHTML=spy?`<div class="task-end-neutral sabotage-console"><div class="eyebrow">Konsol rahsia penyamar</div><h2>${fmt(task.sabotageBank)}%</h2><div class="sabotage-meter" role="progressbar" aria-label="Tenaga sabotaj" aria-valuenow="${task.sabotageBank}" aria-valuemin="0" aria-valuemax="${SABOTAGE_MAX}"><i style="width:${task.sabotageBank/SABOTAGE_MAX*100}%"></i></div><p>Pilih kekuatan serangan. Baki tenaga akan disimpan.</p><div class="sabotage-choices"><button class="danger-button" data-action="task-sabotage" data-amount="10" ${task.sabotageBank<10?'disabled':''}>−10%</button><button class="danger-button" data-action="task-sabotage" data-amount="25" ${task.sabotageBank<25?'disabled':''}>−25%</button><button class="danger-button" data-action="task-sabotage" data-amount="all" ${task.sabotageBank<=0?'disabled':''}>Semua · −${fmt(task.sabotageBank)}%</button></div><button class="secondary finish-turn" data-action="task-finish">Simpan semua tenaga</button></div>`:'<div class="task-end-neutral"><div class="orbit-symbol">✦</div><h2>Tugasan selesai</h2><button class="primary finish-turn" data-action="task-finish">Tamat giliran</button></div>';
  checkpoint();
}
function activateSabotage(amount='all'){
  if(screen!=='TASK'||!task?.done||currentPlayer().role!=='IMPOSTOR'||task.sabotageBank<=0)return;
  try{task.sabotageAttack=spendSabotage(task.sabotageBank,amount).attack;finishTask();}catch{}
}
function finishTask(){
  if(screen!=='TASK')return;
  if(!task.done&&!task.recorded)logCurrentAnswer(null,false);
  const p=currentPlayer();if(p.role==='IMPOSTOR')p.sabotageEnergy=Math.max(0,Math.round((task.sabotageBank-task.sabotageAttack)*10)/10);
  recordTurn(game,p.id,{correct:task.correct,answered:task.answered,attack:task.sabotageAttack});
  task=null;renderTurnEnd();
}
function renderTurnEnd(){
  base('TURN_END',{privateView:true});header('Giliran selesai','Rahsiakan apa yang kamu lihat.',roundBadge());
  panel.innerHTML=`<section class="panel private-card"><div class="orbit-symbol">✧</div><h2>Giliran selesai</h2><p>${turnIndex+1<turnOrder.length?'Serahkan peranti kepada pemain seterusnya.':'Letakkan peranti di tengah untuk tatapan bersama.'}</p><div style="margin-top:30px"><button class="primary" data-action="turn-next">${turnIndex+1<turnOrder.length?'Pemain seterusnya':'Periksa keadaan kapal'}</button></div></section>`;
}
function batteryPanel(){const h=game.history.at(-1);return `<div class="battery-row"><span>Bateri kapal</span><span class="battery-number">${fmt(game.battery)}%</span></div><div class="battery-bar" role="progressbar" aria-label="Bateri kapal" aria-valuenow="${game.battery}" aria-valuemin="0" aria-valuemax="100"><div class="battery-fill ${game.battery<25?'low':''}" style="width:${game.battery}%"></div></div><p class="battery-change">${h?`${fmt(h.before)}% → ${fmt(h.after)}%`:fmt(game.config.startBattery)+'%'} <span class="muted">· Sasaran 100%</span></p>`;}
function renderCommand(){
  base('COMMAND');header('Laporan kapal','',roundBadge());
  panel.innerHTML=`<section class="panel command-panel">${eventCard()}${batteryPanel()}<div class="log-list">${game.logs.map(l=>`<div class="log ${l.kind}"><span class="log-icon">${l.kind==='warn'?'⚠':'✧'}</span><span>${escapeHTML(l.text)}</span></div>`).join('')}</div><button class="primary bottom-action" data-action="${game.winner?'game-over':'meeting'}">${game.winner?'Keputusan misi':'Bincang & undi'}</button></section>`;
  const delta=game.history.at(-1)?.delta||0;stageEffect(scene=>scene.reactAll?.(delta>=0?'celebrate':'wrong'));
}
function renderMeeting(resume=false){
  base('MEETING');header('Mesyuarat krew','',roundBadge());const duration=discussionDurationFor(game);if(!resume||!meetingDeadline)meetingDeadline=Date.now()+duration*1000;const initial=Math.max(0,Math.ceil((meetingDeadline-Date.now())/1000));
  panel.innerHTML=`<section class="panel meeting-panel"><h2>Siapa penyamarnya?</h2><div id="meeting-timer" class="meeting-timer" role="timer">${game.config.timerOff?'∞':Math.floor(initial/60)+':'+String(initial%60).padStart(2,'0')}</div><p>${safeRound(game)?'Pusingan selamat: undian hanya amaran.<br>Tiada pemain disingkirkan.':'Bincang petunjuk bersama.<br>Setiap pemain mendapat satu undi rahsia.'}</p><button class="primary bottom-action" data-action="voting">Kami sedia mengundi</button></section>`;
  if(game.config.timerOff)return;
  clock=setInterval(()=>{if(screen!=='MEETING')return;const n=Math.max(0,Math.ceil((meetingDeadline-Date.now())/1000));$('#meeting-timer').textContent=`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;if(n===0)startVoting();},250);
}
function startVoting(){game.votes={};voterOrder=livePlayers(game).map(p=>p.id);voterIndex=0;renderVoteTransit();}
function voter(){return game.players.find(p=>p.id===voterOrder[voterIndex]);}
function renderVoteTransit(){
  base('VOTE_TRANSIT',{privateView:true});header('Undian rahsia','Serahkan peranti. Pemain lain tidak boleh melihat pilihan.',`Undi ${voterIndex+1} / ${voterOrder.length}`);const p=voter();
  panel.innerHTML=`<section class="panel private-card"><div class="eyebrow">Serahkan peranti kepada</div>${avatar(p)}<h2>${escapeHTML(p.name)}</h2><p>Pilih suspek atau langkau.</p><div style="margin-top:28px"><button class="primary" data-action="vote-open">Saya sedia mengundi</button></div>${dots(voterIndex,voterOrder.length)}</section>`;
}
function renderVote(){
  base('VOTE',{privateView:true});selectedVote=null;header('Undian rahsia','',`${voterIndex+1} / ${voterOrder.length}`);
  panel.innerHTML=`<section class="panel vote-panel"><div class="eyebrow">Pengundi: ${escapeHTML(voter().name)}</div><h2>Pilih seorang suspek</h2><div class="vote-grid">${voteCandidates(game,voter().id).map(p=>`<button class="vote-option" data-action="vote-select" data-id="${p.id}" aria-pressed="false">${avatar(p,'avatar-small')}<span>${escapeHTML(p.name)}</span></button>`).join('')}<button class="vote-option skip" data-action="vote-select" data-id="skip" aria-pressed="false">Langkau undian</button></div><button id="vote-confirm" class="primary bottom-action" data-action="vote-confirm" disabled>Sahkan undi</button></section>`;
}
function confirmVote(){
  if(screen!=='VOTE'||selectedVote===null||!canVoteFor(game,voter().id,selectedVote))return;castVote(game,voter().id,selectedVote);
  base('VOTE_SAVED',{privateView:true});header('Undi disimpan','Paparan selamat untuk diserahkan.',`Undi ${voterIndex+1} / ${voterOrder.length}`);
  panel.innerHTML=`<section class="panel private-card"><div class="orbit-symbol">✓</div><h2>Undi disimpan</h2><p>${voterIndex+1<voterOrder.length?'Serahkan peranti untuk undian seterusnya.':'Semua undi sudah diterima. Letakkan peranti di tengah.'}</p><div style="margin-top:25px"><button class="primary" data-action="vote-next">${voterIndex+1<voterOrder.length?'Pengundi seterusnya':'Lihat keputusan undian'}</button></div></section>`;
}
function renderVoteResult(){
  base('VOTE_RESULT');const r=lastVoteResult,p=r.eliminated||r.warned;
  header('Keputusan undian','',roundBadge());
  panel.innerHTML=`<section class="panel private-card">${p?avatar(p):'<div class="orbit-symbol">◇</div>'}<h2>${p?escapeHTML(p.name):'Tiada penyingkiran'}</h2><p>${r.warned?'Ditanda syak sahaja. Semua kekal aktif dan peranan masih rahsia.':p?(p.role==='IMPOSTOR'?game.winner?'Dia PENYAMAR! Semua penyamar ditangkap.':'Dia PENYAMAR! Masih ada seorang lagi.':'Dia KREW ANGKASA. Kini menjadi pemerhati.'):(r.tied?'Undian seri. Semua pemain kekal aktif.':'Pasukan memilih untuk melangkau undian.')}</p><div class="result-list">${Object.entries(r.counts).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).map(([id,n])=>`<div class="result-row"><span>${id==='skip'?'Langkau':escapeHTML(game.players.find(p=>p.id===Number(id)).name)}</span><b>${n} undi</b></div>`).join('')}</div><button class="primary" data-action="${game.winner?'game-over':game.bossPending?'boss-intro':'round-next'}">${game.winner?'Lihat keputusan misi':game.bossPending?'Hadapi Boss Sifir':'Teruskan pusingan seterusnya'}</button></section>`;
  if(r.eliminated)stageEffect(scene=>scene.react?.(r.eliminated.id,'ejected'));
}
function renderBossIntro(){
  base('BOSS_INTRO');header('Boss Sifir','',`Final · ${roundBadge()}`);
  panel.innerHTML=`<section class="panel boss-panel boss-intro">${eventCard()}<div class="boss-orb">✹</div><h2>Pertahanan terakhir!</h2><p>Jawab 3 soalan bersama. Dapatkan sekurang-kurangnya <b>2 jawapan tepat</b> untuk menewaskan Boss Sifir. Penyamar masih boleh mengelirukan pasukan.</p><button class="primary bottom-action" data-action="boss-start">Mula Boss Sifir</button></section>`;
}
function startBoss(){bossTask={step:0,correct:0,typed:'',locked:false,deadline:Date.now()+30000,question:null};base('BOSS');header('Boss Sifir','',`0 / 3`);drawBossQuestion();clock=setInterval(tickBoss,100);}
function drawBossQuestion(){
  bossTask.question=crewQuestion(game.tables);bossTask.typed='';bossTask.locked=false;questionId++;answerInput.reset(questionId);const q=bossTask.question;
  header('Boss Sifir','',`${bossTask.step+1} / 3`);
  panel.innerHTML=`<section class="panel task-panel boss-panel"><div class="boss-status"><span>✹ Tenaga Boss</span><b id="boss-timer">${Math.max(0,Math.ceil((bossTask.deadline-Date.now())/1000))}s</b></div><div class="boss-health"><i style="width:${(3-bossTask.step)/3*100}%"></i></div><div id="task-body" class="keypad-mode"><div class="task-kicker">Soalan pasukan ${bossTask.step+1} / 3 · Perlu 2 betul</div><div class="typed-question"><div class="math-prompt">${q.table} × ${q.multiplier} =</div><output id="typed-answer">?</output></div><div class="keypad">${['1','2','3','4','5','6','7','8','9','⌫','0','✓'].map(k=>`<button class="boss-key ${k==='⌫'?'key-delete':k==='✓'?'key-submit':''}" data-action="boss-key" data-question="${questionId}" data-value="${k}">${k}</button>`).join('')}</div><div class="feedback" role="status"></div></div></section>`;
  checkpoint();
}
function enterBossDigit(key){if(screen!=='BOSS'||bossTask.locked)return;if(key==='✓'){if(bossTask.typed!=='')answerBoss(Number(bossTask.typed));return;}if(key==='⌫')bossTask.typed=bossTask.typed.slice(0,-1);else if(/^\d$/.test(key)&&bossTask.typed.length<3)bossTask.typed+=key;$('#typed-answer').textContent=bossTask.typed||'?';}
function answerBoss(value){
  if(screen!=='BOSS'||!bossTask||bossTask.locked)return;if(Date.now()>=bossTask.deadline){finishBoss();return;}bossTask.locked=true;answerInput.cancel();const correct=value===bossTask.question.answer;if(correct)bossTask.correct++;
  panel.querySelectorAll('.boss-key').forEach(button=>button.disabled=true);$('#typed-answer').className=correct?'is-correct':'is-wrong';$('.feedback').innerHTML=correct?'<b>✓ Tepat! Serangan berjaya.</b>':`Jawapannya <b>${bossTask.question.answer}</b>.`;
  panel.querySelector('.task-panel')?.classList.add(correct?'answer-correct':'answer-wrong');checkpoint();const token=epoch;
  setTimeout(()=>{if(token!==epoch||screen!=='BOSS')return;bossTask.step++;if(bossTask.step>=3)finishBoss();else drawBossQuestion();},800);
}
function tickBoss(){if(screen!=='BOSS'||!bossTask)return;const left=Math.max(0,bossTask.deadline-Date.now());$('#boss-timer').textContent=`${Math.ceil(left/1000)}s`;if(left<=0)finishBoss();}
function finishBoss(){if(screen!=='BOSS'||!bossTask)return;stopClock();const correct=bossTask.correct;resolveBoss(game,correct,3);bossTask=null;renderGameOver();}
function renderGameOver(){
  base('GAME_OVER');const crew=game.winner==='CREW',spies=game.players.filter(p=>p.role==='IMPOSTOR');
  const total=game.records.length,correct=game.records.filter(r=>r.correct).length;
  header('Misi selesai','',crew?'Krew menang':'Penyamar menang');
  saveGameReport(game);clearActiveSession();pendingSession=null;
  panel.innerHTML=`<section class="panel private-card game-over-panel"><h2>${crew?'Hebat, pasukan!':'Liciknya penyamar!'}</h2><p>${escapeHTML(game.reason)}</p><div class="winner-avatars">${spies.map(p=>avatar(p)).join('')}</div><p><b style="color:var(--red)">${spies.map(p=>escapeHTML(p.name)).join(' & ')}</b> ialah penyamar.</p><div class="stats-grid"><div class="stat"><strong>${fmt(game.battery)}%</strong><span>Bateri akhir</span></div><div class="stat"><strong>${correct}/${total}</strong><span>Sifir betul</span></div><div class="stat"><strong>${game.round}/${game.maxRounds}</strong><span>Pusingan</span></div></div><div class="end-actions"><button class="primary" data-action="report">Laporan guru</button><button class="secondary" data-action="replay">Main semula · pemain sama</button><button class="secondary" data-action="lobby">Ubah pemain</button></div></section>`;
  stageEffect(scene=>scene.celebrate());
}
function renderHistory(){
  const entries=loadReportHistory(),summary=reportHistorySummary(entries),pages=Math.max(1,Math.ceil(summary.players.length/4));historyPage=Math.min(historyPage,pages-1);base('HISTORY');header('Rekod pembelajaran','',`${entries.length} misi`);
  const rows=summary.players.slice(historyPage*4,historyPage*4+4);
  panel.innerHTML=`<section class="panel history-panel"><div class="stats-grid"><div class="stat"><strong>${summary.sessions}</strong><span>Misi</span></div><div class="stat"><strong>${summary.questions}</strong><span>Soalan</span></div><div class="stat"><strong>${summary.accuracy??'—'}${summary.accuracy===null?'':'%'}</strong><span>Ketepatan</span></div></div><div class="history-list">${rows.map(row=>`<div><span><b>${escapeHTML(row.name)}</b><small>${row.attempts} soalan · ${row.avgSeconds??'—'}s purata</small></span><strong>${row.accuracy??'—'}${row.accuracy===null?'':'%'}</strong></div>`).join('')||'<p>Belum ada laporan tersimpan.</p>'}</div><div class="bar-navigation"><button data-action="history-prev" ${historyPage===0?'disabled':''}>‹</button><span>Murid ${historyPage+1}/${pages}</span><button data-action="history-next" ${historyPage===pages-1?'disabled':''}>›</button></div><div class="history-actions"><button class="primary" data-action="history-csv" ${entries.length?'':'disabled'}>CSV semua</button><button class="secondary" data-action="history-clear" ${entries.length?'':'disabled'}>Padam rekod</button><button class="secondary" data-action="settings-return">Kembali</button></div></section>`;
}
function reportBars(rows){
  const pages=Math.max(1,Math.ceil(rows.length/3));reportTablePage=Math.min(reportTablePage,pages-1);
  return `<div class="report-bars">${rows.slice(reportTablePage*3,reportTablePage*3+3).map(t=>`<div class="report-bar"><span>Sifir ${t.table}</span><span class="report-track"><i style="width:${t.accuracy}%"></i></span><b>${t.correct}/${t.seen}</b></div>`).join('')||'<p>Belum ada soalan direkodkan.</p>'}</div>${pages>1?`<div class="bar-navigation"><button data-action="report-tables-prev" ${reportTablePage===0?'disabled':''} aria-label="Sifir sebelumnya">‹</button><span>Sifir ${reportTablePage+1}/${pages}</span><button data-action="report-tables-next" ${reportTablePage===pages-1?'disabled':''} aria-label="Sifir seterusnya">›</button></div>`:''}`;
}
function renderReport(){
  if(!game?.winner)return;
  base('REPORT');header('Laporan guru','',`${reportPage+1} / ${game.players.length+1}`);
  const report=buildReport(game.records,game.players),p=report.byPlayer[reportPage-1],summary=p||report.crew;
  const weak=summary.tables.filter(t=>t.seen>=2&&t.accuracy<70);
  panel.innerHTML=`<section class="panel report-panel">${p?`<div class="report-person">${avatar(p,'report-avatar')}<div><h2>${escapeHTML(p.name)}</h2><p>${p.role==='CREW'?'Krew':'Penyamar'} · sifir darab</p></div></div>`:'<div class="report-heading"><h2>Prestasi sifir pasukan</h2><p>Semua pemain</p></div>'}<div class="stats-grid"><div class="stat"><strong>${summary.accuracy===null?'—':summary.accuracy+'%'}</strong><span>Ketepatan</span></div><div class="stat"><strong>${summary.correct}/${summary.attempts}</strong><span>Betul / dilihat</span></div><div class="stat"><strong>${summary.avgSeconds===null?'—':summary.avgSeconds+'s'}</strong><span>Purata masa</span></div></div>${reportBars(summary.tables)}<p class="report-note">${weak.length?'Perlu ulang: '+weak.map(t=>t.table).join(', ')+'.':summary.tables.some(t=>t.seen>=2)?'Tiada sifir bawah 70% dalam sampel ini.':'Data masih sedikit untuk mengenal pasti sifir lemah.'}</p><div class="report-footer"><button class="secondary" data-action="report-prev" aria-label="Halaman laporan sebelumnya" ${reportPage===0?'disabled':''}>‹</button><button class="secondary" data-action="report-next" aria-label="Halaman laporan seterusnya" ${reportPage===game.players.length?'disabled':''}>›</button><button class="primary" data-action="report-csv" aria-label="Eksport laporan CSV">CSV ↓</button><button class="secondary" data-action="game-over" aria-label="Tutup laporan">Tutup</button></div></section>`;
}
function startGame(){const err=validateConfig(names,tables);if(err)return;persist();clearActiveSession();pendingSession=null;game=newGame(names,tables,Math.random,settings,characterIds);roleIndex=0;renderRole();}
function resumeSession(){
  const saved=pendingSession;if(!saved)return;pendingSession=null;game=saved.game;roleIndex=Number(saved.roleIndex)||0;turnIndex=Number(saved.turnIndex)||0;turnOrder=Array.isArray(saved.turnOrder)?saved.turnOrder:[];voterIndex=Number(saved.voterIndex)||0;voterOrder=Array.isArray(saved.voterOrder)?saved.voterOrder:[];meetingDeadline=Number(saved.meetingDeadline)||0;lastVoteResult=saved.lastVoteResult||null;task=saved.task||null;bossTask=saved.bossTask||null;
  if(saved.screen==='ROLE'){renderRole();return;}
  if(['TRANSIT','TASK'].includes(saved.screen)){if(task){game.records=game.records.slice(0,Math.max(0,task.startRecordIndex||0));const p=currentPlayer();if(p)p.sabotageEnergy=task.startSabotageEnergy||0;game.turnResults=game.turnResults.filter(result=>result.playerId!==p?.id);task=null;}renderTransit();return;}
  if(saved.screen==='TURN_END'){renderTurnEnd();return;}
  if(saved.screen==='COMMAND'){renderCommand();return;}
  if(saved.screen==='MEETING'){renderMeeting(true);return;}
  if(['VOTE_TRANSIT','VOTE'].includes(saved.screen)){renderVoteTransit();return;}
  if(saved.screen==='VOTE_SAVED'){if(voterIndex+1<voterOrder.length){voterIndex++;renderVoteTransit();}else{lastVoteResult=voteResult(game);renderVoteResult();}return;}
  if(saved.screen==='VOTE_RESULT'&&lastVoteResult){renderVoteResult();return;}
  if(['BOSS_INTRO','BOSS'].includes(saved.screen)&&game.bossPending){renderBossIntro();return;}
  renderCommand();
}

panel.addEventListener('change',e=>{
  if(!e.target.matches('[data-setting]')||screen!=='SETTINGS')return;
  const key=e.target.dataset.setting;settings=normalizeSettings({...settings,[key]:e.target.type==='checkbox'?e.target.checked:Number(e.target.value)});applySettings();persist();
});
let lastPointerAt=-Infinity;
function clearPressed(){panel.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
document.addEventListener('pointerdown',()=>{lastPointerAt=Date.now();document.documentElement.dataset.input='pointer';});
document.addEventListener('keydown',e=>{if(['Tab','Enter',' '].includes(e.key))document.documentElement.dataset.input='keyboard';});
panel.addEventListener('pointerdown',e=>{
  const b=e.target.closest('.answer,.task-key,.boss-key'),blocked=screen==='TASK'?task?.locked:screen==='BOSS'?bossTask?.locked:true;if(!b||b.disabled||e.button!==0||blocked)return;
  if(answerInput.press(Number(b.dataset.question),b.dataset.value,e.pointerId))b.classList.add('pressed');
});
panel.addEventListener('pointerup',e=>{
  const b=e.target.closest('.answer,.task-key,.boss-key');
  if(b&&!b.disabled&&answerInput.release(Number(b.dataset.question),b.dataset.value,e.pointerId)){e.preventDefault();sound();if(b.dataset.action==='boss-key')enterBossDigit(b.dataset.value);else activateTaskButton(b);}
});
document.addEventListener('pointerup',()=>{clearPressed();answerInput.cancel();});
document.addEventListener('pointercancel',()=>{clearPressed();answerInput.cancel();});
panel.addEventListener('keydown',e=>{
  if(!['TASK','BOSS'].includes(screen)||$('.safety-curtain'))return;
  const b=e.target.closest('.answer,.task-key,.boss-key');
  if(!b||e.key!==' ')return;e.preventDefault();
  if(!e.repeat&&!b.disabled)answerInput.press(Number(b.dataset.question),b.dataset.value,'key:space');
});
panel.addEventListener('keyup',e=>{
  const b=e.target.closest('.answer,.task-key,.boss-key');if(!b||e.key!==' ')return;e.preventDefault();
  if(!b.disabled&&answerInput.release(Number(b.dataset.question),b.dataset.value,'key:space')){if(b.dataset.action==='boss-key')enterBossDigit(b.dataset.value);else activateTaskButton(b);}
});
panel.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const action=b.dataset.action;
  if(action==='answer'||action==='task-key'||action==='boss-key'){
    // Pointer answers are handled on release. Click remains for keyboard/AT only.
    if(e.detail===0&&!e.pointerType&&Date.now()-lastPointerAt>350){sound();action==='boss-key'?enterBossDigit(b.dataset.value):activateTaskButton(b);}
    return;
  }
  if(!panel.contains(b)||$('.safety-curtain'))return;
  const expected={'start':'LOBBY','role-next':'ROLE','task-start':'TRANSIT','turn-next':'TURN_END','meeting':'COMMAND','voting':'MEETING','vote-open':'VOTE_TRANSIT','vote-next':'VOTE_SAVED','round-next':'VOTE_RESULT','boss-start':'BOSS_INTRO'};
  if(expected[action]&&expected[action]!==screen)return;
  sound();
  switch(action){
    case 'mode':settings.mode=b.dataset.mode==='plus'?'plus':'classic';persist();renderSettings();break;
    case 'settings-prev':settingsPage=Math.max(0,settingsPage-1);renderSettings();break;
    case 'settings-next':settingsPage=Math.min(2,settingsPage+1);renderSettings();break;
    case 'settings-done':persist();applySettings();renderLobby();break;
    case 'history':historyPage=0;renderHistory();break;
    case 'history-prev':historyPage=Math.max(0,historyPage-1);renderHistory();break;
    case 'history-next':historyPage++;renderHistory();break;
    case 'history-csv':downloadCsv(loadReportHistory().flatMap(entry=>entry.records));break;
    case 'history-clear':clearReportHistory();historyPage=0;renderHistory();break;
    case 'settings-return':settingsPage=2;renderSettings();break;
    case 'roster-save':try{const error=validateConfig(names,[2,3]);if(error)throw Error(error);saveRoster($('#roster-name').value,names,characterIds);renderSettings();$('#settings-message').textContent='Kumpulan disimpan pada peranti ini.';}catch(err){$('#settings-message').textContent=err.message;}break;
    case 'roster-load':{const value=$('#roster-select').value,r=loadRosters()[Number(value)];if(value!==''&&r){names=[...r.names];characterIds=normalizeCharacterIds(r.characterIds,names.length);persist();renderLobby();}break;}
    case 'report':reportPage=0;reportTablePage=0;renderReport();break;
    case 'report-prev':reportPage=Math.max(0,reportPage-1);reportTablePage=0;renderReport();break;
    case 'report-next':reportPage=Math.min(game.players.length,reportPage+1);reportTablePage=0;renderReport();break;
    case 'report-tables-prev':reportTablePage=Math.max(0,reportTablePage-1);renderReport();break;
    case 'report-tables-next':reportTablePage++;renderReport();break;
    case 'report-csv':if(game?.winner)downloadCsv(game.records);break;
    case 'start':startGame();break;
    case 'resume':resumeSession();break;
    case 'resume-discard':clearActiveSession();pendingSession=null;renderLobby();break;
    case 'role-next':if(!hasSeenRole||holding)return;roleIndex++;if(roleIndex<game.players.length)renderRole();else beginRound();break;
    case 'task-start':startTask();break;
    case 'task-sabotage':activateSabotage(b.dataset.amount);break;
    case 'task-finish':if(task?.done)finishTask();break;
    case 'turn-next':turnIndex++;if(turnIndex<turnOrder.length)renderTransit();else{settleRound(game);renderCommand();}break;
    case 'meeting':renderMeeting();break;
    case 'voting':startVoting();break;
    case 'vote-open':renderVote();break;
    case 'vote-select':if(!canVoteFor(game,voter().id,b.dataset.id))return;selectedVote=b.dataset.id;panel.querySelectorAll('.vote-option').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));$('#vote-confirm').disabled=false;break;
    case 'vote-confirm':confirmVote();break;
    case 'vote-next':voterIndex++;if(voterIndex<voterOrder.length)renderVoteTransit();else{lastVoteResult=voteResult(game);renderVoteResult();}break;
    case 'round-next':nextRound(game);beginRound();break;
    case 'boss-intro':renderBossIntro();break;
    case 'boss-start':startBoss();break;
    case 'game-over':renderGameOver();break;
    case 'replay':startGame();break;
    case 'lobby':game=null;renderLobby();break;
  }
});

stageShell.addEventListener('click',e=>{
  const b=e.target.closest('[data-lobby-action]');if(!b||b.disabled||screen!=='LOBBY')return;const action=b.dataset.lobbyAction;sound();
  if((action==='table'||action==='anu')&&!lobbyToggleGuard.accept(action==='table'?`table:${b.dataset.table}`:'anu'))return;
  if(action==='add'&&names.length<8){let n=names.length+1,name=`Krew ${n}`;while(names.some(x=>x.toLocaleLowerCase('ms-MY')===name.toLocaleLowerCase('ms-MY')))name=`Krew ${++n}`;names.push(name);characterIds=normalizeCharacterIds(characterIds,names.length);refreshLobby();openPlayerEditor(names.length-1);return;}
  if(action==='tables'){lobbySheet=lobbySheet==='tables'?null:'tables';editingPlayerId=null;editingCharacterId=null;renderLobbyControls();return;}
  if(action==='close'){lobbySheet=null;editingPlayerId=null;editingCharacterId=null;renderLobbyControls();return;}
  if(action==='character'&&editingPlayerId!==null){const next=Number(b.dataset.characterId),used=characterIds.some((characterId,i)=>i!==editingPlayerId&&characterId===next),draftName=$('#stage-player-name')?.value;if(!used&&Number.isInteger(next)&&next>=0&&next<CHARACTER_STYLES.length){editingCharacterId=next;renderLobbyControls();if(draftName!==undefined)$('#stage-player-name').value=draftName;}return;}
  if(action==='save'){savePlayerName();return;}
  if(action==='remove'&&names.length>3&&editingPlayerId!==null){names.splice(editingPlayerId,1);characterIds.splice(editingPlayerId,1);lobbySheet=null;editingPlayerId=null;editingCharacterId=null;refreshLobby();return;}
  if(action==='table'){tables=toggleTable(tables,b.dataset.table);refreshLobby();return;}
  if(action==='anu'){settings=normalizeSettings({...settings,anu:!settings.anu});refreshLobby();return;}
  if(action==='preset'){tables=b.dataset.preset==='basic'?[2,5,10]:b.dataset.preset==='hard'?[6,7,8,9]:Array.from({length:12},(_,i)=>i+1);refreshLobby();}
});
stageShell.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='stage-player-name'){e.preventDefault();savePlayerName();}});

// Papan kekunci fizikal jarang mempunyai fokus di dalam panel: selepas soalan
// baharu dilukis, fokus dilepaskan supaya papan kekunci telefon tidak terbuka.
// Kekunci nombor perlu didengar pada dokumen supaya guru boleh menaip terus.
function handleTypedKey(e){
  if(!['TASK','BOSS'].includes(screen)||$('.safety-curtain')||$('dialog[open]')||e.metaKey||e.ctrlKey||e.altKey)return;
  const node=e.target;
  if(node&&(node.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(node.tagName)))return;
  if(!/^[0-9]$/.test(e.key)&&!['Backspace','Enter'].includes(e.key))return;
  e.preventDefault();if(e.repeat)return;
  const key=e.key==='Backspace'?'⌫':e.key==='Enter'?'✓':e.key;
  if(screen==='BOSS')enterBossDigit(key);else enterDigit(key);
}
document.addEventListener('keydown',handleTypedKey);
function curtain(){
  hideRole();answerInput.cancel();clearPressed();
  if(!['TASK','VOTE'].includes(screen)||$('.safety-curtain'))return;
  const c=document.createElement('div');c.className='safety-curtain';c.innerHTML='<div class="orbit-symbol">◇</div><h2>Paparan dilindungi</h2><p>Pastikan peranti masih dengan pemain yang sama.<br>Masa tugasan terus berjalan.</p><button class="primary">Buka semula paparan</button>';
  c.querySelector('button').addEventListener('click',()=>{c.remove();if(screen==='TASK')tickTask();});document.body.append(c);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){checkpoint();curtain();}else{if(screen==='TASK')tickTask();if(screen==='BOSS')tickBoss();checkAppUpdate();}});
window.addEventListener('blur',()=>{hideRole();answerInput.cancel();clearPressed();if(screen==='TASK'||screen==='VOTE')curtain();});
window.addEventListener('pagehide',()=>{hideRole();checkpoint();});
window.addEventListener('beforeunload',checkpoint);

function fitViewport(){
  const height=window.visualViewport?.height??window.innerHeight;
  const width=window.visualViewport?.width??window.innerWidth,coarse=matchMedia('(pointer:coarse)').matches;
  document.documentElement.style.setProperty('--app-height',`${Math.round(height)}px`);
  document.documentElement.dataset.device=deviceClass(width,coarse);
  document.documentElement.dataset.orientation=width>height?'landscape':'portrait';
  document.body.classList.toggle('editing-name',document.activeElement?.matches('[data-name],#roster-name')??false);
  syncStage();
}
window.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('resize',fitViewport);
document.addEventListener('focusin',fitViewport);document.addEventListener('focusout',()=>requestAnimationFrame(fitViewport));
applySettings();fitViewport();renderLobby();station=startStation($('#stage'),s=>{s.setMotion(settings.reduceMotion);s.setEvent(game?.event?.id||null);s.setRoster(roster());s.setPlayerHandler(openPlayerEditor);if($('#layout').classList.contains('private-mode'))s.scene.pause();syncStage();});
if('serviceWorker' in navigator){
  let controlled=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!controlled){controlled=true;return;}appUpdatePending=true;reloadForUpdate();});
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{appRegistration=reg;checkAppUpdate();setInterval(checkAppUpdate,15*60*1000);}).catch(()=>{}));
}
