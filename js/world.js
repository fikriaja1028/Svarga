// SVARGA — data dunia, langit, terrain & air

import * as THREE from 'three';
import {TAU, rng, clamp, lerp, sstep, fbm, hash2i, GLSL_NOISE} from './utils.js';
import {WORLD, HALF, SEG, STEP} from './config.js';
import {scene, glowTex, detailTex} from './scene.js';

/* ============================================================ world data */
const pads=[{x:0,z:0,r:34,h:7.5},{x:0,z:168,r:9,h:10}];
const beaconSpots=[];
for(let i=0;i<6;i++){
 let bx=0,bz=0,bh=8,ok=false;
 for(let t=0;t<10&&!ok;t++){
  const ang=i*TAU/6+(rng()-.5)*.36, rad=205+rng()*105;
  bx=Math.cos(ang)*rad;bz=Math.sin(ang)*rad;
  bh=rawHeight(bx,bz);
  if(bh>3.5&&bh<34)ok=true;
 }
 const ph=clamp(bh,4,30);
 beaconSpots.push({x:bx,z:bz,h:ph});
 pads.push({x:bx,z:bz,r:14,h:ph});
}
function rawHeight(x,z){
 const d=Math.hypot(x,z)/HALF;
 let h=(fbm(x*.008+3.1,z*.008-1.7,4)*2-1)*14+8;
 const rn=fbm(x*.004+9.2,z*.004+4.4,4);
 const ridge=Math.pow(1-Math.abs(rn*2-1),2.2);
 h+=ridge*sstep(.5,.92,d)*95;
 h+=(fbm(x*.03+1.3,z*.03+8.8,2)*2-1)*2.5;
 const island=1-sstep(.86,1.12,d);
 h=h*island-(1-island)*14-2.5;
 const dl=Math.hypot(x-110,z+80);
 h=lerp(h,-7,1-sstep(24,62,dl));
 return h;
}
function terrainH(x,z){
 let h=rawHeight(x,z);
 for(let i=0;i<pads.length;i++){const p=pads[i];const d=Math.hypot(x-p.x,z-p.z);
  if(d<p.r){const t=1-sstep(p.r*.45,p.r,d);h=h+(p.h-h)*t}}
 return h;
}
const grid=new Float32Array((SEG+1)*(SEG+1));
function getHeight(x,z){
 const gx=clamp((x+HALF)/STEP,0,SEG-.001),gz=clamp((z+HALF)/STEP,0,SEG-.001);
 const c=Math.floor(gx),r=Math.floor(gz),fx=gx-c,fz=gz-r,i=r*(SEG+1)+c;
 const a=grid[i],b=grid[i+1],c2=grid[i+SEG+1],d=grid[i+SEG+2];
 return a+(b-a)*fx+(c2-a)*fz+(a-b-c2+d)*fx*fz;
}
function getGround(x,z){
 let h=getHeight(x,z);
 const dc=Math.hypot(x,z);
 if(dc<10.2)h=Math.max(h,8.7);else if(dc<11.6)h=Math.max(h,8.2);else if(dc<13.2)h=Math.max(h,7.85);
 for(let i=0;i<beaconSpots.length;i++){const b=beaconSpots[i];const d=Math.hypot(x-b.x,z-b.z);
  if(d<5.2)h=Math.max(h,b.h+.9);else if(d<5.9)h=Math.max(h,b.h+.35)}
 return h;
}
function terrainNormal(x,z){
 const e=1.2,hx=getHeight(x+e,z)-getHeight(x-e,z),hz=getHeight(x,z+e)-getHeight(x,z-e);
 return new THREE.Vector3(-hx,2*e,-hz).normalize();
}
const colliders=[];
const dummy=new THREE.Object3D();
const tmpC=new THREE.Color(),tmpC2=new THREE.Color(),tmpV=new THREE.Vector3(),tmpV2=new THREE.Vector3();

