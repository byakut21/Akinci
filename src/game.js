/* Akıncı: Sınır Boyu — 3D (Three.js r158) */
'use strict';
(function () {
const T = THREE;
// ================================================================ WORLD CONSTANTS
// Game logic runs on a 2D plane in "px" units (x across, y toward the player's base).
// 3D: X = (x-CX)*K, Z = y*K, Y = up.
const K = 0.1, W = 440, CX = 220, H = 1510, CAP = 80;
const L = y => 32 + 16 * Math.sin(y / 240 + .5);
const R = y => W - 32 + 14 * Math.sin(y / 210 + 2);
const clampX = (x, y, r) => Math.max(L(y) + r, Math.min(R(y) - r, x));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const X3 = x => (x - CX) * K, Z3 = y => y * K;
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const UT = {
  inf: { hp: 40, dmg: 9, range: 14, cd: .8, spd: 60, r: 8.5, bounty: 2 },
  arc: { hp: 28, dmg: 7, range: 135, cd: 1.15, spd: 56, r: 8.5, bounty: 3 },
  can: { hp: 95, dmg: 30, range: 185, cd: 2.6, spd: 38, r: 13, splash: 38, bounty: 6 },
  hero: { hp: 170, dmg: 17, range: 18, cd: .5, spd: 150, r: 12 }
};
const BT = {
  ehq: { hp: 1300, r: 52, bounty: 40 },
  tower: { hp: 420, r: 22, range: 175, dmg: 8, cd: 1.0, bounty: 12 },
  ctower: { hp: 520, r: 26, range: 210, dmg: 22, cd: 2.8, splash: 36, bounty: 16 },
  otag: { hp: 1000, r: 42 },
  kisla: { hp: 420, r: 30 },
  otower: { hp: 380, r: 22, range: 175, dmg: 9, cd: .95 }
};
const AREA = { enemyRallyY: 405, border: 1080, rallyY: 1140, attackPad: 1108 };

// ================================================================ RENDERER
const canvas = document.getElementById('c');
const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new T.Scene();
const SKY = 0xcfe3ee;
scene.background = new T.Color(SKY);
scene.fog = new T.Fog(SKY, 160, 330);
const camera = new T.PerspectiveCamera(42, 1, 1, 700);
const CAMDIR = new T.Vector3(0, .76, .65).normalize();
const US = 1.5; // unit visual scale
let camDist = 120;
const hemi = new T.HemisphereLight(0xeaf5ff, 0x7a6a48, 1.05); scene.add(hemi);
const sun = new T.DirectionalLight(0xfff0d6, 2.5);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 80, bottom: -80, near: 1, far: 260 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
scene.add(sun, sun.target);
const SUNOFF = new T.Vector3(-34, 70, 26);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const tan = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
  camDist = Math.max(45 / (2 * tan * camera.aspect), 66);
  scene.fog.near = camDist * 1.15; scene.fog.far = camDist * 2.6;
  camera.far = camDist * 3; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ================================================================ GEOMETRY HELPERS
const C = {
  TEAL: 0x14a39a, TEAL_D: 0x0b6c66, TEAL_L: 0x2fc7bd, GOLD: 0xe3a62c, SKIN: 0xf0c39a, WHITE: 0xf7f2e6,
  CRIM: 0xb8282f, CRIM_D: 0x761a20, STEEL: 0x9aa3ab, WOOD: 0x7a4d22, WOOD_D: 0x4f3015, DARK: 0x2a2522,
  GREEN: 0x2f8f5b, GREEN_D: 0x1f6b44, STONE: 0xa7acb2, STONE_D: 0x7f858c, STONE_L: 0xc6c9cd, BRONZE: 0xb8862b,
  IRON: 0x4b4f55, SAND: 0xe9dcc0, MUSTACHE: 0x3a2416
};
const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _v = new T.Vector3(), _s = new T.Vector3(1, 1, 1);
function part(geo, color, pos, rot, scale) { return { geo, color, pos: pos || [0, 0, 0], rot: rot || [0, 0, 0], scale: scale || [1, 1, 1] }; }
function merge(parts) {
  const P = [], N = [], Cc = [];
  for (const p of parts) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    _e.set(p.rot[0], p.rot[1], p.rot[2]); _q.setFromEuler(_e);
    _m.compose(_v.set(p.pos[0], p.pos[1], p.pos[2]), _q, _s.set(p.scale[0], p.scale[1], p.scale[2]));
    g.applyMatrix4(_m);
    const pa = g.attributes.position.array, na = g.attributes.normal.array;
    const ca = g.attributes.color ? g.attributes.color.array : null;
    const col = new T.Color(p.color);
    for (let i = 0; i < pa.length; i++) { P.push(pa[i]); N.push(na[i]); }
    for (let i = 0; i < pa.length / 3; i++) { if (ca) Cc.push(ca[i * 3], ca[i * 3 + 1], ca[i * 3 + 2]); else Cc.push(col.r, col.g, col.b); }
  }
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
  out.setAttribute('color', new T.Float32BufferAttribute(Cc, 3));
  out.computeBoundingSphere();
  return out;
}
function stripes(geo, segs, c1, c2) { // alternate colours around a cylinder/cone
  const g = geo.toNonIndexed(), pa = g.attributes.position.array, cols = [];
  const a = new T.Color(c1), b = new T.Color(c2);
  for (let i = 0; i < pa.length; i += 9) {
    const cx = (pa[i] + pa[i + 3] + pa[i + 6]) / 3, cz = (pa[i + 2] + pa[i + 5] + pa[i + 8]) / 3;
    const ang = Math.atan2(cz, cx) + Math.PI; const k = Math.floor(ang / (Math.PI * 2) * segs) % 2;
    const c = k ? a : b; for (let j = 0; j < 3; j++) cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
  return g;
}
const Box = (w, h, d) => new T.BoxGeometry(w, h, d);
const Cyl = (rt, rb, h, s) => new T.CylinderGeometry(rt, rb, h, s || 12);
const Sph = (r, w, h) => new T.SphereGeometry(r, w || 14, h || 10);
const Cone = (r, h, s) => new T.ConeGeometry(r, h, s || 12);
const Cap = (r, l, s) => new T.CapsuleGeometry(r, l, 4, s || 10);
const PI = Math.PI;

const matVC = new T.MeshStandardMaterial({ vertexColors: true, roughness: .72, metalness: .05 });
const matVCflat = new T.MeshStandardMaterial({ vertexColors: true, roughness: .9, metalness: 0, flatShading: true });
const matVCmetal = new T.MeshStandardMaterial({ vertexColors: true, roughness: .38, metalness: .55 });

// ---------------- unit models (front = +Z, weapon hand = +X)
function bodyInf0() {
  return merge([
    part(Cap(.34, .46), C.TEAL, [0, 1.2, 0]),
    part(Cyl(.37, .37, .13, 14), C.GOLD, [0, 1.0, 0]),
    part(Cyl(.36, .42, .35, 14), C.TEAL_D, [0, .82, 0]),
    part(Cap(.1, .42, 6), C.TEAL_D, [.44, 1.25, .05], [0, 0, .25]),
    part(Cap(.1, .42, 6), C.TEAL_D, [-.44, 1.25, .05], [0, 0, -.25]),
    part(Sph(.28), C.SKIN, [0, 1.93, 0]),
    part(Box(.28, .06, .07), C.MUSTACHE, [0, 1.86, .26]),
    part(Cyl(.21, .27, .74, 12), C.WHITE, [0, 2.46, -.03], [-.15, 0, 0]),
    part(Cyl(.295, .295, .12, 14), C.GOLD, [0, 2.13, 0]),
    part(Box(.34, .64, .07), C.WHITE, [0, 2.16, -.34], [.35, 0, 0]),
    part(Box(.08, .22, .05), C.GOLD, [0, 2.33, .25])
  ]);
}
function bodyArc0() {
  return merge([
    part(Cap(.33, .44), C.GREEN, [0, 1.2, 0]),
    part(Cyl(.36, .36, .12, 14), C.GOLD, [0, 1.0, 0]),
    part(Cap(.1, .42, 6), C.GREEN_D, [.44, 1.25, .05], [0, 0, .25]),
    part(Cap(.1, .42, 6), C.GREEN_D, [-.44, 1.25, .05], [0, 0, -.25]),
    part(Sph(.28), C.SKIN, [0, 1.93, 0]),
    part(Box(.28, .06, .07), C.MUSTACHE, [0, 1.86, .26]),
    part(Cone(.31, .66, 12), C.GREEN_D, [0, 2.38, 0]),
    part(Cyl(.12, .12, .78, 8), C.WOOD, [.12, 1.45, -.33], [.35, 0, -.2]),
    part(Box(.06, .2, .06), C.WHITE, [.2, 1.9, -.47], [.35, 0, -.2])
  ]);
}
function bodyInf1() {
  return merge([
    part(Cap(.35, .46), C.CRIM, [0, 1.2, 0]),
    part(Cyl(.38, .38, .12, 14), C.DARK, [0, 1.0, 0]),
    part(Cyl(.37, .44, .35, 14), C.CRIM_D, [0, .82, 0]),
    part(Cap(.1, .42, 6), C.CRIM_D, [.44, 1.25, .05], [0, 0, .25]),
    part(Cap(.1, .42, 6), C.CRIM_D, [-.44, 1.25, .05], [0, 0, -.25]),
    part(Sph(.28), C.SKIN, [0, 1.93, 0]),
    part(new T.SphereGeometry(.33, 14, 8, 0, PI * 2, 0, PI / 2), C.STEEL, [0, 1.98, 0]),
    part(Box(.05, .2, .05), C.STEEL, [0, 1.9, .31]),
    part(Box(.07, .34, .38), 0xd23a3f, [0, 2.4, -.02]),
    part(Cyl(.42, .42, .08, 18), C.CRIM_D, [-.52, 1.25, .14], [0, 0, PI / 2]),
    part(Sph(.11, 8, 6), C.GOLD, [-.57, 1.25, .14])
  ]);
}
function bodyArc1() {
  return merge([
    part(Cap(.33, .44), C.CRIM, [0, 1.2, 0]),
    part(Cyl(.36, .36, .12, 14), C.DARK, [0, 1.0, 0]),
    part(Cap(.1, .42, 6), C.CRIM_D, [.44, 1.25, .05], [0, 0, .25]),
    part(Cap(.1, .42, 6), C.CRIM_D, [-.44, 1.25, .05], [0, 0, -.25]),
    part(Sph(.28), C.SKIN, [0, 1.93, 0]),
    part(Cone(.31, .62, 12), 0x5c1a1e, [0, 2.36, 0]),
    part(Cyl(.12, .12, .78, 8), C.WOOD, [.12, 1.45, -.33], [.35, 0, -.2])
  ]);
}
function bodyCan(team) {
  return merge([
    part(Box(.95, .36, 1.7), C.WOOD, [0, .58, 0]),
    part(Cyl(.44, .44, .14, 16), C.WOOD_D, [.58, .44, .25], [0, 0, PI / 2]),
    part(Cyl(.44, .44, .14, 16), C.WOOD_D, [-.58, .44, .25], [0, 0, PI / 2]),
    part(Cyl(.12, .12, .2, 8), C.GOLD, [.66, .44, .25], [0, 0, PI / 2]),
    part(Cyl(.12, .12, .2, 8), C.GOLD, [-.66, .44, .25], [0, 0, PI / 2]),
    part(Box(.97, .1, .32), team ? C.CRIM : C.TEAL, [0, .8, -.55]),
    part(Box(.2, .2, .8), C.WOOD_D, [0, .25, -.95], [-.4, 0, 0])
  ]);
}
const legGeo = (() => { const g = Box(.22, .74, .26); g.translate(0, -.37, 0); return g; })();
const spearGeo = merge([part(Cyl(.03, .03, 2.5, 6), C.WOOD, [0, .55, 0]), part(Cone(.075, .3, 6), 0xd8dde2, [0, 1.95, 0])]);
const swordGeo = merge([part(Box(.08, .95, .025), 0xdfe4e8, [0, .62, 0]), part(Box(.3, .06, .07), C.GOLD, [0, .14, 0]), part(Cyl(.04, .04, .24, 6), C.DARK, [0, .02, 0])]);
const bowGeo = merge([part(new T.TorusGeometry(.6, .035, 6, 18, PI), C.WOOD_D, [0, 0, 0], [0, -PI / 2, -PI / 2]), part(Cyl(.01, .01, 1.2, 4), 0xffffff, [0, 0, 0])]);
const barrelGeo = (team) => merge([part(Cyl(.17, .23, 1.8, 14), team ? C.IRON : C.BRONZE, [0, 0, .5], [PI / 2, 0, 0]), part(Cyl(.25, .25, .16, 14), team ? 0x34373b : 0x8d6418, [0, 0, 1.35], [PI / 2, 0, 0]), part(Sph(.24, 10, 8), team ? C.IRON : C.BRONZE, [0, 0, -.42])]);

// ================================================================ INSTANCE POOLS
const WHITE_C = new T.Color(1, 1, 1);
class Pool {
  constructor(geo, mat, cap, shadow = true) {
    this.m = new T.InstancedMesh(geo, mat, cap);
    this.m.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.m.castShadow = shadow; this.m.receiveShadow = false; this.m.frustumCulled = false;
    this.m.setColorAt(0, WHITE_C); this.m.count = 0;
    this.cap = cap; this.n = 0; scene.add(this.m);
  }
  begin() { this.n = 0; }
  add(mtx, col) { if (this.n >= this.cap) return; this.m.setMatrixAt(this.n, mtx); this.m.setColorAt(this.n, col || WHITE_C); this.n++; }
  end() { this.m.count = this.n; this.m.instanceMatrix.needsUpdate = true; this.m.instanceColor.needsUpdate = true; }
}
const pools = {
  inf0: new Pool(bodyInf0(), matVC, 120), inf1: new Pool(bodyInf1(), matVC, 120),
  arc0: new Pool(bodyArc0(), matVC, 80), arc1: new Pool(bodyArc1(), matVC, 60),
  can0: new Pool(bodyCan(0), matVC, 30), can1: new Pool(bodyCan(1), matVC, 20),
  barrel0: new Pool(barrelGeo(0), matVCmetal, 30), barrel1: new Pool(barrelGeo(1), matVCmetal, 20),
  leg0: new Pool(legGeo, new T.MeshStandardMaterial({ color: 0x0d4f4a, roughness: .8 }), 420),
  leg1: new Pool(legGeo, new T.MeshStandardMaterial({ color: 0x3b2a26, roughness: .8 }), 360),
  spear: new Pool(spearGeo, matVC, 220), sword: new Pool(swordGeo, matVCmetal, 160), bow: new Pool(bowGeo, matVC, 140)
};
const coinPool = new Pool((() => { const g = Cyl(.34, .34, .1, 18); g.rotateX(PI / 2); return g; })(),
  new T.MeshStandardMaterial({ color: 0xf5b81e, roughness: .28, metalness: .65, emissive: 0x6a4500, emissiveIntensity: .55 }), 500);
const arrowPool = new Pool(merge([part(Cyl(.03, .03, 1.2, 5), C.WOOD, [0, 0, 0], [PI / 2, 0, 0]), part(Cone(.07, .22, 5), 0xd8dde2, [0, 0, .7], [PI / 2, 0, 0]), part(Box(.16, .02, .2), 0xffffff, [0, 0, -.5])]), matVC, 240, false);
const ballPool = new Pool(Sph(.26, 10, 8), new T.MeshStandardMaterial({ color: 0x222428, roughness: .4, metalness: .6 }), 80, false);
const sparkPool = new Pool(Box(.2, .2, .2), new T.MeshBasicMaterial({ color: 0xffffff }), 500, false);
const smokePool = new Pool(new T.IcosahedronGeometry(.6, 1), new T.MeshLambertMaterial({ color: 0xeeeeee, transparent: true, opacity: .55, depthWrite: false }), 260, false);
const barGeo = new T.PlaneGeometry(1, .24);
const barBg = new Pool(barGeo, new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .55, depthTest: false, depthWrite: false }), 300, false);
const barFg = new Pool(barGeo, new T.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false }), 300, false);
barBg.m.renderOrder = 10; barFg.m.renderOrder = 11;

