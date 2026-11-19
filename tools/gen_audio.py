# Renders the original WebAudio score + SFX (src/audio.js) offline to WAV for the Godot build.
import asyncio, base64, subprocess, os
from playwright.async_api import async_playwright
src = open('src/audio.js').read().replace('export async function', 'async function').replace('export function', 'function').replace('export const', 'const')
OUT = 'godot/assets/audio'
JS = src + r'''
function toWav(buf){ const ch=buf.numberOfChannels, n=buf.length, sr=buf.sampleRate; const out=new DataView(new ArrayBuffer(44+n*ch*2));
 const w=(o,s)=>{for(let i=0;i<s.length;i++)out.setUint8(o+i,s.charCodeAt(i));};
 w(0,'RIFF');out.setUint32(4,36+n*ch*2,true);w(8,'WAVE');w(12,'fmt ');out.setUint32(16,16,true);out.setUint16(20,1,true);out.setUint16(22,ch,true);out.setUint32(24,sr,true);out.setUint32(28,sr*ch*2,true);out.setUint16(32,ch*2,true);out.setUint16(34,16,true);w(36,'data');out.setUint32(40,n*ch*2,true);
 const d=[];for(let c=0;c<ch;c++)d.push(buf.getChannelData(c)); let o=44; for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const v=Math.max(-1,Math.min(1,d[c][i]));out.setInt16(o,v*32767,true);o+=2;}
 let s='';const u=new Uint8Array(out.buffer);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s);}
window.renderLoop = async (war) => {
  const STEPS = 192, L = STEPS * STEP, TAIL = 4, SR = 44100;
  intense = war ? 1 : 0;
  const keep=[AC,master,musicBus,sfxBus,reverb,noiseBuf];
  AC = new OfflineAudioContext(2, Math.round(SR*(L+TAIL)), SR); musicOn = true; buildGraph();
  nextT = 0; step = 0; for (let i=0;i<STEPS;i++) scheduleStep();
  const buf = await AC.startRendering();
  // fold the reverb tail onto the start so the loop is seamless
  const n = Math.round(SR*L), out = new OfflineAudioContext(2, n, SR).createBuffer(2, n, SR);
  for (let c=0;c<2;c++){ const a=buf.getChannelData(c), b=out.getChannelData(c); for(let i=0;i<n;i++) b[i]=a[i]; for(let i=n;i<a.length;i++) b[i-n]+=a[i]; }
  [AC,master,musicBus,sfxBus,reverb,noiseBuf]=keep; return toWav(out);
};
window.renderSfx = async (name) => {
  const keep=[AC,master,musicBus,sfxBus,reverb,noiseBuf];
  AC = new OfflineAudioContext(2, Math.round(44100*3.5), 44100); sfxOn = true; musicOn = false; buildGraph();
  for (const k in last) delete last[k]; sfx(name, 1);
  const buf = await AC.startRendering();
  // trim trailing silence
  let end = buf.length; const d0 = buf.getChannelData(0), d1 = buf.getChannelData(1);
  while (end > 4410 && Math.abs(d0[end-1]) < 1e-3 && Math.abs(d1[end-1]) < 1e-3) end--;
  const t = new OfflineAudioContext(2, end, 44100).createBuffer(2, end, 44100);
  for (let c=0;c<2;c++) t.getChannelData(c).set(buf.getChannelData(c).subarray(0,end));
  [AC,master,musicBus,sfxBus,reverb,noiseBuf]=keep; return toWav(t);
};
'''
SFX = ['sword','axe','chop','death','arrow','hurt','coin','res','pay','buy','build','horn','alarm','boom','win','lose','conquer']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); pg.set_default_timeout(600000)
        await pg.set_content('<html><body></body></html>'); await pg.add_script_tag(content=JS)
        for nm, war in [('music_calm', False), ('music_war', True)]:
            d = await pg.evaluate('(w)=>renderLoop(w)', war); open(f'/tmp/{nm}.wav','wb').write(base64.b64decode(d)); print(nm)
        for s in SFX:
            d = await pg.evaluate('(n)=>renderSfx(n)', s); open(f'/tmp/sfx_{s}.wav','wb').write(base64.b64decode(d))
        await b.close()
asyncio.run(main())
for nm in ['music_calm','music_war']:
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',f'/tmp/{nm}.wav','-c:a','libvorbis','-q:a','4',f'{OUT}/{nm}.ogg'], check=True)
for s in SFX:
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',f'/tmp/sfx_{s}.wav','-ac','1','-c:a','libvorbis','-q:a','4',f'{OUT}/sfx_{s}.ogg'], check=True)
print('done')
