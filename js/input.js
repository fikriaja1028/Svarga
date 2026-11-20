// SVARGA — input: keyboard, mouse, sentuh & UI

import {clamp} from './utils.js';
import {G, P, C, I, persist} from './config.js';
import {D} from './dom.js';
import {camera} from './scene.js';
import {A} from './audio.js';
import {doBurst, pauseGame, resumeGame, openHelp, closeHelp, startRun, resetRun, setState, exitLock, requestLock} from './systems.js';
import {setQuality, setDiff} from './quality.js';
import {sizeCompass, sizeMap, toast} from './hud.js';

/* ============================================================ input */
function initInput(){
 if(!('requestPointerLock'in D.game))I.lockOK=false;
 addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&(G.state==='playing'||G.state==='intro'))e.preventDefault();
  if(e.repeat)return;
  I.keys[e.code]=true;
  if(e.code==='Space')P.jumpBuf=.14;
  if(e.code==='KeyF')doBurst();
  if(e.code==='KeyM'){A.setMuted(!G.muted);toast('info',G.muted?'Suara dibisukan':'Suara diaktifkan','mute',300)}
  if(e.code==='KeyH'){document.body.classList.contains('help-on')?closeHelp():openHelp()}
  if(e.code==='KeyP'){G.state==='paused'?resumeGame():pauseGame()}
  if(e.code==='Escape'){
   if(document.body.classList.contains('help-on'))closeHelp();
   else if(G.state==='paused')resumeGame();
   else if((G.state==='playing'||G.state==='intro')&&!document.pointerLockElement)pauseGame();
  }
  if(e.code==='Enter'){
   if(G.state==='title')D.btnStart.click();
   else if(G.state==='victory')D.btnAgain.click();
  }
 });
 addEventListener('keyup',e=>{I.keys[e.code]=false});
 addEventListener('blur',()=>{I.keys={}});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&(G.state==='playing'||G.state==='intro'))pauseGame();
  if(!document.hidden&&A.ctx&&A.ctx.state==='suspended')A.ctx.resume();
 });
 document.addEventListener('pointerlockchange',()=>{
  I.locked=document.pointerLockElement===D.game;
  if(I.locked)G.lockWasOurs=true;
  else if(G.lockWasOurs&&(G.state==='playing'||G.state==='intro')){G.lockWasOurs=false;pauseGame()}
 });
 document.addEventListener('mousemove',e=>{
  if(I.locked&&(G.state==='playing'||G.state==='intro')){
   C.yaw-=e.movementX*.0022*G.sens;
   C.pitch=clamp(C.pitch+e.movementY*.0022*G.sens,-.45,1.35);
  }else if(I.rightDrag&&(G.state==='playing'||G.state==='intro')){
   C.yaw-=e.movementX*.0032*G.sens;
   C.pitch=clamp(C.pitch+e.movementY*.0032*G.sens,-.45,1.35);
  }
 });
 D.game.addEventListener('mousedown',e=>{
  if(I.touch)return;
  if(G.state!=='playing'&&G.state!=='intro')return;
  if(!I.locked&&I.lockOK){requestLock();return}
  if(e.button===0)doBurst();
  if(e.button===2)I.rightDrag=true;
 });
 addEventListener('mouseup',e=>{if(e.button===2)I.rightDrag=false});
 D.game.addEventListener('contextmenu',e=>e.preventDefault());
 D.game.addEventListener('wheel',e=>{
  e.preventDefault();
  if(G.state==='playing'||G.state==='intro')C.dist=clamp(C.dist+e.deltaY*.01,3.5,16);
 },{passive:false});
 // touch
 addEventListener('touchstart',()=>{
  if(!I.touch){I.touch=true;document.body.classList.add('touch')}
  if(A.ctx&&A.ctx.state==='suspended')A.ctx.resume();
 },{passive:true});
 D.game.style.touchAction='none';
 D.game.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch')return;
  e.preventDefault();
  if(I.lookId===null&&(G.state==='playing'||G.state==='intro')){
   I.lookId=e.pointerId;I.lookLX=e.clientX;I.lookLY=e.clientY;
  }
 });
 D.game.addEventListener('pointermove',e=>{
  if(e.pointerType!=='touch'||e.pointerId!==I.lookId)return;
  C.yaw-=(e.clientX-I.lookLX)*.0052*G.sens;
  C.pitch=clamp(C.pitch+(e.clientY-I.lookLY)*.0052*G.sens,-.45,1.35);
  I.lookLX=e.clientX;I.lookLY=e.clientY;
 });
 const endLook=e=>{if(e.pointerId===I.lookId)I.lookId=null};
 D.game.addEventListener('pointerup',endLook);D.game.addEventListener('pointercancel',endLook);
 // joystick
 const joyMove=e=>{
  const r=D.joyBase.getBoundingClientRect();
  const cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=e.clientX-cx,dy=e.clientY-cy;
  const mag=Math.hypot(dx,dy),max=48;
  if(mag>max){dx*=max/mag;dy*=max/mag}
  D.joyThumb.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  I.joy.x=dx/max;I.joy.y=-dy/max;I.joy.mag=Math.min(1,mag/max);
  D.joyBase.classList.toggle('sprint',I.joy.mag>.93);
 };
 D.joyZone.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'||I.joyId!==null)return;
  e.preventDefault();
  I.joyId=e.pointerId;
  D.joyBase.style.display='block';
  D.joyBase.style.left=e.clientX+'px';D.joyBase.style.top=e.clientY+'px';
  D.joyThumb.style.transform='translate(-50%,-50%)';
  D.joyZone.setPointerCapture(e.pointerId);
 });
 D.joyZone.addEventListener('pointermove',e=>{if(e.pointerId===I.joyId)joyMove(e)});
 const joyEnd=e=>{
  if(e.pointerId!==I.joyId)return;
  I.joyId=null;I.joy.x=I.joy.y=I.joy.mag=0;
  D.joyBase.style.display='none';D.joyBase.classList.remove('sprint');
 };
 D.joyZone.addEventListener('pointerup',joyEnd);D.joyZone.addEventListener('pointercancel',joyEnd);
 const tbtn=(el,down,up)=>{
  el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();down()});
  if(up){el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('pointerleave',up)}
 };
 tbtn(D.tJump,()=>{P.jumpBuf=.14});
 tbtn(D.tBurst,()=>doBurst());
 tbtn(D.tInteract,()=>{I.keys.KeyE=true},()=>{I.keys.KeyE=false});
 // UI buttons
 const blip=()=>A.blip();
 D.btnStart.addEventListener('click',()=>{A.init();if(A.ctx&&A.ctx.state==='suspended')A.ctx.resume();blip();startRun(true)});
 D.btnResume.addEventListener('click',()=>{blip();resumeGame()});
 D.btnRetry.addEventListener('click',()=>{blip();startRun(false)});
 D.btnAgain.addEventListener('click',()=>{blip();startRun(false)});
 D.btnNew2.addEventListener('click',()=>location.reload());
 D.btnNewWorld.addEventListener('click',()=>location.reload());
 D.btnTitle.addEventListener('click',()=>{blip();resetRun();setState('title');exitLock()});
 D.btnHelp1.addEventListener('click',()=>{blip();openHelp()});
 D.btnHelp2.addEventListener('click',()=>{blip();openHelp()});
 D.helpClose.addEventListener('click',()=>{blip();closeHelp()});
 D.pauseBtn.addEventListener('click',()=>{blip();G.state==='paused'?resumeGame():pauseGame()});
 D.muteBtn.addEventListener('click',()=>{A.setMuted(!G.muted)});
 D.sndToggle.addEventListener('click',()=>{blip();A.setMuted(!G.muted)});
 D.mapWrap.addEventListener('click',()=>{blip();G.zoomMap=!G.zoomMap;D.mapHint.textContent=G.zoomMap?'zoom lokal':'peta penuh'});
 D.qSel.addEventListener('change',()=>{blip();setQuality(D.qSel.value)});
 D.qSelTitle.addEventListener('change',()=>{setQuality(D.qSelTitle.value)});
 D.diffSel.addEventListener('change',()=>{blip();setDiff(D.diffSel.value)});
 document.querySelectorAll('.diffCard').forEach(c=>c.addEventListener('click',()=>{blip();setDiff(c.dataset.diff)}));
 D.sensRange.addEventListener('input',()=>{G.sens=parseFloat(D.sensRange.value);D.sensVal.textContent=G.sens.toFixed(2);persist()});
 addEventListener('resize',onResize);
}
function onResize(){
 camera.aspect=innerWidth/innerHeight;
 camera.updateProjectionMatrix();
 setQuality(G.quality);
 sizeCompass();sizeMap();
}

export {initInput,onResize};
