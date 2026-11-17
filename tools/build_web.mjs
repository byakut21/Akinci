// Bundles src/main.js (three.js + game + embedded assets) and inlines it into dist/index.html
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const r = await esbuild.build({ entryPoints: [path.join(root, 'src/main.js')], bundle: true, minify: true, format: 'iife', target: 'es2020', loader: { '.glb': 'binary' }, write: false, legalComments: 'none' });
const js = r.outputFiles[0].text;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/bundle.js'), js);
let html = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
html = html.replace(/<!--GAME-->[\s\S]*?<!--\/GAME-->/, () => '<script>' + js.replace(/<\/script/gi, '<\\/script') + '</script>');
fs.writeFileSync(path.join(root, 'dist/index.html'), html);
console.log('dist/index.html', (html.length / 1024 / 1024).toFixed(2), 'MB');
