/* Akıncı: Beş Krallık — v2.0  (mobile medieval RTS: hero + pads control) */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { A, loadAll, cloneChar, clipsFor, instGeo, cloneModel } from './assets.js';
import { initAudio, sfx, setMusic, setSfx, audioState, setIntensity, renderMusic } from './audio.js';

const T3 = THREE, PI = Math.PI;
// ================================================================ MAP (logic in px; 3D X=(x-MC)*K, Z=(y-MC)*K)
const K = 0.1, MW = 2000, MC = 1000, R_PLAY = 975, KR = 650;
const X3 = x => (x - MC) * K, Z3 = y => (y - MC) * K;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
function clampMap(o) { const dx = o.x - MC, dy = o.y - MC, d = Math.hypot(dx, dy), m = R_PLAY - (o.r || 8); if (d > m) { o.x = MC + dx / d * m; o.y = MC + dy / d * m; } }

// ================================================================ CIVILISATIONS
const CIVS = [
  { id: 'osmanli', name: 'Osmanlı', full: 'Osmanlı Devleti', color: 0xd4373f, css: '#d4373f', bld: 'red', hero: 'heroT', uniq: 'atliokcu', uname: 'SİPAHİ', bonus: 'Sipahi: güçlü atlı okçu · Atlı birlikler %20 ucuz', mod: { horseCost: .8 } },
  { id: 'roma', name: 'Roma', full: 'Roma İmparatorluğu', color: 0x9b59d6, css: '#9b59d6', bld: 'yellow', hero: 'heroK', uniq: 'piyade', uname: 'LEJYONER', bonus: 'Lejyoner: zırhlı piyade · Binalar %20 daha az taş', mod: { bldCost: .8 } },
  { id: 'germen', name: 'Germen', full: 'Germen Boyları', color: 0x6b7280, css: '#7b8494', bld: 'blue', tint: [.72, .74, .78], hero: 'heroK', uniq: 'baltaci', uname: 'BERSERKER', bonus: 'Berserker: öfkeli baltacı · Piyadeler %20 ucuz', mod: { footCost: .8 } },
  { id: 'ingiliz', name: 'İngiliz', full: 'İngiliz Krallığı', color: 0x2f7ae0, css: '#2f7ae0', bld: 'blue', hero: 'heroK', uniq: 'okcu', uname: 'UZUN YAYCI', bonus: 'Uzun yaycı: çok uzak menzil · Kuleler %40 güçlü', mod: { towerDmg: 1.4 } },
  { id: 'arap', name: 'Arap', full: 'Arap Emirliği', color: 0x22a85a, css: '#22a85a', bld: 'green', hero: 'heroT', uniq: 'suvari', uname: 'BEDEVİ', bonus: 'Bedevi: hızlı süvari · Yiyecek toplama %25 hızlı', mod: { foodRate: 1.25 } }
];
const UT = {
  koylu: { name: 'Köylü', model: 'villager', h: 2.3, hp: 30, dmg: 3, range: 12, cd: 1.1, spd: 58, r: 8, pop: 1, cost: { f: 50 }, atk: '1H_Melee_Attack_Chop', civil: true },
  piyade: { name: 'Piyade', model: 'knight', h: 2.5, hp: 70, dmg: 10, range: 14, cd: .9, spd: 58, r: 9, pop: 1, cost: { f: 40, g: 10 }, atk: '1H_Melee_Attack_Chop', snd: 'sword', foot: true },
  baltaci: { name: 'Baltacı', model: 'barbarian', h: 2.6, hp: 120, dmg: 18, range: 16, cd: 1.3, spd: 54, r: 10, pop: 1, cost: { f: 60, g: 25 }, atk: '2H_Melee_Attack_Chop', idle: '2H_Melee_Idle', cleave: 22, snd: 'axe', foot: true },
  okcu: { name: 'Okçu', model: 'rogue', h: 2.4, hp: 40, dmg: 8, range: 150, cd: 1.2, spd: 58, r: 8, pop: 1, cost: { f: 30, g: 25 }, atk: '2H_Ranged_Shoot', ranged: true, foot: true },
  suvari: { name: 'Süvari', model: 'knight', horse: true, h: 2.5, hp: 125, dmg: 14, range: 18, cd: 1.0, spd: 112, r: 13, pop: 2, cost: { f: 60, g: 45 }, atk: '1H_Melee_Attack_Chop', snd: 'sword' },
  atliokcu: { name: 'Atlı Okçu', model: 'rogue', horse: true, h: 2.4, hp: 85, dmg: 9, range: 140, cd: 1.1, spd: 118, r: 13, pop: 2, cost: { f: 50, g: 55 }, atk: '2H_Ranged_Shoot', ranged: true },
  hero: { name: 'Paşa', horse: true, hp: 260, dmg: 16, range: 165, cd: .5, spd: 235, r: 14, pop: 0 }
};
const UNIQ = { // applied to the civ's unique role
  osmanli: { hp: 1.3, dmg: 1.35, range: 1.1 }, roma: { hp: 1.55, dmg: 1.15 }, germen: { hp: 1.2, dmg: 1.45, spd: 1.15 },
  ingiliz: { range: 1.4, dmg: 1.35 }, arap: { spd: 1.25, hp: 1.15, dmg: 1.1 }
};
const BT = {
  castle: { name: 'Kale', hp: 2400, r: 46, w: 9, model: 'castle', range: 185, dmg: 9, cd: 1.2 },
  house: { name: 'Ev', hp: 300, r: 22, w: 4.6, model: 'home_A', cost: { s: 40 } },
  farm: { name: 'Tarla', hp: 250, r: 26, w: 6.4, model: 'grain', walk: true, cost: { s: 30 } },
  mine: { name: 'Altın Madeni', hp: 500, r: 28, w: 6.0, model: 'mine' },
  quarry: { name: 'Taş Ocağı', hp: 500, r: 28, w: 6.0 },
  barracks: { name: 'Kışla', hp: 600, r: 30, w: 6.2, model: 'barracks', cost: { s: 100 } },
  archery: { name: 'Okçu Meydanı', hp: 550, r: 30, w: 6.2, model: 'archeryrange', cost: { s: 100, g: 20 } },
  stable: { name: 'Ahır', hp: 650, r: 32, w: 6.6, model: 'tavern', cost: { s: 120, g: 40 } },
  tower: { name: 'Kule', hp: 600, r: 20, w: 4.4, model: 'tower_A', range: 195, dmg: 10, cd: .9, cost: { s: 80, g: 20 } }
};
// kingdom layout in local (f = toward map centre, s = side) px
const SLOTS = {
  castle: [0, 0], mine: [-40, -175], quarry: [-40, 175],
  farm: [[-185, -75], [-185, 75], [-252, -150], [-252, 150]],
  house: [[-110, -255], [-110, 255], [5, -280], [5, 280], [-195, -230], [-195, 230]],
  barracks: [70, -175], archery: [70, 175], stable: [170, -215], tower: [[262, -218], [262, 218]],
  windmill: [-268, 0], rally: [178, 0]
};

// ================================================================ RENDERER
const canvas = document.getElementById('c');
const renderer = new T3.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T3.PCFSoftShadowMap;
renderer.outputColorSpace = T3.SRGBColorSpace; renderer.toneMapping = T3.NeutralToneMapping; renderer.toneMappingExposure = .95;
const scene = new T3.Scene();
const SKY = 0xa9bccb; scene.background = new T3.Color(SKY); scene.fog = new T3.Fog(SKY, 90, 200);
scene.environment = new T3.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .3;
const camera = new T3.PerspectiveCamera(38, 1, 1, 500);
const CAMDIR = new T3.Vector3(0, .8, .6).normalize(); let camDist = 70;
scene.add(new T3.HemisphereLight(0xc9d6e2, 0x3e4630, .62));
const sun = new T3.DirectionalLight(0xffe2bc, 1.65); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 44, bottom: -44, near: 1, far: 170 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = .04; scene.add(sun, sun.target);
const SUNOFF = new T3.Vector3(-34, 48, 14);
const DBG = { zoom: 1 };
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  const tan = Math.tan(T3.MathUtils.degToRad(camera.fov / 2));
  camDist = Math.max(30 / (2 * tan * camera.aspect), 50);
  scene.fog.near = camDist * 1.3; scene.fog.far = camDist * 2.9; camera.far = camDist * 3.4; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ================================================================ POOLS & MERGED PART GEOMETRY
const WHITE = new T3.Color(1, 1, 1);
class Pool {
  constructor(geo, mat, cap, shadow = false) {
    this.m = new T3.InstancedMesh(geo, mat, cap); this.m.instanceMatrix.setUsage(T3.DynamicDrawUsage);
    this.m.castShadow = shadow; this.m.frustumCulled = false; this.m.setColorAt(0, WHITE); this.m.count = 0; this.cap = cap; this.n = 0; scene.add(this.m);
  }
  begin() { this.n = 0; }
  add(m, c) { if (this.n >= this.cap) return; this.m.setMatrixAt(this.n, m); this.m.setColorAt(this.n, c || WHITE); this.n++; }
  end() { this.m.count = this.n; this.m.instanceMatrix.needsUpdate = true; this.m.instanceColor.needsUpdate = true; }
}
function mergeColored(group) {
  group.updateMatrixWorld(true); const P = [], N = [], C = [];
  group.traverse(o => {
    if (!o.isMesh) return; const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    const pa = g.attributes.position.array, na = g.attributes.normal.array, c = o.material.color;
    for (let i = 0; i < pa.length; i++) { P.push(pa[i]); N.push(na[i]); } for (let i = 0; i < pa.length / 3; i++) C.push(c.r, c.g, c.b);
  });
  const out = new T3.BufferGeometry(); out.setAttribute('position', new T3.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new T3.Float32BufferAttribute(N, 3)); out.setAttribute('color', new T3.Float32BufferAttribute(C, 3)); return out;
}
const cm = (c) => new T3.MeshStandardMaterial({ color: c });
function addM(g, geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) { const m = new T3.Mesh(geo, cm(color)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); g.add(m); return m; }
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; return t;
}
function centered(info, size, axisToZ) {
  const b = info.box, g = info.geo.clone();
  g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -(b.min.z + b.max.z) / 2);
  const ext = [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z], mx_ = Math.max(...ext);
  if (axisToZ) { const ax = ext.indexOf(mx_); if (ax === 0) g.rotateY(PI / 2); if (ax === 1) g.rotateX(PI / 2); }
  g.scale(size / mx_, size / mx_, size / mx_); return g;
}
// --- horse parts (each built around its own pivot, front = +Z)
const COAT = 0x8a5532, DARKH = 0x2e1d12;
function horseGeos() {
  const C_ = { coat: COAT, dark: DARKH, hoof: 0x252020, white: 0xf3ecdf, gold: 0xe3a62c, leather: 0x4a2c18 };
  const body = new T3.Group();
  addM(body, new T3.CapsuleGeometry(.52, 1.35, 5, 12), C_.coat, 0, 0, 0, PI / 2);
  addM(body, new T3.SphereGeometry(.6, 12, 9), C_.coat, 0, .04, .72); addM(body, new T3.SphereGeometry(.62, 12, 9), C_.coat, 0, .06, -.72);
  addM(body, new T3.BoxGeometry(.66, .16, .8), C_.leather, 0, .6, -.05); addM(body, new T3.BoxGeometry(.3, .26, .14), C_.leather, 0, .7, .32); addM(body, new T3.BoxGeometry(.5, .2, .12), C_.leather, 0, .68, -.45);
  for (const sx of [-1, 1]) { addM(body, new T3.BoxGeometry(.04, .55, .04), C_.leather, sx * .5, .2, .05); addM(body, new T3.BoxGeometry(.06, .07, 1.27), C_.gold, sx * .61, -.08, -.05); }
  const cloth = new T3.Group();
  addM(cloth, new T3.BoxGeometry(1.18, .07, 1.25), 0xffffff, 0, .5, -.05);
  for (const sx of [-1, 1]) addM(cloth, new T3.BoxGeometry(.05, .62, 1.25), 0xffffff, sx * .6, .22, -.05);
  const neck = new T3.Group();
  addM(neck, new T3.CylinderGeometry(.24, .4, 1.25, 10), C_.coat, 0, .55, 0); addM(neck, new T3.BoxGeometry(.12, 1.15, .26), C_.dark, 0, .62, -.24);
  const head = new T3.Group(); head.position.set(0, 1.2, .05); head.rotation.x = 1.0; neck.add(head);
  addM(head, new T3.BoxGeometry(.4, .44, .7), C_.coat, 0, 0, .2); addM(head, new T3.BoxGeometry(.34, .34, .42), 0x6e4227, 0, -.06, .68);
  addM(head, new T3.BoxGeometry(.3, .04, .3), C_.white, 0, .2, .35);
  for (const sx of [-1, 1]) { addM(head, new T3.ConeGeometry(.08, .26, 5), C_.coat, sx * .12, .3, -.05, -.2); addM(head, new T3.SphereGeometry(.05, 6, 5), 0x111111, sx * .2, .07, .25); addM(head, new T3.BoxGeometry(.05, .05, .5), C_.gold, sx * .21, .05, .3); }
  addM(head, new T3.BoxGeometry(.44, .05, .05), C_.gold, 0, .05, .5);
  const tail = new T3.Group(); addM(tail, new T3.CylinderGeometry(.13, .04, 1.1, 7), C_.dark, 0, -.5, -.18, .45);
  const up = new T3.Group(); addM(up, new T3.CylinderGeometry(.17, .12, .72, 7), C_.coat, 0, -.36, 0);
  const low = new T3.Group(); addM(low, new T3.CylinderGeometry(.1, .09, .55, 7), C_.coat, 0, -.27, 0); addM(low, new T3.CylinderGeometry(.11, .1, .1, 7), C_.white, 0, -.5, 0); addM(low, new T3.CylinderGeometry(.12, .14, .14, 7), C_.hoof, 0, -.6, .02);
  return { body: mergeColored(body), cloth: mergeColored(cloth), neck: mergeColored(neck), tail: mergeColored(tail), up: mergeColored(up), low: mergeColored(low) };
}
let P = null;
function makePools() {
  const coin = instGeo('dungeon', 'coin');
  const coinMat = coin.mat.clone(); coinMat.metalness = .55; coinMat.roughness = .3; coinMat.emissive = new T3.Color(0x3a2600); coinMat.emissiveIntensity = .5;
  const arrow = instGeo('weapons', 'arrow');
  const hv = horseGeos(), hm = new T3.MeshStandardMaterial({ vertexColors: true, roughness: .75 });
  const barGeo = new T3.PlaneGeometry(1, .22);
  const disc = new T3.RingGeometry(.55, .95, 24); disc.rotateX(-PI / 2);
  P = {
    coin: new Pool(centered(coin, .8), coinMat, 400, true),
    carry: new Pool(new T3.BoxGeometry(.42, .42, .42), new T3.MeshStandardMaterial({ roughness: .7 }), 260),
    arrow: new Pool(centered(arrow, 1.4, true), arrow.mat, 300),
    glow: new Pool(new T3.PlaneGeometry(1, 1), new T3.MeshBasicMaterial({ map: glowTex(), transparent: true, blending: T3.AdditiveBlending, depthWrite: false }), 300),
    spark: new Pool(new T3.BoxGeometry(.16, .16, .16), new T3.MeshBasicMaterial({ color: 0xffffff }), 600),
    smoke: new Pool(new T3.IcosahedronGeometry(.6, 1), new T3.MeshLambertMaterial({ color: 0xe8e8e8, transparent: true, opacity: .5, depthWrite: false }), 360),
    disc: new Pool(disc, new T3.MeshBasicMaterial({ transparent: true, opacity: .75, depthWrite: false }), 400),
    hBody: new Pool(hv.body, hm, 90, true), hCloth: new Pool(hv.cloth, new T3.MeshStandardMaterial({ roughness: .8 }), 90, true),
    hNeck: new Pool(hv.neck, hm, 90, true), hTail: new Pool(hv.tail, hm, 90, true), hUp: new Pool(hv.up, hm, 360, true), hLow: new Pool(hv.low, hm, 360, true),
    barBg: new Pool(barGeo, new T3.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .55, depthTest: false, depthWrite: false }), 300),
    barFg: new Pool(barGeo, new T3.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false }), 300)
  };
  P.disc.m.renderOrder = 1; P.glow.m.renderOrder = 5; P.barBg.m.renderOrder = 10; P.barFg.m.renderOrder = 11;
}

