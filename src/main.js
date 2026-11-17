import { boot } from './game.js';
boot().catch(e => { const l = document.getElementById('load'); if (l) l.innerHTML = '<div style="color:#fff;padding:20px">Yükleme hatası: ' + (e && e.message) + '</div>'; console.error(e); });
