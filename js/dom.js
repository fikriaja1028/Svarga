// SVARGA — referensi elemen DOM

import {$} from './utils.js';

/* ============================================================ DOM refs */
const IDS=['game','hud','objPanel','modeChip','objShards','objBeacons','objMain','objSub','compass','topRight','muteBtn','icoSndOn','icoSndOff','pauseBtn','mapWrap','minimap','mapHint','timeChip','timeIconSun','timeIconMoon','timeLabel','hpFill','hpVal','enFill','enVal','shardChip','shardNum','burstChip','burstCd','prompt','promptKey','promptText','chRing','chRingWrap','toasts','hintBar','lockHint','lockHintText','fps','dmg','flash','joyZone','joyBase','joyThumb','tJump','tBurst','tBurstCd','tInteract','loading','loadBar','loadPct','loadStep','title','btnStart','btnHelp1','qSelTitle','bestChip','diffCards','pause','btnResume','btnHelp2','btnRetry','btnTitle','btnNew2','qSel','diffSel','sensRange','sensVal','sndToggle','pTime','pBeacons','pShards','help','helpClose','death','deathCount','victory','rankLetter','rankDesc','stTime','stShards','stWisps','stDeaths','recordLine','btnAgain','btnNewWorld','fatal','fatalMsg'];
const D={};IDS.forEach(id=>D[id]=$(id));

export {D};
