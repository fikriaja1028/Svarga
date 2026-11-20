// SVARGA — kuil pusat & Gerbang Svarga

import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {TAU, GLSL_NOISE} from './utils.js';
import {scene, glowTex} from './scene.js';
import {stoneMat} from './beacons.js';
import {colliders} from './world.js';

/* ============================================================ temple & gate */
const gate={group:null,portalU:null,glow:null,floaters:[],floaterMat:null,collider:null,active:false};
function buildTemple(){
 const grp=new THREE.Group();grp.position.set(0,7.5,0);
 const parts=[];
 const s1=new THREE.CylinderGeometry(13,13.6,.35,24);s1.translate(0,.17,0);parts.push(s1);
 const s2=new THREE.CylinderGeometry(11.6,12.1,.7,24);s2.translate(0,.35,0);parts.push(s2);
 const s3=new THREE.CylinderGeometry(10.2,10.7,1.2,24);s3.translate(0,.6,0);parts.push(s3);
 for(let k=0;k<8;k++){
  const a=k*TAU/8+TAU/16;
  const col=new THREE.CylinderGeometry(.55,.75,6.4,8);col.translate(Math.cos(a)*9.3,1.2+3.2,Math.sin(a)*9.3);parts.push(col);
  const cap=new THREE.BoxGeometry(1.5,.45,1.5);cap.rotateY(a);cap.translate(Math.cos(a)*9.3,7.8,Math.sin(a)*9.3);parts.push(cap);
  colliders.push({x:Math.cos(a)*9.3,z:Math.sin(a)*9.3,r:.95});
 }
 const gp1=new THREE.BoxGeometry(1.1,7,1.1);gp1.translate(-2.9,1.2+3.5,0);parts.push(gp1);
 const gp2=new THREE.BoxGeometry(1.1,7,1.1);gp2.translate(2.9,1.2+3.5,0);parts.push(gp2);
 const lintel=new THREE.BoxGeometry(7.6,1.1,1.35);lintel.translate(0,1.2+7.3,0);parts.push(lintel);
 colliders.push({x:-2.9,z:0,r:.85},{x:2.9,z:0,r:.85});
 const stone=new THREE.Mesh(mergeGeometries(parts),stoneMat);
 stone.castShadow=true;stone.receiveShadow=true;grp.add(stone);
 const backing=new THREE.Mesh(new THREE.PlaneGeometry(5,7.2),new THREE.MeshBasicMaterial({color:0x05070f}));
 backing.position.set(0,4.75,-.07);grp.add(backing);
 gate.portalU={uTime:{value:0},uActive:{value:0},uColA:{value:new THREE.Color(0x59f2ff)},uColB:{value:new THREE.Color(0xffd76a)}};
 const portal=new THREE.Mesh(new THREE.PlaneGeometry(4.7,6.6),new THREE.ShaderMaterial({
  uniforms:gate.portalU,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false,
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:GLSL_NOISE+`
  uniform float uTime,uActive;uniform vec3 uColA,uColB;varying vec2 vUv;
  void main(){
   vec2 p=vUv*2.0-1.0;p.x*=0.72;
   float r=length(p);float ang=atan(p.y,p.x);
   float swirl=fbm2(vec2(ang*1.5+r*4.0-uTime*1.2,r*3.0-uTime*0.7));
   float core=smoothstep(1.0,0.2,r);
   vec3 col=mix(uColA,uColB,swirl)*core*(0.35+uActive*2.4);
   float ring=smoothstep(0.05,0.0,abs(r-0.92))*uActive;
   col+=uColB*ring*2.0;
   float a=core*(0.22+uActive*0.78);
   gl_FragColor=vec4(col,a);
  }`
 }));
 portal.position.set(0,4.75,0);grp.add(portal);
 gate.glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffd76a,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
 gate.glow.scale.setScalar(14);gate.glow.position.set(0,5,0);grp.add(gate.glow);
 gate.floaterMat=new THREE.MeshStandardMaterial({color:0x8f8a7c,roughness:.8,flatShading:true,emissive:0x59f2ff,emissiveIntensity:0});
 for(let k=0;k<5;k++){
  const f=new THREE.Mesh(new THREE.DodecahedronGeometry(.5,0),gate.floaterMat);
  f.castShadow=true;grp.add(f);gate.floaters.push({m:f,a:k*TAU/5,r:6.2+k*.4,h:11.5+(k%3),sp:.15+k*.04});
 }
 gate.collider={x:0,z:0,r:2,active:true};colliders.push(gate.collider);
 scene.add(grp);gate.group=grp;
}

export {gate,buildTemple};
