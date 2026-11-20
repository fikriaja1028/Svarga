// SVARGA — toast, kompas & minimap

import * as THREE from 'three';
import {TAU, wrapPi, fmtTime, clamp} from './utils.js';
import {G, P, C, DIFFS, WORLD, HALF} from './config.js';
import {D} from './dom.js';
import {beacons} from './beacons.js';
import {shards} from './shards.js';
import {wisps} from './wisps.js';
import {getHeight} from './world.js';

/* ============================================================ HUD helpers */
const toastThrottle={};
function toast(type,text,key,thr){
 const now=performance.now();
 if(key){if(toastThrottle[key]&&now-toastThrottle[key]<(thr||1500))return;toastThrottle[key]=now}
 const icons={shard:'◆',success:'✦',danger:'⚠',info:'ℹ'};
 const el=document.createElement('div');
 el.className='toast '+type;
 el.innerHTML=`<span class="ti">${icons[type]||'ℹ'}</span><span>${text}</span>`;
 D.toasts.appendChild(el);
 while(D.toasts.children.length>4)D.toasts.firstChild.remove();
 setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),320)},3400);
}
function flash(op,color){D.flash.style.background=color||'#fff';D.flash.style.transition='none';D.flash.style.opacity=op;requestAnimationFrame(()=>requestAnimationFrame(()=>{D.flash.style.transition='opacity .55s ease';D.flash.style.opacity=0}))}
function updateBestChip(){
 const b=G.best[G.diff];
 D.bestChip.textContent=`Rekor ${DIFFS[G.diff].label}: ${b?fmtTime(b):'—'}`;
}
/* compass */
const compCtx=D.compass.getContext('2d');
function sizeCompass(){
 const w=D.compass.clientWidth||440,dpr=Math.min(devicePixelRatio||1,2);
 D.compass.width=w*dpr;D.compass.height=38*dpr;compCtx.setTransform(dpr,0,0,dpr,0,0);
}
function drawCompass(){
 const w=D.compass.clientWidth,h=38;
 if(!w)return;
 compCtx.clearRect(0,0,w,h);
 const heading=-C.yaw;
 const cx=w/2,span=1.25;
 compCtx.fillStyle='rgba(8,11,28,.5)';
 compCtx.beginPath();compCtx.roundRect?compCtx.roundRect(0,4,w,30,10):compCtx.rect(0,4,w,30);compCtx.fill();
 compCtx.strokeStyle='rgba(245,196,81,.25)';compCtx.stroke();
 compCtx.textAlign='center';compCtx.textBaseline='middle';
 for(let deg=-180;deg<180;deg+=15){
  const rel=wrapPi(deg*Math.PI/180-heading);
  if(Math.abs(rel)>span)continue;
  const x=cx+rel/span*(w/2-14);
  const major=((deg%90)+90)%90===0;
  compCtx.strokeStyle=major?'rgba(245,196,81,.9)':'rgba(154,163,199,.45)';
  compCtx.lineWidth=major?2:1;
  compCtx.beginPath();compCtx.moveTo(x,major?9:14);compCtx.lineTo(x,major?17:19);compCtx.stroke();
  if(major){
   const lbl={0:'U',90:'T',180:'S',270:'B'}[((deg%360)+360)%360];
   compCtx.fillStyle='#ffd76a';compCtx.font='800 11px "Plus Jakarta Sans"';
   compCtx.fillText(lbl,x,26);
  }
 }
 const mark=(bx,bz,color,lit,star)=>{
  const dx=bx-P.pos.x,dz=bz-P.pos.z;
  const bearing=Math.atan2(dx,-dz);
  const rel=wrapPi(bearing-heading);
  if(Math.abs(rel)>span)return;
  const x=cx+rel/span*(w/2-14);
  compCtx.save();compCtx.translate(x,13);
  if(star){
   compCtx.fillStyle=color;compCtx.font='800 12px "Plus Jakarta Sans"';compCtx.fillText('✦',0,1);
  }else{
   compCtx.rotate(Math.PI/4);
   compCtx.fillStyle=lit?color:'rgba(13,18,44,.9)';
   compCtx.strokeStyle=color;compCtx.lineWidth=1.6;
   compCtx.fillRect(-3.4,-3.4,6.8,6.8);compCtx.strokeRect(-3.4,-3.4,6.8,6.8);
  }
  compCtx.restore();
  compCtx.fillStyle='rgba(244,234,216,.75)';compCtx.font='700 8px "Plus Jakarta Sans"';
  compCtx.fillText(Math.round(Math.hypot(dx,dz))+'',x,31);
 };
 for(const b of beacons)mark(b.x,b.z,'#'+new THREE.Color(b.def.accent).getHexString(),b.lit,false);
 mark(0,0,G.gate?'#ffd76a':'rgba(154,163,199,.7)',true,true);
 compCtx.fillStyle='#ffd76a';
 compCtx.beginPath();compCtx.moveTo(cx,2);compCtx.lineTo(cx-4.5,-3);compCtx.lineTo(cx+4.5,-3);compCtx.closePath();compCtx.fill();
 compCtx.beginPath();compCtx.moveTo(cx,5);compCtx.lineTo(cx-4,1);compCtx.lineTo(cx+4,1);compCtx.closePath();compCtx.fill();
}
/* minimap */
const mapCtx=D.minimap.getContext('2d');
let mapBase;
function buildMapBase(){
 mapBase=document.createElement('canvas');mapBase.width=mapBase.height=256;
 const x=mapBase.getContext('2d'),img=x.createImageData(256,256);
 for(let r=0;r<256;r++)for(let c=0;c<256;c++){
  const wx=-HALF+c/255*WORLD,wz=-HALF+r/255*WORLD;
  const h=getHeight(wx,wz);
  let col;
  if(h<0)col=[14+clamp(-h,0,10)*2,63+clamp(-h,0,10)*2,74+clamp(-h,0,10)*2];
  else if(h<3)col=[201,178,128];
  else if(h<26){const t=(h-3)/23;col=[62+t*40,116+t*20,64+t*10]}
  else if(h<52)col=[128,124,112];
  else col=[226,232,238];
  const sh=clamp(1+(getHeight(wx-4,wz)-h)*.06,.7,1.25);
  const i=(r*256+c)*4;
  img.data[i]=col[0]*sh;img.data[i+1]=col[1]*sh;img.data[i+2]=col[2]*sh;img.data[i+3]=255;
 }
 x.putImageData(img,0,0);
}
function sizeMap(){
 const s=D.minimap.clientWidth||156,dpr=Math.min(devicePixelRatio||1,2);
 D.minimap.width=s*dpr;D.minimap.height=s*dpr;mapCtx.setTransform(dpr,0,0,dpr,0,0);
}
function drawMinimap(){
 const s=D.minimap.clientWidth;if(!s||!mapBase)return;
 mapCtx.clearRect(0,0,s,s);
 mapCtx.save();
 mapCtx.beginPath();mapCtx.roundRect?mapCtx.roundRect(0,0,s,s,11):mapCtx.rect(0,0,s,s);mapCtx.clip();
 const zoom=G.zoomMap?2.6:1;
 const px=(P.pos.x+HALF)/WORLD*s,pz=(P.pos.z+HALF)/WORLD*s;
 mapCtx.translate(s/2,s/2);mapCtx.scale(zoom,zoom);
 mapCtx.translate(G.zoomMap?-px:-s/2,G.zoomMap?-pz:-s/2);
 mapCtx.drawImage(mapBase,0,0,s,s);
 const toMap=(x,z)=>[(x+HALF)/WORLD*s,(z+HALF)/WORLD*s];
 // shards
 for(const sh of shards){
  if(sh.collected)continue;
  const [mx,mz]=toMap(sh.pos.x,sh.pos.z);
  const near=Math.hypot(sh.pos.x-P.pos.x,sh.pos.z-P.pos.z)<120;
  mapCtx.fillStyle=near?'rgba(89,242,255,.95)':'rgba(89,242,255,.4)';
  mapCtx.beginPath();mapCtx.arc(mx,mz,near?2.2:1.5,0,TAU);mapCtx.fill();
 }
 // wisps
 for(const w of wisps){
  if(!w.alive||!w.enabled)continue;
  if(Math.hypot(w.pos.x-P.pos.x,w.pos.z-P.pos.z)>90)continue;
  const [mx,mz]=toMap(w.pos.x,w.pos.z);
  mapCtx.fillStyle='rgba(255,61,109,.95)';
  mapCtx.beginPath();mapCtx.arc(mx,mz,2.2,0,TAU);mapCtx.fill();
 }
 // beacons
 for(const b of beacons){
  const [mx,mz]=toMap(b.x,b.z);
  mapCtx.save();mapCtx.translate(mx,mz);mapCtx.rotate(Math.PI/4);
  const col='#'+new THREE.Color(b.def.accent).getHexString();
  if(b.lit){
   mapCtx.shadowColor=col;mapCtx.shadowBlur=6;
   mapCtx.fillStyle=col;mapCtx.fillRect(-3.4,-3.4,6.8,6.8);
  }else{
   mapCtx.strokeStyle=col;mapCtx.lineWidth=1.6;mapCtx.strokeRect(-3.2,-3.2,6.4,6.4);
  }
  mapCtx.restore();
 }
 // gate
 {
  const [mx,mz]=toMap(0,0);
  mapCtx.fillStyle=G.gate?'#ffd76a':'rgba(200,200,210,.75)';
  mapCtx.font=`800 ${G.gate?13+Math.sin(G.elapsed*4)*2:11}px "Plus Jakarta Sans"`;
  mapCtx.textAlign='center';mapCtx.textBaseline='middle';
  if(G.gate){mapCtx.shadowColor='#ffd76a';mapCtx.shadowBlur=8}
  mapCtx.fillText('✦',mx,mz);mapCtx.shadowBlur=0;
 }
 // player + view wedge
 {
  const heading=-C.yaw;
  mapCtx.save();mapCtx.translate(px,pz);
  mapCtx.rotate(heading);
  mapCtx.fillStyle='rgba(89,242,255,.16)';
  mapCtx.beginPath();mapCtx.moveTo(0,0);mapCtx.arc(0,0,22,-Math.PI/2-.55,-Math.PI/2+.55);mapCtx.closePath();mapCtx.fill();
  mapCtx.fillStyle='#fff';mapCtx.strokeStyle='#59f2ff';mapCtx.lineWidth=1.4;
  mapCtx.beginPath();mapCtx.moveTo(0,-6);mapCtx.lineTo(4.4,4.5);mapCtx.lineTo(0,2.2);mapCtx.lineTo(-4.4,4.5);mapCtx.closePath();
  mapCtx.fill();mapCtx.stroke();
  mapCtx.restore();
 }
 mapCtx.restore();
 mapCtx.fillStyle='rgba(255,215,106,.9)';mapCtx.font='800 9px "Plus Jakarta Sans"';mapCtx.textAlign='center';
 mapCtx.fillText('U',s/2,10);
}

export {toast,flash,updateBestChip,sizeCompass,drawCompass,buildMapBase,sizeMap,drawMinimap};
