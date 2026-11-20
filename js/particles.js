// SVARGA — partikel, kunang-kunang, awan & burung

import * as THREE from 'three';
import {TAU, rng} from './utils.js';
import {getHeight, tmpC} from './world.js';
import {scene, cloudTex} from './scene.js';

/* ============================================================ particles / fireflies / clouds / birds */
const PMAX=700;
let pGeo,pPts,pCursor=0;
const pVel=new Float32Array(PMAX*3),pLife=new Float32Array(PMAX),pMaxLife=new Float32Array(PMAX),pGrav=new Float32Array(PMAX);
function buildParticles(){
 pGeo=new THREE.BufferGeometry();
 pGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(PMAX*3),3).setUsage(THREE.DynamicDrawUsage));
 pGeo.setAttribute('aColor',new THREE.BufferAttribute(new Float32Array(PMAX*3),3).setUsage(THREE.DynamicDrawUsage));
 pGeo.setAttribute('aAlpha',new THREE.BufferAttribute(new Float32Array(PMAX),1).setUsage(THREE.DynamicDrawUsage));
 pGeo.setAttribute('aSize',new THREE.BufferAttribute(new Float32Array(PMAX),1).setUsage(THREE.DynamicDrawUsage));
 pPts=new THREE.Points(pGeo,new THREE.ShaderMaterial({
  uniforms:{uPR:{value:1}},transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,
  vertexShader:`attribute vec3 aColor;attribute float aAlpha,aSize;uniform float uPR;varying vec3 vC;varying float vA;
  void main(){vC=aColor;vA=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.0);
  gl_PointSize=clamp(aSize*uPR*(240.0/-mv.z)*smoothstep(0.0,0.15,aAlpha),0.0,64.0);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying vec3 vC;varying float vA;
  void main(){float d=length(gl_PointCoord-0.5);float a=smoothstep(0.5,0.12,d)*vA;if(a<0.02)discard;gl_FragColor=vec4(vC*(1.2+vA),a);}`
 }));
 pPts.frustumCulled=false;scene.add(pPts);
}
function spawnParticles(x,y,z,count,color,speed,life,grav,size){
 tmpC.setHex(color);
 const pos=pGeo.attributes.position.array,col=pGeo.attributes.aColor.array,al=pGeo.attributes.aAlpha.array,sz=pGeo.attributes.aSize.array;
 for(let k=0;k<count;k++){
  const i=pCursor;pCursor=(pCursor+1)%PMAX;
  pos[i*3]=x;pos[i*3+1]=y;pos[i*3+2]=z;
  const th=rng()*TAU,ph2=Math.acos(2*rng()-1),sp=speed*(.4+rng()*.8);
  pVel[i*3]=Math.sin(ph2)*Math.cos(th)*sp;pVel[i*3+1]=Math.cos(ph2)*sp*.8+speed*.25;pVel[i*3+2]=Math.sin(ph2)*Math.sin(th)*sp;
  pLife[i]=pMaxLife[i]=life*(.6+rng()*.7);pGrav[i]=grav;
  const v=.8+rng()*.5;
  col[i*3]=tmpC.r*v;col[i*3+1]=tmpC.g*v;col[i*3+2]=tmpC.b*v;
  al[i]=1;sz[i]=size*(.7+rng()*.6);
 }
 pGeo.attributes.aColor.needsUpdate=true;pGeo.attributes.aSize.needsUpdate=true;
}
function updateParticles(dt){
 const pos=pGeo.attributes.position.array,al=pGeo.attributes.aAlpha.array;
 let any=false;
 for(let i=0;i<PMAX;i++){
  if(pLife[i]<=0){if(al[i]!==0){al[i]=0;any=true}continue}
  pLife[i]-=dt;any=true;
  pVel[i*3+1]-=pGrav[i]*dt;
  pos[i*3]+=pVel[i*3]*dt;pos[i*3+1]+=pVel[i*3+1]*dt;pos[i*3+2]+=pVel[i*3+2]*dt;
  al[i]=Math.max(0,pLife[i]/pMaxLife[i]);
 }
 if(any){pGeo.attributes.position.needsUpdate=true;pGeo.attributes.aAlpha.needsUpdate=true}
}
let fireflies,fireflyU;
function buildFireflies(){
 const n=650,geo=new THREE.BufferGeometry();
 const pos=new Float32Array(n*3),ph=new Float32Array(n),hue=new Float32Array(n);
 let i=0,tries=0;
 while(i<n&&tries<30000){tries++;
  const x=(rng()*2-1)*380,z=(rng()*2-1)*380,h=getHeight(x,z);
  if(h<2||h>32)continue;
  pos[i*3]=x;pos[i*3+1]=h+1+rng()*3;pos[i*3+2]=z;ph[i]=rng()*TAU;hue[i]=rng();i++;
 }
 geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
 geo.setAttribute('aPhase',new THREE.BufferAttribute(ph,1));
 geo.setAttribute('aHue',new THREE.BufferAttribute(hue,1));
 fireflyU={uTime:{value:0},uNight:{value:0},uPR:{value:1}};
 fireflies=new THREE.Points(geo,new THREE.ShaderMaterial({
  uniforms:fireflyU,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,
  vertexShader:`attribute float aPhase,aHue;uniform float uTime,uNight,uPR;varying float vA;varying vec3 vC;
  void main(){
   vec3 p=position+vec3(sin(uTime*0.4+aPhase)*1.6,sin(uTime*0.6+aPhase*2.0)*0.8,cos(uTime*0.35+aPhase)*1.6);
   vA=(0.2+0.8*uNight)*(0.45+0.55*sin(uTime*2.2+aPhase*5.0));
   vC=mix(vec3(1.0,0.84,0.42),vec3(0.4,0.95,1.0),step(0.8,aHue));
   vec4 mv=modelViewMatrix*vec4(p,1.0);
   gl_PointSize=clamp(3.4*uPR*(220.0/-mv.z),0.0,14.0);
   gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying float vA;varying vec3 vC;
  void main(){float d=length(gl_PointCoord-0.5);float a=smoothstep(0.5,0.08,d)*vA;if(a<0.02)discard;gl_FragColor=vec4(vC*2.0,a);}`
 }));
 fireflies.frustumCulled=false;scene.add(fireflies);
}
const clouds=[];let cloudMat;
function buildClouds(){
 cloudMat=new THREE.SpriteMaterial({map:cloudTex,color:0xffffff,transparent:true,opacity:.32,depthWrite:false});
 for(let i=0;i<16;i++){
  const s=new THREE.Sprite(cloudMat);
  s.position.set((rng()*2-1)*650,110+rng()*70,(rng()*2-1)*650);
  s.scale.set(90+rng()*120,40+rng()*40,1);
  s.userData.sp=1.5+rng()*2.5;
  scene.add(s);clouds.push(s);
 }
}
let birdMesh;const birds=[];
function buildBirds(){
 const geo=new THREE.PlaneGeometry(1.15,.4);geo.translate(.58,0,0);geo.rotateX(-Math.PI/2);
 birdMesh=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial({color:0x16203a,side:THREE.DoubleSide}),14);
 birdMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);birdMesh.frustumCulled=false;
 for(let i=0;i<7;i++)birds.push({cx:(rng()*2-1)*180,cz:(rng()*2-1)*180,r:35+rng()*55,h:55+rng()*30,a:rng()*TAU,sp:.25+rng()*.2,ph:rng()*TAU,s:.8+rng()*.7});
 scene.add(birdMesh);
}

export {pGeo,pPts,pVel,pLife,pMaxLife,pGrav,buildParticles,spawnParticles,updateParticles,fireflies,fireflyU,buildFireflies,clouds,cloudMat,buildClouds,birdMesh,birds,buildBirds};