// ================================================================ GROUND & SCENERY
const GX0 = -330, GX1 = 770, GY0 = -360, GY1 = 1880, GS = 1.25;
function buildGround() {
  const tw = Math.round((GX1 - GX0) * GS), th = Math.round((GY1 - GY0) * GS);
  const cv = document.createElement('canvas'); cv.width = tw; cv.height = th;
  const g = cv.getContext('2d');
  const tx = x => (x - GX0) * GS, ty = y => (y - GY0) * GS;
  const grd = g.createLinearGradient(0, 0, 0, th); grd.addColorStop(0, '#6f9447'); grd.addColorStop(.5, '#7aa24f'); grd.addColorStop(1, '#6c9a4a');
  g.fillStyle = grd; g.fillRect(0, 0, tw, th);
  seed = 99;
  const greens = ['#5f8a3c', '#86b05a', '#6d9a45', '#93ba62', '#557f36'];
  for (let i = 0; i < 70000; i++) { g.fillStyle = greens[i % 5]; g.globalAlpha = .28; const x = rnd() * tw, y = rnd() * th; g.fillRect(x, y, 2 + rnd() * 3, 1.5 + rnd() * 4); }
  for (let i = 0; i < 260; i++) { g.globalAlpha = .12; g.fillStyle = rnd() < .5 ? '#4f7a32' : '#9cc46c'; g.beginPath(); g.ellipse(rnd() * tw, rnd() * th, 30 + rnd() * 90, 20 + rnd() * 60, rnd() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  // road
  const road = new Path2D(); road.moveTo(tx(L(GY0)), ty(GY0));
  for (let y = GY0; y <= GY1; y += 10) road.lineTo(tx(L(y) - 6), ty(y));
  for (let y = GY1; y >= GY0; y -= 10) road.lineTo(tx(R(y) + 6), ty(y));
  road.closePath();
  g.save(); g.shadowColor = 'rgba(70,52,22,.55)'; g.shadowBlur = 26; g.fillStyle = '#cdb383'; g.fill(road); g.restore();
  g.save(); g.clip(road);
  const tans = ['#b99d6c', '#dcc595', '#c4a873', '#e6d3a6', '#a88d5f'];
  for (let i = 0; i < 60000; i++) { const y = GY0 + rnd() * (GY1 - GY0), x = L(y) - 8 + rnd() * (R(y) - L(y) + 16); g.globalAlpha = .22; g.fillStyle = tans[i % 5]; g.fillRect(tx(x), ty(y), 2 + rnd() * 4, 1.5 + rnd() * 3); }
  g.globalAlpha = .18; g.strokeStyle = '#8c7248'; g.lineWidth = 9;
  for (const off of [-70, -50, 50, 70]) { g.beginPath(); for (let y = GY0; y <= GY1; y += 12) { const x = CX + off + 6 * Math.sin(y / 90); y === GY0 ? g.moveTo(tx(x), ty(y)) : g.lineTo(tx(x), ty(y)); } g.stroke(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 900; i++) { const y = GY0 + rnd() * (GY1 - GY0), x = L(y) + rnd() * (R(y) - L(y)); const r = 1.5 + rnd() * 3.5; g.fillStyle = rnd() < .5 ? '#9e9a92' : '#bab5aa'; g.beginPath(); g.ellipse(tx(x), ty(y), r * GS, r * .7 * GS, rnd() * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(tx(x) - r, ty(y) + r * .6, r * 2, 1.5); }
  // camp areas
  const camp = (y, col) => { const r = g.createRadialGradient(tx(CX), ty(y), 10, tx(CX), ty(y), 260); r.addColorStop(0, col); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, ty(y - 300), tw, 600 * GS); };
  camp(1330, 'rgba(255,240,205,.35)'); camp(220, 'rgba(120,110,100,.22)');
  g.restore();
  // grass tufts over road edge
  for (let y = GY0; y <= GY1; y += 4) for (const side of [0, 1]) {
    const x = side ? R(y) + 4 : L(y) - 4; g.strokeStyle = rnd() < .5 ? '#5d8a3a' : '#7fae51'; g.lineWidth = 2; g.beginPath();
    const bx = tx(x + (rnd() - .5) * 14), by = ty(y); g.moveTo(bx, by); g.lineTo(bx + (rnd() - .5) * 6, by - 5 - rnd() * 7); g.stroke();
  }
  // border lines
  g.setLineDash([26, 18]); g.lineWidth = 7;
  g.strokeStyle = 'rgba(20,163,154,.75)'; g.beginPath(); g.moveTo(tx(L(AREA.border)), ty(AREA.border)); g.lineTo(tx(R(AREA.border)), ty(AREA.border)); g.stroke();
  g.strokeStyle = 'rgba(190,40,48,.7)'; g.beginPath(); g.moveTo(tx(L(480)), ty(480)); g.lineTo(tx(R(480)), ty(480)); g.stroke();
  g.setLineDash([]);
  const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const geo = new T.PlaneGeometry((GX1 - GX0) * K, (GY1 - GY0) * K); geo.rotateX(-PI / 2);
  const mesh = new T.Mesh(geo, new T.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }));
  mesh.position.set(X3((GX0 + GX1) / 2), 0, Z3((GY0 + GY1) / 2)); mesh.receiveShadow = true; scene.add(mesh);
}
function buildScenery() {
  seed = 4242;
  const tree = merge([
    part(Cyl(.22, .32, 1.6, 7), 0x6b4423, [0, .8, 0]),
    part(new T.IcosahedronGeometry(1.5, 0), 0x3f7d34, [0, 2.4, 0]),
    part(new T.IcosahedronGeometry(1.15, 0), 0x4d9140, [.5, 3.3, .2]),
    part(new T.IcosahedronGeometry(.95, 0), 0x5aa24a, [-.4, 3.9, -.2])
  ]);
  const pine = merge([
    part(Cyl(.18, .25, 1.2, 6), 0x5b3a1d, [0, .6, 0]),
    part(Cone(1.5, 2.2, 7), 0x2f6b3a, [0, 2.0, 0]), part(Cone(1.15, 1.8, 7), 0x377a42, [0, 3.0, 0]), part(Cone(.75, 1.4, 7), 0x3f874a, [0, 3.9, 0])
  ]);
  const rock = merge([part(new T.DodecahedronGeometry(1, 0), 0x9a978f, [0, .3, 0], [0, 0, 0], [1, .65, .9])]);
  const bush = merge([part(new T.IcosahedronGeometry(.8, 0), 0x4c8a3b, [0, .45, 0], [0, 0, 0], [1, .75, 1]), part(new T.IcosahedronGeometry(.55, 0), 0x63a34c, [.5, .5, .2])]);
  const place = (geo, n, test, smin, smax, shadow) => {
    const im = new T.InstancedMesh(geo, matVCflat, n); im.castShadow = shadow; im.receiveShadow = false;
    let c = 0, tries = 0;
    while (c < n && tries < n * 30) {
      tries++; const y = GY0 + rnd() * (GY1 - GY0), x = GX0 + rnd() * (GX1 - GX0);
      if (!test(x, y)) continue;
      const s = smin + rnd() * (smax - smin);
      _q.setFromEuler(_e.set(0, rnd() * PI * 2, 0)); _m.compose(_v.set(X3(x), 0, Z3(y)), _q, _s.set(s, s * (.85 + rnd() * .3), s));
      im.setMatrixAt(c++, _m);
    }
    im.count = c; scene.add(im);
  };
  const outside = (m) => (x, y) => x < L(y) - m || x > R(y) + m;
  place(tree, 260, outside(28), .9, 1.6, true);
  place(pine, 220, outside(34), .9, 1.7, true);
  place(rock, 90, (x, y) => (x < L(y) - 10 && x > L(y) - 120) || (x > R(y) + 10 && x < R(y) + 120), .5, 1.6, true);
  place(bush, 170, (x, y) => (x < L(y) - 4 && x > L(y) - 40) || (x > R(y) + 4 && x < R(y) + 40), .7, 1.3, false);
  // border banners
  for (const [y, col] of [[AREA.border, C.TEAL], [480, C.CRIM]]) for (const x of [L(y) + 4, R(y) - 4]) scene.add(makeBanner(x, y, col, 1.2));
}
const flags = [];
function makeFlag(col, w, h) {
  const geo = new T.PlaneGeometry(w, h, 10, 3); geo.translate(w / 2, 0, 0);
  const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color: col, side: T.DoubleSide, roughness: .8 }));
  m.castShadow = true; m.userData.base = geo.attributes.position.array.slice(); m.userData.ph = flags.length * 1.7; flags.push(m); return m;
}
function makeBanner(x, y, col, s) {
  const g = new T.Group();
  const pole = new T.Mesh(Cyl(.06, .08, 5, 6), new T.MeshStandardMaterial({ color: C.WOOD_D })); pole.position.y = 2.5; pole.castShadow = true;
  const top = new T.Mesh(Sph(.16, 8, 6), new T.MeshStandardMaterial({ color: C.GOLD, metalness: .6, roughness: .3 })); top.position.y = 5.05;
  const f = makeFlag(col, 2.0, 1.2); f.position.set(0, 4.3, 0);
  g.add(pole, top, f); g.position.set(X3(x), 0, Z3(y)); g.scale.setScalar(s || 1); return g;
}

