// Procedural music (mehter-style march in Hicaz makam) and sound effects — WebAudio, no files.
let AC = null, master, musicBus, sfxBus, reverb, noiseBuf;
let musicOn = true, sfxOn = true, intense = 0;
try { musicOn = localStorage.getItem('akinci_music') !== '0'; sfxOn = localStorage.getItem('akinci_sfx') !== '0'; } catch (e) { }

export function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = AC.createDynamicsCompressor(); master.threshold.value = -14; master.ratio.value = 4; master.connect(AC.destination);
  musicBus = AC.createGain(); musicBus.gain.value = musicOn ? .55 : 0; musicBus.connect(master);
  sfxBus = AC.createGain(); sfxBus.gain.value = sfxOn ? .9 : 0; sfxBus.connect(master);
  // reverb impulse
  reverb = AC.createConvolver(); const len = AC.sampleRate * 2.2, ir = AC.createBuffer(2, len, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  reverb.buffer = ir; const rv = AC.createGain(); rv.gain.value = .32; reverb.connect(rv); rv.connect(master);
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 1.5, AC.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  startMusic();
}
export function setMusic(on) { musicOn = on; try { localStorage.setItem('akinci_music', on ? '1' : '0'); } catch (e) { } if (musicBus) musicBus.gain.setTargetAtTime(on ? .55 : 0, AC.currentTime, .2); }
export function setSfx(on) { sfxOn = on; try { localStorage.setItem('akinci_sfx', on ? '1' : '0'); } catch (e) { } if (sfxBus) sfxBus.gain.setTargetAtTime(on ? .9 : 0, AC.currentTime, .05); }
export const audioState = () => ({ musicOn, sfxOn });
export function setIntensity(v) { intense = v; }

// ---------------------------------------------------------------- instruments
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function noise(t, dur, type, freq, q, gain, dest, sweepTo) {
  const s = AC.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = .8 + Math.random() * .4;
  const f = AC.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur); f.Q.value = q;
  const g = AC.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
}
function tone(t, dur, type, f0, f1, gain, dest, attack = .003) {
  const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05);
}
function davul(t, v = 1) { tone(t, .45, 'sine', 95, 42, .9 * v, musicBus); noise(t, .12, 'lowpass', 500, .7, .5 * v, musicBus); noise(t, .3, 'lowpass', 180, .5, .35 * v, reverb); }
function tek(t, v = 1) { noise(t, .07, 'bandpass', 2600, 1.8, .55 * v, musicBus); tone(t, .06, 'triangle', 420, 300, .12 * v, musicBus); }
function zil(t, v = 1) { noise(t, .9, 'highpass', 6500, .7, .14 * v, musicBus); noise(t, .9, 'highpass', 6500, .7, .08 * v, reverb); }
function nakkare(t, v = 1) { noise(t, .05, 'bandpass', 1500, 3, .3 * v, musicBus); }
function zurna(t, dur, m, v = 1, slideFrom) {
  const f = mtof(m), end = t + dur;
  const o1 = AC.createOscillator(), o2 = AC.createOscillator(); o1.type = 'sawtooth'; o2.type = 'square';
  if (slideFrom) { o1.frequency.setValueAtTime(mtof(slideFrom), t); o1.frequency.exponentialRampToValueAtTime(f, t + .06); o2.frequency.setValueAtTime(mtof(slideFrom) * 1.002, t); o2.frequency.exponentialRampToValueAtTime(f * 1.002, t + .06); }
  else { o1.frequency.value = f; o2.frequency.value = f * 1.002; }
  const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 5.8; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * .012, t + Math.min(dur, .35));
  lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
  const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1350; bp.Q.value = .9;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3600;
  const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.16 * v, t + .025); g.gain.setValueAtTime(.16 * v, end - .05); g.gain.exponentialRampToValueAtTime(.0005, end + .06);
  const m2 = AC.createGain(); m2.gain.value = .45;
  o1.connect(bp); o2.connect(m2); m2.connect(bp); bp.connect(lp); lp.connect(g); g.connect(musicBus);
  const send = AC.createGain(); send.gain.value = .5; g.connect(send); send.connect(reverb);
  for (const o of [o1, o2, lfo]) { o.start(t); o.stop(end + .1); }
}
function pad(t, dur, notes, v = 1) {
  for (const m of notes) for (const det of [-6, 5]) {
    const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.022 * v, t + .35); g.gain.setValueAtTime(.022 * v, t + dur - .2); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    o.connect(f); f.connect(g); g.connect(musicBus); const s = AC.createGain(); s.gain.value = .6; g.connect(s); s.connect(reverb);
    o.start(t); o.stop(t + dur + .05);
  }
}
function bass(t, dur, m) {
  const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m);
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; f.Q.value = 2;
  const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .02); g.gain.exponentialRampToValueAtTime(.04, t + dur * .6); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + .05);
}