// ================================================================ WORLD
const HEX = 3.0, HW = 2 * HEX, HZ = 2.3 * HEX * .75;
const KPOS = []; for (let i = 0; i < 5; i++) { const a = i * 2 * PI / 5; KPOS.push({ x: MC + Math.sin(a) * KR, y: MC + Math.cos(a) * KR, a }); }
function segDist(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy))); return Math.hypot(px - ax - vx * t, py - ay - vy * t); }
function buildWorld() {
  seed = 4321;
  const tile = instGeo('world', 'hex_grass');
  const cells = [], deco = {}; const addDeco = (k, x, z, s, ry, y = 0) => { (deco[k] = deco[k] || []).push([x, y, z, s, ry]); };
  const R0 = (MW / 2 + 260) * K;
  for (let row = -Math.ceil(R0 / HZ); row <= Math.ceil(R0 / HZ); row++) for (let col = -Math.ceil(R0 / HW) - 1; col <= Math.ceil(R0 / HW) + 1; col++) {
    const X = col * HW + (row & 1 ? HW / 2 : 0), Z = row * HZ, px = X / K + MC, py = Z / K + MC;
    const dc = Math.hypot(px - MC, py - MC); if (dc > MW / 2 + 260) continue;
    const ang = Math.atan2(px - MC, py - MC); let near = 1e9; for (const k of KPOS) near = Math.min(near, Math.hypot(px - k.x, py - k.y));
    const c = new T3.Color(); const n_ = .5 + .5 * Math.sin(px * .006 + Math.sin(py * .004) * 2) * Math.cos(py * .005); const v = .78 + rnd() * .12 + n_ * .14; c.setRGB(v * .5, v * .66, v * .36);
    // roads: castle → centre, ring road
    let road = 1e9; for (const k of KPOS) road = Math.min(road, segDist(px, py, k.x, k.y, MC, MC)); road = Math.min(road, Math.abs(dc - 470));
    if (road < 26 && near > 60) c.lerp(new T3.Color(.55, .44, .3), .8);
    let lift = 0; const rim = dc - (R_PLAY + 10);
    if (rim > 0) lift = Math.min(1.4, rim / 120) * (.3 + rnd() * .6);
    cells.push({ X, Z, lift, c });
    const ry = Math.floor(rnd() * 6) * PI / 3, r = rnd();
    if (rim > 30) addDeco(rim > 150 ? (r < .5 ? 'mountain_A' : r < .8 ? 'mountain_B' : 'mountain_C') : (r < .4 ? 'trees_A_large' : r < .7 ? 'trees_B_large' : r < .85 ? 'hills_A' : 'hills_B'), X, Z, HEX, ry, lift);
    else if (near > 380 && dc > 580 && road > 40) { // forest wedges between kingdoms
      if (r < .75) addDeco(r < .3 ? 'trees_A_large' : r < .5 ? 'trees_B_large' : r < .62 ? 'trees_A_medium' : 'trees_B_medium', X, Z, HEX, ry, 0);
    } else if (near > 330 && road > 40 && r < .05) addDeco(['rock_A', 'rock_B', 'rock_C', 'rock_D', 'rock_E'][Math.floor(rnd() * 5)], X + (rnd() - .5) * 2, Z + (rnd() - .5) * 2, HEX * .8, rnd() * PI * 2);
    else if (near > 330 && road > 40 && r < .08) addDeco(r < .065 ? 'tree_A' : 'tree_B', X + (rnd() - .5) * 2, Z + (rnd() - .5) * 2, HEX * .9, rnd() * PI * 2);
  }
  const im = new T3.InstancedMesh(tile.geo, tile.mat.clone(), cells.length); im.receiveShadow = true;
  const m4 = new T3.Matrix4(), qq = new T3.Quaternion(), ss = new T3.Vector3(), pp = new T3.Vector3();
  cells.forEach((c, i) => { m4.compose(pp.set(c.X, c.lift, c.Z), qq.identity(), ss.set(HEX, HEX, HEX)); im.setMatrixAt(i, m4); im.setColorAt(i, c.c); });
  scene.add(im);
  for (const [k, list] of Object.entries(deco)) {
    const g = instGeo('world', k); const dm = new T3.InstancedMesh(g.geo, g.mat, list.length); dm.castShadow = !k.startsWith('mountain'); dm.receiveShadow = true;
    list.forEach(([x, y, z, s_, ry], i) => { qq.setFromAxisAngle(YAX, ry); m4.compose(pp.set(x, y, z), qq, ss.set(s_, s_ * (.9 + rnd() * .25), s_)); dm.setMatrixAt(i, m4); });
    scene.add(dm);
  }
  // centre monument
  const cen = cloneModel('world', 'destroyed', 7); cen.position.set(0, 0, 0); scene.add(cen);
}

// ================================================================ HELPERS: kingdom geometry
function kLocal(k, f, s) { return { x: k.x + k.fx * f + k.sx * s, y: k.y + k.fy * f + k.sy * s }; }
const costOf = (k, base, kind) => { const c = {}; for (const r in base) { let v = base[r]; if (kind === 'bld' && r === 's' && k.civ.mod.bldCost) v *= k.civ.mod.bldCost; if (kind === 'horse' && k.civ.mod.horseCost) v *= k.civ.mod.horseCost; if (kind === 'foot' && k.civ.mod.footCost) v *= k.civ.mod.footCost; c[r] = Math.round(v); } return c; };
const canAfford = (k, c) => (k.res.f >= (c.f || 0)) && (k.res.s >= (c.s || 0)) && (k.res.g >= (c.g || 0));
const spend = (k, c) => { for (const r in c) k.res[r] -= c[r]; };
function unitCost(k, role) { const T = UT[role]; return costOf(k, T.cost, T.horse ? 'horse' : (T.foot && (role === 'piyade' || role === 'baltaci') ? 'foot' : '')); }

// ================================================================ STATE
let G = null, best = 1, running = false, chosenCiv = 0;
try { best = Math.max(1, parseInt(localStorage.getItem('akinci2_lv')) || 1); chosenCiv = Math.max(0, Math.min(4, parseInt(localStorage.getItem('akinci2_civ')) || 0)); } catch (e) { }
const LOWER = { id: 'lower', fn: n => /hips|leg|foot|toe|knee|heel|control|IK-|^root$/.test(n) };
const UPPER = { id: 'upper', fn: n => !/hips|leg|foot|toe|knee|heel|control|IK-|^root$/.test(n) };

