// Builds compact game assets (src/assets/*.glb) from the CC0 KayKit packs.
// Usage: node tools/build_assets.mjs <path-to-folder-containing-KayKit-repos>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, mergeDocuments, unpartition, resample } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2] || '../assets_dl';
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../src/assets');
fs.mkdirSync(OUT, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const ADV = `${SRC}/KayKit-Character-Pack-Adventures-1.0/addons/kaykit_character_pack_adventures`;
const SKL = `${SRC}/KayKit-Character-Pack-Skeletons-1.0/addons/kaykit_character_pack_skeletons`;
const MED = `${SRC}/KayKit-Medieval-Hexagon-Pack-1.0/addons/kaykit_medieval_hexagon_pack/Assets/gltf`;
const DUN = `${SRC}/KayKit-Dungeon-Remastered-1.0/addons/kaykit_dungeon_remastered/Assets/gltf`;

const ANIMS = ['Idle', 'Running_A', 'Walking_A', '1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal', '2H_Melee_Attack_Chop',
  '1H_Ranged_Shoot', '2H_Ranged_Shoot', '1H_Ranged_Aiming', 'Death_A', 'Death_B', 'Hit_A', 'Cheer', 'Sit_Chair_Pose', 'Spellcast_Shoot', '2H_Melee_Idle'];
const SK_ANIMS = ['Spawn_Ground', 'Running_C', 'Death_C_Skeletons', 'Idle_Combat'];

function killAnim(a) { for (const c of a.listChannels()) c.dispose(); for (const s of a.listSamplers()) { const i = s.getInput(), o = s.getOutput(); s.dispose(); if (i && !i.listParents().some(p => p.propertyType !== 'Root')) i.dispose(); if (o && !o.listParents().some(p => p.propertyType !== 'Root')) o.dispose(); } a.dispose(); }

async function character(src, out, keepAnims, removeNodes) {
  const doc = await io.read(src);
  const root = doc.getRoot();
  for (const a of root.listAnimations()) if (!keepAnims.includes(a.getName())) killAnim(a);
  for (const n of root.listNodes()) if (removeNodes.includes(n.getName())) n.dispose();
  await doc.transform(resample({ tolerance: 1e-3 }), prune({ keepLeaves: true }), dedup());
  await io.write(`${OUT}/${out}.glb`, doc);
  console.log(out, (fs.statSync(`${OUT}/${out}.glb`).size / 1024).toFixed(0), 'KB');
}

async function pack(out, items) { // items: [key, file]
  let target = null;
  for (const [key, file] of items) {
    const doc = await io.read(file);
    const root = doc.getRoot();
    for (const a of root.listAnimations()) killAnim(a);
    const scene = root.listScenes()[0];
    const wrap = doc.createNode(key);
    for (const c of scene.listChildren()) { scene.removeChild(c); wrap.addChild(c); }
    scene.addChild(wrap);
    if (!target) { target = doc; continue; }
    mergeDocuments(target, doc);
  }
  const root = target.getRoot();
  const scenes = root.listScenes();
  for (const s of scenes.slice(1)) { for (const c of s.listChildren()) { s.removeChild(c); scenes[0].addChild(c); } s.dispose(); }
  root.setDefaultScene(scenes[0]);
  await target.transform(unpartition(), dedup(), prune({ keepLeaves: true }));
  await io.write(`${OUT}/${out}.glb`, target);
  console.log(out, (fs.statSync(`${OUT}/${out}.glb`).size / 1024).toFixed(0), 'KB');
}

// ---- characters
await character(`${ADV}/Characters/gltf/Knight.glb`, 'knight', ANIMS, ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Spike_Shield', '2H_Sword']);
await character(`${ADV}/Characters/gltf/Barbarian.glb`, 'barbarian', [], ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', 'Mug']);
await character(`${ADV}/Characters/gltf/Rogue_Hooded.glb`, 'rogue', [], ['Knife_Offhand', '1H_Crossbow', 'Knife', 'Throwable']);
await character(`${SKL}/Characters/gltf/Skeleton_Minion.glb`, 'sk_minion', SK_ANIMS, []);
await character(`${SKL}/Characters/gltf/Skeleton_Warrior.glb`, 'sk_warrior', [], []);
await character(`${SKL}/Characters/gltf/Skeleton_Rogue.glb`, 'sk_rogue', [], []);
await character(`${SKL}/Characters/gltf/Skeleton_Mage.glb`, 'sk_mage', [], []);

// ---- skeleton weapons
await pack('sk_weapons', [
  ['blade', `${SKL}/Assets/gltf/Skeleton_Blade.gltf`], ['axe', `${SKL}/Assets/gltf/Skeleton_Axe.gltf`],
  ['shield', `${SKL}/Assets/gltf/Skeleton_Shield_Large_A.gltf`], ['crossbow', `${SKL}/Assets/gltf/Skeleton_Crossbow.gltf`],
  ['staff', `${SKL}/Assets/gltf/Skeleton_Staff.gltf`], ['arrow', `${SKL}/Assets/gltf/Skeleton_Arrow.gltf`]
]);

// ---- world (medieval hexagon pack)
const g = (f) => `${MED}/${f}.gltf`;
await pack('world', [
  ['castle', g('buildings/green/building_castle_green')], ['mine', g('buildings/green/building_mine_green')],
  ['barracks', g('buildings/green/building_barracks_green')], ['tower', g('buildings/green/building_tower_A_green')],
  ['blacksmith', g('buildings/green/building_blacksmith_green')], ['archery', g('buildings/green/building_archeryrange_green')],
  ['destroyed', g('buildings/neutral/building_destroyed')], ['scaffold', g('buildings/neutral/building_scaffolding')],
  ['hex_grass', g('tiles/base/hex_grass')],
  ['trees_A_large', g('decoration/nature/trees_A_large')], ['trees_A_medium', g('decoration/nature/trees_A_medium')],
  ['trees_B_large', g('decoration/nature/trees_B_large')], ['trees_B_medium', g('decoration/nature/trees_B_medium')],
  ['tree_A', g('decoration/nature/tree_single_A')], ['tree_B', g('decoration/nature/tree_single_B')],
  ['rock_A', g('decoration/nature/rock_single_A')], ['rock_B', g('decoration/nature/rock_single_B')], ['rock_C', g('decoration/nature/rock_single_C')],
  ['rock_D', g('decoration/nature/rock_single_D')], ['rock_E', g('decoration/nature/rock_single_E')],
  ['hills_A', g('decoration/nature/hills_A_trees')], ['hills_B', g('decoration/nature/hills_B_trees')], ['hills_C', g('decoration/nature/hills_C_trees')],
  ['mountain_A', g('decoration/nature/mountain_A_grass_trees')], ['mountain_B', g('decoration/nature/mountain_B_grass_trees')], ['mountain_C', g('decoration/nature/mountain_C_grass_trees')],
  ['flag_green', g('decoration/props/flag_green')], ['flag_red', g('decoration/props/flag_red')],
  ['barrel', g('decoration/props/barrel')], ['crate', g('decoration/props/crate_A_big')], ['weaponrack', g('decoration/props/weaponrack')],
  ['target', g('decoration/props/target')], ['wheelbarrow', g('decoration/props/wheelbarrow')], ['sack', g('decoration/props/sack')],
  ['resource_stone', g('decoration/props/resource_stone')], ['tent', g('decoration/props/tent')], ['bucket_arrows', g('decoration/props/bucket_arrows')]
]);

// ---- dungeon props (monster lair, coins)
const d = (f) => fs.existsSync(`${DUN}/${f}.gltf.glb`) ? `${DUN}/${f}.gltf.glb` : `${DUN}/${f}.glb`;
await pack('dungeon', [
  ['doorway', d('wall_doorway')], ['wall_broken', d('wall_broken')], ['wall_arched', d('wall_arched')], ['pillar', d('pillar')], ['pillar_dec', d('pillar_decorated')],
  ['rubble_large', d('rubble_large')], ['rubble_half', d('rubble_half')], ['spikes', d('floor_tile_big_spikes')], ['torch', d('torch_lit')],
  ['banner_red', d('banner_patternA_red')], ['banner_thin_red', d('banner_thin_red')], ['chest_gold', d('chest_gold')],
  ['coin', d('coin')], ['coins_s', d('coin_stack_small')], ['coins_m', d('coin_stack_medium')], ['coins_l', d('coin_stack_large')],
  ['barrier', d('barrier_column')]
]);
