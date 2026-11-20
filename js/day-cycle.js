// SVARGA — siklus siang/malam

import * as THREE from 'three';
import {TAU, sstep} from './utils.js';
import {G, P} from './config.js';
import {sun, hemi, scene, camera, bloomPass} from './scene.js';
import {waterU, tmpC, tmpV, tmpV2, skyU, sunSprite} from './world.js';
import {fireflyU, cloudMat} from './particles.js';

/* ============================================================ day cycle */
const PAL={
 day:{zen:new THREE.Color(0x3a7bd5),hor:new THREE.Color(0xbfe3e8),sun:new THREE.Color(0xfff3d6),fog:new THREE.Color(0xcfe8ea),hemiS:new THREE.Color(0xbcd9ff),hemiG:new THREE.Color(0x6a7f5a)},
 dusk:{zen:new THREE.Color(0x2b2a55),hor:new THREE.Color(0xff8c5a),sun:new THREE.Color(0xffb36b),fog:new THREE.Color(0xd99a76),hemiS:new THREE.Color(0xd9a0a0),hemiG:new THREE.Color(0x5a4a42)},
 night:{zen:new THREE.Color(0x070b22),hor:new THREE.Color(0x16204a),sun:new THREE.Color(0x8fa8ff),fog:new THREE.Color(0x141b33),hemiS:new THREE.Color(0x26305c),hemiG:new THREE.Color(0x10141f)}
};
const cur={zen:new THREE.Color(),hor:new THREE.Color(),sun:new THREE.Color(),fog:new THREE.Color(),hemiS:new THREE.Color(),hemiG:new THREE.Color()};
const sunDir=new THREE.Vector3(),lightDir=new THREE.Vector3();
let dayFactor=1,nightFactor=0;
function updateDay(){
 const theta=(G.dayT-.25)*TAU;
 sunDir.set(Math.cos(theta),Math.sin(theta),.3).normalize();
 const elev=sunDir.y;
 dayFactor=sstep(-.06,.14,elev);nightFactor=1-dayFactor;
 const dusk=Math.exp(-Math.pow((elev-.02)/.13,2));
 for(const k of ['zen','hor','sun','fog','hemiS','hemiG']){
  cur[k].lerpColors(PAL.night[k],PAL.day[k],dayFactor);
  cur[k].lerp(PAL.dusk[k],dusk*(k==='zen'?.4:.8));
 }
 lightDir.copy(elev>-.02?sunDir:tmpV.copy(sunDir).negate());
 skyU.uSunDir.value.copy(sunDir);skyU.uZenith.value.copy(cur.zen);skyU.uHorizon.value.copy(cur.hor);
 skyU.uSunCol.value.copy(cur.sun);skyU.uNight.value=nightFactor;
 sun.color.copy(cur.sun);
 sun.intensity=2.6*dayFactor+.24*nightFactor;
 const anchor=(G.state==='title')?tmpV2.set(0,10,0):P.pos;
 sun.position.copy(anchor).addScaledVector(lightDir,180);
 sun.target.position.copy(anchor);
 hemi.color.copy(cur.hemiS);hemi.groundColor.copy(cur.hemiG);
 hemi.intensity=.28+.5*dayFactor;
 scene.fog.color.copy(cur.fog);
 scene.fog.density=.0021+.0007*nightFactor;
 scene.background.copy(cur.fog);
 waterU.uSunDir.value.copy(lightDir);waterU.uSunCol.value.copy(cur.sun);
 waterU.uZenith.value.copy(cur.zen);waterU.uHorizon.value.copy(cur.hor);
 waterU.uFogCol.value.copy(cur.fog);waterU.uFogD.value=scene.fog.density;
 waterU.uDeep.value.setHex(0x0a3d4a).multiplyScalar(.35+.65*dayFactor);
 waterU.uShallow.value.setHex(0x2e8f8a).multiplyScalar(.35+.65*dayFactor);
 bloomPass.strength=.5+.28*nightFactor+.1*dusk;
 fireflyU.uNight.value=nightFactor;
 sunSprite.material.opacity=(.45*dayFactor+.25*dusk);
 sunSprite.material.color.copy(cur.sun);
 sunSprite.position.copy(camera.position).addScaledVector(sunDir,1050);
 cloudMat.opacity=.32*dayFactor+.08;
 cloudMat.color.copy(cur.hor).lerp(tmpC.setHex(0xffffff),.6);
}

export {dayFactor,nightFactor,updateDay};
