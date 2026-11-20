// SVARGA — update per-frame: player, shard, menara, wisp, kamera, HUD & ambient

import * as THREE from 'three';
import {clamp, damp, lerp, wrapPi, sstep} from './utils.js';
import {G, P, C, I, DIFFS, BOUND, QORDER} from './config.js';
import {D} from './dom.js';
import {camera} from './scene.js';
import {getGround, getHeight, terrainNormal, colliders, tmpC, tmpV, tmpV2, dummy, waterU, skyU, skyMesh} from './world.js';
import {windMats} from './vegetation.js';
import {beacons} from './beacons.js';
import {gate} from './temple.js';
import {shards, shardMesh, shardGlow, shardGlowGeo} from './shards.js';
import {wisps, trailGeo, TRAIL_PER} from './wisps.js';
import {spawnParticles, fireflyU, clouds, birds, birdMesh} from './particles.js';
import {player} from './player.js';
import {A} from './audio.js';
import {dayFactor, nightFactor} from './day-cycle.js';
import {setState, ignite, banish, damagePlayer, die, respawn, startVictory, showVictory} from './systems.js';
import {toast, drawCompass, drawMinimap} from './hud.js';
import {setQuality} from './quality.js';

/* ============================================================ updates */
function updatePlayer(dt){
 const active=G.state==='playing';
 const d=DIFFS[G.diff];
 // input
 let ix=0,iz=0,sprint=false;
 if(active){
  ix=(I.keys.KeyD||I.keys.ArrowRight?1:0)-(I.keys.KeyA||I.keys.ArrowLeft?1:0);
  iz=(I.keys.KeyW||I.keys.ArrowUp?1:0)-(I.keys.KeyS||I.keys.ArrowDown?1:0);
  ix+=I.joy.x;iz+=I.joy.y;
  const mag=Math.hypot(ix,iz);
  if(mag>1){ix/=mag;iz/=mag}
  sprint=(I.keys.ShiftLeft||I.keys.ShiftRight||I.joy.mag>.93)&&G.en>1;
 }
 const fx=-Math.sin(C.yaw),fz=-Math.cos(C.yaw);
 const rx=-fz,rz=fx;
 let tx=(fx*iz+rx*ix),tz=(fz*iz+rz*ix);
 const tMag=Math.hypot(tx,tz);
 const ground=getGround(P.pos.x,P.pos.z);
 P.swim=ground<-.7&&P.pos.y<.4;
 let maxSp=P.swim?5.5:(sprint?15.5:9.5);
 const n=terrainNormal(P.pos.x,P.pos.z);
 if(!P.swim&&n.y<.62)maxSp*=.45;
 if(tMag>.01){tx/=tMag;tz/=tMag}
 const rate=P.grounded||P.swim?10:3.5;
 P.vel.x=damp(P.vel.x,tx*maxSp*tMag,rate,dt);
 P.vel.z=damp(P.vel.z,tz*maxSp*tMag,rate,dt);
 // slide on steep slopes
 if(P.grounded&&!P.swim&&n.y<.6){P.vel.x+=n.x*22*dt;P.vel.z+=n.z*22*dt}
 // jump
 P.jumpBuf=Math.max(0,P.jumpBuf-dt);
 P.coyote=P.grounded?.12:Math.max(0,P.coyote-dt);
 if(active&&P.jumpBuf>0&&(P.coyote>0||(P.swim&&ground>-1.3))){
  P.vel.y=P.swim?8:10.5;P.jumpBuf=0;P.coyote=0;P.grounded=false;
  spawnParticles(P.pos.x,P.pos.y+.2,P.pos.z,6,0xd9c08c,3,.5,6,3);
 }
 if(P.swim){
  P.vel.y=damp(P.vel.y,0,8,dt);
  P.pos.y=damp(P.pos.y,-.35+Math.sin(G.elapsed*2)*.08,6,dt);
  G.en=Math.max(0,G.en-4*dt);
  if(G.en<=0){G.hp-=5*dt;G.dmgPulse=Math.max(G.dmgPulse,.3);
   if(G.drownT<=0){toast('danger','Kehabisan energi di air — cepat ke daratan!','drown',6000);G.drownT=6}
   if(G.hp<=0){G.hp=0;die();return}}
 }else{
  P.vel.y-=28*dt;
 }
 P.pos.addScaledVector(P.vel,dt);
 // ground
 const g2=getGround(P.pos.x,P.pos.z);
 if(!P.swim&&P.pos.y<=g2){
  if(P.vel.y<-14)spawnParticles(P.pos.x,g2+.2,P.pos.z,10,0xd9c08c,4,.6,7,3);
  P.pos.y=g2;P.vel.y=0;P.grounded=true;
 }else if(P.pos.y>g2+.05)P.grounded=false;
 // colliders
 for(const c of colliders){
  if(c.active===false)continue;
  const dx=P.pos.x-c.x,dz=P.pos.z-c.z;
  const dist=Math.hypot(dx,dz),min=c.r+.4;
  if(dist<min&&dist>.001){
   const push=(min-dist);
   P.pos.x+=dx/dist*push;P.pos.z+=dz/dist*push;
  }
 }
 // boundary
 const rr=Math.hypot(P.pos.x,P.pos.z);
 if(rr>BOUND){
  P.vel.x-=P.pos.x/rr*30*dt;P.vel.z-=P.pos.z/rr*30*dt;
  if(G.boundaryT<=0){toast('danger','Arus laut terlalu kuat — kembali ke daratan!','bound',8000);G.boundaryT=8}
  if(rr>BOUND+25){P.pos.x*= (BOUND+25)/rr;P.pos.z*=(BOUND+25)/rr}
 }
 G.boundaryT-=dt;G.drownT-=dt;
 // stamina / energy
 P.speed=Math.hypot(P.vel.x,P.vel.z);
 const sprinting=sprint&&P.speed>10&&P.grounded&&!P.swim;
 if(sprinting)G.en=Math.max(0,G.en-11*dt);
 else if(!P.swim)G.en=Math.min(100,G.en+d.enRegen*dt);
 G.sinceDmg+=dt;
 if(G.sinceDmg>6&&G.hp>0)G.hp=Math.min(100,G.hp+d.regen*dt);
 G.invuln=Math.max(0,G.invuln-dt);
 G.burstCd=Math.max(0,G.burstCd-dt);
 G.comboT-=dt;if(G.comboT<=0)G.combo=0;
 // facing & anim
 if(tMag>.05){
  const target=Math.atan2(tx,tz);
  P.faceYaw+=wrapPi(target-P.faceYaw)*Math.min(1,dt*10);
 }
 const g=player.group;
 g.position.copy(P.pos);
 g.rotation.y=P.faceYaw;
 const spF=clamp(P.speed/15,0,1);
 P.phase+=P.speed*dt*1.55;
 const pp=player.parts;
 if(P.swim){
  g.rotation.x=damp(g.rotation.x,1.15,6,dt);
  pp.armL.rotation.x=Math.sin(G.elapsed*4)*1.2-1;
  pp.armR.rotation.x=Math.sin(G.elapsed*4+Math.PI)*1.2-1;
  pp.legL.rotation.x=Math.sin(G.elapsed*5)*.4;pp.legR.rotation.x=-Math.sin(G.elapsed*5)*.4;
 }else{
  g.rotation.x=damp(g.rotation.x,0,8,dt);
  const air=P.grounded?0:1;
  pp.legL.rotation.x=lerp(Math.sin(P.phase)*.75*spF,.5,air);
  pp.legR.rotation.x=lerp(-Math.sin(P.phase)*.75*spF,-.35,air);
  pp.armL.rotation.x=lerp(-Math.sin(P.phase)*.55*spF,-.7,air);
  pp.armR.rotation.x=lerp(Math.sin(P.phase)*.55*spF,-.4,air);
  g.position.y+=Math.abs(Math.sin(P.phase))*.06*spF;
 }
 pp.cloak.rotation.x=.14+spF*.5+Math.sin(G.elapsed*8)*.06*spF+(P.grounded?0:.35);
 pp.staff.rotation.x=-spF*.3;
 pp.body.scale.y=1+Math.sin(G.elapsed*2.2)*.012;
 pp.tipGlow.material.opacity=.4+.25*Math.sin(G.elapsed*3)+(G.burstCd>.8?.5:0);
 player.light.intensity=2.2+(G.invuln>0?Math.sin(G.elapsed*20)*1.2:0);
 // burst ring anim
 if(player.burstT>0){
  player.burstT+=dt;
  const t=player.burstT/.5;
  if(t>=1){player.burstT=0;player.burstRing.visible=false}
  else{
   player.burstRing.scale.setScalar(1+t*9);
   player.burstRing.material.opacity=.9*(1-t);
  }
 }
 player.burstLight.intensity=damp(player.burstLight.intensity,0,8,dt);
 // shard pickup
 if(active){
  for(const sh of shards){
   if(sh.collected)continue;
   const dist=sh.pos.distanceTo(tmpV.set(P.pos.x,P.pos.y+1.1,P.pos.z));
   if(sh.fly>0){
    sh.fly+=dt/.26;
    sh.pos.lerp(tmpV,Math.min(1,dt*18));
    if(sh.fly>=1){sh.collected=true;collectShard(sh)}
   }else if(dist<1.4){sh.fly=.001}
   else if(dist<4.2){sh.pos.lerp(tmpV,dt*4)}
   else sh.pos.lerp(sh.base,dt*2);
  }
 }
 // gate victory
 if(active&&G.gate&&Math.hypot(P.pos.x,P.pos.z)<2.3&&P.pos.y>7.5)startVictory();
}
function collectShard(sh){
 G.shards++;G.stats.shards++;G.combo++;G.comboT=4;
 A.chime(G.combo-1);
 spawnParticles(P.pos.x,P.pos.y+1.3,P.pos.z,14,0x59f2ff,4,.7,2,4);
 toast('shard','+1 Serpihan Aether','sh',600);
 D.shardChip.classList.remove('pop');void D.shardChip.offsetWidth;D.shardChip.classList.add('pop');
 updateObjective(true);
}
function updateShards(dt){
 const posAttr=shardGlowGeo.attributes.position,onAttr=shardGlowGeo.attributes.aOn;
 for(let i=0;i<shards.length;i++){
  const sh=shards[i];
  if(sh.collected){
   dummy.position.copy(sh.pos);dummy.scale.setScalar(0);dummy.rotation.set(0,0,0);
  }else{
   const bob=Math.sin(G.elapsed*2+sh.phase)*.18;
   const sc=sh.fly>0?Math.max(0,1-sh.fly):1;
   dummy.position.set(sh.pos.x,sh.pos.y+bob,sh.pos.z);
   dummy.rotation.set(0,G.elapsed*1.5+sh.phase,.2);
   dummy.scale.setScalar(sc);
   posAttr.setXYZ(i,dummy.position.x,dummy.position.y,dummy.position.z);
  }
  dummy.updateMatrix();shardMesh.setMatrixAt(i,dummy.matrix);
  onAttr.setX(i,sh.collected?0:1);
 }
 shardMesh.instanceMatrix.needsUpdate=true;
 posAttr.needsUpdate=true;onAttr.needsUpdate=true;
 shardGlow.material.uniforms.uTime.value=G.elapsed;
}
function updateBeacons(dt){
 const playing=G.state==='playing';
 let nearestB=null,nearestD=1e9;
 for(const b of beacons){
  const dist=Math.hypot(P.pos.x-b.x,P.pos.z-b.z);
  if(!b.lit&&dist<nearestD){nearestD=dist;nearestB=b}
  b.crystal.rotation.y+=dt*(b.lit?1.7:.4);
  b.crystal.position.y=4.8+Math.sin(G.elapsed*1.4+b.phase)*.3;
  b.glow.position.y=b.crystal.position.y;
  b.rune.rotation.z+=dt*(b.lit?.35:.08);
  b.pMat.uniforms.uTime.value=G.elapsed;
  b.mU.uTime.value=G.elapsed;
  if(b.lit){
   b.cryMat.emissiveIntensity=damp(b.cryMat.emissiveIntensity,3.2+Math.sin(G.elapsed*3+b.phase)*.5,4,dt);
   b.light.intensity=damp(b.light.intensity,30,3,dt);
   b.pMat.uniforms.uOpacity.value=damp(b.pMat.uniforms.uOpacity.value,.55,2.5,dt);
   b.pMat.uniforms.uBoost.value=damp(b.pMat.uniforms.uBoost.value,1.2,2.5,dt);
   b.pillar.scale.y=damp(b.pillar.scale.y,130,2,dt);
   b.pillar.scale.x=b.pillar.scale.z=damp(b.pillar.scale.x,2.2,2,dt);
   b.pillar.position.y=b.pillar.scale.y/2+1;
   b.glow.material.opacity=damp(b.glow.material.opacity,.8,3,dt);
   b.glow.scale.setScalar(damp(b.glow.scale.x,9,3,dt));
   b.runeMat.color.lerp(tmpC.setHex(0xffd76a),dt*3);
   b.runeMat.opacity=damp(b.runeMat.opacity,1,3,dt);
   b.mU.uActive.value=damp(b.mU.uActive.value,1,2,dt);
  }
  if(b.ringT>0){
   b.ringT+=dt;const t=b.ringT/.8;
   if(t>=1){b.ringT=0;b.ring.visible=false}
   else{b.ring.scale.setScalar(1+t*15);b.ring.material.opacity=.9*(1-t)}
  }
 }
 // channeling
 let channeling=false;
 if(playing&&nearestB&&nearestD<6&&I.keys.KeyE){
  if(G.shards>=3){
   channeling=true;
   if(G.channelB!==nearestB){G.channel=0;G.channelB=nearestB}
   A.channelStart();
   G.channel+=dt/1.6;
   if(G.channel>=1)ignite(nearestB);
  }
 }
 if(!channeling){
  G.channel=Math.max(0,G.channel-3*dt);
  if(G.channel===0){G.channelB=null;A.channelStop()}
 }
 // prompt
 let pText='',pKey=true,pReady=false,pChannel=false;
 if(playing){
  if(nearestB&&nearestD<6){
   if(G.shards>=3){pText=`Tahan E — Nyalakan ${nearestB.def.name}`;pReady=true;pChannel=G.channel>0}
   else{pText=`${nearestB.def.name} butuh 3 serpihan (${G.shards}/3)`;pKey=false}
  }else{
   const gd=Math.hypot(P.pos.x,P.pos.z);
   if(gd<9&&!G.gate){pText=`Gerbang terkunci — nyalakan semua menara (${G.lit}/6)`;pKey=false}
   else if(gd<9&&G.gate){pText='Masuki Gerbang Svarga!';pKey=false;pReady=true}
  }
 }
 D.prompt.classList.toggle('on',!!pText);
 D.prompt.classList.toggle('ready',pReady);
 D.prompt.classList.toggle('channel',pChannel);
 if(pText)D.promptText.textContent=pText;
 D.promptKey.style.display=pKey?'':'none';
 D.chRing.style.strokeDashoffset=69.1*(1-clamp(G.channel,0,1));
 D.tInteract.classList.toggle('hot',pReady&&pKey);
}
function updateGate(dt){
 gate.portalU.uTime.value=G.elapsed;
 gate.portalU.uActive.value=damp(gate.portalU.uActive.value,G.gate?(G.state==='victory-cine'?2.2:1):0,2,dt);
 gate.glow.material.opacity=damp(gate.glow.material.opacity,G.gate?.65+Math.sin(G.elapsed*2.5)*.15:0,3,dt);
 gate.floaterMat.emissiveIntensity=damp(gate.floaterMat.emissiveIntensity,G.gate?.6:0,2,dt);
 for(const f of gate.floaters){
  f.a+=dt*f.sp;
  f.m.position.set(Math.cos(f.a)*f.r,f.h+Math.sin(G.elapsed*.8+f.a)*.6,Math.sin(f.a)*f.r);
  f.m.rotation.x+=dt*.3;f.m.rotation.y+=dt*.4;
 }
}
let nearestWispDist=999;
function updateWisps(dt){
 const d=DIFFS[G.diff];
 const playing=G.state==='playing';
 const aggro=d.aggro*(1+nightFactor*.35);
 nearestWispDist=999;
 const tPos=trailGeo.attributes.position,tA=trailGeo.attributes.aA;
 for(let wi=0;wi<wisps.length;wi++){
  const w=wisps[wi];
  const baseIdx=wi*TRAIL_PER;
  if(!w.alive||!w.enabled){
   for(let k=0;k<TRAIL_PER;k++)tA.setX(baseIdx+k,Math.max(0,tA.getX(baseIdx+k)-dt*2));
   continue;
  }
  w.t+=dt;
  const dx=P.pos.x-w.pos.x,dz=P.pos.z-w.pos.z;
  const dist=Math.hypot(dx,dz);
  nearestWispDist=Math.min(nearestWispDist,dist);
  let mvx=0,mvz=0;
  if(w.retreat>0){
   w.retreat-=dt;
   if(dist>.01){mvx=-dx/dist*6;mvz=-dz/dist*6}
  }else if(playing&&dist<aggro){
   if(dist>.01){mvx=dx/dist*d.chase;mvz=dz/dist*d.chase}
   if(dist<1.6&&Math.abs(w.pos.y-(P.pos.y+1.2))<2.6&&G.invuln<=0){
    tmpV.set(dx/Math.max(dist,.01),0,dz/Math.max(dist,.01));
    damagePlayer(d.dmg,tmpV);
    w.retreat=1.4;
   }
  }else{
   w.patA+=dt*.4;
   const tx2=w.home.x+Math.cos(w.patA)*6,tz2=w.home.z+Math.sin(w.patA)*6;
   const pdx=tx2-w.pos.x,pdz=tz2-w.pos.z,pd=Math.hypot(pdx,pdz);
   if(pd>.3){mvx=pdx/pd*2.5;mvz=pdz/pd*2.5}
  }
  w.pos.x+=mvx*dt;w.pos.z+=mvz*dt;
  const hover=getGround(w.pos.x,w.pos.z)+1.7+Math.sin(w.t*2+w.phase)*.35;
  w.pos.y=damp(w.pos.y,Math.max(hover,.8),5,dt);
  if(Math.hypot(mvx,mvz)>.1)w.grp.rotation.y=Math.atan2(mvx,mvz);
  else if(dist<aggro)w.grp.rotation.y=Math.atan2(dx,dz);
  w.shellU.uTime.value=G.elapsed+w.phase;
  // trail
  w.trailT-=dt;
  if(w.trailT<=0){
   w.trailT=.07;
   w.trailIdx=(w.trailIdx+1)%TRAIL_PER;
   const idx=baseIdx+w.trailIdx;
   tPos.setXYZ(idx,w.pos.x,w.pos.y-.2,w.pos.z);
   tA.setX(idx,.9);
  }
  for(let k=0;k<TRAIL_PER;k++){
   const idx=baseIdx+k;
   tA.setX(idx,Math.max(0,tA.getX(idx)-dt*1.1));
  }
 }
 tPos.needsUpdate=true;tA.needsUpdate=true;
}
function updateCamera(dt){
 if(G.state==='intro'){
  G.introT-=dt;
  const t=1-clamp(G.introT/2.4,0,1);
  const e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const from=tmpV.set(P.pos.x+55,P.pos.y+50,P.pos.z+85);
  const target=tmpV2.set(P.pos.x,P.pos.y+1.6,P.pos.z);
  const desired=new THREE.Vector3(
   P.pos.x+Math.sin(C.yaw)*Math.cos(C.pitch)*C.dist,
   P.pos.y+1.6+Math.sin(C.pitch)*C.dist,
   P.pos.z+Math.cos(C.yaw)*Math.cos(C.pitch)*C.dist);
  camera.position.lerpVectors(from,desired,e);
  const look=new THREE.Vector3().lerpVectors(new THREE.Vector3(0,12,0),target,e);
  camera.lookAt(look);
  if(G.introT<=0){setState('playing');C.pos.copy(camera.position)}
  return;
 }
 if(G.state==='victory-cine'){
  G.cineT+=dt;
  const a=G.cineT*.35+Math.PI/2;
  const r=Math.max(9,16-G.cineT*2.2);
  camera.position.set(Math.cos(a)*r,12.5+Math.sin(G.cineT*.5),Math.sin(a)*r);
  camera.lookAt(0,12,0);
  if(Math.random()<.3)spawnParticles((Math.random()-.5)*4,9+Math.random()*3,(Math.random()-.5)*4,3,0xffd76a,5,1.5,2,5);
  if(G.cineT>3.2)showVictory();
  return;
 }
 if(G.state==='title'){
  G.menuT+=dt;
  const a=G.menuT*.06;
  camera.position.set(Math.cos(a)*62,26+Math.sin(G.menuT*.15)*4,Math.sin(a)*62);
  camera.lookAt(0,11,0);
  return;
 }
 // follow
 const target=tmpV.set(P.pos.x,P.pos.y+1.6,P.pos.z);
 const desired=tmpV2.set(
  target.x+Math.sin(C.yaw)*Math.cos(C.pitch)*C.dist,
  target.y+Math.sin(C.pitch)*C.dist,
  target.z+Math.cos(C.yaw)*Math.cos(C.pitch)*C.dist);
 desired.y=Math.max(desired.y,getHeight(desired.x,desired.z)+.6);
 C.pos.x=damp(C.pos.x,desired.x,12,dt);
 C.pos.y=damp(C.pos.y,desired.y,12,dt);
 C.pos.z=damp(C.pos.z,desired.z,12,dt);
 camera.position.copy(C.pos);
 if(G.shake>0){
  G.shake=Math.max(0,G.shake-dt*1.4);
  const s=G.shake*.35;
  camera.position.x+=(Math.random()-.5)*s;
  camera.position.y+=(Math.random()-.5)*s;
  camera.position.z+=(Math.random()-.5)*s;
 }
 camera.lookAt(target);
 const sprintFov=P.speed>11?70:62;
 C.fov=damp(C.fov,sprintFov,5,dt);
 if(Math.abs(camera.fov-C.fov)>.05){camera.fov=C.fov;camera.updateProjectionMatrix()}
}
function updateObjective(force){
 if(!force&&G.objT>0)return;
 G.objT=.25;
 D.objShards.textContent=G.shards;
 D.objBeacons.textContent=G.lit+' / 6';
 D.shardNum.textContent=G.shards;
 if(G.lit>=6){
  D.objMain.textContent='Masuki Gerbang Svarga';
  D.objMain.classList.add('pulse');
  D.objSub.textContent='Kuil pusat lembah · '+Math.round(Math.hypot(P.pos.x,P.pos.z))+'m';
 }else if(G.shards>=3){
  let nb=null,nd=1e9;
  for(const b of beacons){if(b.lit)continue;const d=Math.hypot(P.pos.x-b.x,P.pos.z-b.z);if(d<nd){nd=d;nb=b}}
  D.objMain.textContent='Nyalakan menara terdekat';
  D.objSub.textContent=nb?`${nb.def.name} · ${Math.round(nd)}m`:'';
 }else{
  let ns=null,nd=1e9;
  for(const sh of shards){if(sh.collected)continue;const d=sh.pos.distanceTo(P.pos);if(d<nd){nd=d;ns=sh}}
  D.objMain.textContent=`Kumpulkan serpihan aether (${G.shards}/3)`;
  D.objSub.textContent=ns?`Serpihan terdekat · ${Math.round(nd)}m`:'';
 }
}
function updateHUD(dt){
 G.objT-=dt;
 updateObjective(false);
 D.hpFill.style.width=clamp(G.hp,0,100)+'%';
 D.hpVal.textContent=Math.ceil(G.hp);
 D.enFill.style.width=clamp(G.en,0,100)+'%';
 D.enVal.textContent=Math.ceil(G.en);
 D.hpFill.parentElement.classList.toggle('low',G.hp<30);
 const cd=G.burstCd/1.1;
 const cdBg=cd>0?`conic-gradient(rgba(6,8,20,.78) ${cd}turn, transparent 0)`:'none';
 D.burstCd.style.background=cdBg;D.tBurstCd.style.background=cdBg;
 D.burstChip.classList.toggle('dim',G.en<35);
 D.burstChip.classList.toggle('ready',G.en>=35&&G.burstCd<=0);
 G.dmgPulse=Math.max(0,G.dmgPulse-dt*1.6);
 D.dmg.style.opacity=Math.max(G.dmgPulse,G.hp<30&&G.hp>0?.22+Math.sin(G.elapsed*3)*.08:0);
 drawCompass();
 G.mapFrame++;
 if(G.mapFrame%2===0)drawMinimap();
 G.timeT-=dt;
 if(G.timeT<=0){
  G.timeT=1;
  const t=G.dayT;
  const lbl=t<.22?'Malam':t<.3?'Fajar':t<.45?'Pagi':t<.58?'Siang':t<.72?'Sore':t<.8?'Senja':'Malam';
  D.timeLabel.textContent=lbl;
  const night=lbl==='Malam';
  D.timeIconSun.style.display=night?'none':'';
  D.timeIconMoon.style.display=night?'':'none';
 }
 G.hintT+=dt;
 if(G.hintT>25)D.hintBar.classList.add('faded');
 if(G.state==='dead'){
  G.deadT-=dt;
  D.deathCount.textContent=Math.max(1,Math.ceil(G.deadT));
  if(G.deadT<=0)respawn();
 }
 // fps + auto quality
 G.frames++;G.fpsAcc+=dt;G.fpsT-=dt;
 if(G.fpsT<=0){
  G.fpsT=.5;
  const fps=G.frames/Math.max(.001,G.fpsAcc);
  G.fpsE=G.fpsE*.6+fps*.4;
  D.fps.textContent=Math.round(G.fpsE)+' FPS';
  G.frames=0;G.fpsAcc=0;
 }
 if(G.state==='playing'&&G.fpsE<33){
  G.lowT+=dt;
  if(G.lowT>4&&G.autoDrops<2){
   const qi=QORDER.indexOf(G.quality);
   if(qi>0){
    G.autoDrops++;G.lowT=0;
    setQuality(QORDER[qi-1]);
    toast('info','Kualitas grafis diturunkan otomatis demi kelancaran.','autoq',9000);
   }else G.lowT=0;
  }
 }else G.lowT=Math.max(0,G.lowT-dt);
 D.lockHint.classList.toggle('on',G.state==='playing'&&!I.locked&&!I.touch&&I.lockOK);
}
function updateAmbient(dt){
 skyU.uTime.value=G.elapsed;
 waterU.uTime.value=G.elapsed;
 for(const m of windMats)if(m.userData.shader)m.userData.shader.uniforms.uTime.value=G.elapsed;
 fireflyU.uTime.value=G.elapsed;
 skyMesh.position.copy(camera.position);
 for(const c of clouds){
  c.position.x+=c.userData.sp*dt;
  if(c.position.x>720)c.position.x=-720;
 }
 // birds
 const dayB=sstep(.1,.3,dayFactor);
 for(let i=0;i<birds.length;i++){
  const b=birds[i];
  b.a+=dt*b.sp;
  const bx=b.cx+Math.cos(b.a)*b.r,bz=b.cz+Math.sin(b.a)*b.r;
  const by=b.h+Math.sin(G.elapsed*.7+b.ph)*2;
  const heading=-b.a;
  const flap=Math.sin(G.elapsed*9+b.ph)*.55;
  for(let k=0;k<2;k++){
   dummy.position.set(bx,by,bz);
   dummy.rotation.set(0,heading+(k?Math.PI:0),k?-flap:flap);
   dummy.scale.setScalar(b.s*dayB);
   dummy.updateMatrix();
   birdMesh.setMatrixAt(i*2+k,dummy.matrix);
  }
 }
 birdMesh.instanceMatrix.needsUpdate=true;
}

export {updatePlayer,collectShard,updateShards,updateBeacons,updateGate,nearestWispDist,updateWisps,updateCamera,updateObjective,updateHUD,updateAmbient};