// ================================================================ BUILDINGS
function M(color, opts) { return new T.MeshStandardMaterial(Object.assign({ color, roughness: .8, metalness: .02 }, opts || {})); }
function add(g, geo, mat, x, y, z, rx, ry, rz) { const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; }
function crenels(g, mat, r, y, n, size) { for (let i = 0; i < n; i++) { const a = i / n * PI * 2; add(g, Box(size, size * 1.1, size), mat, Math.cos(a) * r, y, Math.sin(a) * r, 0, -a, 0); } }
function buildModel(type) {
  const g = new T.Group(); g.userData.turret = null;
  const stone = M(C.STONE), stoneD = M(C.STONE_D), stoneL = M(C.STONE_L), roofR = M(0xa8242c, { roughness: .6 }), dark = M(0x2b2d31);
  if (type === 'tower' || type === 'otower') {
    const roof = type === 'tower' ? roofR : M(C.TEAL, { roughness: .55 });
    const body = type === 'tower' ? stone : M(C.SAND);
    add(g, Cyl(1.75, 2.1, 1.0, 14), stoneD, 0, .5, 0);
    add(g, Cyl(1.55, 1.75, 5.2, 14), body, 0, 3.6, 0);
    add(g, Cyl(1.95, 1.95, .5, 14), stoneL, 0, 6.4, 0);
    crenels(g, stoneL, 1.75, 6.95, 10, .45);
    add(g, Cone(2.1, 3.0, 14), roof, 0, 8.4, 0);
    add(g, Box(.5, .9, .2), dark, 0, 4.4, 1.62); add(g, Box(.5, .9, .2), dark, 1.62, 4.4, 0, 0, PI / 2, 0); add(g, Box(.5, .9, .2), dark, -1.62, 4.4, 0, 0, PI / 2, 0);
    add(g, Box(.9, 1.5, .3), M(C.WOOD_D), 0, .75, 1.85);
    const f = makeBanner(0, 0, type === 'tower' ? C.CRIM : C.TEAL, .7); f.position.set(0, 9.6, 0); g.add(f);
  } else if (type === 'ctower') {
    add(g, Cyl(2.6, 2.9, 2.4, 16), stone, 0, 1.2, 0);
    add(g, Cyl(2.75, 2.75, .35, 16), stoneL, 0, 2.55, 0);
    crenels(g, stoneL, 2.5, 2.95, 12, .45);
    const tur = new T.Group(); tur.position.set(0, 2.75, 0); g.add(tur);
    add(tur, Box(1.2, .55, 1.6), M(C.WOOD), 0, .3, 0);
    add(tur, Cyl(.24, .32, 2.2, 12), M(C.IRON, { metalness: .6, roughness: .4 }), 0, .75, .9, PI / 2 - .15, 0, 0);
    add(tur, Box(.9, .3, .3), M(C.CRIM), 0, .45, -.75);
    g.userData.turret = tur;
  } else if (type === 'ehq') {
    add(g, Box(10.5, 1.0, 7.5), stoneD, 0, .5, 0);
    add(g, Box(9, 6.2, 6), stone, 0, 4.0, 0);
    for (let i = -4; i <= 4; i++) { add(g, Box(.7, .8, .7), stoneL, i * 1.05, 7.5, 2.75); add(g, Box(.7, .8, .7), stoneL, i * 1.05, 7.5, -2.75); }
    add(g, Box(2.6, 3.4, .4), dark, 0, 2.2, 3.05);
    add(g, Cyl(1.3, 1.3, .4, 16, 1), dark, 0, 3.9, 3.05, PI / 2);
    add(g, Box(5.4, 3.8, 4), stoneL, 0, 8.8, -.6);
    add(g, Cone(4.0, 3.6, 4), roofR, 0, 12.5, -.6, 0, PI / 4, 0);
    for (const [x, z] of [[-4.8, 3.2], [4.8, 3.2], [-4.8, -3.2], [4.8, -3.2]]) {
      add(g, Cyl(1.45, 1.6, 9.0, 14), stone, x, 4.5, z);
      crenels(g, stoneL, 1.45, 9.3, 9, .4);
      add(g, Cone(1.85, 3.2, 14), roofR, x, 10.9, z);
      add(g, Box(.4, .8, .2), dark, x, 6.5, z + 1.45 * Math.sign(z));
    }
    for (const x of [-4.8, 4.8]) { const b = makeBanner(0, 0, C.CRIM, .8); b.position.set(x, 12.4, 3.2); g.add(b); }
    const b = makeBanner(0, 0, C.CRIM, 1.1); b.position.set(0, 14.2, -.6); g.add(b);
    for (const x of [-1.8, 1.8]) add(g, Box(.9, 1.6, .15), M(0xb8282f), x, 5.4, 3.02);
  } else if (type === 'otag') {
    add(g, Cyl(4.4, 4.6, .3, 24), M(0xcdb383), 0, .15, 0);
    const wall = new T.Mesh(stripes(Cyl(3.6, 3.7, 2.6, 24, true), 24, C.TEAL, C.WHITE), new T.MeshStandardMaterial({ vertexColors: true, roughness: .85, side: T.DoubleSide }));
    wall.position.y = 1.6; wall.castShadow = wall.receiveShadow = true; g.add(wall);
    const roof = new T.Mesh(stripes(Cone(4.3, 3.6, 24, true), 24, C.TEAL, C.WHITE), new T.MeshStandardMaterial({ vertexColors: true, roughness: .85, side: T.DoubleSide }));
    roof.position.y = 4.7; roof.castShadow = true; g.add(roof);
    add(g, new T.TorusGeometry(3.95, .12, 6, 32), M(C.GOLD, { metalness: .6, roughness: .3 }), 0, 2.95, 0, PI / 2);
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; add(g, Cone(.22, .5, 3), M(C.GOLD, { metalness: .5, roughness: .4 }), Math.cos(a) * 4.05, 2.68, Math.sin(a) * 4.05, PI, 0, 0); }
    add(g, Sph(.42, 12, 10), M(C.GOLD, { metalness: .7, roughness: .25 }), 0, 6.7, 0);
    add(g, Box(1.6, 2.3, .3), M(0x173a38), 0, 1.3, 3.55);
    add(g, Box(2.2, .25, .5), M(C.GOLD, { metalness: .5 }), 0, 2.55, 3.6);
    // treasure chest
    add(g, Box(1.3, .8, .8), M(C.WOOD), 1.9, .55, 4.5); add(g, Box(1.35, .12, .85), M(C.GOLD, { metalness: .6, roughness: .3 }), 1.9, .98, 4.5);
    add(g, Cyl(.42, .42, 1.3, 10, 1), M(C.WOOD), 1.9, 1.0, 4.5, 0, 0, PI / 2);
    for (let i = 0; i < 6; i++) add(g, Cyl(.2, .2, .07, 10), M(0xf5b81e, { metalness: .6, roughness: .3, emissive: 0x6a4500, emissiveIntensity: .5 }), .7 + i * .12, .2 + i * .03, 4.9 - (i % 2) * .3, .3, 0, 0);
    const b = makeBanner(0, 0, C.TEAL, .9); b.position.set(0, 6.9, 0); g.add(b);
  } else if (type === 'kisla') {
    add(g, Box(5.6, .4, 4.2), M(0xb8a37c), 0, .2, 0);
    add(g, Box(5.2, 2.7, 3.7), M(C.SAND), 0, 1.75, 0);
    for (const x of [-2.55, 0, 2.55]) add(g, Box(.25, 2.7, .25), M(C.WOOD_D), x, 1.75, 1.88);
    add(g, Box(5.3, .22, .2), M(C.WOOD_D), 0, 3.0, 1.88);
    const roofGeo = new T.CylinderGeometry(2.6, 2.6, 6.0, 3, 1); roofGeo.rotateZ(PI / 2); roofGeo.rotateX(PI / 6);
    add(g, roofGeo, M(C.TEAL_D, { roughness: .6 }), 0, 4.25, 0);
    add(g, Box(1.1, 1.7, .2), M(0x173a38), 0, 1.25, 1.88);
    add(g, Box(.7, .5, .15), M(0x173a38), -1.5, 2.0, 1.88); add(g, Box(.7, .5, .15), M(0x173a38), 1.5, 2.0, 1.88);
    add(g, Box(.9, .9, .9), M(C.WOOD), 3.2, .45, 1.6); add(g, Box(.8, .8, .8), M(C.WOOD), 3.3, 1.3, 1.5, 0, .4, 0);
    const b = makeBanner(0, 0, C.TEAL, .6); b.position.set(-2.4, 3.0, 0); g.add(b);
  }
  // collect materials for hit flash
  const mats = new Set(); g.traverse(o => { if (o.isMesh && o.material && o.material.emissive) mats.add(o.material); });
  g.userData.mats = [...mats];
  return g;
}

