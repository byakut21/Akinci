# Akıncı: Sınır Boyu

Osmanlı akıncı temalı, mobil dikey ekran 3D strateji/aksiyon oyunu. Paşa'yı yönet, akçe topla, ordu kur, düşman hücumlarını savun ve karşı saldırıyla düşman kalesini yık.

## İndir
- **Android APK:** [`releases/Akinci-v1.1.apk`](releases/Akinci-v1.1.apk) (Android 7.0+)
- Tarayıcıda oynamak için `dist/index.html` dosyasını aç (tek dosya, internet gerekmez).

## Oynanış
- Ekranı sürükle → Paşa'yı yönet (bilgisayarda WASD / ok tuşları).
- Düşman kalesi sürekli asker üretir ve belirli aralıklarla **otağına hücum eder**. Sayaç ekranın üstünde.
- Düşen düşmanlar **akçe** bırakır, Paşa yaklaşınca toplanır. Otağdaki hazine de yavaşça akçe verir.
- Alanların üzerinde dur, akçe akar:
  - **Yeniçeri / Okçu / Şahi Topu** – asker al
  - **Kule** – otağın önüne savunma kulesi
  - **Kışla** – 8 sn'de bir otomatik yeniçeri
  - **Talim** – tüm ordu +%15
  - **HÜCUM!** – toplanma alanındaki askerleri saldırıya gönder
- Düşman kalesi yıkılınca zafer, otağ düşerse yenilgi. Her sefer daha zor.

## Proje yapısı
```
src/index.html      HTML + arayüz (geliştirme)
src/game.js         Oyun kodu (Three.js r158)
vendor/three.min.js Three.js (MIT, bkz. vendor/THREE_LICENSE)
tools/build_web.py  src → dist/index.html (her şey tek dosyada)
tools/build_apk.py  dist/index.html → imzalı APK (Android SDK gerektirmez)
dist/index.html     Derlenmiş oyun
releases/           APK dosyaları
```

## Derleme
```bash
python3 tools/build_web.py
python3 tools/build_apk.py dist/index.html tools/ic_launcher.png releases/Akinci-vX.Y.apk
```
`build_apk.py` WebView sarmalayıcıyı (DEX, manifest, kaynaklar) kendisi üretir ve APK Signature Scheme v2 ile imzalar. Gerekenler: Python 3 + `cryptography`.

**İmza anahtarı** (`tools/release-key.pem`) depoya **eklenmez**. Güncellemelerin eski sürümün üzerine kurulabilmesi için hep aynı anahtar kullanılmalı; anahtarı güvenli bir yerde sakla. Anahtar yoksa betik yenisini üretir, ancak o APK eski sürümün üzerine kurulamaz.

## Sürümler
- **1.1** – Gerçek 3D grafik (ışık, gölge, yüksek çözünürlük), kısaltılmış harita, saldırgan düşman (dalga hücumları), savunma kulesi.
- **1.0** – İlk 2D prototip.
