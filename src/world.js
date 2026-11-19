// Terrain (height-mapped landscape), inland sea, ships, clouds, scenery.
import * as T3 from 'three';
import { instGeo, cloneModel } from './assets.js';

const PI = Math.PI;
export const K = 0.1, MW = 2000, MC = 1000, R_PLAY = 975, KR = 650, SEA_R = 300;
export const KPOS = []; for (let i = 0; i < 5; i++) { const a = i * 2 * PI / 5; KPOS.push({ x: MC + Math.sin(a) * KR, y: MC + Math.cos(a) * KR, a }); }
export const X3 = x => (x - MC) * K, Z3 = y => (y - MC) * K;
export function segDist(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy))); return Math.hypot(px - ax - vx * t, py - ay - vy * t); }

// ---------------------------------------------------------------- noise
function hash(x, y) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, o = 4) { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); n += a; f *= 2.03; a *= .5; } return s / n; }
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- height model (px in, world units out)
function fields(px, py) {
  const dc = Math.hypot(px - MC, py - MC);
  let near = 1e9; for (const k of KPOS) near = Math.min(near, Math.hypot(px - k.x, py - k.y));
  let road = 1e9; for (const k of KPOS) road = Math.min(road, segDist(px, py, k.x, k.y, MC, MC)); road = Math.min(road, Math.abs(dc - 470));
  return { dc, near, road };
}
function heightAt(px, py) {
  const { dc, near, road } = fields(px, py);
  const n1 = fbm(px * .0032, py * .0032), n2 = fbm(px * .011 + 50, py * .011 + 50, 3), n3 = fbm(px * .02 + 9, py * .02 + 3, 2);
  let h = (n1 - .45) * 3.4;
  const wedge = smooth(360, 560, near) * smooth(420, 640, dc); h += wedge * (2.5 + n2 * 8 + n3 * 2);
  const rim = smooth(R_PLAY - 90, R_PLAY + 220, dc); h += rim * (10 + n1 * 18 + Math.max(0, n2 - .45) * 26 + n3 * 3);
  const kflat = smooth(400, 300, near); h = h * (1 - kflat) + kflat * (n2 - .5) * .22;
  const rflat = smooth(52, 24, road) * (1 - rim); h = h * (1 - rflat) + rflat * Math.max(-.15, (n1 - .45) * .5);
  const sea = smooth(SEA_R + 70, SEA_R - 40, dc); h = h * (1 - sea) + sea * -3.6;
  return h;
}
// sampled grid
const G0 = -320, GSPAN = 2640, GN = 330, GC = GSPAN / GN; let HG = null;
function buildGrid() { HG = new Float32Array((GN + 1) * (GN + 1)); for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) HG[j * (GN + 1) + i] = heightAt(G0 + i * GC, G0 + j * GC); }
export function gy(px, py) {
  const fx = (px - G0) / GC, fy = (py - G0) / GC; const i = Math.max(0, Math.min(GN - 1, Math.floor(fx))), j = Math.max(0, Math.min(GN - 1, Math.floor(fy)));
  const tx = Math.max(0, Math.min(1, fx - i)), ty = Math.max(0, Math.min(1, fy - j)), W = GN + 1;
  const a = HG[j * W + i], b = HG[j * W + i + 1], c = HG[(j + 1) * W + i], d = HG[(j + 1) * W + i + 1];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
export const groundY = (px, py) => Math.max(-.05, gy(px, py));
export function blocked(px, py) { const dc = Math.hypot(px - MC, py - MC); return dc < SEA_R + 18 || gy(px, py) > 2.1; }
// go around the inland sea instead of through it
export function steer(x, y, tx, ty) {
  const lim = SEA_R + 70, dcu = Math.hypot(x - MC, y - MC);
  if (segDist(MC, MC, x, y, tx, ty) > lim || dcu < lim - 30) return null;
  const au = Math.atan2(y - MC, x - MC), at = Math.atan2(ty - MC, tx - MC); let d = at - au; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI;
  const step = Math.sign(d || 1) * Math.min(Math.abs(d), .45), r = Math.max(dcu, 440);
  return { x: MC + Math.cos(au + step) * r, y: MC + Math.sin(au + step) * r };
}

// ---------------------------------------------------------------- build
let water = null, ships = [], clouds = [];
function detailTex() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const n = fbm(x / 9, y / 9, 3) * .55 + vnoise(x / 2.2, y / 2.2) * .3 + Math.random() * .15;
    const v = Math.round(185 + n * 70); const i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, v); img.data[i + 3] = 255;
  }
  // tile seamlessly by mirroring edges softly
  g.putImageData(img, 0, 0);
  const t = new T3.CanvasTexture(c); t.wrapS = t.wrapT = T3.MirroredRepeatWrapping; t.repeat.set(90, 90); t.anisotropy = 8; t.colorSpace = T3.NoColorSpace; return t;
}
export function buildWorld(scene, sunDir) {
  buildGrid();
  // terrain mesh
  const SEG = 300, SIZE = GSPAN * K;
  const geo = new T3.PlaneGeometry(SIZE, SIZE, SEG, SEG); geo.rotateX(-PI / 2);
  const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
  const cGrass = new T3.Color(0x5d7f34), cGrass2 = new T3.Color(0x7f9a45), cDark = new T3.Color(0x3f5f2a), cDirt = new T3.Color(0x8a6e45), cSand = new T3.Color(0xcdb98a), cRock = new T3.Color(0x5e5a52), cSnow = new T3.Color(0xe9edf2), cBed = new T3.Color(0x6b6a55), tmp = new T3.Color();
  const off = (G0 + GSPAN / 2 - MC) * K;
  for (let i = 0; i < pos.count; i++) {
    const X = pos.getX(i) + off, Z = pos.getZ(i) + off; const px = X / K + MC, py = Z / K + MC;
    const h = gy(px, py); pos.setY(i, h); pos.setX(i, X); pos.setZ(i, Z);
    const { dc, near, road } = fields(px, py);
    const n = fbm(px * .006 + 3, py * .006 + 7, 3), n2 = vnoise(px * .05, py * .05);
    tmp.copy(cGrass).lerp(cGrass2, smooth(.35, .75, n)).lerp(cDark, smooth(380, 560, near) * smooth(420, 640, dc) * .8);
    if (road < 30 && dc > SEA_R + 40 && near > 50) tmp.lerp(cDirt, smooth(30, 14, road) * .85 * (.8 + n2 * .2));
    tmp.lerp(cSand, smooth(SEA_R + 70, SEA_R + 25, dc));
    if (dc < SEA_R + 20) tmp.lerp(cBed, smooth(SEA_R + 20, SEA_R - 20, dc));
    const slope = Math.abs(gy(px + 8, py) - gy(px - 8, py)) + Math.abs(gy(px, py + 8) - gy(px, py - 8));
    tmp.lerp(cRock, Math.min(1, smooth(.9, 2.2, slope) * .9 + smooth(8, 14, h) * .7));
    tmp.lerp(cSnow, smooth(30, 38, h + n2 * 4) * .85);
    tmp.multiplyScalar(.92 + n2 * .14);
    cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new T3.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const terrain = new T3.Mesh(geo, new T3.MeshStandardMaterial({ vertexColors: true, map: detailTex(), roughness: .95, metalness: 0 }));
  terrain.receiveShadow = true; scene.add(terrain);
  // water
  const wm = new T3.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { t: { value: 0 }, sunDir: { value: sunDir.clone().normalize() } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float t; uniform vec3 sunDir; varying vec3 vW;
      void main(){ vec2 p=vW.xz; float r=length(p);
        vec3 n=normalize(vec3(cos(p.x*.55+t*1.2)*.12+cos((p.x+p.y)*.42+t*.8)*.08+cos(p.x*1.7-t*2.1)*.04, 1.0, cos(p.y*.62-t*1.0)*.12+cos((p.x-p.y)*.37+t*.7)*.08+cos(p.y*1.9+t*2.3)*.04));
        vec3 V=normalize(cameraPosition-vW); float fres=pow(1.0-max(dot(n,V),0.0),3.0);
        float sh=smoothstep(${(SEA_R * K * .55).toFixed(1)},${(SEA_R * K * 1.05).toFixed(1)},r);
        vec3 col=mix(vec3(.04,.17,.27),vec3(.13,.42,.46),sh); col=mix(col,vec3(.55,.68,.78),fres*.55);
        float spec=pow(max(dot(reflect(-sunDir,n),V),0.0),90.0); col+=spec*vec3(1.0,.93,.78)*1.4;
        float foam=smoothstep(${(SEA_R * K * .97).toFixed(1)},${(SEA_R * K * 1.05).toFixed(1)},r)*(.6+.4*sin(r*2.0-t*1.5+sin(atan(p.y,p.x)*7.0)));
        col=mix(col,vec3(.93,.96,.98),foam*.7);
        gl_FragColor=vec4(col,mix(.88,.55,sh)); }`
  });
  water = new T3.Mesh(new T3.CircleGeometry((SEA_R + 70) * K, 120), wm); water.rotation.x = -PI / 2; water.position.y = -.25; water.renderOrder = 1; scene.add(water);
  // scenery (instanced)
  let s = 77; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const deco = {}; const add = (k, px, py, sc, ry) => { const h = gy(px, py); (deco[k] = deco[k] || []).push([X3(px), h - .05, Z3(py), sc, ry]); };
  for (let i = 0; i < 9000; i++) {
    const px = G0 + r() * GSPAN, py = G0 + r() * GSPAN; const { dc, near, road } = fields(px, py); if (dc > MW / 2 + 300 || dc < SEA_R + 50) continue;
    const h = gy(px, py), wedge = smooth(360, 560, near) * smooth(420, 640, dc), rim = smooth(R_PLAY - 90, R_PLAY + 220, dc);
    if (near < 360 || road < 40) continue;
    const x = r();
    if (h > 13) { if (x < .05) add(x < .025 ? 'rock_A' : 'rock_C', px, py, 3 + r() * 3, r() * 6); continue; }
    if (wedge > .3 || (rim > .05 && h < 13)) { if (x < .55 * Math.max(wedge, rim)) add(['trees_A_large', 'trees_B_large', 'trees_A_medium', 'trees_B_medium'][Math.floor(r() * 4)], px, py, 2.6 + r() * 1.4, r() * 6); continue; }
    if (x < .012) add(['tree_A', 'tree_B', 'trees_A_small', 'trees_B_small'][Math.floor(r() * 4)], px, py, 2.4 + r(), r() * 6);
    else if (x < .02) add(['rock_A', 'rock_B', 'rock_C', 'rock_D', 'rock_E'][Math.floor(r() * 5)], px, py, 1.6 + r() * 1.6, r() * 6);
  }
  for (let i = 0; i < 26; i++) { const a = r() * PI * 2, d = SEA_R + 5 + r() * 30; add(r() < .5 ? 'waterlily_A' : 'waterplant_B', MC + Math.cos(a) * d, MC + Math.sin(a) * d, 2 + r(), r() * 6); }
  const m4 = new T3.Matrix4(), q = new T3.Quaternion(), sc = new T3.Vector3(), p = new T3.Vector3(), Y = new T3.Vector3(0, 1, 0);
  for (const [k, list] of Object.entries(deco)) {
    const g = instGeo('world', k); const im = new T3.InstancedMesh(g.geo, g.mat, list.length); im.castShadow = !k.startsWith('water'); im.receiveShadow = true;
    list.forEach(([x, y, z, s_, ry], i) => { q.setFromAxisAngle(Y, ry); m4.compose(p.set(x, y, z), q, sc.set(s_, s_ * (.9 + r() * .25), s_)); im.setMatrixAt(i, m4); });
    scene.add(im);
  }
  // ships
  const sailCols = [0xd4373f, 0x9b59d6, 0x2f7ae0, 0x22a85a, 0xe08a1e, 0xf2efe6];
  for (let i = 0; i < 6; i++) { const big = i < 4; const sh = buildShip(sailCols[i % sailCols.length], big); scene.add(sh); ships.push({ o: sh, a: i * PI * 2 / 6 + r(), rad: (big ? 17 : 24) + r() * 4, sp: (big ? .035 : .05) * (r() < .5 ? 1 : -1), ph: r() * 6 }); }
  // clouds (cast moving shadows)
  for (let i = 0; i < 16; i++) { const c = cloneModel('world', r() < .5 ? 'cloud_big' : 'cloud_small', 14 + r() * 14); c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.material = o.material.clone(); o.material.colorWrite = false; o.material.depthWrite = false; } }); c.position.set((r() - .5) * 220, 30 + r() * 6, (r() - .5) * 220); scene.add(c); clouds.push(c); }
}
function buildShip(sail, big) {
  const g = new T3.Group(); const M = (c, o) => new T3.MeshStandardMaterial(Object.assign({ color: c, roughness: .8 }, o || {}));
  const wood = M(0x6b4423), dark = M(0x3d2614), deck = M(0xb08a5a), cloth = M(sail, { side: T3.DoubleSide });
  const s = big ? 1 : .55;
  const hullShape = new T3.Shape(); hullShape.moveTo(-1, 0); hullShape.quadraticCurveTo(-1.1, -.9, 0, -1.1); hullShape.quadraticCurveTo(1.1, -.9, 1, 0); hullShape.lineTo(-1, 0);
  const hull = new T3.Mesh(new T3.ExtrudeGeometry(hullShape, { depth: 5, bevelEnabled: false }), wood); hull.position.z = -2.5; g.add(hull);
  const bow = new T3.Mesh(new T3.ConeGeometry(1.0, 1.8, 4, 1), wood); bow.rotation.set(PI / 2, PI / 4, 0); bow.scale.set(1, 1, .6); bow.position.set(0, -.45, 3.3); g.add(bow);
  const dk = new T3.Mesh(new T3.BoxGeometry(1.9, .12, 5), deck); dk.position.y = -.05; g.add(dk);
  const stern = new T3.Mesh(new T3.BoxGeometry(1.9, .9, 1.2), dark); stern.position.set(0, .4, -2); g.add(stern);
  const mast = new T3.Mesh(new T3.CylinderGeometry(.08, .11, 5.5, 6), dark); mast.position.y = 2.7; g.add(mast);
  const yard = new T3.Mesh(new T3.CylinderGeometry(.05, .05, 3.2, 5), dark); yard.rotation.z = PI / 2; yard.position.y = 4.6; g.add(yard);
  const sg = new T3.PlaneGeometry(3, 2.8, 6, 4); const sp = sg.attributes.position; for (let i = 0; i < sp.count; i++) { const x = sp.getX(i); sp.setZ(i, (1 - (x / 1.5) ** 2) * .45); } sg.computeVertexNormals();
  const sl = new T3.Mesh(sg, cloth); sl.position.set(0, 3.15, .15); g.add(sl);
  const fl = new T3.Mesh(new T3.PlaneGeometry(.8, .4), cloth); fl.position.set(.4, 5.6, 0); g.add(fl);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  g.scale.setScalar(s); return g;
}
export function updateWorld(t, dt) {
  if (water) water.material.uniforms.t.value = t;
  for (const s of ships) {
    s.a += s.sp * dt; const x = Math.cos(s.a) * s.rad, z = Math.sin(s.a) * s.rad;
    s.o.position.set(x, -.25 + .35 * s.o.scale.x + Math.sin(t * 1.3 + s.ph) * .08, z);
    s.o.rotation.set(Math.sin(t * 1.1 + s.ph) * .05, -s.a + (s.sp > 0 ? 0 : PI), Math.sin(t * .9 + s.ph) * .04);
  }
  for (const c of clouds) { c.position.x += dt * 1.2; if (c.position.x > 120) c.position.x = -120; }
}