// ---------------- hero model
function buildHero() {
  const g = new T.Group();
  const body = new T.Mesh(merge([
    part(Cyl(.32, .58, 1.15, 16), C.TEAL_D, [0, 1.0, 0]),
    part(Cap(.37, .5), 0xd9a33a, [0, 1.38, 0]),
    part(Cyl(.4, .4, .16, 16), C.CRIM, [0, 1.08, 0]),
    part(Cap(.12, .45, 6), C.TEAL_D, [.47, 1.4, .05], [0, 0, .3]),
    part(Cap(.12, .45, 6), C.TEAL_D, [-.47, 1.4, .05], [0, 0, -.3]),
    part(Sph(.3), C.SKIN, [0, 2.12, 0]),
    part(Box(.36, .07, .08), 0x2b1a10, [0, 2.04, .28]),
    part(Sph(.2, 10, 8), 0x2b1a10, [0, 1.9, .16], [0, 0, 0], [1, .9, .8]),
    part(Sph(.42, 16, 12), C.WHITE, [0, 2.42, 0], [0, 0, 0], [1, .72, 1]),
    part(Cyl(.2, .26, .3, 12), C.CRIM, [0, 2.66, 0]),
    part(Cone(.07, .55, 6), C.CRIM, [0, 2.95, .2]),
    part(Sph(.09, 8, 6), C.GOLD, [0, 2.5, .38]),
    part(Box(.95, 1.45, .06), 0x9e1f27, [0, 1.35, -.4], [.14, 0, 0])
  ]), matVC.clone());
  body.castShadow = true; g.add(body);
  const legs = []; for (const x of [-.17, .17]) { const l = new T.Mesh(legGeo, M(0x2a1d14)); l.position.set(x, .8, 0); l.castShadow = true; g.add(l); legs.push(l); }
  const sword = new T.Group(); sword.position.set(.55, 1.3, .2);
  add(sword, Box(.09, 1.0, .03), M(0xe6eaee, { metalness: .8, roughness: .2 }), 0, .62, 0);
  add(sword, Box(.08, .35, .03), M(0xe6eaee, { metalness: .8, roughness: .2 }), 0, 1.25, .08, -.45, 0, 0);
  add(sword, Box(.3, .07, .08), M(C.GOLD, { metalness: .7 }), 0, .1, 0);
  g.add(sword);
  const pole = new T.Mesh(Cyl(.045, .05, 4.2, 6), M(C.WOOD_D)); pole.position.set(-.35, 2.2, -.5); pole.castShadow = true; g.add(pole);
  const top = new T.Mesh(Sph(.14, 8, 6), M(C.GOLD, { metalness: .7, roughness: .3 })); top.position.set(-.35, 4.35, -.5); g.add(top);
  const fl = makeFlag(C.TEAL, 1.6, 1.0); fl.position.set(-.35, 3.75, -.5); fl.rotation.y = PI; g.add(fl);
  const ring = new T.Mesh(new T.RingGeometry(1.15, 1.42, 40), new T.MeshBasicMaterial({ color: 0x2fe0d2, transparent: true, opacity: .85, depthWrite: false }));
  ring.rotation.x = -PI / 2; ring.position.y = .06;
  g.add(ring);
  g.scale.setScalar(1.95);
  g.userData = { legs, sword, ring, mats: [body.material] };
  scene.add(g);
  return g;
}

// ================================================================ PADS (canvas textures on ground)
function padIcon(g, kind, cx, cy, s) {
  g.save(); g.translate(cx, cy); g.scale(s, s);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const W_ = '#ffffff', GO = '#ffd75e';
  if (kind === 'inf') { g.fillStyle = W_; g.beginPath(); g.ellipse(0, 18, 16, 20, 0, 0, 7); g.fill(); g.fillStyle = '#f0c39a'; g.beginPath(); g.arc(0, -8, 10, 0, 7); g.fill(); g.fillStyle = W_; g.beginPath(); g.moveTo(-9, -14); g.lineTo(-7, -38); g.quadraticCurveTo(0, -44, 7, -38); g.lineTo(9, -14); g.closePath(); g.fill(); g.fillStyle = GO; g.fillRect(-10, -17, 20, 5); g.strokeStyle = '#d8dde2'; g.lineWidth = 4; g.beginPath(); g.moveTo(22, 34); g.lineTo(26, -36); g.stroke(); g.fillStyle = '#d8dde2'; g.beginPath(); g.moveTo(26, -46); g.lineTo(20, -34); g.lineTo(32, -34); g.fill(); }
  else if (kind === 'arc') { g.strokeStyle = W_; g.lineWidth = 6; g.beginPath(); g.arc(-8, 0, 32, -1.2, 1.2); g.stroke(); g.lineWidth = 2; g.beginPath(); g.moveTo(3, -30); g.lineTo(3, 30); g.stroke(); g.lineWidth = 4; g.strokeStyle = GO; g.beginPath(); g.moveTo(-30, 0); g.lineTo(30, 0); g.stroke(); g.fillStyle = GO; g.beginPath(); g.moveTo(38, 0); g.lineTo(26, -7); g.lineTo(26, 7); g.fill(); }
  else if (kind === 'can') { g.fillStyle = GO; g.save(); g.rotate(-.35); g.beginPath(); g.roundRect(-30, -10, 58, 20, 9); g.fill(); g.restore(); g.fillStyle = W_; g.beginPath(); g.arc(-8, 16, 13, 0, 7); g.fill(); g.fillStyle = '#7a4d22'; g.beginPath(); g.arc(-8, 16, 5, 0, 7); g.fill(); }
  else if (kind === 'kule') { g.fillStyle = W_; g.fillRect(-14, -18, 28, 50); for (let i = -16; i < 16; i += 11) g.fillRect(i, -26, 7, 9); g.fillStyle = '#14a39a'; g.beginPath(); g.moveTo(-20, -26); g.lineTo(0, -48); g.lineTo(20, -26); g.closePath(); g.fill(); g.fillStyle = '#2b2d31'; g.fillRect(-4, 0, 8, 12); }
  else if (kind === 'kisla') { g.fillStyle = W_; g.fillRect(-28, -6, 56, 34); g.fillStyle = '#14a39a'; g.beginPath(); g.moveTo(-34, -6); g.lineTo(0, -32); g.lineTo(34, -6); g.closePath(); g.fill(); g.fillStyle = '#2b2d31'; g.fillRect(-7, 8, 14, 20); }
  else if (kind === 'upg') { g.fillStyle = GO; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-24, 20 - i * 18); g.lineTo(0, 2 - i * 18); g.lineTo(24, 20 - i * 18); g.lineTo(24, 30 - i * 18); g.lineTo(0, 12 - i * 18); g.lineTo(-24, 30 - i * 18); g.closePath(); g.fill(); } }
  else if (kind === 'atk') { g.strokeStyle = W_; g.lineWidth = 8; g.beginPath(); g.moveTo(-28, -30); g.lineTo(26, 24); g.moveTo(28, -30); g.lineTo(-26, 24); g.stroke(); g.strokeStyle = GO; g.lineWidth = 8; g.beginPath(); g.moveTo(14, 26); g.lineTo(32, 10); g.moveTo(-14, 26); g.lineTo(-32, 10); g.stroke(); }
  g.restore();
}
function makePadMesh(p) {
  const pxw = 4 * p.w, pxh = 4 * p.h;
  const cv = document.createElement('canvas'); cv.width = pxw; cv.height = pxh;
  const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  const geo = new T.PlaneGeometry(p.w * K, p.h * K); geo.rotateX(-PI / 2);
  const mesh = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  mesh.position.set(X3(p.x), .07, Z3(p.y)); mesh.renderOrder = 2; scene.add(mesh);
  p.mesh = mesh; p.cv = cv; p.tex = tex; p.key = '';
}
function drawPad(p) {
  const full = p.unit && armyCount() >= CAP, act = G.onPad === p;
  const left = p.cost ? p.cost - p.paid : 0;
  const key = [p.paid, p.cost, full, act, p.attack ? G.rallyN : 0, p.attack ? Math.round(p.hold * 20) : 0].join('|');
  if (key === p.key) return; p.key = key;
  const cv = p.cv, g = cv.getContext('2d'), w = cv.width, h = cv.height, s = 4;
  g.clearRect(0, 0, w, h);
  g.fillStyle = p.attack ? 'rgba(150,24,30,.62)' : 'rgba(18,24,30,.55)';
  g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 34); g.fill();
  if (!p.attack && p.cost && p.paid > 0) { g.save(); g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 34); g.clip(); const pr = p.paid / p.cost; g.fillStyle = 'rgba(255,200,50,.55)'; g.fillRect(0, h * (1 - pr), w, h * pr); g.restore(); }
  if (p.attack && p.hold > 0) { g.save(); g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 34); g.clip(); g.fillStyle = 'rgba(255,215,94,.6)'; g.fillRect(0, 0, w * p.hold / .6, h); g.restore(); }
  g.strokeStyle = act ? '#ffd75e' : '#ffffff'; g.lineWidth = 13; g.lineCap = 'round';
  const c = 46, m = 12;
  for (const [x, dx] of [[m, 1], [w - m, -1]]) for (const [y, dy] of [[m, 1], [h - m, -1]]) { g.beginPath(); g.moveTo(x, y + dy * c); g.lineTo(x, y); g.lineTo(x + dx * c, y); g.stroke(); }
  padIcon(g, p.icon, w / 2, h * .36, 1.7 * Math.min(1, h / 280));
  const font = (sz) => '900 ' + sz + 'px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
  const label = (txt, x, y, sz, col) => { g.font = font(sz); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = sz / 4; g.strokeStyle = 'rgba(20,16,12,.9)'; g.lineJoin = 'round'; g.strokeText(txt, x, y); g.fillStyle = col; g.fillText(txt, x, y); };
  const ly = h * .68, cy = h * .86;
  label(p.label, w / 2, ly, p.label.length > 8 ? 40 : 48, p.attack ? '#ffd75e' : '#ffffff');
  if (p.attack) label(G.rallyN + ' asker', w / 2, cy, 38, '#ffffff');
  else if (full) label('DOLU', w / 2, cy, 40, '#ff8a8a');
  else {
    g.font = font(44); const tw = g.measureText(String(left)).width; const x0 = w / 2 - (tw + 46) / 2;
    const gr = g.createRadialGradient(x0 + 14, cy - 6, 2, x0 + 18, cy, 20); gr.addColorStop(0, '#fff0a8'); gr.addColorStop(.6, '#f2b21b'); gr.addColorStop(1, '#a86d00');
    g.fillStyle = gr; g.beginPath(); g.arc(x0 + 18, cy, 18, 0, 7); g.fill();
    g.textAlign = 'left'; g.lineWidth = 11; g.strokeStyle = 'rgba(20,16,12,.9)'; g.strokeText(String(left), x0 + 46, cy + 2); g.fillStyle = '#ffe58a'; g.fillText(String(left), x0 + 46, cy + 2);
  }
  p.tex.needsUpdate = true;
}

