// SVARGA — kualitas grafis & kesulitan

import {G, DIFFS, QUALITIES, persist} from './config.js';
import {D} from './dom.js';
import {renderer, composer, fxaaPass, sun} from './scene.js';
import {grassMesh} from './vegetation.js';
import {beacons} from './beacons.js';
import {shardGlow} from './shards.js';
import {pPts, fireflies} from './particles.js';
import {trailPts, wisps, applyWispDifficulty} from './wisps.js';
import {updateBestChip} from './hud.js';

/* ============================================================ quality */
function setQuality(q){
 if(!QUALITIES[q])return;
 G.quality=q;persist();
 const Q=QUALITIES[q];
 const pr=Math.min(devicePixelRatio||1,Q.pr);
 renderer.setPixelRatio(pr);
 composer.setPixelRatio(pr);
 renderer.setSize(innerWidth,innerHeight);
 composer.setSize(innerWidth,innerHeight);
 fxaaPass.material.uniforms.resolution.value.set(1/(innerWidth*pr),1/(innerHeight*pr));
 if(sun.shadow.mapSize.x!==Q.shadow){
  sun.shadow.mapSize.set(Q.shadow,Q.shadow);
  if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}
 }
 if(grassMesh)grassMesh.count=Math.min(Q.grass,9000);
 if(fireflies)fireflies.geometry.setDrawRange(0,Q.flies);
 for(const b of beacons)b.light.visible=Q.points;
 for(const m of [pPts,shardGlow,trailPts,fireflies])if(m)m.material.uniforms.uPR.value=pr;
 for(const b of beacons)b.mU.uPR.value=pr;
 D.qSel.value=q;D.qSelTitle.value=q;
}
function setDiff(d){
 if(!DIFFS[d])return;
 G.diff=d;persist();
 D.diffSel.value=d;D.modeChip.textContent=DIFFS[d].label;
 document.querySelectorAll('.diffCard').forEach(c=>c.classList.toggle('sel',c.dataset.diff===d));
 updateBestChip();
 if(wisps.length)applyWispDifficulty();
}

export {setQuality,setDiff};
