// Semua kesan bunyi dan muzik dijana oleh Web Audio. Tiada fail audio dimuat
// turun, jadi saiz aplikasi, permainan luar talian dan lesen aset tidak
// terjejas. Nada sengaja dipilih lembut supaya sesuai untuk bilik darjah.

// Setiap kesan ialah senarai nada: mula (saat, relatif), tempoh, frekuensi awal
// dan akhir, bentuk gelombang, serta kemuncak kelantangan 0-1.
export const SFX = {
  tap:[{at:0,dur:.10,from:620,to:430,type:'sine',peak:.16}],
  correct:[{at:0,dur:.11,from:659,type:'triangle',peak:.20},{at:.09,dur:.18,from:988,type:'triangle',peak:.20}],
  wrong:[{at:0,dur:.26,from:233,to:155,type:'triangle',peak:.17}],
  eject:[{at:0,dur:.50,from:520,to:110,type:'triangle',peak:.16}],
  win:[{at:0,dur:.15,from:523,type:'triangle',peak:.18},{at:.13,dur:.15,from:659,type:'triangle',peak:.18},
       {at:.26,dur:.15,from:784,type:'triangle',peak:.18},{at:.39,dur:.42,from:1047,type:'triangle',peak:.20}],
  lose:[{at:0,dur:.20,from:392,type:'triangle',peak:.16},{at:.18,dur:.22,from:311,type:'triangle',peak:.16},
        {at:.38,dur:.48,from:262,type:'triangle',peak:.17}]
};

// Gelung muzik pendek yang berulang. Nada disenaraikan dalam semitone daripada
// nada asas, jadi tiada fail lagu diperlukan.
export const MUSIC = {
  lobby:{base:220,beat:.62,type:'sine',peak:.055,steps:[0,4,7,12,9,7,4,0],bassEvery:4},
  meeting:{base:196,beat:.44,type:'triangle',peak:.05,steps:[0,3,7,10,12,10,7,3],bassEvery:4}
};

// Muzik hanya bermain ketika pemain berbincang atau menunggu. Skrin menjawab
// dan skrin serahan peranti dibiarkan senyap supaya murid boleh menumpukan
// perhatian dan peranan tidak terganggu.
export function musicForScreen(screen){
  if(screen==='LOBBY')return 'lobby';
  if(screen==='MEETING')return 'meeting';
  return null;
}

// iOS menyenyapkan Web Audio apabila suis Ring/Silent dihidupkan, melainkan
// halaman turut memainkan elemen <audio>. Trek senyap ini ditulis terus dalam
// ingatan (bukan fail atau base64) semata-mata untuk menukar kategori sesi
// audio iOS supaya bunyi permainan kekal kedengaran.
export function silentWavBytes(seconds=1){
  const rate=8000,frames=Math.max(1,Math.round(rate*Math.max(0,Number(seconds)||0))),size=44+frames*2;
  const bytes=new Uint8Array(size),view=new DataView(bytes.buffer);
  const tag=(offset,text)=>{for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));};
  tag(0,'RIFF');view.setUint32(4,size-8,true);tag(8,'WAVE');
  tag(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
  tag(36,'data');view.setUint32(40,frames*2,true);
  return bytes; // Sampel kekal sifar: benar-benar senyap.
}

export function createAudio(){
  let ctx=null,master=null,enabled=false,theme=null,keepAlive=null,timer=null,nextAt=0,step=0;
  const Engine=()=>globalThis.AudioContext||globalThis.webkitAudioContext;
  function ensure(){
    if(ctx)return ctx;
    const Ctor=Engine();if(!Ctor)return null;
    try{ctx=new Ctor();master=ctx.createGain();master.gain.value=1;master.connect(ctx.destination);}catch{ctx=null;master=null;}
    return ctx;
  }
  function voice({at=0,dur=.1,from=440,to=null,type='sine',peak=.15},start){
    const o=ctx.createOscillator(),g=ctx.createGain(),t=start+at,end=Math.max(20,to??from);
    o.type=type;o.frequency.setValueAtTime(from,t);
    if(end!==from)o.frequency.exponentialRampToValueAtTime(end,t+dur);
    // Serangan pendek dan pereputan lembut mengelakkan bunyi klik pada pembesar suara telefon.
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(peak,t+Math.min(.02,dur/3));
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.03);
  }
  function play(name){
    const notes=SFX[name];
    if(!enabled||!notes||!ensure())return false;
    try{ctx.resume();const start=ctx.currentTime+.01;for(const note of notes)voice(note,start);return true;}catch{return false;}
  }
  function tick(){
    if(!theme||!ctx)return;
    const conf=MUSIC[theme],horizon=ctx.currentTime+.5;
    try{
      while(nextAt<horizon){
        const freq=conf.base*Math.pow(2,conf.steps[step%conf.steps.length]/12);
        voice({dur:conf.beat*.9,from:freq,type:conf.type,peak:conf.peak},nextAt);
        if(step%conf.bassEvery===0)voice({dur:conf.beat*1.8,from:freq/4,type:'sine',peak:conf.peak*1.2},nextAt);
        nextAt+=conf.beat;step++;
      }
    }catch{stopMusic();}
  }
  function stopMusic(){clearInterval(timer);timer=null;theme=null;}
  function setMusic(next){
    const wanted=enabled&&MUSIC[next]?next:null;
    if(wanted===theme)return;
    stopMusic();
    if(!wanted||!ensure())return;
    theme=wanted;
    try{ctx.resume();}catch{}
    nextAt=ctx.currentTime+.15;step=0;tick();timer=setInterval(tick,150);
  }
  function startKeepAlive(){
    if(keepAlive||typeof globalThis.Audio!=='function'||typeof URL?.createObjectURL!=='function')return;
    try{
      keepAlive=new globalThis.Audio();
      keepAlive.src=URL.createObjectURL(new Blob([silentWavBytes(1)],{type:'audio/wav'}));
      keepAlive.loop=true;keepAlive.playsInline=true;keepAlive.setAttribute('playsinline','');
      keepAlive.setAttribute('aria-hidden','true');keepAlive.hidden=true;
      globalThis.document?.body?.append(keepAlive);
      keepAlive.play()?.catch(()=>{});
    }catch{keepAlive=null;}
  }
  function stopKeepAlive(){
    if(!keepAlive)return;
    try{keepAlive.pause();keepAlive.remove();URL.revokeObjectURL(keepAlive.src);}catch{}
    keepAlive=null;
  }
  return {
    isEnabled(){return enabled;},
    setEnabled(on){
      enabled=!!on;
      if(!enabled){setMusic(null);stopKeepAlive();try{ctx?.suspend();}catch{}return;}
      if(!ensure())return;
      try{ctx.resume();}catch{}
      startKeepAlive();
    },
    play,setMusic,
    // Dipanggil pada sentuhan pertama dan apabila halaman kembali aktif: dasar
    // pelayar hanya membenarkan audio bermula selepas gerak isyarat pengguna.
    resume(){
      if(!enabled||!ensure())return;
      try{ctx.resume();}catch{}
      startKeepAlive();
      try{if(keepAlive?.paused)keepAlive.play()?.catch(()=>{});}catch{}
    },
    suspend(){try{ctx?.suspend();}catch{}}
  };
}