/* ============================================================ sky */
const skyU={
 uSunDir:{value:new THREE.Vector3(0,1,0)},uTime:{value:0},uNight:{value:0},
 uZenith:{value:new THREE.Color(0x3a7bd5)},uHorizon:{value:new THREE.Color(0xbfe3e8)},uSunCol:{value:new THREE.Color(0xfff3d6)}
};
const skyMesh=new THREE.Mesh(new THREE.SphereGeometry(1200,32,20),new THREE.ShaderMaterial({
 uniforms:skyU,side:THREE.BackSide,depthWrite:false,fog:false,
 vertexShader:`varying vec3 vDir;void main(){vDir=position;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;}`,
 fragmentShader:GLSL_NOISE+`
 uniform vec3 uSunDir,uZenith,uHorizon,uSunCol;uniform float uTime,uNight;varying vec3 vDir;
 void main(){
  vec3 d=normalize(vDir);float y=d.y;
  vec3 sky=mix(uHorizon,uZenith,pow(clamp(y,0.0,1.0),0.55));
  if(y<0.0)sky=mix(uHorizon,uHorizon*0.5,clamp(-y*3.0,0.0,1.0));
  float sd=dot(d,uSunDir);
  sky+=uSunCol*(pow(max(sd,0.0),900.0)*8.0+pow(max(sd,0.0),80.0)*0.5+pow(max(sd,0.0),6.0)*0.18);
  float md=dot(d,-uSunDir);
  sky+=vec3(0.75,0.85,1.0)*(smoothstep(0.9996,0.99985,md)*2.2+pow(max(md,0.0),150.0)*0.3)*uNight;
  vec3 sp=d*230.0;vec3 cell=floor(sp);float h=hash13(cell);
  vec3 fp=fract(sp)-0.5;
  float star=smoothstep(0.4,0.05,length(fp))*step(0.997,h)*(0.55+0.45*sin(uTime*2.5+h*60.0));
  sky+=vec3(0.9,0.95,1.0)*star*uNight*smoothstep(0.0,0.2,y)*1.6;
  float au=fbm2(vec2(d.x*2.6+uTime*0.03,d.y*5.0-uTime*0.02));
  au=smoothstep(0.45,0.8,au)*smoothstep(0.08,0.35,y)*smoothstep(0.9,0.4,y);
  vec3 auCol=mix(vec3(0.1,0.9,0.55),vec3(0.55,0.2,0.9),noise2(vec2(d.x*4.0,uTime*0.05)));
  sky+=auCol*au*uNight*0.5;
  if(y>0.015){
   vec2 cp=d.xz/(y+0.12);cp=cp*0.8+vec2(uTime*0.006,uTime*0.0023);
   float f=fbm2(cp*1.4);float cov=smoothstep(0.52,0.78,f);
   float fade=smoothstep(0.015,0.12,y);
   float f2=fbm2(cp*1.4+uSunDir.xz*0.08);
   float shade=clamp(0.6+(f2-f)*2.2,0.35,1.15);
   vec3 cloudCol=mix(uHorizon*0.9+vec3(0.05),uSunCol*0.9+vec3(0.25),0.5)*shade;
   cloudCol=mix(cloudCol*0.32,cloudCol,1.0-uNight*0.8);
   sky=mix(sky,cloudCol,cov*fade*0.85);
  }
  gl_FragColor=vec4(sky,1.0);
 }`
}));
skyMesh.frustumCulled=false;skyMesh.renderOrder=-10;scene.add(skyMesh);
const sunSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xfff0c8,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
sunSprite.scale.setScalar(300);scene.add(sunSprite);

