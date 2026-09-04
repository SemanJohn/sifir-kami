import {COLORS} from './game.js';

// Original procedural game sprites: small space creatures, drawn once as textures.
export function avatarTexture(index=0) {
  const canvas=document.createElement('canvas');canvas.width=180;canvas.height=200;
  const c=canvas.getContext('2d'), color=COLORS[index%COLORS.length];
  function round(x,y,w,h,r,fill,stroke='#17253a',line=5){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}}
  c.fillStyle='rgba(3,9,21,.24)';c.beginPath();c.ellipse(90,180,52,10,0,0,Math.PI*2);c.fill();
  round(35,97,22,51,10,color);round(125,97,22,51,10,color);
  round(58,149,27,30,10,color);round(97,149,27,30,10,color);
  round(45,58,90,106,35,color);
  if(index%4===0){c.fillStyle=color;c.strokeStyle='#17253a';c.lineWidth=5;c.beginPath();c.moveTo(50,75);c.lineTo(51,32);c.quadraticCurveTo(58,25,77,62);c.moveTo(102,61);c.quadraticCurveTo(123,25,130,32);c.lineTo(131,78);c.fill();c.stroke();}
  if(index%4===1){round(57,21,21,52,11,color);round(102,21,21,52,11,color);}
  if(index%4===2){c.strokeStyle='#17253a';c.lineWidth=5;c.beginPath();c.moveTo(90,60);c.lineTo(90,29);c.stroke();c.fillStyle='#ceea8d';c.beginPath();c.ellipse(78,28,17,8,.45,0,Math.PI*2);c.ellipse(101,23,17,8,-.55,0,Math.PI*2);c.fill();}
  if(index%4===3){round(58,47,64,17,8,'#ffe0a0');c.fillStyle='#fff0bf';c.beginPath();c.arc(90,44,11,0,Math.PI*2);c.fill();}
  round(48,64,84,80,30,color);
  round(53,80,74,53,23,'#263f55','#152337',4);
  c.fillStyle='rgba(191,244,250,.17)';c.beginPath();c.ellipse(88,89,26,6,0,0,Math.PI*2);c.fill();
  c.fillStyle='#e6fdff';c.beginPath();c.ellipse(76,106,4,7,0,0,Math.PI*2);c.ellipse(104,106,4,7,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#d9fbfb';c.lineWidth=2;c.beginPath();c.arc(90,114,5,0,Math.PI);c.stroke();
  c.fillStyle='#ffacc0';c.globalAlpha=.65;c.beginPath();c.ellipse(67,115,5,3,0,0,Math.PI*2);c.ellipse(113,115,5,3,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
  round(79,141,22,14,4,'#eaf5dc','#17253a',2);c.fillStyle='#47777c';c.fillRect(84,145,12,4);
  c.fillStyle='rgba(255,255,255,.2)';c.beginPath();c.ellipse(56,85,4,14,.2,0,Math.PI*2);c.fill();
  return canvas;
}
export const avatars=COLORS.map((_,i)=>avatarTexture(i));
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
        const sprite=this.add.image(0,-spriteH*.34,'buddy'+p.id%8).setDisplaySize(spriteW,spriteH).setInteractive({useHandCursor:true});
        const label=this.add.text(0,spriteH*.29,p.name,{fontFamily:'Arial, sans-serif',fontSize:`${Math.max(12,Math.min(17,w/32))}px`,fontStyle:'bold',color:'#ffffff',backgroundColor:'#172334dd',padding:{x:8,y:4}}).setOrigin(.5);
        const container=this.add.container(x,y,[sprite,label]);container.setAlpha(p.alive===false?.4:1);container.setDepth(y);
        sprite.on('pointerdown',(pointer,_x,_y,event)=>{event?.stopPropagation();this.playerHandler?.(p.id);if(!reduced)this.tweens.add({targets:sprite,scaleX:1.08,scaleY:1.08,duration:90,yoyo:true});});
        if(!reduced)this.tweens.add({targets:sprite,y:sprite.y-7,duration:1000+100*i,yoyo:true,repeat:-1,ease:'Sine.inOut',delay:i*150});
        this.actors.push({container,sprite,label});
      });
    }
    celebrate(){
      if(reduced)return;
      for(let i=0;i<40;i++){const x=Phaser.Math.Between(40,920);const piece=this.add.rectangle(x,-20,6,11,Phaser.Display.Color.HexStringToColor(COLORS[i%8]).color).setDepth(1000);this.tweens.add({targets:piece,y:700,x:x+Phaser.Math.Between(-80,80),angle:360,duration:2200+Math.random()*1500,delay:i*30,onComplete:()=>piece.destroy()});}
    }
  }
  const scene=new Station();
  const game=new Phaser.Game({type:Phaser.AUTO,parent,width:parent.clientWidth||960,height:parent.clientHeight||640,backgroundColor:'#101827',scene,scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},audio:{noAudio:true},banner:false});
  return {game,scene};
}
