import {makeRng, renderWindLoop, renderRustleLoop, renderBell, biquad} from './soundscape-dsp.mjs';

export const places = [
  {title: 'Garden water', detail: 'A small water channel and leaves in light wind.', water: 0.7, wind: 0.18, rustle: 0.05},
  {title: 'Wind in bamboo', detail: 'Air moving through bamboo leaves, without flute or music.', water: 0, wind: 0.22, rustle: 0.5},
  {title: 'Temple courtyard', detail: 'Courtyard air and water, with a distant bell roughly once a minute.', water: 0.3, wind: 0.18, rustle: 0.08, bell: true}
];

export function waterLoop(sr, seed = 31) {
  const n = sr * 12, rng = makeRng(seed), left = new Float32Array(n), right = new Float32Array(n);
  for (const channel of [left, right]) {
    const low = biquad('lowpass', 1800, 0.7, sr), high = biquad('highpass', 280, 0.7, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const ripple = 0.7 + 0.18 * Math.sin(2 * Math.PI * t / 3) + 0.1 * Math.sin(2 * Math.PI * t / 2);
      channel[i] = low(high(rng() * 2 - 1)) * ripple * 0.35;
    }
    // Short edge fade avoids a click at the loop join.
    const edge = Math.round(sr * 0.08);
    for (let i = 0; i < edge; i++) { channel[i] *= i / edge; channel[n - 1 - i] *= i / edge; }
  }
  return {left, right};
}

export function renderPlace(sr, index) {
  const p = places[index], water = waterLoop(sr), wind = renderWindLoop(sr, {seconds:12,baseCutoff:650,gustDepth:0.45}, makeRng(42));
  const rustle = renderRustleLoop(sr, {seconds:12}, makeRng(52));
  const left = new Float32Array(sr * 12), right = new Float32Array(sr * 12);
  for (let i=0; i<left.length; i++) {
    left[i] = Math.tanh(water.left[i]*p.water + wind.left[i]*p.wind + rustle.left[i]*p.rustle) * 0.6;
    right[i] = Math.tanh(water.right[i]*p.water + wind.right[i]*p.wind + rustle.right[i]*p.rustle) * 0.6;
  }
  return {left,right};
}

export function createAmbience() {
  const state = {context:null, enabled:false, place:0, volume:0.5};
  let source=null, master=null, bellTimer=null, generation=0;
  function stop() {
    generation++; clearTimeout(bellTimer); bellTimer=null;
    try {source?.stop();} catch { /* Already stopped. */ }
    source=null; master=null;
    const context=state.context; state.context=null; state.enabled=false;
    return context?.close();
  }
  function bellLater(token) {
    if (!state.enabled || !places[state.place].bell || token!==generation) {return;}
    bellTimer=setTimeout(()=>{
      if (!state.enabled || token!==generation) {return;}
      const ctx=state.context, data=renderBell(ctx.sampleRate,makeRng(73),{base:330});
      const buffer=ctx.createBuffer(1,data.length,ctx.sampleRate);buffer.copyToChannel(data,0);
      const s=ctx.createBufferSource(), gain=ctx.createGain();s.buffer=buffer;gain.gain.value=0.07;
      s.connect(gain).connect(master);s.start();bellLater(token);
    },45000+Math.random()*25000);
  }
  async function start() {
    if(state.enabled) {return;}
    const token=++generation;
    try {
      const C=window.AudioContext||window.webkitAudioContext;
      if(!C) {throw new Error('Audio is not supported in this browser.');}
      const ctx=new C();state.context=ctx;
      master=ctx.createGain();master.gain.setValueAtTime(0,ctx.currentTime);master.connect(ctx.destination);
      const data=renderPlace(ctx.sampleRate,state.place), buffer=ctx.createBuffer(2,data.left.length,ctx.sampleRate);
      buffer.copyToChannel(data.left,0);buffer.copyToChannel(data.right,1);
      source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(master);source.start();
      await ctx.resume();
      if(token!==generation) {return;}
      state.enabled=true;master.gain.linearRampToValueAtTime(state.volume,ctx.currentTime+0.7);bellLater(token);
    } catch(e) { await stop(); throw e; }
  }
  async function setPlace(index) {const was=state.enabled;await stop();state.place=index;if(was){await start();}}
  function volume(value) {state.volume=Math.max(0,Math.min(1,Number(value)));if(master&&state.context){master.gain.setTargetAtTime(state.volume,state.context.currentTime,0.05);}}
  return {state,start,stop,setPlace,volume};
}