/* ============================================================ terrain & water */
let terrainMesh,waterMesh,waterU,heightTex;
function buildTerrain(){
 const geo=new THREE.PlaneGeometry(WORLD,WORLD,SEG,SEG);
 geo.rotateX(-Math.PI/2);
 const pos=geo.attributes.position;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),z=pos.getZ(i),h=terrainH(x,z);
  pos.setY(i,h);
  const c=Math.round((x+HALF)/STEP),r=Math.round((z+HALF)/STEP);
  grid[r*(SEG+1)+c]=h;
 }
 geo.computeVertexNormals();
 const nrm=geo.attributes.normal,colors=new Float32Array(pos.count*3);
 const cSandU=new THREE.Color(0x3f6f6a),cSand=new THREE.Color(0xd9c08c),cLush=new THREE.Color(0x4d8a4d),cDry=new THREE.Color(0x8fae5a),cAmber=new THREE.Color(0xb9a05a),cRock=new THREE.Color(0x8b857a),cSnow=new THREE.Color(0xeef3f6);
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),z=pos.getZ(i),h=pos.getY(i),ny=nrm.getY(i);
  const moist=fbm(x*.02+5,z*.02+9,3);
  if(h<.4)tmpC.lerpColors(cSandU,cSand,sstep(-6,.4,h));
  else if(h<3.2)tmpC.copy(cSand).lerp(cLush,sstep(2.2,3.2,h));
  else{
   tmpC.lerpColors(cLush,cDry,moist);
   if(moist>.72)tmpC.lerp(cAmber,(moist-.72)*2.4);
   tmpC.lerp(cRock,sstep(26,36,h));
  }
  if(h>3.5&&ny<.72)tmpC.lerp(cRock,sstep(.72,.5,ny));
  if(h>52&&ny>.55)tmpC.lerp(cSnow,sstep(52,60,h));
  const v=.94+hash2i(i,7)*.1;
  colors[i*3]=tmpC.r*v;colors[i*3+1]=tmpC.g*v;colors[i*3+2]=tmpC.b*v;
 }
 geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
 terrainMesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,map:detailTex,roughness:.95,metalness:0}));
 terrainMesh.receiveShadow=true;terrainMesh.castShadow=true;
 scene.add(terrainMesh);
 // height texture for water foam
 const data=new Uint8Array(grid.length);
 for(let i=0;i<grid.length;i++)data[i]=clamp((grid[i]+20)/120,0,1)*255;
 heightTex=new THREE.DataTexture(data,SEG+1,SEG+1,THREE.RedFormat,THREE.UnsignedByteType);
 heightTex.minFilter=heightTex.magFilter=THREE.LinearFilter;heightTex.needsUpdate=true;
}
function buildWater(){
 waterU={
  uTime:{value:0},uSunDir:{value:new THREE.Vector3(0,1,0)},uSunCol:{value:new THREE.Color(0xfff3d6)},
  uZenith:{value:new THREE.Color(0x3a7bd5)},uHorizon:{value:new THREE.Color(0xbfe3e8)},
  uDeep:{value:new THREE.Color(0x0a3d4a)},uShallow:{value:new THREE.Color(0x2e8f8a)},
  uFogCol:{value:new THREE.Color(0xcfe8ea)},uFogD:{value:.0021},uHeight:{value:heightTex}
 };
 const geo=new THREE.PlaneGeometry(1600,1600,64,64);geo.rotateX(-Math.PI/2);
 waterMesh=new THREE.Mesh(geo,new THREE.ShaderMaterial({
  uniforms:waterU,transparent:true,depthWrite:false,fog:false,
  vertexShader:`
  uniform float uTime;varying vec3 vWorld;
  void main(){
   vec4 wp=modelMatrix*vec4(position,1.0);
   wp.y+=sin(wp.x*0.08+uTime*1.2)*0.12+sin(wp.z*0.06+uTime*0.9)*0.12+sin((wp.x+wp.z)*0.05+uTime*0.6)*0.08;
   vWorld=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;
  }`,
  fragmentShader:GLSL_NOISE+`
  uniform float uTime,uFogD;uniform vec3 uSunDir,uSunCol,uZenith,uHorizon,uDeep,uShallow,uFogCol;
  uniform sampler2D uHeight;varying vec3 vWorld;
  void main(){
   vec2 uv=vWorld.xz;
   vec3 n=normalize(vec3(
    sin(uv.x*0.5+uTime*1.3)*0.06+(noise2(uv*0.6+uTime*0.1)-0.5)*0.25,
    1.0,
    cos(uv.y*0.45+uTime*1.1)*0.06+(noise2(uv*0.6-uTime*0.13+7.0)-0.5)*0.25));
   vec3 V=normalize(cameraPosition-vWorld);
   float fres=pow(1.0-max(dot(n,V),0.0),3.0);
   float hT=texture2D(uHeight,uv/${WORLD.toFixed(1)}+0.5).r*120.0-20.0;
   float depth=clamp(-hT,0.0,8.0);
   vec3 col=mix(uShallow,uDeep,smoothstep(0.0,5.0,depth));
   col=mix(col,mix(uHorizon,uZenith,0.5),fres*0.75);
   vec3 R=reflect(-uSunDir,n);
   float spec=pow(max(dot(R,V),0.0),240.0)*3.5+pow(max(dot(R,V),0.0),40.0)*0.35;
   col+=uSunCol*spec;
   float foamBand=smoothstep(1.8,0.15,depth);
   float foamN=noise2(uv*1.4+uTime*0.35);
   float foam=foamBand*smoothstep(0.35,0.75,foamN+sin(depth*5.0-uTime*2.2)*0.25);
   col=mix(col,vec3(0.95,0.99,1.0),foam*0.85);
   float alpha=max(mix(0.82,0.96,smoothstep(0.0,3.0,depth)),foam*0.95);
   float fd=length(cameraPosition-vWorld);
   float fogF=1.0-exp(-uFogD*uFogD*fd*fd);
   col=mix(col,uFogCol,fogF);
   gl_FragColor=vec4(col,alpha);
  }`
 }));
 waterMesh.frustumCulled=false;scene.add(waterMesh);
}

export {pads,beaconSpots,rawHeight,terrainH,grid,getHeight,getGround,terrainNormal,colliders,dummy,tmpC,tmpC2,tmpV,tmpV2,skyU,skyMesh,sunSprite,terrainMesh,waterMesh,waterU,heightTex,buildTerrain,buildWater};