function makeUnit(k, role, x, y, state) {
  const base = UT[role], uq = role === k.civ.uniq && role !== 'hero' ? UNIQ[k.civ.id] : null;
  const T = Object.assign({}, base); if (uq) { for (const s of ['hp', 'dmg', 'range', 'spd']) if (uq[s]) T[s] = base[s] * uq[s]; T.name = k.civ.uname; T.uniq = true; }
  const up = role === 'koylu' || role === 'hero' ? 1 : k.upg;
  const u = { kind: 'u', k, role, T, x, y, hp: T.hp * up, maxhp: T.hp * up, dmg: T.dmg * up * (role === 'hero' ? 1 : 1), range: T.range, cdMax: T.cd, cd: Math.random() * T.cd, spd: T.spd * (.93 + Math.random() * .14), r: T.r, state, rot: Math.atan2(k.fx, k.fy), hit: 0, atkT: 0, moving: false, dying: 0, pending: null, tgt: null, tgtT: 0, vis: true, hph: Math.random() * 6, hsp: 0 };
  const model = role === 'hero' ? k.civ.hero : T.model;
  u.obj = cloneChar(model, role === 'hero' ? 2.45 : T.h);
  const tint = new T3.Color(1, 1, 1).lerp(new T3.Color(k.civ.color), role === 'koylu' ? .12 : .22);
  for (const m of unitMats(u)) if (m.color) m.color.copy(tint);
  scene.add(u.obj);
  u.mixer = new T3.AnimationMixer(u.obj); u.actions = {}; u.cur = null; u.curName = '';
  if (T.horse) {
    u.obj.matrixAutoUpdate = false;
    const lower = clipsFor(model, LOWER), upper = clipsFor(model, UPPER);
    u.mixer.clipAction(lower['Sit_Chair_Pose']).play(); u.clips = upper;
    if (role === 'hero') attachHeroGear(u, k);
  } else u.clips = clipsFor(model);
  play(u, idleAnim(u));
  k.units.push(u); G.units.push(u); return u;
}
function attachHeroGear(u, k) {
  const s = u.obj.scale.x;
  const lh = u.obj.getObjectByName('handslotl'); if (lh) { const bow = buildBow(); bow.scale.setScalar(1 / s); bow.rotation.set(0, PI / 2, 0); lh.add(bow); }
  if (k.civ.hero === 'heroT') { const hd = u.obj.getObjectByName('head'); if (hd) { const tb = buildTurban(k.civ.id === 'arap' ? 0x2e2e2e : 0xb3262e); tb.scale.setScalar(1.2 / s); tb.position.set(0, .74 / s, 0); hd.add(tb); } }
  const ring = new T3.Mesh(new T3.RingGeometry(1.7, 2.05, 48), new T3.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: .8, depthWrite: false }));
  ring.rotation.x = -PI / 2; ring.position.y = .12; scene.add(ring); u.ring = ring;
}
function buildBow() {
  const g = new T3.Group(); const wood = new T3.MeshStandardMaterial({ color: 0x5a3416 }), gold = new T3.MeshStandardMaterial({ color: 0xe3a62c, metalness: .6, roughness: .35 });
  const arc = new T3.Mesh(new T3.TorusGeometry(.62, .045, 6, 22, PI * .9), wood); arc.rotation.z = PI / 2 - PI * .45; g.add(arc);
  for (const a of [PI / 2 - PI * .45, PI / 2 + PI * .45]) { const tip = new T3.Mesh(new T3.SphereGeometry(.06, 6, 5), gold); tip.position.set(Math.cos(a) * .62, Math.sin(a) * .62, 0); g.add(tip); }
  const str = new T3.Mesh(new T3.CylinderGeometry(.01, .01, 1.22, 4), new T3.MeshStandardMaterial({ color: 0xffffff })); str.position.x = .1; g.add(str);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
function buildTurban(plume) {
  const g = new T3.Group(); const sm = (c, o) => new T3.MeshStandardMaterial(Object.assign({ color: c, roughness: .75 }, o || {}));
  const m = new T3.Mesh(new T3.SphereGeometry(.42, 16, 12), sm(0xf7f3ea)); m.scale.set(1, .72, 1); g.add(m);
  const band = new T3.Mesh(new T3.TorusGeometry(.39, .07, 8, 20), sm(0xe3a62c, { metalness: .5, roughness: .35 })); band.rotation.x = PI / 2; band.position.y = -.08; g.add(band);
  const pl = new T3.Mesh(new T3.ConeGeometry(.07, .55, 6), sm(plume)); pl.position.set(0, .4, .14); pl.rotation.x = -.25; g.add(pl);
  const jw = new T3.Mesh(new T3.SphereGeometry(.08, 8, 6), sm(0x2fc7bd, { metalness: .3, roughness: .2 })); jw.position.set(0, .12, .37); g.add(jw);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
const idleAnim = u => u.T.horse ? 'Idle' : (u.T.idle || 'Idle');
const runAnim = u => u.T.horse ? 'Idle' : (u.role === 'koylu' && u.carry ? 'Walking_B' : 'Running_A');
function play(u, name, once = false, ts = 1, fade = .15) {
  if (!once && u.curName === name) return 0;
  const clip = u.clips[name]; if (!clip) return 0;
  let a = u.actions[name]; if (!a) { a = u.mixer.clipAction(clip); u.actions[name] = a; }
  a.reset(); a.setLoop(once ? T3.LoopOnce : T3.LoopRepeat, Infinity); a.clampWhenFinished = once; a.timeScale = ts; a.play();
  if (u.cur && u.cur !== a) { a.fadeIn(fade); u.cur.fadeOut(fade); }
  u.cur = a; u.curName = name; return clip.duration / ts;
}
function unitMats(u) { if (!u._mats) { const b = u.obj.userData.body.material; u._mats = Array.isArray(b) ? b : [b]; } return u._mats; }
function setFlash(mats, v) { for (const m of mats) if (m.emissive) m.emissive.setRGB(v, v * .95, v * .9); }

function addBld(k, type, x, y, instant = true) {
  const B = BT[type];
  const o = { kind: 'b', k, type, x, y, r: B.r, hp: B.hp, maxhp: B.hp, dmg: B.dmg ? B.dmg * (type === 'tower' && k.civ.mod.towerDmg ? k.civ.mod.towerDmg : 1) : 0, range: B.range || 0, cdMax: B.cd || 1, cd: 1, hit: 0, buildT: instant ? 0 : 3, walk: !!B.walk, workers: 0 };
  o.obj = new T3.Group(); o.obj.position.set(X3(x), 0, Z3(y)); o.obj.rotation.y = Math.atan2(k.fx, k.fy); scene.add(o.obj);
  if (!instant) { const sc_ = cloneModel('world', 'scaffold', B.w * .8); o.obj.add(sc_); o.scaf = sc_; } else finishBld(o);
  k.blds.push(o); G.blds.push(o); return o;
}
function finishBld(o) {
  const B = BT[o.type], k = o.k;
  if (o.scaf) { o.obj.remove(o.scaf); o.scaf = null; }
  let m;
  if (o.type === 'quarry') {
    m = new T3.Group(); const a = cloneModel('world', 'mountain_A_rock', 5.2); a.position.set(-.6, 0, -1.2); m.add(a);
    const b = cloneModel('world', 'resource_stone', 2.4); b.position.set(1.4, 0, 1.6); m.add(b); const c = cloneModel('world', 'rock_B', 1.8); c.position.set(-1.8, 0, 1.4); m.add(c);
  } else if (o.type === 'farm') m = cloneModel('world', 'grain', B.w);
  else m = cloneModel('world', (o.type === 'house' && Math.random() < .5 ? 'home_B' : B.model) + '_' + k.civ.bld, B.w);
  if (o.type === 'castle') m.scale.y *= .8;
  o.obj.add(m);
  o.mats = []; m.traverse(c => { if (c.isMesh) { c.material = c.material.clone(); if (k.civ.tint && o.type !== 'farm' && o.type !== 'quarry') c.material.color.setRGB(...k.civ.tint); o.mats.push(c.material); if (o.type === 'farm') c.castShadow = false; } });
  if (o.type === 'castle' || o.type === 'tower') { const f = cloneModel('dungeon', 'banner_' + ({ red: 'red', yellow: 'yellow', blue: 'blue', green: 'green' })[k.civ.bld], o.type === 'castle' ? 2.2 : 1.4); f.position.set(0, 0, B.w * .48); o.obj.add(f); }
}
function makeKingdom(i, civIdx, isPlayer) {
  const pos = KPOS[i]; const civ = CIVS[civIdx];
  const fx = (MC - pos.x) / KR, fy = (MC - pos.y) / KR; // toward centre
  const k = { i, civ, isPlayer, alive: true, x: pos.x, y: pos.y, fx, fy, sx: -fy, sy: fx, res: { f: 200, s: 150, g: 60 }, units: [], blds: [], upg: 1, upgLv: 0, houses: 0, aiT: 1 + Math.random(), attackT: 0, waves: 0, mult: 1, power: 0 };
  if (!isPlayer) { k.mult = .85 + .15 * G.level; k.res.f += 40 * (G.level - 1); }
  const L = (f, s) => kLocal(k, f, s);
  let p = L(...SLOTS.castle); k.castle = addBld(k, 'castle', p.x, p.y);
  p = L(...SLOTS.mine); k.mine = addBld(k, 'mine', p.x, p.y);
  p = L(...SLOTS.quarry); k.quarry = addBld(k, 'quarry', p.x, p.y);
  p = L(...SLOTS.farm[0]); k.farms = [addBld(k, 'farm', p.x, p.y)]; k.farmSlot = 1;
  p = L(...SLOTS.windmill); const wm = cloneModel('world', 'windmill_' + civ.bld, 5); wm.position.set(X3(p.x), 0, Z3(p.y)); wm.rotation.y = Math.atan2(fx, fy) + PI; scene.add(wm); k.deco = [wm];
  if (civ.tint) wm.traverse(c => { if (c.isMesh) { c.material = c.material.clone(); c.material.color.setRGB(...civ.tint); } });
  k.houseSlot = 0; k.towerSlot = 0;
  const cp = k.castle;
  for (const job of ['food', 'gold', 'stone']) { const v = makeUnit(k, 'koylu', cp.x + (Math.random() - .5) * 40, cp.y + (Math.random() - .5) * 40, 'work'); v.job = job; v.vs = 'toNode'; }
  for (let j = 0; j < 2; j++) makeUnit(k, 'piyade', L(SLOTS.rally[0], (j - .5) * 24).x, L(SLOTS.rally[0], (j - .5) * 24).y, 'rally');
  return k;
}
function popOf(k) { let n = 0; for (const u of k.units) if (u.hp > 0 && !u.dying && u.role !== 'hero') n += u.T.pop; return n; }
function popCap(k) { return Math.min(60, 10 + 6 * k.blds.filter(b => b.type === 'house' && !b.buildT && b.hp > 0).length); }
const farmCap = k => k.blds.filter(b => b.type === 'farm' && b.hp > 0).length * 3;
const jobCount = (k, j) => k.units.filter(u => u.role === 'koylu' && u.hp > 0 && !u.dying && u.job === j).length;
const armyOf = k => k.units.filter(u => u.role !== 'koylu' && u.role !== 'hero' && u.hp > 0 && !u.dying);
const hasBld = (k, t) => k.blds.some(b => b.type === t && b.hp > 0 && !b.buildT);

// ================================================================ PADS (player)
function padsFor(k) {
  const L = (f, s) => kLocal(k, f, s); const list = [];
  const add = (o) => { const p = L(o.f, o.s); o.x = p.x; o.y = p.y; o.w = o.w || 64; o.h = o.h || 56; o.paid = { f: 0, s: 0, g: 0 }; list.push(o); return o; };
  const unitPadPos = (sl, i) => [sl[0] + (i ? 32 : -30), sl[1] - Math.sign(sl[1]) * 62];
  add({ id: 'v_gold', f: SLOTS.mine[0], s: SLOTS.mine[1] + 60, label: 'ALTINCI', icon: 'koylu_g', unit: 'koylu', job: 'gold' });
  add({ id: 'v_stone', f: SLOTS.quarry[0], s: SLOTS.quarry[1] - 60, label: 'TAŞÇI', icon: 'koylu_s', unit: 'koylu', job: 'stone' });
  add({ id: 'v_food', f: -100, s: 42, label: 'ÇİFTÇİ', icon: 'koylu_f', unit: 'koylu', job: 'food' });
  add({ id: 'upg', f: -100, s: -42, label: 'TALİM', icon: 'upg', upg: true });
  SLOTS.farm.forEach((sl, i) => { if (i > 0) add({ id: 'farm' + i, f: sl[0], s: sl[1], label: 'TARLA', icon: 'tarla', build: 'farm', w: 60 }); });
  SLOTS.house.forEach((sl, i) => add({ id: 'house' + i, f: sl[0], s: sl[1], label: 'EV', icon: 'ev', build: 'house', w: 50, h: 48 }));
  add({ id: 'barracks', f: SLOTS.barracks[0], s: SLOTS.barracks[1], label: 'KIŞLA', icon: 'kisla', build: 'barracks' });
  add({ id: 'archery', f: SLOTS.archery[0], s: SLOTS.archery[1], label: 'OKÇU MEYD.', icon: 'okcu', build: 'archery' });
  add({ id: 'stable', f: SLOTS.stable[0], s: SLOTS.stable[1], label: 'AHIR', icon: 'ahir', build: 'stable' });
  SLOTS.tower.forEach((sl, i) => add({ id: 'tower' + i, f: sl[0], s: sl[1], label: 'KULE', icon: 'kule', build: 'tower' }));
  let q = unitPadPos(SLOTS.barracks, 0); add({ id: 'u_piyade', f: q[0], s: q[1], unit: 'piyade', icon: 'piyade', needs: 'barracks' });
  q = unitPadPos(SLOTS.barracks, 1); add({ id: 'u_baltaci', f: q[0], s: q[1], unit: 'baltaci', icon: 'balta', needs: 'barracks' });
  q = unitPadPos(SLOTS.archery, 0); add({ id: 'u_okcu', f: q[0] + 30, s: q[1], unit: 'okcu', icon: 'okcu', needs: 'archery' });
  q = unitPadPos(SLOTS.stable, 0); add({ id: 'u_suvari', f: q[0], s: q[1], unit: 'suvari', icon: 'suvari', needs: 'stable' });
  q = unitPadPos(SLOTS.stable, 1); add({ id: 'u_atliokcu', f: q[0], s: q[1], unit: 'atliokcu', icon: 'atliokcu', needs: 'stable' });
  add({ id: 'cmd_atk', f: 300, s: 0, label: 'HÜCUM!', icon: 'atk', cmd: 'charge', w: 66, h: 52 });
  add({ id: 'cmd_follow', f: 300, s: -78, label: 'SANCAĞA', icon: 'sancak', cmd: 'follow', w: 62, h: 52 });
  add({ id: 'cmd_def', f: 300, s: 78, label: 'SAVUN', icon: 'kalkan', cmd: 'rally', w: 62, h: 52 });
  for (const p of list) { if (p.unit) { p.label = p.label || (p.unit === k.civ.uniq ? k.civ.uname : UT[p.unit].name.toLocaleUpperCase('tr')); p.cost = unitCost(k, p.unit); } else if (p.build) p.cost = costOf(k, BT[p.build].cost, 'bld'); else if (p.upg) p.cost = { f: 60, g: 60 }; makePadMesh(p); }
  return list;
}
function padIcon(g, kind, cx, cy, s, civCss) {
  g.save(); g.translate(cx, cy); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
  const Wc = '#ffffff', GO = '#ffd75e', TC = civCss || '#ffffff';
  const man = (c) => { g.fillStyle = c; g.beginPath(); g.ellipse(0, 18, 15, 19, 0, 0, 7); g.fill(); g.fillStyle = '#f0c39a'; g.beginPath(); g.arc(0, -10, 11, 0, 7); g.fill(); };
  const coin = (x, y, r) => { g.fillStyle = GO; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = '#a86d00'; g.lineWidth = 2; g.stroke(); };
  const stone = (x, y, r) => { g.fillStyle = '#9aa0a6'; g.beginPath(); g.roundRect(x - r, y - r * .8, r * 2, r * 1.6, r * .4); g.fill(); g.fillStyle = '#c3c8cc'; g.fillRect(x - r * .6, y - r * .6, r * .7, r * .4); };
  const wheat = (x, y, r) => { g.strokeStyle = '#e8c35a'; g.lineWidth = 3; for (const a of [-.4, 0, .4]) { g.beginPath(); g.moveTo(x, y + r); g.lineTo(x + Math.sin(a) * r, y - r); g.stroke(); g.fillStyle = '#f2d36b'; g.beginPath(); g.ellipse(x + Math.sin(a) * r, y - r, 4, 8, a, 0, 7); g.fill(); } };
  const horse = () => { g.fillStyle = '#8a5532'; g.beginPath(); g.ellipse(-4, 12, 24, 13, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(14, 6); g.lineTo(28, -16); g.lineTo(36, -12); g.lineTo(24, 12); g.fill(); g.fillRect(-24, 20, 6, 20); g.fillRect(12, 20, 6, 20); g.fillStyle = TC; g.fillRect(-14, 0, 20, 14); };
  if (kind.startsWith('koylu')) { man('#9a7b54'); g.strokeStyle = '#d8dde2'; g.lineWidth = 4; g.beginPath(); g.moveTo(16, 30); g.lineTo(24, -18); g.stroke(); if (kind === 'koylu_g') coin(-22, 28, 10); if (kind === 'koylu_s') stone(-22, 28, 10); if (kind === 'koylu_f') wheat(-24, 24, 12); }
  else if (kind === 'piyade') { g.fillStyle = TC; g.beginPath(); g.moveTo(-26, -30); g.lineTo(26, -30); g.lineTo(26, 0); g.quadraticCurveTo(26, 28, 0, 40); g.quadraticCurveTo(-26, 28, -26, 0); g.closePath(); g.fill(); g.fillStyle = Wc; g.fillRect(-4, -22, 8, 50); g.fillRect(-18, -6, 36, 8); }
  else if (kind === 'okcu') { g.strokeStyle = Wc; g.lineWidth = 6; g.beginPath(); g.arc(-8, 0, 32, -1.2, 1.2); g.stroke(); g.lineWidth = 2; g.beginPath(); g.moveTo(3, -30); g.lineTo(3, 30); g.stroke(); g.lineWidth = 4; g.strokeStyle = GO; g.beginPath(); g.moveTo(-30, 0); g.lineTo(30, 0); g.stroke(); g.fillStyle = GO; g.beginPath(); g.moveTo(38, 0); g.lineTo(26, -7); g.lineTo(26, 7); g.fill(); }
  else if (kind === 'balta') { g.strokeStyle = '#c08a54'; g.lineWidth = 7; g.beginPath(); g.moveTo(-18, 34); g.lineTo(14, -30); g.stroke(); g.fillStyle = Wc; g.beginPath(); g.moveTo(8, -36); g.quadraticCurveTo(40, -30, 34, 0); g.lineTo(18, -8); g.closePath(); g.fill(); g.beginPath(); g.moveTo(8, -36); g.quadraticCurveTo(-14, -40, -12, -14); g.lineTo(2, -18); g.closePath(); g.fill(); }
  else if (kind === 'suvari' || kind === 'ahir') { horse(); if (kind === 'suvari') { g.strokeStyle = Wc; g.lineWidth = 4; g.beginPath(); g.moveTo(-6, -2); g.lineTo(-2, -38); g.stroke(); } }
  else if (kind === 'atliokcu') { horse(); g.strokeStyle = Wc; g.lineWidth = 4; g.beginPath(); g.arc(-10, -14, 18, -1.3, 1.3); g.stroke(); }
  else if (kind === 'kule') { g.fillStyle = Wc; g.fillRect(-14, -18, 28, 50); for (let i = -16; i < 16; i += 11) g.fillRect(i, -26, 7, 9); g.fillStyle = TC; g.beginPath(); g.moveTo(-20, -26); g.lineTo(0, -48); g.lineTo(20, -26); g.closePath(); g.fill(); }
  else if (kind === 'kisla' || kind === 'ev') { g.fillStyle = kind === 'ev' ? '#e9dcc0' : Wc; g.fillRect(-28, -6, 56, 34); g.fillStyle = TC; g.beginPath(); g.moveTo(-34, -6); g.lineTo(0, -32); g.lineTo(34, -6); g.closePath(); g.fill(); g.fillStyle = '#2b2d31'; g.fillRect(-7, 8, 14, 20); if (kind === 'ev') { g.fillStyle = Wc; g.font = '900 22px system-ui'; g.textAlign = 'center'; g.fillText('+6', 0, 50); } }
  else if (kind === 'tarla') { g.fillStyle = '#7a5a2e'; g.fillRect(-34, -20, 68, 50); wheat(-16, 4, 16); wheat(12, 4, 16); }
  else if (kind === 'upg') { g.fillStyle = GO; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-24, 20 - i * 18); g.lineTo(0, 2 - i * 18); g.lineTo(24, 20 - i * 18); g.lineTo(24, 30 - i * 18); g.lineTo(0, 12 - i * 18); g.lineTo(-24, 30 - i * 18); g.closePath(); g.fill(); } }
  else if (kind === 'atk') { g.strokeStyle = Wc; g.lineWidth = 8; g.beginPath(); g.moveTo(-28, -30); g.lineTo(26, 24); g.moveTo(28, -30); g.lineTo(-26, 24); g.stroke(); g.strokeStyle = GO; g.beginPath(); g.moveTo(14, 26); g.lineTo(32, 10); g.moveTo(-14, 26); g.lineTo(-32, 10); g.stroke(); }
  else if (kind === 'sancak') { g.strokeStyle = '#c08a54'; g.lineWidth = 5; g.beginPath(); g.moveTo(-14, 40); g.lineTo(-14, -40); g.stroke(); g.fillStyle = TC; g.beginPath(); g.moveTo(-12, -38); g.quadraticCurveTo(10, -30, 30, -34); g.lineTo(30, -4); g.quadraticCurveTo(10, 0, -12, -8); g.closePath(); g.fill(); }
  else if (kind === 'kalkan') { g.fillStyle = TC; g.beginPath(); g.moveTo(-26, -30); g.lineTo(26, -30); g.lineTo(26, 0); g.quadraticCurveTo(26, 28, 0, 40); g.quadraticCurveTo(-26, 28, -26, 0); g.closePath(); g.fill(); g.strokeStyle = Wc; g.lineWidth = 5; g.stroke(); }
  g.restore();
}
function makePadMesh(p) {
  const cv = document.createElement('canvas'); cv.width = Math.round(5 * p.w); cv.height = Math.round(5 * p.h);
  const tex = new T3.CanvasTexture(cv); tex.colorSpace = T3.SRGBColorSpace; tex.anisotropy = 8;
  const geo = new T3.PlaneGeometry(p.w * K, p.h * K); geo.rotateX(-PI / 2);
  const m = new T3.Mesh(geo, new T3.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false }));
  m.position.set(X3(p.x), .14, Z3(p.y)); m.rotation.y = 0; m.renderOrder = 2; scene.add(m);
  Object.assign(p, { mesh: m, cv, tex, key: '' });
}
function padState(p, k) {
  if (p.done) return 'hidden';
  if (p.needs && !hasBld(k, p.needs)) return 'hidden';
  if (p.build === 'farm' && SLOTS.farm.findIndex((_, i) => 'farm' + i === p.id) > 0 && false) return 'hidden';
  return 'show';
}
function remaining(p) { const c = p.cost || {}; return { f: (c.f || 0) - p.paid.f, s: (c.s || 0) - p.paid.s, g: (c.g || 0) - p.paid.g }; }
function drawPad(p, k) {
  const act = G.onPad === p, rem = remaining(p);
  let block = '';
  if (p.unit) { const need = UT[p.unit].pop; if (popOf(k) + need > popCap(k)) block = 'EV GEREK'; if (p.job === 'food' && jobCount(k, 'food') >= farmCap(k)) block = 'TARLA GEREK'; }
  const cmdN = p.cmd ? armyOf(k).length : 0;
  const key = [rem.f, rem.s, rem.g, act, block, cmdN, Math.round((p.hold || 0) * 20), k.res.f >= rem.f, k.res.s >= rem.s, k.res.g >= rem.g, G.armyMode].join('|');
  if (key === p.key) return; p.key = key;
  const g = p.cv.getContext('2d'), w = p.cv.width, h = p.cv.height, rr = Math.min(w, h) * .14;
  g.clearRect(0, 0, w, h);
  const isCmd = !!p.cmd, sel = isCmd && G.armyMode === p.cmd;
  g.fillStyle = isCmd ? (sel ? 'rgba(170,120,20,.75)' : 'rgba(120,24,30,.66)') : p.build ? 'rgba(40,30,18,.6)' : 'rgba(16,22,28,.6)';
  g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, rr); g.fill();
  const tot = (p.cost ? (p.cost.f || 0) + (p.cost.s || 0) + (p.cost.g || 0) : 0), paid = p.paid.f + p.paid.s + p.paid.g;
  if (tot && paid > 0) { g.save(); g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, rr); g.clip(); const pr = paid / tot; g.fillStyle = 'rgba(255,200,50,.6)'; g.fillRect(0, h * (1 - pr), w, h * pr); g.restore(); }
  if (isCmd && p.hold > 0) { g.save(); g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, rr); g.clip(); g.fillStyle = 'rgba(255,215,94,.6)'; g.fillRect(0, 0, w * p.hold / .5, h); g.restore(); }
  g.strokeStyle = act ? '#ffd75e' : (p.build ? '#e8d8b0' : '#ffffff'); g.lineWidth = 11; g.lineCap = 'round';
  if (p.build) g.setLineDash([20, 14]);
  const c = Math.min(w, h) * .2, m = 12;
  if (p.build) { g.beginPath(); g.roundRect(m, m, w - 2 * m, h - 2 * m, rr); g.stroke(); g.setLineDash([]); }
  else for (const [x, dx] of [[m, 1], [w - m, -1]]) for (const [y, dy] of [[m, 1], [h - m, -1]]) { g.beginPath(); g.moveTo(x, y + dy * c); g.lineTo(x, y); g.lineTo(x + dx * c, y); g.stroke(); }
  const S = Math.min(w, h) / 280;
  padIcon(g, p.icon, w / 2, h * .33, 1.6 * S, k.civ.css);
  const font = sz => '900 ' + sz + 'px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
  const label = (t, x, y, sz, col, al = 'center') => { g.font = font(sz); g.textAlign = al; g.textBaseline = 'middle'; g.lineWidth = sz / 4; g.strokeStyle = 'rgba(20,16,12,.9)'; g.lineJoin = 'round'; g.strokeText(t, x, y); g.fillStyle = col; g.fillText(t, x, y); };
  const fs = Math.round(46 * S), lab = p.label;
  label(lab, w / 2, h * .66, lab.length > 8 ? Math.round(fs * .74) : fs, isCmd ? '#ffd75e' : '#ffffff');
  const cy = h * .86;
  if (isCmd) label(cmdN + ' asker', w / 2, cy, Math.round(fs * .78), '#ffffff');
  else if (block) label(block, w / 2, cy, Math.round(fs * .72), '#ff9a8a');
  else {
    const items = [['f', '#f2d36b'], ['s', '#b8bec4'], ['g', '#ffd24a']].filter(([r]) => rem[r] > 0);
    const isz = Math.round(fs * .72); g.font = font(isz);
    const parts = items.map(([r, col]) => ({ r, col, t: String(rem[r]), w: g.measureText(String(rem[r])).width + isz * 1.15 + 10 }));
    let x = w / 2 - parts.reduce((a, b) => a + b.w, 0) / 2;
    for (const it of parts) {
      const ir = isz * .45, ix = x + ir;
      if (it.r === 'g') { const gr = g.createRadialGradient(ix - ir * .3, cy - ir * .3, 1, ix, cy, ir); gr.addColorStop(0, '#fff0a8'); gr.addColorStop(.6, '#f2b21b'); gr.addColorStop(1, '#a86d00'); g.fillStyle = gr; g.beginPath(); g.arc(ix, cy, ir, 0, 7); g.fill(); }
      else if (it.r === 's') { g.fillStyle = '#9aa0a6'; g.beginPath(); g.roundRect(ix - ir, cy - ir * .8, ir * 2, ir * 1.6, ir * .4); g.fill(); }
      else { g.fillStyle = '#e8c35a'; g.beginPath(); g.ellipse(ix, cy, ir * .6, ir, 0, 0, 7); g.fill(); }
      const ok = k.res[it.r] >= rem[it.r];
      label(it.t, ix + ir + 4, cy + 1, isz, ok ? '#fff2b8' : '#ffb0a0', 'left'); x += it.w;
    }
  }
  p.tex.needsUpdate = true;
}

