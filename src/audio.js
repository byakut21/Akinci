// Original epic medieval score (dark D-minor, 3/4, cello ostinato, war drums, horns, choir) + SFX — pure WebAudio.
let AC = null, master, musicBus, sfxBus, reverb, noiseBuf;
let musicOn = true, sfxOn = true, intense = 0;
try { musicOn = localStorage.getItem('akinci_music') !== '0'; sfxOn = localStorage.getItem('akinci_sfx') !== '0'; } catch (e) { }

function buildGraph() {
  master = AC.createDynamicsCompressor(); master.threshold.value = -16; master.ratio.value = 3.5; master.connect(AC.destination);
  musicBus = AC.createGain(); musicBus.gain.value = musicOn ? .6 : 0; musicBus.connect(master);
  sfxBus = AC.createGain(); sfxBus.gain.value = sfxOn ? .85 : 0; sfxBus.connect(master);
  reverb = AC.createConvolver(); const len = AC.sampleRate * 3.2, ir = AC.createBuffer(2, len, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2); }
  reverb.buffer = ir; const rv = AC.createGain(); rv.gain.value = .38; reverb.connect(rv); rv.connect(master);
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
}
export function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  buildGraph(); startMusic();
}
// renders the score offline (testing / previews)
export async function renderMusic(sec, startStep = 0) {
  const keep = [AC, master, musicBus, sfxBus, reverb, noiseBuf, nextT, step, musicOn];
  AC = new OfflineAudioContext(2, Math.round(44100 * sec), 44100); musicOn = true; buildGraph();
  nextT = .1; step = startStep; while (nextT < sec - .5) scheduleStep();
  const buf = await AC.startRendering();
  [AC, master, musicBus, sfxBus, reverb, noiseBuf, nextT, step, musicOn] = keep;
  return buf;
}
export function setMusic(on) { musicOn = on; try { localStorage.setItem('akinci_music', on ? '1' : '0'); } catch (e) { } if (musicBus) musicBus.gain.setTargetAtTime(on ? .6 : 0, AC.currentTime, .3); }
export function setSfx(on) { sfxOn = on; try { localStorage.setItem('akinci_sfx', on ? '1' : '0'); } catch (e) { } if (sfxBus) sfxBus.gain.setTargetAtTime(on ? .85 : 0, AC.currentTime, .05); }
export const audioState = () => ({ musicOn, sfxOn });
export function setIntensity(v) { intense = v; }

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function noise(t, dur, type, freq, q, gain, dest, sweepTo, attack = .002) {
  const s = AC.createBufferSource(); s.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur); f.Q.value = q;
  const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + .05); return g;
}
function tone(t, dur, type, f0, f1, gain, dest, attack = .003) {
  const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05); return g;
}
const send = (node, amt) => { const s = AC.createGain(); s.gain.value = amt; node.connect(s); s.connect(reverb); };

