// SVARGA — model karakter pemain

import * as THREE from 'three';
import {scene, glowTex} from './scene.js';

/* ============================================================ player */
const player={group:null,parts:{},light:null,burstRing:null,burstLight:null,burstT:0};
function buildPlayer(){
 const g=new THREE.Group();
 const cloth=new THREE.MeshStandardMaterial({color:0x33406b,roughness:.75});
 const clothDark=new THREE.MeshStandardMaterial({color:0x26305a,roughness:.8,side:THREE.DoubleSide});
 const skin=new THREE.MeshStandardMaterial({color:0xe6c39c,roughness:.6});
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.62,4,10),cloth);body.position.y=1.05;g.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.23,12,10),skin);head.position.y=1.74;g.add(head);
 const hood=new THREE.Mesh(new THREE.SphereGeometry(.28,10,8),cloth);hood.position.set(0,1.77,-.05);hood.scale.set(1,.95,1.05);g.add(hood);
 const cloak=new THREE.Mesh(new THREE.ConeGeometry(.44,1.05,7,1,true),clothDark);cloak.position.set(0,1.18,-.24);g.add(cloak);
 const core=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),new THREE.MeshStandardMaterial({color:0x06222a,emissive:0x59f2ff,emissiveIntensity:3.2}));core.position.set(0,1.3,.31);g.add(core);
 const armL=new THREE.Group(),armR=new THREE.Group();
 armL.position.set(-.42,1.45,0);armR.position.set(.42,1.45,0);
 const armGeo=new THREE.CapsuleGeometry(.09,.4,3,6);
 const aL=new THREE.Mesh(armGeo,cloth);aL.position.y=-.28;armL.add(aL);
 const aR=new THREE.Mesh(armGeo,cloth);aR.position.y=-.28;armR.add(aR);
 g.add(armL,armR);
 const legL=new THREE.Group(),legR=new THREE.Group();
 legL.position.set(-.16,.8,0);legR.position.set(.16,.8,0);
 const legGeo=new THREE.CapsuleGeometry(.11,.38,3,6);
 const lL=new THREE.Mesh(legGeo,clothDark);lL.position.y=-.36;legL.add(lL);
 const lR=new THREE.Mesh(legGeo,clothDark);lR.position.y=-.36;legR.add(lR);
 g.add(legL,legR);
 const staff=new THREE.Group();staff.position.set(.48,1.05,.12);staff.rotation.z=-.12;
 const rod=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,1.7,6),new THREE.MeshStandardMaterial({color:0x6b4a2f,roughness:.85}));staff.add(rod);
 const tip=new THREE.Mesh(new THREE.OctahedronGeometry(.13,0),new THREE.MeshStandardMaterial({color:0x06222a,emissive:0x59f2ff,emissiveIntensity:2.6}));tip.position.y=.95;staff.add(tip);
 const tipGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0x59f2ff,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
 tipGlow.scale.setScalar(1.1);tipGlow.position.y=.95;staff.add(tipGlow);
 g.add(staff);
 g.traverse(o=>{if(o.isMesh)o.castShadow=true});
 const light=new THREE.PointLight(0x59f2ff,2.2,11,2);light.position.set(0,1.5,.3);g.add(light);
 scene.add(g);
 player.group=g;player.light=light;
 player.parts={body,head,hood,cloak,armL,armR,legL,legR,staff,core,tip,tipGlow};
 // burst ring + light
 const ring=new THREE.Mesh(new THREE.RingGeometry(.86,1,48),new THREE.MeshBasicMaterial({color:0x8ff4ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
 ring.rotation.x=-Math.PI/2;ring.visible=false;scene.add(ring);
 player.burstRing=ring;
 player.burstLight=new THREE.PointLight(0x8ff4ff,0,30,2);scene.add(player.burstLight);
}

export {player,buildPlayer};
