// Bakes the terrain height field + splat map for the Godot version.
// Same height model as src/world.js (v3.0) so logic coordinates stay identical.
import fs from 'node:fs';
import zlib from 'node:zlib';
// v4.1: map scaled 1.5x (MW 3000)
const S = 1.5, PI = Math.PI, K = 0.1, MW = 3000, MC = 1500, R_PLAY = 1460, KR = 1000, SEA_R = 430, RING = 700;
const KPOS = []; for (let i = 0; i < 5; i++) { const a = i * 2 * PI / 5; KPOS.push({ x: MC + Math.sin(a) * KR, y: MC + Math.cos(a) * KR }); }
function segDist(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy))); return Math.hypot(px - ax - vx * t, py - ay - vy * t); }
function hash(x, y) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, o = 4) { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); n += a; f *= 2.03; a *= .5; } return s / n; }
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function fields(px, py) {
  const dc = Math.hypot(px - MC, py - MC);
  let near = 1e9; for (const k of KPOS) near = Math.min(near, Math.hypot(px - k.x, py - k.y));
  let road = 1e9; for (const k of KPOS) road = Math.min(road, segDist(px, py, k.x, k.y, MC, MC)); road = Math.min(road, Math.abs(dc - RING));
  return { dc, near, road };
}
function heightAt(px, py) {
  const { dc, near, road } = fields(px, py);
  const n1 = fbm(px * .0032, py * .0032), n2 = fbm(px * .011 + 50, py * .011 + 50, 3), n3 = fbm(px * .02 + 9, py * .02 + 3, 2);
  let h = (n1 - .45) * 3.4;
  const wedge = smooth(360, 600, near) * smooth(420 * S, 640 * S, dc); h += wedge * (2.5 + n2 * 8 + n3 * 2);
  const rim = smooth(R_PLAY - 90, R_PLAY + 220, dc); h += rim * (10 + n1 * 18 + Math.max(0, n2 - .45) * 26 + n3 * 3);
  const kflat = smooth(400, 300, near); h = h * (1 - kflat) + kflat * (n2 - .5) * .22;
  const rflat = smooth(52, 24, road) * (1 - rim); h = h * (1 - rflat) + rflat * Math.max(-.15, (n1 - .45) * .5);
  const sea = smooth(SEA_R + 70, SEA_R - 40, dc); h = h * (1 - sea) + sea * -3.6;
  return h;
}
const G0 = -480, GSPAN = 3960, GN = 480, GC = GSPAN / GN;
const HG = new Float32Array((GN + 1) * (GN + 1));
for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) HG[j * (GN + 1) + i] = heightAt(G0 + i * GC, G0 + j * GC);
const OUT = process.argv[2];
fs.writeFileSync(OUT + '/heights.bin', Buffer.from(HG.buffer));
// splat: R = road dirt, G = shore sand, B = forest floor, A = meadow tone (0..1)
const SZ = 1536, img = Buffer.alloc(SZ * SZ * 4);
for (let j = 0; j < SZ; j++) for (let i = 0; i < SZ; i++) {
  const px = G0 + (i + .5) / SZ * GSPAN, py = G0 + (j + .5) / SZ * GSPAN;
  const { dc, near, road } = fields(px, py);
  const n = fbm(px * .006 + 3, py * .006 + 7, 3), n2 = vnoise(px * .05, py * .05), n3 = fbm(px * .03, py * .03, 3);
  const rim = smooth(R_PLAY - 90, R_PLAY + 220, dc);
  let dirt = (road < 34 && dc > SEA_R + 40 && near > 50) ? smooth(30 + n3 * 8, 12, road) * (.75 + n2 * .25) * (1 - rim) : 0;
  dirt = Math.max(dirt, smooth(60, 30, near) * .0);
  const sand = Math.max(smooth(SEA_R + 78 + n3 * 14, SEA_R + 28, dc), 0);
  const forest = smooth(380, 600, near) * smooth(420 * S, 640 * S, dc) * .9;
  const o = (j * SZ + i) * 4;
  img[o] = Math.round(Math.min(1, dirt) * 255); img[o + 1] = Math.round(sand * 255); img[o + 2] = Math.round(forest * 255); img[o + 3] = Math.round(smooth(.3, .75, n) * 255);
}
// PNG writer
function crc32(b) { let c, crc = 0xffffffff; for (let n = 0; n < b.length; n++) { c = (crc ^ b[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(t, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
const raw = Buffer.alloc((SZ * 4 + 1) * SZ); for (let j = 0; j < SZ; j++) { raw[j * (SZ * 4 + 1)] = 0; img.copy(raw, j * (SZ * 4 + 1) + 1, j * SZ * 4, (j + 1) * SZ * 4); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(SZ, 0); ihdr.writeUInt32BE(SZ, 4); ihdr[8] = 8; ihdr[9] = 6;
fs.writeFileSync(OUT + '/splat.pngdata', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
console.log('ok', HG.length);
