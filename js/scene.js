// SVARGA — renderer, post-processing & tekstur prosedural

import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {D} from './dom.js';
import {C} from './config.js';
import {TAU, mulberry32} from './utils.js';

/* ============================================================ three core */
let renderer;
try{
 renderer=new THREE.WebGLRenderer({canvas:D.game,antialias:true,powerPreference:'high-performance'});
}catch(e){
 D.fatalMsg.textContent='Perangkat atau browser ini tidak mendukung WebGL, sehingga dunia Svarga tidak dapat dirender. Coba browser modern seperti Chrome, Edge, atau Firefox.';
 D.fatal.classList.add('on');throw e;
}
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.1;
renderer.outputColorSpace=THREE.SRGBColorSpace;
D.game.addEventListener('webglcontextlost',e=>{e.preventDefault();D.fatalMsg.textContent='Konteks grafis hilang (GPU dimuat ulang). Muat ulang halaman untuk melanjutkan.';D.fatal.classList.add('on')});

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0b1026);
scene.fog=new THREE.FogExp2(0xcfe8ea,.0021);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,1500);
camera.position.copy(C.pos);

const hemi=new THREE.HemisphereLight(0xbcd9ff,0x6a7f5a,.6);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff4e0,2.4);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-75;sun.shadow.camera.right=75;sun.shadow.camera.top=75;sun.shadow.camera.bottom=-75;
sun.shadow.camera.near=10;sun.shadow.camera.far=420;
sun.shadow.bias=-.0004;sun.shadow.normalBias=.7;
scene.add(sun);scene.add(sun.target);

/* composer */
const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloomPass=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.55,.65,.82);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());
const fxaaPass=new ShaderPass(FXAAShader);
composer.addPass(fxaaPass);

/* ============================================================ textures (procedural) */
function canvasTex(size,draw){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');draw(x,size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const glowTex=canvasTex(128,(x,s)=>{const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,s,s)});
const detailTex=canvasTex(256,(x,s)=>{x.fillStyle='#d8d8d8';x.fillRect(0,0,s,s);for(let i=0;i<5200;i++){const v=190+Math.random()*65|0;x.fillStyle=`rgb(${v},${v},${v})`;x.fillRect(Math.random()*s,Math.random()*s,1.6,1.6)}for(let i=0;i<60;i++){x.fillStyle='rgba(120,120,110,.12)';x.beginPath();x.arc(Math.random()*s,Math.random()*s,6+Math.random()*20,0,TAU);x.fill()}});
detailTex.wrapS=detailTex.wrapT=THREE.RepeatWrapping;detailTex.repeat.set(90,90);
const bladeTex=canvasTex(64,(x,s)=>{x.clearRect(0,0,s,s);const blade=(bx,w,tilt)=>{const g=x.createLinearGradient(0,s,0,0);g.addColorStop(0,'#4d7f3f');g.addColorStop(1,'#b8d878');x.fillStyle=g;x.beginPath();x.moveTo(bx-w,s);x.quadraticCurveTo(bx-w*.4+tilt,s*.4,bx+tilt,4);x.quadraticCurveTo(bx+w*.4+tilt,s*.4,bx+w,s);x.closePath();x.fill()};blade(12,4,6);blade(26,5,-4);blade(40,4,7);blade(52,4,-6)});
const cloudTex=canvasTex(256,(x,s)=>{x.clearRect(0,0,s,s);for(let i=0;i<14;i++){const cx=s*.2+Math.random()*s*.6,cy=s*.35+Math.random()*s*.3,r=s*(.1+Math.random()*.16);const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,s,s)}});
const runeTex=canvasTex(256,(x,s)=>{x.clearRect(0,0,s,s);x.strokeStyle='#fff';x.lineWidth=3;x.lineCap='round';const rr=mulberry32(777);for(let i=0;i<26;i++){const a=i/26*TAU,r=s*.42;const cx=s/2+Math.cos(a)*r,cy=s/2+Math.sin(a)*r;x.save();x.translate(cx,cy);x.rotate(a+Math.PI/2);x.beginPath();const n=2+(rr()*3|0);for(let k=0;k<n;k++){x.moveTo((rr()-.5)*14,(rr()-.5)*16);x.lineTo((rr()-.5)*14,(rr()-.5)*16)}x.stroke();x.restore()}x.beginPath();x.arc(s/2,s/2,s*.36,0,TAU);x.lineWidth=1.5;x.stroke();x.beginPath();x.arc(s/2,s/2,s*.48,0,TAU);x.stroke()});

export {renderer,scene,camera,hemi,sun,composer,bloomPass,fxaaPass,canvasTex,glowTex,detailTex,bladeTex,cloudTex,runeTex};
