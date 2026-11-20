// SVARGA — vegetasi: rumput, pohon, batu, bunga

import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {TAU, rng, fbm} from './utils.js';
import {getHeight, terrainNormal, pads, colliders, dummy, tmpC} from './world.js';
import {scene, bladeTex} from './scene.js';

/* ============================================================ vegetation */
const windMats=[];
function addWind(mat,amp,key){
 mat.onBeforeCompile=shader=>{
  shader.uniforms.uTime={value:0};
  shader.vertexShader=shader.vertexShader
   .replace('#include <common>','#include <common>\nuniform float uTime;')
   .replace('#include <begin_vertex>',`#include <begin_vertex>
   #ifdef USE_INSTANCING
    vec2 ip=vec2(instanceMatrix[3][0],instanceMatrix[3][2]);
    float wPh=ip.x*0.35+ip.y*0.27;
    float sway=sin(uTime*1.9+wPh)+0.5*sin(uTime*3.7+wPh*1.7);
    transformed.x+=sway*${amp.toFixed(3)}*uv.y*uv.y;
    transformed.z+=cos(uTime*1.5+wPh)*${(amp*.6).toFixed(3)}*uv.y*uv.y;
   #endif`);
  mat.userData.shader=shader;windMats.push(mat);
 };
 mat.customProgramCacheKey=()=>key;
}
let grassMesh,canopyMesh,pineMesh,trunkMesh,rockMesh,flowerMesh;
function validSpot(x,z,minH,maxH,slope){
 const h=getHeight(x,z);
 if(h<minH||h>maxH)return false;
 if(terrainNormal(x,z).y<slope)return false;
 for(const p of pads){if(Math.hypot(x-p.x,z-p.z)<p.r*.9)return false}
 return true;
}
function buildVegetation(){
 // grass
 const b1=new THREE.PlaneGeometry(1.15,1.15);b1.translate(0,.57,0);
 const b2=b1.clone();b2.rotateY(Math.PI/2);
 const gGeo=mergeGeometries([b1,b2]);
 const gMat=new THREE.MeshStandardMaterial({map:bladeTex,alphaTest:.45,side:THREE.DoubleSide,roughness:.9,metalness:0});
 addWind(gMat,.17,'windGrass');
 grassMesh=new THREE.InstancedMesh(gGeo,gMat,9000);
 grassMesh.frustumCulled=false;grassMesh.receiveShadow=true;
 let gi=0,tries=0;
 while(gi<9000&&tries<60000){tries++;
  const x=(rng()*2-1)*430,z=(rng()*2-1)*430;
  if(!validSpot(x,z,3,28,.78))continue;
  if(fbm(x*.02+11,z*.02+3,3)<.42)continue;
  dummy.position.set(x,getHeight(x,z)-.03,z);
  dummy.rotation.set(0,rng()*TAU,0);
  const s=.7+rng()*.9;dummy.scale.set(s,s*(0.8+rng()*.6),s);
  dummy.updateMatrix();grassMesh.setMatrixAt(gi,dummy.matrix);
  tmpC.setHSL(.24+rng()*.07,.42+rng()*.2,.32+rng()*.14);
  grassMesh.setColorAt(gi,tmpC);gi++;
 }
 grassMesh.count=gi;grassMesh.instanceMatrix.needsUpdate=true;
 if(grassMesh.instanceColor)grassMesh.instanceColor.needsUpdate=true;
 scene.add(grassMesh);
 // trees
 const trunkGeo=new THREE.CylinderGeometry(.22,.42,3,6);trunkGeo.translate(0,1.5,0);
 const trunkMat=new THREE.MeshStandardMaterial({color:0x6b4a2f,roughness:.9,flatShading:true});
 trunkMesh=new THREE.InstancedMesh(trunkGeo,trunkMat,470);
 const canGeo=new THREE.IcosahedronGeometry(1.55,1);
 const canMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85,flatShading:true});
 addWind(canMat,.05,'windCanopy');
 canopyMesh=new THREE.InstancedMesh(canGeo,canMat,540);
 const pineGeo=new THREE.ConeGeometry(1.7,3.4,7);
 const pineMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85,flatShading:true});
 addWind(pineMat,.04,'windPine');
 pineMesh=new THREE.InstancedMesh(pineGeo,pineMat,340);
 [trunkMesh,canopyMesh,pineMesh].forEach(m=>{m.frustumCulled=false;m.castShadow=true;m.receiveShadow=true});
 let ti=0,ci=0,pi=0;tries=0;
 while(ti<460&&tries<40000){tries++;
  const x=(rng()*2-1)*420,z=(rng()*2-1)*420;
  const h=getHeight(x,z);
  const pine=h>17;
  if(!validSpot(x,z,3.2,pine?42:30,.68))continue;
  if(fbm(x*.012+31,z*.012+17,3)<.44)continue;
  const s=.8+rng()*.9;
  dummy.position.set(x,h-.15,z);dummy.rotation.set(0,rng()*TAU,(rng()-.5)*.08);
  dummy.scale.set(s,pine?s*1.5:s,s);dummy.updateMatrix();
  trunkMesh.setMatrixAt(ti,dummy.matrix);
  colliders.push({x,z,r:.5*s});
  if(pine){
   for(let k=0;k<2&&pi<340;k++){
    dummy.position.set(x,h+s*(2.4+k*1.9),z);dummy.rotation.set(0,rng()*TAU,0);
    const ps=s*(1-k*.32);dummy.scale.set(ps,ps,ps);dummy.updateMatrix();
    pineMesh.setMatrixAt(pi,dummy.matrix);
    tmpC.setHSL(.42+rng()*.04,.32,.2+rng()*.08);pineMesh.setColorAt(pi,tmpC);pi++;
   }
  }else{
   for(let k=0;k<2&&ci<540;k++){
    dummy.position.set(x+(rng()-.5)*1.4*s,h+s*(2.9+k*1.1),z+(rng()-.5)*1.4*s);
    dummy.rotation.set(rng()*TAU,rng()*TAU,0);
    const cs=s*(1.15-k*.35)*(0.85+rng()*.3);dummy.scale.set(cs,cs*.9,cs);dummy.updateMatrix();
    canopyMesh.setMatrixAt(ci,dummy.matrix);
    if(rng()<.1)tmpC.setHSL(.08,.62,.42);else tmpC.setHSL(.26+rng()*.08,.45,.3+rng()*.12);
    canopyMesh.setColorAt(ci,tmpC);ci++;
   }
  }
  ti++;
 }
 trunkMesh.count=ti;canopyMesh.count=ci;pineMesh.count=pi;
 [trunkMesh,canopyMesh,pineMesh].forEach(m=>{m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;scene.add(m)});
 // rocks
 const rockGeo=new THREE.DodecahedronGeometry(1,0);
 rockMesh=new THREE.InstancedMesh(rockGeo,new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92,flatShading:true}),230);
 rockMesh.frustumCulled=false;rockMesh.castShadow=true;rockMesh.receiveShadow=true;
 let ri=0;tries=0;
 while(ri<230&&tries<20000){tries++;
  const x=(rng()*2-1)*430,z=(rng()*2-1)*430,h=getHeight(x,z);
  if(h<1||h>60)continue;
  for(const p of pads){if(Math.hypot(x-p.x,z-p.z)<p.r)continue}
  const s=.5+rng()*2.2;
  dummy.position.set(x,h+s*.2,z);dummy.rotation.set(rng()*TAU,rng()*TAU,rng()*TAU);
  dummy.scale.set(s*(.7+rng()*.6),s*(.6+rng()*.7),s*(.7+rng()*.6));dummy.updateMatrix();
  rockMesh.setMatrixAt(ri,dummy.matrix);
  tmpC.setHSL(.09+rng()*.04,.06+rng()*.06,.4+rng()*.16);rockMesh.setColorAt(ri,tmpC);
  if(s>1.4)colliders.push({x,z,r:s*.75});
  ri++;
 }
 rockMesh.count=ri;rockMesh.instanceMatrix.needsUpdate=true;
 if(rockMesh.instanceColor)rockMesh.instanceColor.needsUpdate=true;
 scene.add(rockMesh);
 // flowers
 flowerMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(.11,6,5),
  new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:.28,roughness:.6}),380);
 flowerMesh.frustumCulled=false;
 const flowerCols=[0xff6bd6,0x59f2ff,0xffd76a,0xff8c5a];
 let fi=0;tries=0;
 while(fi<380&&tries<20000){tries++;
  const x=(rng()*2-1)*380,z=(rng()*2-1)*380;
  if(!validSpot(x,z,3.2,24,.82))continue;
  dummy.position.set(x,getHeight(x,z)+.14,z);dummy.rotation.set(0,0,0);
  dummy.scale.setScalar(.7+rng()*.8);dummy.updateMatrix();
  flowerMesh.setMatrixAt(fi,dummy.matrix);
  tmpC.setHex(flowerCols[(rng()*4)|0]);flowerMesh.setColorAt(fi,tmpC);fi++;
 }
 flowerMesh.count=fi;flowerMesh.instanceMatrix.needsUpdate=true;
 if(flowerMesh.instanceColor)flowerMesh.instanceColor.needsUpdate=true;
 scene.add(flowerMesh);
}

export {windMats,addWind,grassMesh,canopyMesh,pineMesh,trunkMesh,rockMesh,flowerMesh,validSpot,buildVegetation};
