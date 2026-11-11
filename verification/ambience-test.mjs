import assert from 'node:assert/strict';
import {places, renderPlace, createAmbience} from '../ambience.mjs';

for (let index=0;index<places.length;index++) {
  const data=renderPlace(22050,index);
  let sum=0,peak=0;
  for(const channel of [data.left,data.right]) {for(const x of channel){assert.ok(Number.isFinite(x));sum+=x*x;peak=Math.max(peak,Math.abs(x));}}
  const rms=Math.sqrt(sum/(data.left.length*2));
  assert.ok(rms>0.005 && peak<0.7,`scene ${index} rms=${rms} peak=${peak}`);
  console.log(places[index].title,{rms,peak});
}
const contexts=[];
class Context {
  constructor(){this.sampleRate=8000;this.currentTime=0;this.state='suspended';this.destination={};contexts.push(this);}
  createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}},connect(){return this;}};}
  createBuffer(){return {copyToChannel(){}};}
  createBufferSource(){return {connect(){},start(){},stop(){}};}
  async resume(){this.state='running';}
  async close(){this.state='closed';}
}
globalThis.window={AudioContext:Context};
const sound=createAmbience();
assert.equal(contexts.length,0,'no context before opt-in');
await sound.start();assert.equal(contexts.length,1);assert.equal(sound.state.enabled,true);
await sound.setPlace(1);assert.equal(contexts[0].state,'closed');assert.equal(sound.state.place,1);assert.equal(sound.state.enabled,true);
sound.volume(0.2);assert.equal(sound.state.volume,0.2);
await sound.stop();assert.equal(sound.state.enabled,false);assert.equal(sound.state.context,null);assert.equal(contexts[1].state,'closed');
await sound.setPlace(2);assert.equal(contexts.length,2,'switching while muted must not start audio');
await sound.start();await sound.stop();assert.equal(contexts[2].state,'closed');
console.log('PASS synthesis bounds, opt-in, scene switches, volume and context cleanup');
