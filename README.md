# Akıncı: Sınır Boyu

Mobil, dikey ekran 3D strateji/aksiyon oyunu. Atlı okçu Paşa'yı yönet, altın madeninden ve düşen canavarlardan altın topla, ordu kur; durmadan saldıran iskelet ordusuna karşı kaleni savun ve canavar inini yık.

## İndir
- **Android APK:** [`releases/Akinci-v1.2.apk`](releases/Akinci-v1.2.apk) (Android 7.0+). Önceki sürümün üzerine kurulur.
- Tarayıcıda: `dist/index.html` (tek dosya, internet gerekmez).

## Oynanış
- Ekranı sürükle → **atlı okçu Paşa** hareket eder, menzildeki canavarlara kendiliğinden ok atar (bilgisayarda WASD / ok tuşları).
- **Altın madeni** sürekli altın üretir; madenin önünde biriken altını Paşa ile topla. İkinci maden 20 altın.
- **Canavar ini** sürekli iskelet gönderir; 40 saniyede bir büyük **sürü** gelir (sonraki seferlerde dev iskelet).
- Alanların üzerinde dur, altın akar:
  - **Piyade / Okçu / Baltacı** – asker al
  - **Kule** – savunma kulesi · **Kışla** – otomatik piyade · **Maden** – ek altın · **Talim** – ordu +%15
  - **HÜCUM!** – toplanma alanındaki askerleri saldırıya gönder
- Canavar ini yıkılınca zafer, kale düşerse yenilgi.
- Müzik: davul, nakkare, zurna ve yaylılarla Hicaz makamında mehter tarzı marş (tamamen kodla üretilir). Müzik ve efekt sesleri ayrı ayrı kapatılabilir.

## Proje yapısı
```
src/main.js, src/game.js   Oyun (Three.js r170)
src/assets.js              Model yükleme / birleştirme
src/audio.js               Müzik ve ses efektleri (WebAudio)
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
- **1.2** – KayKit 3D modelleri (şövalye, okçu, baltacı, iskelet canavarlar, kale, kule, kışla, maden), atlı okçu Paşa, altın madeni, sürekli saldıran canavar ini, mehter müziği, yeni ses efektleri, daha yakın kamera.
- **1.1** – İlk 3D sürüm, kısa harita, düşman dalgaları.
- **1.0** – 2D prototip.

## Lisanslar
- 3D modeller: Kay Lousberg / KayKit – CC0.
- Three.js – MIT.