// ---------------------------------------------------------------- composition (Hicaz on D)
const D4 = 62, Eb4 = 63, F4s = 66, G4 = 67, A4 = 69, Bb4 = 70, C5 = 72, D5 = 74, Eb5 = 75;
// [startStep, lenSteps, midi] per bar (16 steps)
const MEL = [
  [[0, 4, D4], [4, 2, Eb4], [6, 2, F4s], [8, 4, G4], [12, 4, A4]],
  [[0, 2, Bb4], [2, 2, A4], [4, 2, G4], [6, 2, F4s], [8, 6, G4]],
  [[0, 4, A4], [4, 2, G4], [6, 2, F4s], [8, 4, Eb4], [12, 4, F4s]],
  [[0, 12, D4]],
  [[0, 2, A4], [2, 2, Bb4], [4, 4, C5], [8, 2, Bb4], [10, 2, A4], [12, 4, G4]],
  [[0, 4, A4], [4, 4, F4s], [8, 2, G4], [10, 2, F4s], [12, 4, Eb4]],
  [[0, 2, D4], [2, 2, Eb4], [4, 2, F4s], [6, 2, G4], [8, 4, A4], [12, 2, G4], [14, 2, F4s]],
  [[0, 4, Eb4], [4, 12, D4]],
  [[0, 4, D5], [4, 2, C5], [6, 2, Bb4], [8, 4, A4], [12, 2, Bb4], [14, 2, C5]],
  [[0, 6, D5], [6, 2, Eb5], [8, 4, D5], [12, 4, C5]],
  [[0, 2, Bb4], [2, 2, C5], [4, 4, D5], [8, 2, C5], [10, 2, Bb4], [12, 4, A4]],
  [[0, 4, G4], [4, 4, A4], [8, 4, Bb4], [12, 4, A4]],
  [[0, 2, A4], [2, 2, Bb4], [4, 2, A4], [6, 2, G4], [8, 4, F4s], [12, 4, G4]],
  [[0, 8, A4], [8, 4, Bb4], [12, 4, A4]],
  [[0, 2, G4], [2, 2, F4s], [4, 4, Eb4], [8, 2, F4s], [10, 2, G4], [12, 2, F4s], [14, 2, Eb4]],
  [[0, 16, D4]]
];
const CH = { D: [50, 54, 57], Cm: [48, 51, 55], Gm: [43, 46, 50] };
const CHORDS = ['D', 'Cm', 'D', 'D', 'Gm', 'D', 'D', 'D', 'Gm', 'Cm', 'Gm', 'Gm', 'D', 'D', 'Cm', 'D'];
const ROOT = { D: 38, Cm: 36, Gm: 43 };
const BPM = 104, STEP = 60 / BPM / 4;
let nextT = 0, step = 0, timer = null;
function startMusic() { nextT = AC.currentTime + .15; step = 0; if (timer) clearInterval(timer); timer = setInterval(sched, 30); }
function sched() {
  if (!AC || AC.state !== 'running') return;
  while (nextT < AC.currentTime + .2) {
    const bar = Math.floor(step / 16) % 16, s = step % 16, t = nextT;
    // drums: düm tek tek düm tek (mehter 4/4)
    if (s === 0 || s === 6 || s === 8) davul(t, s === 0 ? 1 : .8);
    if (s === 4 || s === 10 || s === 12 || s === 14) tek(t, s === 12 ? 1 : .75);
    if (s % 2 === 1 && (intense > 0 || bar >= 8)) nakkare(t, intense > 0 ? .9 : .5);
    if (intense > 0 && (s === 3 || s === 11)) davul(t, .6);
    if (s === 0 && bar % 4 === 0) zil(t);
    if (s === 0) { const c = CHORDS[bar]; pad(t, STEP * 16, CH[c], bar >= 8 ? 1.2 : 1); }
    if (s === 0 || s === 8) bass(t, STEP * 7, ROOT[CHORDS[bar]]);
    let prev = null;
    for (const [st, len, m] of MEL[bar]) { if (st === s) { zurna(t, len * STEP * .96, m, 1, len <= 2 && Math.random() < .25 ? m + 1 : null); } prev = m; }
    nextT += STEP; step++;
  }
}

