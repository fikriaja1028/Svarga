// SVARGA — serpihan aether

import * as THREE from 'three';
import {TAU, rng} from './utils.js';
import {getGround, getHeight, terrainNormal, pads, beaconSpots} from './world.js';
import {scene} from './scene.js';

/* ============================================================ shards */
const shards=[];
let shardMesh,shardGlow,shardGlowGeo;
function placeShard(x,z){
 const h=getGround(x,z);
 shards.push({base:new THREE.Vector3(x,h+1.15,z),pos:new THREE.Vector3(x,h+1.15,z),collected:false,fly:0,phase:rng()*TAU});
}
function buildShards(){
 for(const b of beaconSpots){
  for(let k=0;k<3;k++){
   let ok=false;
   for(let t=0;t<24&&!ok;t++){
    const a=rng()*TAU,r=20+rng()*38;
    const x=b.x+Math.cos(a)*r,z=b.z+Math.sin(a)*r;
    if(getHeight(x,z)>1.3&&terrainNormal(x,z).y>.68&&Math.hypot(x,z)<420){placeShard(x,z);ok=true}
   }
   if(!ok)placeShard(b.x+7+k*2.5,b.z+7);
  }
 }
 let bonus=0,tries=0;
 while(bonus<4&&tries<4000){tries++;
  const a=rng()*TAU,r=45+rng()*110,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(getHeight(x,z)>2&&terrainNormal(x,z).y>.75&&!pads.some(p=>Math.hypot(x-p.x,z-p.z)<p.r)){placeShard(x,z);bonus++}
 }
 const mat=new THREE.MeshStandardMaterial({color:0x0e2a33,emissive:0x59f2ff,emissiveIntensity:3,roughness:.15,metalness:.2,flatShading:true});
 shardMesh=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.45,0),mat,shards.length);
 shardMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 shardMesh.frustumCulled=false;scene.add(shardMesh);
 shardGlowGeo=new THREE.BufferGeometry();
 const n=shards.length;
 shardGlowGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3).setUsage(THREE.DynamicDrawUsage));
 const ph=new Float32Array(n),on=new Float32Array(n).fill(1);
 for(let i=0;i<n;i++)ph[i]=rng()*TAU;
 shardGlowGeo.setAttribute('aPhase',new THREE.BufferAttribute(ph,1));
 shardGlowGeo.setAttribute('aOn',new THREE.BufferAttribute(on,1).setUsage(THREE.DynamicDrawUsage));
 shardGlow=new THREE.Points(shardGlowGeo,new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uPR:{value:1}},transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,
  vertexShader:`attribute float aPhase;attribute float aOn;uniform float uTime,uPR;varying float vA;
  void main(){vA=aOn*(0.7+0.3*sin(uTime*3.0+aPhase));
   vec4 mv=modelViewMatrix*vec4(position,1.0);
   gl_PointSize=clamp(30.0*uPR*(200.0/-mv.z)*aOn,0.0,90.0);
   gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying float vA;void main(){float d=length(gl_PointCoord-0.5);float a=smoothstep(0.5,0.05,d)*vA*0.6;if(a<0.02)discard;gl_FragColor=vec4(vec3(0.35,0.95,1.0)*1.6,a);}`
 }));
 shardGlow.frustumCulled=false;scene.add(shardGlow);
}

export {shards,shardMesh,shardGlow,shardGlowGeo,placeShard,buildShards};