// ---------------------------------------------------------------- instruments
function warDrum(t, v = 1) {
  const g1 = tone(t, .9, 'sine', 78, 38, .55 * v, musicBus, .004); send(g1, .5);
  noise(t, .18, 'lowpass', 380, .8, .25 * v, musicBus);
  const g2 = noise(t, .6, 'lowpass', 160, .6, .22 * v, musicBus); send(g2, .6);
}
function smallDrum(t, v = 1) { const g = noise(t, .12, 'bandpass', 900, 1.4, .3 * v, musicBus); send(g, .3); tone(t, .1, 'triangle', 190, 140, .08 * v, musicBus); }
function cello(t, dur, m, v = 1) {
  const f = mtof(m);
  const o1 = AC.createOscillator(), o2 = AC.createOscillator(); o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = f; o2.frequency.value = f; o2.detune.value = 7;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.2; lp.frequency.setValueAtTime(380, t); lp.frequency.exponentialRampToValueAtTime(1500, t + .05); lp.frequency.exponentialRampToValueAtTime(600, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.16 * v, t + .02); g.gain.exponentialRampToValueAtTime(.08 * v, t + dur * .6); g.gain.exponentialRampToValueAtTime(.0005, t + dur + .05);
  o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(musicBus); send(g, .35);
  for (const o of [o1, o2]) { o.start(t); o.stop(t + dur + .1); }
}
function strings(t, dur, notes, v = 1) {
  for (const m of notes) for (const det of [-9, 0, 8]) {
    const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
    const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 4.6 + Math.random(); lg.gain.value = 3; lfo.connect(lg); lg.connect(o.detune);
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1100;
    const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.04 * v, t + .7); g.gain.setValueAtTime(.04 * v, t + dur - .4); g.gain.exponentialRampToValueAtTime(.0005, t + dur + .3);
    o.connect(f); f.connect(g); g.connect(musicBus); send(g, .7);
    o.start(t); o.stop(t + dur + .4); lfo.start(t); lfo.stop(t + dur + .4);
  }
}
function horn(t, dur, m, v = 1) {
  const f = mtof(m), end = t + dur;
  const os = [['sawtooth', 0], ['sawtooth', 6], ['triangle', -4]].map(([ty, d]) => { const o = AC.createOscillator(); o.type = ty; o.frequency.value = f; o.detune.value = d; return o; });
  const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(5, t + Math.min(dur, .6)); lfo.connect(lg); for (const o of os) lg.connect(o.detune);
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = .8; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1500, t + .25); lp.frequency.linearRampToValueAtTime(1000, end);
  const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12 * v, t + .14); g.gain.setValueAtTime(.12 * v, end - .12); g.gain.exponentialRampToValueAtTime(.0005, end + .25);
  for (const o of os) o.connect(lp); lp.connect(g); g.connect(musicBus); send(g, .8);
  for (const o of [...os, lfo]) { o.start(t); o.stop(end + .3); }
}
const FORMANTS = [[730, 9, 1], [1090, 11, .55], [2440, 14, .3]]; // "ah"
function choir(t, dur, notes, v = 1) {
  for (const m of notes) {
    const mix = AC.createGain(); mix.gain.value = 1;
    for (const det of [-11, 0, 10]) { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det; o.connect(mix); o.start(t); o.stop(t + dur + .6); }
    const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.08 * v, t + .8); g.gain.setValueAtTime(.08 * v, t + dur - .3); g.gain.exponentialRampToValueAtTime(.0005, t + dur + .5);
    for (const [fr, q, a] of FORMANTS) { const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q; const ga = AC.createGain(); ga.gain.value = a * 2.2; mix.connect(bp); bp.connect(ga); ga.connect(g); }
    g.connect(musicBus); send(g, 1);
  }
}