// ================================================================ GAME SETUP
const camTarget = new T3.Vector3();
function clearGame() {
  if (!G) return;
  for (const u of G.units) { scene.remove(u.obj); if (u.ring) scene.remove(u.ring); }
  for (const b of G.blds) scene.remove(b.obj);
  for (const k of G.ks) for (const d of k.deco) scene.remove(d);
  for (const p of G.pads) { scene.remove(p.mesh); p.tex.dispose(); }
}
function newGame(level, civIdx) {
  clearGame();
  seed = level * 977 + civIdx * 31 + 13;
  G = { level, t: 0, units: [], blds: [], proj: [], coinsArr: [], parts: [], floats: [], fly: [], ks: [], pads: [], msgs: [], payT: 0, heroDead: 0, shake: 0, over: null, overT: 0, moved: false, armyMode: 'rally', peace: Math.max(90, 170 - 20 * (level - 1)), warT: 0, alarmT: 0, stats: { built: 0, trained: 0 } };
  // place player at slot 0 (bottom), AI civs elsewhere
  const order = [civIdx, ...[0, 1, 2, 3, 4].filter(i => i !== civIdx)];
  order.forEach((ci, i) => G.ks.push(makeKingdom(i, ci, i === 0)));
  G.pk = G.ks[0];
  const pk = G.pk;
  G.hero = makeUnit(pk, 'hero', pk.castle.x + pk.fx * 120, pk.castle.y + pk.fy * 120, 'hero');
  G.pads = padsFor(pk);
  camTarget.set(X3(G.hero.x), 0, Z3(G.hero.y) - 5);
  msg('Barış dönemi: krallığını büyüt!', '#ffe27a');
  hud(true);
}

