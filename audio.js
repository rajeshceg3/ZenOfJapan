import {createAmbience, places} from './ambience.mjs';

const sound = createAmbience();
const $ = id => document.getElementById(id);
let busy = false;
function update() {
  const on = sound.state.enabled;
  $('trackInfo').textContent = places[sound.state.place].title;
  $('placeDetail').textContent = places[sound.state.place].detail;
  $('soundStatus').textContent = on ? 'Sound on' : 'Sound off';
  $('playPauseBtn').setAttribute('aria-label', on ? 'Mute ambience' : 'Play ambience');
  $('playPauseBtn').setAttribute('aria-pressed', String(on));
  $('playPauseBtn').disabled = busy;
  $('prevBtn').disabled = busy; $('nextBtn').disabled = busy;
  $('playPauseBtn').querySelector('.icon-play').classList.toggle('hidden', on);
  $('playPauseBtn').querySelector('.icon-pause').classList.toggle('hidden', !on);
  document.querySelector('.track-icon').classList.toggle('playing', on);
}
async function run(action) {
  if (busy) {return;}
  busy = true; update();
  try { await action(); }
  catch (error) { $('soundError').textContent = error.message || 'Sound could not start. Try again.'; }
  finally { busy = false; update(); }
}
function toggle() {
  $('soundError').textContent = '';
  return run(() => sound.state.enabled ? sound.stop() : sound.start());
}
function step(direction) {
  return run(() => sound.setPlace((sound.state.place + direction + places.length) % places.length));
}
function help(open) {
  $('helpModal').classList.toggle('hidden', !open);
  $('helpModal').setAttribute('aria-hidden', String(!open));
  if (open) {document.querySelector('.close-modal').focus();}
  else {$('openHelpBtn').focus();}
}
document.addEventListener('DOMContentLoaded', () => {
  $('playPauseBtn').addEventListener('click', toggle);
  $('prevBtn').addEventListener('click', () => step(-1));
  $('nextBtn').addEventListener('click', () => step(1));
  $('volumeSlider').addEventListener('input', event => sound.volume(event.target.value));
  $('openHelpBtn').addEventListener('click', () => help(true));
  document.querySelector('.close-modal').addEventListener('click', () => help(false));
  document.addEventListener('keydown', event => {
    if (['INPUT','TEXTAREA','BUTTON'].includes(event.target.tagName)) {return;}
    if (event.code === 'Space') {event.preventDefault();toggle();}
    else if (event.code === 'ArrowRight') {step(1);}
    else if (event.code === 'ArrowLeft') {step(-1);}
    else if (event.key === '?') {help(true);}
  });
  document.addEventListener('keydown', event => {if(event.key === 'Escape' && !$('helpModal').classList.contains('hidden')){help(false);}});
  document.addEventListener('visibilitychange', () => {if(document.hidden){sound.stop();update();}});
  window.addEventListener('pagehide', () => sound.stop());
  if ('serviceWorker' in navigator) {navigator.serviceWorker.register('./sw.js').catch(() => {});}
  update();
});
