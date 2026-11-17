# Akıncı: Beş Krallık

Ortaçağda geçen, mobil dikey ekran 3D strateji oyunu. Beş medeniyetten birini seç; barış döneminde köylülerinle tarla, taş ve altın işle, evler kur, kışla/okçu meydanı/ahır aç, ordu yetiştir. Barış bitince krallıklar birbirini istila eder; iyi gelişen saldırır. Son kalan kazanır.

## İndir
- **Android APK:** [`releases/Akinci-v2.0.apk`](releases/Akinci-v2.0.apk) (Android 7.0+; eski sürümlerin üzerine kurulur)
- Tarayıcıda: `dist/index.html`
- Önceki "canavar ini" sürümü: `yedek-v1.2` dalı ve `releases/Akinci-v1.2.apk`

## Medeniyetler
| Medeniyet | Özel birlik | Bonus |
|---|---|---|
| Osmanlı Devleti | Sipahi (atlı okçu) | Atlı birlikler %20 ucuz |
| Roma İmparatorluğu | Lejyoner (piyade) | Binalar %20 daha az taş |
| Germen Boyları | Berserker (baltacı) | Piyadeler %20 ucuz |
| İngiliz Krallığı | Uzun Yaycı (okçu) | Kuleler %40 güçlü |
| Arap Emirliği | Bedevi (süvari) | Yiyecek toplama %25 hızlı |

## Oynanış
- Ekranı sürükle → **atlı Paşa** hareket eder, menzildeki düşmanlara ok atar; düşman askerlerinden düşen altınları toplar.
- Alanların üzerinde dur, kaynak akar:
  - **ÇİFTÇİ / ALTINCI / TAŞÇI** – o işte çalışacak köylü (50 yiyecek)
  - **EV** – nüfus +6 · **TARLA** – 3 çiftçi daha
  - **KIŞLA** (piyade, baltacı) · **OKÇU MEYDANI** (okçu) · **AHIR** (süvari, atlı okçu) · **KULE** · **TALİM** (ordu +%12)
  - **SANCAĞA** – ordu Paşa'yı takip eder (istila için) · **HÜCUM!** – en yakın krallığa saldırı · **SAVUN** – kaleye dön
- Kalesi yıkılan krallık düşer, fetheden ganimet alır. Kalen düşerse kaybedersin.
- Müzik: özgün, karanlık ortaçağ epiği (çello ostinatosu, savaş davulları, boru, koro) – kodla üretilir; savaşta davullar yoğunlaşır.

## Proje yapısı
```
src/main.js, src/game.js   Oyun: 5 krallık, yapay zekâ, ekonomi (Three.js r170)
src/assets.js              Model yükleme / birleştirme
src/audio.js               Müzik ve ses efektleri (WebAudio, renderMusic ile çevrimdışı önizleme)
src/assets/*.glb           3D modeller (KayKit, CC0 – bkz. src/assets/LICENSE-KayKit.txt)
tools/build_assets.mjs     KayKit paketlerinden küçültülmüş .glb üretir
tools/build_web.mjs        Her şeyi tek dist/index.html dosyasına paketler
tools/build_apk.py         dist/index.html → imzalı APK (Android SDK gerekmez)
```

## Derleme
```bash
npm install
npm run build                  # dist/index.html
python3 tools/build_apk.py dist/index.html tools/ic_launcher.png releases/Akinci-vX.Y.apk
```
Modelleri yeniden üretmek için KayKit depolarını (Adventurers, Skeletons, Medieval Hexagon, Dungeon Remastered) bir klasöre klonlayıp `node tools/build_assets.mjs <klasör>` çalıştır.

**İmza anahtarı** (`tools/release-key.pem`) depoya eklenmez; güncellemelerin üzerine kurulabilmesi için hep aynı anahtar kullanılmalı.

## Sürümler
- **2.0** – Beş medeniyet, köylü ekonomisi (yiyecek/taş/altın), ev/nüfus, kışla-okçu-ahır, süvari ve atlı okçu, 5 krallıklık büyük harita, barış dönemi ve yapay zekâ istilası, epik ortaçağ müziği.
- **1.2** – KayKit 3D modelleri (şövalye, okçu, baltacı, iskelet canavarlar, kale, kule, kışla, maden), atlı okçu Paşa, altın madeni, sürekli saldıran canavar ini, mehter müziği, yeni ses efektleri, daha yakın kamera.
- **1.1** – İlk 3D sürüm, kısa harita, düşman dalgaları.
- **1.0** – 2D prototip.

## Lisanslar
- 3D modeller: Kay Lousberg / KayKit – CC0.
- Three.js – MIT.
