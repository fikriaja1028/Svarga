// SVARGA — konstanta dunia, kesulitan, kualitas & state global

import * as THREE from 'three';

/* ============================================================ config & state */
const WORLD=900, HALF=450, SEG=256, STEP=WORLD/SEG, SEA=0, DAY_LEN=480, BOUND=445;
const DIFFS={
 santai:{label:'Santai',perBeacon:2,roam:2,dmg:8,chase:6.2,aggro:20,regen:5,enRegen:16},
 petualang:{label:'Petualang',perBeacon:3,roam:4,dmg:12,chase:7.2,aggro:26,regen:3.5,enRegen:13},
 ksatria:{label:'Ksatria',perBeacon:4,roam:6,dmg:18,chase:8.4,aggro:32,regen:2.2,enRegen:11}
};
const QUALITIES={
 rendah:{pr:1,shadow:1024,grass:1800,flies:220,points:false},
 sedang:{pr:1.5,shadow:2048,grass:4200,flies:380,points:true},
 tinggi:{pr:1.75,shadow:2048,grass:6500,flies:520,points:true},
 ultra:{pr:2,shadow:2048,grass:9000,flies:650,points:true}
};
const QORDER=['rendah','sedang','tinggi','ultra'];
const BEACON_DEFS=[
 {name:'Menara Fajar',accent:0xffb35c},{name:'Menara Embun',accent:0x6fffd0},{name:'Menara Angin',accent:0x7ec8ff},
 {name:'Menara Bara',accent:0xff7a5c},{name:'Menara Senja',accent:0xff8fd0},{name:'Menara Bintang',accent:0xb9a0ff}
];
let saved={};
try{saved=JSON.parse(localStorage.getItem('svarga_v1')||'{}')}catch(e){saved={}}
const isTouchDevice=('ontouchstart'in window)||navigator.maxTouchPoints>0;
const G={
 state:'loading',runTime:0,dayT:.32,hp:100,en:100,shards:0,lit:0,gate:false,
 stats:{shards:0,banished:0,deaths:0},
 diff:saved.diff&&DIFFS[saved.diff]?saved.diff:'petualang',
 quality:saved.quality&&QUALITIES[saved.quality]?saved.quality:(isTouchDevice||(navigator.hardwareConcurrency||8)<=4?'sedang':'tinggi'),
 sens:typeof saved.sens==='number'?saved.sens:1, muted:!!saved.muted,
 best:saved.best||{},
 channel:0,channelB:null,combo:0,comboT:0,invuln:0,sinceDmg:99,burstCd:0,shake:0,dmgPulse:0,
 deadT:0,cineT:0,introT:0,zoomMap:false,autoDrops:0,fpsE:60,lowT:0,
 boundaryT:0,drownT:0,banishToastT:0,hintT:0,mapFrame:0,objT:0,timeT:0,fpsT:0,frames:0,fpsAcc:0,
 helpReturn:null,lockWasOurs:false,menuT:0,elapsed:0
};
function persist(){try{localStorage.setItem('svarga_v1',JSON.stringify({diff:G.diff,quality:G.quality,sens:G.sens,muted:G.muted,best:G.best}))}catch(e){}}
const P={pos:new THREE.Vector3(0,10,168),vel:new THREE.Vector3(),yaw:0,faceYaw:Math.PI,grounded:true,swim:false,phase:0,jumpBuf:0,coyote:0,speed:0};
const C={yaw:0,pitch:.32,dist:8.5,fov:62,pos:new THREE.Vector3(0,14,180)};
const I={keys:{},joy:{x:0,y:0,mag:0},joyId:null,lookId:null,lookLX:0,lookLY:0,rightDrag:false,locked:false,lockOK:true,touch:false};

export {WORLD,HALF,SEG,STEP,SEA,DAY_LEN,BOUND,DIFFS,QUALITIES,QORDER,BEACON_DEFS,G,persist,P,C,I};
