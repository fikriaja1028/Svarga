// SVARGA — loop utama & boot

import * as THREE from 'three';
import {G, P, DAY_LEN} from './config.js';
import {D} from './dom.js';
import {renderer, scene, camera, composer} from './scene.js';
import {buildTerrain, buildWater} from './world.js';
import {buildVegetation} from './vegetation.js';
import {buildBeacons} from './beacons.js';
import {buildTemple} from './temple.js';
import {buildShards} from './shards.js';
import {buildWisps} from './wisps.js';
import {buildParticles, buildFireflies, buildClouds, buildBirds, updateParticles} from './particles.js';
import {buildPlayer} from './player.js';
import {updateDay} from './day-cycle.js';
import {A} from './audio.js';
import {buildMapBase, sizeCompass, sizeMap, updateBestChip} from './hud.js';
import {setState, resetRun} from './systems.js';
import {updatePlayer, updateShards, updateBeacons, updateGate, updateWisps, updateCamera, updateHUD, updateAmbient, nearestWispDist} from './updates.js';
import {setQuality, setDiff} from './quality.js';
import {initInput} from './input.js';

/* ============================================================ main loop */
const clock=new THREE.Clock();
let frameCount=0;
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.05);
 G.elapsed+=dt;
 frameCount++;
 const s=G.state;
 if(s==='playing'||s==='intro'||s==='victory-cine'||s==='dead'){
  if(s!=='dead')G.runTime+=dt;
  G.dayT=(.32+G.runTime/DAY_LEN)%1;
  updatePlayer(dt);
  updateWisps(dt);
  updateShards(dt);
  updateBeacons(dt);
  updateGate(dt);
  updateParticles(dt);
  updateCamera(dt);
  updateHUD(dt);
  A.update(dt,nearestWispDist,P.speed);
 }else if(s==='title'){
  G.dayT=.305+Math.sin(G.menuT*.02)*.008;
  updateShards(dt);
  updateBeacons(dt);
  updateGate(dt);
  updateParticles(dt);
  updateCamera(dt);
  A.update(dt,999,0);
 }else if(s==='victory'){
  updateShards(dt);updateBeacons(dt);updateGate(dt);updateParticles(dt);
  A.update(dt,999,0);
 }
 updateDay();
 updateAmbient(dt);
 if(frameCount%2===0)renderer.shadowMap.needsUpdate=true;
 composer.render();
}

/* ============================================================ boot */
function setLoad(p,txt){
 D.loadBar.style.width=p+'%';D.loadPct.textContent=Math.round(p)+'%';D.loadStep.textContent=txt;
 return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
}
async function boot(){
 try{
  await setLoad(6,'Membangkitkan benih dunia…');
  buildTerrain();
  await setLoad(24,'Memahat lembah dan pegunungan…');
  buildWater();
  await setLoad(38,'Mengisi laut dan buih pantai…');
  buildVegetation();
  await setLoad(56,'Menanam hutan dan padang rumput…');
  buildBeacons();buildTemple();
  await setLoad(72,'Mendirikan menara kuno…');
  buildShards();buildWisps();buildPlayer();
  await setLoad(84,'Memanggil bayangan dan serpihan…');
  buildParticles();buildFireflies();buildClouds();buildBirds();buildMapBase();
  await setLoad(93,'Menyalakan cahaya…');
  initInput();
  setDiff(G.diff);setQuality(G.quality);
  A.setMuted(G.muted);
  D.sensRange.value=G.sens;D.sensVal.textContent=G.sens.toFixed(2);
  updateBestChip();
  sizeCompass();sizeMap();
  resetRun();
  updateDay();
  renderer.compile(scene,camera);
  composer.render();
  await setLoad(100,'Dunia siap dijelajahi.');
  window.__svargaBoot=true;
  setState('title');
  animate();
 }catch(err){
  console.error(err);
  D.fatalMsg.textContent='Terjadi kendala saat membangun dunia: '+(err&&err.message?err.message:err);
  D.fatal.classList.add('on');
 }
}
boot();
