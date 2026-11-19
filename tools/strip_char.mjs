// Copies a KayKit character without its animations (shared rig; clips come from knight.glb).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const [src, dst] = process.argv.slice(2);
const d = await io.read(src);
for (const a of d.getRoot().listAnimations()) { for (const c of a.listChannels()) c.dispose(); for (const s of a.listSamplers()) s.dispose(); a.dispose(); }
await d.transform(prune());
await io.write(dst, d);
