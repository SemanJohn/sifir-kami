import {COLORS,CHARACTER_STYLES} from './game.js';

// Original procedural game sprites: small space creatures, drawn once as textures.
export function avatarTexture(index=0) {
  const canvas=document.createElement('canvas');canvas.width=180;canvas.height=200;
  const c=canvas.getContext('2d'),style=CHARACTER_STYLES[index%CHARACTER_STYLES.length],color=style.body,accent=style.accent;
  function round(x,y,w,h,r,fill,stroke='#17253a',line=5){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}}
  function line(points,colorValue='#17253a',width=5){c.beginPath();c.strokeStyle=colorValue;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(([x,y])=>c.lineTo(x,y));c.stroke();}
  function ellipse(x,y,rx,ry,fill,rotation=0,stroke=null,width=4){c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  c.fillStyle='rgba(3,9,21,.24)';c.beginPath();c.ellipse(90,180,52,10,0,0,Math.PI*2);c.fill();
  round(35,97,22,51,10,accent);round(125,97,22,51,10,accent);
  round(58,149,27,30,10,accent);round(97,149,27,30,10,accent);
  round(45,58,90,106,35,color);
  if(style.accessory==='cat'){line([[50,75],[51,32],[76,62]]);line([[104,62],[129,32],[131,77]]);c.fillStyle=accent;c.beginPath();c.moveTo(53,60);c.lineTo(55,39);c.lineTo(69,62);c.fill();c.beginPath();c.moveTo(111,62);c.lineTo(126,39);c.lineTo(128,61);c.fill();}
  if(style.accessory==='bunny'){round(56,16,22,56,11,color);round(102,16,22,56,11,color);round(63,24,8,36,5,accent,null,0);round(109,24,8,36,5,accent,null,0);}
  if(style.accessory==='sprout'){line([[90,61],[90,28]]);ellipse(78,27,17,8,accent,.45);ellipse(102,23,17,8,accent,-.55);}
  if(style.accessory==='halo'){ellipse(90,42,34,9,'transparent',0,'#ffd166',7);}
  if(style.accessory==='horns'){line([[57,70],[52,35],[73,58]],accent,13);line([[107,58],[128,35],[123,70]],accent,13);}
  if(style.accessory==='star'){line([[90,61],[90,30]],accent,6);c.fillStyle='#ffe178';c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?7:15,x=90+Math.cos(a)*r,y=24+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();c.strokeStyle='#17253a';c.lineWidth=3;c.stroke();}
  if(style.accessory==='moon'){line([[90,61],[90,28]],accent,6);c.fillStyle='#fff1a8';c.beginPath();c.arc(90,22,14,0,Math.PI*2);c.arc(97,17,13,0,Math.PI*2,true);c.fill();}
  if(style.accessory==='bear'){ellipse(59,58,20,20,color,0,'#17253a',5);ellipse(121,58,20,20,color,0,'#17253a',5);ellipse(59,58,9,9,accent);ellipse(121,58,9,9,accent);}
  if(style.accessory==='rocket'){line([[90,61],[90,28]],accent,6);ellipse(90,21,12,16,'#e9f8ff',0,'#17253a',4);ellipse(90,21,4,6,accent);}
  round(48,64,84,80,30,color);
  round(53,80,74,53,23,'#263f55','#152337',4);
  c.fillStyle='rgba(191,244,250,.17)';c.beginPath();c.ellipse(88,89,26,6,0,0,Math.PI*2);c.fill();
  c.fillStyle='#e6fdff';c.beginPath();c.ellipse(76,106,4,7,0,0,Math.PI*2);c.ellipse(104,106,4,7,0,0,Math.PI*2);c.fill();
  if(index%5===4){c.strokeStyle='#e6fdff';c.lineWidth=3;c.beginPath();c.arc(104,106,6,Math.PI,0);c.stroke();}
  c.strokeStyle='#d9fbfb';c.lineWidth=2;c.beginPath();c.arc(90,114,5,index%5===3?Math.PI:0,index%5===3?Math.PI*2:Math.PI);c.stroke();
  c.fillStyle='#ffacc0';c.globalAlpha=.65;c.beginPath();c.ellipse(67,115,5,3,0,0,Math.PI*2);c.ellipse(113,115,5,3,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
  round(79,141,22,14,4,accent,'#17253a',2);c.fillStyle='#e9fbff';c.fillRect(84,145,12,4);
  c.fillStyle='rgba(255,255,255,.2)';c.beginPath();c.ellipse(56,85,4,14,.2,0,Math.PI*2);c.fill();
  if(style.accessory==='headphones'){line([[51,99],[43,78],[54,62],[71,54],[108,54],[127,64],[137,81],[129,101]],accent,8);round(43,91,15,26,6,accent);round(122,91,15,26,6,accent);}
  if(style.accessory==='cap'){c.fillStyle=accent;c.beginPath();c.arc(86,66,31,Math.PI,Math.PI*2);c.fill();round(82,59,52,12,6,accent,'#17253a',4);}
  if(style.accessory==='flower'){ellipse(118,68,7,14,'#fff0a7',0);ellipse(118,68,7,14,'#fff0a7',Math.PI/2);ellipse(118,68,7,14,'#fff0a7',Math.PI/4);ellipse(118,68,7,14,'#fff0a7',-Math.PI/4);ellipse(118,68,5,5,accent);}
  if(style.accessory==='goggles'||style.accessory==='glasses'){ellipse(75,104,13,11,'transparent',0,accent,5);ellipse(105,104,13,11,'transparent',0,accent,5);line([[88,104],[92,104]],accent,4);if(style.accessory==='goggles')line([[54,101],[63,103],[117,103],[127,100]],accent,4);}
  if(style.accessory==='bow'){c.fillStyle=accent;c.beginPath();c.moveTo(90,69);c.quadraticCurveTo(64,47,62,72);c.quadraticCurveTo(72,82,90,72);c.quadraticCurveTo(108,82,118,72);c.quadraticCurveTo(116,47,90,69);c.fill();ellipse(90,70,7,7,'#ffe8a8',0,'#17253a',3);}
  if(style.accessory==='tiara'){c.fillStyle='#ffe078';c.strokeStyle='#17253a';c.lineWidth=4;c.beginPath();c.moveTo(61,70);c.lineTo(67,48);c.lineTo(82,61);c.lineTo(91,42);c.lineTo(101,61);c.lineTo(116,48);c.lineTo(121,70);c.closePath();c.fill();c.stroke();ellipse(91,57,4,4,accent);}
  if(style.accessory==='propeller'){round(78,52,24,10,5,accent);line([[90,54],[90,36]],'#17253a',4);ellipse(71,34,20,7,'#8ee3f0',-.2,'#17253a',3);ellipse(109,34,20,7,'#ff9cb1',.2,'#17253a',3);}
  if(style.accessory==='scarf'){round(52,133,76,13,6,accent,'#17253a',3);c.fillStyle=accent;c.beginPath();c.moveTo(112,140);c.lineTo(136,157);c.lineTo(119,165);c.closePath();c.fill();}
  if(style.accessory==='chef'){ellipse(71,57,18,20,'#fff7e8',0,'#17253a',4);ellipse(91,50,21,23,'#fff7e8',0,'#17253a',4);ellipse(111,57,18,20,'#fff7e8',0,'#17253a',4);round(62,60,58,15,4,'#fff7e8','#17253a',4);}
  if(style.accessory==='party'){c.fillStyle=accent;c.strokeStyle='#17253a';c.lineWidth=4;c.beginPath();c.moveTo(69,66);c.lineTo(94,19);c.lineTo(112,67);c.closePath();c.fill();c.stroke();ellipse(94,18,7,7,'#ffe179');}
  return canvas;
}
export const avatars=CHARACTER_STYLES.map((_,i)=>avatarTexture(i));
export const avatarURLs=avatars.map(c=>c.toDataURL());

export function startStation(parent,onReady) {
  if(!window.Phaser){parent.innerHTML='<p class="engine-error">Enjin kapal belum dimuatkan. Muat semula halaman untuk bermain.</p>';return null;}
  const systemReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let reduced=systemReduced;
  class Station extends Phaser.Scene {
    constructor(){super('station');this.roster=[];this.actors=[];this.ready=false;this.playerHandler=null;}
    preload(){this.load.image('station','./assets/station.png');}
    create(){
      this.background=this.add.image(0,0,'station').setOrigin(.5).setDepth(-10);
      this.vignette=this.add.graphics().setDepth(-5);
      avatars.forEach((canvas,i)=>this.textures.addCanvas('buddy'+i,canvas));
      this.ready=true;this.layoutScene();this.setRoster(this.roster);
      this.input.on('pointerdown',pointer=>{
        if(!this.actors.length)return;
        const a=this.actors[Math.floor(Math.random()*this.actors.length)];
        if(reduced)return;
        const {width,height}=this.scale.gameSize;
        this.tweens.add({targets:a.container,x:Phaser.Math.Clamp(pointer.x,width*.12,width*.88),y:Phaser.Math.Clamp(pointer.y,height*.45,height*.82),duration:700,ease:'Sine.inOut'});
        const dot=this.add.circle(pointer.x,pointer.y,15,0xa8e2d2,.4);this.tweens.add({targets:dot,scale:2,alpha:0,duration:600,onComplete:()=>dot.destroy()});
      });
      this.scale.on('resize',()=>{this.layoutScene();this.setRoster(this.roster);});
      onReady?.(this);
    }
    layoutScene(){
      if(!this.background)return;const {width:w,height:h}=this.scale.gameSize,scale=Math.max(w/960,h/640);
      this.background.setPosition(w/2,h/2).setDisplaySize(960*scale,640*scale);
      this.vignette.clear().fillStyle(0x07101f,.2).fillRect(0,0,w,h).lineStyle(2,0x77d9cf,.22).strokeRoundedRect(10,10,Math.max(0,w-20),Math.max(0,h-20),20);
    }
    setPlayerHandler(handler){this.playerHandler=typeof handler==='function'?handler:null;}
    setMotion(value){const next=systemReduced||value;if(next===reduced)return;reduced=next;if(this.ready)this.setRoster(this.roster);}
    setRoster(players){
      this.roster=players;if(!this.ready)return;
      this.actors.forEach(a=>{this.tweens.killTweensOf([a.container,a.sprite]);a.container.destroy();});this.actors=[];
      const {width:w,height:h}=this.scale.gameSize,n=players.length,cols=n<=4?2:n<=6?3:4,rows=Math.ceil(n/cols);
      const areaW=Math.min(w*.76,760),left=(w-areaW)/2,rowGap=Math.min(h*.22,145),startY=h*(rows===1?.62:.54);
      players.forEach((p,i)=>{
        const row=Math.floor(i/cols),items=Math.min(cols,n-row*cols),col=i-row*cols,x=left+areaW*(col+1)/(items+1),y=startY+row*rowGap;
        const spriteW=Math.max(68,Math.min(118,w/(cols+1)*.72,h/(rows+2)*.72)),spriteH=spriteW*1.12;
        const characterId=Number.isInteger(p.characterId)?p.characterId:p.id%avatars.length;
        const sprite=this.add.image(0,-spriteH*.34,'buddy'+characterId).setDisplaySize(spriteW,spriteH).setInteractive({useHandCursor:true});
        const label=this.add.text(0,spriteH*.29,p.name,{fontFamily:'Arial, sans-serif',fontSize:`${Math.max(12,Math.min(17,w/32))}px`,fontStyle:'bold',color:'#ffffff',backgroundColor:'#172334dd',padding:{x:8,y:4}}).setOrigin(.5);
        const container=this.add.container(x,y,[sprite,label]);container.setAlpha(p.alive===false?.4:1);container.setDepth(y);
        sprite.on('pointerdown',(pointer,_x,_y,event)=>{event?.stopPropagation();this.playerHandler?.(p.id);if(!reduced)this.tweens.add({targets:sprite,scaleX:1.08,scaleY:1.08,duration:90,yoyo:true});});
        if(!reduced)this.tweens.add({targets:sprite,y:sprite.y-7,duration:1000+100*i,yoyo:true,repeat:-1,ease:'Sine.inOut',delay:i*150});
        this.actors.push({container,sprite,label});
      });
    }
    celebrate(){
      if(reduced)return;
      for(let i=0;i<40;i++){const x=Phaser.Math.Between(40,920);const piece=this.add.rectangle(x,-20,6,11,Phaser.Display.Color.HexStringToColor(COLORS[i%COLORS.length]).color).setDepth(1000);this.tweens.add({targets:piece,y:700,x:x+Phaser.Math.Between(-80,80),angle:360,duration:2200+Math.random()*1500,delay:i*30,onComplete:()=>piece.destroy()});}
    }
  }
  const scene=new Station();
  const game=new Phaser.Game({type:Phaser.AUTO,parent,width:parent.clientWidth||960,height:parent.clientHeight||640,backgroundColor:'#101827',scene,scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},audio:{noAudio:true},banner:false});
  return {game,scene};
}