// ================================================================ AUDIO
let AC = null, muted = false; const lastSfx = {};
function sfx(type) {
  if (muted || !AC) return; const now = AC.currentTime;
  if (lastSfx[type] && now - lastSfx[type] < .05) return; lastSfx[type] = now;
  const o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(AC.destination);
  const env = (v, d) => { g.gain.setValueAtTime(v, now); g.gain.exponentialRampToValueAtTime(.0008, now + d); o.start(now); o.stop(now + d + .02); };
  if (type === 'coin') { o.type = 'square'; o.frequency.setValueAtTime(990, now); o.frequency.setValueAtTime(1480, now + .04); env(.022, .11); }
  else if (type === 'pay') { o.type = 'triangle'; o.frequency.setValueAtTime(700, now); env(.02, .05); }
  else if (type === 'hit') { o.type = 'triangle'; o.frequency.setValueAtTime(220, now); o.frequency.exponentialRampToValueAtTime(70, now + .08); env(.03, .08); }
  else if (type === 'boom') { o.type = 'sawtooth'; o.frequency.setValueAtTime(110, now); o.frequency.exponentialRampToValueAtTime(28, now + .3); env(.07, .3); }
  else if (type === 'buy') { o.type = 'sine'; o.frequency.setValueAtTime(520, now); o.frequency.exponentialRampToValueAtTime(1100, now + .15); env(.06, .18); }
  else if (type === 'horn') { o.type = 'sawtooth'; o.frequency.setValueAtTime(233, now); o.frequency.setValueAtTime(311, now + .18); o.frequency.setValueAtTime(349, now + .36); env(.05, .6); }
  else if (type === 'ehorn') { o.type = 'sawtooth'; o.frequency.setValueAtTime(196, now); o.frequency.setValueAtTime(147, now + .25); env(.06, .7); }
}

// ================================================================ GAME STATE
let G = null, best = 1, running = false;
try { best = Math.max(1, parseInt(localStorage.getItem('akinci_lv')) || 1); } catch (e) { }

function addUnit(team, type, x, y, state) {
  const b = UT[type]; const m = team ? G.em : G.upg;
  const u = { kind: 'u', team, type, x, y, hp: b.hp * m, maxhp: b.hp * m, dmg: b.dmg * m, range: b.range, cdMax: b.cd, cd: Math.random() * b.cd,
    spd: b.spd * (.92 + Math.random() * .16), r: b.r, state, homeX: x, homeY: y, rot: team ? 0 : PI, anim: Math.random() * 6, hit: 0, swing: 0, recoil: 0, moving: false, splash: b.splash || 0 };
  G.units.push(u); return u;
}
function addBld(team, type, x, y) {
  const b = BT[type]; const m = team ? G.em : 1;
  const o = { kind: 'b', team, type, x, y, r: b.r, hp: b.hp * m, maxhp: b.hp * m, dmg: (b.dmg || 0) * m, range: b.range || 0, cdMax: b.cd || 1, cd: 1 + Math.random(), splash: b.splash || 0, hit: 0, aim: 0, spawnT: 0 };
  o.obj = buildModel(type); o.obj.position.set(X3(x), 0, Z3(y)); if (team === 1) o.obj.rotation.y = 0; scene.add(o.obj);
  G.blds.push(o); return o;
}
function makePads() {
  const P = [
    { id: 'atk', x: 220, y: AREA.attackPad, w: 104, h: 72, label: 'HÜCUM!', icon: 'atk', attack: true, hold: 0, cool: 0 },
    { id: 'inf', x: 100, y: 1290, w: 94, h: 72, label: 'YENİÇERİ', icon: 'inf', cost: 5, inc: 1, max: 15, paid: 0, unit: 'inf' },
    { id: 'arc', x: 220, y: 1290, w: 94, h: 72, label: 'OKÇU', icon: 'arc', cost: 8, inc: 2, max: 24, paid: 0, unit: 'arc' },
    { id: 'can', x: 340, y: 1290, w: 94, h: 72, label: 'ŞAHİ TOPU', icon: 'can', cost: 25, inc: 8, max: 60, paid: 0, unit: 'can' },
    { id: 't1', x: 58, y: 1186, w: 76, h: 70, label: 'KULE', icon: 'kule', cost: 20, inc: 0, max: 20, paid: 0, once: true, build: 'otower' },
    { id: 't2', x: 382, y: 1186, w: 76, h: 70, label: 'KULE', icon: 'kule', cost: 20, inc: 0, max: 20, paid: 0, once: true, build: 'otower' },
    { id: 'k1', x: 74, y: 1412, w: 84, h: 72, label: 'KIŞLA', icon: 'kisla', cost: 30, inc: 0, max: 30, paid: 0, once: true, build: 'kisla' },
    { id: 'k2', x: 366, y: 1412, w: 84, h: 72, label: 'KIŞLA', icon: 'kisla', cost: 30, inc: 0, max: 30, paid: 0, once: true, build: 'kisla' },
    { id: 'upg', x: 220, y: 1474, w: 112, h: 52, label: 'TALİM', icon: 'upg', cost: 30, inc: 25, max: 500, paid: 0, upg: true }
  ];
  for (const p of P) makePadMesh(p);
  return P;
}
function clearScene() {
  if (!G) return;
  for (const b of G.blds) scene.remove(b.obj);
  for (const p of G.pads) { scene.remove(p.mesh); p.tex.dispose(); }
}
let hero3 = null;
function newGame(level) {
  clearScene();
  seed = level * 977 + 13;
  G = { level, t: 0, coins: 6 + 3 * (level - 1), units: [], blds: [], proj: [], coinsArr: [], parts: [], floats: [], fly: [], upg: 1, upgLv: 0, em: 1 + .15 * (level - 1),
    payT: 0, passT: 0, heroDead: 0, shake: 0, over: null, overT: 0, moved: false, launches: 0, bought: 0, warnT: 0,
    eprodT: 0, waveT: Math.max(26, 40 - level * 2), waves: 0, rallyN: 0, eRallyN: 0 };
  G.hero = addUnit(0, 'hero', CX, 1200, 'hero');
  G.otag = addBld(0, 'otag', CX, 1398);
  for (let i = 0; i < 3 + level; i++) addUnit(0, 'inf', CX + (i % 6 - 2.5) * 17, AREA.rallyY + Math.floor(i / 6) * 17, 'rally');
  G.pads = makePads();
  G.ehq = addBld(1, 'ehq', CX, 105);
  addBld(1, 'tower', 105, 300); addBld(1, 'tower', 335, 300);
  if (level >= 2) { addBld(1, 'ctower', 72, 175); addBld(1, 'ctower', 368, 175); }
  if (level >= 3) addBld(1, 'tower', CX, 700);
  G.homes = [];
  const nG = Math.min(16, 3 + level), nA = level >= 2 ? Math.min(8, level) : 0;
  for (let i = 0; i < nG; i++) G.homes.push({ x: CX + (i % 8 - 3.5) * 26, y: 345 + Math.floor(i / 8) * 24, t: 'inf' });
  for (let i = 0; i < nA; i++) G.homes.push({ x: CX + (i % 8 - 3.5) * 26, y: 250 - Math.floor(i / 8) * 20, t: 'arc' });
  if (level >= 3) for (let i = 0; i < 4; i++) G.homes.push({ x: CX + (i % 2 - .5) * 36, y: 735 + Math.floor(i / 2) * 22, t: 'inf' });
  G.homes.forEach((h, i) => { const u = addUnit(1, h.t, h.x, h.y, 'guard'); u.home = i; });
  // starting enemy force already gathering
  for (let i = 0; i < 1 + level; i++) addUnit(1, 'inf', CX + (i - 1) * 20, AREA.enemyRallyY, 'erally');
  camTarget.set(X3(CX), 0, Z3(1200) - 10); hud(true);
}

