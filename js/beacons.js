// SVARGA — menara cahaya

import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {TAU, rng, GLSL_NOISE} from './utils.js';
import {BEACON_DEFS} from './config.js';
import {scene, glowTex, runeTex} from './scene.js';
import {beaconSpots, colliders} from './world.js';

/* ============================================================ beacons */
const beacons=[];
const stoneMat=new THREE.MeshStandardMaterial({color:0x97917f,roughness:.9,flatShading:true});
const pillarShader=accent=>new THREE.ShaderMaterial({
 uniforms:{uColor:{value:new THREE.Color(accent)},uTime:{value:0},uOpacity:{value:.1},uBoost:{value:0}},
 transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false,
 vertexShader:`varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vec4 wp=modelMatrix*vec4(position,1.0);vWorld=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,
 fragmentShader:GLSL_NOISE+`
 uniform vec3 uColor;uniform float uTime,uOpacity,uBoost;varying vec2 vUv;varying vec3 vWorld;
 void main(){
  float a=(1.0-vUv.y);a*=a;
  float streak=noise2(vec2(vUv.x*8.0,vUv.y*3.0-uTime*0.5));
  a*=0.55+0.45*streak;
  float flick=0.85+0.15*sin(uTime*7.0+vWorld.y*0.4);
  gl_FragColor=vec4(uColor*(1.5+uBoost),a*uOpacity*flick);
 }`
});
function buildBeacons(){
 for(let i=0;i<6;i++){
  const def=BEACON_DEFS[i],spot=beaconSpots[i];
  const grp=new THREE.Group();grp.position.set(spot.x,spot.h,spot.z);
  const parts=[];
  const base=new THREE.CylinderGeometry(4.2,4.8,.9,10);base.translate(0,.45,0);parts.push(base);
  const step2=new THREE.CylinderGeometry(5.4,5.8,.35,10);step2.translate(0,.17,0);parts.push(step2);
  for(let k=0;k<4;k++){
   const a=k*Math.PI/2+Math.PI/4;
   const pil=new THREE.BoxGeometry(.75,4.4,.75);
   pil.translate(0,2.2,0);pil.rotateZ((rng()-.5)*.1);pil.rotateY(a);
   pil.translate(Math.cos(a)*3.1,.9,Math.sin(a)*3.1);parts.push(pil);
   const cap=new THREE.BoxGeometry(1.05,.4,1.05);cap.rotateY(a);
   cap.translate(Math.cos(a)*3.1,5.2,Math.sin(a)*3.1);parts.push(cap);
   colliders.push({x:spot.x+Math.cos(a)*3.1,z:spot.z+Math.sin(a)*3.1,r:.65});
  }
  const stone=new THREE.Mesh(mergeGeometries(parts),stoneMat);
  stone.castShadow=true;stone.receiveShadow=true;grp.add(stone);
  const cryMat=new THREE.MeshStandardMaterial({color:0x1a2233,emissive:def.accent,emissiveIntensity:.5,roughness:.2,metalness:.1,flatShading:true});
  const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(1.05,0),cryMat);
  crystal.position.y=4.8;crystal.castShadow=true;grp.add(crystal);
  const runeMat=new THREE.MeshBasicMaterial({map:runeTex,color:0x2a4a66,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  const rune=new THREE.Mesh(new THREE.RingGeometry(3.1,4.1,48),runeMat);
  rune.rotation.x=-Math.PI/2;rune.position.y=.96;grp.add(rune);
  const pMat=pillarShader(def.accent);
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(1,1.7,1,12,1,true),pMat);
  pillar.scale.set(1.4,26,1.4);pillar.position.y=14;pillar.frustumCulled=false;grp.add(pillar);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:def.accent,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false}));
  glow.scale.setScalar(3.5);glow.position.y=4.8;grp.add(glow);
  const light=new THREE.PointLight(def.accent,0,70,1.8);light.position.y=5.5;grp.add(light);
  // motes
  const mN=40,mGeo=new THREE.BufferGeometry();
  mGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(mN*3),3));
  const mPhase=new Float32Array(mN);for(let k=0;k<mN;k++)mPhase[k]=rng();
  mGeo.setAttribute('aPhase',new THREE.BufferAttribute(mPhase,1));
  const mU={uTime:{value:0},uActive:{value:0},uColor:{value:new THREE.Color(def.accent)},uPR:{value:1}};
  const motes=new THREE.Points(mGeo,new THREE.ShaderMaterial({
   uniforms:mU,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,
   vertexShader:`attribute float aPhase;uniform float uTime,uPR;varying float vA;
   void main(){
    float h=mod(aPhase*7.0+uTime*1.2,8.0);
    float ang=aPhase*40.0+uTime*0.7;
    float r=2.6*(1.0-h/9.0);
    vec3 p=vec3(cos(ang)*r,h+1.0,sin(ang)*r);
    vA=1.0-h/8.0;
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_PointSize=clamp(4.0*uPR*(200.0/-mv.z),0.0,22.0);
    gl_Position=projectionMatrix*mv;
   }`,
   fragmentShader:`uniform vec3 uColor;uniform float uActive;varying float vA;
   void main(){float d=length(gl_PointCoord-0.5);float a=smoothstep(0.5,0.1,d)*vA*uActive;if(a<0.02)discard;gl_FragColor=vec4(uColor*2.0,a);}`
  }));
  motes.frustumCulled=false;grp.add(motes);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.8,1,48),
   new THREE.MeshBasicMaterial({color:def.accent,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=1.1;ring.visible=false;grp.add(ring);
  scene.add(grp);
  beacons.push({def,x:spot.x,z:spot.z,h:spot.h,grp,crystal,cryMat,rune,runeMat,pillar,pMat,glow,light,mU,ring,ringT:0,lit:false,phase:rng()*TAU});
 }
}

export {beacons,stoneMat,buildBeacons};