// ================================================================ COMBAT HELPERS
const alive = o => o.hp > 0 && !o.dying;
const enemies = (a, b) => a.k !== b.k;
function nearestEnemy(e, maxD, opts = {}) {
  let best = null, bd = maxD; const ox = opts.ox ?? e.x, oy = opts.oy ?? e.y;
  for (const o of G.units) { if (!enemies(o, e) || !alive(o) || !o.k.alive) continue; if (o.role === 'hero' && G.heroDead > 0) continue; const d = Math.hypot(o.x - ox, o.y - oy) - o.r; if (d < bd) { bd = d; best = o; } }
  if (!opts.unitsOnly) for (const o of G.blds) { if (!enemies(o, e) || o.hp <= 0 || !o.k.alive) continue; if (opts.onlyK && o.k !== opts.onlyK) continue; const d = Math.hypot(o.x - ox, o.y - oy) - o.r; if (d < bd) { bd = d; best = o; } }
  return best;
}
const inRange = (u, t) => dist(u, t) - t.r - u.r <= u.range;
function floatText(x, y, z, txt, c, size) { G.floats.push({ x, y, z, txt, c: c || '#fff', t: 0, size: size || 16 }); }
function burst(pool, x, y, z, color, n, spd, up = 6) { const col = color != null ? new T3.Color(color) : null; for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = (spd || 60) * (.4 + Math.random()); G.parts.push({ pool, x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: up * (.5 + Math.random()), life: .5 + Math.random() * .5, t: 0, col, r: .7 + Math.random() * .7, g: 1, rot: Math.random() * 6 }); } }
function smoke(x, y, z, n, size) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 15 + Math.random() * 35; G.parts.push({ pool: 'smoke', x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 6, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 1.5 + Math.random() * 3, life: .7 + Math.random() * .6, t: 0, r: (size || 1) * (.7 + Math.random() * .7), g: 0, rot: 0 }); } }
function glow(x, y, z, color, size, life, vz = 0) { G.parts.push({ pool: 'glow', x, y, z, vx: 0, vy: 0, vz, life, t: 0, col: new T3.Color(color), r: size, g: 0, rot: 0 }); }
function dropCoins(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 25 + Math.random() * 60; G.coinsArr.push({ x, y, z: 1.2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 7 + Math.random() * 6, age: 0, mag: false, spin: Math.random() * 6, v: 3 }); } }
function msg(text, color) { G.msgs.push({ text, color: color || '#fff', t: 0 }); if (G.msgs.length > 4) G.msgs.shift(); }
function shoot(src, tgt, dmg, z0) {
  const d = Math.hypot(tgt.x - src.x, tgt.y - src.y);
  G.proj.push({ x0: src.x, y0: src.y, z0: z0 || 1.6, tgt, tx: tgt.x, ty: tgt.y, t: 0, T: Math.max(.2, d / 470), dmg, src, h: d * K * .14 });
  if (src.vis !== false && nearCam(src.x, src.y)) sfx('arrow', .5);
}
function damage(t, dmg, src) {
  if (t.hp <= 0 || t.dying) return; t.hp -= dmg; t.hit = .12;
  if (src && src.k) t.lastHitBy = src.k;
  if (t.k.isPlayer && src && src.k && G.alarmT <= 0 && G.t > G.peace) { G.alarmT = 20; msg('⚔ ' + src.k.civ.name + ' saldırıyor!', src.k.civ.css); sfx('alarm'); }
  if (t.kind === 'u' && t.role === 'hero') sfx('hurt', .6);
  if (t.hp <= 0) kill(t);
}
function kill(t) {
  if (t.kind === 'u') {
    if (t.role === 'hero') { t.hp = 0; G.heroDead = 5; floatText(t.x, t.y, 5, 'Paşa yaralandı!', '#ffd75e', 18); burst('spark', t.x, t.y, 2, 0xff5050, 14, 60); return; }
    t.dying = 2.4; t.hp = 0; burst('spark', t.x, t.y, 1.5, t.k.civ.color, 7, 40);
    if (nearCam(t.x, t.y)) sfx('death', .5);
    if (t.lastHitBy && t.lastHitBy.isPlayer && t.role !== 'koylu') dropCoins(t.x, t.y, t.T.horse ? 3 : 2);
  } else {
    smoke(t.x, t.y, 2, 16, 2.4); burst('spark', t.x, t.y, 3, 0x8a8f96, 18, 90); if (nearCam(t.x, t.y)) { sfx('boom'); G.shake = Math.max(G.shake, .4); }
    scene.remove(t.obj);
    if (t.k.isPlayer) { const p = G.pads.find(p => p.bld === t); if (p) { p.done = false; p.paid = { f: 0, s: 0, g: 0 }; p.bld = null; } }
    if (t.type === 'castle') conquer(t.k, t.lastHitBy);
  }
}
function conquer(k, by) {
  if (!k.alive) return; k.alive = false;
  const name = by ? by.civ.name : 'düşman';
  msg('🏰 ' + k.civ.full + ' düştü! (' + name + ')', by ? by.civ.css : '#fff'); sfx('conquer');
  for (const u of k.units) if (alive(u)) { if (u.role === 'hero') continue; u.dying = 2 + Math.random(); u.hp = 0; }
  k.blds.forEach((b, i) => { if (b.hp > 0) setTimeout(() => { if (G && b.hp > 0) { b.hp = 0; smoke(b.x, b.y, 2, 10, 2); scene.remove(b.obj); } }, 300 + i * 180); });
  if (by) { by.res.g += 250; by.res.f += 150; by.res.s += 150; if (by.isPlayer) { dropCoins(k.x, k.y, 40); msg('Ganimet: +250 altın +150 yiyecek +150 taş', '#ffe27a'); } }
  if (k.isPlayer && !G.over) { G.over = 'lose'; G.overT = 2.5; sfx('lose'); }
  if (!G.over && G.ks.filter(x => x.alive).length === 1 && G.pk.alive) { G.over = 'win'; G.overT = 3; sfx('win'); }
}
function attack(u, t) {
  u.rot = Math.atan2(t.x - u.x, t.y - u.y);
  const name = u.T.atk || '1H_Melee_Attack_Chop', c = u.clips[name];
  const ts = Math.max(1.1, (c ? c.duration : 1) / (u.cdMax * .95));
  const dur = play(u, name, true, ts, .08);
  u.atkT = Math.min(dur || .6, u.cdMax * .95);
  u.pending = { t: u.T.ranged ? .3 : .32, target: t };
}
function resolveHit(u, t) {
  if (!alive(u)) return;
  if (u.T.ranged) { if (t.hp > 0 && !t.dying) shoot(u, t, u.dmg, u.T.horse ? 2.8 : 1.7); return; }
  if (t.hp <= 0 || t.dying || dist(u, t) - t.r - u.r > u.range + 10) return;
  damage(t, u.dmg, u); if (nearCam(u.x, u.y)) sfx(u.role === 'koylu' ? 'chop' : (u.T.snd || 'sword'), .55);
  if (u.vis) burst('spark', t.x + (u.x - t.x) * .35, t.y + (u.y - t.y) * .35, 1.6, 0xfff3b0, 3, 45);
  if (u.T.cleave) for (const o of G.units) if (o !== t && enemies(o, u) && alive(o) && dist(o, t) < u.T.cleave) damage(o, u.dmg * .6, u);
}
function turn(u, a, dt) { let d = a - u.rot; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI; u.rot += d * Math.min(1, dt * 10); }
function moveTo(u, x, y, dt, stop = 0) {
  const dx = x - u.x, dy = y - u.y, d = Math.hypot(dx, dy) || 1; if (d <= stop + .8) return true;
  const s = Math.min(d - stop, u.spd * dt); u.x += dx / d * s; u.y += dy / d * s; u.moving = true; turn(u, Math.atan2(dx, dy), dt); return d - s <= stop + .8;
}
function camPos() { return { x: camTarget.x / K + MC, y: camTarget.z / K + MC }; }
let CAMP = { x: MC, y: MC };
const nearCam = (x, y) => Math.abs(x - CAMP.x) < 200 && y - CAMP.y > -420 && y - CAMP.y < 260;

// ================================================================ UNIT AI
function villagerAI(u, dt) {
  const k = u.k;
  const threat = u.tgtT <= 0 ? nearestEnemy(u, 40, { unitsOnly: true }) : u.tgt; if (u.tgtT <= 0) { u.tgt = threat; u.tgtT = .4; }
  if (u.tgt && alive(u.tgt) && dist(u, u.tgt) < 60) { if (inRange(u, u.tgt)) { if (u.cd <= 0) { attack(u, u.tgt); u.cd = u.cdMax; } } else moveTo(u, u.tgt.x, u.tgt.y, dt); return; }
  const node = u.job === 'gold' ? k.mine : u.job === 'stone' ? k.quarry : u.farm;
  if (u.job === 'food' && (!u.farm || u.farm.hp <= 0)) { u.farm = k.blds.find(b => b.type === 'farm' && b.hp > 0 && b.workers < 3); if (u.farm) u.farm.workers++; else { u.job = 'gold'; return; } }
  if (!node || node.hp <= 0) { if (u.job !== 'food') u.job = 'food'; return; }
  if (!u.spot) { const a = Math.random() * PI * 2, r = node.type === 'farm' ? Math.random() * 22 : node.r + 6; u.spot = { x: node.x + Math.cos(a) * r, y: node.y + Math.sin(a) * r }; if (node.type !== 'farm') { const dx = k.castle.x - node.x, dy = k.castle.y - node.y, d = Math.hypot(dx, dy); u.spot = { x: node.x + dx / d * (node.r + 12) + (Math.random() - .5) * 30, y: node.y + dy / d * (node.r + 12) + (Math.random() - .5) * 30 }; } }
  if (u.vs === 'toNode') { if (moveTo(u, u.spot.x, u.spot.y, dt, 3)) { u.vs = 'work'; u.workT = 3.6; } }
  else if (u.vs === 'work') {
    u.workT -= dt; turn(u, Math.atan2(node.x - u.x, node.y - u.y), dt);
    if (u.cd <= 0) { u.cd = 1.05; if (u.vis) { play(u, u.job === 'food' ? 'PickUp' : '1H_Melee_Attack_Chop', true, 1.2, .1); u.atkT = .8; if (nearCam(u.x, u.y) && Math.random() < .4) sfx('chop', .25); } }
    if (u.workT <= 0) { u.carry = u.job; u.vs = 'toDrop'; }
  } else if (u.vs === 'toDrop') {
    const c = k.castle, dx = u.x - c.x, dy = u.y - c.y, d = Math.hypot(dx, dy) || 1;
    if (moveTo(u, c.x + dx / d * (c.r + 4), c.y + dy / d * (c.r + 4), dt, 4) || d < c.r + 14) {
      const r = u.job === 'gold' ? 'g' : u.job === 'stone' ? 's' : 'f';
      let amt = 10 * k.mult * (r === 'f' && k.civ.mod.foodRate ? k.civ.mod.foodRate : 1);
      k.res[r] += Math.round(amt); u.carry = null; u.vs = 'toNode';
      if (k.isPlayer && u.vis) { floatText(u.x, u.y, 3, '+' + Math.round(amt), r === 'g' ? '#ffd24a' : r === 's' ? '#d6dbe0' : '#f2d36b', 13); sfx('res', .4); }
    }
  }
}
function soldierAI(u, dt) {
  const k = u.k;
  u.tgtT -= dt;
  if (u.tgtT <= 0) {
    u.tgtT = .3 + Math.random() * .2; u.tgt = null;
    if (u.state === 'rally') { const t = nearestEnemy(u, 1e9, { ox: k.castle.x, oy: k.castle.y }); if (t && Math.hypot(t.x - k.castle.x, t.y - k.castle.y) < 340) u.tgt = nearestEnemy(u, 260) || t; }
    else if (u.state === 'follow') { const h = G.hero; if (G.heroDead <= 0) u.tgt = nearestEnemy(u, 150, { ox: h.x, oy: h.y }); }
    else if (u.state === 'charge' || u.state === 'raid') {
      if (!u.goalK || !u.goalK.alive) u.goalK = pickTarget(k, false);
      u.tgt = nearestEnemy(u, 190);
      if (!u.tgt && u.goalK) u.tgt = nearestEnemy(u, 1e9, { onlyK: u.goalK, unitsOnly: false, ox: u.goalK.castle.x, oy: u.goalK.castle.y });
      if (!u.goalK) { u.state = 'rally'; }
    }
  }
  const t = u.tgt;
  if (t && (t.hp <= 0 || t.dying || !t.k.alive)) { u.tgt = null; u.tgtT = 0; }
  if (u.tgt) {
    if (inRange(u, u.tgt)) { turn(u, Math.atan2(u.tgt.x - u.x, u.tgt.y - u.y), dt); if (u.cd <= 0) { attack(u, u.tgt); u.cd = u.cdMax; } }
    else moveTo(u, u.tgt.x, u.tgt.y, dt);
    return;
  }
  let goal = null;
  if (u.state === 'rally') goal = u.slot;
  else if (u.state === 'follow' && G.heroDead <= 0) goal = u.slot;
  else if (u.state === 'follow') goal = u.slot0;
  if (goal) { if (Math.hypot(goal.x - u.x, goal.y - u.y) > 4) moveTo(u, goal.x, goal.y, dt); else turn(u, Math.atan2(k.fx, k.fy), dt); }
}
function pickTarget(k, forAI) {
  const others = G.ks.filter(o => o.alive && o !== k); if (!others.length) return null;
  if (!forAI) { let b = null, bd = 1e9; for (const o of others) { const d = Math.hypot(o.x - k.x, o.y - k.y); if (d < bd) { bd = d; b = o; } } return b; }
  let b = null, bs = 1e9;
  for (const o of others) { const d = Math.hypot(o.x - k.x, o.y - k.y); const s = o.power * 1.0 + d * 1.2 + (o.isPlayer ? (G.level === 1 ? 260 : G.level === 2 ? 60 : -150) : 0) + Math.random() * 400; if (s < bs) { bs = s; b = o; } }
  return b;
}