// ================================================================ HELPERS
function nearestEnemy(e, maxD, unitsOnly) {
  let best = null, bd = maxD;
  for (const o of G.units) { if (o.team === e.team || o.hp <= 0) continue; const d = Math.hypot(o.x - e.x, o.y - e.y) - o.r; if (d < bd) { bd = d; best = o; } }
  if (!unitsOnly) for (const o of G.blds) { if (o.team === e.team || o.hp <= 0) continue; const d = Math.hypot(o.x - e.x, o.y - e.y) - o.r; if (d < bd) { bd = d; best = o; } }
  return best;
}
const inRange = (u, t) => dist(u, t) - t.r - u.r <= u.range;
function armyCount() { let n = 0; for (const u of G.units) if (u.team === 0 && u.type !== 'hero' && u.hp > 0) n++; return n; }
function floatText(x, y, z, txt, c, size) { G.floats.push({ x, y, z, txt, c: c || '#fff', t: 0, size: size || 16 }); }
function burst(x, y, z, c, n, spd) { const col = new T.Color(c); for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = (spd || 60) * (.4 + Math.random()); G.parts.push({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 5 + Math.random() * 9, life: .5 + Math.random() * .5, t: 0, col, r: .7 + Math.random() * .8, g: 1 }); } }
function smoke(x, y, z, n, size) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 15 + Math.random() * 35; G.parts.push({ x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 6, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 1.5 + Math.random() * 3, life: .7 + Math.random() * .6, t: 0, smoke: 1, r: (size || 1) * (.7 + Math.random() * .7), g: 0 }); } }
function dropCoins(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 25 + Math.random() * 60; G.coinsArr.push({ x, y, z: 1, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 7 + Math.random() * 6, age: 0, mag: false, spin: Math.random() * 6 }); } }
const SHOT_H = { tower: 7.0, otower: 7.0, ctower: 3.6 };
function shoot(src, tgt, dmg, kind, splash) {
  const d = Math.hypot(tgt.x - src.x, tgt.y - src.y);
  const z0 = src.kind === 'b' ? (SHOT_H[src.type] || 3) : (kind === 'ball' ? 1.0 : 1.5);
  G.proj.push({ x0: src.x, y0: src.y, z0, tgt, tx: tgt.x, ty: tgt.y, t: 0, T: Math.max(.22, d / (kind === 'ball' ? 240 : 420)), dmg, team: src.team, kind, splash, h: d * K * (kind === 'ball' ? .32 : .14) });
  if (kind === 'ball') { sfx('boom'); smoke(src.x, src.y, z0, 3, .7); if (src.kind === 'u') src.recoil = .25; }
}
function damage(t, dmg) { if (t.hp <= 0) return; t.hp -= dmg; t.hit = .1; if (t.hp <= 0) kill(t); }
function kill(t) {
  if (t.kind === 'u') {
    burst(t.x, t.y, 1.2, t.team ? 0xc9313b : 0x18a39b, 10, 50);
    if (t.type === 'hero') { G.heroDead = 4; floatText(t.x, t.y, 4, 'Paşa yaralandı!', '#ffd75e', 18); }
    else if (t.team === 1) dropCoins(t.x, t.y, UT[t.type].bounty);
  } else {
    smoke(t.x, t.y, 2, 16, 2.2); burst(t.x, t.y, 3, 0x8a8f96, 22, 90); burst(t.x, t.y, 3, 0xffa531, 10, 70); sfx('boom'); G.shake = Math.max(G.shake, .45);
    scene.remove(t.obj);
    if (t.team === 1) dropCoins(t.x, t.y, BT[t.type].bounty);
    if (t.type === 'ehq' && !G.over) { G.over = 'win'; G.overT = 2.2; floatText(t.x, t.y, 10, 'ZAFER!', '#ffd75e', 40); }
    if (t.type === 'otag' && !G.over) { G.over = 'lose'; G.overT = 1.8; }
    const p = G.pads.find(p => p.bld === t); if (p) { p.done = false; p.paid = 0; p.bld = null; p.mesh.visible = true; }
  }
}
function attack(u, t) {
  u.rot = Math.atan2(t.x - u.x, t.y - u.y);
  if (u.type === 'arc') { shoot(u, t, u.dmg, 'arrow'); u.swing = .2; }
  else if (u.type === 'can') shoot(u, t, u.dmg, 'ball', u.splash);
  else { damage(t, u.dmg); u.swing = .22; burst(t.x + (u.x - t.x) * .4, t.y + (u.y - t.y) * .4, 1.4, 0xfff3b0, 3, 40); sfx('hit'); }
}
function turn(u, a, dt) { let d = a - u.rot; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI; u.rot += d * Math.min(1, dt * 10); }
function moveTo(u, x, y, dt) {
  const dx = x - u.x, dy = y - u.y, d = Math.hypot(dx, dy) || 1; const s = Math.min(d, u.spd * dt);
  u.x += dx / d * s; u.y += dy / d * s; u.moving = true; u.anim += dt * u.spd * .16; turn(u, Math.atan2(dx, dy), dt);
}
function spawnRally(type, x, y) { const u = addUnit(0, type, x, y, 'rally'); burst(x, y, 1, 0xffd75e, 12, 50); return u; }

// ================================================================ UPDATE
function unitAI(u, dt) {
  if (u.hp <= 0 || u.type === 'hero') return;
  u.cd -= dt; u.moving = false;
  let tgt = null, goal = null;
  if (u.team === 0) {
    if (u.state === 'rally') { tgt = nearestEnemy(u, 125); if (!tgt) goal = u.slot; }
    else tgt = nearestEnemy(u, 1e9);
  } else if (u.state === 'guard') {
    tgt = nearestEnemy(u, u.type === 'inf' ? 160 : u.range + 30);
    if (tgt && Math.hypot(tgt.x - u.homeX, tgt.y - u.homeY) > 300) tgt = null;
    if (!tgt) goal = { x: u.homeX, y: u.homeY };
  } else if (u.state === 'erally') { tgt = nearestEnemy(u, 125); if (!tgt) goal = u.slot; }
  else tgt = nearestEnemy(u, 1e9);
  if (tgt) {
    if (inRange(u, tgt)) { turn(u, Math.atan2(tgt.x - u.x, tgt.y - u.y), dt); if (u.cd <= 0) { attack(u, tgt); u.cd = u.cdMax; } }
    else moveTo(u, tgt.x, tgt.y, dt);
  } else if (goal) {
    if (Math.hypot(goal.x - u.x, goal.y - u.y) > 2.5) moveTo(u, goal.x, goal.y, dt);
    else turn(u, u.team ? 0 : PI, dt);
  }
}
function separation() {
  const us = G.units;
  for (let i = 0; i < us.length; i++) {
    const a = us[i]; if (a.hp <= 0) continue;
    for (let j = i + 1; j < us.length; j++) {
      const b = us[j]; if (b.hp <= 0) continue;
      const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r - 1; if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
      const d = Math.hypot(dx, dy) || .01; if (d >= rr) continue;
      if ((a.type === 'hero' || b.type === 'hero') && a.team === b.team) continue;
      const o = (rr - d) / 2, nx = dx / d, ny = dy / d, wa = a.type === 'hero' ? 0 : 1, wb = b.type === 'hero' ? 0 : 1, k = (wa + wb) || 1;
      a.x -= nx * o * 2 * wa / k; a.y -= ny * o * 2 * wa / k; b.x += nx * o * 2 * wb / k; b.y += ny * o * 2 * wb / k;
    }
    for (const bl of G.blds) { if (bl.hp <= 0) continue; const dx = a.x - bl.x, dy = a.y - bl.y, d = Math.hypot(dx, dy) || .01, rr = bl.r * .9 + a.r; if (d < rr) { a.x += dx / d * (rr - d); a.y += dy / d * (rr - d); } }
    a.x = clampX(a.x, a.y, a.r); a.y = Math.max(50, Math.min(H - 18, a.y));
  }
}
const keys = new Set(); let joy = null;
function update(dt) {
  G.t += dt;
  const h = G.hero;
  if (G.heroDead > 0) { G.heroDead -= dt; if (G.heroDead <= 0) { h.hp = h.maxhp; h.x = CX; h.y = 1330; burst(h.x, h.y, 1, 0xffd75e, 16, 70); } }
  else {
    let ix = 0, iy = 0;
    if (joy) { const dx = joy.x - joy.sx, dy = joy.y - joy.sy, m = Math.hypot(dx, dy); if (m > 4) { const k = Math.min(1, m / 42); ix = dx / m * k; iy = dy / m * k; } }
    if (keys.size) { const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0), ky = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0); const m = Math.hypot(kx, ky); if (m) { ix = kx / m; iy = ky / m; } }
    const m = Math.hypot(ix, iy); h.moving = m > .05;
    if (h.moving) { G.moved = true; h.x += ix * h.spd * dt; h.y += iy * h.spd * dt; turn(h, Math.atan2(ix, iy), dt * 1.5); h.anim += dt * 14 * m; }
    h.hp = Math.min(h.maxhp, h.hp + (h.y > AREA.border ? 14 : 1.5) * dt);
    h.cd -= dt; const t = nearestEnemy(h, h.range + h.r + 30);
    if (t && inRange(h, t) && h.cd <= 0) { attack(h, t); h.cd = h.cdMax; }
  }
  for (const u of G.units) { u.hit = Math.max(0, u.hit - dt); u.swing = Math.max(0, u.swing - dt); u.recoil = Math.max(0, u.recoil - dt); }
  // formation slots
  let ri = 0, ei = 0;
  for (const u of G.units) {
    if (u.hp <= 0) continue;
    if (u.team === 0 && u.state === 'rally') { const row = Math.floor(ri / 11), col = ri % 11; u.slot = { x: CX + (col - 5) * 19 + (row % 2 ? 5 : 0), y: AREA.rallyY + row * 18 }; ri++; }
    else if (u.team === 1 && u.state === 'erally') { const row = Math.floor(ei / 10), col = ei % 10; u.slot = { x: CX + (col - 4.5) * 20 + (row % 2 ? 5 : 0), y: AREA.enemyRallyY + row * 19 }; ei++; }
  }
  G.rallyN = ri; G.eRallyN = ei;
  for (const u of G.units) unitAI(u, dt);
  separation();
  // buildings
  for (const b of G.blds) {
    b.hit = Math.max(0, b.hit - dt); if (b.hp <= 0) continue;
    if (b.dmg) { b.cd -= dt; if (b.cd <= 0) { const t = nearestEnemy(b, b.range, true); if (t) { b.aim = Math.atan2(t.x - b.x, t.y - b.y); shoot(b, t, b.dmg, b.splash ? 'ball' : 'arrow', b.splash); b.cd = b.cdMax; } } }
    if (b.type === 'kisla') { b.spawnT += dt; if (b.spawnT >= 8) { if (armyCount() < CAP) { b.spawnT = 0; spawnRally('inf', b.x, b.y - 34); } else b.spawnT = 8; } }
    if (b.type === 'ehq') {
      b.spawnT += dt;
      if (b.spawnT >= Math.max(6, 12 - G.level * .6)) {
        b.spawnT = 0;
        const taken = new Set(); for (const u of G.units) if (u.team === 1 && u.hp > 0 && u.home != null) taken.add(u.home);
        const idx = G.homes.findIndex((_, i) => !taken.has(i));
        if (idx >= 0) { const hm = G.homes[idx]; const u = addUnit(1, hm.t, b.x + (Math.random() - .5) * 40, b.y + 60, 'guard'); u.homeX = hm.x; u.homeY = hm.y; u.home = idx; }
      }
      // offensive production
      G.eprodT += dt;
      const per = Math.max(2.6, 6.2 - G.level * .4), cap = Math.min(42, 5 + 4 * G.level);
      if (G.eprodT >= per && !G.over) {
        G.eprodT = 0;
        if (G.eRallyN < cap) {
          const n = G.waves + G.eRallyN; let type = 'inf';
          if (G.level >= 2 && n % 3 === 2) type = 'arc';
          if (G.level >= 4 && n % 7 === 6) type = 'can';
          addUnit(1, type, b.x + (Math.random() - .5) * 50, b.y + 62, 'erally');
        }
      }
    }
  }
  // enemy waves
  if (!G.over) {
    G.waveT -= dt;
    if (G.waveT <= 0) {
      if (G.eRallyN >= 2) {
        for (const u of G.units) if (u.team === 1 && u.state === 'erally' && u.hp > 0) u.state = 'raid';
        G.waves++; G.warnT = 2.4; sfx('ehorn');
        G.waveT = Math.max(20, 36 - G.level * 2);
      } else G.waveT = 5;
    }
  }
  G.warnT = Math.max(0, G.warnT - dt);
  // projectiles
  for (const p of G.proj) {
    p.t += dt; if (p.kind === 'arrow' && p.tgt.hp > 0) { p.tx = p.tgt.x; p.ty = p.tgt.y; }
    if (p.t >= p.T) {
      p.done = true;
      if (p.kind === 'arrow') { if (p.tgt.hp > 0) damage(p.tgt, p.dmg); }
      else {
        smoke(p.tx, p.ty, .5, 6, 1); burst(p.tx, p.ty, .5, 0xf7a531, 8, 80); G.shake = Math.max(G.shake, .12);
        for (const o of G.units) if (o.team !== p.team && o.hp > 0 && Math.hypot(o.x - p.tx, o.y - p.ty) < p.splash + o.r) damage(o, p.dmg);
        for (const o of G.blds) if (o.team !== p.team && o.hp > 0 && Math.hypot(o.x - p.tx, o.y - p.ty) < p.splash + o.r) damage(o, p.dmg);
      }
    }
  }
  G.proj = G.proj.filter(p => !p.done);
  // treasury
  G.passT += dt;
  if (G.passT >= 3.2 && G.otag.hp > 0) { G.passT = 0; G.coinsArr.push({ x: G.otag.x + 22 + Math.random() * 10, y: G.otag.y + 40, z: 1.5, vx: (Math.random() - .5) * 30, vy: -35, vz: 8, age: 0, mag: false, spin: 0 }); }
  // coins
  for (const c of G.coinsArr) {
    c.age += dt; c.spin += dt * 4;
    if (c.mag && G.heroDead <= 0) {
      const dx = h.x - c.x, dy = h.y - c.y, d = Math.hypot(dx, dy) || 1; const s = Math.max(260, 520 - d) * dt;
      c.x += dx / d * Math.min(d, s); c.y += dy / d * Math.min(d, s); c.z += (2 - c.z) * Math.min(1, dt * 10);
      if (d < 12) { c.done = true; G.coins++; sfx('coin'); }
    } else {
      if (c.z > 0 || c.vz > 0) { c.vz -= 30 * dt; c.z += c.vz * dt; if (c.z < .5) { c.z = .5; c.vz *= -.35; if (Math.abs(c.vz) < 2) c.vz = 0; } c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= .97; c.vy *= .97; }
      c.x = clampX(c.x, c.y, 6);
      if (G.heroDead <= 0 && c.age > .35 && Math.hypot(h.x - c.x, h.y - c.y) < 72) c.mag = true;
    }
  }
  G.coinsArr = G.coinsArr.filter(c => !c.done);
  // pads
  let on = null;
  if (G.heroDead <= 0) for (const p of G.pads) { if (p.done) continue; if (Math.abs(h.x - p.x) < p.w / 2 && Math.abs(h.y - p.y) < p.h / 2) on = p; }
  G.onPad = on;
  for (const p of G.pads) if (p.attack) { p.cool = Math.max(0, p.cool - dt); if (p !== on) p.hold = Math.max(0, p.hold - dt * 2); }
  if (on) {
    if (on.attack) {
      if (G.rallyN > 0 && on.cool <= 0) { on.hold += dt; if (on.hold >= .6) { on.hold = 0; on.cool = 1.2; let n = 0; for (const u of G.units) if (u.team === 0 && u.state === 'rally' && u.hp > 0) { u.state = 'charge'; n++; } G.launches++; sfx('horn'); floatText(on.x, on.y, 4, 'HÜCUM! (' + n + ')', '#ffd75e', 24); } }
    } else {
      const full = on.unit && armyCount() >= CAP;
      if (!full) {
        G.payT -= dt;
        while (G.payT <= 0 && G.coins > 0 && on.paid < on.cost) { G.payT += .045; G.coins--; on.paid++; G.fly.push({ x0: h.x, y0: h.y, x1: on.x, y1: on.y, t: 0 }); sfx('pay'); }
        if (G.payT < 0) G.payT = 0;
        if (on.paid >= on.cost) {
          on.paid = 0; G.bought++; sfx('buy');
          if (on.unit) { spawnRally(on.unit, on.x, on.y - 40); floatText(on.x, on.y, 3, '+1 ' + on.label, '#ffffff', 16); }
          else if (on.build) { on.done = true; on.mesh.visible = false; on.bld = addBld(0, on.build, on.x, on.y); burst(on.x, on.y, 1, 0xffd75e, 24, 90); smoke(on.x, on.y, .5, 10, 1.5); floatText(on.x, on.y, 6, (on.build === 'kisla' ? 'Kışla' : 'Kule') + ' kuruldu!', '#ffd75e', 18); }
          else if (on.upg) { G.upg *= 1.15; G.upgLv++; for (const u of G.units) if (u.team === 0) { u.hp *= 1.15; u.maxhp *= 1.15; u.dmg *= 1.15; } floatText(on.x, on.y, 3, 'Ordu güçlendi! +%15', '#ffd75e', 18); }
          if (!on.once) on.cost = Math.min(on.max, on.cost + on.inc);
        }
      }
    }
  }
  for (const f of G.fly) f.t += dt * 4; G.fly = G.fly.filter(f => f.t < 1);
  for (const p of G.parts) {
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.g) { p.vz -= 28 * dt; if (p.z < .1) { p.z = .1; p.vz *= -.3; p.vx *= .6; p.vy *= .6; } } else { p.vx *= .95; p.vy *= .95; p.vz *= .97; }
  }
  G.parts = G.parts.filter(p => p.t < p.life); if (G.parts.length > 700) G.parts.splice(0, G.parts.length - 700);
  for (const f of G.floats) f.t += dt; G.floats = G.floats.filter(f => f.t < 1.4);
  G.units = G.units.filter(u => u.hp > 0 || u.type === 'hero');
  G.blds = G.blds.filter(b => b.hp > 0);
  G.shake = Math.max(0, G.shake - dt);
  if (G.over) { G.overT -= dt; if (G.overT <= 0 && running) { running = false; showEnd(); } }
  hud();
}

