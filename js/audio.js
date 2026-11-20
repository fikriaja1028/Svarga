// SVARGA — audio prosedural (WebAudio)

import {clamp} from './utils.js';
import {G, persist} from './config.js';
import {D} from './dom.js';
import {nightFactor} from './day-cycle.js';

/* ============================================================ audio */
const A={
 ctx:null,master:null,delay:null,duckLevel:.9,windGain:null,windFilter:null,padFilter:null,padOsc:[],padGains:[],padIdx:0,padT:0,humGain:null,chanOsc:null,chanGain:null,noiseBuf:null,
 chords:[[110,164.8,220,329.6],[87.3,130.8,174.6,261.6],[98,146.8,196,293.7],[110,164.8,220,392]],
 init(){
  if(this.ctx)return;
  try{this.ctx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return}
  const c=this.ctx;
  this.master=c.createGain();this.master.gain.value=G.muted?0:.9;
  const comp=c.createDynamicsCompressor();
  this.master.connect(comp);comp.connect(c.destination);
  this.delay=c.createDelay(.6);this.delay.delayTime.value=.29;
  const fb=c.createGain();fb.gain.value=.32;
  this.delay.connect(fb);fb.connect(this.delay);
  const dg=c.createGain();dg.gain.value=.25;this.delay.connect(dg);dg.connect(this.master);
  const len=2*c.sampleRate,buf=c.createBuffer(1,len,c.sampleRate),ch=buf.getChannelData(0);
  for(let i=0;i<len;i++)ch[i]=Math.random()*2-1;
  this.noiseBuf=buf;
  // wind
  const src=c.createBufferSource();src.buffer=buf;src.loop=true;
  this.windFilter=c.createBiquadFilter();this.windFilter.type='lowpass';this.windFilter.frequency.value=320;this.windFilter.Q.value=.7;
  this.windGain=c.createGain();this.windGain.gain.value=0;
  src.connect(this.windFilter);this.windFilter.connect(this.windGain);this.windGain.connect(this.master);
  src.start();
  const lfo=c.createOscillator();lfo.frequency.value=.07;
  const lg=c.createGain();lg.gain.value=140;lfo.connect(lg);lg.connect(this.windFilter.frequency);lfo.start();
  const src2=c.createBufferSource();src2.buffer=buf;src2.loop=true;src2.playbackRate.value=.7;
  const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=900;bp.Q.value=1.2;
  const g2=c.createGain();g2.gain.value=.014;
  src2.connect(bp);bp.connect(g2);g2.connect(this.master);src2.start();
  this.windGain.gain.setTargetAtTime(.055,c.currentTime,2);
  // pad
  this.padFilter=c.createBiquadFilter();this.padFilter.type='lowpass';this.padFilter.frequency.value=1100;
  this.padFilter.connect(this.master);
  for(let i=0;i<4;i++){
   const o=c.createOscillator();o.type='sine';o.frequency.value=this.chords[0][i];o.detune.value=(i-1.5)*4;
   const g=c.createGain();g.gain.value=0;
   o.connect(g);g.connect(this.padFilter);o.start();
   g.gain.setTargetAtTime(.026,c.currentTime,3);
   this.padOsc.push(o);this.padGains.push(g);
  }
  // wisp hum
  const ho=c.createOscillator();ho.type='sawtooth';ho.frequency.value=52;
  const hf=c.createBiquadFilter();hf.type='lowpass';hf.frequency.value=200;
  this.humGain=c.createGain();this.humGain.gain.value=0;
  ho.connect(hf);hf.connect(this.humGain);this.humGain.connect(this.master);ho.start();
 },
 tone(type,f0,f1,t0,dur,vol,dest){
  const c=this.ctx;if(!c)return;
  const o=c.createOscillator(),g=c.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,t0);
  if(f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.012);
  g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
  o.connect(g);g.connect(dest||this.master);
  o.start(t0);o.stop(t0+dur+.05);
 },
 noise(t0,dur,vol,f0,f1,type){
  const c=this.ctx;if(!c)return;
  const s=c.createBufferSource();s.buffer=this.noiseBuf;s.loop=true;
  const f=c.createBiquadFilter();f.type=type||'bandpass';f.frequency.setValueAtTime(f0,t0);
  if(f1)f.frequency.exponentialRampToValueAtTime(f1,t0+dur);
  const g=c.createGain();g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
  s.connect(f);f.connect(g);g.connect(this.master);s.start(t0);s.stop(t0+dur+.05);
 },
 bell(f,t0,dur,vol){
  this.tone('sine',f,f,t0,dur,vol,this.delay);
  this.tone('sine',f*2.76,f*2.76,t0,dur*.5,vol*.25,this.delay);
 },
 chime(i){if(!this.ctx)return;const p=[523.25,587.33,659.25,783.99,880];this.bell(p[i%5]*(i>=5?1.5:1),this.ctx.currentTime,.9,.16)},
 beacon(){if(!this.ctx)return;const t=this.ctx.currentTime;
  [220,330,440,660].forEach((f,i)=>this.bell(f,t+i*.13,2,.16));
  this.tone('sawtooth',55,110,t,2,.1);this.noise(t,1.5,.035,6000,8000,'highpass');},
 burst(){if(!this.ctx)return;const t=this.ctx.currentTime;this.noise(t,.3,.28,1800,180);this.tone('sine',160,50,t,.25,.24)},
 hurt(){if(!this.ctx)return;const t=this.ctx.currentTime;this.tone('sine',130,55,t,.24,.3);this.noise(t,.15,.16,500,200,'lowpass')},
 banish(){if(!this.ctx)return;const t=this.ctx.currentTime;this.tone('triangle',240,980,t,.35,.1,this.delay);this.noise(t,.3,.06,3000,6000,'highpass')},
 death(){if(!this.ctx)return;const t=this.ctx.currentTime;this.tone('sawtooth',110,40,t,1.3,.16);this.noise(t,1,.08,400,120,'lowpass')},
 gate(){if(!this.ctx)return;const t=this.ctx.currentTime;[261.6,329.6,392,523.25,659.25].forEach((f,i)=>this.bell(f,t+i*.11,2.4,.15));this.tone('sine',80,320,t,1.6,.1)},
 victory(){if(!this.ctx)return;const t=this.ctx.currentTime;[523.25,659.25,783.99,1046.5,1318.5,1568].forEach((f,i)=>this.bell(f,t+i*.14,2.6,.16));[261.6,329.6,392].forEach(f=>this.bell(f,t+.9,4,.12))},
 blip(){if(!this.ctx)return;this.tone('square',660,660,this.ctx.currentTime,.06,.04)},
 channelStart(){if(!this.ctx||this.chanOsc)return;const c=this.ctx;
  this.chanOsc=c.createOscillator();this.chanOsc.type='sine';this.chanOsc.frequency.value=300;
  this.chanGain=c.createGain();this.chanGain.gain.value=0;
  this.chanOsc.connect(this.chanGain);this.chanGain.connect(this.delay);this.chanOsc.start();},
 channelStop(){if(this.chanOsc){try{this.chanOsc.stop()}catch(e){}this.chanOsc=null;this.chanGain=null}},
 update(dt,nearestWisp,speed){
  if(!this.ctx)return;
  const t=this.ctx.currentTime;
  this.windGain.gain.setTargetAtTime(.045+speed*.0022+nightFactor*.012,t,.4);
  this.windFilter.frequency.setTargetAtTime(320+speed*14,t,.4);
  this.padFilter.frequency.setTargetAtTime(1100-650*nightFactor,t,1);
  this.padT+=dt;
  if(this.padT>14){this.padT=0;this.padIdx=(this.padIdx+1)%this.chords.length;
   const ch=this.chords[this.padIdx];
   for(let i=0;i<4;i++)this.padOsc[i].frequency.setTargetAtTime(ch[i],t,2.2);}
  const humT=clamp(1-nearestWisp/30,0,1)*.05;
  this.humGain.gain.setTargetAtTime(humT,t,.3);
  if(this.chanOsc){this.chanOsc.frequency.setTargetAtTime(300+G.channel*520,t,.05);
   this.chanGain.gain.setTargetAtTime(.05,t,.05);}
 },
 duck(level){this.duckLevel=level;if(this.ctx)this.master.gain.setTargetAtTime(G.muted?0:level,this.ctx.currentTime,.25)},
 setMuted(m){G.muted=m;persist();
  if(this.ctx)this.master.gain.setTargetAtTime(m?0:this.duckLevel,this.ctx.currentTime,.12);
  D.icoSndOn.style.display=m?'none':'';D.icoSndOff.style.display=m?'':'none';
  D.sndToggle.textContent='SUARA: '+(m?'BISU':'AKTIF');
  D.muteBtn.setAttribute('aria-label',m?'Aktifkan suara':'Bisukan suara');
 }
};

export {A};
