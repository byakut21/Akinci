#!/usr/bin/env python3
"""Inline three.min.js + game.js into one self-contained dist/index.html."""
import os, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(root, 'src/index.html'), encoding='utf-8').read()
three = open(os.path.join(root, 'vendor/three.min.js'), encoding='utf-8').read()
game = open(os.path.join(root, 'src/game.js'), encoding='utf-8').read()
html = re.sub(r'<!--THREE-->.*?<!--/THREE-->', lambda m: '<script>' + three + '</script>', html, flags=re.S)
html = re.sub(r'<!--GAME-->.*?<!--/GAME-->', lambda m: '<script>' + game + '</script>', html, flags=re.S)
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
open(os.path.join(root, 'dist/index.html'), 'w', encoding='utf-8').write(html)
print('dist/index.html', len(html))