// ================================================================ RENDER SYNC
const camTarget = new T.Vector3();
const mU = new T.Matrix4(), mP = new T.Matrix4(), mL = new T.Matrix4(), mR = new T.Matrix4();
const qY = new T.Quaternion(), vP = new T.Vector3(), vS = new T.Vector3(), YAX = new T.Vector3(0, 1, 0);
const colTmp = new T.Color(), FLASH = new T.Color(2.6, 2.6, 2.6);
const legOff = [new T.Matrix4().makeTranslation(-.16, .78, 0), new T.Matrix4().makeTranslation(.16, .78, 0)];
const handOff = new T.Matrix4().makeTranslation(.48, 1.12, .14);
const bowOff = new T.Matrix4().makeTranslation(-.42, 1.35, .3);
const barrelOff = new T.Matrix4().makeTranslation(0, .9, .1);
const TEAM_BAR = [new T.Color(0x2fe0d2), new T.Color(0xff4d55)], GOLD_BAR = new T.Color(0xffc93b);
function addBar(x, y, z, w, ratio, col) {
  vP.set(X3(x), z, Z3(y)); _m.compose(vP, camera.quaternion, vS.set(w + .12, 1.5, 1)); barBg.add(_m);
  vP.x -= (1 - ratio) * w / 2; _m.compose(vP, camera.quaternion, vS.set(Math.max(.001, w * ratio), 1, 1)); barFg.add(_m, col);
}
function sync() {
  for (const k in pools) pools[k].begin();
  coinPool.begin(); arrowPool.begin(); ballPool.begin(); sparkPool.begin(); smokePool.begin(); barBg.begin(); barFg.begin();
  const h = G.hero;
  for (const u of G.units) {
    if (u.hp <= 0 || u.type === 'hero') continue;
    qY.setFromAxisAngle(YAX, u.rot);
    mU.compose(vP.set(X3(u.x), 0, Z3(u.y)), qY, vS.set(US, US, US));
    const col = u.hit > 0 ? FLASH : WHITE_C;
    const key = u.type + u.team;
    pools[key].add(mU, col);
    if (u.type === 'can') {
      mR.makeRotationX(-.22); mL.makeTranslation(0, 0, -u.recoil * 1.6);
      mP.multiplyMatrices(mU, barrelOff).multiply(mR).multiply(mL); pools['barrel' + u.team].add(mP, col);
    } else {
      const sw = u.moving ? Math.sin(u.anim) * .65 : 0;
      for (let i = 0; i < 2; i++) { mR.makeRotationX(i ? sw : -sw); mP.multiplyMatrices(mU, legOff[i]).multiply(mR); pools['leg' + u.team].add(mP); }
      if (u.type === 'arc') { mR.makeRotationY(.3); mP.multiplyMatrices(mU, bowOff).multiply(mR); pools.bow.add(mP); }
      else { mR.makeRotationX(.25 - u.swing * 6); mP.multiplyMatrices(mU, handOff).multiply(mR); (u.team ? pools.sword : pools.spear).add(mP); }
    }
    if (u.hp < u.maxhp) addBar(u.x, u.y, u.type === 'can' ? 3.4 : 4.9, 2, u.hp / u.maxhp, TEAM_BAR[u.team]);
  }
  // hero
  if (!hero3) hero3 = buildHero();
  hero3.visible = G.heroDead <= 0;
  if (hero3.visible) {
    hero3.position.set(X3(h.x), 0, Z3(h.y)); hero3.rotation.y = h.rot;
    const sw = h.moving ? Math.sin(h.anim) * .7 : 0; hero3.userData.legs[0].rotation.x = -sw; hero3.userData.legs[1].rotation.x = sw;
    hero3.userData.sword.rotation.x = .3 - h.swing * 7;
    hero3.userData.ring.material.opacity = .55 + Math.sin(G.t * 5) * .3;
    hero3.userData.mats[0].emissive.setScalar(h.hit > 0 ? .8 : 0);
    if (h.hp < h.maxhp) addBar(h.x, h.y, 7.4, 2.8, h.hp / h.maxhp, TEAM_BAR[0]);
  }
  // buildings
  for (const b of G.blds) {
    if (b.hp <= 0) continue;
    const e = b.hit > 0 ? .55 : 0; for (const m of b.obj.userData.mats) m.emissive.setScalar(e);
    if (b.obj.userData.turret) { const tr = b.obj.userData.turret; let d = b.aim - tr.rotation.y; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI; tr.rotation.y += d * .15; }
    if (b.hp < b.maxhp && b.type !== 'ehq') addBar(b.x, b.y, b.type === 'otag' ? 8.5 : b.type === 'kisla' ? 6 : 10.5, 4, b.hp / b.maxhp, TEAM_BAR[b.team]);
    if (b.type === 'kisla') addBar(b.x, b.y, 7, 3, Math.min(1, b.spawnT / 8), GOLD_BAR);
  }
  // coins
  for (const c of G.coinsArr) { qY.setFromAxisAngle(YAX, c.spin); mP.compose(vP.set(X3(c.x), c.z, Z3(c.y)), qY, vS.set(1.5, 1.5, 1.5)); coinPool.add(mP); }
  for (const f of G.fly) { const x = f.x0 + (f.x1 - f.x0) * f.t, y = f.y0 + (f.y1 - f.y0) * f.t, z = 2.4 + Math.sin(f.t * PI) * 2.5; qY.setFromAxisAngle(YAX, f.t * 8); mP.compose(vP.set(X3(x), z, Z3(y)), qY, vS.set(.8, .8, .8)); coinPool.add(mP); }
  // projectiles
  const p3 = (p, k) => { const x = p.x0 + (p.tx - p.x0) * k, y = p.y0 + (p.ty - p.y0) * k; const z = p.z0 * (1 - k) + 1.2 * k + p.h * 4 * k * (1 - k); return [X3(x), z, Z3(y)]; };
  const vA = new T.Vector3(), vB = new T.Vector3(), FWD = new T.Vector3(0, 0, 1);
  for (const p of G.proj) {
    const k = Math.min(1, p.t / p.T); const a = p3(p, k);
    if (p.kind === 'ball') { mP.makeTranslation(a[0], a[1], a[2]); ballPool.add(mP); }
    else { const b = p3(p, Math.min(1, k + .04)); vA.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (vA.lengthSq() < 1e-6) vA.set(0, 0, 1); vA.normalize(); _q.setFromUnitVectors(FWD, vA); mP.compose(vB.set(a[0], a[1], a[2]), _q, vS.set(1, 1, 1)); arrowPool.add(mP); }
  }
  // particles
  for (const p of G.parts) {
    const a = 1 - p.t / p.life;
    if (p.smoke) { const s = p.r * (1.6 - a * .8) * Math.min(1, a * 3); mP.compose(vP.set(X3(p.x), p.z, Z3(p.y)), _q.identity(), vS.set(s, s, s)); smokePool.add(mP); }
    else { const s = p.r * Math.min(1, a * 2); qY.setFromAxisAngle(YAX, p.t * 9); mP.compose(vP.set(X3(p.x), p.z, Z3(p.y)), qY, vS.set(s, s, s)); sparkPool.add(mP, p.col); }
  }
  for (const k in pools) pools[k].end();
  coinPool.end(); arrowPool.end(); ballPool.end(); sparkPool.end(); smokePool.end(); barBg.end(); barFg.end();
  // pads
  for (const p of G.pads) { if (p.done) continue; drawPad(p); const s = G.onPad === p ? 1 + Math.sin(G.t * 10) * .03 : 1; p.mesh.scale.set(s, 1, s); }
  // flags
  for (const f of flags) {
    const pos = f.geometry.attributes.position, base = f.userData.base;
    for (let i = 0; i < pos.count; i++) { const x = base[i * 3]; pos.array[i * 3 + 2] = Math.sin(x * 3 - G.t * 6 + f.userData.ph) * .12 * x; }
    pos.needsUpdate = true;
  }
  // camera
  const tz = Z3(G.heroDead > 0 ? 1320 : h.y) - 9, tx = X3(G.heroDead > 0 ? CX : h.x) * .12;
  camTarget.x += (tx - camTarget.x) * .08; camTarget.z += (Math.max(16, Math.min(Z3(H) - 22, tz)) - camTarget.z) * .08;
  camera.position.copy(camTarget).addScaledVector(CAMDIR, camDist);
  if (G.shake > 0) { camera.position.x += (Math.random() - .5) * G.shake * 2.5; camera.position.y += (Math.random() - .5) * G.shake * 2.5; }
  camera.lookAt(camTarget);
  sun.position.copy(camTarget).add(SUNOFF); sun.target.position.copy(camTarget); sun.target.updateMatrixWorld();
  // floating texts
  syncFloats();
}