// ================================================================ AI KINGDOM
function aiTick(k) {
  const pop = popOf(k), cap = popCap(k), vill = k.units.filter(u => u.role === 'koylu' && alive(u)).length, army = armyOf(k);
  const tgtVill = Math.min(16, 5 + Math.floor(G.t / 25));
  const buildAt = (type, slot) => { const p = kLocal(k, slot[0], slot[1]); const c = costOf(k, BT[type].cost, 'bld'); if (!canAfford(k, c)) return false; spend(k, c); addBld(k, type, p.x, p.y, false); return true; };
  // houses
  if (cap - pop <= 2 && k.houseSlot < SLOTS.house.length) { if (buildAt('house', SLOTS.house[k.houseSlot])) { k.houseSlot++; return; } }
  // villagers
  if (vill < tgtVill && pop < cap && k.res.f >= 50) {
    const f = jobCount(k, 'food'), gd = jobCount(k, 'gold'), st = jobCount(k, 'stone');
    let job = 'food'; if (f >= farmCap(k)) { if (k.farmSlot < SLOTS.farm.length && k.res.s >= 30) { if (buildAt('farm', SLOTS.farm[k.farmSlot])) k.farmSlot++; return; } job = gd <= st ? 'gold' : 'stone'; }
    else if (f > (gd + st) * .9) job = gd <= st ? 'gold' : 'stone';
    spend(k, { f: 50 }); const v = makeUnit(k, 'koylu', k.castle.x, k.castle.y, 'work'); v.job = job; v.vs = 'toNode'; return;
  }
  // buildings order
  const has = t => k.blds.some(b => b.type === t);
  if (vill >= 5 && !has('barracks')) { if (buildAt('barracks', SLOTS.barracks)) return; }
  else if (vill >= 8 && !has('archery')) { if (buildAt('archery', SLOTS.archery)) return; }
  else if (vill >= 9 && k.towerSlot < 1) { if (buildAt('tower', SLOTS.tower[0])) { k.towerSlot = 1; return; } }
  else if (vill >= 11 && !has('stable')) { if (buildAt('stable', SLOTS.stable)) return; }
  else if (vill >= 13 && k.towerSlot < 2) { if (buildAt('tower', SLOTS.tower[1])) { k.towerSlot = 2; return; } }
  // upgrade
  if (k.upgLv < 4 && G.t > 120 + k.upgLv * 120 && canAfford(k, { f: 60 + 40 * k.upgLv, g: 60 + 40 * k.upgLv })) { spend(k, { f: 60 + 40 * k.upgLv, g: 60 + 40 * k.upgLv }); applyUpgrade(k); return; }
  // army
  if (pop < cap) {
    const opts = [];
    if (hasBld(k, 'barracks')) opts.push('piyade', 'piyade', 'baltaci');
    if (hasBld(k, 'archery')) opts.push('okcu', 'okcu');
    if (hasBld(k, 'stable')) opts.push('suvari', 'atliokcu');
    if (k.civ.uniq && opts.includes(k.civ.uniq)) opts.push(k.civ.uniq, k.civ.uniq);
    if (opts.length && (vill >= 6 || army.length < 3)) {
      const role = opts[Math.floor(Math.random() * opts.length)]; const c = unitCost(k, role);
      if (canAfford(k, c) && pop + UT[role].pop <= cap) { spend(k, c); trainAt(k, role); return; }
    }
  }
}
function trainAt(k, role) {
  const bt = role === 'koylu' ? 'castle' : (role === 'okcu' ? 'archery' : (role === 'suvari' || role === 'atliokcu') ? 'stable' : 'barracks');
  const b = k.blds.find(x => x.type === bt && x.hp > 0) || k.castle;
  const u = makeUnit(k, role, b.x + k.fx * (b.r + 10), b.y + k.fy * (b.r + 10), k.isPlayer && G.armyMode !== 'rally' ? (G.armyMode === 'follow' ? 'follow' : 'rally') : 'rally');
  if (u.vis !== false) burst('spark', u.x, u.y, 1, 0xffd75e, 10, 50);
  return u;
}
function applyUpgrade(k) { k.upg *= 1.12; k.upgLv++; for (const u of k.units) if (u.role !== 'koylu' && u.role !== 'hero') { u.hp *= 1.12; u.maxhp *= 1.12; u.dmg *= 1.12; } }
function aiWar(k) {
  if (G.t < G.peace || k.isPlayer) return;
  const army = armyOf(k).filter(u => u.state === 'rally');
  const need = Math.min(22, 7 + 2 * k.waves);
  if (army.length >= need) {
    const target = pickTarget(k, true); if (!target) return;
    for (const u of army) { u.state = 'raid'; u.goalK = target; }
    k.waves++;
    if (target.isPlayer) { msg('⚔ ' + k.civ.full + ' sana sefer başlattı! (' + army.length + ' asker)', k.civ.css); sfx('alarm'); }
    else msg(k.civ.name + ' → ' + target.civ.name + ' üzerine yürüyor', '#e6e6e6');
  }
}

// ================================================================ UPDATE
const keys = new Set(); let joy = null;
function update(dt) {
  G.t += dt; G.alarmT = Math.max(0, G.alarmT - dt);
  if (G.t >= G.peace && !G.warStarted) { G.warStarted = true; msg('⚔ Barış bitti! İstila dönemi başladı.', '#ff8a6a'); sfx('alarm'); }
  const h = G.hero, pk = G.pk;
  // hero
  if (G.heroDead > 0) { G.heroDead -= dt; if (G.heroDead <= 0 && pk.alive) { h.hp = h.maxhp; h.x = pk.castle.x + pk.fx * 80; h.y = pk.castle.y + pk.fy * 80; } }
  else {
    let ix = 0, iy = 0;
    if (joy) { const dx = joy.x - joy.sx, dy = joy.y - joy.sy, m = Math.hypot(dx, dy); if (m > 4) { const kk = Math.min(1, m / 42); ix = dx / m * kk; iy = dy / m * kk; } }
    if (keys.size) { const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0), ky = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0); const m = Math.hypot(kx, ky); if (m) { ix = kx / m; iy = ky / m; } }
    const m = Math.hypot(ix, iy); h.moving = m > .05;
    if (h.moving) { G.moved = true; h.x += ix * h.spd * dt; h.y += iy * h.spd * dt; turn(h, Math.atan2(ix, iy), dt * 1.4); }
    h.hp = Math.min(h.maxhp, h.hp + (Math.hypot(h.x - pk.x, h.y - pk.y) < 330 ? 18 : 2) * dt);
    h.cd -= dt; h.atkT = Math.max(0, h.atkT - dt);
    if (h.tgtT <= 0) { h.tgt = nearestEnemy(h, h.range); h.tgtT = .2; } h.tgtT -= dt;
    h.aiming = !!(h.tgt && alive(h.tgt));
    if (h.aiming && h.cd <= 0 && dist(h, h.tgt) - h.tgt.r < h.range + 10) { h.cd = h.cdMax; h.atkT = .35; shoot(h, h.tgt, h.dmg, 3.6); play(h, '1H_Ranged_Shoot', true, 1.6, .08); if (!h.moving) h.rot = Math.atan2(h.tgt.x - h.x, h.tgt.y - h.y); }
    clampMap(h);
  }
  for (const u of G.units) u.hit = Math.max(0, u.hit - dt);
  // formation slots per kingdom
  for (const k of G.ks) {
    let ri = 0, fi = 0;
    for (const u of k.units) {
      if (!alive(u) || u.role === 'koylu' || u.role === 'hero') continue;
      if (u.state === 'rally') { const row = Math.floor(ri / 8), col = ri % 8; u.slot = kLocal(k, SLOTS.rally[0] + 22 - row * 22, (col - 3.5) * 22 + (row % 2 ? 6 : 0)); ri++; }
      else if (u.state === 'follow') { const row = Math.floor(fi / 6), col = fi % 6; const bx = Math.sin(h.rot), by = Math.cos(h.rot); const sx = by, sy = -bx; const back = 40 + row * 22, side = (col - 2.5) * 22; u.slot = { x: h.x - bx * back + sx * side, y: h.y - by * back + sy * side }; u.slot0 = kLocal(k, SLOTS.rally[0], 0); fi++; }
    }
    k.rallyN = ri;
  }
  // AI
  for (const k of G.ks) if (k.alive && !k.isPlayer) { k.aiT -= dt; if (k.aiT <= 0) { k.aiT = 1.6 / k.mult; aiTick(k); } k.attackT -= dt; if (k.attackT <= 0) { k.attackT = 8; aiWar(k); } }
  if (Math.floor(G.t * 2) !== Math.floor((G.t - dt) * 2)) for (const k of G.ks) k.power = armyOf(k).reduce((a, u) => a + u.hp * u.dmg / 100, 0) + (k.castle.hp > 0 ? 20 : 0);
  // units
  for (const u of G.units) {
    if (!alive(u) || u.role === 'hero') continue;
    u.cd -= dt; u.moving = false;
    if (u.pending) { u.pending.t -= dt; if (u.pending.t <= 0) { const p = u.pending; u.pending = null; resolveHit(u, p.target); } }
    if (u.atkT > 0) { u.atkT -= dt; if (u.role !== 'koylu' || u.tgt) continue; }
    if (u.role === 'koylu') villagerAI(u, dt); else soldierAI(u, dt);
  }
  separation();
  // buildings
  for (const b of G.blds) {
    b.hit = Math.max(0, b.hit - dt); if (b.hp <= 0) continue;
    if (b.buildT > 0) { b.buildT -= dt; if (b.buildT <= 0) { b.buildT = 0; finishBld(b); smoke(b.x, b.y, .5, 10, 1.5); if (nearCam(b.x, b.y)) sfx('build', .6); } continue; }
    if (b.dmg && b.k.alive) { b.cd -= dt; if (b.cd <= 0) { const t = nearestEnemy(b, b.range, { unitsOnly: true }); if (t) { shoot(b, t, b.dmg, b.type === 'tower' ? 8.5 : 12); b.cd = b.cdMax; } } }
  }
  // projectiles
  for (const p of G.proj) {
    p.t += dt; if (p.tgt.hp > 0 && !p.tgt.dying) { p.tx = p.tgt.x; p.ty = p.tgt.y; }
    if (p.t >= p.T) { p.done = true; if (p.tgt.hp > 0 && !p.tgt.dying) { damage(p.tgt, p.dmg, p.src); if (nearCam(p.tx, p.ty)) burst('spark', p.tx, p.ty, 1.5, 0xfff0c0, 3, 30); } }
  }
  G.proj = G.proj.filter(p => !p.done);
  // coins (hero loot)
  for (const c of G.coinsArr) {
    c.age += dt; c.spin += dt * 5;
    if (c.mag && G.heroDead <= 0) { const dx = h.x - c.x, dy = h.y - c.y, d = Math.hypot(dx, dy) || 1, s = Math.max(320, 640 - d) * dt; c.x += dx / d * Math.min(d, s); c.y += dy / d * Math.min(d, s); c.z += (2.8 - c.z) * Math.min(1, dt * 10); if (d < 15) { c.done = true; pk.res.g += c.v; sfx('coin', .7); } }
    else { if (c.z > .4 || c.vz > 0) { c.vz -= 30 * dt; c.z += c.vz * dt; if (c.z < .4) { c.z = .4; c.vz *= -.35; if (Math.abs(c.vz) < 2) c.vz = 0; } c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= .97; c.vy *= .97; } if (G.heroDead <= 0 && c.age > .3 && Math.hypot(h.x - c.x, h.y - c.y) < 85) c.mag = true; }
    if (c.age > 60) c.done = true;
  }
  G.coinsArr = G.coinsArr.filter(c => !c.done);
  updatePads(dt);
  for (const f of G.fly) f.t += dt * 4; G.fly = G.fly.filter(f => f.t < 1);
  for (const p of G.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += dt * 8; if (p.g) { p.vz -= 26 * dt; if (p.z < .1) { p.z = .1; p.vz *= -.3; p.vx *= .6; p.vy *= .6; } } else { p.vx *= .95; p.vy *= .95; } }
  G.parts = G.parts.filter(p => p.t < p.life); if (G.parts.length > 800) G.parts.splice(0, G.parts.length - 800);
  for (const f of G.floats) f.t += dt; G.floats = G.floats.filter(f => f.t < 1.4);
  for (const m of G.msgs) m.t += dt; G.msgs = G.msgs.filter(m => m.t < 6);
  for (const u of G.units) if (u.dying) { u.dying -= dt; if (u.dying <= 0) { scene.remove(u.obj); u.removed = true; if (u.farm) u.farm.workers--; } }
  if (G.units.some(u => u.removed)) { G.units = G.units.filter(u => !u.removed); for (const k of G.ks) k.units = k.units.filter(u => !u.removed); }
  if (G.blds.some(b => b.hp <= 0)) { G.blds = G.blds.filter(b => b.hp > 0); for (const k of G.ks) k.blds = k.blds.filter(b => b.hp > 0); }
  G.shake = Math.max(0, G.shake - dt);
  let fighting = false; for (const u of G.units) if (u.k.isPlayer && u.atkT > 0 && u.role !== 'koylu') { fighting = true; break; }
  setIntensity(fighting || G.alarmT > 12 ? 1 : 0);
  if (G.over) { G.overT -= dt; if (G.overT <= 0 && running) { running = false; showEnd(); } }
  hud();
}
function separation() {
  const us = G.units; const cell = 40, grid = new Map();
  for (const u of us) { if (!alive(u)) continue; const key = ((u.x / cell) | 0) * 1000 + ((u.y / cell) | 0); let a = grid.get(key); if (!a) grid.set(key, a = []); a.push(u); }
  for (const a of us) {
    if (!alive(a)) continue; const cx = (a.x / cell) | 0, cy = (a.y / cell) | 0;
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const list = grid.get((cx + ox) * 1000 + cy + oy); if (!list) continue;
      for (const b of list) {
        if (b === a || b.id_ < a.id_) continue;
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r - 1; if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
        const d = Math.hypot(dx, dy) || .01; if (d >= rr) continue;
        if ((a.role === 'hero' || b.role === 'hero') && a.k === b.k) continue;
        if (a.role === 'koylu' && b.role === 'koylu') continue;
        const o = (rr - d) / 2, nx = dx / d, ny = dy / d, wa = a.role === 'hero' ? 0 : 1, wb = b.role === 'hero' ? 0 : 1, kk = (wa + wb) || 1;
        a.x -= nx * o * 2 * wa / kk; a.y -= ny * o * 2 * wa / kk; b.x += nx * o * 2 * wb / kk; b.y += ny * o * 2 * wb / kk;
      }
    }
  }
  for (const a of us) {
    if (!alive(a)) continue;
    for (const bl of a.k.blds.length ? G.blds : []) { if (bl.hp <= 0 || bl.walk) continue; const dx = a.x - bl.x, dy = a.y - bl.y; if (Math.abs(dx) > bl.r + a.r || Math.abs(dy) > bl.r + a.r) continue; const d = Math.hypot(dx, dy) || .01, rr = bl.r * .9 + a.r; if (d < rr) { a.x += dx / d * (rr - d); a.y += dy / d * (rr - d); } }
    clampMap(a);
  }
}
function updatePads(dt) {
  const k = G.pk, h = G.hero; let on = null;
  if (G.heroDead <= 0 && k.alive) for (const p of G.pads) { if (padState(p, k) !== 'show') continue; if (Math.abs(h.x - p.x) < p.w / 2 && Math.abs(h.y - p.y) < p.h / 2) on = p; }
  if (G.onPad !== on && on && on.cmd) on.hold = 0;
  G.onPad = on;
  if (!on) return;
  if (on.cmd) {
    on.hold = (on.hold || 0) + dt;
    if (on.hold >= .5 && G.armyMode !== on.cmd) {
      G.armyMode = on.cmd; const army = armyOf(k);
      for (const u of army) { u.state = on.cmd; u.goalK = null; u.tgt = null; u.tgtT = 0; }
      sfx('horn'); floatText(on.x, on.y, 4, on.cmd === 'charge' ? 'HÜCUM! (' + army.length + ')' : on.cmd === 'follow' ? 'Ordu sancağı takip ediyor' : 'Ordu kaleyi savunuyor', '#ffd75e', 20);
      if (on.cmd === 'charge') { const t = pickTarget(k, false); if (t) msg('Ordu ' + t.civ.full + ' üzerine yürüyor!', t.civ.css); }
    }
    return;
  }
  // payment
  if (G.buyCd > 0) { G.buyCd -= dt; return; }
  if (on.unit) { if (popOf(k) + UT[on.unit].pop > popCap(k)) return; if (on.job === 'food' && jobCount(k, 'food') >= farmCap(k)) return; }
  G.payT -= dt;
  while (G.payT <= 0) {
    const rem = remaining(on); let r = ['f', 's', 'g'].find(r => rem[r] > 0 && k.res[r] > 0); if (!r) break;
    const amt = Math.min(5, rem[r], Math.floor(k.res[r])); if (amt <= 0) break;
    k.res[r] -= amt; on.paid[r] += amt; G.payT += .035; G.fly.push({ x0: h.x, y0: h.y, x1: on.x, y1: on.y, t: 0, r }); sfx('pay', .45);
  }
  if (G.payT < 0) G.payT = 0;
  const rem = remaining(on);
  if (rem.f <= 0 && rem.s <= 0 && rem.g <= 0 && on.cost) {
    on.paid = { f: 0, s: 0, g: 0 }; sfx('buy'); G.buyCd = .5;
    if (on.unit === 'koylu') { const v = makeUnit(k, 'koylu', k.castle.x, k.castle.y, 'work'); v.job = on.job; v.vs = 'toNode'; floatText(on.x, on.y, 3, '+1 Köylü', '#fff', 15); }
    else if (on.unit) { trainAt(k, on.unit); G.stats.trained++; floatText(on.x, on.y, 3, '+1 ' + on.label, '#fff', 15); }
    else if (on.build) { on.done = true; on.bld = addBld(k, on.build, on.x, on.y, false); if (on.build === 'farm') k.farmSlot++; G.stats.built++; smoke(on.x, on.y, .5, 8, 1.4); sfx('build'); floatText(on.x, on.y, 5, BT[on.build].name + ' inşa ediliyor', '#ffd75e', 16); }
    else if (on.upg) { applyUpgrade(k); h.dmg *= 1.08; on.cost = { f: 60 + 40 * k.upgLv, g: 60 + 40 * k.upgLv }; floatText(on.x, on.y, 3, 'Ordu güçlendi! (' + k.upgLv + ')', '#ffd75e', 18); if (k.upgLv >= 5) on.done = true; }
  }
}

