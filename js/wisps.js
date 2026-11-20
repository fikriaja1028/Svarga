// SVARGA — musuh: bayangan (wisp) & jejaknya

import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {TAU, rng} from './utils.js';
import {G, DIFFS} from './config.js';
import {beaconSpots, getGround, getHeight} from './world.js';
import {scene} from './scene.js';

/* ============================================================ wisps */
const wisps=[];
let trailGeo,trailPts;
const TRAIL_PER=10;
function buildWisps(){
 const coreMat=new THREE.MeshStandardMaterial({color:0x0a0612,roughness:.4,emissive:0x4a1670,emissiveIntensity:.8});
 const shellU={uTime:{value:0},uColor:{value:new THREE.Color(0xb44dff)}};
 const shellMat=new THREE.ShaderMaterial({
  uniforms:shellU,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,
  vertexShader:`uniform float uTime;varying vec3 vN,vV;
  void main(){
   vec3 p=position+normal*sin(uTime*3.0+position.y*8.0+position.x*5.0)*0.05;
   vec4 mv=modelViewMatrix*vec4(p,1.0);
   vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);
   gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform vec3 uColor;varying vec3 vN,vV;
  void main(){float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.2);gl_FragColor=vec4(uColor*f*2.2,f*0.8);}`
 });
 const e1=new THREE.SphereGeometry(.07,6,5);e1.translate(-.15,.1,.4);
 const e2=new THREE.SphereGeometry(.07,6,5);e2.translate(.15,.1,.4);
 const eyeGeo=mergeGeometries([e1,e2]);
 const eyeMat=new THREE.MeshStandardMaterial({color:0x220022,emissive:0xff3df0,emissiveIntensity:4});
 const coreGeo=new THREE.SphereGeometry(.45,12,10);
 const shellGeo=new THREE.SphereGeometry(.64,12,10);
 const addWisp=(hx,hz)=>{
  const grp=new THREE.Group();
  const core=new THREE.Mesh(coreGeo,coreMat);grp.add(core);
  const shell=new THREE.Mesh(shellGeo,shellMat);grp.add(shell);
  const eyes=new THREE.Mesh(eyeGeo,eyeMat);grp.add(eyes);
  grp.position.set(hx,getGround(hx,hz)+1.7,hz);
  scene.add(grp);
  wisps.push({grp,home:new THREE.Vector3(hx,0,hz),pos:grp.position,alive:true,retreat:0,t:rng()*10,phase:rng()*TAU,patA:rng()*TAU,trailT:0,trailIdx:0,shellU});
 };
 const d=DIFFS[G.diff];
 for(const b of beaconSpots)for(let k=0;k<4;k++){
  const a=rng()*TAU,r=10+rng()*15;
  addWisp(b.x+Math.cos(a)*r,b.z+Math.sin(a)*r);
 }
 for(let k=0;k<6;k++){
  let x=0,z=0;
  for(let t=0;t<50;t++){const a=rng()*TAU,r=60+rng()*160;x=Math.cos(a)*r;z=Math.sin(a)*r;if(getHeight(x,z)>2)break}
  addWisp(x,z);
 }
 applyWispDifficulty();
 // trails
 const cap=wisps.length*TRAIL_PER;
 trailGeo=new THREE.BufferGeometry();
 trailGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(cap*3),3).setUsage(THREE.DynamicDrawUsage));
 trailGeo.setAttribute('aA',new THREE.BufferAttribute(new Float32Array(cap),1).setUsage(THREE.DynamicDrawUsage));
 trailPts=new THREE.Points(trailGeo,new THREE.ShaderMaterial({
  uniforms:{uPR:{value:1}},transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,
  vertexShader:`attribute float aA;uniform float uPR;varying float vA;
  void main(){vA=aA;vec4 mv=modelViewMatrix*vec4(position,1.0);
  gl_PointSize=clamp(14.0*uPR*(200.0/-mv.z)*aA,0.0,40.0);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying float vA;void main(){float d=length(gl_PointCoord-0.5);float a=smoothstep(0.5,0.1,d)*vA*0.5;if(a<0.02)discard;gl_FragColor=vec4(vec3(0.7,0.3,1.0)*1.5,a);}`
 }));
 trailPts.frustumCulled=false;scene.add(trailPts);
}
function applyWispDifficulty(){
 const d=DIFFS[G.diff];
 let idx=0;
 for(let b=0;b<6;b++)for(let k=0;k<4;k++){const w=wisps[idx++];w.enabled=k<d.perBeacon}
 for(let k=0;k<6;k++){const w=wisps[idx++];w.enabled=k<d.roam}
 for(const w of wisps){w.grp.visible=w.enabled&&w.alive}
}

export {wisps,trailGeo,trailPts,TRAIL_PER,buildWisps,applyWispDifficulty};
