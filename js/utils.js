// SVARGA — util: math, RNG, noise & GLSL helper

import * as THREE from 'three';

/* ============================================================ utils */
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const damp=THREE.MathUtils.damp;
const TAU=Math.PI*2;
const wrapPi=a=>{while(a>Math.PI)a-=TAU;while(a<-Math.PI)a+=TAU;return a};
const fmtTime=s=>{s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const SEED=(Math.random()*1e9)|0;
const rng=mulberry32(SEED);
function hash2i(x,y){let h=Math.imul(x,374761393)+Math.imul(y,668265263)+SEED|0;h=Math.imul(h^h>>>13,1274126177);h^=h>>>16;return(h>>>0)/4294967296}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
 const a=hash2i(xi,yi),b=hash2i(xi+1,yi),c=hash2i(xi,yi+1),d=hash2i(xi+1,yi+1);
 return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm(x,y,o){let s=0,a=.5,f=1,n=0;for(let i=0;i<o;i++){s+=a*vnoise(x*f,y*f);n+=a;a*=.5;f*=2.03}return s/n}

const GLSL_NOISE=`
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*0.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float hash13(vec3 p3){p3=fract(p3*0.1031);p3+=dot(p3,p3.zyx+31.32);return fract((p3.x+p3.y)*p3.z);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);
 return mix(mix(hash12(i),hash12(i+vec2(1.0,0.0)),u.x),mix(hash12(i+vec2(0.0,1.0)),hash12(i+vec2(1.0,1.0)),u.x),u.y);}
float fbm2(vec2 p){float s=0.0,a=0.5;for(int i=0;i<4;i++){s+=a*noise2(p);p*=2.03;a*=0.5;}return s;}
`;

export {$,clamp,lerp,sstep,damp,TAU,wrapPi,fmtTime,mulberry32,SEED,rng,hash2i,vnoise,fbm,GLSL_NOISE};