// ---------------------------------------------------------------- score (original)
// 3/4 time, 6 eighth-note steps per bar. D minor.
const CHORD = [['D', 38, [50, 53, 57]], ['D', 38, [50, 53, 57]], ['Bb', 34, [46, 50, 53]], ['C', 36, [48, 52, 55]], ['D', 38, [50, 53, 57]], ['G', 43, [43, 46, 50]], ['A', 45, [45, 49, 52]], ['A', 45, [45, 49, 52]]];
// cello ostinato intervals over the chord root (semitones), one per eighth: root, fifth, octave, fifth, third, fifth
const OST = (root, minor) => [root, root + 7, root + 12, root + 7, root + (minor ? 3 : 4), root + 7];
const MEL1 = [[[0, 6, 62]], [[0, 2, 65], [2, 2, 64], [4, 2, 62]], [[0, 4, 65], [4, 2, 67]], [[0, 6, 64]], [[0, 4, 69], [4, 2, 67]], [[0, 2, 70], [2, 2, 69], [4, 2, 67]], [[0, 3, 69], [3, 1, 67], [4, 2, 65]], [[0, 6, 64]]];
const MEL2 = [[[0, 4, 74], [4, 2, 72]], [[0, 6, 69]], [[0, 2, 70], [2, 2, 72], [4, 2, 74]], [[0, 4, 72], [4, 2, 67]], [[0, 2, 69], [2, 2, 70], [4, 2, 69]], [[0, 4, 67], [4, 2, 65]], [[0, 2, 64], [2, 2, 65], [4, 2, 67]], [[0, 6, 69]]];
const BPM = 84, STEP = 60 / BPM / 2; // eighth
let nextT = 0, step = 0, timer = null;
function startMusic() { nextT = AC.currentTime + .2; step = (typeof window !== 'undefined' && window.__musicStep) || 0; if (timer) clearInterval(timer); timer = setInterval(sched, 40); }
function sched() {
  if (!AC || AC.state !== 'running') return;
  if (nextT < AC.currentTime - .05) nextT = AC.currentTime + .05; // main thread stalled: skip ahead instead of bunching notes
  while (nextT < AC.currentTime + .8) scheduleStep();
}
function scheduleStep() {
    const t = nextT, s = step % 6, barAbs = Math.floor(step / 6), bar = barAbs % 8, sec = Math.floor(barAbs / 8) % 4; // A,B,C,D
  const [name, root, ch] = CHORD[bar]; const minor = name === 'D' || name === 'G';
  const war = intense > 0;
  // cello ostinato (not in sparse section D except bars 4-7)
  if (sec !== 3 || bar >= 4) { const n = OST(root + 12, minor)[s]; cello(t, STEP * .92, n, s === 0 ? 1.15 : .9); }
  // low strings pad
  if (s === 0) strings(t, STEP * 6, ch.map(m => m + (sec === 2 ? 12 : 0)), sec === 0 ? .7 : 1);
  // war drums
  if (s === 0) warDrum(t, sec === 3 ? .6 : 1);
  if (s === 3 && (sec >= 1 || war)) warDrum(t, .55);
  if ((sec === 2 || war) && (s === 4 || s === 5)) smallDrum(t, .6);
  if (war && s === 2) smallDrum(t, .5);
  if (sec === 2 && bar === 0 && s === 0) noise(t, 2.2, 'highpass', 5000, .7, .12, reverb, null, 1.8);
  // melodies
  const mel = sec === 1 ? MEL1 : sec === 2 ? MEL2 : sec === 3 ? MEL1 : null;
  if (mel) for (const [st, len, m] of mel[bar]) if (st === s) {
    if (sec === 3) cello(t, len * STEP * .98, m - 12, 1.2);
    else horn(t, len * STEP * .98, m, sec === 2 ? 1.1 : 1);
    if (sec === 2) choir(t, len * STEP, [m - 12, m - 5], .8);
  }
  nextT += STEP; step++;
}
// ---------------------------------------------------------------- sfx
const last = {};
export function sfx(name, vol = 1) {
  if (!AC || !sfxOn) return; const t = AC.currentTime;
  if (last[name] && t - last[name] < (name === 'coin' ? .045 : .06)) return; last[name] = t;
  const D = sfxBus;
  switch (name) {
    case 'sword': noise(t, .09, 'bandpass', 2800, 2.5, .45 * vol, D); tone(t, .18, 'sine', 1900, 1750, .045 * vol, D); tone(t, .15, 'sine', 2870, 2700, .03 * vol, D); break;
    case 'axe': noise(t, .14, 'bandpass', 900, 1.5, .55 * vol, D); tone(t, .12, 'triangle', 180, 90, .2 * vol, D); break;
    case 'chop': noise(t, .07, 'bandpass', 1500, 3, .25 * vol, D); tone(t, .06, 'triangle', 320, 200, .08 * vol, D); break;
    case 'death': noise(t, .25, 'lowpass', 600, .8, .3 * vol, D, 200); tone(t, .25, 'sine', 150, 70, .18 * vol, D); break;
    case 'arrow': noise(t, .16, 'bandpass', 3200, 3, .22 * vol, D, 700); break;
    case 'hurt': tone(t, .2, 'sine', 160, 70, .3 * vol, D); noise(t, .08, 'lowpass', 900, .7, .3 * vol, D); break;
    case 'coin': tone(t, .12, 'sine', 1568, 0, .08 * vol, D); tone(t + .05, .2, 'sine', 2093, 0, .07 * vol, D); break;
    case 'res': tone(t, .1, 'triangle', 660, 0, .05 * vol, D); break;
    case 'pay': tone(t, .06, 'triangle', 880, 0, .05 * vol, D); break;
    case 'buy': [523, 659, 784, 1047].forEach((f, i) => tone(t + i * .06, .2, 'triangle', f, 0, .11 * vol, D)); break;
    case 'build': for (let i = 0; i < 3; i++) { tone(t + i * .12, .08, 'triangle', 240, 140, .22 * vol, D); noise(t + i * .12, .05, 'bandpass', 1200, 2, .28 * vol, D); } break;
    case 'horn': for (const [f, dt] of [[146.8, 0], [220, .3]]) horn(t + dt, .55, Math.round(69 + 12 * Math.log2(f / 440)), 1.6); break;
    case 'alarm': for (const det of [0, -8, 7]) { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(87, t); o.frequency.linearRampToValueAtTime(82, t + 1.4); o.detune.value = det; const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 600; const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .2); g.gain.exponentialRampToValueAtTime(.0005, t + 1.6); o.connect(fl); fl.connect(g); g.connect(D); g.connect(reverb); o.start(t); o.stop(t + 1.7); } warDrum(t); warDrum(t + .4); break;
    case 'boom': tone(t, .5, 'sine', 120, 35, .55 * vol, D); noise(t, .5, 'lowpass', 700, .5, .45 * vol, D); noise(t, .8, 'lowpass', 300, .5, .3 * vol, reverb); break;
    case 'win': [62, 65, 69, 74, 77, 81].forEach((m, i) => tone(t + i * .14, .7, 'triangle', mtof(m), 0, .13, D)); break;
    case 'lose': [69, 65, 62, 57].forEach((m, i) => tone(t + i * .3, .8, 'sawtooth', mtof(m), 0, .05, D)); break;
    case 'conquer': horn(t, 1.2, 62, 2); horn(t, 1.2, 69, 1.6); warDrum(t); break;
  }
}