// ================================================================ RENDER SYNC
const mx = new T3.Matrix4(), mB = new T3.Matrix4(), mT = new T3.Matrix4(), mR = new T3.Matrix4(), q = new T3.Quaternion(), v3 = new T3.Vector3(), sc = new T3.Vector3(), YAX = new T3.Vector3(0, 1, 0), FWD = new T3.Vector3(0, 0, 1), eul = new T3.Euler(), dv = new T3.Vector3();
const GOLD_C = new T3.Color(0xffd24a), STONE_C = new T3.Color(0xa9afb5), FOOD_C = new T3.Color(0xe8c35a);
const resCol = r => r === 'g' ? GOLD_C : r === 's' ? STONE_C : FOOD_C;
const civCol = []; for (const c of CIVS) civCol.push(new T3.Color(c.color));
function addBar(x, y, z, w, ratio, col) {
  v3.set(X3(x), z, Z3(y)); mx.compose(v3, camera.quaternion, sc.set(w + .14, 1.4, 1)); P.barBg.add(mx);
  v3.x -= (1 - ratio) * w / 2; mx.compose(v3, camera.quaternion, sc.set(Math.max(.001, w * ratio), 1, 1)); P.barFg.add(mx, col);
}
const LEGOFF = [[-1, 1], [1, 1], [-1, -1], [1, -1]], GAIT = [0, .55, PI, PI + .55];
function drawHorse(u, dt, hs) {
  u.hsp += ((u.moving ? 1 : 0) - u.hsp) * Math.min(1, dt * 6); u.hph += dt * (3 + 10 * u.hsp);
  const p = u.hph, k = u.hsp, t = G.t;
  q.setFromAxisAngle(YAX, u.rot); mx.compose(v3.set(X3(u.x), 0, Z3(u.y)), q, sc.set(hs, hs, hs));
  mT.makeTranslation(0, 1.55 + Math.abs(Math.sin(p)) * .14 * k + Math.sin(t * 2 + u.hph) * .02, 0); mR.makeRotationX(Math.sin(p) * .07 * k);
  mB.multiplyMatrices(mx, mT).multiply(mR);
  const cc = civCol[CIVS.indexOf(u.k.civ)];
  P.hBody.add(mB); P.hCloth.add(mB, cc);
  mT.makeTranslation(0, .3, 1.0); mR.makeRotationX(.62 + Math.sin(p + .8) * .16 * k + Math.sin(t * 1.3) * .03); P.hNeck.add(mx.copy(mB).multiply(mT).multiply(mR));
  mT.makeTranslation(0, .3, -1.22); mR.makeRotationX(.2 + Math.sin(p * .5) * .25 * k + Math.sin(t * 1.7) * .1); P.hTail.add(mx.copy(mB).multiply(mT).multiply(mR));
  for (let i = 0; i < 4; i++) {
    const [sx, sz] = LEGOFF[i], ph = p + GAIT[i], front = sz > 0;
    mT.makeTranslation(sx * .3, -.2, sz * .82); mR.makeRotationX(Math.sin(ph) * .75 * k); const hip = new T3.Matrix4().multiplyMatrices(mB, mT).multiply(mR); P.hUp.add(hip);
    mT.makeTranslation(0, -.72, 0); mR.makeRotationX((front ? 1 : -1) * Math.max(0, Math.sin(ph + (front ? .6 : -.6))) * 1.1 * k); P.hLow.add(mx.copy(hip).multiply(mT).multiply(mR));
  }
  // rider
  mT.makeTranslation(0, .2, .38); mx.copy(mB).multiply(mT); const s = u.obj.scale.x; mx.multiply(mR.makeScale(s, s, s));
  u.obj.matrix.copy(mx); u.obj.matrixWorldNeedsUpdate = true;
}
function sync(dt) {
  for (const k in P) P[k].begin();
  const h = G.hero; CAMP = { x: camTarget.x / K + MC, y: camTarget.z / K + MC };
  for (const u of G.units) {
    const vis = u.role === 'hero' ? G.heroDead <= 0 : Math.abs(u.x - CAMP.x) < 190 && u.y - CAMP.y > -400 && u.y - CAMP.y < 240;
    u.vis = vis; u.obj.visible = vis; if (u.ring) u.ring.visible = vis;
    if (!vis) continue;
    if (u.T.horse) drawHorse(u, dt, u.role === 'hero' ? 1.25 : 1.05);
    else { u.obj.position.set(X3(u.x), 0, Z3(u.y)); u.obj.rotation.y = u.rot; }
    if (u.dying) { const dn = u.role === 'koylu' ? 'Death_A' : 'Death_A'; if (u.curName !== dn) play(u, u.T.horse ? 'Death_A' : dn, true, 1, .1); if (u.dying < .8 && !u.T.horse) u.obj.position.y = -(.8 - u.dying) * 1.6; }
    else if (!(u.atkT > 0)) play(u, u.moving ? runAnim(u) : (u.role === 'koylu' && u.vs === 'work' ? 'Idle' : idleAnim(u)));
    u.mixer.update(dt);
    const f = u.hit > 0 ? .6 : 0; if (f !== u._f) { setFlash(unitMats(u), f); u._f = f; }
    if (u.role === 'hero') { u.ring.position.set(X3(u.x), .12, Z3(u.y)); u.ring.material.opacity = .5 + Math.sin(G.t * 5) * .3; }
    if (alive(u)) {
      const cc = civCol[CIVS.indexOf(u.k.civ)];
      mx.compose(v3.set(X3(u.x), .08, Z3(u.y)), q.identity(), sc.setScalar(u.T.horse ? 1.6 : 1)); P.disc.add(mx, cc);
      if (u.hp < u.maxhp) addBar(u.x, u.y, u.T.horse ? (u.role === 'hero' ? 6.4 : 5.2) : u.T.h + .7, u.T.horse ? 2.4 : 1.6, u.hp / u.maxhp, cc);
      if (u.carry) { q.setFromAxisAngle(YAX, u.rot); mx.compose(v3.set(X3(u.x), 2.75, Z3(u.y)), q, sc.setScalar(1)); P.carry.add(mx, resCol(u.carry === 'gold' ? 'g' : u.carry === 'stone' ? 's' : 'f')); }
    }
  }
  for (const b of G.blds) {
    if (b.hp <= 0) continue;
    const near = Math.abs(b.x - CAMP.x) < 240 && b.y - CAMP.y > -460 && b.y - CAMP.y < 300; b.obj.visible = near; if (!near) continue;
    if (b.mats) setFlash(b.mats, b.hit > 0 ? .45 : 0);
    const cc = civCol[CIVS.indexOf(b.k.civ)];
    if (b.buildT > 0) addBar(b.x, b.y, 5, 3, 1 - b.buildT / 3, GOLD_C);
    else if (b.hp < b.maxhp) addBar(b.x, b.y, b.type === 'castle' ? 20 : b.type === 'tower' ? 11 : 7, 4, b.hp / b.maxhp, cc);
  }
  for (const c of G.coinsArr) { q.setFromAxisAngle(YAX, c.spin); mx.compose(v3.set(X3(c.x), c.z, Z3(c.y)), q, sc.setScalar(1)); P.coin.add(mx); }
  for (const f of G.fly) { const x = f.x0 + (f.x1 - f.x0) * f.t, y = f.y0 + (f.y1 - f.y0) * f.t, z = 2.6 + Math.sin(f.t * PI) * 3; q.setFromAxisAngle(YAX, f.t * 10); mx.compose(v3.set(X3(x), z, Z3(y)), q, sc.setScalar(.8)); if (f.r === 'g') P.coin.add(mx); else P.carry.add(mx, resCol(f.r)); }
  const pos = (p, k, out) => { const x = p.x0 + (p.tx - p.x0) * k, y = p.y0 + (p.ty - p.y0) * k; return out.set(X3(x), p.z0 * (1 - k) + 1.3 * k + p.h * 4 * k * (1 - k), Z3(y)); };
  for (const p of G.proj) { if (!nearCam(p.x0, p.y0) && !nearCam(p.tx, p.ty)) continue; const k = Math.min(1, p.t / p.T); pos(p, k, v3); pos(p, Math.min(1, k + .04), dv); dv.sub(v3); if (dv.lengthSq() < 1e-8) dv.set(0, 0, 1); dv.normalize(); q.setFromUnitVectors(FWD, dv); mx.compose(v3, q, sc.setScalar(1)); P.arrow.add(mx); }
  for (const p of G.parts) {
    const a = 1 - p.t / p.life;
    if (p.pool === 'smoke') { const s = p.r * (1.6 - a * .8) * Math.min(1, a * 3); mx.compose(v3.set(X3(p.x), p.z, Z3(p.y)), q.identity(), sc.setScalar(s)); P.smoke.add(mx); }
    else if (p.pool === 'glow') { const s = p.r * Math.min(1, a * 2.5); mx.compose(v3.set(X3(p.x), p.z, Z3(p.y)), camera.quaternion, sc.setScalar(s)); P.glow.add(mx, p.col); }
    else { const s = Math.min(1, a * 2) * p.r; q.setFromEuler(eul.set(p.rot, p.rot * .7, 0)); mx.compose(v3.set(X3(p.x), p.z, Z3(p.y)), q, sc.setScalar(s)); P.spark.add(mx, p.col || WHITE); }
  }
  for (const k in P) P[k].end();
  const pk = G.pk;
  for (const p of G.pads) { const st = padState(p, pk) === 'show' && pk.alive; p.mesh.visible = st; if (!st) continue; if (!nearCam(p.x, p.y)) continue; drawPad(p, pk); const s = G.onPad === p ? 1 + Math.sin(G.t * 10) * .03 : 1; p.mesh.scale.set(s, 1, s); }
  const fx = G.heroDead > 0 ? pk.x : h.x, fy = G.heroDead > 0 ? pk.y : h.y;
  const kk = Math.min(1, dt * 5);
  camTarget.x += (X3(fx) - camTarget.x) * kk; camTarget.z += (Z3(fy) - 5 - camTarget.z) * kk;
  camera.position.copy(camTarget).addScaledVector(CAMDIR, camDist * DBG.zoom);
  if (G.shake > 0) { camera.position.x += (Math.random() - .5) * G.shake * 2; camera.position.y += (Math.random() - .5) * G.shake * 2; }
  camera.lookAt(camTarget);
  sun.position.copy(camTarget).add(SUNOFF); sun.target.position.copy(camTarget); sun.target.updateMatrixWorld();
  syncFloats(); drawMini();
}

