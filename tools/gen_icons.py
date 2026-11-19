# Renders pad / resource icons with the original canvas drawing code (src/game.js padIcon) to PNGs.
import asyncio, base64, re, json, sys
from playwright.async_api import async_playwright
src = open('src/game.js').read()
fn = src[src.index('function padIcon('):src.index('function makePadMesh(')]
CIVS = {'osmanli':'#d4373f','roma':'#9b59d6','germen':'#7b8494','ingiliz':'#2f7ae0','arap':'#22a85a','pers':'#e08a1e','neutral':'#e8d8b0'}
KINDS = ['koylu_f','koylu_g','koylu_s','piyade','okcu','balta','suvari','ahir','atliokcu','kule','kisla','ev','tarla','cag','upg','atk','sancak','kalkan']
JS = fn + r'''
function res(g, r, S){ const cx=S/2, cy=S/2, R=S*.36; g.save();
 if(r==='g'){const gr=g.createRadialGradient(cx-R*.3,cy-R*.3,2,cx,cy,R);gr.addColorStop(0,'#fff0a8');gr.addColorStop(.6,'#f2b21b');gr.addColorStop(1,'#a86d00');g.fillStyle=gr;g.beginPath();g.arc(cx,cy,R,0,7);g.fill();g.strokeStyle='#7a4d00';g.lineWidth=S*.05;g.stroke();g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.arc(cx-R*.3,cy-R*.3,R*.25,0,7);g.fill();}
 else if(r==='s'){g.fillStyle='#8d949b';g.beginPath();g.roundRect(cx-R,cy-R*.75,R*2,R*1.5,R*.4);g.fill();g.fillStyle='#c3c8cc';g.fillRect(cx-R*.6,cy-R*.5,R*.8,R*.4);g.strokeStyle='#4b5157';g.lineWidth=S*.05;g.beginPath();g.roundRect(cx-R,cy-R*.75,R*2,R*1.5,R*.4);g.stroke();}
 else if(r==='f'){g.strokeStyle='#c99a2e';g.lineWidth=S*.06;for(const a of [-.45,0,.45]){g.beginPath();g.moveTo(cx,cy+R);g.lineTo(cx+Math.sin(a)*R*.9,cy-R*.7);g.stroke();g.fillStyle='#f2d36b';g.beginPath();g.ellipse(cx+Math.sin(a)*R*.9,cy-R*.7,S*.09,S*.2,a,0,7);g.fill();}}
 else if(r==='p'){g.fillStyle='#e9dcc0';g.beginPath();g.arc(cx,cy-R*.35,R*.42,0,7);g.fill();g.beginPath();g.ellipse(cx,cy+R*.55,R*.75,R*.5,0,Math.PI,0);g.fill();}
 g.restore(); }
window.draw = (kind, civ, S) => { const c=document.createElement('canvas'); c.width=c.height=S; const g=c.getContext('2d');
  if(kind.startsWith('res_')) res(g, kind.slice(4), S); else padIcon(g, kind, S/2, S/2, S/100, civ);
  return c.toDataURL('image/png'); };
'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); await pg.set_content('<html><body></body></html>'); await pg.add_script_tag(content=JS)
        n=0
        for civ, css in CIVS.items():
            for k in KINDS:
                d = await pg.evaluate('([k,c])=>draw(k,c,192)', [k, css]); open(f'godot/assets/icons/{k}_{civ}.png','wb').write(base64.b64decode(d.split(',')[1])); n+=1
        for r in 'fsgp':
            d = await pg.evaluate('([k,c])=>draw(k,c,96)', ['res_'+r, '#fff']); open(f'godot/assets/icons/res_{r}.png','wb').write(base64.b64decode(d.split(',')[1])); n+=1
        print('icons', n); await b.close()
asyncio.run(main())
