/* Optional sound. Default off, toggle always visible, and no sound is required
   for full play. Everything is synthesised so the repo ships no audio binaries. */

import { prefs } from './state.js';

const STINGS = {
  unlock: [
    { f: 392, t: 0, d: 0.16, g: 0.10, type: 'triangle' },
    { f: 587, t: 0.10, d: 0.26, g: 0.09, type: 'triangle' },
  ],
  wrong: [
    { f: 150, t: 0, d: 0.14, g: 0.11, type: 'square' },
    { f: 96, t: 0.09, d: 0.22, g: 0.09, type: 'square' },
  ],
  door: [
    { f: 174, t: 0, d: 0.4, g: 0.11, type: 'sine' },
    { f: 261, t: 0.16, d: 0.4, g: 0.09, type: 'sine' },
    { f: 392, t: 0.32, d: 0.7, g: 0.08, type: 'sine' },
  ],
  twist: [
    { f: 880, t: 0, d: 0.09, g: 0.07, type: 'sine' },
    { f: 660, t: 0.12, d: 0.09, g: 0.07, type: 'sine' },
    { f: 880, t: 0.24, d: 0.18, g: 0.07, type: 'sine' },
  ],
};

let ctx = null;
let ambient = null;

function context() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

function stopAmbient() {
  if (!ambient) return;
  try {
    ambient.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    ambient.sources.forEach((s) => s.stop(ctx.currentTime + 1.5));
  } catch (err) { /* already stopped */ }
  ambient = null;
}

function startAmbient() {
  const ac = context();
  if (!ac || ambient) return;
  const gain = ac.createGain();
  gain.gain.value = 0;
  gain.connect(ac.destination);
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 220;
  filter.connect(gain);
  const sources = [];
  [55, 82.5].forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const oscGain = ac.createGain();
    oscGain.gain.value = i === 0 ? 0.5 : 0.2;
    osc.connect(oscGain).connect(filter);
    osc.start();
    sources.push(osc);
  });
  gain.gain.setTargetAtTime(0.035, ac.currentTime, 1.2);
  ambient = { gain, sources };
}

export const audio = {
  get enabled() {
    return prefs.get('sound', false) === true;
  },
  set(on) {
    prefs.set('sound', on === true);
    if (on) {
      const ac = context();
      if (ac && ac.state === 'suspended') ac.resume();
      startAmbient();
    } else {
      stopAmbient();
    }
    return this.enabled;
  },
  toggle() {
    return this.set(!this.enabled);
  },
  /* Called on first user gesture so browsers allow playback at all. */
  wake() {
    if (!this.enabled) return;
    const ac = context();
    if (ac && ac.state === 'suspended') ac.resume();
    startAmbient();
  },
  play(name) {
    if (!this.enabled) return;
    const ac = context();
    const spec = STINGS[name];
    if (!ac || !spec) return;
    if (ac.state === 'suspended') ac.resume();
    const now = ac.currentTime;
    spec.forEach((note) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = note.type;
      osc.frequency.value = note.f;
      gain.gain.setValueAtTime(0.0001, now + note.t);
      gain.gain.exponentialRampToValueAtTime(note.g, now + note.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.t + note.d);
      osc.connect(gain).connect(ac.destination);
      osc.start(now + note.t);
      osc.stop(now + note.t + note.d + 0.05);
    });
  },
};
