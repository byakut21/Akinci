// Asset loading & preparation (KayKit CC0 packs, see src/assets/LICENSE-KayKit.txt)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import knightGlb from './assets/knight.glb';
import barbarianGlb from './assets/barbarian.glb';
import rogueGlb from './assets/rogue.glb';
import skMinionGlb from './assets/sk_minion.glb';
import skWarriorGlb from './assets/sk_warrior.glb';
import skRogueGlb from './assets/sk_rogue.glb';
import skMageGlb from './assets/sk_mage.glb';
import skWeaponsGlb from './assets/sk_weapons.glb';
import worldGlb from './assets/world.glb';
import dungeonGlb from './assets/dungeon.glb';

const loader = new GLTFLoader();
const parse = (u8) => loader.parseAsync(u8.slice().buffer, '');

export const A = { tmpl: {}, clips: {}, world: {}, dungeon: {}, weapons: {}, inst: {} };

function fixTex(t) { if (!t) return; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8; t.needsUpdate = true; }
function fixMat(m) {
  if (!m) return m;
  if (m.map) fixTex(m.map);
  if ('metalness' in m) { m.metalness = 0; m.roughness = .78; }
  return m;
}
function std(geo) { // make attributes uniform for merging
  let g = geo.index ? geo : geo.setIndex([...Array(geo.attributes.position.count).keys()]);
  const out = new THREE.BufferGeometry();
  const n = g.attributes.position.count;
  const f32 = (attr, size) => { const a = new Float32Array(n * size); if (attr) for (let i = 0; i < n; i++) for (let k = 0; k < size; k++) a[i * size + k] = attr.getComponent(i, k); return new THREE.BufferAttribute(a, size); };
  out.setAttribute('position', f32(g.attributes.position, 3));
  out.setAttribute('normal', f32(g.attributes.normal, 3));
  out.setAttribute('uv', f32(g.attributes.uv, 2));
  if (g.attributes.skinIndex) {
    const si = new Uint16Array(n * 4); for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) si[i * 4 + k] = g.attributes.skinIndex.getComponent(i, k);
    out.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    out.setAttribute('skinWeight', f32(g.attributes.skinWeight, 4));
  }
  out.setIndex(Array.from(g.index.array));
  return out;
}
function rigidToSkinned(geo, boneIdx) {
  const g = std(geo); const n = g.attributes.position.count;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { si[i * 4] = boneIdx; sw[i * 4] = 1; }
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  return g;
}

