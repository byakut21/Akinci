/* Akıncı: Sınır Boyu — v1.2 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { A, loadAll, cloneChar, clipsFor, instGeo, cloneModel } from './assets.js';
import { initAudio, sfx, setMusic, setSfx, audioState, setIntensity } from './audio.js';

const T3 = THREE, PI = Math.PI;
// ================================================================ WORLD (2D logic in px, 3D: X=(x-CX)*K, Z=y*K)
const K = 0.1, W = 260, CX = 130, H = 1180, CAP = 40;
const L = y => 18 + 8 * Math.sin(y / 200 + .5);
const R = y => W - 18 + 8 * Math.sin(y / 170 + 2);
const clampX = (x, y, r) => Math.max(L(y) + r, Math.min(R(y) - r, x));
const X3 = x => (x - CX) * K, Z3 = y => y * K;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const AREA = { lairY: 70, spawnY: 140, danger: 420, border: 770, rallyY: 845 };
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const TYPES = {
  piyade: { team: 0, model: 'knight', h: 2.5, hp: 60, dmg: 10, range: 14, cd: .85, spd: 64, r: 9, hitDelay: .3, snd: 'sword', anim: { idle: 'Idle', run: 'Running_A', atk: '1H_Melee_Attack_Chop', die: 'Death_A', win: 'Cheer' } },
  okcu: { team: 0, model: 'rogue', h: 2.4, hp: 36, dmg: 8, range: 140, cd: 1.2, spd: 60, r: 8, ranged: 'arrow', hitDelay: .3, anim: { idle: 'Idle', run: 'Running_A', atk: '2H_Ranged_Shoot', die: 'Death_A', win: 'Cheer' } },
  balta: { team: 0, model: 'barbarian', h: 2.6, hp: 140, dmg: 22, range: 16, cd: 1.3, spd: 54, r: 11, cleave: 24, hitDelay: .45, snd: 'axe', anim: { idle: '2H_Melee_Idle', run: 'Running_A', atk: '2H_Melee_Attack_Chop', die: 'Death_B', win: 'Cheer' } },
  minion: { team: 1, model: 'sk_minion', h: 2.3, hp: 30, dmg: 6, range: 14, cd: 1.0, spd: 70, r: 8, bounty: 1, hitDelay: .3, snd: 'sword', anim: { idle: 'Idle_Combat', run: 'Running_C', atk: '1H_Melee_Attack_Chop', die: 'Death_C_Skeletons', spawn: 'Spawn_Ground' } },
  warrior: { team: 1, model: 'sk_warrior', h: 2.5, hp: 85, dmg: 12, range: 15, cd: 1.25, spd: 50, r: 10, bounty: 3, hitDelay: .35, snd: 'axe', anim: { idle: 'Idle_Combat', run: 'Walking_A', atk: '1H_Melee_Attack_Chop', die: 'Death_C_Skeletons', spawn: 'Spawn_Ground' } },
  skrogue: { team: 1, model: 'sk_rogue', h: 2.4, hp: 34, dmg: 7, range: 125, cd: 1.6, spd: 56, r: 8, bounty: 2, ranged: 'arrow', hitDelay: .35, anim: { idle: 'Idle_Combat', run: 'Running_C', atk: '1H_Ranged_Shoot', die: 'Death_C_Skeletons', spawn: 'Spawn_Ground' } },
  mage: { team: 1, model: 'sk_mage', h: 2.5, hp: 44, dmg: 13, range: 135, cd: 2.3, spd: 48, r: 8, bounty: 3, ranged: 'magic', splash: 26, hitDelay: .5, anim: { idle: 'Idle_Combat', run: 'Walking_A', atk: 'Spellcast_Shoot', die: 'Death_C_Skeletons', spawn: 'Spawn_Ground' } },
  boss: { team: 1, model: 'sk_warrior', h: 5.4, hp: 650, dmg: 32, range: 22, cd: 1.7, spd: 38, r: 20, bounty: 15, hitDelay: .45, snd: 'axe', boss: true, anim: { idle: 'Idle_Combat', run: 'Walking_A', atk: '1H_Melee_Attack_Chop', die: 'Death_C_Skeletons', spawn: 'Spawn_Ground' } },
  hero: { team: 0, hp: 240, dmg: 15, range: 165, cd: .5, spd: 230, r: 13 }
};
const BT = {
  lair: { hp: 1400, r: 55 }, castle: { hp: 1600, r: 42, w: 10.5, range: 165, dmg: 8, cd: 1.1, model: 'castle' },
  mine: { hp: 500, r: 26, w: 6.0, model: 'mine' }, tower: { hp: 450, r: 20, w: 4.4, range: 175, dmg: 10, cd: .9, model: 'tower' },
  barracks: { hp: 500, r: 28, w: 6.2, model: 'barracks' }
};

// ================================================================ RENDERER
const canvas = document.getElementById('c');
const renderer = new T3.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T3.PCFSoftShadowMap;
renderer.outputColorSpace = T3.SRGBColorSpace;
renderer.toneMapping = T3.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new T3.Scene();
const SKY = 0xbfdcf0; scene.background = new T3.Color(SKY); scene.fog = new T3.Fog(SKY, 90, 200);
const pmrem = new T3.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .3;
const camera = new T3.PerspectiveCamera(38, 1, 1, 400);
const CAMDIR = new T3.Vector3(0, .8, .6).normalize(); let camDist = 70;
scene.add(new T3.HemisphereLight(0xdcecff, 0x55603a, .85));
const sun = new T3.DirectionalLight(0xfff0d8, 2.1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 42, bottom: -42, near: 1, far: 160 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = .04; scene.add(sun, sun.target);
const SUNOFF = new T3.Vector3(-22, 55, 18);
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  const tan = Math.tan(T3.MathUtils.degToRad(camera.fov / 2));
  camDist = Math.max(25.5 / (2 * tan * camera.aspect), 46);
  scene.fog.near = camDist * 1.25; scene.fog.far = camDist * 2.8; camera.far = camDist * 3.2; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ================================================================ INSTANCE POOLS
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
let P = null;
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
function makePools() {
  const coin = instGeo('dungeon', 'coin');
  const coinMat = coin.mat.clone(); coinMat.metalness = .55; coinMat.roughness = .3; coinMat.emissive = new T3.Color(0x3a2600); coinMat.emissiveIntensity = .5;
  const arrow = instGeo('weapons', 'arrow');
  const barGeo = new T3.PlaneGeometry(1, .22);
  P = {
    coin: new Pool(centered(coin, .8), coinMat, 700, true),
    arrow: new Pool(centered(arrow, 1.4, true), arrow.mat, 260),
    orb: new Pool(new T3.IcosahedronGeometry(.32, 1), new T3.MeshBasicMaterial({ color: 0xd9a6ff, transparent: true, opacity: .95, blending: T3.AdditiveBlending, depthWrite: false }), 60),
    glow: new Pool(new T3.PlaneGeometry(1, 1), new T3.MeshBasicMaterial({ map: glowTex(), color: 0xffffff, transparent: true, blending: T3.AdditiveBlending, depthWrite: false }), 400),
    spark: new Pool(new T3.BoxGeometry(.16, .16, .16), new T3.MeshBasicMaterial({ color: 0xffffff }), 600),
    bone: new Pool(new T3.BoxGeometry(.12, .12, .34), new T3.MeshLambertMaterial({ color: 0xece4d0 }), 400),
    smoke: new Pool(new T3.IcosahedronGeometry(.6, 1), new T3.MeshLambertMaterial({ color: 0xe8e8e8, transparent: true, opacity: .5, depthWrite: false }), 300),
    barBg: new Pool(barGeo, new T3.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .55, depthTest: false, depthWrite: false }), 260),
    barFg: new Pool(barGeo, new T3.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false }), 260)
  };
  P.glow.m.renderOrder = 5; P.barBg.m.renderOrder = 10; P.barFg.m.renderOrder = 11;
}

// ================================================================ WORLD BUILD
const HEX = 3.0, HW = 2 * HEX, HZ = 2.3 * HEX * .75;
function buildWorld() {
  seed = 1234;
  const tile = instGeo('world', 'hex_grass');
  const cells = [], deco = {};
  const addDeco = (k, x, z, s, ry, y = 0) => { (deco[k] = deco[k] || []).push([x, y, z, s, ry]); };
  for (let row = -10; row < 42; row++) {
    for (let col = -11; col <= 11; col++) {
      const X = col * HW + (row & 1 ? HW / 2 : 0), Z = row * HZ;
      const px = X / K + CX, py = Z / K;
      const inside = px > L(py) - 14 && px < R(py) + 14 && py > -60 && py < H + 50;
      const edge = Math.min(Math.abs(px - L(py)), Math.abs(px - R(py)));
      let lift = 0; if (!inside) lift = Math.max(0, Math.min(1.2, (edge - 14) / 60)) * (.2 + rnd() * .5);
      const c = new T3.Color(); const v = .88 + rnd() * .14; c.setRGB(v * .6, v * .8, v * .5);
      const cor = Math.max(0, Math.min(1, (AREA.danger + 40 - py) / 300));
      if (cor > 0) c.lerp(new T3.Color(.3, .22, .36), Math.min(1, cor * 1.1));
      cells.push({ X, Z, lift, c });
      const ry = Math.floor(rnd() * 6) * PI / 3, r = rnd();
      if (!inside) {
        const far = edge > 90 || py < -60 || py > H + 50;
        if (py < -70 && Math.abs(X) < 30) addDeco(r < .5 ? 'mountain_A' : (r < .8 ? 'mountain_B' : 'mountain_C'), X, Z, HEX, ry, lift);
        else if (far) addDeco(r < .3 ? 'mountain_A' : r < .55 ? 'hills_A' : r < .75 ? 'hills_B' : r < .9 ? 'mountain_C' : 'trees_A_large', X, Z, HEX, ry, lift);
        else addDeco(r < .35 ? 'trees_A_large' : r < .6 ? 'trees_B_large' : r < .75 ? 'trees_A_medium' : r < .85 ? 'hills_C' : 'trees_B_medium', X, Z, HEX, ry, lift);
      } else if (r < .05 && (py < AREA.danger - 40 || (py > AREA.danger + 60 && py < AREA.border - 40))) {
        addDeco(['rock_A', 'rock_B', 'rock_C', 'rock_D', 'rock_E'][Math.floor(rnd() * 5)], X + (rnd() - .5) * 2, Z + (rnd() - .5) * 2, HEX * .8, rnd() * PI * 2, 0);
      }
    }
  }
  const im = new T3.InstancedMesh(tile.geo, tile.mat.clone(), cells.length); im.receiveShadow = true;
  const m4 = new T3.Matrix4(), qq = new T3.Quaternion(), ss = new T3.Vector3(), pp = new T3.Vector3();
  cells.forEach((c, i) => { m4.compose(pp.set(c.X, c.lift, c.Z), qq.identity(), ss.set(HEX, HEX, HEX)); im.setMatrixAt(i, m4); im.setColorAt(i, c.c); });
  scene.add(im);
  for (const [k, list] of Object.entries(deco)) {
    const g = instGeo('world', k); const dm = new T3.InstancedMesh(g.geo, g.mat, list.length); dm.castShadow = true; dm.receiveShadow = true;
    list.forEach(([x, y, z, s_, ry], i) => { qq.setFromAxisAngle(YAX, ry); m4.compose(pp.set(x, y, z), qq, ss.set(s_, s_ * (k.startsWith('rock') ? 1 : .9 + rnd() * .25), s_)); dm.setMatrixAt(i, m4); });
    scene.add(dm);
  }
  const prop = (lib, key, x, y, w, ry = 0) => { const o = cloneModel(lib, key, w); o.position.set(X3(x), 0, Z3(y)); o.rotation.y = ry; scene.add(o); return o; };
  for (const x of [L(AREA.border) + 6, R(AREA.border) - 6]) prop('world', 'flag_green', x, AREA.border, 1.8);
  for (const x of [L(AREA.danger) + 6, R(AREA.danger) - 6]) prop('world', 'flag_red', x, AREA.danger, 1.8);
  prop('world', 'barrel', 76, 1094, 1.1); prop('world', 'barrel', 84, 1106, 1.0, 1); prop('world', 'crate', 180, 1100, 1.4, .4);
  prop('world', 'weaponrack', 24, 925, 2.4, PI / 2); prop('world', 'target', 238, 915, 2.2, -PI / 2); prop('world', 'wheelbarrow', 14, 1012, 1.8, .8);
  prop('world', 'sack', 186, 1112, 1.0); prop('world', 'bucket_arrows', 236, 945, .9);
  const lp = (key, x, y, w, ry = 0) => prop('dungeon', key, x, y, w, ry);
  lp('rubble_large', 40, 110, 4.5, .6); lp('rubble_half', 220, 120, 3.5, 2.1); lp('rubble_half', 70, 175, 2.5, 1);
  lp('spikes', 60, 215, 3.6); lp('spikes', 200, 210, 3.6, .3); lp('spikes', 130, 250, 3.6, .8);
  lp('pillar', 68, 100, 2.0); lp('pillar', 192, 100, 2.0); lp('barrier', 30, 155, 2.6, .4); lp('barrier', 232, 165, 2.6, -.4);
  lp('banner_red', 95, 66, 2.6); lp('banner_red', 165, 66, 2.6); lp('chest_gold', 155, 125, 1.6, -.4);
}
function buildLair() {
  const g = new T3.Group();
  const door = cloneModel('dungeon', 'doorway', 9.5); g.add(door);
  const box = new T3.Box3().setFromObject(door); const dw = box.max.x - box.min.x, dh = box.max.y - box.min.y;
  for (const sx of [-1, 1]) { const w = cloneModel('dungeon', 'wall_broken', 7.0); w.position.set(sx * (dw / 2 + 3.3), 0, 0); g.add(w); }
  for (const sx of [-1, 1]) { const t = cloneModel('dungeon', 'torch', .9); t.position.set(sx * dw * .36, dh * .45, box.max.z + .15); g.add(t); }
  const pm = new T3.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T3.AdditiveBlending, side: T3.DoubleSide, uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float t;
      void main(){ vec2 p=vUv*2.0-1.0; p.y*=1.2; float r=length(p); float a=atan(p.y,p.x);
        float sw=sin(a*5.0 - r*9.0 + t*3.0)*.5+.5; float sw2=sin(a*3.0 + r*14.0 - t*4.0)*.5+.5;
        float m=smoothstep(1.0,.1,r); vec3 c=mix(vec3(.3,.0,.5),vec3(.9,.4,1.0),sw*sw2); c+=vec3(1.0,.85,1.0)*smoothstep(.35,.0,r)*.9;
        gl_FragColor=vec4(c*m, m); }`
  });
  const portal = new T3.Mesh(new T3.PlaneGeometry(dw * .44, dh * .66), pm); portal.position.set(0, dh * .33, (box.min.z + box.max.z) / 2); g.add(portal);
  g.userData.portal = pm;
  g.userData.mats = []; g.traverse(o => { if (o.isMesh && o.material && o.material.emissive) { o.material = o.material.clone(); g.userData.mats.push(o.material); } });
  return g;
}

// ================================================================ HERO (horse archer)
function stdM(c, o) { return new T3.MeshStandardMaterial(Object.assign({ color: c, roughness: .75, metalness: 0 }, o || {})); }
function mesh(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const m = new T3.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m; }
function buildHorse() {
  const g = new T3.Group();
  const coat = stdM(0x8a5532), dark = stdM(0x2e1d12), hoof = stdM(0x252020), white = stdM(0xf3ecdf), red = stdM(0xb3262e), gold = stdM(0xe3a62c, { metalness: .6, roughness: .35 }), teal = stdM(0x14a39a), leather = stdM(0x4a2c18);
  const body = new T3.Group(); body.position.y = 1.55; g.add(body);
  mesh(body, new T3.CapsuleGeometry(.52, 1.35, 6, 14), coat, 0, 0, 0, PI / 2);
  mesh(body, new T3.SphereGeometry(.6, 14, 10), coat, 0, .04, .72);
  mesh(body, new T3.SphereGeometry(.62, 14, 10), coat, 0, .06, -.72);
  const neck = new T3.Group(); neck.position.set(0, .3, 1.0); neck.rotation.x = .62; body.add(neck);
  mesh(neck, new T3.CylinderGeometry(.24, .4, 1.25, 12), coat, 0, .55, 0);
  mesh(neck, new T3.BoxGeometry(.12, 1.15, .26), dark, 0, .62, -.24);
  const head = new T3.Group(); head.position.set(0, 1.2, .05); head.rotation.x = 1.0; neck.add(head);
  mesh(head, new T3.BoxGeometry(.4, .44, .7), coat, 0, 0, .2);
  mesh(head, new T3.BoxGeometry(.34, .34, .42), stdM(0x6e4227), 0, -.06, .68);
  mesh(head, new T3.BoxGeometry(.3, .04, .3), white, 0, .2, .35);
  for (const sx of [-1, 1]) { mesh(head, new T3.ConeGeometry(.08, .26, 6), coat, sx * .12, .3, -.05, -.2); mesh(head, new T3.SphereGeometry(.05, 8, 6), stdM(0x111111), sx * .2, .07, .25); }
  mesh(head, new T3.BoxGeometry(.44, .05, .05), gold, 0, .05, .5); mesh(head, new T3.BoxGeometry(.05, .05, .5), gold, .21, .05, .3); mesh(head, new T3.BoxGeometry(.05, .05, .5), gold, -.21, .05, .3);
  const tail = new T3.Group(); tail.position.set(0, .3, -1.22); body.add(tail);
  mesh(tail, new T3.CylinderGeometry(.13, .04, 1.1, 8), dark, 0, -.5, -.18, .45);
  const legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const hip = new T3.Group(); hip.position.set(sx * .3, -.2, sz * .82); body.add(hip);
    mesh(hip, new T3.CylinderGeometry(.17, .12, .72, 8), coat, 0, -.36, 0);
    const knee = new T3.Group(); knee.position.y = -.72; hip.add(knee);
    mesh(knee, new T3.CylinderGeometry(.1, .09, .55, 8), coat, 0, -.27, 0);
    mesh(knee, new T3.CylinderGeometry(.11, .1, .1, 8), white, 0, -.5, 0);
    mesh(knee, new T3.CylinderGeometry(.12, .14, .14, 8), hoof, 0, -.6, .02);
    legs.push({ hip, knee, front: sz > 0 });
  }
  mesh(body, new T3.BoxGeometry(1.18, .07, 1.25), red, 0, .5, -.05);
  for (const sx of [-1, 1]) { mesh(body, new T3.BoxGeometry(.05, .62, 1.25), red, sx * .6, .22, -.05); mesh(body, new T3.BoxGeometry(.06, .07, 1.27), gold, sx * .61, -.08, -.05); mesh(body, new T3.BoxGeometry(.06, .62, .07), gold, sx * .61, .22, .57); mesh(body, new T3.BoxGeometry(.06, .62, .07), gold, sx * .61, .22, -.67); }
  mesh(body, new T3.BoxGeometry(.66, .16, .8), leather, 0, .6, -.05); mesh(body, new T3.BoxGeometry(.3, .26, .14), leather, 0, .7, .32); mesh(body, new T3.BoxGeometry(.5, .2, .12), leather, 0, .68, -.45);
  mesh(body, new T3.BoxGeometry(.64, .05, .3), teal, 0, .69, -.05);
  for (const sx of [-1, 1]) mesh(body, new T3.BoxGeometry(.04, .55, .04), leather, sx * .5, .2, .05);
  return { g, body, neck, head, tail, legs };
}
function buildBow() {
  const g = new T3.Group();
  const wood = stdM(0x5a3416), gold = stdM(0xe3a62c, { metalness: .6, roughness: .35 });
  const arc = new T3.Mesh(new T3.TorusGeometry(.62, .045, 6, 22, PI * .9), wood); arc.rotation.z = PI / 2 - PI * .45; g.add(arc);
  for (const a of [PI / 2 - PI * .45, PI / 2 + PI * .45]) { const tip = new T3.Mesh(new T3.SphereGeometry(.06, 6, 5), gold); tip.position.set(Math.cos(a) * .62, Math.sin(a) * .62, 0); g.add(tip); }
  const str = new T3.Mesh(new T3.CylinderGeometry(.01, .01, 1.22, 4), stdM(0xffffff)); str.position.x = .1; g.add(str);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function buildTurban() {
  const g = new T3.Group();
  const m = new T3.Mesh(new T3.SphereGeometry(.42, 16, 12), stdM(0xf7f3ea)); m.scale.set(1, .72, 1); g.add(m);
  const band = new T3.Mesh(new T3.TorusGeometry(.39, .07, 8, 20), stdM(0xe3a62c, { metalness: .5, roughness: .35 })); band.rotation.x = PI / 2; band.position.y = -.08; g.add(band);
  const pl = new T3.Mesh(new T3.ConeGeometry(.07, .55, 6), stdM(0xb3262e)); pl.position.set(0, .4, .14); pl.rotation.x = -.25; g.add(pl);
  const jw = new T3.Mesh(new T3.SphereGeometry(.08, 8, 6), stdM(0x2fc7bd, { metalness: .3, roughness: .2 })); jw.position.set(0, .12, .37); g.add(jw);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
const LOWER = { id: 'lower', fn: n => /hips|leg|foot|toe|knee|heel|control|IK-|^root$/.test(n) };
const UPPER = { id: 'upper', fn: n => !/hips|leg|foot|toe|knee|heel|control|IK-|^root$/.test(n) };
const HERO_TUNE = { riderY: .2, riderZ: .38, bowRot: [0, PI / 2, 0], turbanY: .74, turbanS: 1.2 };
let hero3 = null;
function buildHero() {
  const g = new T3.Group();
  const horse = buildHorse(); g.add(horse.g);
  const rider = cloneChar('hero', 2.45); horse.body.add(rider); rider.position.set(0, HERO_TUNE.riderY, HERO_TUNE.riderZ);
  const mixer = new T3.AnimationMixer(rider);
  const lower = clipsFor('hero', LOWER), upper = clipsFor('hero', UPPER);
  mixer.clipAction(lower['Sit_Chair_Pose']).play();
  const acts = { idle: mixer.clipAction(upper['Idle']), aim: mixer.clipAction(upper['1H_Ranged_Aiming']), shoot: mixer.clipAction(upper['1H_Ranged_Shoot']) };
  acts.idle.play(); acts.shoot.setLoop(T3.LoopOnce); acts.shoot.clampWhenFinished = true;
  const s = rider.scale.x;
  const lh = rider.getObjectByName('handslotl'); const bow = buildBow(); bow.scale.setScalar(1 / s); bow.rotation.fromArray(HERO_TUNE.bowRot); if (lh) lh.add(bow);
  const hd = rider.getObjectByName('head'); const tb = buildTurban(); tb.scale.setScalar(HERO_TUNE.turbanS / s); tb.position.set(0, HERO_TUNE.turbanY / s, 0); if (hd) hd.add(tb);
  const ring = new T3.Mesh(new T3.RingGeometry(1.7, 2.05, 48), new T3.MeshBasicMaterial({ color: 0x2fe0d2, transparent: true, opacity: .8, depthWrite: false }));
  ring.rotation.x = -PI / 2; ring.position.y = .1; g.add(ring);
  const mats = []; g.traverse(o => { if (o.isMesh && o.material && o.material.emissive && !mats.includes(o.material)) mats.push(o.material); });
  g.scale.setScalar(1.15);
  scene.add(g);
  return { g, horse, rider, mixer, acts, cur: 'idle', ring, mats, phase: 0, speed: 0 };
}
function heroAnim(h3, u, dt) {
  const hz = h3.horse;
  h3.speed += ((u.moving ? 1 : 0) - h3.speed) * Math.min(1, dt * 6);
  h3.phase += dt * (3 + 10 * h3.speed);
  const p = h3.phase, k = h3.speed, off = [0, .55, PI, PI + .55];
  hz.legs.forEach((l, i) => { const ph = p + off[i]; l.hip.rotation.x = Math.sin(ph) * .75 * k; l.knee.rotation.x = (l.front ? 1 : -1) * Math.max(0, Math.sin(ph + (l.front ? .6 : -.6))) * 1.1 * k; });
  hz.body.position.y = 1.55 + Math.abs(Math.sin(p)) * .14 * k + Math.sin(G.t * 2) * .02;
  hz.body.rotation.x = Math.sin(p) * .07 * k;
  hz.neck.rotation.x = .62 + Math.sin(p + .8) * .16 * k + Math.sin(G.t * 1.3) * .03 * (1 - k);
  hz.tail.rotation.x = .2 + Math.sin(p * .5) * .25 * k + Math.sin(G.t * 1.7) * .1;
  hz.tail.rotation.z = Math.sin(G.t * 1.1) * .15;
  const want = u.atkT > 0 ? 'shoot' : (u.aiming ? 'aim' : 'idle');
  if (want !== h3.cur) { const a = h3.acts[want], b = h3.acts[h3.cur]; a.reset(); a.play(); a.fadeIn(.12); b.fadeOut(.12); h3.cur = want; }
  h3.mixer.update(dt);
}

// ================================================================ PADS
function padIcon(g, kind, cx, cy, s) {
  g.save(); g.translate(cx, cy); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
  const Wc = '#ffffff', GO = '#ffd75e';
  if (kind === 'piyade') { g.fillStyle = '#a9bdd2'; g.beginPath(); g.moveTo(-26, -30); g.lineTo(26, -30); g.lineTo(26, 0); g.quadraticCurveTo(26, 28, 0, 40); g.quadraticCurveTo(-26, 28, -26, 0); g.closePath(); g.fill(); g.fillStyle = Wc; g.fillRect(-4, -22, 8, 50); g.fillRect(-18, -6, 36, 8); }
  else if (kind === 'okcu') { g.strokeStyle = Wc; g.lineWidth = 6; g.beginPath(); g.arc(-8, 0, 32, -1.2, 1.2); g.stroke(); g.lineWidth = 2; g.beginPath(); g.moveTo(3, -30); g.lineTo(3, 30); g.stroke(); g.lineWidth = 4; g.strokeStyle = GO; g.beginPath(); g.moveTo(-30, 0); g.lineTo(30, 0); g.stroke(); g.fillStyle = GO; g.beginPath(); g.moveTo(38, 0); g.lineTo(26, -7); g.lineTo(26, 7); g.fill(); }
  else if (kind === 'balta') { g.strokeStyle = '#c08a54'; g.lineWidth = 7; g.beginPath(); g.moveTo(-18, 34); g.lineTo(14, -30); g.stroke(); g.fillStyle = Wc; g.beginPath(); g.moveTo(8, -36); g.quadraticCurveTo(40, -30, 34, 0); g.lineTo(18, -8); g.closePath(); g.fill(); g.beginPath(); g.moveTo(8, -36); g.quadraticCurveTo(-14, -40, -12, -14); g.lineTo(2, -18); g.closePath(); g.fill(); }
  else if (kind === 'kule') { g.fillStyle = Wc; g.fillRect(-14, -18, 28, 50); for (let i = -16; i < 16; i += 11) g.fillRect(i, -26, 7, 9); g.fillStyle = '#3fae5a'; g.beginPath(); g.moveTo(-20, -26); g.lineTo(0, -48); g.lineTo(20, -26); g.closePath(); g.fill(); g.fillStyle = '#2b2d31'; g.fillRect(-4, 0, 8, 12); }
  else if (kind === 'kisla') { g.fillStyle = Wc; g.fillRect(-28, -6, 56, 34); g.fillStyle = '#3fae5a'; g.beginPath(); g.moveTo(-34, -6); g.lineTo(0, -32); g.lineTo(34, -6); g.closePath(); g.fill(); g.fillStyle = '#2b2d31'; g.fillRect(-7, 8, 14, 20); }
  else if (kind === 'maden') { g.fillStyle = '#8a8f96'; g.beginPath(); g.moveTo(-36, 30); g.lineTo(-10, -26); g.lineTo(14, -6); g.lineTo(26, -18); g.lineTo(40, 30); g.closePath(); g.fill(); g.fillStyle = '#2b2d31'; g.beginPath(); g.arc(4, 30, 13, PI, 0); g.fill(); for (const [x, y] of [[-14, 18], [-4, 26], [-22, 26], [-12, 30]]) { g.fillStyle = GO; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.strokeStyle = '#a86d00'; g.lineWidth = 2; g.stroke(); } }
  else if (kind === 'upg') { g.fillStyle = GO; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-24, 20 - i * 18); g.lineTo(0, 2 - i * 18); g.lineTo(24, 20 - i * 18); g.lineTo(24, 30 - i * 18); g.lineTo(0, 12 - i * 18); g.lineTo(-24, 30 - i * 18); g.closePath(); g.fill(); } }
  else if (kind === 'atk') { g.strokeStyle = Wc; g.lineWidth = 8; g.beginPath(); g.moveTo(-28, -30); g.lineTo(26, 24); g.moveTo(28, -30); g.lineTo(-26, 24); g.stroke(); g.strokeStyle = GO; g.beginPath(); g.moveTo(14, 26); g.lineTo(32, 10); g.moveTo(-14, 26); g.lineTo(-32, 10); g.stroke(); }
  g.restore();
}
function makePadMesh(p) {
  const cv = document.createElement('canvas'); cv.width = Math.round(5 * p.w); cv.height = Math.round(5 * p.h);
  const tex = new T3.CanvasTexture(cv); tex.colorSpace = T3.SRGBColorSpace; tex.anisotropy = 8;
  const geo = new T3.PlaneGeometry(p.w * K, p.h * K); geo.rotateX(-PI / 2);
  const m = new T3.Mesh(geo, new T3.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false }));
  m.position.set(X3(p.x), .12, Z3(p.y)); m.renderOrder = 2; scene.add(m);
  Object.assign(p, { mesh: m, cv, tex, key: '' });
}
function drawPad(p) {
  const full = p.unit && armyCount() >= CAP, act = G.onPad === p, left = p.cost ? p.cost - p.paid : 0;
  const key = [p.paid, p.cost, full, act, p.attack ? G.rallyN : 0, p.attack ? Math.round(p.hold * 20) : 0, G.coins >= left].join('|');
  if (key === p.key) return; p.key = key;
  const g = p.cv.getContext('2d'), w = p.cv.width, h = p.cv.height, rr = Math.min(w, h) * .14;
  g.clearRect(0, 0, w, h);
  g.fillStyle = p.attack ? 'rgba(150,24,30,.66)' : 'rgba(16,22,28,.6)'; g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, rr); g.fill();
  if (!p.attack && p.cost && p.paid > 0) { g.save(); g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, rr); g.clip(); const pr = p.paid / p.cost; g.fillStyle = 'rgba(255,200,50,.6)'; g.fillRect(0, h * (1 - pr), w, h * pr); g.restore(); }
  if (p.attack && p.hold > 0) { g.save(); g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, rr); g.clip(); g.fillStyle = 'rgba(255,215,94,.6)'; g.fillRect(0, 0, w * p.hold / .6, h); g.restore(); }
  g.strokeStyle = act ? '#ffd75e' : '#ffffff'; g.lineWidth = 12; g.lineCap = 'round';
  const c = Math.min(w, h) * .2, m = 12;
  for (const [x, dx] of [[m, 1], [w - m, -1]]) for (const [y, dy] of [[m, 1], [h - m, -1]]) { g.beginPath(); g.moveTo(x, y + dy * c); g.lineTo(x, y); g.lineTo(x + dx * c, y); g.stroke(); }
  const S = Math.min(w, h) / 300;
  padIcon(g, p.icon, w / 2, h * .34, 1.75 * S);
  const font = sz => '900 ' + sz + 'px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
  const label = (t, x, y, sz, col) => { g.font = font(sz); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = sz / 4; g.strokeStyle = 'rgba(20,16,12,.9)'; g.lineJoin = 'round'; g.strokeText(t, x, y); g.fillStyle = col; g.fillText(t, x, y); };
  const ly = h * .67, cy = h * .86, fs = Math.round(52 * S);
  label(p.label, w / 2, ly, p.label.length > 7 ? Math.round(fs * .82) : fs, p.attack ? '#ffd75e' : '#ffffff');
  if (p.attack) label(G.rallyN + ' asker', w / 2, cy, Math.round(fs * .8), '#ffffff');
  else if (full) label('DOLU', w / 2, cy, Math.round(fs * .85), '#ff8a8a');
  else {
    const t = String(left); g.font = font(Math.round(fs * .95)); const tw = g.measureText(t).width; const r = 22 * S; const x0 = w / 2 - (tw + r * 2 + 8) / 2;
    const gr = g.createRadialGradient(x0 + r * .8, cy - r * .3, 1, x0 + r, cy, r); gr.addColorStop(0, '#fff0a8'); gr.addColorStop(.6, '#f2b21b'); gr.addColorStop(1, '#a86d00');
    g.fillStyle = gr; g.beginPath(); g.arc(x0 + r, cy, r, 0, 7); g.fill();
    g.textAlign = 'left'; g.lineWidth = fs / 4; g.strokeStyle = 'rgba(20,16,12,.9)'; g.strokeText(t, x0 + r * 2 + 8, cy + 2); g.fillStyle = G.coins >= left ? '#ffe58a' : '#ffb0a0'; g.fillText(t, x0 + r * 2 + 8, cy + 2);
  }
  p.tex.needsUpdate = true;
}

// ================================================================ STATE
let G = null, best = 1, running = false;
try { best = Math.max(1, parseInt(localStorage.getItem('akinci_lv')) || 1); } catch (e) { }
function makeUnit(type, x, y, state) {
  const T = TYPES[type]; const m = T.team ? G.em : G.upg;
  const u = { kind: 'u', type, team: T.team, T, x, y, hp: T.hp * m, maxhp: T.hp * m, dmg: T.dmg * m, range: T.range, cdMax: T.cd, cd: Math.random() * T.cd, spd: T.spd * (.92 + Math.random() * .16), r: T.r, state, rot: T.team ? 0 : PI, hit: 0, atkT: 0, moving: false, dying: 0, spawnT: 0, pending: null };
  if (type !== 'hero') {
    u.obj = cloneChar(T.model, T.h); u.obj.position.set(X3(x), 0, Z3(y)); u.obj.rotation.y = u.rot; scene.add(u.obj);
    u.mixer = new T3.AnimationMixer(u.obj); u.clips = clipsFor(T.model); u.actions = {}; u.cur = null; u.curName = '';
    play(u, T.anim.idle);
  }
  G.units.push(u); return u;
}
function play(u, name, once = false, ts = 1, fade = .15) {
  if (!once && u.curName === name) return 0;
  const clip = u.clips[name]; if (!clip) return 0;
  let a = u.actions[name]; if (!a) { a = u.mixer.clipAction(clip); u.actions[name] = a; }
  a.reset(); a.setLoop(once ? T3.LoopOnce : T3.LoopRepeat, Infinity); a.clampWhenFinished = once; a.timeScale = ts; a.play();
  if (u.cur && u.cur !== a) { a.fadeIn(fade); u.cur.fadeOut(fade); }
  u.cur = a; u.curName = name; return clip.duration / ts;
}
function setFlash(mats, v) { for (const m of mats) if (m.emissive) m.emissive.setRGB(v, v * .95, v * .9); }
function unitMats(u) { if (!u._mats) { const b = u.obj.userData.body.material; u._mats = Array.isArray(b) ? b : [b]; } return u._mats; }
function addBld(team, type, x, y) {
  const B = BT[type]; const m = team ? G.em : 1;
  const o = { kind: 'b', team, type, x, y, r: B.r, hp: B.hp * m, maxhp: B.hp * m, dmg: (B.dmg || 0), range: B.range || 0, cdMax: B.cd || 1, cd: 1, hit: 0, spawnT: 0, pile: 0, prodT: 0 };
  if (type === 'lair') o.obj = buildLair();
  else { o.obj = cloneModel('world', B.model, B.w); o.obj.userData.mats = []; o.obj.traverse(c => { if (c.isMesh) { c.material = c.material.clone(); o.obj.userData.mats.push(c.material); } }); }
  o.obj.position.set(X3(x), 0, Z3(y)); scene.add(o.obj);
  G.blds.push(o); return o;
}
function makePads() {
  const list = [
    { id: 'atk', x: 130, y: 790, w: 84, h: 62, label: 'HÜCUM!', icon: 'atk', attack: true, hold: 0, cool: 0 },
    { id: 't1', x: 40, y: 790, w: 62, h: 58, label: 'KULE', icon: 'kule', cost: 20, paid: 0, once: true, build: 'tower' },
    { id: 't2', x: 220, y: 790, w: 62, h: 58, label: 'KULE', icon: 'kule', cost: 20, paid: 0, once: true, build: 'tower' },
    { id: 'piyade', x: 52, y: 975, w: 74, h: 60, label: 'PİYADE', icon: 'piyade', cost: 5, inc: 1, max: 14, paid: 0, unit: 'piyade' },
    { id: 'okcu', x: 130, y: 975, w: 74, h: 60, label: 'OKÇU', icon: 'okcu', cost: 8, inc: 2, max: 22, paid: 0, unit: 'okcu' },
    { id: 'balta', x: 208, y: 975, w: 74, h: 60, label: 'BALTACI', icon: 'balta', cost: 15, inc: 4, max: 40, paid: 0, unit: 'balta' },
    { id: 'm2', x: 226, y: 1058, w: 62, h: 60, label: 'MADEN', icon: 'maden', cost: 20, paid: 0, once: true, build: 'mine' },
    { id: 'k1', x: 42, y: 1142, w: 68, h: 54, label: 'KIŞLA', icon: 'kisla', cost: 30, paid: 0, once: true, build: 'barracks' },
    { id: 'upg', x: 130, y: 1150, w: 78, h: 46, label: 'TALİM', icon: 'upg', cost: 30, inc: 25, max: 500, paid: 0, upg: true },
    { id: 'k2', x: 218, y: 1142, w: 68, h: 54, label: 'KIŞLA', icon: 'kisla', cost: 30, paid: 0, once: true, build: 'barracks' }
  ];
  for (const p of list) makePadMesh(p);
  return list;
}
function clearGame() {
  if (!G) return;
  for (const u of G.units) if (u.obj) scene.remove(u.obj);
  for (const b of G.blds) scene.remove(b.obj);
  for (const p of G.pads) { scene.remove(p.mesh); p.tex.dispose(); }
}
function newGame(level) {
  clearGame();
  seed = level * 977 + 13;
  G = { level, t: 0, coins: 10, units: [], blds: [], proj: [], coinsArr: [], parts: [], floats: [], fly: [], upg: 1, em: 1 + .2 * (level - 1),
    payT: 0, heroDead: 0, shake: 0, over: null, overT: 0, moved: false, launches: 0, bought: 0, warnT: 0, collected: 0,
    spawnT: 6, hordeT: 45, hordes: 0, hordeQ: 0, bossQ: 0, hqT: 0, intenseT: 0, rallyN: 0 };
  G.hero = makeUnit('hero', CX, 900, 'hero');
  G.castle = addBld(0, 'castle', CX, 1060);
  const m1 = addBld(0, 'mine', 34, 1058); m1.pile = 4;
  G.lair = addBld(1, 'lair', CX, AREA.lairY);
  for (let i = 0; i < 4; i++) makeUnit('piyade', CX + (i - 1.5) * 22, AREA.rallyY, 'rally');
  G.pads = makePads();
  camTarget.set(X3(CX), 0, Z3(900) - 5); hud(true);
}

// ================================================================ HELPERS
const alive = o => o.hp > 0 && !o.dying;
function nearestEnemy(e, maxD, unitsOnly) {
  let b = null, bd = maxD;
  for (const o of G.units) { if (o.team === e.team || !alive(o)) continue; if (o.type === 'hero' && G.heroDead > 0) continue; const d = Math.hypot(o.x - e.x, o.y - e.y) - o.r; if (d < bd) { bd = d; b = o; } }
  if (!unitsOnly) for (const o of G.blds) { if (o.team === e.team || o.hp <= 0) continue; const d = Math.hypot(o.x - e.x, o.y - e.y) - o.r; if (d < bd) { bd = d; b = o; } }
  return b;
}
const inRange = (u, t) => dist(u, t) - t.r - u.r <= u.range;
function armyCount() { let n = 0; for (const u of G.units) if (u.team === 0 && u.type !== 'hero' && alive(u)) n++; return n; }
function monsterCount() { let n = 0; for (const u of G.units) if (u.team === 1 && alive(u)) n++; return n; }
function floatText(x, y, z, txt, c, size) { G.floats.push({ x, y, z, txt, c: c || '#fff', t: 0, size: size || 16 }); }
function burst(pool, x, y, z, color, n, spd, up = 6) { const col = color != null ? new T3.Color(color) : null; for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = (spd || 60) * (.4 + Math.random()); G.parts.push({ pool, x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: up * (.5 + Math.random()), life: .5 + Math.random() * .5, t: 0, col, r: .7 + Math.random() * .7, g: 1, rot: Math.random() * 6 }); } }
function smoke(x, y, z, n, size) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 15 + Math.random() * 35; G.parts.push({ pool: 'smoke', x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 6, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 1.5 + Math.random() * 3, life: .7 + Math.random() * .6, t: 0, r: (size || 1) * (.7 + Math.random() * .7), g: 0, rot: 0 }); } }
function glow(x, y, z, color, size, life, vz = 0) { G.parts.push({ pool: 'glow', x, y, z, vx: 0, vy: 0, vz, life, t: 0, col: new T3.Color(color), r: size, g: 0, rot: 0 }); }
function dropCoins(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 25 + Math.random() * 60; G.coinsArr.push({ x, y, z: 1.2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 7 + Math.random() * 6, age: 0, mag: false, spin: Math.random() * 6 }); } }
function shoot(src, tgt, dmg, kind, splash, z0) {
  const d = Math.hypot(tgt.x - src.x, tgt.y - src.y);
  G.proj.push({ x0: src.x, y0: src.y, z0: z0 || 1.6, tgt, tx: tgt.x, ty: tgt.y, t: 0, T: Math.max(.2, d / (kind === 'magic' ? 260 : 460)), dmg, team: src.team, kind, splash, h: d * K * (kind === 'magic' ? .12 : .14) });
  sfx(kind === 'magic' ? 'magic' : 'arrow', .7);
}
function damage(t, dmg) {
  if (t.hp <= 0 || t.dying) return; t.hp -= dmg; t.hit = .12;
  if (t.kind === 'u' && t.type === 'hero') sfx('hurt', .6);
  if (t.hp <= 0) kill(t);
}
function kill(t) {
  if (t.kind === 'u') {
    if (t.type === 'hero') { t.hp = 0; G.heroDead = 4; floatText(t.x, t.y, 5, 'Paşa yaralandı!', '#ffd75e', 18); burst('spark', t.x, t.y, 2, 0xff5050, 14, 60); return; }
    t.dying = 2.6; t.hp = 0;
    if (t.team === 1) { dropCoins(t.x, t.y, TYPES[t.type].bounty); burst('bone', t.x, t.y, 1.5, null, t.type === 'boss' ? 18 : 7, 50, 7); sfx('bones', .8); if (t.type === 'boss') { sfx('boom'); G.shake = .4; } }
    else burst('spark', t.x, t.y, 1.5, 0xd04040, 8, 40);
  } else {
    smoke(t.x, t.y, 2, 18, 2.4); burst('spark', t.x, t.y, 3, 0x8a8f96, 22, 90); burst('spark', t.x, t.y, 3, 0xffa531, 12, 70); sfx('boom'); G.shake = Math.max(G.shake, .5);
    scene.remove(t.obj);
    if (t.type === 'lair' && !G.over) { G.over = 'win'; G.overT = 3; floatText(t.x, t.y, 9, 'ZAFER!', '#ffd75e', 42); sfx('win'); for (const u of G.units) if (u.team === 1 && alive(u)) kill(u); for (const u of G.units) if (u.team === 0 && u.type !== 'hero' && alive(u)) u.state = 'win'; dropCoins(t.x, t.y + 60, 30); }
    if (t.type === 'castle' && !G.over) { G.over = 'lose'; G.overT = 2.2; sfx('lose'); }
    const p = G.pads.find(p => p.bld === t); if (p) { p.done = false; p.paid = 0; p.bld = null; }
  }
}
function attack(u, t) {
  u.rot = Math.atan2(t.x - u.x, t.y - u.y);
  const c = u.clips[u.T.anim.atk]; const ts = Math.max(1.1, (c ? c.duration : 1) / (u.cdMax * .95));
  const dur = play(u, u.T.anim.atk, true, ts, .08);
  u.atkT = Math.min(dur || .6, u.cdMax * .95);
  u.pending = { t: u.T.hitDelay || .3, target: t };
}
function resolveHit(u, t) {
  if (!alive(u)) return;
  if (u.T.ranged) { if (t.hp > 0 && !t.dying) shoot(u, t, u.dmg, u.T.ranged, u.T.splash, u.T.ranged === 'magic' ? 2.2 : 1.7); return; }
  if (t.hp <= 0 || t.dying || dist(u, t) - t.r - u.r > u.range + 10) return;
  damage(t, u.dmg); sfx(u.T.snd || 'sword', .7);
  burst('spark', t.x + (u.x - t.x) * .35, t.y + (u.y - t.y) * .35, 1.6, 0xfff3b0, 4, 45);
  if (u.T.cleave) for (const o of G.units) if (o !== t && o.team !== u.team && alive(o) && dist(o, t) < u.T.cleave) damage(o, u.dmg * .6);
}
function turn(u, a, dt) { let d = a - u.rot; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI; u.rot += d * Math.min(1, dt * 10); }
function moveTo(u, x, y, dt) {
  const dx = x - u.x, dy = y - u.y, d = Math.hypot(dx, dy) || 1, s = Math.min(d, u.spd * dt);
  u.x += dx / d * s; u.y += dy / d * s; u.moving = true; turn(u, Math.atan2(dx, dy), dt);
}
function spawnRally(type, x, y) { const u = makeUnit(type, x, y, 'rally'); burst('spark', x, y, 1, 0xffd75e, 12, 50); return u; }
function spawnMonster(type) {
  const x = CX + (Math.random() - .5) * 100, y = AREA.spawnY + (Math.random() - .5) * 30;
  const u = makeUnit(type, x, y, 'raid'); u.spawnT = (play(u, u.T.anim.spawn, true, 1.4, .01) || .8) * .9;
  glow(x, y, .5, 0xb057ff, 3.5, .8, 1); sfx('spawn', .5);
  return u;
}
function pickMonster() {
  const lv = G.level, r = Math.random();
  if (lv >= 3 && r < .12) return 'mage';
  if (lv >= 2 && r < .28) return 'skrogue';
  if (r < .62 - Math.min(.2, lv * .04)) return 'minion';
  return 'warrior';
}

// ================================================================ UPDATE
const keys = new Set(); let joy = null;
function unitAI(u, dt) {
  if (!alive(u) || u.type === 'hero') return;
  u.cd -= dt; u.moving = false;
  if (u.pending) { u.pending.t -= dt; if (u.pending.t <= 0) { const p = u.pending; u.pending = null; resolveHit(u, p.target); } }
  if (u.spawnT > 0) { u.spawnT -= dt; return; }
  if (u.atkT > 0) { u.atkT -= dt; return; }
  if (u.state === 'win') return;
  let tgt = null, goal = null;
  if (u.team === 0 && u.state === 'rally') { tgt = nearestEnemy(u, 150); if (tgt && u.slot && Math.hypot(tgt.x - u.slot.x, tgt.y - u.slot.y) > 230) tgt = null; if (!tgt) goal = u.slot; }
  else tgt = nearestEnemy(u, 1e9);
  if (tgt) {
    if (inRange(u, tgt)) { turn(u, Math.atan2(tgt.x - u.x, tgt.y - u.y), dt); if (u.cd <= 0) { attack(u, tgt); u.cd = u.cdMax; } }
    else moveTo(u, tgt.x, tgt.y, dt);
  } else if (goal) {
    if (Math.hypot(goal.x - u.x, goal.y - u.y) > 3) moveTo(u, goal.x, goal.y, dt); else turn(u, PI, dt);
  }
}
function separation() {
  const us = G.units;
  for (let i = 0; i < us.length; i++) {
    const a = us[i]; if (!alive(a)) continue;
    for (let j = i + 1; j < us.length; j++) {
      const b = us[j]; if (!alive(b)) continue;
      const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r - 1; if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
      const d = Math.hypot(dx, dy) || .01; if (d >= rr) continue;
      if ((a.type === 'hero' || b.type === 'hero') && a.team === b.team) continue;
      const o = (rr - d) / 2, nx = dx / d, ny = dy / d;
      const wa = a.type === 'hero' ? 0 : (a.T.boss ? .2 : 1), wb = b.type === 'hero' ? 0 : (b.T.boss ? .2 : 1), k = (wa + wb) || 1;
      a.x -= nx * o * 2 * wa / k; a.y -= ny * o * 2 * wa / k; b.x += nx * o * 2 * wb / k; b.y += ny * o * 2 * wb / k;
    }
    for (const bl of G.blds) { if (bl.hp <= 0) continue; const dx = a.x - bl.x, dy = a.y - bl.y, d = Math.hypot(dx, dy) || .01, rr = bl.r * .9 + a.r; if (d < rr) { a.x += dx / d * (rr - d); a.y += dy / d * (rr - d); } }
    a.x = clampX(a.x, a.y, a.r); a.y = Math.max(40, Math.min(H - 15, a.y));
  }
}
const pileOf = b => ({ x: b.x + (b.x < CX ? 28 : -28), y: b.y - 18 });
function update(dt) {
  G.t += dt;
  const h = G.hero;
  if (G.heroDead > 0) { G.heroDead -= dt; if (G.heroDead <= 0) { h.hp = h.maxhp; h.x = CX; h.y = 1000; burst('spark', h.x, h.y, 1, 0xffd75e, 18, 70); } }
  else {
    let ix = 0, iy = 0;
    if (joy) { const dx = joy.x - joy.sx, dy = joy.y - joy.sy, m = Math.hypot(dx, dy); if (m > 4) { const k = Math.min(1, m / 42); ix = dx / m * k; iy = dy / m * k; } }
    if (keys.size) { const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0), ky = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0); const m = Math.hypot(kx, ky); if (m) { ix = kx / m; iy = ky / m; } }
    const m = Math.hypot(ix, iy); h.moving = m > .05;
    if (h.moving) { G.moved = true; h.x += ix * h.spd * dt; h.y += iy * h.spd * dt; turn(h, Math.atan2(ix, iy), dt * 1.4); }
    h.hp = Math.min(h.maxhp, h.hp + (h.y > AREA.border ? 16 : 2) * dt);
    h.cd -= dt; h.atkT = Math.max(0, h.atkT - dt);
    const t = nearestEnemy(h, h.range); h.aiming = !!t;
    if (t && h.cd <= 0) { h.cd = h.cdMax; h.atkT = .35; shoot(h, t, h.dmg, 'arrow', 0, 3.4); if (!h.moving) h.rot = Math.atan2(t.x - h.x, t.y - h.y); }
  }
  for (const u of G.units) u.hit = Math.max(0, u.hit - dt);
  let ri = 0;
  for (const u of G.units) if (u.team === 0 && u.state === 'rally' && alive(u)) { const row = Math.floor(ri / 9), col = ri % 9; u.slot = { x: CX + (col - 4) * 22 + (row % 2 ? 6 : 0), y: AREA.rallyY + row * 20 }; ri++; }
  G.rallyN = ri;
  for (const u of G.units) unitAI(u, dt);
  separation();
  for (const b of G.blds) {
    b.hit = Math.max(0, b.hit - dt); if (b.hp <= 0) continue;
    if (b.dmg) { b.cd -= dt; if (b.cd <= 0) { const t = nearestEnemy(b, b.range, true); if (t) { shoot(b, t, b.dmg, 'arrow', 0, b.type === 'tower' ? 8.5 : 12); b.cd = b.cdMax; } } }
    if (b.type === 'barracks') { b.spawnT += dt; if (b.spawnT >= 9) { if (armyCount() < CAP) { b.spawnT = 0; spawnRally('piyade', b.x, b.y - 36); } else b.spawnT = 9; } }
    if (b.type === 'mine') { b.prodT += dt; if (b.prodT >= 2.2) { b.prodT = 0; if (b.pile < 40) { b.pile++; const pp = pileOf(b); glow(pp.x, pp.y, 1.2, 0xffd75e, 1.6, .5, 2); } } }
  }
  if (!G.over && G.lair.hp > 0) {
    const cap = Math.min(45, 14 + 5 * G.level);
    G.spawnT -= dt;
    if (G.spawnT <= 0) { G.spawnT = Math.max(1.1, 3.4 - .25 * G.level); if (monsterCount() < cap) spawnMonster(pickMonster()); }
    G.hordeT -= dt;
    if (G.hordeT <= 0) { G.hordes++; G.hordeQ += 5 + 3 * G.level; if (G.level >= 3 || (G.level === 2 && G.hordes % 2 === 0)) G.bossQ++; G.hordeT = 40; G.warnT = 2.6; G.intenseT = 18; sfx('horde'); }
    if (G.hordeQ > 0 || G.bossQ > 0) { G.hqT -= dt; if (G.hqT <= 0) { G.hqT = .28; if (G.bossQ > 0 && G.hordeQ < 3) { G.bossQ--; spawnMonster('boss'); floatText(CX, AREA.spawnY, 8, 'DEV İSKELET!', '#ff7a7a', 22); } else if (G.hordeQ > 0) { G.hordeQ--; spawnMonster(pickMonster()); } } }
  }
  G.intenseT = Math.max(0, G.intenseT - dt); setIntensity(G.intenseT > 0 ? 1 : 0);
  G.warnT = Math.max(0, G.warnT - dt);
  for (const p of G.proj) {
    p.t += dt; if (p.tgt.hp > 0 && !p.tgt.dying) { p.tx = p.tgt.x; p.ty = p.tgt.y; }
    if (p.kind === 'magic' && Math.random() < .6) { const k = p.t / p.T; glow(p.x0 + (p.tx - p.x0) * k, p.y0 + (p.ty - p.y0) * k, p.z0 + .5, 0xa040ff, .9, .35); }
    if (p.t >= p.T) {
      p.done = true;
      if (p.kind === 'magic') {
        glow(p.tx, p.ty, .6, 0xb050ff, 4, .5); burst('spark', p.tx, p.ty, .8, 0xc77dff, 10, 70);
        for (const o of G.units) if (o.team !== p.team && alive(o) && Math.hypot(o.x - p.tx, o.y - p.ty) < (p.splash || 20) + o.r) damage(o, p.dmg);
        for (const o of G.blds) if (o.team !== p.team && o.hp > 0 && Math.hypot(o.x - p.tx, o.y - p.ty) < (p.splash || 20) + o.r) damage(o, p.dmg);
      } else if (p.tgt.hp > 0 && !p.tgt.dying) { damage(p.tgt, p.dmg); burst('spark', p.tx, p.ty, 1.5, 0xfff0c0, 3, 30); }
    }
  }
  G.proj = G.proj.filter(p => !p.done);
  for (const c of G.coinsArr) {
    c.age += dt; c.spin += dt * 5;
    if (c.mag && G.heroDead <= 0) {
      const dx = h.x - c.x, dy = h.y - c.y, d = Math.hypot(dx, dy) || 1, s = Math.max(300, 600 - d) * dt;
      c.x += dx / d * Math.min(d, s); c.y += dy / d * Math.min(d, s); c.z += (2.6 - c.z) * Math.min(1, dt * 10);
      if (d < 14) { c.done = true; G.coins++; G.collected++; sfx('coin', .8); }
    } else {
      if (c.z > .4 || c.vz > 0) { c.vz -= 30 * dt; c.z += c.vz * dt; if (c.z < .4) { c.z = .4; c.vz *= -.35; if (Math.abs(c.vz) < 2) c.vz = 0; } c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= .97; c.vy *= .97; }
      c.x = clampX(c.x, c.y, 6);
      if (G.heroDead <= 0 && c.age > .3 && Math.hypot(h.x - c.x, h.y - c.y) < 75) c.mag = true;
    }
  }
  G.coinsArr = G.coinsArr.filter(c => !c.done);
  if (G.heroDead <= 0) for (const b of G.blds) if (b.type === 'mine' && b.hp > 0 && b.pile > 0) {
    const pp = pileOf(b);
    if (Math.hypot(h.x - pp.x, h.y - pp.y) < 48) { const n = b.pile; b.pile = 0; for (let i = 0; i < Math.min(n, 14); i++) G.fly.push({ x0: pp.x + (Math.random() - .5) * 10, y0: pp.y + (Math.random() - .5) * 10, t: -i * .03, n: i === 0 ? n : 0, toHero: true }); floatText(pp.x, pp.y, 3, '+' + n, '#ffd75e', 22); }
  }
  let on = null;
  if (G.heroDead <= 0) for (const p of G.pads) { if (p.done) continue; if (Math.abs(h.x - p.x) < p.w / 2 && Math.abs(h.y - p.y) < p.h / 2) on = p; }
  G.onPad = on;
  for (const p of G.pads) if (p.attack) { p.cool = Math.max(0, p.cool - dt); if (p !== on) p.hold = Math.max(0, p.hold - dt * 2); }
  if (on) {
    if (on.attack) {
      if (G.rallyN > 0 && on.cool <= 0) { on.hold += dt; if (on.hold >= .6) { on.hold = 0; on.cool = 1.2; let n = 0; for (const u of G.units) if (u.team === 0 && u.state === 'rally' && alive(u)) { u.state = 'charge'; n++; } G.launches++; sfx('horn'); floatText(on.x, on.y, 4, 'HÜCUM! (' + n + ')', '#ffd75e', 24); } }
    } else if (!(on.unit && armyCount() >= CAP)) {
      G.payT -= dt;
      while (G.payT <= 0 && G.coins > 0 && on.paid < on.cost) { G.payT += .04; G.coins--; on.paid++; G.fly.push({ x0: h.x, y0: h.y, x1: on.x, y1: on.y, t: 0 }); sfx('pay', .6); }
      if (G.payT < 0) G.payT = 0;
      if (on.paid >= on.cost) {
        on.paid = 0; G.bought++; sfx('buy');
        if (on.unit) { spawnRally(on.unit, on.x, on.y - 40); floatText(on.x, on.y, 3, '+1 ' + on.label, '#ffffff', 16); }
        else if (on.build) { on.done = true; on.bld = addBld(0, on.build, on.x, on.y); smoke(on.x, on.y, .5, 12, 1.6); burst('spark', on.x, on.y, 1, 0xffd75e, 24, 90); sfx('build'); floatText(on.x, on.y, 6, { tower: 'Kule', barracks: 'Kışla', mine: 'Altın madeni' }[on.build] + ' kuruldu!', '#ffd75e', 18); }
        else if (on.upg) { G.upg *= 1.15; for (const u of G.units) if (u.team === 0 && u.type !== 'hero') { u.hp *= 1.15; u.maxhp *= 1.15; u.dmg *= 1.15; } h.dmg *= 1.1; floatText(on.x, on.y, 3, 'Ordu güçlendi! +%15', '#ffd75e', 18); }
        if (!on.once) on.cost = Math.min(on.max, on.cost + on.inc);
      }
    }
  }
  for (const f of G.fly) { f.t += dt * (f.toHero ? 3 : 4); if (f.toHero && f.t >= 1 && !f.got) { f.got = true; if (f.n) { G.coins += f.n; G.collected += f.n; } sfx('coin', .8); } }
  G.fly = G.fly.filter(f => f.t < 1);
  for (const p of G.parts) {
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += dt * 8;
    if (p.g) { p.vz -= 26 * dt; if (p.z < .1) { p.z = .1; p.vz *= -.3; p.vx *= .6; p.vy *= .6; } } else { p.vx *= .95; p.vy *= .95; }
  }
  G.parts = G.parts.filter(p => p.t < p.life); if (G.parts.length > 900) G.parts.splice(0, G.parts.length - 900);
  for (const f of G.floats) f.t += dt; G.floats = G.floats.filter(f => f.t < 1.4);
  for (const u of G.units) if (u.dying) { u.dying -= dt; if (u.dying <= 0) { scene.remove(u.obj); u.removed = true; } }
  G.units = G.units.filter(u => !u.removed);
  G.blds = G.blds.filter(b => b.hp > 0);
  G.shake = Math.max(0, G.shake - dt);
  if (G.over) { G.overT -= dt; if (G.overT <= 0 && running) { running = false; showEnd(); } }
  hud();
}

// ================================================================ RENDER SYNC
const camTarget = new T3.Vector3(); const DBG = { zoom: 1 };
const mx = new T3.Matrix4(), q = new T3.Quaternion(), v3 = new T3.Vector3(), sc = new T3.Vector3(), YAX = new T3.Vector3(0, 1, 0), FWD = new T3.Vector3(0, 0, 1), eul = new T3.Euler(), dv = new T3.Vector3();
const TEAM_BAR = [new T3.Color(0x37e07a), new T3.Color(0xff4d55)], GOLD_BAR = new T3.Color(0xffc93b), MAGIC = new T3.Color(0xb050ff);
function addBar(x, y, z, w, ratio, col) {
  v3.set(X3(x), z, Z3(y)); mx.compose(v3, camera.quaternion, sc.set(w + .14, 1.4, 1)); P.barBg.add(mx);
  v3.x -= (1 - ratio) * w / 2; mx.compose(v3, camera.quaternion, sc.set(Math.max(.001, w * ratio), 1, 1)); P.barFg.add(mx, col);
}
function sync(dt) {
  for (const k in P) P[k].begin();
  const h = G.hero;
  for (const u of G.units) {
    if (u.type === 'hero') continue;
    const o = u.obj; o.position.set(X3(u.x), 0, Z3(u.y)); o.rotation.y = u.rot;
    if (u.dying) { if (u.curName !== u.T.anim.die) play(u, u.T.anim.die, true, 1, .1); if (u.dying < .8) o.position.y = -(.8 - u.dying) * 1.6; }
    else if (u.state === 'win') play(u, u.T.anim.win || u.T.anim.idle);
    else if (!(u.spawnT > 0 || u.atkT > 0)) play(u, u.moving ? u.T.anim.run : u.T.anim.idle);
    u.mixer.update(dt);
    const f = u.hit > 0 ? .6 : 0; if (f !== u._f) { setFlash(unitMats(u), f); u._f = f; }
    if (alive(u) && u.hp < u.maxhp) addBar(u.x, u.y, u.T.h + .7, u.T.boss ? 3.2 : 1.6, u.hp / u.maxhp, TEAM_BAR[u.team]);
  }
  if (!hero3) hero3 = buildHero();
  hero3.g.visible = G.heroDead <= 0;
  if (hero3.g.visible) {
    hero3.g.position.set(X3(h.x), 0, Z3(h.y)); hero3.g.rotation.y = h.rot;
    heroAnim(hero3, h, dt);
    hero3.ring.material.opacity = .5 + Math.sin(G.t * 5) * .3;
    setFlash(hero3.mats, h.hit > 0 ? .5 : 0);
    if (h.hp < h.maxhp) addBar(h.x, h.y, 5.4, 2.6, h.hp / h.maxhp, TEAM_BAR[0]);
  }
  for (const b of G.blds) {
    if (b.hp <= 0) continue;
    if (b.obj.userData.mats) setFlash(b.obj.userData.mats, b.hit > 0 ? .45 : 0);
    if (b.type === 'lair') { b.obj.userData.portal.uniforms.t.value = G.t; if (Math.random() < .3) glow(b.x + (Math.random() - .5) * 40, b.y + 14, 1 + Math.random() * 3, 0x9a40ff, 1.2 + Math.random(), 1.2, 2); }
    if (b.hp < b.maxhp && b.type !== 'lair') addBar(b.x, b.y, b.type === 'castle' ? 21 : b.type === 'tower' ? 11 : 7.5, 4, b.hp / b.maxhp, TEAM_BAR[b.team]);
    if (b.type === 'barracks') addBar(b.x, b.y, 8.5, 3, Math.min(1, b.spawnT / 9), GOLD_BAR);
    if (b.type === 'mine' && b.pile > 0) {
      const pp = pileOf(b);
      for (let i = 0; i < b.pile; i++) { const a = i * 2.4, r = Math.sqrt(i) * .3, layer = Math.floor(i / 12); q.setFromEuler(eul.set(1.3 + (i % 3) * .25, a, 0)); mx.compose(v3.set(X3(pp.x) + Math.cos(a) * r, .22 + layer * .2 + (i % 2) * .05, Z3(pp.y) + Math.sin(a) * r), q, sc.set(1, 1, 1)); P.coin.add(mx); }
    }
  }
  for (const c of G.coinsArr) { q.setFromAxisAngle(YAX, c.spin); mx.compose(v3.set(X3(c.x), c.z, Z3(c.y)), q, sc.set(1, 1, 1)); P.coin.add(mx); }
  for (const f of G.fly) {
    if (f.t < 0) continue;
    const x1 = f.toHero ? h.x : f.x1, y1 = f.toHero ? h.y : f.y1;
    const x = f.x0 + (x1 - f.x0) * f.t, y = f.y0 + (y1 - f.y0) * f.t, z = 2.4 + Math.sin(f.t * PI) * 3;
    q.setFromAxisAngle(YAX, f.t * 10); mx.compose(v3.set(X3(x), z, Z3(y)), q, sc.set(.9, .9, .9)); P.coin.add(mx);
  }
  const pos = (p, k, out) => { const x = p.x0 + (p.tx - p.x0) * k, y = p.y0 + (p.ty - p.y0) * k; return out.set(X3(x), p.z0 * (1 - k) + 1.3 * k + p.h * 4 * k * (1 - k), Z3(y)); };
  for (const p of G.proj) {
    const k = Math.min(1, p.t / p.T); pos(p, k, v3);
    if (p.kind === 'magic') { mx.compose(v3, q.identity(), sc.set(1, 1, 1)); P.orb.add(mx); mx.compose(v3, camera.quaternion, sc.set(2, 2, 2)); P.glow.add(mx, MAGIC); }
    else { pos(p, Math.min(1, k + .04), dv); dv.sub(v3); if (dv.lengthSq() < 1e-8) dv.set(0, 0, 1); dv.normalize(); q.setFromUnitVectors(FWD, dv); mx.compose(v3, q, sc.set(1, 1, 1)); P.arrow.add(mx); }
  }
  for (const p of G.parts) {
    const a = 1 - p.t / p.life;
    if (p.pool === 'smoke') { const s = p.r * (1.6 - a * .8) * Math.min(1, a * 3); mx.compose(v3.set(X3(p.x), p.z, Z3(p.y)), q.identity(), sc.set(s, s, s)); P.smoke.add(mx); }
    else if (p.pool === 'glow') { const s = p.r * Math.min(1, a * 2.5); mx.compose(v3.set(X3(p.x), p.z, Z3(p.y)), camera.quaternion, sc.set(s, s, s)); P.glow.add(mx, p.col); }
    else { const s = Math.min(1, a * 2) * (p.pool === 'bone' ? 1.4 : p.r); q.setFromEuler(eul.set(p.rot, p.rot * .7, 0)); mx.compose(v3.set(X3(p.x), p.z, Z3(p.y)), q, sc.set(s, s, s)); P[p.pool].add(mx, p.col || WHITE); }
  }
  for (const k in P) P[k].end();
  for (const p of G.pads) { p.mesh.visible = !p.done; if (p.done) continue; drawPad(p); const s = G.onPad === p ? 1 + Math.sin(G.t * 10) * .03 : 1; p.mesh.scale.set(s, 1, s); }
  const tz = Z3(G.heroDead > 0 ? 1000 : h.y) - 5, tx = X3(G.heroDead > 0 ? CX : h.x) * .25;
  const kk = Math.min(1, dt * 5);
  camTarget.x += (tx - camTarget.x) * kk; camTarget.z += (Math.max(14, Math.min(Z3(H) - 16, tz)) - camTarget.z) * kk;
  camera.position.copy(camTarget).addScaledVector(CAMDIR, camDist * DBG.zoom);
  if (G.shake > 0) { camera.position.x += (Math.random() - .5) * G.shake * 2; camera.position.y += (Math.random() - .5) * G.shake * 2; }
  camera.lookAt(camTarget);
  sun.position.copy(camTarget).add(SUNOFF); sun.target.position.copy(camTarget); sun.target.updateMatrixWorld();
  syncFloats();
}

// ================================================================ DOM
const $ = id => document.getElementById(id);
const fxLayer = $('fx'), ftPool = [];
function syncFloats() {
  let i = 0;
  const tags = G.floats.slice();
  for (const b of G.blds) if (b.type === 'mine' && b.pile > 0) { const pp = pileOf(b); tags.push({ x: pp.x, y: pp.y, z: 2.6, txt: '+' + b.pile, c: '#ffe27a', t: 0, size: 15, tag: true }); }
  for (const f of tags) {
    let el = ftPool[i]; if (!el) { el = document.createElement('div'); el.className = 'ft'; fxLayer.appendChild(el); ftPool[i] = el; }
    v3.set(X3(f.x), f.z + (f.tag ? 0 : f.t * 3), Z3(f.y)).project(camera);
    const x = (v3.x + 1) / 2 * innerWidth, y = (1 - v3.y) / 2 * innerHeight, a = f.tag ? 1 : Math.min(1, (1.4 - f.t) * 2);
    if (el._t !== f.txt) { el.textContent = f.txt; el._t = f.txt; }
    el.style.color = f.c; el.style.fontSize = f.size + 'px'; el.style.opacity = a; el.style.display = 'block';
    el.style.transform = 'translate(' + (x - el.offsetWidth / 2) + 'px,' + y + 'px)'; i++;
  }
  for (; i < ftPool.length; i++) ftPool[i].style.display = 'none';
}
let lastHud = '';
function hintText() {
  if (!G) return '';
  if (G.heroDead > 0) return 'Paşa kalede iyileşiyor… ' + Math.ceil(G.heroDead);
  if (!G.moved) return 'Ekranı sürükle, atlı Paşa\'yı yönet';
  if (G.level === 1 && G.collected < 4) return 'Madenin önündeki altınları topla';
  if (G.level === 1 && G.bought === 0) return 'Altınları PİYADE alanında harca';
  if (G.level === 1 && G.bought < 3 && G.t < 120) return 'KULE kur, MADEN aç, ordunu büyüt';
  if (G.level === 1 && G.launches === 0 && G.t > 70) return 'HÜCUM! alanıyla canavar inine saldır';
  return '';
}
function hud(force) {
  const hord = Math.ceil(G.hordeT);
  const s = [G.coins, armyCount(), G.level, Math.ceil(G.lair.hp), hord, G.warnT > 0, hintText()].join('|');
  if (s === lastHud && !force) return; lastHud = s;
  $('coins').textContent = G.coins; $('army').textContent = '⚔ ' + armyCount() + '/' + CAP; $('lv').textContent = 'Sefer ' + G.level;
  $('bossfill').style.width = Math.max(0, G.lair.hp / G.lair.maxhp * 100) + '%';
  const wv = $('wave'); wv.textContent = 'Canavar sürüsü: ' + Math.max(0, hord) + ' sn'; wv.style.display = G.over ? 'none' : 'block'; wv.classList.toggle('hot', hord <= 5);
  $('warn').style.opacity = G.warnT > 0 ? 1 : 0;
  $('hint').textContent = hintText();
}
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
function syncAudioBtns() { const s = audioState(); $('music').textContent = s.musicOn ? '🎵' : '🎵'; $('music').classList.toggle('off', !s.musicOn); $('mute').textContent = s.sfxOn ? '🔊' : '🔈'; $('mute').classList.toggle('off', !s.sfxOn); }
$('music').addEventListener('click', () => { initAudio(); setMusic(!audioState().musicOn); syncAudioBtns(); });
$('mute').addEventListener('click', () => { initAudio(); setSfx(!audioState().sfxOn); syncAudioBtns(); });
syncAudioBtns();

function showMenu() {
  $('card').innerHTML = '<h1>AKINCI</h1><h2>SINIR BOYU</h2><ul><li>Ekranı sürükle, <b>atlı okçu Paşa</b>\'yı yönet; yakındaki canavarlara kendiliğinden ok atar</li><li><b>Canavar ini</b> durmadan iskelet ordusu gönderir, kaleni savun!</li><li><b>Altın madeni</b> sürekli altın üretir, Paşa ile topla</li><li><b>Piyade, Okçu, Baltacı</b> al · <b>Kule, Kışla, Maden</b> kur · <b>Talim</b> ile güçlen</li><li><b>HÜCUM!</b> alanıyla saldır, canavar inini yık</li></ul>' +
    '<button class="btn" id="b1">' + (best > 1 ? 'Devam Et · Sefer ' + best : 'Sefere Başla') + '</button>' + (best > 1 ? '<button class="btn alt" id="b2">Baştan Başla</button>' : '');
  $('ov').classList.remove('hide');
  $('b1').onclick = () => start(best); if ($('b2')) $('b2').onclick = () => start(1);
}
function start(level) { initAudio(); newGame(level); $('ov').classList.add('hide'); running = true; }
function showEnd() {
  if (G.over === 'win') {
    const next = G.level + 1; if (next > best) { best = next; try { localStorage.setItem('akinci_lv', String(best)); } catch (e) { } }
    $('card').innerHTML = '<h1 style="font-size:42px">ZAFER!</h1><h2>SEFER ' + G.level + ' TAMAMLANDI</h2><p>Canavar ini yıkıldı. Sıradaki sefer daha çetin: daha sık sürüler, okçu ve büyücü iskeletler, dev iskeletler.</p><button class="btn" id="b1">Sefer ' + next + ' →</button><button class="btn alt" id="b2">Ana Menü</button>';
    $('ov').classList.remove('hide'); $('b1').onclick = () => start(next); $('b2').onclick = showMenu;
  } else {
    $('card').innerHTML = '<h1 style="font-size:36px;color:#b5232a;text-shadow:0 3px 0 #f2c0c2">KALE DÜŞTÜ</h1><h2>SEFER ' + G.level + '</h2><p>Önce madenden altın topla, KULE kur, ordunu kalenin önünde tut. Sürü dağılınca HÜCUM et.</p><button class="btn" id="b1">Tekrar Dene</button><button class="btn alt" id="b2">Ana Menü</button>';
    $('ov').classList.remove('hide'); $('b1').onclick = () => start(G.level); $('b2').onclick = showMenu;
  }
}

// ================================================================ BOOT
export async function boot() {
  const bar = $('loadbar');
  await loadAll(p => { if (bar) bar.style.width = Math.round(p * 100) + '%'; });
  makePools(); buildWorld();
  newGame(best);
  hero3 = buildHero();
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (G && running && !document.hidden) update(dt);
    if (G) sync(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  $('load').style.display = 'none';
  showMenu();
  requestAnimationFrame(loop);
  window.__akinci = { get G() { return G; }, get hero3() { return hero3; }, THREE: T3, start, update: d => update(d), sync: d => sync(d), render: () => renderer.render(scene, camera), camera, scene, HERO_TUNE, DBG, rebuildHero: () => { scene.remove(hero3.g); hero3 = buildHero(); } };
}
