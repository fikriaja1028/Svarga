// SVARGA — alur: jeda, misi, ledakan, mati & menang

import * as THREE from 'three';
import {fmtTime} from './utils.js';
import {G, P, C, I, DIFFS, persist} from './config.js';
import {D} from './dom.js';
import {A} from './audio.js';
import {beacons} from './beacons.js';
import {gate} from './temple.js';
import {shards, shardGlowGeo} from './shards.js';
import {wisps, applyWispDifficulty, trailGeo} from './wisps.js';
import {pGeo, pLife, spawnParticles} from './particles.js';
import {player} from './player.js';
import {getGround} from './world.js';
import {updateObjective} from './updates.js';
import {toast, flash, updateBestChip} from './hud.js';

/* ============================================================ game flow */
const SCREENS={loading:D.loading,title:D.title,paused:D.pause,dead:D.death,victory:D.victory};
function setState(s){
 G.state=s;document.body.dataset.state=s;
 for(const k in SCREENS)SCREENS[k].classList.toggle('on',k===s);
 const ducks={playing:.9,intro:.9,paused:.3,title:.5,dead:.5,victory:.9,'victory-cine':.9,loading:.5};
 A.duck(ducks[s]||.5);
 D.lockHint.classList.toggle('on',s==='playing'&&!I.locked&&!I.touch&&I.lockOK);
 if(s==='paused'){D.pTime.textContent=fmtTime(G.runTime);D.pBeacons.textContent=G.lit+'/6';D.pShards.textContent=G.stats.shards}
}
function requestLock(){
 if(I.touch||!I.lockOK)return;
 try{
  const p=D.game.requestPointerLock();
  if(p&&p.catch)p.catch(()=>{I.lockOK=false;D.lockHintText.textContent='Tahan klik kanan untuk melihat sekeliling'});
 }catch(e){I.lockOK=false}
}
function exitLock(){if(document.pointerLockElement){G.lockWasOurs=false;document.exitPointerLock()}}
function pauseGame(){if(G.state!=='playing'&&G.state!=='intro')return;setState('paused');exitLock();I.keys={};A.channelStop()}
function resumeGame(){if(G.state!=='paused')return;setState(P.pos.y<-50?'playing':(G.introT>0?'intro':'playing'));requestLock()}
function openHelp(){
 G.helpReturn=G.state;
 if(G.state==='playing'||G.state==='intro')pauseGame();
 document.body.classList.add('help-on');D.help.classList.add('on');
}
function closeHelp(){
 document.body.classList.remove('help-on');D.help.classList.remove('on');
 if(G.helpReturn==='playing'||G.helpReturn==='intro')resumeGame();
 G.helpReturn=null;
}
function resetRun(){
 G.runTime=0;G.dayT=.32;G.hp=100;G.en=100;G.shards=0;G.lit=0;G.gate=false;
 G.stats={shards:0,banished:0,deaths:0};
 G.channel=0;G.channelB=null;G.combo=0;G.invuln=0;G.sinceDmg=99;G.burstCd=0;G.shake=0;G.dmgPulse=0;
 G.deadT=0;G.cineT=0;G.hintT=0;G.lowT=0;
 A.channelStop();
 for(const sh of shards){sh.collected=false;sh.fly=0;sh.pos.copy(sh.base)}
 shardGlowGeo.attributes.aOn.array.fill(1);shardGlowGeo.attributes.aOn.needsUpdate=true;
 for(const b of beacons){
  b.lit=false;b.ringT=0;b.ring.visible=false;
  b.cryMat.emissiveIntensity=.5;b.runeMat.color.setHex(0x2a4a66);b.runeMat.opacity=.55;
  b.pMat.uniforms.uOpacity.value=.1;b.pMat.uniforms.uBoost.value=0;
  b.pillar.scale.set(1.4,26,1.4);b.pillar.position.y=14;
  b.glow.material.opacity=.3;b.glow.scale.setScalar(3.5);
  b.light.intensity=0;b.mU.uActive.value=0;
 }
 gate.active=false;gate.portalU.uActive.value=0;gate.glow.material.opacity=0;
 gate.floaterMat.emissiveIntensity=0;gate.collider.active=true;
 applyWispDifficulty();
 for(const w of wisps){
  w.alive=true;w.retreat=0;w.pos.set(w.home.x,getGround(w.home.x,w.home.z)+1.7,w.home.z);
  w.grp.visible=w.enabled;
 }
 trailGeo.attributes.aA.array.fill(0);trailGeo.attributes.aA.needsUpdate=true;
 pLife.fill(0);pGeo.attributes.aAlpha.array.fill(0);pGeo.attributes.aAlpha.needsUpdate=true;
 player.burstRing.visible=false;player.burstLight.intensity=0;
 P.pos.set(0,getGround(0,168),168);P.vel.set(0,0,0);P.faceYaw=Math.PI;P.grounded=true;P.swim=false;
 C.yaw=0;C.pitch=.32;C.dist=8.5;
 player.group.visible=true;player.group.position.copy(P.pos);player.group.rotation.set(0,Math.PI,0);
 D.toasts.innerHTML='';
 D.hintBar.classList.remove('faded');
 D.objMain.classList.remove('pulse');
 updateObjective(true);
}
function startRun(withIntro){
 resetRun();
 G.introT=withIntro?2.4:0;
 setState(withIntro?'intro':'playing');
 requestLock();
 if(withIntro){
  toast('info','Enam menara menanti cahaya. Ikuti pilar di kejauhan.','m1',100);
 }else flash(.5,'#fff');
}
function ignite(b){
 b.lit=true;G.shards-=3;G.lit++;G.channel=0;G.channelB=null;A.channelStop();
 b.ringT=.001;b.ring.visible=true;
 spawnParticles(b.x,b.h+5,b.z,70,b.def.accent,9,1.4,4,5);
 A.beacon();G.shake=Math.max(G.shake,.35);
 let ban=0;
 for(const w of wisps){if(w.alive&&w.enabled&&Math.hypot(w.pos.x-b.x,w.pos.z-b.z)<90){banish(w,false);ban++}}
 toast('success',`${b.def.name} menyala! (${G.lit}/6)`);
 if(ban>0)toast('info',`${ban} bayangan terusir oleh cahaya menara.`,'ban',2000);
 if(G.lit>=6)openGate();
 updateObjective(true);
}
function openGate(){
 G.gate=true;gate.active=true;gate.collider.active=false;
 A.gate();flash(.35,'#ffd76a');
 toast('success','Semua menara menyala — Gerbang Svarga terbuka di pusat lembah!');
 D.objMain.classList.add('pulse');
 spawnParticles(0,13,0,90,0xffd76a,10,2,3,6);
}
function banish(w,byBurst){
 w.alive=false;w.grp.visible=false;G.stats.banished++;
 spawnParticles(w.pos.x,w.pos.y,w.pos.z,26,0xb44dff,7,.9,2,4);
 spawnParticles(w.pos.x,w.pos.y,w.pos.z,10,0xff3df0,4,.7,1,3);
 A.banish();
 if(byBurst)toast('info','Bayangan terusir!','ban',1600);
}
function doBurst(){
 if(G.state!=='playing'||G.burstCd>0)return;
 if(G.en<35){toast('danger','Energi tidak cukup untuk ledakan!','en',2000);return}
 G.en-=35;G.burstCd=1.1;
 const x=P.pos.x,y=P.pos.y+.5,z=P.pos.z;
 player.burstRing.position.set(x,getGround(x,z)+.35,z);
 player.burstRing.visible=true;player.burstT=.001;
 player.burstLight.position.set(x,y+1,z);player.burstLight.intensity=60;
 spawnParticles(x,y+1,z,44,0x8ff4ff,11,.8,3,5);
 A.burst();G.shake=Math.max(G.shake,.3);
 for(const w of wisps){
  if(w.alive&&w.enabled&&Math.hypot(w.pos.x-x,w.pos.z-z)<9&&Math.abs(w.pos.y-y)<5)banish(w,true);
 }
}
function damagePlayer(dmg,dir){
 if(G.invuln>0||G.state!=='playing')return;
 G.hp-=dmg;G.invuln=.7;G.sinceDmg=0;G.dmgPulse=.85;G.shake=Math.max(G.shake,.5);
 P.vel.addScaledVector(dir,9);P.vel.y+=3;
 A.hurt();
 if(G.hp<=0){G.hp=0;die()}
}
function die(){
 G.stats.deaths++;setState('dead');G.deadT=3.2;exitLock();
 A.death();A.channelStop();
 spawnParticles(P.pos.x,P.pos.y+1.2,P.pos.z,50,0x59f2ff,6,1.4,1,5);
 player.group.visible=false;
 D.deathCount.textContent='3';
}
function respawn(){
 let bx=0,bz=168,best=1e9;
 for(const b of beacons){if(!b.lit)continue;const d=Math.hypot(b.x-P.pos.x,b.z-P.pos.z);if(d<best){best=d;bx=b.x+7;bz=b.z+7}}
 P.pos.set(bx,getGround(bx,bz)+.2,bz);P.vel.set(0,0,0);
 G.hp=100;G.en=100;G.invuln=2.5;
 player.group.visible=true;
 C.pos.copy(P.pos).add(new THREE.Vector3(Math.sin(C.yaw)*C.dist,3,Math.cos(C.yaw)*C.dist));
 setState('playing');flash(.7,'#fff');
 toast('info','Cahaya memanggilmu kembali. Progres tetap terjaga.');
 requestLock();
}
function startVictory(){
 setState('victory-cine');G.cineT=0;exitLock();
 A.victory();
 toast('success','Kau melangkah ke dalam cahaya…');
}
function showVictory(){
 const t=G.runTime,d=G.stats.deaths;
 const rank=(t<420&&d===0)?'S':(t<600&&d<=1)?'A':(t<900)?'B':'C';
 const descs={S:'Legenda lembah — cepat, berani, tanpa gugur.',A:'Penjelajah ulung dengan nyala yang teguh.',B:'Cahaya menang, meski jalan berliku.',C:'Lembah mengingat kegigihanmu.'};
 D.rankLetter.textContent=rank;D.rankDesc.textContent=descs[rank];
 D.stTime.textContent=fmtTime(t);D.stShards.textContent=G.stats.shards;
 D.stWisps.textContent=G.stats.banished;D.stDeaths.textContent=d;
 const prev=G.best[G.diff];
 if(!prev||t<prev){G.best[G.diff]=Math.floor(t);persist();D.recordLine.textContent=`✦ Rekor baru untuk mode ${DIFFS[G.diff].label}!`;updateBestChip()}
 else D.recordLine.textContent=`Rekor ${DIFFS[G.diff].label}: ${fmtTime(prev)}`;
 setState('victory');
}

export {SCREENS,setState,requestLock,exitLock,pauseGame,resumeGame,openHelp,closeHelp,resetRun,startRun,ignite,openGate,banish,doBurst,damagePlayer,die,respawn,startVictory,showVictory};