// Merge all meshes of a KayKit character (skinned parts + bone-attached props + extra weapons) into one SkinnedMesh.
function prepChar(scene, extras = [], remove = []) {
  scene.updateMatrixWorld(true);
  const skinned = [], rigid = [];
  scene.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); else if (o.isMesh) rigid.push(o); });
  for (const r of rigid.filter(r => remove.includes(r.name))) { r.parent.remove(r); }
  const keepRigid = rigid.filter(r => !remove.includes(r.name));
  const base = skinned[0]; const skel = base.skeleton; const bones = skel.bones;
  const bIndex = new Map(bones.map((b, i) => [b, i]));
  const invS = base.matrixWorld.clone().invert();
  const groups = new Map(); // material -> geos
  const addG = (mat, g) => { if (!groups.has(mat)) groups.set(mat, []); groups.get(mat).push(g); };
  const mainMat = base.material;
  for (const m of skinned) addG(m.material, std(m.geometry));
  const boneOf = (o) => { let p = o.parent; while (p && !bIndex.has(p)) p = p.parent; return p; };
  const doRigid = (m, matOverride) => {
    const bone = boneOf(m); if (!bone) return;
    const g = m.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(invS, m.matrixWorld));
    addG(matOverride || m.material, rigidToSkinned(g, bIndex.get(bone)));
  };
  for (const m of keepRigid) doRigid(m);
  for (const ex of extras) { // {obj, bone, pos, rot, scale, sameMat}
    const bone = scene.getObjectByName(ex.bone); if (!bone) continue;
    const o = ex.obj.clone(true); if (ex.pos) o.position.fromArray(ex.pos); if (ex.rot) o.rotation.fromArray(ex.rot); if (ex.scale) o.scale.setScalar(ex.scale);
    bone.add(o); scene.updateMatrixWorld(true);
    o.traverse(c => { if (c.isMesh) doRigid(c, ex.sameMat ? mainMat : fixMat(c.material)); });
    bone.remove(o);
  }
  const mats = [], geos = [];
  for (const [mat, list] of groups) { mats.push(fixMat(mat)); geos.push(list.length > 1 ? mergeGeometries(list) : list[0]); }
  const geo = mergeGeometries(geos, true);
  const mesh = new THREE.SkinnedMesh(geo, mats.length > 1 ? mats : mats[0]);
  mesh.name = 'body';
  const parent = base.parent;
  mesh.position.copy(base.position); mesh.quaternion.copy(base.quaternion); mesh.scale.copy(base.scale);
  for (const m of skinned) m.parent.remove(m);
  for (const m of keepRigid) m.parent && m.parent.remove(m);
  parent.add(mesh);
  mesh.bind(new THREE.Skeleton(bones, skel.boneInverses), base.bindMatrix);
  mesh.castShadow = true; mesh.receiveShadow = false; mesh.frustumCulled = false;
  // normalise height
  const box = new THREE.Box3().setFromObject(scene);
  const root = new THREE.Group(); root.add(scene);
  root.userData.height = box.max.y - box.min.y;
  return root;
}
export function cloneChar(key, height) {
  const t = A.tmpl[key];
  const c = skClone(t);
  const body = c.getObjectByName('body');
  body.material = Array.isArray(body.material) ? body.material.map(m => m.clone()) : body.material.clone();
  const s = height / t.userData.height; c.scale.setScalar(s);
  c.userData.body = body;
  return c;
}
function filterClip(clip, root, test) {
  const names = new Set(); root.traverse(o => names.add(o.name));
  const tracks = clip.tracks.filter(t => { const n = t.name.split('.')[0]; return names.has(n) && (!test || test(n)); });
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}
export function clipsFor(key, test) {
  const k = key + (test ? '_f' + test.id : '');
  if (A.clips[k]) return A.clips[k];
  const out = {}; const root = A.tmpl[key];
  for (const [n, c] of Object.entries(A.clips.all)) out[n] = filterClip(c, root, test && test.fn);
  return (A.clips[k] = out);
}
// one geometry+material per world model, for instancing
export function instGeo(lib, key) {
  const id = lib + ':' + key; if (A.inst[id]) return A.inst[id];
  const node = A[lib][key]; node.updateMatrixWorld(true);
  const inv = node.matrixWorld.clone().invert(); const geos = []; let mat = null;
  node.traverse(o => { if (o.isMesh) { const g = std(o.geometry); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); geos.push(g); mat = mat || fixMat(o.material); } });
  const geo = geos.length > 1 ? mergeGeometries(geos) : geos[0];
  geo.computeBoundingBox();
  return (A.inst[id] = { geo, mat, box: geo.boundingBox });
}
export function cloneModel(lib, key, width) {
  const o = A[lib][key].clone(true);
  o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
  o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; c.material = fixMat(c.material); } });
  if (width) { const b = new THREE.Box3().setFromObject(o); const w = Math.max(b.max.x - b.min.x, b.max.z - b.min.z); o.scale.setScalar(width / w); }
  const g = new THREE.Group(); g.add(o); return g;
}

export async function loadAll(onProgress) {
  const files = { knight: knightGlb, knight2: knightGlb, barbarian: barbarianGlb, rogue: rogueGlb, sk_minion: skMinionGlb, sk_warrior: skWarriorGlb, sk_rogue: skRogueGlb, sk_mage: skMageGlb, weapons: skWeaponsGlb, world: worldGlb, dungeon: dungeonGlb };
  const G = {}; let i = 0; const n = Object.keys(files).length;
  for (const [k, u8] of Object.entries(files)) { G[k] = await parse(u8); onProgress && onProgress(++i / n); }
  for (const lib of ['world', 'dungeon', 'weapons']) for (const c of G[lib].scene.children) A[lib][c.name] = c;
  // animation clips (shared rig)
  A.clips.all = {};
  for (const c of G.knight.animations) A.clips.all[c.name] = c;
  for (const c of G.sk_minion.animations) A.clips.all[c.name] = c;
  const W = A.weapons;
  A.tmpl.knight = prepChar(G.knight.scene);
  A.tmpl.hero = prepChar(G.knight2.scene, [], ['1H_Sword', 'Round_Shield', 'Knight_Helmet']);
  A.tmpl.barbarian = prepChar(G.barbarian.scene);
  A.tmpl.rogue = prepChar(G.rogue.scene);
  A.tmpl.sk_minion = prepChar(G.sk_minion.scene, [{ obj: W.blade, bone: 'handslotr', sameMat: true }]);
  A.tmpl.sk_warrior = prepChar(G.sk_warrior.scene, [{ obj: W.axe, bone: 'handslotr', sameMat: true }, { obj: W.shield, bone: 'handslotl', sameMat: true }]);
  A.tmpl.sk_rogue = prepChar(G.sk_rogue.scene, [{ obj: W.crossbow, bone: 'handslotr', sameMat: true }]);
  A.tmpl.sk_mage = prepChar(G.sk_mage.scene, [{ obj: W.staff, bone: 'handslotr', sameMat: true }]);
}