// ================================================================ DOM: HUD, floats, overlay
const $ = id => document.getElementById(id);
const fxLayer = $('fx'); const ftPool = [];
function syncFloats() {
  let i = 0;
  for (const f of G.floats) {
    let el = ftPool[i]; if (!el) { el = document.createElement('div'); el.className = 'ft'; fxLayer.appendChild(el); ftPool[i] = el; }
    vP.set(X3(f.x), f.z + f.t * 3, Z3(f.y)).project(camera);
    const x = (vP.x + 1) / 2 * innerWidth, y = (1 - vP.y) / 2 * innerHeight; const a = Math.min(1, (1.4 - f.t) * 2);
    if (el._t !== f.txt) { el.textContent = f.txt; el._t = f.txt; }
    el.style.color = f.c; el.style.fontSize = f.size + 'px'; el.style.opacity = a; el.style.display = 'block';
    el.style.transform = 'translate(' + (x - el.offsetWidth / 2) + 'px,' + y + 'px)'; i++;
  }
  for (; i < ftPool.length; i++) ftPool[i].style.display = 'none';
}
let lastHud = '';
function hud(force) {
  const wave = Math.ceil(G.waveT);
  const s = [G.coins, armyCount(), G.level, Math.ceil(G.ehq.hp), wave, G.eRallyN, G.warnT > 0, hintText()].join('|');
  if (s === lastHud && !force) return; lastHud = s;
  $('coins').textContent = G.coins; $('army').textContent = '⚔ ' + armyCount() + '/' + CAP; $('lv').textContent = 'Sefer ' + G.level;
  $('bossfill').style.width = Math.max(0, G.ehq.hp / G.ehq.maxhp * 100) + '%';
  const wv = $('wave'); wv.textContent = G.over ? '' : 'Düşman hücumu: ' + Math.max(0, wave) + ' sn · ' + G.eRallyN + ' asker';
  wv.style.display = G.over ? 'none' : 'block'; wv.classList.toggle('hot', wave <= 5);
  $('warn').style.opacity = G.warnT > 0 ? 1 : 0;
  $('hint').textContent = hintText();
}
function hintText() {
  if (!G) return '';
  if (G.heroDead > 0) return 'Paşa otağda iyileşiyor… ' + Math.ceil(G.heroDead);
  if (!G.moved) return 'Ekranı sürükle, Paşa\'yı yönet';
  if (G.level === 1 && G.waves === 0 && G.waveT < 12 && G.bought === 0) return 'Düşman geliyor! Askerlerin otağın önünde savunur';
  if (G.level === 1 && G.launches === 0 && G.waves > 0) return 'Karşı saldırı için HÜCUM! alanına gir';
  if (G.level === 1 && G.bought === 0 && G.coins >= 5) return 'Akçeleri YENİÇERİ alanında harca';
  if (G.level === 1 && G.bought > 0 && G.bought < 3 && G.t < 150) return 'KULE kur, otağını savun';
  return '';
}
function initAudio() { if (AC) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
const joyEl = $('joy'), knob = $('knob');
canvas.addEventListener('pointerdown', e => { initAudio(); if (joy) return; joy = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (_) { } joyEl.style.display = 'block'; joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px'; knob.style.transform = ''; e.preventDefault(); });
canvas.addEventListener('pointermove', e => {
  if (!joy || e.pointerId !== joy.id) return; joy.x = e.clientX; joy.y = e.clientY;
  let dx = joy.x - joy.sx, dy = joy.y - joy.sy; const m = Math.hypot(dx, dy);
  if (m > 70) { joy.sx = joy.x - dx / m * 70; joy.sy = joy.y - dy / m * 70; joyEl.style.left = joy.sx + 'px'; joyEl.style.top = joy.sy + 'px'; dx = joy.x - joy.sx; dy = joy.y - joy.sy; }
  const mm = Math.hypot(dx, dy), k = mm > 40 ? 40 / mm : 1; knob.style.transform = 'translate(' + dx * k + 'px,' + dy * k + 'px)';
});
const endJoy = e => { if (joy && e.pointerId === joy.id) { joy = null; joyEl.style.display = 'none'; } };
canvas.addEventListener('pointerup', endJoy); canvas.addEventListener('pointercancel', endJoy);
addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); initAudio(); });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => { keys.clear(); joy = null; joyEl.style.display = 'none'; });
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? '🔇' : '🔊'; initAudio(); });

function showMenu() {
  $('card').innerHTML = '<h1>AKINCI</h1><h2>SINIR BOYU</h2><ul><li>Ekranı sürükle, <b>Paşa</b>\'yı yönet</li><li>Düşman dalga dalga <b>otağına hücum</b> eder, savun!</li><li>Düşenlerin <b>akçe</b>lerini topla, alanlarda harca</li><li><b>Yeniçeri, Okçu, Şahi Topu</b> al · <b>Kule</b> ve <b>Kışla</b> kur · <b>Talim</b> ile güçlen</li><li><b>HÜCUM!</b> alanıyla karşı saldırıya geç, düşman kalesini yık</li></ul>' +
    '<button class="btn" id="b1">' + (best > 1 ? 'Devam Et · Sefer ' + best : 'Sefere Başla') + '</button>' + (best > 1 ? '<button class="btn alt" id="b2">Baştan Başla</button>' : '');
  $('ov').classList.remove('hide');
  $('b1').onclick = () => start(best); if ($('b2')) $('b2').onclick = () => start(1);
}
function start(level) { initAudio(); newGame(level); $('ov').classList.add('hide'); running = true; }
function showEnd() {
  if (G.over === 'win') {
    const next = G.level + 1; if (next > best) { best = next; try { localStorage.setItem('akinci_lv', String(best)); } catch (e) { } }
    $('card').innerHTML = '<h1 style="font-size:42px">ZAFER!</h1><h2>SEFER ' + G.level + ' FETHEDİLDİ</h2><p>Düşman kalesi yıkıldı. Sıradaki sefer daha çetin: daha sık hücumlar, toplu kuleler ve okçular seni bekliyor.</p><button class="btn" id="b1">Sefer ' + next + ' →</button><button class="btn alt" id="b2">Ana Menü</button>';
    $('ov').classList.remove('hide'); $('b1').onclick = () => start(next); $('b2').onclick = showMenu;
  } else {
    $('card').innerHTML = '<h1 style="font-size:36px;color:#b5232a;text-shadow:0 3px 0 #f2c0c2">OTAĞ DÜŞTÜ</h1><h2>SEFER ' + G.level + '</h2><p>Hücumlara karşı KULE kur, askerlerini otağın önünde tut, Kışla ile sürekli asker üret.</p><button class="btn" id="b1">Tekrar Dene</button><button class="btn alt" id="b2">Ana Menü</button>';
    $('ov').classList.remove('hide'); $('b1').onclick = () => start(G.level); $('b2').onclick = showMenu;
  }
}

// ================================================================ BOOT
buildGround(); buildScenery();
newGame(best);
hero3 = buildHero();
let last = performance.now();
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (G && running && !document.hidden) update(dt);
  if (G) sync();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
$('load').style.display = 'none';
showMenu();
requestAnimationFrame(loop);
window.__akinci = { get G() { return G; }, start, update: d => update(d), sync: () => sync(), render: () => renderer.render(scene, camera) };
})();