// ---------------------------------------------------------------- sfx
const last = {};
export function sfx(name, vol = 1) {
  if (!AC || !sfxOn) return; const t = AC.currentTime;
  if (last[name] && t - last[name] < (name === 'coin' ? .045 : .06)) return; last[name] = t;
  const D = sfxBus;
  switch (name) {
    case 'sword': noise(t, .09, 'bandpass', 2800, 2.5, .5 * vol, D); tone(t, .18, 'sine', 1900, 1750, .05 * vol, D); tone(t, .15, 'sine', 2870, 2700, .03 * vol, D); break;
    case 'axe': noise(t, .14, 'bandpass', 900, 1.5, .6 * vol, D); tone(t, .12, 'triangle', 180, 90, .2 * vol, D); break;
    case 'bones': for (let i = 0; i < 3; i++) noise(t + i * .035, .05, 'bandpass', 1400 + i * 500, 4, .45 * vol, D); tone(t, .2, 'sine', 140, 60, .25 * vol, D); break;
    case 'arrow': noise(t, .16, 'bandpass', 3200, 3, .25 * vol, D, 700); break;
    case 'magic': tone(t, .35, 'sine', 900, 220, .12 * vol, D); noise(t, .3, 'bandpass', 1800, 6, .15 * vol, D, 400); break;
    case 'hurt': tone(t, .2, 'sine', 160, 70, .3 * vol, D); noise(t, .08, 'lowpass', 900, .7, .3 * vol, D); break;
    case 'coin': tone(t, .12, 'sine', 1568, 0, .09 * vol, D); tone(t + .05, .2, 'sine', 2093, 0, .08 * vol, D); break;
    case 'pay': tone(t, .06, 'triangle', 880, 0, .06 * vol, D); break;
    case 'buy': [523, 659, 784, 1047].forEach((f, i) => tone(t + i * .06, .2, 'triangle', f, 0, .12 * vol, D)); break;
    case 'build': for (let i = 0; i < 3; i++) { tone(t + i * .12, .08, 'triangle', 240, 140, .25 * vol, D); noise(t + i * .12, .05, 'bandpass', 1200, 2, .3 * vol, D); } break;
    case 'horn': for (const [f, dt] of [[293.7, 0], [440, .22]]) for (const det of [0, 4]) { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(400, t + dt); fl.frequency.exponentialRampToValueAtTime(2200, t + dt + .15); const g = AC.createGain(); g.gain.setValueAtTime(.0001, t + dt); g.gain.exponentialRampToValueAtTime(.09, t + dt + .05); g.gain.exponentialRampToValueAtTime(.0005, t + dt + .55); o.connect(fl); fl.connect(g); g.connect(D); const r = AC.createGain(); r.gain.value = .5; g.connect(r); r.connect(reverb); o.start(t + dt); o.stop(t + dt + .6); } break;
    case 'horde': for (const det of [0, -8, 7]) { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(73, t); o.frequency.linearRampToValueAtTime(65, t + 1.2); o.detune.value = det; const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 520; const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.14, t + .15); g.gain.exponentialRampToValueAtTime(.0005, t + 1.4); o.connect(fl); fl.connect(g); g.connect(D); g.connect(reverb); o.start(t); o.stop(t + 1.5); } davul(t); davul(t + .35); break;
    case 'boom': tone(t, .5, 'sine', 120, 35, .6 * vol, D); noise(t, .5, 'lowpass', 700, .5, .5 * vol, D); noise(t, .8, 'lowpass', 300, .5, .3 * vol, reverb); break;
    case 'win': [62, 66, 69, 74, 78, 81].forEach((m, i) => tone(t + i * .12, .5, 'triangle', mtof(m), 0, .14, D)); break;
    case 'lose': [69, 66, 63, 62].forEach((m, i) => tone(t + i * .25, .6, 'sawtooth', mtof(m), 0, .06, D)); break;
    case 'spawn': noise(t, .4, 'lowpass', 400, 1, .2 * vol, D, 120); break;
  }
}