// ================================================================ DOM
const $ = id => document.getElementById(id);
const fxLayer = $('fx'), ftPool = [];
function syncFloats() {
  let i = 0;
  for (const f of G.floats) {
    let el = ftPool[i]; if (!el) { el = document.createElement('div'); el.className = 'ft'; fxLayer.appendChild(el); ftPool[i] = el; }
    v3.set(X3(f.x), f.z + f.t * 3, Z3(f.y)).project(camera);
    if (v3.z > 1 || Math.abs(v3.x) > 1.2 || Math.abs(v3.y) > 1.2) { el.style.display = 'none'; i++; continue; }
    const x = (v3.x + 1) / 2 * innerWidth, y = (1 - v3.y) / 2 * innerHeight, a = Math.min(1, (1.4 - f.t) * 2);
    if (el._t !== f.txt) { el.textContent = f.txt; el._t = f.txt; }
    el.style.color = f.c; el.style.fontSize = f.size + 'px'; el.style.opacity = a; el.style.display = 'block';
    el.style.transform = 'translate(' + (x - el.offsetWidth / 2) + 'px,' + y + 'px)'; i++;
  }
  for (; i < ftPool.length; i++) ftPool[i].style.display = 'none';
}
const mini = $('mini'), mctx = mini.getContext('2d'); let miniT = 0;
function drawMini() {
  miniT -= 1; if (miniT > 0) return; miniT = 6;
  const S = mini.width, sc_ = S / MW; mctx.clearRect(0, 0, S, S);
  mctx.fillStyle = 'rgba(40,60,30,.75)'; mctx.beginPath(); mctx.arc(S / 2, S / 2, R_PLAY * sc_, 0, 7); mctx.fill();
  mctx.strokeStyle = 'rgba(255,255,255,.5)'; mctx.lineWidth = 2; mctx.stroke();
  for (const k of G.ks) { mctx.globalAlpha = k.alive ? .35 : .12; mctx.fillStyle = k.civ.css; mctx.beginPath(); mctx.arc(k.x * sc_, k.y * sc_, 300 * sc_, 0, 7); mctx.fill(); mctx.globalAlpha = 1; if (k.alive) { mctx.fillStyle = k.civ.css; mctx.fillRect(k.x * sc_ - 4, k.y * sc_ - 4, 8, 8); mctx.strokeStyle = '#fff'; mctx.lineWidth = 1; mctx.strokeRect(k.x * sc_ - 4, k.y * sc_ - 4, 8, 8); } }
  for (const u of G.units) { if (!alive(u) || u.role === 'koylu' || u.role === 'hero') continue; mctx.fillStyle = u.k.civ.css; mctx.fillRect(u.x * sc_ - 1, u.y * sc_ - 1, 2.5, 2.5); }
  if (G.heroDead <= 0) { mctx.fillStyle = '#fff'; mctx.beginPath(); mctx.arc(G.hero.x * sc_, G.hero.y * sc_, 3.5, 0, 7); mctx.fill(); mctx.strokeStyle = '#000'; mctx.lineWidth = 1; mctx.stroke(); }
}
let lastHud = '';
function hintText() {
  if (!G) return '';
  if (G.heroDead > 0) return 'Paşa kalede iyileşiyor… ' + Math.ceil(G.heroDead);
  if (!G.moved) return 'Ekranı sürükle, atlı Paşa\'yı yönet';
  const pk = G.pk;
  if (G.t < 60 && G.stats.built === 0) return 'Alanlara git: ÇİFTÇİ, ALTINCI, TAŞÇI köylü al; EV ile nüfusu artır';
  if (!hasBld(pk, 'barracks') && G.t < 150) return 'KIŞLA kur, piyade yetiştir';
  if (G.t < G.peace) return '';
  if (G.armyMode === 'rally' && armyOf(pk).length >= 8 && G.t > G.peace + 20) return 'SANCAĞA alanı: ordun seni takip etsin, istilaya çık!';
  return '';
}
function fmt(n) { return n >= 10000 ? (n / 1000).toFixed(0) + 'k' : String(Math.floor(n)); }
function hud(force) {
  const pk = G.pk, peaceLeft = Math.max(0, Math.ceil(G.peace - G.t));
  const s = [fmt(pk.res.f), fmt(pk.res.s), fmt(pk.res.g), popOf(pk), popCap(pk), peaceLeft, hintText(), G.msgs.map(m => m.text).join(), G.ks.map(k => k.alive).join()].join('|');
  if (s === lastHud && !force) return; lastHud = s;
  $('rf').textContent = fmt(pk.res.f); $('rs').textContent = fmt(pk.res.s); $('rg').textContent = fmt(pk.res.g); $('rp').textContent = popOf(pk) + '/' + popCap(pk);
  $('lv').textContent = pk.civ.name + ' · Sefer ' + G.level; $('badge').style.background = 'linear-gradient(180deg,' + pk.civ.css + ',#1d1d22)';
  const st = $('status');
  if (peaceLeft > 0) { st.textContent = '🕊 Barış: ' + Math.floor(peaceLeft / 60) + ':' + String(peaceLeft % 60).padStart(2, '0'); st.className = 'peace'; }
  else { st.textContent = '⚔ İstila dönemi · ' + G.ks.filter(k => k.alive).length + ' krallık'; st.className = 'war'; }
  $('hint').textContent = hintText();
  $('feed').innerHTML = G.msgs.map(m => '<div style="color:' + m.color + '">' + m.text + '</div>').join('');
}
const joyEl = $('joy'), knob = $('knob');
canvas.addEventListener('pointerdown', e => { initAudio(); if (joy) return; joy = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (_) { } joyEl.style.display = 'block'; joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px'; knob.style.transform = ''; e.preventDefault(); });
canvas.addEventListener('pointermove', e => {
  if (!joy || e.pointerId !== joy.id) return; joy.x = e.clientX; joy.y = e.clientY;
  let dx = joy.x - joy.sx, dy = joy.y - joy.sy; const m = Math.hypot(dx, dy);
  if (m > 70) { joy.sx = joy.x - dx / m * 70; joy.sy = joy.y - dy / m * 70; joyEl.style.left = joy.sx + 'px'; joyEl.style.top = joy.sy + 'px'; dx = joy.x - joy.sx; dy = joy.y - joy.sy; }
  const mm = Math.hypot(dx, dy), kk = mm > 40 ? 40 / mm : 1; knob.style.transform = 'translate(' + dx * kk + 'px,' + dy * kk + 'px)';
});
const endJoy = e => { if (joy && e.pointerId === joy.id) { joy = null; joyEl.style.display = 'none'; } };
canvas.addEventListener('pointerup', endJoy); canvas.addEventListener('pointercancel', endJoy);
addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); initAudio(); });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => { keys.clear(); joy = null; joyEl.style.display = 'none'; });
function syncAudioBtns() { const s = audioState(); $('music').classList.toggle('off', !s.musicOn); $('mute').classList.toggle('off', !s.sfxOn); }
$('music').addEventListener('click', () => { initAudio(); setMusic(!audioState().musicOn); syncAudioBtns(); });
$('mute').addEventListener('click', () => { initAudio(); setSfx(!audioState().sfxOn); syncAudioBtns(); });
syncAudioBtns();

function showMenu() {
  const cards = CIVS.map((c, i) => '<button class="civ' + (i === chosenCiv ? ' sel' : '') + '" data-i="' + i + '" style="--c:' + c.css + '"><b>' + c.full + '</b><span>' + c.bonus + '</span></button>').join('');
  $('card').innerHTML = '<h1>AKINCI</h1><h2>BEŞ KRALLIK</h2><p class="lead">Medeniyetini seç. Barış döneminde köylülerinle tarla, taş ve altın işle; evler kur, ordu yetiştir. Barış bitince dört krallık birbirini istila eder. Son kalan kazanır.</p><div class="civs">' + cards + '</div>' +
    '<button class="btn" id="b1">Sefere Başla · Sefer ' + best + '</button>' + (best > 1 ? '<button class="btn alt" id="b2">Kolaydan Başla (Sefer 1)</button>' : '');
  $('ov').classList.remove('hide');
  for (const el of document.querySelectorAll('.civ')) el.onclick = () => { chosenCiv = +el.dataset.i; try { localStorage.setItem('akinci2_civ', String(chosenCiv)); } catch (e) { } showMenu(); };
  $('b1').onclick = () => start(best); if ($('b2')) $('b2').onclick = () => start(1);
}
function start(level) { initAudio(); newGame(level, chosenCiv); $('ov').classList.add('hide'); running = true; }
function showEnd() {
  if (G.over === 'win') {
    const next = G.level + 1; if (next > best) { best = next; try { localStorage.setItem('akinci2_lv', String(best)); } catch (e) { } }
    $('card').innerHTML = '<h1 style="font-size:40px">CİHAN HAKİMİ!</h1><h2>' + G.pk.civ.full.toLocaleUpperCase('tr') + '</h2><p>Dört krallık da senin bayrağın altında. Sıradaki sefer daha çetin: rakipler daha hızlı gelişip daha erken saldıracak.</p><button class="btn" id="b1">Sefer ' + next + ' →</button><button class="btn alt" id="b2">Ana Menü</button>';
    $('ov').classList.remove('hide'); $('b1').onclick = () => start(next); $('b2').onclick = showMenu;
  } else {
    $('card').innerHTML = '<h1 style="font-size:34px;color:#b5232a;text-shadow:0 3px 0 #f2c0c2">KALEN DÜŞTÜ</h1><h2>' + G.pk.civ.full.toLocaleUpperCase('tr') + '</h2><p>Barış döneminde ekonomiyi büyüt (köylü + ev), kuleleri ve okçuları erken kur, ordunu SANCAĞA ile yönet.</p><button class="btn" id="b1">Tekrar Dene</button><button class="btn alt" id="b2">Ana Menü</button>';
    $('ov').classList.remove('hide'); $('b1').onclick = () => start(G.level); $('b2').onclick = showMenu;
  }
}

// ================================================================ BOOT
let uid = 0; const _push = Array.prototype.push;
export async function boot() {
  const bar = $('loadbar');
  await loadAll(p => { if (bar) bar.style.width = Math.round(p * 100) + '%'; });
  makePools(); buildWorld();
  newGame(best, chosenCiv);
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    for (const u of G.units) if (u.id_ === undefined) u.id_ = uid++;
    if (G && running && !document.hidden) update(dt);
    if (G) sync(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  $('load').style.display = 'none';
  showMenu();
  requestAnimationFrame(loop);
  window.__akinci = { get G() { return G; }, start, update: d => { for (const u of G.units) if (u.id_ === undefined) u.id_ = uid++; update(d); }, sync: d => sync(d), render: () => renderer.render(scene, camera), camera, scene, DBG, THREE: T3, setCiv: i => { chosenCiv = i; }, renderMusic };
}
